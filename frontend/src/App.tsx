import React, { useState, useEffect } from 'react';
import { QueueProvider, useQueue } from './context/QueueContext';
import { Navbar } from './components/Navbar';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { PatientWaitingScreen } from './components/PatientWaitingScreen';
import { QueueAnalytics } from './components/QueueAnalytics';
import { DoctorDashboard } from './components/DoctorDashboard';
import { SessionSetup } from './components/SessionSetup';
import { ToastContainer } from './components/Toast';
import { Activity, ShieldAlert } from 'lucide-react';

type ViewType = 'receptionist' | 'patient' | 'analytics' | 'doctor';

const AppContent: React.FC = () => {
  const { sessionId, role, joinSession } = useQueue();
  const [tvSessionInput, setTvSessionInput] = useState('');

  // Read initial view from URL query params (useful for TV screens)
  const [view, setView] = useState<ViewType>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as ViewType;
    if (viewParam === 'patient' || viewParam === 'analytics' || viewParam === 'doctor') {
      return viewParam;
    }
    return 'receptionist';
  });

  // Theme state: default to 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme as 'light' | 'dark') || 'dark';
  });

  // Synchronise dark mode class with root html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sync state changes with URL query parameters
  const handleSetView = (newView: ViewType) => {
    setView(newView);
    const url = new URL(window.location.href);
    url.searchParams.set('view', newView);
    window.history.pushState({}, '', url.toString());
  };

  // Listen to browser history navigation (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') as ViewType;
      if (
        viewParam === 'receptionist' || 
        viewParam === 'patient' || 
        viewParam === 'analytics' ||
        viewParam === 'doctor'
      ) {
        setView(viewParam);
      } else {
        setView('receptionist');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auto-join from URL parameter if present on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    const viewParam = params.get('view') as ViewType;
    const doctorParam = params.get('doctor');

    if (sessionParam && !sessionId) {
      let targetRole: 'receptionist' | 'doctor' | 'display' = 'receptionist';
      if (viewParam === 'patient') targetRole = 'display';
      else if (viewParam === 'doctor') targetRole = 'doctor';
      
      joinSession(sessionParam, targetRole, doctorParam);
    }
  }, [sessionId, joinSession]);

  // Route/Access guards: prevent viewing unauthorized screens when logged in
  useEffect(() => {
    if (sessionId && role) {
      if (role === 'receptionist' && (view === 'doctor' || view === 'patient')) {
        handleSetView('receptionist');
      } else if (role === 'doctor' && (view === 'receptionist' || view === 'patient')) {
        handleSetView('doctor');
      } else if (role === 'display' && view !== 'patient') {
        handleSetView('patient');
      }
    }
  }, [sessionId, role, view]);

  const handleTVJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tvSessionInput.trim().length === 4) {
      await joinSession(tvSessionInput, 'display', null);
    }
  };

  // 1. If not logged into any session
  if (!sessionId) {
    if (view === 'patient') {
      // Patient Waiting TV screen offline placeholder with Session ID entry
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-8 text-center transition-colors">
          <div className="flex items-center space-x-2 justify-center py-4 border-b border-slate-800">
            <Activity className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-black tracking-tight">Queue Cure Waiting Board</span>
          </div>
          
          <div className="my-auto py-16 flex flex-col items-center max-w-sm mx-auto">
            <ShieldAlert className="h-14 w-14 text-slate-600 mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-slate-300">Connect to Lobby Board</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Enter the 4-digit clinical session ID to stream real-time queue states.
            </p>
            
            <form onSubmit={handleTVJoinSubmit} className="w-full space-y-4">
              <input
                type="text"
                maxLength={4}
                placeholder="Session ID (e.g. A1B2)"
                value={tvSessionInput}
                onChange={(e) => setTvSessionInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                className="w-full text-center py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-extrabold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500 text-lg"
              />
              <button
                type="submit"
                disabled={tvSessionInput.trim().length < 4}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 py-3 rounded-xl font-bold text-sm transition cursor-pointer"
              >
                Connect Board
              </button>
            </form>
          </div>

          <div className="text-slate-600 text-xs font-semibold uppercase tracking-wider border-t border-slate-800 pt-4">
            Lobby Board Offline • Powered by Queue Cure
          </div>
          <ToastContainer />
        </div>
      );
    }

    // Receptionist / Doctor dashboards show Setup/Join Portal
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
        <Navbar 
          currentView={view} 
          setView={handleSetView} 
          theme={theme} 
          toggleTheme={toggleTheme} 
        />
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <SessionSetup />
        </main>
        <ToastContainer />
      </div>
    );
  }

  // 2. If logged in as Patient Waiting TV Display: hide Navbar completely
  if (role === 'display') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col p-4 sm:p-8 transition-colors">
        <main className="flex-grow w-full h-full flex flex-col">
          <PatientWaitingScreen />
        </main>
      </div>
    );
  }

  // 3. Logged in dashboard layout (Receptionist or Doctor)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300">
      <Navbar 
        currentView={view} 
        setView={handleSetView} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {view === 'receptionist' && role === 'receptionist' && <ReceptionistDashboard />}
        {view === 'doctor' && role === 'doctor' && <DoctorDashboard />}
        {view === 'analytics' && <QueueAnalytics />}
      </main>

      <ToastContainer />
    </div>
  );
};

function App() {
  return (
    <QueueProvider>
      <AppContent />
    </QueueProvider>
  );
}

export default App;
