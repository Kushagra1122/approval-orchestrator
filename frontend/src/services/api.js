import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Workflow endpoints
export const getWorkflows = () => api.get('/workflows').then(res => res.data);
export const getWorkflow = (id) => api.get(`/workflows/${id}`).then(res => res.data);
export const createWorkflow = (data) => api.post('/workflows', data).then(res => res.data);

// Approval endpoints
export const getApproval = (id) => api.get(`/approvals/${id}`).then(res => res.data);
export const getPendingApprovals = () => api.get('/approvals?status=pending').then(res => res.data);
export const getApprovalsByWorkflow = (workflowId) => api.get(`/approvals?workflow_id=${workflowId}`).then(res => res.data);
export const respondToApproval = (id, decision, feedback) => 
  api.post(`/approvals/${id}/respond`, { decision, feedback }).then(res => res.data);
export const createApproval = (workflowId, data) =>
  api.post(`/workflows/${workflowId}/approvals`, data).then(res => res.data);

// NEW: Rollback endpoints
export const rollbackWorkflow = (workflowId, data) =>
  api.post(`/workflow-rollbacks/${workflowId}/rollback`, data).then(res => res.data);

export const getRollbackHistory = (workflowId) =>
  api.get(`/workflow-rollbacks/${workflowId}/rollbacks`).then(res => res.data);

// NEW: Analytics endpoints
export const getAnalyticsOverview = () => api.get('/analytics/overview').then(res => res.data);
export const getAnalyticsResponseTimes = () => api.get('/analytics/response-times').then(res => res.data);
export const getAnalyticsTopApprovers = () => api.get('/analytics/top-approvers').then(res => res.data);
export const getAnalyticsChannels = () => api.get('/analytics/channels').then(res => res.data);
export const getAnalyticsActivity = (limit = 20) => api.get(`/analytics/activity?limit=${limit}`).then(res => res.data);
export const getAnalyticsWorkflowPerformance = () => api.get('/analytics/workflow-performance').then(res => res.data);
export const getAnalyticsRollbacks = () => api.get('/analytics/rollbacks').then(res => res.data);
