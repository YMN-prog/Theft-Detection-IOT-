import React, { useState } from 'react';
import { History, ShieldAlert, CheckCircle, Shield, RefreshCw } from 'lucide-react';
import { SecurityEvent } from '../types';

interface EventLogTableProps {
  events: SecurityEvent[];
  onRefresh: () => void;
  isLoading: boolean;
}

export const EventLogTable: React.FC<EventLogTableProps> = ({
  events,
  onRefresh,
  isLoading
}) => {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredEvents = events.filter((e) => {
    if (filter === 'ALL') return true;
    if (filter === 'ALERTS') return e.type === 'INTRUDER_ALERT';
    if (filter === 'SYSTEM') return e.type !== 'INTRUDER_ALERT';
    return true;
  });

  const getBadge = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'INTRUDER_ALERT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            <ShieldAlert className="w-3 h-3" /> INTRUDER ALERT
          </span>
        );
      case 'ARMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Shield className="w-3 h-3" /> ARMED
          </span>
        );
      case 'DISARMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            DISARMED
          </span>
        );
      case 'ALARM_RESET':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <CheckCircle className="w-3 h-3" /> SILENCED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-semibold text-white">Security Event Log History</h2>
          <span className="text-xs text-slate-500 font-mono">({filteredEvents.length} events)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'ALERTS', 'SYSTEM'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filter === f
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition-all text-xs"
            title="Refresh events"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 sticky top-0 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Timestamp</th>
              <th className="py-2.5 px-3 font-semibold">Event</th>
              <th className="py-2.5 px-3 font-semibold">Distance</th>
              <th className="py-2.5 px-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No security events recorded yet.
                </td>
              </tr>
            ) : (
              filteredEvents.map((e) => (
                <tr key={e.id || `${e.timestamp}-${e.type}`} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono">
                    {new Date(e.timestamp).toLocaleDateString()} {new Date(e.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getBadge(e.type)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                    {e.distance > 0 ? (
                      <span className={e.distance <= e.threshold ? 'text-red-400 font-bold' : 'text-slate-300'}>
                        {e.distance.toFixed(1)} cm
                      </span>
                    ) : (
                      <span className="text-slate-600">--</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={e.description}>
                    {e.description}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
