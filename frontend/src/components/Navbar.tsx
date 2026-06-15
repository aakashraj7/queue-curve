import React from 'react';
import { useQueue } from '../context/QueueContext';
import { LayoutDashboard, Tv, BarChart3, Activity } from 'lucide-react';

interface NavbarProps {
  currentView: 'receptionist' | 'patient' | 'analytics';
  setView: (view: 'receptionist' | 'patient' | 'analytics') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView }) => {
  const { isConnected, error } = useQueue();

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo Branding */}
          <div className="flex items-center space-x-2.5">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm shadow-blue-500/30 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-800">Queue Cure</span>
              <span className="text-[10px] block font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Clinical Systems</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setView('receptionist')}
              className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentView === 'receptionist'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 mr-1.5" />
              Receptionist
            </button>
            <button
              onClick={() => setView('patient')}
              className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentView === 'patient'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <Tv className="h-4 w-4 mr-1.5" />
              Patient Screen
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                currentView === 'analytics'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Analytics
            </button>
          </nav>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
              {isConnected ? 'Live Connected' : 'Offline'}
            </span>
          </div>

        </div>
      </div>
      
      {/* Live Error Alert Banner */}
      {error && (
        <div className="bg-rose-500 text-white text-center py-2 text-xs font-bold px-4 tracking-wide animate-pulse">
          {error}
        </div>
      )}
    </header>
  );
};
