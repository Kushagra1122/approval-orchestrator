import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function WorkflowCard({ workflow }) {
  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
        <StatusBadge status={workflow.status} />
      </div>
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <p><span className="font-medium">Created:</span> {new Date(workflow.created_at).toLocaleString()}</p>
        <p><span className="font-medium">Updated:</span> {new Date(workflow.updated_at).toLocaleString()}</p>
        {workflow.context && Object.keys(workflow.context).length > 0 && (
          <div>
            <span className="font-medium">Context:</span>
            <pre className="text-xs mt-1 p-2 bg-gray-50 rounded border">
              {JSON.stringify(workflow.context, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <Link to={`/workflows/${workflow.id}`}>
          <button className="btn-outline text-sm">
            View Details
          </button>
        </Link>
      </div>
    </div>
  );
}
