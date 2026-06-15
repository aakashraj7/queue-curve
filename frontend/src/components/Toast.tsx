import React from 'react';
import { useQueue } from '../context/QueueContext';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useQueue();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => {
        let icon = <Info className="h-5 w-5 text-blue-500" />;
        let bgColor = 'bg-blue-50 border-blue-200';
        let textColor = 'text-blue-800';

        if (toast.type === 'success') {
          icon = <CheckCircle className="h-5 w-5 text-emerald-500" />;
          bgColor = 'bg-emerald-50 border-emerald-200';
          textColor = 'text-emerald-800';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
          bgColor = 'bg-amber-50 border-amber-200';
          textColor = 'text-amber-800';
        } else if (toast.type === 'error') {
          icon = <XCircle className="h-5 w-5 text-rose-500" />;
          bgColor = 'bg-rose-50 border-rose-200';
          textColor = 'text-rose-800';
        }

        return (
          <div
            key={toast.id}
            className={`flex items-start p-4 rounded-xl border shadow-lg transition-all duration-300 transform translate-y-0 scale-100 ${bgColor} ${textColor}`}
          >
            <div className="flex-shrink-0 mr-3">{icon}</div>
            <div className="flex-grow text-sm font-medium mr-2">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 rounded-lg p-0.5 hover:bg-slate-100/55 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
