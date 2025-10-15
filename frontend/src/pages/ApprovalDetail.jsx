import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getApproval, respondToApproval } from '../services/api';
import DynamicForm from '../components/DynamicForm';
import StatusBadge from '../components/StatusBadge';

export default function ApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [prefilledDecision, setPrefilledDecision] = useState(null);

  useEffect(() => {
    const loadApprovalData = async () => {
      try {
        const data = await getApproval(id);
        setApproval(data);
      } catch (error) {
        console.error('Failed to load approval:', error);
      } finally {
        setLoading(false);
      }
    };

    loadApprovalData();
    
    // Check for decision parameter in URL
    const decisionParam = searchParams.get('decision');
    if (decisionParam === 'approve' || decisionParam === 'reject') {
      setPrefilledDecision(decisionParam);
      setShowResponseForm(true); // Auto-show form if decision is provided
    }
  }, [id, searchParams]);

  const loadApproval = async () => {
    try {
      const data = await getApproval(id);
      setApproval(data);
    } catch (error) {
      console.error('Failed to load approval:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (formData) => {
    setResponding(true);
    try {
      // Use prefilled decision if available, otherwise use form data
      const decision = prefilledDecision || formData.decision;
      const feedback = {
        risk_level: formData.risk_level,
        notes: formData.notes,
        ...formData
      };
      
      await respondToApproval(id, decision, feedback);
      setShowResponseForm(false);
      setPrefilledDecision(null);
      await loadApproval();
    } catch (error) {
      console.error('Failed to respond:', error);
      alert('Failed to submit response. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  // DYNAMIC SCHEMA BASED ON WHETHER DECISION IS PRE-FILLED
  const getResponseSchema = () => {
    const baseFields = [
      {
        type: 'radio',
        name: 'risk_level',
        label: 'Risk Level',
        required: true,
        options: ['Low', 'Medium', 'High']
      },
      {
        type: 'textarea',
        name: 'notes',
        label: 'Additional Notes',
        placeholder: 'Enter any additional comments or reasoning...'
      }
    ];

    // Only show decision radio if NOT pre-filled from Slack
    if (!prefilledDecision) {
      return {
        fields: [
          {
            type: 'radio',
            name: 'decision',
            label: 'Decision',
            required: true,
            options: ['approve', 'reject']
          },
          ...baseFields
        ]
      };
    }

    // When pre-filled, don't show decision field
    return { fields: baseFields };
  };

  const handleManualDecision = (decision) => {
    setPrefilledDecision(decision);
    setShowResponseForm(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Approval Not Found</h1>
        <button onClick={() => navigate('/')} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const canRespond = approval.status === 'pending';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{approval.step_name}</h1>
          <p className="text-gray-600 mt-2">Approval request details and response</p>
          {/* ENHANCED PREFILLED DECISION BANNER */}
          {prefilledDecision && (
            <div className={`mt-2 p-3 rounded-md border ${
              prefilledDecision === 'approve' 
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <p className="font-medium">
                {prefilledDecision === 'approve' ? '✅' : '❌'} 
                Decision Pre-filled: <span className="capitalize">{prefilledDecision}</span>
              </p>
              <p className="text-sm mt-1">
                Just select risk level and add notes below to complete your {prefilledDecision}.
              </p>
            </div>
          )}
        </div>
        <StatusBadge status={approval.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Approval Details Card */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Approval Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Workflow ID</label>
                <p className="text-sm text-gray-900 font-mono">{approval.workflow_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Assigned To</label>
                <p className="text-sm text-gray-900">{approval.assigned_to}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Requested At</label>
                <p className="text-sm text-gray-900">{new Date(approval.requested_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Timeout At</label>
                <p className="text-sm text-gray-900">{new Date(approval.timeout_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Channel</label>
                <p className="text-sm text-gray-900 capitalize">{approval.channel || 'web'}</p>
              </div>
            </div>
          </div>

          {/* Response Data */}
          {approval.response_data && Object.keys(approval.response_data).length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Response</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Decision</label>
                  <p className="text-sm text-gray-900 capitalize">{approval.status}</p>
                </div>
                {Object.entries(approval.response_data).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-gray-500 capitalize">
                      {key.replace('_', ' ')}
                    </label>
                    <p className="text-sm text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response Form */}
          {canRespond && showResponseForm && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {prefilledDecision ? `Complete Your ${prefilledDecision.toUpperCase()}` : 'Submit Response'}
              </h2>
              <DynamicForm
                schema={getResponseSchema()}
                onSubmit={handleRespond}
                onCancel={() => {
                  setShowResponseForm(false);
                  setPrefilledDecision(null);
                }}
                submitLabel={
                  responding 
                    ? "Submitting..." 
                    : prefilledDecision 
                      ? `Submit ${prefilledDecision.toUpperCase()}`
                      : 'Submit Response'
                }
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              {canRespond && !showResponseForm && !prefilledDecision && (
                <>
                  <button
                    onClick={() => handleManualDecision('approve')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleManualDecision('reject')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium"
                  >
                    ❌ Reject
                  </button>
                </>
              )}
              {canRespond && showResponseForm && (
                <button
                  onClick={() => {
                    setShowResponseForm(false);
                    setPrefilledDecision(null);
                  }}
                  className="w-full btn-outline"
                >
                  Cancel Response
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="w-full btn-outline"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Status Card */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Current Status:</span>
                <StatusBadge status={approval.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Requested:</span>
                <span className="text-gray-900">{new Date(approval.requested_at).toLocaleDateString()}</span>
              </div>
              {approval.responded_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Responded:</span>
                  <span className="text-gray-900">{new Date(approval.responded_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
