import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  getAnalyticsOverview,
  getAnalyticsResponseTimes,
  getAnalyticsTopApprovers,
  getAnalyticsChannels,
  getAnalyticsActivity,
  getAnalyticsWorkflowPerformance,
  getAnalyticsRollbacks
} from '../services/api';
import StatusBadge from '../components/StatusBadge';
import ActivityTimeline from '../components/ActivityTimeline';

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [responseTimes, setResponseTimes] = useState([]);
  const [topApprovers, setTopApprovers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activity, setActivity] = useState([]);
  const [workflowPerformance, setWorkflowPerformance] = useState([]);
  const [rollbackStats, setRollbackStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyticsData = async () => {
    try {
      const [
        overviewData,
        responseTimesData,
        topApproversData,
        channelsData,
        activityData,
        workflowPerformanceData,
        rollbackStatsData
      ] = await Promise.all([
        getAnalyticsOverview(),
        getAnalyticsResponseTimes(),
        getAnalyticsTopApprovers(),
        getAnalyticsChannels(),
        getAnalyticsActivity(15),
        getAnalyticsWorkflowPerformance(),
        getAnalyticsRollbacks()
      ]);

      setOverview(overviewData);
      setResponseTimes(responseTimesData);
      setTopApprovers(topApproversData);
      setChannels(channelsData);
      setActivity(activityData);
      setWorkflowPerformance(workflowPerformanceData);
      setRollbackStats(rollbackStatsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      setRefreshing(true);
      loadAnalyticsData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Chart configurations and colors
  const chartColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  const responseTimesChartData = responseTimes.map(rt => ({
    date: new Date(rt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    averageMinutes: rt.averageMinutes,
    count: rt.count
  }));

  const channelsChartData = channels.map((c, index) => ({
    name: c.channel.charAt(0).toUpperCase() + c.channel.slice(1),
    value: c.count,
    fill: chartColors[index % chartColors.length]
  }));

  const approvalStatusChartData = [
    { name: 'Approved', value: overview?.overview.approvedCount || 0, fill: '#10B981' },
    { name: 'Rejected', value: overview?.overview.rejectedCount || 0, fill: '#EF4444' },
    { name: 'Pending', value: overview?.overview.pendingApprovals || 0, fill: '#F59E0B' },
    { name: 'Expired', value: overview?.overview.expiredCount || 0, fill: '#9CA3AF' },
  ];

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time insights into your approval workflows</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`btn-primary ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Workflows</p>
              <p className="text-3xl font-bold text-blue-900">{overview?.overview.totalWorkflows || 0}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-full">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Approved</p>
              <p className="text-3xl font-bold text-green-900">{overview?.overview.approvedCount || 0}</p>
            </div>
            <div className="p-3 bg-green-500 rounded-full">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-900">{overview?.overview.pendingApprovals || 0}</p>
            </div>
            <div className="p-3 bg-yellow-500 rounded-full">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Avg Response</p>
              <p className="text-3xl font-bold text-purple-900">
                {formatDuration(overview?.overview.averageResponseTimeMinutes || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-500 rounded-full">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Response Times Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Response Times (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTimesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="averageMinutes" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Approval Status Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Approval Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={approvalStatusChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {approvalStatusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Channel Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 Channel Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelsChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {channelsChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Approvers */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Top Approvers (Last 30 Days)</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {topApprovers.map((approver, index) => (
              <div key={approver.assignedTo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{approver.assignedTo}</p>
                    <p className="text-sm text-gray-600">{approver.totalApprovals} approvals</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatDuration(approver.averageResponseMinutes)}
                  </p>
                  <p className="text-xs text-gray-500">avg response</p>
                </div>
              </div>
            ))}
            {topApprovers.length === 0 && (
              <p className="text-gray-500 text-center py-8">No approval data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Live Activity and Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Activity Timeline */}
        <div className="card">
          <ActivityTimeline limit={8} />
        </div>

        {/* Recent Activity (from API) */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">📋 Recent Actions</h3>
            <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
              API Data
            </span>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activity.map((item) => (
              <div key={item.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <StatusBadge status={item.status} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">{item.stepName}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.channel === 'slack' ? 'bg-purple-100 text-purple-800' : 
                      item.channel === 'email' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.channel === 'slack' ? '🚀 Slack' : 
                       item.channel === 'email' ? '📧 Email' : 
                       '🌐 Web'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{item.workflowName} • {item.assignedTo}</p>
                  <p className="text-xs text-gray-500">{new Date(item.lastActivity).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Performance Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">⚙️ Workflow Performance (Last 30 Days)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approvals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workflowPerformance.slice(0, 10).map((workflow) => (
                <tr key={workflow.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{workflow.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{workflow.id}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={workflow.status} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        ✅ {workflow.approvedCount}
                      </span>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                        ❌ {workflow.rejectedCount}
                      </span>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        ⏳ {workflow.pendingCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(workflow.averageApprovalTimeMinutes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(workflow.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {workflowPerformance.length === 0 && (
            <p className="text-gray-500 text-center py-8">No workflow data available</p>
          )}
        </div>
      </div>

      {/* Rollback Statistics */}
      {rollbackStats && rollbackStats.stats.total_rollbacks > 0 && (
        <div className="card border-orange-200 bg-orange-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Rollback Statistics (Last 30 Days)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Rollbacks:</span>
                  <span className="font-medium">{rollbackStats.stats.total_rollbacks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Workflows Affected:</span>
                  <span className="font-medium">{rollbackStats.stats.workflows_rolled_back}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Common Reasons:</h4>
              <div className="space-y-1">
                {rollbackStats.byReason.map((reason, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate">{reason.reason}</span>
                    <span className="font-medium">{reason.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-4">
        Analytics data refreshes automatically every 30 seconds
      </div>
    </div>
  );
}