import React from 'react';
import { useQueue } from '../context/QueueContext';
import { LayoutDashboard, Tv, BarChart3, Activity, Sun, Moon, Stethoscope, Power } from 'lucide-react';

interface NavbarProps {
  currentView: 'receptionist' | 'patient' | 'analytics' | 'doctor';
  setView: (view: 'receptionist' | 'patient' | 'analytics' | 'doctor') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView, theme, toggleTheme }) => {
  const { isConnected, error, sessionId, resetSession } = useQueue();

  const handleEndSession = async () => {
    if (window.confirm("WARNING: Wiping this session will delete all doctors and patients from the database. This cannot be undone. Proceed?")) {
      await resetSession();
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          
          {/* Logo Branding */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm shadow-blue-500/30 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 transition-colors">Queue Cure</span>
              <span className="text-[10px] block font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-0.5 transition-colors">Clinical Systems</span>
            </div>
          </div>

          {/* Navigation Tabs (Only visible when logged in to a session) */}
          {sessionId ? (
            <nav className="flex space-x-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl transition-colors overflow-x-auto shrink">
              <button
                onClick={() => setView('receptionist')}
                className={`inline-flex items-center px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'receptionist'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
                }`}
              >
                <LayoutDashboard className="h-4 w-4 mr-1.5" />
                Receptionist
              </button>
              <button
                onClick={() => setView('doctor')}
                className={`inline-flex items-center px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'doctor'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
                }`}
              >
                <Stethoscope className="h-4 w-4 mr-1.5" />
                Doctor Panel
              </button>
              <button
                onClick={() => setView('patient')}
                className={`inline-flex items-center px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'patient'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
                }`}
              >
                <Tv className="h-4 w-4 mr-1.5" />
                Patient Screen
              </button>
              <button
                onClick={() => setView('analytics')}
                className={`inline-flex items-center px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  currentView === 'analytics'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-750/45'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Analytics
              </button>
            </nav>
          ) : (
            <div className="flex-grow flex items-center justify-center">
              <span className="text-xs font-bold text-slate-455 uppercase tracking-widest bg-slate-50 dark:bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800/80">Clinic Session Portal</span>
            </div>
          )}

          {/* Action Area: Session ID + End Session + Theme Toggle + Status */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 shrink-0">
            {/* Session ID display badge */}
            {sessionId && (
              <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-extrabold px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs uppercase tracking-wider border border-blue-100 dark:border-blue-900/30 flex items-center shadow-xs">
                <span className="opacity-60 mr-1 hidden md:inline">Session ID:</span> {sessionId}
              </div>
            )}

            {/* End Session Button */}
            {sessionId && (
              <button
                onClick={handleEndSession}
                className="inline-flex items-center px-2.5 py-1.5 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                title="End Active Clinic Session"
              >
                <Power className="h-3.5 w-3.5 text-rose-500 mr-1 shrink-0" />
                <span className="hidden md:inline">End Session</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4.5 w-4.5 text-amber-400" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-slate-600" />
              )}
            </button>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden lg:inline">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
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
