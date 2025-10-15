import React, { useState, useEffect } from 'react';
import { getAnalyticsActivity } from '../services/api';
import StatusBadge from './StatusBadge';

export default function ActivityTimeline({ limit = 10 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await getAnalyticsActivity(limit);
        setActivities(data);
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, [limit]);

  const getActivityIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'timed_out': return '⌛';
      case 'cancelled': return '🚫';
      default: return '�';
    }
  };

  const getActivityMessage = (activity) => {
    return `${activity.stepName} was ${activity.status}`;
  };

  const getChannelColor = (channel) => {
    switch (channel) {
      case 'slack': return 'bg-purple-100 text-purple-800';
      case 'email': return 'bg-green-100 text-green-800';
      case 'web': return 'bg-blue-100 text-blue-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return time.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">📋 Recent Activity</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span className="text-sm text-gray-600">
            {loading ? 'Loading...' : 'Auto-refresh'}
          </span>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading recent activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">No recent activity</p>
            <p className="text-gray-600">
              Approval actions will appear here as they happen
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div 
              key={activity.id} 
              className="group relative flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-gray-300 transition-all duration-200"
            >
              {/* Icon with colored background */}
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center text-lg border-2 border-blue-200">
                {getActivityIcon(activity.status)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {getActivityMessage(activity)}
                  </p>
                  <StatusBadge status={activity.status} size="sm" />
                </div>
                
                <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                  <span className={`px-2 py-1 rounded-full font-medium ${getChannelColor(activity.channel)}`}>
                    {activity.channel === 'slack' ? '🚀 Slack' : 
                     activity.channel === 'email' ? '📧 Email' : 
                     '🌐 Web'}
                  </span>
                  <span>•</span>
                  <span className="font-medium text-gray-700">{activity.assignedTo}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">{activity.workflowName}</span>
                    {activity.workflowId && (
                      <>
                        <span className="mx-1">•</span>
                        <span className="font-mono">{activity.workflowId.slice(0, 8)}...</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTime(activity.lastActivity)}
                  </span>
                </div>
              </div>

              {/* Hover indicator */}
              <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 py-2 border-t border-gray-100">
        {activities.length > 0 ? (
          <>Showing {activities.length} recent activities • Updates every 30 seconds</>
        ) : (
          <>No activities to display</>
        )}
      </div>
    </div>
  );
}
