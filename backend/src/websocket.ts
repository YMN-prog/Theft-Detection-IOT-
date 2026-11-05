import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WsMessage } from './types';
import { db } from './db';

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  public initialize(server: HttpServer) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[WS] Client connected. Total active clients: ${this.clients.size}`);

      // Send initial snapshot on connection
      const initPayload: WsMessage = {
        type: 'INIT_STATE',
        payload: {
          systemState: db.getSystemState(),
          latestTelemetry: db.getLatestTelemetry(),
          recentEvents: db.getSecurityEvents(20),
          recentReadings: db.getRecentTelemetry(30)
        }
      };
      ws.send(JSON.stringify(initPayload));

      ws.on('message', (message: string) => {
        try {
          const parsed: WsMessage = JSON.parse(message.toString());
          this.handleClientMessage(parsed);
        } catch (err) {
          console.error('[WS] Failed to parse message from client:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS] Client disconnected. Total active clients: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        console.error('[WS] Client socket error:', err);
        this.clients.delete(ws);
      });
    });
  }

  private handleClientMessage(msg: WsMessage) {
    if (msg.type === 'CLIENT_COMMAND') {
      const { command, value } = msg.payload;
      console.log(`[WS] Command received from client: ${command} (${value})`);

      if (command === 'arm') {
        db.setArmedState(true);
        this.broadcastStateChange();
      } else if (command === 'disarm') {
        db.setArmedState(false);
        db.setAlarmState(false);
        this.broadcastStateChange();
      } else if (command === 'reset') {
        db.setAlarmState(false);
        this.broadcastStateChange();
      } else if (command === 'setThreshold') {
        const t = parseFloat(value);
        if (!isNaN(t) && t > 0) {
          db.setThreshold(t);
          this.broadcastStateChange();
        }
      }
    }
  }

  public broadcast(type: WsMessage['type'], payload: any) {
    const message = JSON.stringify({ type, payload });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  public broadcastTelemetry(telemetry: any) {
    this.broadcast('TELEMETRY_UPDATE', {
      telemetry,
      systemState: db.getSystemState()
    });
  }

  public broadcastSecurityAlert(event: any) {
    this.broadcast('SECURITY_ALERT', {
      event,
      systemState: db.getSystemState()
    });
  }

  public broadcastStateChange() {
    this.broadcast('STATE_CHANGE', {
      systemState: db.getSystemState()
    });
  }
}

export const wsManager = new WebSocketManager();
