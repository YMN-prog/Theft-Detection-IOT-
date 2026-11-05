import { TelemetryData, SecurityEvent, SystemState } from '../types';

type MessageHandler = (data: {
  systemState?: SystemState;
  latestTelemetry?: TelemetryData | null;
  recentEvents?: SecurityEvent[];
  recentReadings?: TelemetryData[];
  telemetry?: TelemetryData;
  event?: SecurityEvent;
}) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectInterval = 2500;
  private isConnecting = false;
  private listeners: Set<{ event: string; handler: MessageHandler }> = new Set();
  private isConnected = false;

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Connect to backend port 5000
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:5000`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log('[WebSocket] Connected to backend server:', wsUrl);
        this.notify('connection_change', { systemState: { online: true } as any });
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.notify(parsed.type, parsed.payload);
        } catch (e) {
          console.error('[WebSocket] Failed to parse incoming packet:', e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        console.log('[WebSocket] Disconnected from server. Reconnecting in', this.reconnectInterval, 'ms');
        this.notify('connection_change', { systemState: { online: false } as any });
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.socket.onerror = (err) => {
        console.warn('[WebSocket] Connection error:', err);
        this.socket?.close();
      };
    } catch (e) {
      this.isConnecting = false;
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  public subscribe(event: string, handler: MessageHandler) {
    const listener = { event, handler };
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(type: string, payload: any) {
    for (const listener of this.listeners) {
      if (listener.event === type || listener.event === '*') {
        listener.handler(payload);
      }
    }
  }

  public sendCommand(command: string, value?: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'CLIENT_COMMAND',
        payload: { command, value }
      }));
    } else {
      console.warn('[WebSocket] Cannot send command, socket is not connected');
    }
  }

  public getStatus() {
    return this.isConnected;
  }

  public getConnectingStatus() {
    return this.isConnecting;
  }
}

export const wsClient = new WebSocketClient();
