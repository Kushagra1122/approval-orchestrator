import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getWorkflow, getApprovalsByWorkflow, createApproval, rollbackWorkflow, getRollbackHistory } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import DynamicForm from '../components/DynamicForm';

export default function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [rollbacks, setRollbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddApproval, setShowAddApproval] = useState(false);
  const [showRollbackForm, setShowRollbackForm] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  useEffect(() => {
    const loadWorkflowData = async () => {
      try {
        const [workflowData, approvalsData, rollbacksData] = await Promise.all([
          getWorkflow(id),
          getApprovalsByWorkflow(id),
          getRollbackHistory(id).catch(() => []) // Gracefully handle if rollbacks not available
        ]);
        setWorkflow(workflowData);
        setApprovals(approvalsData);
        setRollbacks(rollbacksData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkflowData();
  }, [id]);

  const loadData = async () => {
    try {
      const [workflowData, approvalsData, rollbacksData] = await Promise.all([
        getWorkflow(id),
        getApprovalsByWorkflow(id),
        getRollbackHistory(id).catch(() => []) // Gracefully handle if rollbacks not available
      ]);
      setWorkflow(workflowData);
      setApprovals(approvalsData);
      setRollbacks(rollbacksData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddApproval = async (formData) => {
    try {
      await createApproval(id, {
        ...formData,
        timeout_minutes: parseInt(formData.timeout_minutes),
        ui_schema: {}
      });
      setShowAddApproval(false);
      await loadData(); // Reload approvals
    } catch (error) {
      console.error('Failed to create approval:', error);
      alert('Failed to create approval. Please try again.');
    }
  };

  const handleRollback = async (formData) => {
    setRollingBack(true);
    try {
      console.log('🔍 Rollback form data:', formData);
      
      // FIX: Handle checkbox data properly - it comes as an object
      let compensationActions = [];
      
      if (formData.compensation_actions) {
        console.log('🔍 Raw compensation_actions:', formData.compensation_actions);
        
        // Convert checkbox object to array of selected values
        if (typeof formData.compensation_actions === 'object') {
          compensationActions = Object.keys(formData.compensation_actions)
            .filter(key => formData.compensation_actions[key] === true)
            .map(action => {
              const actionObj = { type: action };
              
              // Add message for notify_stakeholders
              if (action === 'notify_stakeholders' && formData.notification_message) {
                actionObj.message = formData.notification_message;
              }
              
              // Add target for reverse_action  
              if (action === 'reverse_action' && formData.reverse_target) {
                actionObj.target = formData.reverse_target;
              }
              
              return actionObj;
            });
        } else if (Array.isArray(formData.compensation_actions)) {
          // If it's already an array (backward compatibility)
          compensationActions = formData.compensation_actions.map(action => ({
            type: action,
            message: action === 'notify_stakeholders' ? formData.notification_message : undefined,
            target: action === 'reverse_action' ? formData.reverse_target : undefined
          }));
        }
      }

      console.log('🔍 Processed compensation actions:', compensationActions);

      // If no compensation actions selected, at least add notify_stakeholders
      if (compensationActions.length === 0) {
        compensationActions = [
          {
            type: 'notify_stakeholders',
            message: formData.notification_message || `Workflow rolled back: ${formData.reason}`
          }
        ];
        console.log('🔍 Added default compensation action:', compensationActions);
      }

      await rollbackWorkflow(id, {
        reason: formData.reason,
        rolled_back_by: formData.rolled_back_by,
        compensation_actions: compensationActions
      });
      
      setShowRollbackForm(false);
      await loadData(); // Reload workflow and approvals
      alert('Workflow rolled back successfully!');
    } catch (error) {
      console.error('Failed to rollback workflow:', error);
      alert('Failed to rollback workflow. Please try again.');
    } finally {
      setRollingBack(false);
    }
  };

  const approvalSchema = {
    fields: [
      {
        type: 'text',
        name: 'step_name',
        label: 'Approval Step Name',
        required: true,
        placeholder: 'e.g., Manager Approval'
      },
      {
        type: 'select',
        name: 'channel',
        label: 'Channel',
        required: true,
        options: [
          { value: 'slack', label: 'Slack 🚀' },
          { value: 'web', label: 'Web' },
          { value: 'email', label: 'Email' }
        ],
        value: 'slack' // Default to Slack
      },
      {
        type: 'text',
        name: 'assigned_to',
        label: 'Assigned To',
        required: true,
        placeholder: 'e.g., #general or manager@company.com'
      },
      {
        type: 'select',
        name: 'timeout_minutes',
        label: 'Timeout After',
        required: true,
        options: [
          { value: '30', label: '30 minutes' },
          { value: '60', label: '1 hour' },
          { value: '120', label: '2 hours' },
          { value: '240', label: '4 hours' },
          { value: '1440', label: '24 hours' }
        ],
        value: '60' // Default to 1 hour
      }
    ]
  };

  const rollbackSchema = {
    fields: [
      {
        type: 'textarea',
        name: 'reason',
        label: 'Rollback Reason',
        required: true,
        placeholder: 'Why are you rolling back this workflow? (e.g., Critical bug found, Budget constraints, Security issue...)'
      },
      {
        type: 'text',
        name: 'rolled_back_by',
        label: 'Your Name/Role',
        required: true,
        placeholder: 'e.g., admin, security_team, manager, finance_director'
      },
      {
        type: 'checkbox',
        name: 'compensation_actions',
        label: 'Compensation Actions',
        required: true, // ADDED: Make this required
        options: [
          { value: 'notify_stakeholders', label: 'Notify Stakeholders' },
          { value: 'reverse_action', label: 'Reverse Action' },
          { value: 'update_system', label: 'Update External Systems' }
        ]
      },
      {
        type: 'text',
        name: 'notification_message',
        label: 'Notification Message',
        placeholder: 'Custom message to send to stakeholders (optional)',
        description: 'Only used if "Notify Stakeholders" is selected'
      },
      {
        type: 'text',
        name: 'reverse_target',
        label: 'Action to Reverse',
        placeholder: 'e.g., deployment, purchase_order, migration (optional)',
        description: 'Only used if "Reverse Action" is selected'
      }
    ]
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Workflow Not Found</h1>
        <button onClick={() => navigate('/')} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const canRollback = workflow.status === 'running' || workflow.status === 'paused';
  const hasApprovals = approvals.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{workflow.name}</h1>
          <p className="text-gray-600 mt-2">Workflow details and approval history</p>
        </div>
        <div className="flex space-x-3">
          <StatusBadge status={workflow.status} />
          <button
            onClick={() => setShowAddApproval(true)}
            className="btn-primary"
          >
            + Add Approval
          </button>
          {canRollback && hasApprovals && (
            <button
              onClick={() => setShowRollbackForm(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-medium"
            >
              🔄 Rollback
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Details */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Workflow Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Workflow ID</label>
                <p className="text-sm text-gray-900 font-mono">{workflow.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <StatusBadge status={workflow.status} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">{new Date(workflow.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Updated</label>
                <p className="text-sm text-gray-900">{new Date(workflow.updated_at).toLocaleString()}</p>
              </div>
              {workflow.rollback_reason && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Rollback Reason</label>
                  <p className="text-sm text-gray-900 bg-orange-50 p-3 rounded-lg border border-orange-200">
                    {workflow.rollback_reason}
                  </p>
                </div>
              )}
            </div>

            {workflow.context && Object.keys(workflow.context).length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-500">Context</label>
                <pre className="mt-1 p-3 bg-gray-50 rounded-lg border text-sm overflow-x-auto">
                  {JSON.stringify(workflow.context, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Rollback History */}
          {rollbacks.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Rollback History</h2>
              <div className="space-y-4">
                {rollbacks.map((rollback) => (
                  <div key={rollback.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">🔄 Workflow Rolled Back</h3>
                        <p className="text-sm text-gray-600 mt-1">{rollback.reason}</p>
                      </div>
                      <span className="text-xs text-orange-800 bg-orange-100 px-2 py-1 rounded-full">
                        {new Date(rollback.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><span className="font-medium">Rolled back by:</span> {rollback.rolled_back_by}</div>
                      <div><span className="font-medium">From:</span> {rollback.rolled_back_from_step} → <span className="font-medium">To:</span> {rollback.rolled_back_to_step}</div>
                      {rollback.compensation_actions && rollback.compensation_actions.length > 0 && (
                        <div>
                          <span className="font-medium">Compensation actions:</span>{' '}
                          {rollback.compensation_actions.map(action => action.type).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Steps */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Approval Steps</h2>
              <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {approvals.length} steps
              </span>
            </div>

            {approvals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No approval steps yet. Add your first approval step.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {approvals.map((approval, index) => (
                  <div key={approval.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{approval.step_name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              approval.channel === 'slack' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {approval.channel === 'slack' ? 'Slack 🚀' : approval.channel}
                            </span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={approval.status} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 ml-9">
                      <div>
                        <span className="font-medium">Assigned to:</span> {approval.assigned_to}
                      </div>
                      <div>
                        <span className="font-medium">Requested:</span> {new Date(approval.requested_at).toLocaleString()}
                      </div>
                      {approval.responded_at && (
                        <div>
                          <span className="font-medium">Responded:</span> {new Date(approval.responded_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 ml-9">
                      <Link to={`/approvals/${approval.id}`}>
                        <button className="btn-outline text-sm">
                          View Details
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rollback Form */}
          {showRollbackForm && (
            <div className="card border-orange-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">🔄 Rollback Workflow</h3>
                <button
                  onClick={() => setShowRollbackForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <DynamicForm
                schema={rollbackSchema}
                onSubmit={handleRollback}
                onCancel={() => setShowRollbackForm(false)}
                submitLabel={rollingBack ? "Rolling Back..." : "Rollback Workflow"}
              />
            </div>
          )}

          {/* Add Approval Form */}
          {showAddApproval && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Add Approval Step</h3>
                <button
                  onClick={() => setShowAddApproval(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <DynamicForm
                schema={approvalSchema}
                onSubmit={handleAddApproval}
                onCancel={() => setShowAddApproval(false)}
                submitLabel="Add Approval"
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {canRollback && hasApprovals && !showRollbackForm && (
                <button
                  onClick={() => setShowRollbackForm(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md font-medium"
                >
                  🔄 Rollback Workflow
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="w-full btn-outline"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/create')}
                className="w-full btn-outline"
              >
                Create New Workflow
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
