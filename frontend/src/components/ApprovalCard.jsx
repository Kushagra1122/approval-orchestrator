import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ApprovalCard({ approval }) {
  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  const getTimeUntilTimeout = (timeoutAt) => {
    const now = new Date();
    const timeout = new Date(timeoutAt);
    const diff = timeout - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900">{approval.step_name}</h3>
        <StatusBadge status={approval.status} />
      </div>
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <p><span className="font-medium">Assigned to:</span> {approval.assigned_to}</p>
        <p><span className="font-medium">Channel:</span> {approval.channel || 'web'}</p>
        <p><span className="font-medium">Requested:</span> {formatTime(approval.requested_at)}</p>
        {approval.timeout_at && approval.status === 'pending' && (
          <p><span className="font-medium">Timeout in:</span> {getTimeUntilTimeout(approval.timeout_at)}</p>
        )}
        {approval.responded_at && (
          <p><span className="font-medium">Responded:</span> {formatTime(approval.responded_at)}</p>
        )}
      </div>

      <div className="flex space-x-2">
        <Link to={`/approvals/${approval.id}`}>
          <button className="btn-outline text-sm">
            View Details
          </button>
        </Link>
      </div>
    </div>
  );
}
