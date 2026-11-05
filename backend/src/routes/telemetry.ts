import { Router, Request, Response } from 'express';
import { db } from '../db';
import { wsManager } from '../websocket';

const router = Router();

// Ingest telemetry from ESP32
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      distance,
      threshold,
      state,
      armed,
      alarm,
      buzzer,
      relay,
      redLed,
      greenLed,
      gsmStatus,
      gsmRssi,
      wifiRssi,
      ip,
      temperature,
      humidity
    } = req.body;

    const record = db.saveTelemetry({
      distance: typeof distance === 'number' ? distance : 0,
      threshold: typeof threshold === 'number' ? threshold : 35.0,
      state: state || 'DISARMED',
      armed: !!armed,
      alarm: !!alarm,
      buzzer: !!buzzer,
      relay: !!relay,
      redLed: !!redLed,
      greenLed: !!greenLed,
      gsmStatus: gsmStatus || 'UNKNOWN',
      gsmRssi: typeof gsmRssi === 'number' ? gsmRssi : -1,
      wifiRssi: typeof wifiRssi === 'number' ? wifiRssi : -100,
      ip: ip || (req.ip || '127.0.0.1'),
      temperature: typeof temperature === 'number' ? temperature : null,
      humidity: typeof humidity === 'number' ? humidity : null
    });

    // Broadcast live telemetry update to all connected frontend clients via WebSocket
    wsManager.broadcastTelemetry(record);

    // Check if user submitted any pending control commands on the frontend
    const pending = db.popPendingCommands();

    // Respond back to ESP32 with any pending commands (piggybacked on HTTP response)
    res.status(200).json({
      success: true,
      action: pending.action,
      setThreshold: pending.setThreshold,
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[Telemetry Route Error]:', err);
    res.status(500).json({ error: 'Failed to ingest telemetry', details: err.message });
  }
});

// Get latest reading
router.get('/latest', (_req: Request, res: Response) => {
  const latest = db.getLatestTelemetry();
  res.json({ latest, state: db.getSystemState() });
});

// Get recent history for graphs
router.get('/recent', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 30;
  const history = db.getRecentTelemetry(limit);
  res.json({ history });
});

export default router;
