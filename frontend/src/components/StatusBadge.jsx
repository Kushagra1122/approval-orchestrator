import React from 'react';

export default function StatusBadge({ status, size = 'md' }) {
  const statusConfig = {
    running: { 
      label: 'Running', 
      icon: '⚡',
      className: 'bg-green-100 text-green-800 border border-green-200' 
    },
    paused: { 
      label: 'Paused', 
      icon: '⏸️',
      className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
    },
    pending: { 
      label: 'Pending', 
      icon: '⏳',
      className: 'bg-orange-100 text-orange-800 border border-orange-200' 
    },
    approved: { 
      label: 'Approved', 
      icon: '✅',
      className: 'bg-blue-100 text-blue-800 border border-blue-200' 
    },
    rejected: { 
      label: 'Rejected', 
      icon: '❌',
      className: 'bg-red-100 text-red-800 border border-red-200' 
    },
    expired: {
      label: 'Expired',
      icon: '⌛',
      className: 'bg-gray-100 text-gray-800 border border-gray-200'
    },
    cancelled: {
      label: 'Cancelled',
      icon: '🚫',
      className: 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const config = statusConfig[status] || { 
    label: status, 
    icon: '❓',
    className: 'bg-gray-100 text-gray-800 border border-gray-200' 
  };

  return (
    <span className={`inline-flex items-center space-x-1.5 rounded-full font-medium ${config.className} ${sizeClasses[size]}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}