import React, { useState, useEffect } from 'react';
import { QueueProvider } from './context/QueueContext';
import { Navbar } from './components/Navbar';
import { ReceptionistDashboard } from './components/ReceptionistDashboard';
import { PatientWaitingScreen } from './components/PatientWaitingScreen';
import { QueueAnalytics } from './components/QueueAnalytics';
import { ToastContainer } from './components/Toast';

type ViewType = 'receptionist' | 'patient' | 'analytics';

const AppContent: React.FC = () => {
  // Read initial view from URL query params (useful for TV screens)
  const [view, setView] = useState<ViewType>(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view') as ViewType;
    if (viewParam === 'patient' || viewParam === 'analytics') {
      return viewParam;
    }
    return 'receptionist';
  });

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
      if (viewParam === 'receptionist' || viewParam === 'patient' || viewParam === 'analytics') {
        setView(viewParam);
      } else {
        setView('receptionist');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <Navbar currentView={view} setView={handleSetView} />

      {/* Main View Container */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {view === 'receptionist' && <ReceptionistDashboard />}
        {view === 'patient' && <PatientWaitingScreen />}
        {view === 'analytics' && <QueueAnalytics />}
      </main>

      {/* Toast Notification Manager */}
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
