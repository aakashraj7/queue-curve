import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import type { Patient } from '../context/QueueContext';
import { StatusBadge } from './StatusBadge';
import { 
  Play, 
  Check, 
  Slash, 
  UserCheck, 
  Activity, 
  Users, 
  LogOut,
  ClipboardList,
  ShieldAlert,
  Loader2
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const {
    doctorCode: docCode,
    activeQueue,
    settings,
    analytics,
    callNextDoctorPatient,
    arrivedPatient,
    completePatient,
    skipPatient,
    leaveSession
  } = useQueue();

  const [activeTab, setActiveTab] = useState<'my-queue' | 'global-queue'>('my-queue');
  
  // Local action pending indicators
  const [isCalling, setIsCalling] = useState(false);
  const [isArriving, setIsArriving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const handleCallNext = async () => {
    if (!docCode) return;
    setIsCalling(true);
    await callNextDoctorPatient(docCode);
    setIsCalling(false);
  };

  const handleArrived = async (patientId: string) => {
    setIsArriving(true);
    await arrivedPatient(patientId);
    setIsArriving(false);
  };

  const handleComplete = async (patientId: string) => {
    setIsCompleting(true);
    await completePatient(patientId);
    setIsCompleting(false);
  };

  const handleSkip = async (patientId: string) => {
    setIsSkipping(true);
    await skipPatient(patientId);
    setIsSkipping(false);
  };

  // Find currently selected doctor details
  const currentDoctor = settings.doctors.find(d => d.code === docCode);

  const handleLogout = () => {
    leaveSession();
  };

  // 1. Placeholder if doctor credentials not resolved
  if (!docCode || !currentDoctor) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Doctor Profile Missing</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">Your doctor session credentials are invalid or missing. Please disconnect and rejoin.</p>
        <button 
          onClick={leaveSession}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-md cursor-pointer"
        >
          Return to Portal
        </button>
      </div>
    );
  }

  // Filter queues
  // Doctor D's queue = status 'waiting' AND (assigned D or assigned 'all')
  const myWaitingQueue = activeQueue.filter(
    (p) =>
      p.status === 'waiting' &&
      (p.assignedDoctors.includes(docCode) || p.assignedDoctors.includes('ALL'))
  );

  // Find active patient called by this doctor
  const currentCalling = activeQueue.find(
    (p) => p.status === 'calling' && p.calledBy === docCode
  );

  // Find active patient being served by this doctor
  const currentServing = activeQueue.find(
    (p) => p.status === 'serving' && p.calledBy === docCode
  );

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
            className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-extrabold uppercase"
          >
            {code}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{currentDoctor.name}</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              Doctor Panel Room • Code: <span className="text-blue-500 dark:text-blue-400 font-extrabold">{docCode}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleLogout}
            className="inline-flex justify-center items-center px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Switch Doctor
          </button>
          <button
            onClick={leaveSession}
            className="inline-flex justify-center items-center px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Disconnect Session
          </button>
        </div>
      </div>

      {settings.sessionStatus === 'lunch-break' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/40 rounded-2xl text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center space-x-3.5 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span>Lunch Break Active — Patient calling actions are temporarily frozen. Enjoy your break!</span>
        </div>
      )}

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Waiting for me */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center space-x-4 transition-colors">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">My Waiting List</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{myWaitingQueue.length}</h3>
          </div>
        </div>

        {/* Global Waiting */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center space-x-4 transition-colors">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Global Queue Size</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.activeQueueCount}</h3>
          </div>
        </div>

        {/* Patients Served today */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center space-x-4 transition-colors">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Lobby Served Count</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analytics.patientsServed}</h3>
          </div>
        </div>
      </div>

      {/* Operations Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Call Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-indigo-500" />
              Patient Calling Dashboard
            </h3>

            <div className="space-y-4">
              {/* State 1: Patient is calling */}
              {currentCalling && (
                <div className="bg-indigo-50/50 dark:bg-indigo-950/15 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-center">
                  <span className="px-2.5 py-0.5 bg-indigo-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    Patient is Calling
                  </span>
                  <div className="text-[3.5rem] font-black text-indigo-600 dark:text-indigo-400 leading-none my-3 select-none">
                    #{currentCalling.tokenNumber}
                  </div>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {currentCalling.patientName}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4">
                    Called at {formatTime(currentCalling.calledAt || '')}. Waiting for arrival.
                  </p>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleArrived(currentCalling._id)}
                      disabled={isArriving || isSkipping || settings.sessionStatus === 'lunch-break'}
                      className="w-full inline-flex justify-center items-center py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500/50 text-white rounded-xl text-sm font-bold transition shadow-xs cursor-pointer"
                    >
                      {isArriving ? (
                        <Loader2 className="h-4.5 w-4.5 mr-1.5 animate-spin" />
                      ) : (
                        <Check className="h-4.5 w-4.5 mr-1.5" />
                      )}
                      {isArriving ? 'Starting Consultation...' : 'Arrived (Start Consultation)'}
                    </button>
                    <button
                      onClick={() => handleSkip(currentCalling._id)}
                      disabled={isArriving || isSkipping || settings.sessionStatus === 'lunch-break'}
                      className="w-full inline-flex justify-center items-center py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-550/50 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                    >
                      {isSkipping ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Slash className="h-4 w-4 mr-1.5" />
                      )}
                      {isSkipping ? 'Skipping...' : 'No-Show (Skip Patient)'}
                    </button>
                  </div>
                </div>
              )}

              {/* State 2: Patient is serving */}
              {currentServing && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/15 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <span className="px-2.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                    In Consultation
                  </span>
                  <div className="text-[3.5rem] font-black text-emerald-600 dark:text-emerald-400 leading-none my-3 select-none">
                    #{currentServing.tokenNumber}
                  </div>
                  <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {currentServing.patientName}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4">
                    Consultation started at {formatTime(currentServing.calledAt || '')}
                  </p>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleComplete(currentServing._id)}
                      disabled={isCompleting || isSkipping || settings.sessionStatus === 'lunch-break'}
                      className="w-full inline-flex justify-center items-center py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500/50 text-white rounded-xl text-sm font-bold transition shadow-xs cursor-pointer"
                    >
                      {isCompleting ? (
                        <Loader2 className="h-4.5 w-4.5 mr-1.5 animate-spin" />
                      ) : (
                        <Check className="h-4.5 w-4.5 mr-1.5" />
                      )}
                      {isCompleting ? 'Completing...' : 'Complete Consultation'}
                    </button>
                    <button
                      onClick={() => handleSkip(currentServing._id)}
                      disabled={isCompleting || isSkipping || settings.sessionStatus === 'lunch-break'}
                      className="w-full inline-flex justify-center items-center py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-550/50 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                    >
                      {isSkipping ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Slash className="h-4 w-4 mr-1.5" />
                      )}
                      {isSkipping ? 'Skipping...' : 'Skip Patient'}
                    </button>
                  </div>
                </div>
              )}

              {/* State 3: Idle, ready to call */}
              {!currentCalling && !currentServing && (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-center py-8">
                    <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Ready to Call Next Patient</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Please click below to summon the next patient in queue.</p>
                  </div>

                  <button
                    onClick={handleCallNext}
                    disabled={myWaitingQueue.length === 0 || isCalling || settings.sessionStatus === 'lunch-break'}
                    className={`w-full inline-flex justify-center items-center py-3.5 rounded-xl font-bold transition shadow-sm text-sm cursor-pointer ${
                      myWaitingQueue.length === 0 || isCalling || settings.sessionStatus === 'lunch-break'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-405 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10'
                    }`}
                  >
                    {isCalling ? (
                      <Loader2 className="h-4.5 w-4.5 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4.5 w-4.5 mr-2" />
                    )}
                    {settings.sessionStatus === 'lunch-break'
                      ? 'Queue Frozen (Lunch Break)'
                      : isCalling
                        ? 'Calling Next Patient...'
                        : 'Call Next Patient'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Queue Tables */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-300">
            {/* Header Tabs */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-md font-bold text-slate-800 dark:text-slate-100">Patients Registry</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Filter patients list based on assignment</p>
              </div>

              {/* Tab selector */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('my-queue')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'my-queue'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  My Queue ({myWaitingQueue.length})
                </button>
                <button
                  onClick={() => setActiveTab('global-queue')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'global-queue'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Global Queue ({analytics.activeQueueCount})
                </button>
              </div>
            </div>

            {/* List Table */}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                  {/* My Queue Render */}
                  {activeTab === 'my-queue' && (
                    myWaitingQueue.length > 0 ? (
                      myWaitingQueue.map((patient) => (
                        <tr key={patient._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                          <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400">
                            #{patient.tokenNumber}
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-200">
                            {patient.patientName}
                          </td>
                          <td className="py-4 px-6">
                            <StatusBadge status={patient.status} />
                          </td>
                          <td className="py-4 px-6">
                            {renderAssignedDoctors(patient)}
                          </td>
                          <td className="py-4 px-6 text-center font-medium text-slate-600 dark:text-slate-300">
                            {patient.estimatedWaitTime} mins
                          </td>
                          <td className="py-4 px-6 text-slate-400 dark:text-slate-500">
                            {formatTime(patient.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          No waiting patients assigned to you right now.
                        </td>
                      </tr>
                    )
                  )}

                  {/* Global Queue Render */}
                  {activeTab === 'global-queue' && (
                    activeQueue.length > 0 ? (
                      activeQueue.map((patient) => (
                        <tr 
                          key={patient._id} 
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition ${
                            patient.calledBy === docCode ? 'bg-indigo-50/15 dark:bg-indigo-950/10 font-medium' : ''
                          }`}
                        >
                          <td className="py-4 px-6 font-bold text-blue-600 dark:text-blue-400">
                            #{patient.tokenNumber}
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-700 dark:text-slate-200">
                            {patient.patientName}
                            {patient.calledBy === docCode && (
                              <span className="text-[10px] font-bold ml-1.5 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-md">
                                Yours
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <StatusBadge status={patient.status} />
                          </td>
                          <td className="py-4 px-6">
                            {renderAssignedDoctors(patient)}
                          </td>
                          <td className="py-4 px-6 text-center font-medium text-slate-600 dark:text-slate-300">
                            {patient.status === 'serving' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">-</span>
                            ) : (
                              <span>{patient.estimatedWaitTime} mins</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-slate-400 dark:text-slate-500">
                            {formatTime(patient.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                          Active queue is currently empty.
                        </td>
                      </tr>
                    )
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
