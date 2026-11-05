import React, { useState, useEffect } from 'react';
import { Sliders, Save, Check } from 'lucide-react';

interface ThresholdControlProps {
  currentThreshold: number;
  onUpdateThreshold: (threshold: number) => Promise<void>;
  isLoading: boolean;
}

export const ThresholdControl: React.FC<ThresholdControlProps> = ({
  currentThreshold,
  onUpdateThreshold,
  isLoading
}) => {
  const [val, setVal] = useState(currentThreshold);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setVal(currentThreshold);
  }, [currentThreshold]);

  const handleSave = async () => {
    await onUpdateThreshold(val);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const presets = [20, 35, 50, 75, 100];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-white">Detection Distance Threshold</h2>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Current: <strong className="text-amber-400 text-sm">{currentThreshold} cm</strong>
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        When the system is <strong>ARMED</strong>, any object or intruder detected within this range triggers the alarm siren and SMS notification.
      </p>

      {/* Slider & Value */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="200"
            step="1"
            value={val}
            onChange={(e) => setVal(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex items-center gap-1 min-w-[70px]">
            <input
              type="number"
              min="5"
              max="350"
              value={val}
              onChange={(e) => setVal(parseFloat(e.target.value) || 0)}
              className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <span className="text-xs text-slate-400">cm</span>
          </div>
        </div>

        {/* Quick Presets & Save Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 mr-1">Presets:</span>
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setVal(p)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  val === p
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {p}cm
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={isLoading || val === currentThreshold}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-md ${
              saved
                ? 'bg-emerald-600 text-white'
                : val === currentThreshold
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Threshold Synced!' : 'Sync to ESP32'}
          </button>
        </div>
      </div>
    </div>
  );
};
