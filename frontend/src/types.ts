export interface TelemetryData {
  id?: number;
  timestamp: string;
  distance: number;
  threshold: number;
  state: 'DISARMED' | 'ARMED_NORMAL' | 'ALARM_TRIGGERED';
  armed: boolean;
  alarm: boolean;
  buzzer: boolean;
  relay: boolean;
  redLed: boolean;
  greenLed: boolean;
  gsmStatus: string;
  gsmRssi: number;
  wifiRssi: number;
  ip: string;
  temperature?: number | null;
  humidity?: number | null;
}

export interface SecurityEvent {
  id?: number;
  timestamp: string;
  type: 'INTRUDER_ALERT' | 'THEFT_ALERT' | 'ARMED' | 'DISARMED' | 'ALARM_RESET' | 'SYSTEM_BOOT' | 'TEST_ALERT';
  distance: number;
  threshold: number;
  description: string;
}

export interface SystemState {
  armed: boolean;
  alarm: boolean;
  threshold: number;
  lastSeen: string | null;
  online: boolean;
  ip: string;
  pendingAction: 'arm' | 'disarm' | 'reset' | 'greenOn' | 'greenOff' | 'greenAuto' | null;
  pendingThreshold: number | null;
  greenLedMode?: 'auto' | 'on' | 'off';
}

export interface DashboardData {
  systemState: SystemState;
  latestTelemetry: TelemetryData | null;
  recentEvents: SecurityEvent[];
  recentReadings: TelemetryData[];
}
