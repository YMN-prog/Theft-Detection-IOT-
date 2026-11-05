import { SystemState, TelemetryData, SecurityEvent } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const API_BASE = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api` : '/api';

export async function fetchStatus(): Promise<{ state: SystemState; latest: TelemetryData | null }> {
  const res = await fetch(`${API_BASE}/system/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function armSystem(): Promise<{ success: boolean; state: SystemState }> {
  const res = await fetch(`${API_BASE}/system/arm`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to arm system');
  return res.json();
}

export async function disarmSystem(): Promise<{ success: boolean; state: SystemState }> {
  const res = await fetch(`${API_BASE}/system/disarm`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to disarm system');
  return res.json();
}

export async function resetAlarm(): Promise<{ success: boolean; state: SystemState }> {
  const res = await fetch(`${API_BASE}/system/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset alarm');
  return res.json();
}

export async function setGreenLedMode(mode: 'auto' | 'on' | 'off'): Promise<{ success: boolean; state: SystemState }> {
  const res = await fetch(`${API_BASE}/system/green-led`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  });
  if (!res.ok) throw new Error('Failed to set green LED mode');
  return res.json();
}

export async function updateThreshold(threshold: number): Promise<{ success: boolean; state: SystemState }> {
  const res = await fetch(`${API_BASE}/system/threshold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threshold })
  });
  if (!res.ok) throw new Error('Failed to update threshold');
  return res.json();
}

export async function fetchEvents(limit = 50): Promise<{ events: SecurityEvent[] }> {
  const res = await fetch(`${API_BASE}/events?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch security events');
  return res.json();
}

export async function fetchRecentTelemetry(limit = 30): Promise<{ history: TelemetryData[] }> {
  const res = await fetch(`${API_BASE}/telemetry/recent?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch telemetry history');
  return res.json();
}

export async function simulateTelemetry(options: { distance?: number; triggerTheft?: boolean }) {
  const res = await fetch(`${API_BASE}/system/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  if (!res.ok) throw new Error('Failed to simulate');
  return res.json();
}
