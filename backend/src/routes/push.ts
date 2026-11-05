/**
 * routes/push.ts
 * REST API endpoints for Web Push subscription management.
 *
 *  GET  /api/push/vapid-public-key   → Return VAPID public key to the browser
 *  POST /api/push/subscribe           → Register / refresh a push subscription
 *  POST /api/push/unsubscribe         → Remove a push subscription
 *  POST /api/push/test                → Send a test push notification
 *  GET  /api/push/status              → Count of active subscriptions
 */

import { Router, Request, Response } from 'express';
import { pushSubscriptionStore } from '../pushSubscriptions';
import { sendTestPushNotification, getVapidPublicKey } from '../pushNotifications';

const router = Router();

// ── GET /vapid-public-key ─────────────────────────────────────────────────────
router.get('/vapid-public-key', (_req: Request, res: Response) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({ error: 'Push notifications not configured on server.' });
  }
  res.json({ vapidPublicKey: key });
});

// ── POST /subscribe ───────────────────────────────────────────────────────────
router.post('/subscribe', (req: Request, res: Response) => {
  try {
    const { subscription } = req.body as { subscription: PushSubscriptionJSON };

    if (!subscription?.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription object. Must include endpoint and keys.' });
    }

    const userAgent = req.headers['user-agent'] || undefined;
    const stored = pushSubscriptionStore.add(subscription as any, userAgent);

    console.log(`[Push Route] New subscription registered (total: ${pushSubscriptionStore.count()})`);
    res.status(201).json({
      success: true,
      message: 'Push subscription registered successfully.',
      subscriptionId: stored.id,
      activeSubscriptions: pushSubscriptionStore.count()
    });
  } catch (err: any) {
    console.error('[Push Route] Subscribe error:', err);
    res.status(500).json({ error: 'Failed to register subscription.', details: err.message });
  }
});

// ── POST /unsubscribe ─────────────────────────────────────────────────────────
router.post('/unsubscribe', (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body as { endpoint: string };

    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint in request body.' });
    }

    const removed = pushSubscriptionStore.removeByEndpoint(endpoint);
    console.log(`[Push Route] Unsubscribe: ${removed ? 'removed' : 'not found'} (remaining: ${pushSubscriptionStore.count()})`);

    res.json({
      success: true,
      removed,
      message: removed ? 'Subscription removed.' : 'Subscription not found (may have already expired).',
      activeSubscriptions: pushSubscriptionStore.count()
    });
  } catch (err: any) {
    console.error('[Push Route] Unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to remove subscription.', details: err.message });
  }
});

// ── POST /test ────────────────────────────────────────────────────────────────
router.post('/test', async (_req: Request, res: Response) => {
  try {
    await sendTestPushNotification();
    res.json({ success: true, message: 'Test push notification sent.', activeSubscriptions: pushSubscriptionStore.count() });
  } catch (err: any) {
    console.error('[Push Route] Test push error:', err);
    res.status(500).json({ error: err.message || 'Failed to send test notification.' });
  }
});

// ── GET /status ───────────────────────────────────────────────────────────────
router.get('/status', (_req: Request, res: Response) => {
  const vapidConfigured = !!getVapidPublicKey();
  res.json({
    vapidConfigured,
    activeSubscriptions: pushSubscriptionStore.count(),
    subscriptions: pushSubscriptionStore.getAll().map(s => ({
      id: s.id,
      registeredAt: s.registeredAt,
      userAgent: s.userAgent
    }))
  });
});

export default router;
