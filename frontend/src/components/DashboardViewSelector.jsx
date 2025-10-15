import React from 'react';

export default function DashboardViewSelector({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="input">
      <option value="overview">Overview</option>
      <option value="approvals">Approvals</option>
      <option value="workflows">Workflows</option>
      <option value="compact">Compact</option>
    </select>
  );
}
