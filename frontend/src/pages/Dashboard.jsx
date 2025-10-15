import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getWorkflows, getPendingApprovals } from '../services/api';
import WorkflowCard from '../components/WorkflowCard';
import ApprovalCard from '../components/ApprovalCard';
import DashboardViewSelector from '../components/DashboardViewSelector';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [workflows, setWorkflows] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  // UI controls
  const [query, setQuery] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState('all');
  const [approvalStatus, setApprovalStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updated_desc');
  const [viewType, setViewType] = useState('overview');

  const location = useLocation();
  const navigate = useNavigate();

  // fetch data on mount
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [workflowsData, approvalsData] = await Promise.all([
          getWorkflows(),
          getPendingApprovals()
        ]);
        if (!mounted) return;
        setWorkflows(workflowsData);
        setPendingApprovals(approvalsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  // sync viewType with ?view= query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const v = params.get('view');
    if (v) setViewType(v);
    else setViewType('overview');
  }, [location.search]);

  // data is fetched in the mount effect (fetchData)

  const lowerQuery = query.trim().toLowerCase();

  // Derived filtered lists (memoized for performance)
  const filteredWorkflows = useMemo(() => {
    let list = workflows.slice();

    if (workflowStatus !== 'all') {
      list = list.filter(w => (w.status || '').toLowerCase() === workflowStatus);
    }

    if (lowerQuery) {
      list = list.filter(w => (w.name || '').toLowerCase().includes(lowerQuery) || (w.id || '').toString().includes(lowerQuery));
    }

    if (sortBy === 'updated_desc') {
      list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    } else if (sortBy === 'updated_asc') {
      list.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
    } else if (sortBy === 'created_desc') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [workflows, workflowStatus, lowerQuery, sortBy]);

  const filteredApprovals = useMemo(() => {
    let list = pendingApprovals.slice();

    if (approvalStatus !== 'all') {
      list = list.filter(a => (a.status || '').toLowerCase() === approvalStatus);
    }

    if (lowerQuery) {
      list = list.filter(a => {
        return (a.step_name || '').toLowerCase().includes(lowerQuery) || (a.assigned_to || '').toLowerCase().includes(lowerQuery) || (a.id || '').toString().includes(lowerQuery);
      });
    }

    return list;
  }, [pendingApprovals, approvalStatus, lowerQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-1/2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workflows or approvals..."
            className="input w-full"
          />
          <button onClick={() => { setQuery(''); setWorkflowStatus('all'); setApprovalStatus('all'); setSortBy('updated_desc'); }} className="btn-outline">
            Reset
          </button>
        </div>

          <div className="flex items-center space-x-3">
          <DashboardViewSelector value={viewType} onChange={(v) => {
            setViewType(v);
            // update query param without reloading
            const params = new URLSearchParams(location.search);
            if (v === 'overview') params.delete('view'); else params.set('view', v);
            navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
          }} />

          <select value={workflowStatus} onChange={e => setWorkflowStatus(e.target.value)} className="input">
            <option value="all">All workflows</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} className="input">
            <option value="all">All approvals</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input">
            <option value="updated_desc">Sort: Updated ⬇︎</option>
            <option value="updated_asc">Sort: Updated ⬆︎</option>
            <option value="created_desc">Sort: Created ⬇︎</option>
          </select>
        </div>
      </div>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-700">{viewType}</span>
          </div>
          <p className="text-gray-600 mt-2">Monitor workflows and pending approvals</p>
        </div>
        <Link to="/create">
          <button className="btn-primary">
            + New Workflow
          </button>
        </Link>
      </div>

      {/* Sections (conditional by viewType) */}
      {viewType === 'overview' && (
        <>
          {/* Pending Approvals Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Pending Approvals</h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {filteredApprovals.length} shown
              </span>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-900 mb-2">No pending approvals</p>
                  <p className="text-gray-600">All caught up! New approval requests will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredApprovals.map(approval => (
                  <ApprovalCard key={approval.id} approval={approval} />
                ))}
              </div>
            )}
          </section>

          {/* Recent Workflows Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Workflows</h2>
            
            {filteredWorkflows.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium text-gray-900 mb-2">No workflows yet</p>
                  <p className="text-gray-600 mb-4">Create your first workflow to get started.</p>
                  <Link to="/create">
                    <button className="btn-primary">Create Workflow</button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWorkflows.map(workflow => (
                  <WorkflowCard key={workflow.id} workflow={workflow} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {viewType === 'approvals' && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Approvals</h2>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
              {filteredApprovals.length} shown
            </span>
          </div>

          {filteredApprovals.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-gray-500">
                <p className="text-lg font-medium text-gray-900 mb-2">No approvals found</p>
                <p className="text-gray-600">Try changing filters or check back later.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApprovals.map(approval => (
                <ApprovalCard key={approval.id} approval={approval} />
              ))}
            </div>
          )}
        </section>
      )}

      {viewType === 'workflows' && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Workflows</h2>

          {filteredWorkflows.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-gray-500">
                <p className="text-lg font-medium text-gray-900 mb-2">No workflows found</p>
                <p className="text-gray-600 mb-4">Create a workflow to get started.</p>
                <Link to="/create">
                  <button className="btn-primary">Create Workflow</button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkflows.map(workflow => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </section>
      )}

      {viewType === 'compact' && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Approvals (compact)</h3>
              <div className="space-y-2">
                {filteredApprovals.map(a => (
                  <div key={a.id} className="p-3 border rounded flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">{a.step_name}</div>
                      <div className="text-gray-500">{a.assigned_to}</div>
                    </div>
                    <div className="text-sm text-gray-600">{a.status}</div>
                  </div>
                ))}
                {filteredApprovals.length === 0 && (
                  <div className="text-gray-500">No approvals</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Workflows (compact)</h3>
              <div className="space-y-2">
                {filteredWorkflows.map(w => (
                  <div key={w.id} className="p-3 border rounded flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-medium">{w.name}</div>
                      <div className="text-gray-500">{w.id}</div>
                    </div>
                    <div className="text-sm text-gray-600">{w.status}</div>
                  </div>
                ))}
                {filteredWorkflows.length === 0 && (
                  <div className="text-gray-500">No workflows</div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
