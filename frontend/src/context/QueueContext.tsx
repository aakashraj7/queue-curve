import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

export interface Patient {
  _id: string;
  sessionId: string;
  tokenNumber: number;
  patientName: string;
  assignedDoctors: string[]; // ['D1'] or ['all']
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'skipped';
  calledBy?: string; // doctor code
  estimatedWaitTime: number;
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
}

export interface Doctor {
  code: string;
  name: string;
  availability?: 'available' | 'lunch-break' | 'not-available';
}

export interface QueueSettings {
  sessionId?: string;
  averageConsultationTime: number;
  sessionStatus?: 'open' | 'lunch-break' | 'closed';
  mostSignificantMessage?: string;
  leastSignificantMessage?: string;
  isInitialized: boolean;
  doctors: Doctor[];
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
  sessionId: string | null;
  role: 'receptionist' | 'doctor' | 'display' | null;
  doctorCode: string | null;
  activeQueue: Patient[];
  skippedQueue: Patient[];
  settings: QueueSettings;
  analytics: QueueAnalytics;
  toasts: ToastMessage[];
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  validateSession: (id: string) => Promise<Doctor[] | null>;
  joinSession: (id: string, role: 'receptionist' | 'doctor' | 'display', doctorCode?: string | null) => Promise<boolean>;
  leaveSession: () => void;
  initializeSession: (time: number, doctors: Doctor[]) => Promise<string | null>;
  resetSession: () => Promise<void>;
  addPatient: (name: string, assignedDoctors?: string[], tokenNumber?: number) => Promise<boolean>;
  callNextPatient: () => Promise<void>;
  callNextDoctorPatient: (doctorCode: string) => Promise<void>;
  arrivedPatient: (id: string) => Promise<void>;
  completePatient: (id: string) => Promise<void>;
  skipPatient: (id: string) => Promise<void>;
  restorePatient: (id: string) => Promise<void>;
  updateSettings: (time: number, status?: 'open' | 'lunch-break' | 'closed', doctorsList?: Doctor[], mostMsg?: string, leastMsg?: string) => Promise<void>;
  removeToast: (id: string) => void;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem('sessionId') || null;
  });
  const [role, setRole] = useState<'receptionist' | 'doctor' | 'display' | null>(() => {
    return (localStorage.getItem('role') as any) || null;
  });
  const [doctorCode, setDoctorCode] = useState<string | null>(() => {
    return localStorage.getItem('doctorCode') || null;
  });

  const [activeQueue, setActiveQueue] = useState<Patient[]>([]);
  const [skippedQueue, setSkippedQueue] = useState<Patient[]>([]);
  const [settings, setSettings] = useState<QueueSettings>({
    averageConsultationTime: 15,
    isInitialized: false,
    doctors: []
  });
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

  const socketRef = useRef<any>(null);

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

  // Sync state variables to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('sessionId', sessionId);
    } else {
      localStorage.removeItem('sessionId');
    }
  }, [sessionId]);

  useEffect(() => {
    if (role) {
      localStorage.setItem('role', role);
    } else {
      localStorage.removeItem('role');
    }
  }, [role]);

  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    if (doctorCode) {
      localStorage.setItem('doctorCode', doctorCode);
    } else {
      localStorage.removeItem('doctorCode');
    }
  }, [doctorCode]);

  // Fetch initial queue state for current session
  const fetchInitialData = useCallback(async (currentSessionId: string) => {
    if (!currentSessionId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/queue`, {
        headers: { 'x-session-id': currentSessionId }
      });
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
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const socketConnection = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socketConnection;

    socketConnection.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      setError(null);
      // Join room if session already loaded
      if (sessionId) {
        socketConnection.emit('join-session', { sessionId });
      }
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
      if (roleRef.current !== 'display') {
        addToast(`New Patient Added: ${data.patientName} (Token #${data.tokenNumber})`, 'success');
      }
    });

    socketConnection.on('next-patient-called', (data: { patientName: string; tokenNumber: number; doctorCode: string }) => {
      if (roleRef.current !== 'display') {
        addToast(`Calling Token #${data.tokenNumber} (${data.patientName}) to Room: ${data.doctorCode}`, 'info');
      }
    });

    socketConnection.on('patient-arrived', (data: { patientName: string; tokenNumber: number; doctorCode: string }) => {
      if (roleRef.current !== 'display') {
        addToast(`Patient Arrived: Token #${data.tokenNumber} (${data.patientName}) is now with ${data.doctorCode}`, 'success');
      }
    });

    socketConnection.on('patient-completed', (data: { patientName: string; tokenNumber: number }) => {
      if (roleRef.current !== 'display') {
        addToast(`Patient Consultation Completed: Token #${data.tokenNumber} - ${data.patientName}`, 'success');
      }
    });

    socketConnection.on('patient-skipped', (data: { patientName: string; tokenNumber: number }) => {
      if (roleRef.current !== 'display') {
        addToast(`Patient Skipped: ${data.patientName} (Token #${data.tokenNumber})`, 'warning');
      }
    });

    socketConnection.on('patient-restored', (data: { patientName: string; tokenNumber: number }) => {
      if (roleRef.current !== 'display') {
        addToast(`Patient Restored: ${data.patientName} (Token #${data.tokenNumber}) back in queue`, 'info');
      }
    });

    socketConnection.on('consultation-time-changed', (data: { averageConsultationTime: number }) => {
      if (roleRef.current !== 'display') {
        addToast(`Settings Updated: Average consultation duration changed to ${data.averageConsultationTime} minutes`, 'info');
      }
    });

    socketConnection.on('session-initialized', (data: QueueSettings) => {
      if (roleRef.current !== 'display') {
        addToast(`Clinic session initialized with ${data.doctors.length} doctors.`, 'success');
      }
    });

    socketConnection.on('session-reset', () => {
      if (roleRef.current !== 'display') {
        addToast('Clinic session has been reset by the receptionist.', 'warning');
      }
      setSessionId(null);
      setRole(null);
      setDoctorCode(null);
      setSettings({
        averageConsultationTime: 15,
        isInitialized: false,
        doctors: []
      });
      setActiveQueue([]);
      setSkippedQueue([]);
    });

    return () => {
      socketConnection.disconnect();
    };
  }, [addToast, sessionId]);

  // Join room when session ID changes
  useEffect(() => {
    if (isConnected && socketRef.current && sessionId) {
      socketRef.current.emit('join-session', { sessionId });
      fetchInitialData(sessionId);
    }
  }, [sessionId, isConnected, fetchInitialData]);

  // Actions
  const validateSession = async (id: string): Promise<Doctor[] | null> => {
    try {
      setLoading(true);
      const cleanId = id.trim().toUpperCase();
      const res = await fetch(`${API_URL}/api/queue/validate/${cleanId}`);
      const data = await res.json();
      if (!res.ok) {
        addToast(data.message || 'Invalid Session ID.', 'error');
        return null;
      }
      return data.settings.doctors || [];
    } catch (err) {
      addToast('Network error while validating Session ID.', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (
    id: string, 
    selectedRole: 'receptionist' | 'doctor' | 'display', 
    selectedDocCode?: string | null
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const cleanId = id.trim().toUpperCase();
      const res = await fetch(`${API_URL}/api/queue/validate/${cleanId}`);
      const data = await res.json();

      if (!res.ok) {
        addToast(data.message || 'Invalid Session ID.', 'error');
        return false;
      }

      setSessionId(cleanId);
      setRole(selectedRole);
      setDoctorCode(selectedDocCode || null);
      setSettings(data.settings);
      addToast(`Connected to session: ${cleanId} (${selectedRole === 'display' ? 'Lobby Screen' : selectedRole})`, 'success');
      return true;
    } catch (err) {
      addToast('Network error while joining session.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const leaveSession = () => {
    setSessionId(null);
    setRole(null);
    setDoctorCode(null);
    setSettings({
      averageConsultationTime: 15,
      isInitialized: false,
      doctors: []
    });
    setActiveQueue([]);
    setSkippedQueue([]);
    addToast('Disconnected from session.', 'info');
  };

  const initializeSession = async (time: number, doctorsList: Doctor[]): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ averageConsultationTime: time, doctors: doctorsList })
      });
      const data = await res.json();

      if (!res.ok) {
        addToast(data.message || 'Error initializing session', 'error');
        return null;
      }
      
      setSessionId(data.sessionId);
      setRole('receptionist');
      setDoctorCode(null);
      setSettings(data.settings);
      addToast(`Session created: ${data.sessionId}`, 'success');
      return data.sessionId;
    } catch (err: any) {
      addToast('Network error while initializing session.', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetSession = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/reset`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error resetting session');
      
      setSessionId(null);
      setRole(null);
      setDoctorCode(null);
      setSettings({
        averageConsultationTime: 15,
        isInitialized: false,
        doctors: []
      });
      setActiveQueue([]);
      setSkippedQueue([]);
    } catch (err: any) {
      addToast(err.message || 'Network error while resetting session', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addPatient = async (name: string, assignedDoctors?: string[], tokenNumber?: number): Promise<boolean> => {
    if (!sessionId) return false;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/patient`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({ patientName: name, assignedDoctors, tokenNumber })
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
    if (!sessionId) return;
    try {
      if (settings.doctors.length === 0) {
        addToast('No doctors registered to call patients.', 'error');
        return;
      }
      const firstDoc = settings.doctors[0].code;
      await callNextDoctorPatient(firstDoc);
    } catch (err: any) {
      addToast('Error calling patient.', 'error');
    }
  };

  const callNextDoctorPatient = async (doctorCode: string) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/doctor/${doctorCode}/call-next`, {
        method: 'POST',
        headers: { 'x-session-id': sessionId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error calling patient');
      if (!data.nextPatient) {
        addToast('No patients eligible in your waiting queue!', 'warning');
      }
    } catch (err: any) {
      addToast(err.message || 'Network error while calling next patient', 'error');
    } finally {
      setLoading(false);
    }
  };

  const arrivedPatient = async (id: string) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/patient/${id}/arrived`, {
        method: 'PUT',
        headers: { 'x-session-id': sessionId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error marking patient arrived');
    } catch (err: any) {
      addToast(err.message || 'Network error while confirming patient arrival', 'error');
    } finally {
      setLoading(false);
    }
  };

  const completePatient = async (id: string) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/patient/${id}/complete`, {
        method: 'PUT',
        headers: { 'x-session-id': sessionId }
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
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/patient/${id}/skip`, {
        method: 'PUT',
        headers: { 'x-session-id': sessionId }
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
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/patient/${id}/restore`, {
        method: 'PUT',
        headers: { 'x-session-id': sessionId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error restoring patient');
    } catch (err: any) {
      addToast(err.message || 'Network error while restoring patient', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (time: number, status?: 'open' | 'lunch-break' | 'closed', doctorsList?: Doctor[], mostMsg?: string, leastMsg?: string) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/queue/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({ 
          averageConsultationTime: time,
          sessionStatus: status,
          doctors: doctorsList,
          mostSignificantMessage: mostMsg,
          leastSignificantMessage: leastMsg
        })
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
        sessionId,
        role,
        doctorCode,
        activeQueue,
        skippedQueue,
        settings,
        analytics,
        toasts,
        isConnected,
        loading,
        error,
        validateSession,
        joinSession,
        leaveSession,
        initializeSession,
        resetSession,
        addPatient,
        callNextPatient,
        callNextDoctorPatient,
        arrivedPatient,
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
