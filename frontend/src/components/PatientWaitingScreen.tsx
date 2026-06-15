import React, { useEffect, useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { Play, Users, Clock, Monitor, Volume2, ShieldAlert } from 'lucide-react';

export const PatientWaitingScreen: React.FC = () => {
  const { activeQueue, settings } = useQueue();
  const [blink, setBlink] = useState(false);
  const [prevToken, setPrevToken] = useState<number | null>(null);

  const currentServing = activeQueue.find((p) => p.status === 'serving');
  const waitingPatients = activeQueue.filter((p) => p.status === 'waiting');
  
  // Display next 4 patients
  const upNext = waitingPatients.slice(0, 4);
  const totalPatientsAhead = waitingPatients.length;

  // Next patient's wait time (or total wait time for a new joiner)
  const nextEstimatedWait = waitingPatients.length > 0 
    ? waitingPatients[0].estimatedWaitTime 
    : 0;

  // Trigger blinking visual notification when serving token changes
  useEffect(() => {
    if (currentServing) {
      if (prevToken !== null && prevToken !== currentServing.tokenNumber) {
        setBlink(true);
        // Try to play a gentle notification sound if browser permits
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
          console.log('Audio feedback blocked by browser autoplay policy.');
        }

        const timer = setTimeout(() => setBlink(false), 8000); // blink for 8 seconds
        return () => clearTimeout(timer);
      }
      setPrevToken(currentServing.tokenNumber);
    } else {
      setPrevToken(null);
      setBlink(false);
    }
  }, [currentServing, prevToken]);

  // Determine Doctor's Status
  let doctorStatusText = 'Available';
  let doctorStatusColor = 'bg-emerald-500';
  if (currentServing) {
    doctorStatusText = `In Consultation (Serving Token #${currentServing.tokenNumber})`;
    doctorStatusColor = 'bg-emerald-500 animate-pulse';
  } else if (waitingPatients.length > 0) {
    doctorStatusText = 'Ready for Next Patient';
    doctorStatusColor = 'bg-blue-500';
  } else {
    doctorStatusText = 'Available / Idle';
    doctorStatusColor = 'bg-slate-400';
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-between p-4 sm:p-8 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative">
      
      {/* Background glowing effects for premium aesthetic */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-800 gap-4 z-10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600 rounded-xl">
            <Monitor className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">QUEUE WAITING BOARD</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Live Patient Display</p>
          </div>
        </div>
        
        {/* Doctor Status Bar */}
        <div className="flex items-center space-x-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700/50">
          <span className={`w-3 h-3 rounded-full ${doctorStatusColor}`} />
          <span className="text-sm font-semibold tracking-wide text-slate-200">
            {doctorStatusText}
          </span>
        </div>
      </div>

      {/* Screen Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 my-auto py-8 z-10">
        
        {/* Left Box (3 columns): Now Serving Display */}
        <div className="lg:col-span-3 flex flex-col justify-center items-center">
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
            <Volume2 className="h-5 w-5 mr-2 text-emerald-400" />
            NOW SERVING
          </h2>

          {currentServing ? (
            <div 
              className={`w-full max-w-lg p-8 rounded-3xl border text-center transition-all duration-500 flex flex-col justify-center items-center ${
                blink 
                  ? 'bg-blue-600 border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.6)] animate-pulse' 
                  : 'bg-slate-800/50 border-slate-700/80 shadow-lg'
              }`}
            >
              <div className="text-[7rem] sm:text-[10rem] font-black leading-none text-blue-400 select-none tracking-tight">
                {currentServing.tokenNumber}
              </div>
              <div className="text-2xl sm:text-4xl font-extrabold text-slate-100 mt-2 truncate w-full px-4">
                {currentServing.patientName}
              </div>
              <div className="mt-6 inline-flex items-center px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-bold tracking-wide">
                <span className="w-2 h-2 mr-2 bg-emerald-400 rounded-full animate-ping" />
                Proceed to Consultation Room
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg p-12 rounded-3xl border border-slate-800 bg-slate-800/20 text-center py-20 flex flex-col items-center justify-center">
              <ShieldAlert className="h-16 w-16 text-slate-600 mb-4" />
              <p className="text-xl sm:text-2xl font-bold text-slate-500">No Patient Being Served</p>
              <p className="text-sm text-slate-600 mt-1">Please wait for the next token to be called.</p>
            </div>
          )}
        </div>

        {/* Right Box (2 columns): Up Next List */}
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-800/80 p-6 rounded-3xl shadow-xl flex flex-col justify-between min-h-[350px]">
          <div>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800/60 pb-3 mb-4 flex items-center">
              <Play className="h-4.5 w-4.5 mr-2 text-blue-400" />
              UP NEXT
            </h2>

            <div className="space-y-3">
              {upNext.length > 0 ? (
                upNext.map((patient, index) => (
                  <div 
                    key={patient._id} 
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-slate-700/30 hover:border-slate-600/50 transition duration-300"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl font-black text-blue-400">
                        #{patient.tokenNumber}
                      </span>
                      <span className="text-lg font-bold text-slate-200 truncate max-w-[150px] sm:max-w-[200px]">
                        {patient.patientName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-400">
                        {patient.estimatedWaitTime}m wait
                      </span>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                        {index === 0 ? 'Next' : `${index + 1} ahead`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p className="font-bold">No patients waiting</p>
                  <p className="text-xs text-slate-600 mt-1">Lobby is currently empty.</p>
                </div>
              )}
            </div>
          </div>

          {/* Lobby Summary metrics */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-800/60 mt-6">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 text-center">
              <div className="flex justify-center mb-1 text-slate-500">
                <Users className="h-4.5 w-4.5 mr-1" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Queue Size</span>
              </div>
              <div className="text-2xl font-black text-slate-200">
                {totalPatientsAhead}
              </div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 text-center">
              <div className="flex justify-center mb-1 text-slate-500">
                <Clock className="h-4.5 w-4.5 mr-1" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Est. Wait</span>
              </div>
              <div className="text-2xl font-black text-slate-200">
                {nextEstimatedWait} <span className="text-xs text-slate-400 font-normal">mins</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Screen Footer */}
      <div className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider gap-4 z-10">
        <div>
          Clinic settings: average consultation length is <span className="text-blue-400">{settings.averageConsultationTime} minutes</span>.
        </div>
        <div>
          Real-time sync active • Powered by Queue Cure
        </div>
      </div>

    </div>
  );
};
