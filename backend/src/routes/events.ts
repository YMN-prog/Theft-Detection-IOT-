import { Router, Request, Response } from 'express';
import { db } from '../db';
import { wsManager } from '../websocket';
import { sendTheftPushNotification } from '../pushNotifications';

const router = Router();

// Log security event (posted by ESP32 or triggered manually)
router.post('/', (req: Request, res: Response) => {
  try {
    const { type, distance, threshold, description } = req.body;

    const event = db.saveSecurityEvent({
      type: type || 'INTRUDER_ALERT',
      distance: typeof distance === 'number' ? distance : 0,
      threshold: typeof threshold === 'number' ? threshold : 35.0,
      description: description || 'Intruder detected by ultrasonic sensor'
    });

    // Mark system in alarm state
    if (event.type === 'INTRUDER_ALERT') {
      db.setAlarmState(true);
    }

    // Broadcast high-priority alert to all connected dashboard clients
    wsManager.broadcastSecurityAlert(event);

    // Fire Web Push to all browser subscriptions (non-blocking)
    if (event.type === 'INTRUDER_ALERT') {
      sendTheftPushNotification(event).catch(err =>
        console.error('[Events Route] Push notification error:', err)
      );
    }

    res.status(201).json({ success: true, event });
  } catch (err: any) {
    console.error('[Events Route Error]:', err);
    res.status(500).json({ error: 'Failed to record event', details: err.message });
  }
});

// Fetch historical security events
router.get('/', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const events = db.getSecurityEvents(limit);
  res.json({ events });
});

export default router;
