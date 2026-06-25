import React from 'react';

const StatusBadge = ({ status, text }) => {
  let colorVar = '--primary';
  let bgColorVar = '--primary-container';
  
  if (status === 'success' || status === 'active') {
    colorVar = '--status-emerald';
    bgColorVar = 'rgba(16, 185, 129, 0.1)';
  } else if (status === 'error' || status === 'critical') {
    colorVar = '--status-critical';
    bgColorVar = 'rgba(239, 68, 68, 0.1)';
  } else if (status === 'warning') {
    colorVar = '--status-warning';
    bgColorVar = 'rgba(245, 158, 11, 0.1)';
  }

  return (
    <span 
      className="status-badge font-label-caps" 
      style={{ 
        color: `var(${colorVar})`, 
        backgroundColor: bgColorVar 
      }}
    >
      {text}
      <style>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }
      `}</style>
    </span>
  );
};

export default StatusBadge;
