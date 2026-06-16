import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import type { Doctor } from '../context/QueueContext';
import { UserPlus, Trash2, ShieldAlert, Activity, ArrowRight, Clock, Key } from 'lucide-react';

export const SessionSetup: React.FC = () => {
  const { initializeSession, joinSession, loading } = useQueue();
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  
  // Join state
  const [inputSessionId, setInputSessionId] = useState('');
  
  // Create state
  const [avgTime, setAvgTime] = useState(15);
  const [doctors, setDoctors] = useState<Doctor[]>([
    { code: 'D1', name: 'Dr. Sarah Jenkins' },
    { code: 'D2', name: 'Dr. Marcus Vance' }
  ]);
  
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAddDoctorField = () => {
    const nextNum = doctors.length + 1;
    setDoctors([...doctors, { code: `D${nextNum}`, name: '' }]);
  };

  const handleRemoveDoctorField = (index: number) => {
    setDoctors(doctors.filter((_, i) => i !== index));
  };

  const handleDoctorChange = (index: number, field: keyof Doctor, value: string) => {
    const newDoctors = [...doctors];
    if (field === 'code') {
      newDoctors[index][field] = value.toUpperCase().replace(/\s/g, ''); // no spaces in code
    } else {
      newDoctors[index][field] = value;
    }
    setDoctors(newDoctors);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    if (!inputSessionId.trim()) {
      setValidationError('Please enter a valid Session ID.');
      return;
    }
    
    const success = await joinSession(inputSessionId);
    if (!success) {
      setValidationError('Invalid or inactive Session ID. Please verify the code.');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate average time
    if (avgTime < 1) {
      setValidationError('Average consultation time must be at least 1 minute.');
      return;
    }

    // Validate doctors list
    if (doctors.length === 0) {
      setValidationError('Please add at least one doctor to start the session.');
      return;
    }

    const codes = doctors.map(d => d.code.trim().toUpperCase());
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== codes.length) {
      setValidationError('Each doctor must have a unique doctor code.');
      return;
    }

    for (const doc of doctors) {
      if (!doc.code.trim()) {
        setValidationError('Doctor Code cannot be blank.');
        return;
      }
      if (!doc.name.trim()) {
        setValidationError('Doctor Name cannot be blank.');
        return;
      }
    }

    const createdSessionId = await initializeSession(avgTime, doctors);
    if (!createdSessionId) {
      setValidationError('Failed to initialize session. Please check your inputs.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl transition-colors duration-300">
        
        {/* Header logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-500/20 mb-3 flex items-center justify-center">
            <Activity className="h-7 w-7 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 m-0">Clinical Session Portal</h1>
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            Join an ongoing clinic session or create a new one to manage patient queues.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('join'); setValidationError(null); }}
            className={`w-1/2 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'join'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            Join Existing Session
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('create'); setValidationError(null); }}
            className={`w-1/2 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            Create New Session
          </button>
        </div>

        {validationError && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-sm font-semibold text-rose-700 dark:text-rose-450 flex items-start space-x-2">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {activeTab === 'join' ? (
          /* Join Existing Session Form */
          <form onSubmit={handleJoinSubmit} className="space-y-5">
            <div>
              <label htmlFor="session-id-input" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Enter 4-Digit Session ID
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                <input
                  id="session-id-input"
                  type="text"
                  maxLength={4}
                  placeholder="e.g. A9B2"
                  value={inputSessionId}
                  onChange={(e) => setInputSessionId(e.target.value.toUpperCase().replace(/\s/g, ''))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-black tracking-widest text-lg uppercase"
                  required
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Ask the receptionist for the session ID shown in the header of their dashboard.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || inputSessionId.length < 4}
              className="w-full inline-flex justify-center items-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition shadow-md shadow-blue-500/20 cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-base mt-2"
            >
              {loading ? 'Joining...' : 'Connect to Session'}
              <ArrowRight className="h-5 w-5 ml-1.5" />
            </button>
          </form>
        ) : (
          /* Create New Session Form */
          <form onSubmit={handleCreateSubmit} className="space-y-6">
            {/* Settings Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/80 pb-2 flex items-center">
                <Clock className="h-4.5 w-4.5 mr-2 text-blue-500" />
                General Parameters
              </h3>
              
              <div>
                <label htmlFor="avg-time" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Average Consultation Duration (Minutes)
                </label>
                <input
                  id="avg-time"
                  type="number"
                  min="1"
                  value={avgTime}
                  onChange={(e) => setAvgTime(parseInt(e.target.value) || 15)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
                  required
                />
              </div>
            </div>

            {/* Doctors Section */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 flex items-center">
                  <UserPlus className="h-4.5 w-4.5 mr-2 text-blue-500" />
                  Doctors Registry
                </h3>
                <button
                  type="button"
                  onClick={handleAddDoctorField}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs font-bold transition hover:bg-blue-100/60 cursor-pointer"
                >
                  Add Doctor
                </button>
              </div>

              {/* Doctors input cards list */}
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                {doctors.map((doc, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl relative transition duration-350 group"
                  >
                    <div className="w-1/3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Doctor Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. D1"
                        value={doc.code}
                        onChange={(e) => handleDoctorChange(idx, 'code', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-extrabold uppercase"
                        required
                      />
                    </div>

                    <div className="flex-grow">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. John Carter"
                        value={doc.name}
                        onChange={(e) => handleDoctorChange(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="flex items-end h-full pt-5">
                      <button
                        type="button"
                        onClick={() => handleRemoveDoctorField(idx)}
                        disabled={doctors.length === 1}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                        title="Remove Doctor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition shadow-md shadow-blue-500/20 cursor-pointer disabled:bg-blue-400 text-base mt-2"
            >
              {loading ? 'Initializing Queue...' : 'Initialize Clinic Session'}
              <ArrowRight className="h-5 w-5 ml-1.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
