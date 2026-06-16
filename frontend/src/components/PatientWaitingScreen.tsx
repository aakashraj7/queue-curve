import React, { useEffect, useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { Monitor, Volume2, ShieldAlert, Users, Clock, Stethoscope } from 'lucide-react';

export const PatientWaitingScreen: React.FC = () => {
  const { activeQueue, settings, leaveSession } = useQueue();
  const [blink, setBlink] = useState(false);
  const [prevCallingKeys, setPrevCallingKeys] = useState<string>('');

  // Extract calling, serving, and waiting patients
  const callingPatients = activeQueue.filter((p) => p.status === 'calling');
  const waitingPatients = activeQueue.filter((p) => p.status === 'waiting');
  
  // Up next list (waiting in lobby)
  const upNext = waitingPatients.slice(0, 5);
  
  // Dynamic wait estimate for lobby
  const lobbyWaitTime = waitingPatients.length > 0 ? waitingPatients[0].estimatedWaitTime : 0;

  // Generate a key representing the calling state (to detect changes and trigger audio)
  const currentCallingKeys = callingPatients
    .map((p) => `${p.tokenNumber}-${p.calledBy}`)
    .sort()
    .join('|');

  useEffect(() => {
    if (callingPatients.length > 0) {
      if (prevCallingKeys !== '' && prevCallingKeys !== currentCallingKeys) {
        // Trigger blinking and sound alert for new call
        setBlink(true);
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.15);
          
          setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.25);
          }, 180);
        } catch (e) {
          console.log('Audio blocked by browser policy.');
        }

        const timer = setTimeout(() => setBlink(false), 8000);
        return () => clearTimeout(timer);
      }
      setPrevCallingKeys(currentCallingKeys);
    } else {
      setPrevCallingKeys('');
      setBlink(false);
    }
  }, [currentCallingKeys, callingPatients.length, prevCallingKeys]);

  // Helper to match doctor code to doctor name
  const getDoctorName = (code?: string) => {
    if (!code) return 'Doctor';
    const doc = settings.doctors.find(d => d.code === code);
    return doc ? doc.name : `Dr. ${code}`;
  };

  // Determine grid size and text scaling classes dynamically based on calling count
  const getCallingGridClass = () => {
    const len = callingPatients.length;
    if (len <= 1) return 'grid-cols-1 max-w-xl mx-auto';
    if (len === 2) return 'grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };

  const getCardSizeClasses = () => {
    const len = callingPatients.length;
    if (len <= 1) {
      return {
        cardPadding: 'p-10 sm:p-14',
        tokenText: 'text-[7.5rem] sm:text-[11rem]',
        nameText: 'text-2xl sm:text-4xl',
        docText: 'text-lg sm:text-2xl'
      };
    }
    if (len === 2) {
      return {
        cardPadding: 'p-6 sm:p-10',
        tokenText: 'text-[5.5rem] sm:text-[7.5rem]',
        nameText: 'text-xl sm:text-2xl',
        docText: 'text-base sm:text-lg'
      };
    }
    return {
      cardPadding: 'p-4 sm:p-6',
      tokenText: 'text-[4rem] sm:text-[5.5rem]',
      nameText: 'text-lg sm:text-xl',
      docText: 'text-sm sm:text-base'
    };
  };

  const cardStyle = getCardSizeClasses();

  return (
    <div className="min-h-[85vh] flex flex-col justify-between p-4 sm:p-8 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative">
      
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-800 gap-4 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600 rounded-xl">
            <Monitor className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">LOBBY BOARD</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Live Clinic Status Screen</p>
          </div>
        </div>
        
        {/* Session active code */}
        <div className="flex items-center space-x-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700/50">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">
            {settings.doctors.length} Doctors Active
          </span>
          <button
            onClick={leaveSession}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 hover:text-rose-400 border border-slate-750 text-slate-400 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Most Significant Message (Vibrant banner style) */}
      {settings.mostSignificantMessage && (
        <div className="mx-auto max-w-4xl w-full bg-rose-600/90 border border-rose-500/30 px-6 py-4 rounded-3xl flex items-center space-x-3.5 shadow-lg shadow-rose-600/10 animate-pulse z-10 mt-6 mb-2">
          <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-rose-400 animate-ping" />
          <div className="text-left font-sans">
            <span className="block text-[10px] font-black tracking-widest text-rose-300 uppercase">Alert Announcement</span>
            <span className="block text-sm sm:text-base font-extrabold text-white leading-tight mt-0.5">{settings.mostSignificantMessage}</span>
          </div>
        </div>
      )}

      {/* Main Calling Section */}
      <div className="my-auto py-8 z-10 w-full">
        {callingPatients.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-center text-xs font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1.5">
              <Volume2 className="h-4.5 w-4.5 text-emerald-400" />
              Now Summoning
            </h2>

            <div className={`grid ${getCallingGridClass()} transition-all duration-500`}>
              {callingPatients.map((patient) => (
                <div 
                  key={patient._id} 
                  className={`rounded-3xl border text-center transition-all duration-500 flex flex-col justify-center items-center ${cardStyle.cardPadding} ${
                    blink 
                      ? 'bg-blue-600 border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.6)] animate-pulse' 
                      : 'bg-slate-800/40 border-slate-800 shadow-lg'
                  }`}
                >
                  <div className={`font-black leading-none text-blue-400 tracking-tight ${cardStyle.tokenText}`}>
                    {patient.tokenNumber}
                  </div>
                  <div className={`font-extrabold text-slate-100 mt-2 truncate w-full px-4 ${cardStyle.nameText}`}>
                    {patient.patientName}
                  </div>
                  
                  {/* Doctor Info */}
                  <div className={`mt-4 font-bold text-slate-300 dark:text-slate-400 flex items-center gap-1.5 ${cardStyle.docText}`}>
                    <Stethoscope className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                    <span>Proceed to {getDoctorName(patient.calledBy)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto p-10 rounded-3xl border border-slate-800 bg-slate-800/15 text-center flex flex-col items-center justify-center">
            <ShieldAlert className="h-12 w-12 text-slate-700 mb-3" />
            <p className="text-lg font-bold text-slate-400">All Doctors Busy</p>
            <p className="text-xs text-slate-600 mt-1">Please wait comfortably. Next tokens will be summoned shortly.</p>
          </div>
        )}
      </div>

      {/* Bottom Layout: Rooms list & Up Next */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-6 border-t border-slate-800/60 z-10">
        
        {/* Left Side (3 columns): Doctors Room Status Grid */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center mb-1">
            <Stethoscope className="h-4 w-4 mr-1 text-slate-500" />
            Consultation Rooms
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
            {settings.doctors.map((doc) => {
              // Check what this doctor is doing
              const isCalling = activeQueue.find(p => p.status === 'calling' && p.calledBy === doc.code);
              const isServing = activeQueue.find(p => p.status === 'serving' && p.calledBy === doc.code);

              let badgeText = 'Room Available';
              let badgeColor = 'text-slate-500 bg-slate-800/20 border-slate-850';
              
              if (doc.availability === 'lunch-break') {
                badgeText = 'Lunch Break';
                badgeColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
              } else if (doc.availability === 'not-available') {
                badgeText = 'Away / Not Available';
                badgeColor = 'text-rose-500 bg-rose-500/10 border-rose-500/20';
              } else if (isCalling) {
                badgeText = `Calling Token #${isCalling.tokenNumber}`;
                badgeColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 animate-pulse';
              } else if (isServing) {
                badgeText = `Serving Token #${isServing.tokenNumber}`;
                badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
              }

              return (
                <div 
                  key={doc.code} 
                  className="p-3 bg-slate-800/35 border border-slate-800/80 rounded-2xl flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <p className="text-sm font-bold text-slate-200 truncate">{doc.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Code: {doc.code}</p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-md uppercase flex-shrink-0 ${badgeColor}`}>
                    {badgeText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side (2 columns): Up Next Lobby List */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center mb-1">
            <Users className="h-4 w-4 mr-1 text-slate-500" />
            Waiting Lobby (Up Next)
          </h3>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {upNext.length > 0 ? (
              upNext.map((patient, index) => (
                <div 
                  key={patient._id} 
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-800/60"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black text-blue-450">
                      #{patient.tokenNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-300 truncate max-w-[130px]">
                      {patient.patientName}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded border border-slate-800">
                    {index === 0 ? 'Next' : `${index + 1} ahead`}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-600 text-xs font-bold">
                No patients waiting in lobby.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="border-t border-slate-800/60 pt-4 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider gap-3 z-10">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>Avg Consult length: <span className="text-blue-500">{settings.averageConsultationTime} minutes</span></span>
          <span className="mx-1">•</span>
          <span>Next wait: <span className="text-blue-500">{lobbyWaitTime} minutes</span></span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 flex-grow sm:flex-grow-0">
          {settings.leastSignificantMessage && (
            <span className="text-slate-600 font-semibold text-[10px] lowercase tracking-normal italic max-w-xs truncate mr-2">
              ({settings.leastSignificantMessage})
            </span>
          )}
          <span>Real-time updates active • Queue Cure Systems</span>
        </div>
      </div>

      {/* Clinic Status Overlay */}
      {settings.sessionStatus && settings.sessionStatus !== 'open' && (
        <div className="absolute inset-0 bg-slate-950/98 flex flex-col items-center justify-center text-center p-8 sm:p-12 z-50 animate-fade-in">
          {/* Animated Glowing Icon Wrapper */}
          <div className="bg-blue-600 p-8 sm:p-10 rounded-full text-white shadow-[0_0_80px_rgba(59,130,246,0.35)] border-4 border-blue-500/30 mb-8 animate-bounce">
            <Monitor className="h-16 w-16 sm:h-20 sm:w-20 text-white animate-pulse" />
          </div>
          
          {/* Bold, prominent headings */}
          <h2 className="text-5xl sm:text-7xl font-black tracking-tight text-white mb-6 uppercase">
            {settings.sessionStatus === 'lunch-break' ? 'Clinic on Lunch Break' : 'Clinic Session Closed'}
          </h2>
          
          {/* Large, legible subtext */}
          <p className="text-slate-300 max-w-3xl text-lg sm:text-2xl font-semibold leading-relaxed px-4">
            {settings.sessionStatus === 'lunch-break' 
              ? 'The clinic is currently on a lunch break. Patient queues and calls will resume shortly.' 
              : 'The clinic session has ended or is closed. Please check back with the receptionist.'}
          </p>

          {/* Active status pulse pill */}
          <div className="mt-12 flex items-center gap-2.5 bg-slate-800/80 px-6 py-3 rounded-full border border-slate-700/50 shadow-inner">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm sm:text-base font-extrabold tracking-wider uppercase text-slate-200">
              {settings.sessionStatus === 'lunch-break' ? 'Queue Paused' : 'Lobby Offline'}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
