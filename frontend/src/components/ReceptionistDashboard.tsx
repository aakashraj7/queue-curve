import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
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
  Sliders
} from 'lucide-react';

export const ReceptionistDashboard: React.FC = () => {
  const {
    activeQueue,
    skippedQueue,
    settings,
    analytics,
    addPatient,
    callNextPatient,
    completePatient,
    skipPatient,
    restorePatient,
    updateSettings
  } = useQueue();

  // Component states
  const [patientName, setPatientName] = useState('');
  const [consultationTime, setConsultationTime] = useState(settings.averageConsultationTime.toString());
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);

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

  // Action handlers
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    setIsAddingPatient(true);
    const success = await addPatient(patientName);
    setIsAddingPatient(false);
    
    if (success) {
      setPatientName('');
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const time = parseInt(consultationTime, 10);
    if (isNaN(time) || time < 1) return;

    setIsEditingSettings(true);
    await updateSettings(time);
    setIsEditingSettings(false);
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  // Derived statistics
  const currentServing = activeQueue.find((p) => p.status === 'serving');
  const waitingCount = activeQueue.filter((p) => p.status === 'waiting').length;

  return (
    <div className="space-y-6">
      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Waiting */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Patients Waiting</p>
            <h3 className="text-2xl font-bold text-slate-800">{waitingCount}</h3>
          </div>
        </div>

        {/* Card 2: Served */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Served Today</p>
            <h3 className="text-2xl font-bold text-slate-800">{analytics.patientsServed}</h3>
          </div>
        </div>

        {/* Card 3: Avg Wait Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Avg Wait Time</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {analytics.averageWaitTime} <span className="text-sm font-normal text-slate-400">mins</span>
            </h3>
          </div>
        </div>

        {/* Card 4: Current Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Doctor Room</p>
            <h3 className="text-md font-bold text-slate-800 truncate max-w-[170px]">
              {currentServing ? (
                <span className="text-emerald-600">Serving #{currentServing.tokenNumber}</span>
              ) : (
                <span className="text-slate-400">Available</span>
              )}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Control Panel & Live Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Receptionist Actions */}
        <div className="space-y-6">
          {/* Action Card: Call Next */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-500" />
              Queue Control
            </h3>
            
            <div className="space-y-4">
              {currentServing ? (
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Now Serving</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    Token #{currentServing.tokenNumber}: {currentServing.patientName}
                  </p>
                  <div className="flex space-x-2 mt-3">
                    <button
                      onClick={() => completePatient(currentServing._id)}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow-xs cursor-pointer"
                    >
                      <Check className="h-4 w-4 mr-1.5" />
                      Complete
                    </button>
                    <button
                      onClick={() => skipPatient(currentServing._id)}
                      className="flex-1 inline-flex justify-center items-center px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition shadow-xs cursor-pointer"
                    >
                      <Slash className="h-4 w-4 mr-1.5" />
                      Skip
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-center py-6">
                  <p className="text-sm font-medium text-slate-500">Doctor is currently available</p>
                </div>
              )}

              <button
                onClick={callNextPatient}
                disabled={waitingCount === 0}
                className={`w-full inline-flex justify-center items-center py-3 rounded-xl text-md font-semibold transition shadow-sm cursor-pointer ${
                  waitingCount === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Play className="h-5 w-5 mr-2" />
                Call Next Patient
              </button>
              {waitingCount === 0 && (
                <p className="text-xs text-slate-400 text-center">Waiting list is currently empty</p>
              )}
            </div>
          </div>

          {/* Action Card: Add Patient */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-blue-500" />
              Add Patient
            </h3>
            <form onSubmit={handleAddPatientSubmit} className="space-y-4">
              <div>
                <label htmlFor="patient-name" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Patient Full Name
                </label>
                <input
                  id="patient-name"
                  type="text"
                  placeholder="e.g. Margaret Carter"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isAddingPatient || !patientName.trim()}
                className="w-full inline-flex justify-center items-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition cursor-pointer disabled:bg-blue-400"
              >
                {isAddingPatient ? 'Adding...' : 'Generate Token'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </form>
          </div>

          {/* Action Card: Settings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <Sliders className="h-5 w-5 mr-2 text-blue-500" />
              Consultation Settings
            </h3>
            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              <div>
                <label htmlFor="consultation-duration" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Avg Duration (Minutes)
                </label>
                <div className="flex space-x-2">
                  <input
                    id="consultation-duration"
                    type="number"
                    min="1"
                    value={consultationTime}
                    onChange={(e) => setConsultationTime(e.target.value)}
                    className="flex-grow px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isEditingSettings || parseInt(consultationTime) === settings.averageConsultationTime}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl font-semibold transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (2 spans wide): Queue View */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            {/* Header with Search */}
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Active Patient Queue</h3>
                <p className="text-xs text-slate-400 mt-0.5">Currently serving or waiting patients</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search token or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition w-full sm:w-64"
                />
              </div>
            </div>

            {/* Queue List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-6">Token</th>
                    <th className="py-3.5 px-6">Patient Name</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-center">Wait Time</th>
                    <th className="py-3.5 px-6">Time Added</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredActiveQueue.length > 0 ? (
                    filteredActiveQueue.map((patient) => (
                      <tr 
                        key={patient._id} 
                        className={`hover:bg-slate-50/50 transition ${
                          patient.status === 'serving' ? 'bg-emerald-50/20' : ''
                        }`}
                      >
                        <td className="py-4 px-6 font-bold text-blue-600">
                          #{patient.tokenNumber}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700">
                          {patient.patientName}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={patient.status} />
                        </td>
                        <td className="py-4 px-6 text-center font-medium">
                          {patient.status === 'serving' ? (
                            <span className="text-emerald-600 font-bold">-</span>
                          ) : (
                            <span className="text-slate-600">{patient.estimatedWaitTime} mins</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                          {formatTime(patient.createdAt)}
                        </td>
                        <td className="py-4 px-6 text-right space-x-1.5">
                          {patient.status === 'waiting' && (
                            <>
                              <button
                                onClick={() => completePatient(patient._id)}
                                className="inline-flex items-center justify-center p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition cursor-pointer"
                                title="Complete Consultation"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => skipPatient(patient._id)}
                                className="inline-flex items-center justify-center p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition cursor-pointer"
                                title="Skip Patient"
                              >
                                <Slash className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {patient.status === 'serving' && (
                            <>
                              <button
                                onClick={() => completePatient(patient._id)}
                                className="inline-flex items-center justify-center p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs cursor-pointer"
                                title="Complete"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => skipPatient(patient._id)}
                                className="inline-flex items-center justify-center p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition shadow-xs cursor-pointer"
                                title="Skip"
                              >
                                <Slash className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {searchTerm ? 'No patients match your search filter' : 'No patients in active queue'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Skipped Patients Shelf */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Skipped Patients</h3>
              <p className="text-xs text-slate-400 mt-0.5">Skipped patients who can be restored back to queue</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-6">Token</th>
                    <th className="py-3.5 px-6">Patient Name</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Time Added</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredSkippedQueue.length > 0 ? (
                    filteredSkippedQueue.map((patient) => (
                      <tr key={patient._id} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-6 font-bold text-slate-500">
                          #{patient.tokenNumber}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-700">
                          {patient.patientName}
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status="skipped" />
                        </td>
                        <td className="py-4 px-6 text-slate-400">
                          {formatTime(patient.createdAt)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => restorePatient(patient._id)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
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
