import React from 'react';
import { Volume2, VolumeX, Zap, ZapOff, Radio, Signal, Cpu, Thermometer, Droplets, SunMedium } from 'lucide-react';
import { TelemetryData, SystemState } from '../types';

interface HardwareStatusProps {
  telemetry: TelemetryData | null;
  systemState: SystemState;
  onGreenLedChange: (mode: 'auto' | 'on' | 'off') => void;
  isLoading?: boolean;
}

export const HardwareStatus: React.FC<HardwareStatusProps> = ({
  telemetry,
  systemState,
  onGreenLedChange,
  isLoading = false
}) => {
  const buzzer = telemetry?.buzzer ?? false;
  const relay = telemetry?.relay ?? false;
  const redLed = telemetry?.redLed ?? false;
  const greenLed = telemetry?.greenLed ?? false;
  const gsmStatus = telemetry?.gsmStatus ?? 'OFFLINE';
  const gsmRssi = telemetry?.gsmRssi ?? -1;

  const currentGreenMode = systemState.greenLedMode || 'auto';
  const temp = telemetry?.temperature;
  const hum = telemetry?.humidity;
  const hasDht = typeof temp === 'number' && temp > -50 && typeof hum === 'number' && hum >= 0;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Hardware Peripherals & Actuators</h2>
        </div>
        <span className="text-xs text-slate-500 font-mono">NodeMCU ESP8266 ESP-12E</span>
      </div>

      {/* 4 Main Peripheral Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Buzzer */}
        <div className={`p-4 rounded-xl border transition-all ${
          buzzer
            ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
            : 'bg-slate-800/50 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Buzzer (D8)</span>
            {buzzer ? (
              <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${buzzer ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`} />
            <span className={`text-xs sm:text-sm font-semibold truncate ${buzzer ? 'text-amber-400' : 'text-slate-400'}`}>
              {buzzer ? 'POLICE SIREN' : 'SILENT'}
            </span>
          </div>
        </div>

        {/* Relay */}
        <div className={`p-4 rounded-xl border transition-all ${
          relay
            ? 'bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/10'
            : 'bg-slate-800/50 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Relay (D4)</span>
            {relay ? (
              <Zap className="w-4 h-4 text-red-400" />
            ) : (
              <ZapOff className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${relay ? 'bg-red-500' : 'bg-slate-600'}`} />
            <span className={`text-xs sm:text-sm font-semibold truncate ${relay ? 'text-red-400' : 'text-slate-400'}`}>
              {relay ? 'ENERGIZED' : 'STANDBY'}
            </span>
          </div>
        </div>

        {/* Red Alert LED */}
        <div className={`p-4 rounded-xl border transition-all ${
          redLed
            ? 'bg-red-500/15 border-red-500/50 shadow-lg shadow-red-500/20'
            : 'bg-slate-800/50 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Red LED (D0)</span>
            <div className={`w-3.5 h-3.5 rounded-full border ${redLed ? 'bg-red-500 border-red-300 shadow-[0_0_12px_#ef4444]' : 'bg-red-950 border-slate-700'}`} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${redLed ? 'bg-red-400 animate-ping' : 'bg-slate-600'}`} />
            <span className={`text-xs sm:text-sm font-semibold truncate ${redLed ? 'text-red-400' : 'text-slate-400'}`}>
              {redLed ? 'STROBE WARNING' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Green Status LED */}
        <div className={`p-4 rounded-xl border transition-all ${
          greenLed
            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
            : 'bg-slate-800/50 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Green LED (D5)</span>
            <div className={`w-3.5 h-3.5 rounded-full border ${greenLed ? 'bg-emerald-400 border-emerald-200 shadow-[0_0_12px_#10b981]' : 'bg-emerald-950 border-slate-700'}`} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${greenLed ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span className={`text-xs sm:text-sm font-semibold truncate ${greenLed ? 'text-emerald-400' : 'text-slate-400'}`}>
              {greenLed ? 'ACTIVE (ON)' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Green LED Webpage Manual Toggle Control */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <SunMedium className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Green Light Web Control</h3>
            <p className="text-xs text-slate-400">
              Turn the green light ON or OFF directly from this web page, or let it run in automatic mode.
            </p>
          </div>
        </div>

        {/* Toggle Mode Buttons */}
        <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 self-start sm:self-center">
          <button
            onClick={() => onGreenLedChange('auto')}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentGreenMode === 'auto'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Auto (System)
          </button>
          <button
            onClick={() => onGreenLedChange('on')}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentGreenMode === 'on'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-emerald-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Turn ON
          </button>
          <button
            onClick={() => onGreenLedChange('off')}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentGreenMode === 'off'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-red-300'
            }`}
          >
            Turn OFF
          </button>
        </div>
      </div>

      {/* DHT11 Environmental Sensor Status Banner */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <Thermometer className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">DHT11 Environmental Sensor (D3 / GPIO0)</h3>
              <p className="text-xs text-slate-400">Temperature & Humidity monitoring (Safe optional mode)</p>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold self-start sm:self-center border ${
            hasDht
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {hasDht ? '● DHT11 Connected' : 'Optional Sensor Standby'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Temperature */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Temperature</div>
              <div className="text-lg font-bold font-mono text-white">
                {hasDht ? `${temp!.toFixed(1)} °C` : '-- °C'}
              </div>
            </div>
          </div>

          {/* Humidity */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Humidity</div>
              <div className="text-lg font-bold font-mono text-white">
                {hasDht ? `${hum!.toFixed(1)} %` : '-- %'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GSM SIM800L Cellular Banner */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300 font-medium">SIM800L Cellular GSM (SoftwareSerial D7/D6):</span>
          <span className={`px-2 py-0.5 rounded-md font-semibold ${
            gsmStatus === 'READY'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : gsmStatus === 'SEARCHING'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            {gsmStatus}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <Signal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cell Signal: <strong className="text-slate-200">{gsmRssi >= 0 ? `${gsmRssi}/31` : 'No Signal'}</strong></span>
        </div>
      </div>
    </div>
  );
};
