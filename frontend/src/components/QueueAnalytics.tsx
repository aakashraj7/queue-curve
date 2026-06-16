import React from 'react';
import { useQueue } from '../context/QueueContext';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Activity, 
  Trash2, 
  TrendingUp, 
  Heart,
  TrendingDown
} from 'lucide-react';

export const QueueAnalytics: React.FC = () => {
  const { analytics, activeQueue } = useQueue();

  const totalRegisteredToday = analytics.patientsServed + analytics.activeQueueCount + analytics.skippedPatientsCount;
  
  // Calculate ratios
  const completionRate = totalRegisteredToday > 0 
    ? Math.round((analytics.patientsServed / totalRegisteredToday) * 100) 
    : 0;

  const skippedRate = totalRegisteredToday > 0 
    ? Math.round((analytics.skippedPatientsCount / totalRegisteredToday) * 100) 
    : 0;

  const waitingRate = totalRegisteredToday > 0
    ? Math.round((activeQueue.filter(p => p.status === 'waiting').length / totalRegisteredToday) * 100)
    : 0;

  const servingRate = totalRegisteredToday > 0
    ? Math.round((activeQueue.filter(p => p.status === 'serving' || p.status === 'calling').length / totalRegisteredToday) * 100)
    : 0;

  // Clinic health metrics evaluation
  let efficiencyText = 'Highly Efficient';
  let efficiencySubText = 'Wait times are within optimal targets.';
  let efficiencyColor = 'text-emerald-500 dark:text-emerald-400';
  let efficiencyBg = 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/15 dark:border-emerald-900/30';

  if (analytics.averageWaitTime > 30) {
    efficiencyText = 'High Waiting Alert';
    efficiencySubText = 'Wait times are exceeding 30 mins. Adjust consultation duration.';
    efficiencyColor = 'text-rose-500 dark:text-rose-400';
    efficiencyBg = 'bg-rose-50 border-rose-100 dark:bg-rose-950/15 dark:border-rose-900/30';
  } else if (analytics.averageWaitTime > 15) {
    efficiencyText = 'Moderate Waiting';
    efficiencySubText = 'Patients are experiencing minor delays.';
    efficiencyColor = 'text-amber-500 dark:text-amber-400';
    efficiencyBg = 'bg-amber-50 border-amber-100 dark:bg-amber-950/15 dark:border-amber-900/30';
  }

  return (
    <div className="space-y-6">
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Served Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 rounded-xl">
              <UserCheck className="h-5 w-5" />
            </div>
            <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
              {completionRate}% rate
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Served Today</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{analytics.patientsServed}</h3>
          </div>
        </div>

        {/* Avg Wait Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-450 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            {analytics.averageWaitTime < 15 ? (
              <span className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                <TrendingDown className="h-3 w-3 mr-0.5" /> Optimal
              </span>
            ) : (
              <span className="flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3 mr-0.5" /> High
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Waiting Time</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
              {analytics.averageWaitTime} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">minutes</span>
            </h3>
          </div>
        </div>

        {/* Avg Consult Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-450 rounded-xl">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-0.5 rounded-full">
              Live Tracker
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Consultation</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
              {analytics.averageConsultationTime} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">minutes</span>
            </h3>
          </div>
        </div>

        {/* Skipped Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 rounded-xl">
              <Trash2 className="h-5 w-5" />
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/30 px-2.5 py-0.5 rounded-full">
              {skippedRate}% rate
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Skipped Patients</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{analytics.skippedPatientsCount}</h3>
          </div>
        </div>

        {/* Active Queue Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs transition-colors duration-300">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-slate-50 dark:bg-slate-805/40 text-slate-600 dark:text-slate-400 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-405 font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              In Lobby
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Queue Size</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{analytics.activeQueueCount}</h3>
          </div>
        </div>
      </div>

      {/* Analytics Insights and Queue Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Distribution Chart & Metrics */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6 transition-colors duration-300">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Queue Status Distribution</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Summary of today's registration profiles</p>
          </div>

          <div className="space-y-4">
            {/* Visual Progress bar stack */}
            <div className="h-6 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
              <div 
                style={{ width: `${completionRate}%` }} 
                className="bg-emerald-500 h-full transition-all duration-500" 
                title={`Served: ${completionRate}%`}
              />
              <div 
                style={{ width: `${waitingRate}%` }} 
                className="bg-blue-500 h-full transition-all duration-500" 
                title={`Waiting: ${waitingRate}%`}
              />
              <div 
                style={{ width: `${servingRate}%` }} 
                className="bg-teal-400 h-full transition-all duration-500 animate-pulse" 
                title={`Serving: ${servingRate}%`}
              />
              <div 
                style={{ width: `${skippedRate}%` }} 
                className="bg-amber-400 h-full transition-all duration-500" 
                title={`Skipped: ${skippedRate}%`}
              />
            </div>

            {/* Legend Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-emerald-500 rounded-lg flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Completed</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-205">{analytics.patientsServed} ({completionRate}%)</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-blue-500 rounded-lg flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Waiting</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-205">
                    {activeQueue.filter(p => p.status === 'waiting').length} ({waitingRate}%)
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-teal-400 rounded-lg flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">With Doctor</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-250">
                    {activeQueue.filter(p => p.status === 'serving' || p.status === 'calling').length} ({servingRate}%)
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 bg-amber-400 rounded-lg flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Skipped</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-205">{analytics.skippedPatientsCount} ({skippedRate}%)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col justify-between sm:flex-row gap-4 items-center">
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Total Patients Handled Today: <span className="font-extrabold text-slate-700 dark:text-slate-200">{totalRegisteredToday}</span>
            </span>
            <div className="inline-flex items-center text-xs font-bold text-slate-600 dark:text-slate-405 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 px-3 py-1 rounded-xl">
              Updates in Real-Time
            </div>
          </div>
        </div>

        {/* Clinic Health Assessment */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-6 transition-colors duration-300">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Operational Health</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Assessment of current queue waiting performance</p>
          </div>

          <div className={`p-4 rounded-xl border flex items-start space-x-3 ${efficiencyBg}`}>
            <Heart className={`h-6 w-6 flex-shrink-0 ${efficiencyColor}`} />
            <div>
              <h4 className={`font-bold text-sm ${efficiencyColor}`}>{efficiencyText}</h4>
              <p className="text-xs text-slate-650 dark:text-slate-300 mt-0.5">{efficiencySubText}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Metric Benchmarks</h4>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Optimal Wait Time Goal:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">&lt; 15 mins</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Current Average Wait Time:</span>
              <span className={`font-bold ${analytics.averageWaitTime <= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {analytics.averageWaitTime} mins
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-600 dark:text-slate-400">Patient Completion Ratio:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{completionRate}%</span>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              * benchmarks are based on standard clinical practices where waiting times above 20 minutes significantly degrade patient experience.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
