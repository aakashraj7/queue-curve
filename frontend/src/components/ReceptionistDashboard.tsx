import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import type { Patient, Doctor } from '../context/QueueContext';
import { StatusBadge } from './StatusBadge';
import {
  UserPlus,
  Play,
  Check,
  Slash,
  Clock,
  Search,
  RotateCcw,
  Users,
  UserCheck,
  ChevronRight,
  Activity,
  Sliders,
  RefreshCw,
  LogOut,
  Loader2,
  Phone,
  MessageSquare
} from 'lucide-react';

export const ReceptionistDashboard: React.FC = () => {
  const {
    activeQueue,
    skippedQueue,
    settings,
    analytics,
    addPatient,
    callNextDoctorPatient,
    completePatient,
    skipPatient,
    restorePatient,
    updateSettings,
    resetSession,
    leaveSession
  } = useQueue();

  // Component states
  const [patientName, setPatientName] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [consultationTime, setConsultationTime] = useState(settings.averageConsultationTime.toString());
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCallingNext, setIsCallingNext] = useState(false);
  const [processingPatientId, setProcessingPatientId] = useState<string | null>(null);

  // Doctor assignment selection states
  const [assignAll, setAssignAll] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // Calling system state
  const [selectedCallingDocCode, setSelectedCallingDocCode] = useState<string>(
    settings.doctors[0]?.code || ''
  );

  // Settings statuses
  const [sessionStatus, setSessionStatus] = useState<'open' | 'lunch-break' | 'closed'>(
    settings.sessionStatus || 'open'
  );
  const [tempDoctors, setTempDoctors] = useState<Doctor[]>(settings.doctors);
  const [mostMsg, setMostMsg] = useState(settings.mostSignificantMessage || '');
  const [leastMsg, setLeastMsg] = useState(settings.leastSignificantMessage || '');

  // Sync settings when they update from socket
  useEffect(() => {
    setConsultationTime(settings.averageConsultationTime.toString());
    setSessionStatus(settings.sessionStatus || 'open');
    setTempDoctors(settings.doctors);
    setMostMsg(settings.mostSignificantMessage || '');
    setLeastMsg(settings.leastSignificantMessage || '');
    if (settings.doctors.length > 0 && !selectedCallingDocCode) {
      setSelectedCallingDocCode(settings.doctors[0].code);
    }
  }, [settings]);

  // Filter queue based on search term
  const filteredActiveQueue = activeQueue.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.patientName.toLowerCase().includes(term) ||
      p.tokenNumber.toString() === term
    );
  });

  const filteredSkippedQueue = skippedQueue.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.patientName.toLowerCase().includes(term) ||
      p.tokenNumber.toString() === term
    );
  });

  // Calling system: call next for selected doctor
  const handleCallNextForDoctor = async (docCode: string) => {
    if (!docCode) return;
    const doc = settings.doctors.find(d => d.code === docCode);
    if (!doc) return;
    if (doc.availability === 'lunch-break' || doc.availability === 'not-available') {
      alert(`Doctor ${doc.name} is currently ${doc.availability === 'lunch-break' ? 'on a lunch break' : 'not available'}. Change their status to "Available" first.`);
      return;
    }
    const callingForDoc = activeQueue.find(p => p.calledBy === docCode && p.status === 'calling');
    const servingForDoc = activeQueue.find(p => p.calledBy === docCode && p.status === 'serving');
    if (callingForDoc) {
      alert(`Dr. ${doc.name} is already calling Token #${callingForDoc.tokenNumber}. Wait for that patient to arrive or skip them first.`);
      return;
    }
    if (servingForDoc) {
      alert(`Dr. ${doc.name} is currently serving Token #${servingForDoc.tokenNumber}. Complete that consultation first.`);
      return;
    }
    setIsCallingNext(true);
    await callNextDoctorPatient(docCode);
    setIsCallingNext(false);
  };

  // Queue action handlers
  const handleCompletePatient = async (id: string) => {
    setProcessingPatientId(id);
    await completePatient(id);
    setProcessingPatientId(null);
  };

  const handleSkipPatient = async (id: string) => {
    setProcessingPatientId(id);
    await skipPatient(id);
    setProcessingPatientId(null);
  };

  const handleRestorePatient = async (id: string) => {
    setProcessingPatientId(id);
    await restorePatient(id);
    setProcessingPatientId(null);
  };

  const handleReset = async () => {
    if (window.confirm("WARNING: Wiping the session will delete all doctors and clear today's patient tokens. Proceed?")) {
      setIsResetting(true);
      await resetSession();
      setIsResetting(false);
    }
  };

  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    if (!assignAll && selectedDocs.length === 0) {
      alert('Please check at least one doctor or select "Assign to All Doctors".');
      return;
    }

    setIsAddingPatient(true);
    const assigned = assignAll ? ['ALL'] : selectedDocs;
    const tokenVal = manualToken.trim() ? parseInt(manualToken, 10) : undefined;

    const success = await addPatient(patientName, assigned, tokenVal);
    setIsAddingPatient(false);

    if (success) {
      setPatientName('');
      setManualToken('');
      setSelectedDocs([]);
      setAssignAll(true);
    }
  };

  const handleDurationSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    const time = parseInt(consultationTime, 10);
    if (isNaN(time) || time < 1) return;

    setIsEditingSettings(true);
    await updateSettings(time);
    setIsEditingSettings(false);
  };

  const handleAllSettingsSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditingSettings(true);
    // Send the already-saved average consultation time, not the potentially modified but unsaved local input
    await updateSettings(settings.averageConsultationTime, sessionStatus, tempDoctors, mostMsg, leastMsg);
    setIsEditingSettings(false);
  };

  const handleDocCheckboxChange = (code: string) => {
    if (selectedDocs.includes(code)) {
      setSelectedDocs(selectedDocs.filter(c => c !== code));
    } else {
      setSelectedDocs([...selectedDocs, code]);
    }
  };

  const handleDoctorAvailabilityChange = (code: string, avail: 'available' | 'lunch-break' | 'not-available') => {
    setTempDoctors(prev => prev.map(d => d.code === code ? { ...d, availability: avail } : d));
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const renderAssignedDoctors = (patient: Patient) => {
    if (patient.assignedDoctors.includes('ALL')) {
      return (
        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md text-[10px] font-bold uppercase">
          All Doctors
        </span>
      );
    }
    return (
      <div className="flex gap-1 flex-wrap">
        {patient.assignedDoctors.map(code => (
          <span
            key={code}
            className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-extrabold uppercase"
          >
            {code}
          </span>
        ))}
      </div>
    );
  };

  // Derived statistics
  const currentServingCount = activeQueue.filter((p) => p.status === 'serving').length;
  const waitingCount = activeQueue.filter((p) => p.status === 'waiting').length;

  return (
    <div className="space-y-6">
      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Waiting */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center space-x-4 transition-colors duration-300">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Patients Waiting</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{waitingCount}</h3>
          </div>
        </div>

        {/* Card 2: Served */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center space-x-4 transition-colors duration-300">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 rounded-xl">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Served Today</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.patientsServed}</h3>
          </div>
        </div>

        {/* Card 3: Avg Wait Time */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center space-x-4 transition-colors duration-300">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg Wait Time</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {analytics.averageWaitTime} <span className="text-sm font-normal text-slate-400 dark:text-slate-500">mins</span>
            </h3>
          </div>
        </div>

        {/* Card 4: Active Serving Doctors count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center space-x-4 transition-colors duration-300">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Consultations</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {currentServingCount} <span className="text-sm font-normal text-slate-400 dark:text-slate-500">serving</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Lunch Break Banner */}
      {settings.sessionStatus === 'lunch-break' && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center space-x-3.5 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span>Lunch Break Active — Patient calling and table actions are temporarily frozen. Registering new patients is still allowed.</span>
        </div>
      )}

      {/* Main Grid: Control Panel & Live Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Receptionist Actions */}
        <div className="space-y-6">
          {/* Calling System Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
              Calling System
            </h3>

            <div className="space-y-3">
              {/* Doctor Selector */}
              {settings.doctors.length > 0 ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Select Doctor
                    </label>
                    <select
                      value={selectedCallingDocCode}
                      onChange={(e) => setSelectedCallingDocCode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    >
                      {settings.doctors.map(doc => (
                        <option key={doc.code} value={doc.code}>
                          Dr. {doc.name} [{doc.code}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Doctor Status Readout */}
                  {selectedCallingDocCode && (() => {
                    const doc = settings.doctors.find(d => d.code === selectedCallingDocCode);
                    if (!doc) return null;
                    const callingPatient = activeQueue.find(p => p.calledBy === selectedCallingDocCode && p.status === 'calling');
                    const servingPatient = activeQueue.find(p => p.calledBy === selectedCallingDocCode && p.status === 'serving');
                    let statusText = 'Room Available (Free)';
                    let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/30';
                    if (doc.availability === 'lunch-break') {
                      statusText = 'Lunch Break';
                      statusColor = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/30';
                    } else if (doc.availability === 'not-available') {
                      statusText = 'Away / Not Available';
                      statusColor = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/30';
                    } else if (callingPatient) {
                      statusText = `Busy — Calling Token #${callingPatient.tokenNumber}`;
                      statusColor = 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/30';
                    } else if (servingPatient) {
                      statusText = `Busy — Serving Token #${servingPatient.tokenNumber}`;
                      statusColor = 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/30';
                    }
                    return (
                      <div className={`px-3 py-2 rounded-xl border text-xs font-semibold ${statusColor}`}>
                        {statusText}
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => handleCallNextForDoctor(selectedCallingDocCode || (settings.doctors[0]?.code || ''))}
                    disabled={waitingCount === 0 || isCallingNext || !settings.doctors.length || settings.sessionStatus === 'lunch-break'}
                    className={`w-full inline-flex justify-center items-center py-3 rounded-xl text-md font-semibold transition shadow-sm cursor-pointer ${
                      waitingCount === 0 || isCallingNext || !settings.doctors.length || settings.sessionStatus === 'lunch-break'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800'
                        : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isCallingNext ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5 mr-2" />
                    )}
                    {settings.sessionStatus === 'lunch-break'
                      ? 'Queue Frozen (Lunch Break)'
                      : isCallingNext
                        ? 'Calling Next Patient...'
                        : 'Call Next Patient'}
                  </button>
                  {waitingCount === 0 && settings.sessionStatus !== 'lunch-break' && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Waiting list is currently empty</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-3">No doctors registered in this session.</p>
              )}
            </div>
          </div>

          {/* Action Card: Add Patient */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
              Add Patient
            </h3>
            <form onSubmit={handleAddPatientSubmit} className="space-y-4">
              <div>
                <label htmlFor="patient-name" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Patient Full Name
                </label>
                <input
                  id="patient-name"
                  type="text"
                  placeholder="e.g. Margaret Carter"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>

              {/* Optional Manual Token Input */}
              <div>
                <label htmlFor="manual-token" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Manual Token Number (Optional)
                </label>
                <input
                  id="manual-token"
                  type="number"
                  placeholder="Leave blank for automatic assignment"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  min="1"
                />
              </div>

              {/* Doctor Assignment Selection */}
              <div>
                <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Doctor Assignment
                </span>

                <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 rounded-xl max-h-[160px] overflow-y-auto">
                  <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white transition">
                    <input
                      type="checkbox"
                      checked={assignAll}
                      onChange={(e) => {
                        setAssignAll(e.target.checked);
                        if (e.target.checked) setSelectedDocs([]);
                      }}
                      className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Assign to All Doctors</span>
                  </label>

                  {/* Individual registered doctors list */}
                  {settings.doctors.map((doc) => (
                    <label
                      key={doc.code}
                      className={`flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer transition ${
                        assignAll ? 'opacity-40 cursor-not-allowed' : 'hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.code)}
                        disabled={assignAll}
                        onChange={() => handleDocCheckboxChange(doc.code)}
                        className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>{doc.name} [{doc.code}]</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isAddingPatient || !patientName.trim()}
                className="w-full inline-flex justify-center items-center py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-semibold transition cursor-pointer disabled:bg-blue-400 dark:disabled:bg-blue-800/50"
              >
                {isAddingPatient ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-1" />
                )}
                {isAddingPatient ? 'Adding Patient...' : 'Generate Token'}
              </button>
            </form>
          </div>

          {/* Action Card: Settings */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
              <Sliders className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
            </h3>
            <div className="space-y-4 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
              {/* Avg Consultation Duration */}
              <div>
                <label htmlFor="consultation-duration" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Avg Duration (Minutes)
                </label>
                <div className="flex space-x-2">
                  <input
                    id="consultation-duration"
                    type="number"
                    min="1"
                    value={consultationTime}
                    onChange={(e) => setConsultationTime(e.target.value)}
                    className="flex-grow px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleDurationSave}
                    disabled={isEditingSettings}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-750 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl font-semibold transition cursor-pointer shrink-0"
                  >
                    {isEditingSettings ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : 'Save'}
                  </button>
                </div>
              </div>

              {/* Clinic Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Clinic Status
                </label>
                <select
                  value={sessionStatus}
                  onChange={(e) => setSessionStatus(e.target.value as 'open' | 'lunch-break' | 'closed')}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                >
                  <option value="open" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Open (Normal Operation)</option>
                  <option value="lunch-break" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Lunch Break (On hold)</option>
                  <option value="closed" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Closed (Session ended)</option>
                </select>
              </div>

              {/* Doctor Availabilities */}
              {tempDoctors.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                     Doctor Availability
                  </label>
                  <div className="space-y-2">
                    {tempDoctors.map((doc) => (
                      <div key={doc.code} className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">{doc.name} [{doc.code}]</span>
                        <select
                          value={doc.availability || 'available'}
                          onChange={(e) => handleDoctorAvailabilityChange(doc.code, e.target.value as 'available' | 'lunch-break' | 'not-available')}
                          className="flex-grow px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        >
                          <option value="available" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Available</option>
                          <option value="lunch-break" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Lunch Break</option>
                          <option value="not-available" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Not Available</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Announcements */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Most Significant Announcement
                </label>
                <input
                  type="text"
                  placeholder="Bold alert shown prominently on TV screen..."
                  value={mostMsg}
                  onChange={(e) => setMostMsg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Displayed as a pulsing red alert banner at the top of the TV screen.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Least Significant Announcement
                </label>
                <input
                  type="text"
                  placeholder="Low-priority note shown quietly in footer..."
                  value={leastMsg}
                  onChange={(e) => setLeastMsg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Shown as a small, quiet footnote requiring focus to read on the TV screen.</p>
              </div>

              {/* Primary submit button for all settings */}
              <button
                type="button"
                onClick={handleAllSettingsSubmit}
                disabled={isEditingSettings}
                className="w-full inline-flex justify-center items-center py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-blue-400 dark:disabled:bg-blue-800/50 text-white rounded-xl font-bold text-sm transition cursor-pointer disabled:cursor-not-allowed"
              >
                {isEditingSettings ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {isEditingSettings ? 'Updating Settings...' : 'Update All Settings'}
              </button>
            </div>

            <div className="space-y-2">
              {/* Reset Session Button */}
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="w-full inline-flex justify-center items-center py-2.5 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-605 dark:text-rose-400 rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResetting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                )}
                {isResetting ? 'Wiping Session...' : 'Reset & Wipe Active Session'}
              </button>

              {/* Leave Session Button */}
              <button
                onClick={leaveSession}
                className="w-full inline-flex justify-center items-center py-2.5 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-950/30 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Disconnect Session Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (2 spans wide): Queue View */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-300">
            {/* Header with Search */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Active Patient Queue</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Currently serving or waiting patients</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search token or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition w-full sm:w-64 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Queue List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
                    <th className="py-3.5 px-6">Token</th>
                    <th className="py-3.5 px-6">Patient Name</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Doctor Assigned</th>
                    <th className="py-3.5 px-6 text-center">Wait Time</th>
                    <th className="py-3.5 px-6">Time Added</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {filteredActiveQueue.length > 0 ? (
                    filteredActiveQueue.map((patient) => (
                      <tr
                        key={patient._id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition ${
                          patient.status === 'serving' ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                        }`}
                      >
                        <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400">
                          #{patient.tokenNumber}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-200">
                          {patient.patientName}
                          {patient.status === 'calling' && patient.calledBy && (
                            <span className="text-[10px] font-bold ml-1.5 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-md">
                              Called by {patient.calledBy}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={patient.status} />
                        </td>
                        <td className="py-4 px-6">
                          {renderAssignedDoctors(patient)}
                        </td>
                        <td className="py-4 px-6 text-center font-medium">
                          {patient.status === 'serving' || patient.status === 'calling' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">-</span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-300">{patient.estimatedWaitTime} mins</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-400 dark:text-slate-500">
                          {formatTime(patient.createdAt)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {patient.status === 'waiting' && (
                              <>
                                <button
                                  onClick={() => handleCompletePatient(patient._id)}
                                  disabled={processingPatientId === patient._id || settings.sessionStatus === 'lunch-break'}
                                  className="inline-flex items-center justify-center p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg transition cursor-pointer disabled:opacity-55"
                                  title="Complete Consultation"
                                >
                                  {processingPatientId === patient._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleSkipPatient(patient._id)}
                                  disabled={processingPatientId === patient._id || settings.sessionStatus === 'lunch-break'}
                                  className="inline-flex items-center justify-center p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer disabled:opacity-55"
                                  title="Skip Patient"
                                >
                                  {processingPatientId === patient._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Slash className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            )}
                            {(patient.status === 'serving' || patient.status === 'calling') && (
                              <>
                                <button
                                  onClick={() => handleCompletePatient(patient._id)}
                                  disabled={processingPatientId === patient._id || settings.sessionStatus === 'lunch-break'}
                                  className="inline-flex items-center justify-center p-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-550 text-white rounded-lg transition shadow-xs cursor-pointer disabled:opacity-55"
                                  title="Complete"
                                >
                                  {processingPatientId === patient._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleSkipPatient(patient._id)}
                                  disabled={processingPatientId === patient._id || settings.sessionStatus === 'lunch-break'}
                                  className="inline-flex items-center justify-center p-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-550 text-white rounded-lg transition shadow-xs cursor-pointer disabled:opacity-55"
                                  title="Skip"
                                >
                                  {processingPatientId === patient._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Slash className="h-4 w-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        {searchTerm ? 'No patients match your search filter' : 'No patients in active queue'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Skipped Patients Shelf */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Skipped Patients</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Skipped patients who can be restored back to queue</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
                    <th className="py-3.5 px-6">Token</th>
                    <th className="py-3.5 px-6">Patient Name</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Doctor Assigned</th>
                    <th className="py-3.5 px-6">Time Added</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {filteredSkippedQueue.length > 0 ? (
                    filteredSkippedQueue.map((patient) => (
                      <tr key={patient._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        <td className="py-4 px-6 font-bold text-slate-550 dark:text-slate-400">
                          #{patient.tokenNumber}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-200">
                          {patient.patientName}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status="skipped" />
                        </td>
                        <td className="py-4 px-6">
                          {renderAssignedDoctors(patient)}
                        </td>
                        <td className="py-4 px-6 text-slate-400 dark:text-slate-500">
                          {formatTime(patient.createdAt)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleRestorePatient(patient._id)}
                            disabled={processingPatientId === patient._id || settings.sessionStatus === 'lunch-break'}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-605 dark:text-blue-400 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-55"
                          >
                            {processingPatientId === patient._id ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            )}
                            {processingPatientId === patient._id ? 'Restoring...' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                        No skipped patients today
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
