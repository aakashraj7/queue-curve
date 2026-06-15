import React from 'react';

interface StatusBadgeProps {
  status: 'waiting' | 'serving' | 'completed' | 'skipped';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let text = 'Waiting';
  let styles = 'bg-blue-50 text-blue-700 border-blue-200';

  if (status === 'serving') {
    text = 'With Doctor';
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse-ring';
  } else if (status === 'completed') {
    text = 'Completed';
    styles = 'bg-slate-100 text-slate-600 border-slate-200';
  } else if (status === 'skipped') {
    text = 'Skipped';
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {status === 'serving' && (
        <span className="w-1.5 h-1.5 mr-1.5 bg-emerald-500 rounded-full animate-pulse" />
      )}
      {text}
    </span>
  );
};
