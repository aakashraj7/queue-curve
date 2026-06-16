import React from 'react';

interface StatusBadgeProps {
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let text = 'Waiting';
  let styles = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40';

  if (status === 'calling') {
    text = 'Calling';
    styles = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/40 animate-pulse';
  } else if (status === 'serving') {
    text = 'With Doctor';
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40 animate-pulse-ring';
  } else if (status === 'completed') {
    text = 'Completed';
    styles = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  } else if (status === 'skipped') {
    text = 'Skipped';
    styles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {(status === 'serving' || status === 'calling') && (
        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full animate-pulse ${
          status === 'calling' ? 'bg-indigo-500' : 'bg-emerald-500'
        }`} />
      )}
      {text}
    </span>
  );
};
