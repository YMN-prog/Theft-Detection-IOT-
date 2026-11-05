import React from 'react';
import { Radar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TelemetryData } from '../types';

interface DistanceGaugeProps {
  telemetry: TelemetryData | null;
  threshold: number;
  recentReadings: TelemetryData[];
}

export const DistanceGauge: React.FC<DistanceGaugeProps> = ({
  telemetry,
  threshold,
  recentReadings
}) => {
  const distance = telemetry?.distance ?? 0;
  const isOutOfRange = distance < 0;
  const isBreached = !isOutOfRange && distance > 0 && distance <= threshold;
  
  // Calculate percentage of 200cm max visual range
  const maxRange = 150;
  const percent = isOutOfRange ? 0 : Math.min(100, Math.max(0, (distance / maxRange) * 100));
  const thresholdPercent = Math.min(100, Math.max(0, (threshold / maxRange) * 100));

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 transition-all backdrop-blur-md shadow-xl ${
      isBreached
        ? 'bg-red-950/30 border-red-500/50 shadow-red-950/50'
        : 'bg-slate-900/80 border-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Radar className={`w-5 h-5 ${isBreached ? 'text-red-400 animate-spin' : 'text-blue-400'}`} />
          <h2 className="text-base font-semibold text-white">Ultrasonic Proximity Radar</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {isBreached ? (
            <span className="flex items-center gap-1 text-red-400 font-semibold bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5" /> Perimeter Breached
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Perimeter Clear
            </span>
          )}
        </div>
      </div>

      {/* Main Big Metric */}
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="relative">
          <div className={`text-6xl sm:text-7xl font-extrabold tracking-tight transition-all font-mono ${
            isOutOfRange
              ? 'text-slate-500'
              : isBreached
              ? 'text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]'
              : 'text-blue-400'
          }`}>
            {isOutOfRange ? '--' : distance.toFixed(1)}
          </div>
          <span className="text-lg font-medium text-slate-400 ml-1">cm</span>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          {isOutOfRange
            ? 'Sensor reading out of range or initializing'
            : `Equivalent to ${(distance * 0.3937).toFixed(1)} inches | Trigger threshold: ≤ ${threshold.toFixed(1)} cm`}
        </p>
      </div>

      {/* Visual Proximity Bar */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>0 cm (Close)</span>
          <span className="text-amber-400 font-semibold">Threshold: {threshold} cm</span>
          <span>{maxRange} cm (Far)</span>
        </div>

        <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
          {/* Active distance fill */}
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isBreached ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-blue-600 to-cyan-400'
            }`}
            style={{ width: `${percent}%` }}
          />

          {/* Threshold marker needle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] z-10"
            style={{ left: `${thresholdPercent}%` }}
            title={`Threshold: ${threshold} cm`}
          />
        </div>
      </div>

      {/* Real-time history spark bars */}
      <div className="mt-6 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Recent Pulses (Last 20)</span>
          <span>Live Telemetry</span>
        </div>
        <div className="flex items-end gap-1.5 h-12 bg-slate-950/50 p-2 rounded-xl border border-slate-800/60 overflow-hidden">
          {recentReadings.slice(-20).map((r, i) => {
            const h = r.distance > 0 ? Math.min(100, (r.distance / maxRange) * 100) : 0;
            const breach = r.distance > 0 && r.distance <= threshold;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-all ${
                  breach ? 'bg-red-500' : 'bg-blue-500/70 hover:bg-blue-400'
                }`}
                style={{ height: `${Math.max(8, h)}%` }}
                title={`${r.distance.toFixed(1)} cm at ${new Date(r.timestamp).toLocaleTimeString()}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
