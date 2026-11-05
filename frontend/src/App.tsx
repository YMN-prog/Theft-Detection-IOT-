import React, { useState, useEffect } from 'react';
import { StatusHeader } from './components/StatusHeader';
import { DistanceGauge } from './components/DistanceGauge';
import { HardwareStatus } from './components/HardwareStatus';
import { ThresholdControl } from './components/ThresholdControl';
import { AlertBanner } from './components/AlertBanner';
import { EventLogTable } from './components/EventLogTable';
import { SimulatorControls } from './components/SimulatorControls';
import { NotificationSettings } from './components/NotificationSettings';
import { SystemState, TelemetryData, SecurityEvent } from './types';
import { fetchStatus, armSystem, disarmSystem, resetAlarm, updateThreshold, setGreenLedMode, fetchEvents, fetchRecentTelemetry } from './services/api';
import { wsClient } from './services/websocket';
import { isPushSupported, getPushStatus, enablePushNotifications } from './services/pushNotifications';

export const App: React.FC = () => {
  const [systemState, setSystemState] = useState<SystemState>({
    armed: false,
    alarm: false,
    threshold: 35.0,
    lastSeen: null,
    online: false,
    ip: '127.0.0.1',
    pendingAction: null,
    pendingThreshold: null
  });

  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [recentReadings, setRecentReadings] = useState<TelemetryData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [latestAlert, setLatestAlert] = useState<SecurityEvent | null>(null);

  // ── Web Push: auto-register SW on mount if previously subscribed ────────────
  useEffect(() => {
    if (!isPushSupported()) return;
    // Silently re-register the service worker and restore any existing subscription
    getPushStatus().then(s => {
      if (s.permission === 'granted' && !s.swRegistered) {
        enablePushNotifications().catch(err =>
          console.warn('[App] Silent SW re-registration failed:', err)
        );
      }
    });
  }, []);

  // Load initial snapshot from REST
  const refreshAll = async () => {
    try {
      setIsLoading(true);
      const [statusRes, eventsRes, telemetryRes] = await Promise.all([
        fetchStatus(),
        fetchEvents(30),
        fetchRecentTelemetry(30)
      ]);

      setSystemState(statusRes.state);
      if (statusRes.latest) setTelemetry(statusRes.latest);
      setEvents(eventsRes.events);
      setRecentReadings(telemetryRes.history);

      const alert = eventsRes.events.find(e => e.type === 'INTRUDER_ALERT');
      if (alert) setLatestAlert(alert);
    } catch (err) {
      console.warn('[App] Initial data fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();

    // Connect WebSocket
    wsClient.connect();

    // Subscribe to WebSocket events
    const unsubInit = wsClient.subscribe('INIT_STATE', (data) => {
      if (data.systemState) setSystemState(data.systemState);
      if (data.latestTelemetry) setTelemetry(data.latestTelemetry);
      if (data.recentEvents) setEvents(data.recentEvents);
      if (data.recentReadings) setRecentReadings(data.recentReadings);
    });

    const unsubTelemetry = wsClient.subscribe('TELEMETRY_UPDATE', (data) => {
      if (data.telemetry) {
        setTelemetry(data.telemetry);
        setRecentReadings(prev => [...prev.slice(-29), data.telemetry!]);
      }
      if (data.systemState) setSystemState(data.systemState);
    });

    const unsubAlert = wsClient.subscribe('SECURITY_ALERT', (data) => {
      if (data.event) {
        setLatestAlert(data.event);
        setEvents(prev => [data.event!, ...prev.slice(0, 49)]);

        // Immediate background notification if user has changed tabs or minimized
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🚨 INTRUDER DETECTED!', {
              body: `Suspicious movement at ${data.event.distance.toFixed(1)} cm! Check dashboard immediately.`,
              icon: '/favicon.ico',
              tag: 'theft-alert'
            });
          } catch (e) {
            console.warn('[App] Native notification error:', e);
          }
        }
      }
      if (data.systemState) setSystemState(data.systemState);
    });

    const unsubState = wsClient.subscribe('STATE_CHANGE', (data) => {
      if (data.systemState) setSystemState(data.systemState);
    });

    return () => {
      unsubInit();
      unsubTelemetry();
      unsubAlert();
      unsubState();
    };
  }, []);

  const handleArmToggle = async () => {
    try {
      setIsLoading(true);
      if (systemState.armed) {
        const res = await disarmSystem();
        setSystemState(res.state);
      } else {
        const res = await armSystem();
        setSystemState(res.state);
      }
    } catch (err) {
      console.error('Failed to toggle arm status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAlarm = async () => {
    try {
      setIsLoading(true);
      const res = await resetAlarm();
      setSystemState(res.state);
    } catch (err) {
      console.error('Failed to reset alarm:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateThreshold = async (newVal: number) => {
    try {
      setIsLoading(true);
      const res = await updateThreshold(newVal);
      setSystemState(res.state);
    } catch (err) {
      console.error('Failed to update threshold:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGreenLedChange = async (mode: 'auto' | 'on' | 'off') => {
    try {
      setIsLoading(true);
      const res = await setGreenLedMode(mode);
      setSystemState(res.state);
    } catch (err) {
      console.error('Failed to set green LED mode:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const isAlarm = systemState.alarm || telemetry?.alarm || false;

  // Flash browser tab title when an alarm is active (visible even when in another tab)
  useEffect(() => {
    let interval: any = null;
    let toggle = false;
    if (isAlarm) {
      interval = setInterval(() => {
        toggle = !toggle;
        document.title = toggle ? '🚨 INTRUDER DETECTED! 🚨' : '⚠️ INTRUDER ALERT ⚠️';
      }, 700);
    } else {
      document.title = 'IoT Theft Detection System';
    }
    return () => {
      if (interval) clearInterval(interval);
      document.title = 'IoT Theft Detection System';
    };
  }, [isAlarm]);

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]" />

      <div className="relative z-10 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* Top Header */}
        <StatusHeader
          systemState={systemState}
          telemetry={telemetry}
          onArmToggle={handleArmToggle}
          onResetAlarm={handleResetAlarm}
          isLoading={isLoading}
        />

        {/* High Alert Banner */}
        <AlertBanner
          isAlarm={isAlarm}
          latestAlert={latestAlert}
          onSilence={handleResetAlarm}
        />

        {/* Simulator Panel for quick interactive testing */}
        <SimulatorControls />

        {/* Primary Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Proximity Radar & Distance Gauge */}
          <div className="lg:col-span-7 space-y-6">
            <DistanceGauge
              telemetry={telemetry}
              threshold={systemState.threshold}
              recentReadings={recentReadings}
            />

            <HardwareStatus
              telemetry={telemetry}
              systemState={systemState}
              onGreenLedChange={handleGreenLedChange}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column: Threshold Control & Event Log */}
          <div className="lg:col-span-5 space-y-6">
            <ThresholdControl
              currentThreshold={systemState.threshold}
              onUpdateThreshold={handleUpdateThreshold}
              isLoading={isLoading}
            />

            <NotificationSettings events={events} />

            <EventLogTable
              events={events}
              onRefresh={refreshAll}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        ESP32 IoT Theft Detection System • FreeRTOS Firmware • Node.js/TypeScript REST & WebSocket API • React Vite Dashboard • Web Push Notifications
      </footer>
    </div>
  );
};

export default App;
