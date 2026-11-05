import fs from 'fs';
import path from 'path';
import { TelemetryData, SecurityEvent, SystemState } from './types';

export class Database {
  private dbFilePath: string;
  private telemetry: TelemetryData[] = [];
  private events: SecurityEvent[] = [];
  private state: SystemState = {
    armed: false,
    alarm: false,
    threshold: 35.0,
    lastSeen: null,
    online: false,
    ip: '127.0.0.1',
    pendingAction: null,
    pendingThreshold: null,
    greenLedMode: 'auto'
  };
  private nextTelemetryId = 1;
  private nextEventId = 1;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(filePath?: string) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = filePath || path.join(dataDir, 'theft_system.db.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.telemetry)) this.telemetry = data.telemetry;
        if (Array.isArray(data.events)) this.events = data.events;
        if (data.state) this.state = { ...this.state, ...data.state };

        if (this.telemetry.length > 0) {
          const maxId = Math.max(...this.telemetry.map(t => t.id || 0));
          this.nextTelemetryId = maxId + 1;
        }
        if (this.events.length > 0) {
          const maxId = Math.max(...this.events.map(e => e.id || 0));
          this.nextEventId = maxId + 1;
        }
      } else {
        // Initial seed event
        this.saveSecurityEvent({
          timestamp: new Date().toISOString(),
          type: 'SYSTEM_BOOT',
          distance: 0,
          threshold: 35.0,
          description: 'Security backend database initialized.'
        });
      }
    } catch (err) {
      console.error('[DB] Error loading database file:', err);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const payload = {
          state: this.state,
          telemetry: this.telemetry.slice(-500), // Keep last 500 readings in storage
          events: this.events.slice(-500)
        };
        fs.writeFileSync(this.dbFilePath, JSON.stringify(payload, null, 2), 'utf-8');
      } catch (err) {
        console.error('[DB] Error persisting database to disk:', err);
      }
    }, 500);
  }

  // Telemetry Operations
  public saveTelemetry(data: Omit<TelemetryData, 'id' | 'timestamp'> & { timestamp?: string }): TelemetryData {
    const record: TelemetryData = {
      ...data,
      id: this.nextTelemetryId++,
      timestamp: data.timestamp || new Date().toISOString()
    };

    this.telemetry.push(record);
    if (this.telemetry.length > 1000) {
      this.telemetry.shift();
    }

    // Update current system state snapshot
    this.state.lastSeen = record.timestamp;
    this.state.online = true;
    this.state.armed = record.armed;
    this.state.alarm = record.alarm;
    this.state.threshold = record.threshold;
    this.state.ip = record.ip || this.state.ip;

    this.scheduleSave();
    return record;
  }

  public getLatestTelemetry(): TelemetryData | null {
    return this.telemetry.length > 0 ? this.telemetry[this.telemetry.length - 1] : null;
  }

  public getRecentTelemetry(limit: number = 30): TelemetryData[] {
    return this.telemetry.slice(-limit);
  }

  // Security Events Operations
  public saveSecurityEvent(data: Omit<SecurityEvent, 'id' | 'timestamp'> & { timestamp?: string }): SecurityEvent {
    const event: SecurityEvent = {
      ...data,
      id: this.nextEventId++,
      timestamp: data.timestamp || new Date().toISOString()
    };

    this.events.unshift(event); // newest first
    if (this.events.length > 500) {
      this.events.pop();
    }

    this.scheduleSave();
    return event;
  }

  public getSecurityEvents(limit: number = 50): SecurityEvent[] {
    return this.events.slice(0, limit);
  }

  // System State & Remote Commands
  public getSystemState(): SystemState {
    // Check if ESP32 timed out (heartbeat > 6 seconds = offline)
    if (this.state.lastSeen) {
      const diffMs = Date.now() - new Date(this.state.lastSeen).getTime();
      this.state.online = diffMs < 6000;
    } else {
      this.state.online = false;
    }
    return { ...this.state };
  }

  public setArmedState(armed: boolean) {
    this.state.armed = armed;
    this.state.pendingAction = armed ? 'arm' : 'disarm';
    this.saveSecurityEvent({
      timestamp: new Date().toISOString(),
      type: armed ? 'ARMED' : 'DISARMED',
      distance: this.getLatestTelemetry()?.distance || 0,
      threshold: this.state.threshold,
      description: `System was ${armed ? 'ARMED' : 'DISARMED'} via Web Dashboard`
    });
    this.scheduleSave();
  }

  public setAlarmState(alarm: boolean) {
    this.state.alarm = alarm;
    if (!alarm) {
      this.state.pendingAction = 'reset';
      this.saveSecurityEvent({
        timestamp: new Date().toISOString(),
        type: 'ALARM_RESET',
        distance: this.getLatestTelemetry()?.distance || 0,
        threshold: this.state.threshold,
        description: 'Alarm was reset/silenced via Web Dashboard'
      });
    }
    this.scheduleSave();
  }

  public setGreenLedMode(mode: 'auto' | 'on' | 'off') {
    this.state.greenLedMode = mode;
    this.state.pendingAction = mode === 'on' ? 'greenOn' : (mode === 'off' ? 'greenOff' : 'greenAuto');
    this.saveSecurityEvent({
      timestamp: new Date().toISOString(),
      type: 'SYSTEM_BOOT',
      distance: this.getLatestTelemetry()?.distance || 0,
      threshold: this.state.threshold,
      description: `Green LED mode set to ${mode.toUpperCase()} via Web Dashboard`
    });
    this.scheduleSave();
  }

  public setThreshold(threshold: number) {
    this.state.threshold = threshold;
    this.state.pendingThreshold = threshold;
    this.scheduleSave();
  }

  public popPendingCommands(): { action: string | null; setThreshold: number | null } {
    const action = this.state.pendingAction;
    const thresh = this.state.pendingThreshold;
    this.state.pendingAction = null;
    this.state.pendingThreshold = null;
    return { action, setThreshold: thresh };
  }
}

export const db = new Database();
