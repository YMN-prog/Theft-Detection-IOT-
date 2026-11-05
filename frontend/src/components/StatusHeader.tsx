import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Wifi, WifiOff, RefreshCw, Power } from 'lucide-react';
import { SystemState, TelemetryData } from '../types';

interface StatusHeaderProps {
  systemState: SystemState;
  telemetry: TelemetryData | null;
  onArmToggle: () => void;
  onResetAlarm: () => void;
  isLoading: boolean;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({
  systemState,
  telemetry,
  onArmToggle,
  onResetAlarm,
  isLoading
}) => {
  const isAlarm = systemState.alarm || telemetry?.alarm;
  const isArmed = systemState.armed;
  const isOnline = systemState.online;

  return (
    <header className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-xl transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Branding & Status Badge */}
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl border transition-all ${
            isAlarm
              ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse-fast shadow-lg shadow-red-500/20'
              : isArmed
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            {isAlarm ? (
              <ShieldAlert className="w-8 h-8" />
            ) : isArmed ? (
              <ShieldCheck className="w-8 h-8" />
            ) : (
              <Shield className="w-8 h-8" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                NodeMCU Intrusion Detection
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                isAlarm
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-bounce'
                  : isArmed
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isAlarm ? 'INTRUSION ALERT' : isArmed ? 'SYSTEM ARMED' : 'DISARMED'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-red-400" />
                )}
                NodeMCU: <span className={isOnline ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                  {isOnline ? 'Online' : 'Offline / Standby'}
                </span>
              </span>

              <span className="text-slate-600">•</span>
              <span>IP: <code className="text-slate-300 font-mono">{systemState.ip || '127.0.0.1'}</code></span>
              
              {telemetry && (
                <>
                  <span className="text-slate-600">•</span>
                  <span>Wi-Fi: <strong className="text-slate-300">{telemetry.wifiRssi} dBm</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Primary Controls */}
        <div className="flex items-center gap-3">
          {isAlarm && (
            <button
              onClick={onResetAlarm}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-medium rounded-xl shadow-lg shadow-red-600/30 transition-all text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Silence / Reset Alarm
            </button>
          )}

          <button
            onClick={onArmToggle}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg disabled:opacity-50 ${
              isArmed
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-slate-900/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            <Power className="w-4 h-4" />
            {isArmed ? 'Disarm System' : 'Arm System'}
          </button>
        </div>
      </div>
    </header>
  );
};
