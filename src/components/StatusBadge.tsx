import React from 'react';

export type Status = 'success' | 'warning' | 'error' | 'info' | 'default';

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

const statusColors: Record<Status, string> = {
  success: 'green',
  warning: 'orange',
  error: 'red',
  info: 'blue',
  default: 'gray',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const color = statusColors[status] ?? statusColors.default;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        backgroundColor: color,
        color: 'white',
        fontSize: '0.75rem',
      }}
    >
      {label ?? status}
    </span>
  );
};

export default StatusBadge;