import React, { useEffect, useRef, useState } from 'react';
import { AlertOctagon, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { SecurityEvent } from '../types';

interface AlertBannerProps {
  isAlarm: boolean;
  latestAlert: SecurityEvent | null;
  onSilence: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  isAlarm,
  latestAlert,
  onSilence
}) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<any>(null);

  const playBeep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Audio autoplay policy might restrict until user interaction
    }
  };

  useEffect(() => {
    if (isAlarm && audioEnabled) {
      playBeep();
      intervalRef.current = setInterval(playBeep, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAlarm, audioEnabled]);

  if (!isAlarm) return null;

  return (
    <div className="bg-red-600 border border-red-400 text-white rounded-2xl p-4 sm:p-5 shadow-2xl shadow-red-600/40 animate-pulse-fast flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 bg-white/20 rounded-xl">
          <AlertOctagon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <span>INTRUDER ALERT: PERIMETER INTRUSION DETECTED!</span>
          </h3>
          <p className="text-xs sm:text-sm text-red-100">
            {latestAlert?.description || 'Intruder detected inside threshold boundary. Buzzer & relay siren engaged.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="p-2 bg-red-700/80 hover:bg-red-700 rounded-xl text-white transition-all text-xs flex items-center gap-1.5"
          title={audioEnabled ? 'Mute browser siren' : 'Enable browser siren'}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{audioEnabled ? 'Mute' : 'Unmute'}</span>
        </button>

        <button
          onClick={onSilence}
          className="px-4 py-2 bg-white text-red-700 hover:bg-red-50 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
        >
          <ShieldAlert className="w-4 h-4" />
          Silence Siren
        </button>
      </div>
    </div>
  );
};
