import React, { useState } from 'react';
import { PlayCircle, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { simulateTelemetry } from '../services/api';

export const SimulatorControls: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleSimulate = async (triggerTheft: boolean, distance?: number) => {
    try {
      setLoading(true);
      await simulateTelemetry({ triggerTheft, distance });
      setLastAction(triggerTheft ? 'Injected Intrusion Alert!' : 'Injected Normal Distance Reading');
      setTimeout(() => setLastAction(null), 2500);
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/60 border border-indigo-900/40 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Hardware Test & Simulator Mode</h3>
            {lastAction && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <Check className="w-3 h-3" /> {lastAction}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Test the entire real-time WebSocket dashboard, sounder siren, and event pipeline without waiting for the physical sensor.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleSimulate(false, 88.5)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-all disabled:opacity-50"
          >
            <PlayCircle className="w-3.5 h-3.5 text-blue-400" />
            Simulate Safe Reading (88cm)
          </button>

          <button
            onClick={() => handleSimulate(true, 16.0)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600/80 hover:bg-red-600 active:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition-all disabled:opacity-50"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Trigger Test Intrusion (16cm)
          </button>
        </div>
      </div>
    </div>
  );
};
