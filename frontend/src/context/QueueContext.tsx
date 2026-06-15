import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

export interface Patient {
  _id: string;
  tokenNumber: number;
  patientName: string;
  status: 'waiting' | 'serving' | 'completed' | 'skipped';
  estimatedWaitTime: number;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
}

export interface QueueSettings {
  averageConsultationTime: number;
}

export interface QueueAnalytics {
  patientsServed: number;
  averageWaitTime: number;
  averageConsultationTime: number;
  skippedPatientsCount: number;
  activeQueueCount: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface QueueContextType {
  activeQueue: Patient[];
  skippedQueue: Patient[];
  settings: QueueSettings;
  analytics: QueueAnalytics;
  toasts: ToastMessage[];
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  addPatient: (name: string) => Promise<boolean>;
  callNextPatient: () => Promise<void>;
  completePatient: (id: string) => Promise<void>;
  skipPatient: (id: string) => Promise<void>;
  restorePatient: (id: string) => Promise<void>;
  updateSettings: (time: number) => Promise<void>;
  removeToast: (id: string) => void;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeQueue, setActiveQueue] = useState<Patient[]>([]);
  const [skippedQueue, setSkippedQueue] = useState<Patient[]>([]);
  const [settings, setSettings] = useState<QueueSettings>({ averageConsultationTime: 15 });
  const [analytics, setAnalytics] = useState<QueueAnalytics>({
    patientsServed: 0,
    averageWaitTime: 0,
    averageConsultationTime: 0,
    skippedPatientsCount: 0,
    activeQueueCount: 0
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);



  // Toast functions
  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const socketConnection = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketConnection.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      setError(null);
    });

    socketConnection.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    socketConnection.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setIsConnected(false);
      setError('Connection to live updates server lost. Attempting to reconnect...');
    });

    // Real-time synchronization event
    socketConnection.on('queue-updated', (data: {
      activeQueue: Patient[];
      skippedQueue: Patient[];
      settings: QueueSettings;
      analytics: QueueAnalytics;
    }) => {
      setActiveQueue(data.activeQueue);
      setSkippedQueue(data.skippedQueue);
      setSettings(data.settings);
      setAnalytics(data.analytics);
    });

    // Real-time toast alerts
    socketConnection.on('patient-added', (data: { patientName: string; tokenNumber: number }) => {
      addToast(`New Patient Added: ${data.patientName} (Token #${data.tokenNumber})`, 'success');
    });

    socketConnection.on('next-patient-called', (data: { patientName: string; tokenNumber: number }) => {
      addToast(`Calling Next Patient: Token #${data.tokenNumber} - ${data.patientName}`, 'info');
    });

    socketConnection.on('patient-completed', (data: { patientName: string; tokenNumber: number }) => {
      addToast(`Patient Consultation Completed: Token #${data.tokenNumber} - ${data.patientName}`, 'success');
    });

    socketConnection.on('patient-skipped', (data: { patientName: string; tokenNumber: number }) => {
      addToast(`Patient Skipped: ${data.patientName} (Token #${data.tokenNumber})`, 'warning');
    });

    socketConnection.on('patient-restored', (data: { patientName: string; tokenNumber: number }) => {
      addToast(`Patient Restored: ${data.patientName} (Token #${data.tokenNumber}) back in queue`, 'info');
    });

    socketConnection.on('consultation-time-changed', (data: { averageConsultationTime: number }) => {
      addToast(`Settings Updated: Average consultation duration changed to ${data.averageConsultationTime} minutes`, 'info');
    });



    // Initial fetch of data
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/queue`);
        if (!res.ok) throw new Error('Failed to load queue data');
        const data = await res.json();
        setActiveQueue(data.activeQueue);
        setSkippedQueue(data.skippedQueue);
        setSettings(data.settings);
        setAnalytics(data.analytics);
        setError(null);
      } catch (err: any) {
        console.error('Initial fetch error:', err);
        setError('Failed to connect to backend server. Make sure the server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      socketConnection.disconnect();
    };
  }, [addToast]);

  // Actions
  const addPatient = async (name: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName: name })
      });
      const data = await res.json();
      
      if (!res.ok) {
        addToast(data.message || 'Error adding patient', 'error');
        return false;
      }
      return true;
    } catch (err: any) {
      addToast('Network error while adding patient.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const callNextPatient = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/call-next`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error calling next patient');
      if (data.nextPatient) {
        // Success
      } else {
        addToast('No patients left in the waiting queue!', 'warning');
      }
    } catch (err: any) {
      addToast(err.message || 'Network error while calling next patient', 'error');
    } finally {
      setLoading(false);
    }
  };

  const completePatient = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/patient/${id}/complete`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error completing patient');
    } catch (err: any) {
      addToast(err.message || 'Network error while completing patient', 'error');
    } finally {
      setLoading(false);
    }
  };

  const skipPatient = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/patient/${id}/skip`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error skipping patient');
    } catch (err: any) {
      addToast(err.message || 'Network error while skipping patient', 'error');
    } finally {
      setLoading(false);
    }
  };

  const restorePatient = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/patient/${id}/restore`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error restoring patient');
    } catch (err: any) {
      addToast(err.message || 'Network error while restoring patient', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (time: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ averageConsultationTime: time })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error updating settings');
    } catch (err: any) {
      addToast(err.message || 'Network error while updating settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <QueueContext.Provider
      value={{
        activeQueue,
        skippedQueue,
        settings,
        analytics,
        toasts,
        isConnected,
        loading,
        error,
        addPatient,
        callNextPatient,
        completePatient,
        skipPatient,
        restorePatient,
        updateSettings,
        removeToast,
        addToast
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};
