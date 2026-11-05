import { Router, Request, Response } from 'express';
import { db } from '../db';
import { wsManager } from '../websocket';
import { sendTheftPushNotification } from '../pushNotifications';

const router = Router();

// Get aggregated system status
router.get('/status', (_req: Request, res: Response) => {
  const state = db.getSystemState();
  const latest = db.getLatestTelemetry();
  res.json({ state, latest });
});

// Arm system
router.post('/arm', (_req: Request, res: Response) => {
  db.setArmedState(true);
  wsManager.broadcastStateChange();
  res.json({ success: true, message: 'System armed successfully', state: db.getSystemState() });
});

// Disarm system
router.post('/disarm', (_req: Request, res: Response) => {
  db.setArmedState(false);
  db.setAlarmState(false);
  wsManager.broadcastStateChange();
  res.json({ success: true, message: 'System disarmed successfully', state: db.getSystemState() });
});

// Reset / silence alarm
router.post('/reset', (_req: Request, res: Response) => {
  db.setAlarmState(false);
  wsManager.broadcastStateChange();
  res.json({ success: true, message: 'Alarm reset successfully', state: db.getSystemState() });
});

// Set Green LED mode (auto / on / off)
router.post('/green-led', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode !== 'auto' && mode !== 'on' && mode !== 'off') {
    return res.status(400).json({ error: 'Mode must be auto, on, or off' });
  }
  db.setGreenLedMode(mode);
  wsManager.broadcastStateChange();
  res.json({ success: true, message: `Green LED mode updated to ${mode}`, state: db.getSystemState() });
});

// Update distance threshold
router.post('/threshold', (req: Request, res: Response) => {
  const { threshold } = req.body;
  const num = parseFloat(threshold);
  if (isNaN(num) || num <= 0) {
    return res.status(400).json({ error: 'Threshold must be a positive number' });
  }

  db.setThreshold(num);
  wsManager.broadcastStateChange();
  res.json({ success: true, message: `Threshold updated to ${num} cm`, state: db.getSystemState() });
});

// Simulator endpoint: Simulates an ESP32 sending distance readings & intrusion events
router.post('/simulate', (req: Request, res: Response) => {
  const { distance, triggerTheft } = req.body;
  const currentState = db.getSystemState();

  const simDistance = typeof distance === 'number' ? distance : (triggerTheft ? 18.5 : 85.0);
  const isAlarm = triggerTheft || (currentState.armed && simDistance <= currentState.threshold);

  if (isAlarm) {
    db.setAlarmState(true);
    const event = db.saveSecurityEvent({
      type: 'INTRUDER_ALERT',
      distance: simDistance,
      threshold: currentState.threshold,
      description: `[SIMULATOR] Intruder detected! Distance ${simDistance.toFixed(1)} cm <= threshold ${currentState.threshold} cm`
    });
    wsManager.broadcastSecurityAlert(event);

    // Fire Web Push notification to all subscribed browsers (non-blocking)
    sendTheftPushNotification(event).catch(err =>
      console.error('[Simulate Route] Push notification error:', err)
    );
  }

  const record = db.saveTelemetry({
    distance: simDistance,
    threshold: currentState.threshold,
    state: isAlarm ? 'ALARM_TRIGGERED' : (currentState.armed ? 'ARMED_NORMAL' : 'DISARMED'),
    armed: currentState.armed,
    alarm: isAlarm,
    buzzer: isAlarm,
    relay: isAlarm,
    redLed: isAlarm,
    greenLed: currentState.armed && !isAlarm,
    gsmStatus: 'READY',
    gsmRssi: 24,
    wifiRssi: -55,
    ip: '192.168.1.150 (simulated)'
  });

  wsManager.broadcastTelemetry(record);

  res.json({
    success: true,
    simulatedTelemetry: record,
    isAlarmTriggered: isAlarm,
    state: db.getSystemState()
  });
});

export default router;
