/**
 * pushNotifications.ts
 * Wraps the web-push library to send push notifications to subscribed browsers.
 * VAPID keys are read from environment variables — never exposed to the frontend.
 */

import path from 'path';
import { execFile } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import webpush from 'web-push';
import { pushSubscriptionStore } from './pushSubscriptions';
import type { SecurityEvent } from './types';

/**
 * Fires a native Windows Desktop Toast notification that pops up
 * even if the browser is minimized, closed, or user is in another app.
 */
export function sendNativeWindowsToast(title: string, message: string): void {
  const scriptPath = path.resolve(__dirname, 'nativeToast.ps1');
  execFile('powershell', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Title', title, '-Message', message], (err) => {
    if (err) {
      console.warn('[Native Toast] Warning:', err.message);
    } else {
      console.log('[Native Toast] Desktop banner dispatched to Windows.');
    }
  });
}

// ── VAPID Configuration ───────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT     || 'mailto:admin@theft-detection-system.local';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.warn('[Push] WARNING: VAPID keys not configured in process.env. Push notifications will be disabled.');
} else {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('[Push] VAPID keys configured. Web Push ready.');
  } catch (err: any) {
    console.error('[Push] Failed to initialize webpush:', err.message);
  }
}

// ── Duplicate guard ───────────────────────────────────────────────────────────
let lastPushedEventId: number | null = null;

// ── Retry configuration ───────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Notification payload builder ──────────────────────────────────────────────
export interface TheftNotificationPayload {
  title: string;
  body: string;
  distance: number;
  timestamp: string;
  status: string;
  eventId?: number;
  tag: string;
  url: string;
}

function buildTheftPayload(event: SecurityEvent): TheftNotificationPayload {
  const ts = new Date(event.timestamp).toLocaleString('en-IN', {
    dateStyle: 'short',
    timeStyle: 'medium'
  });
  return {
    title: '🚨 INTRUDER DETECTED!',
    body: `Suspicious movement detected!\nDistance: ${event.distance.toFixed(1)} cm • Status: ALARM ACTIVE\n${ts}`,
    distance: event.distance,
    timestamp: event.timestamp,
    status: 'ALARM ACTIVE',
    eventId: event.id,
    tag: 'theft-alert',          // Replaces earlier notification with same tag
    url: '/'
  };
}

// ── Core send function (single subscription, with retry) ──────────────────────
async function sendToSubscription(
  storedId: string,
  endpointDesc: string,
  subscription: webpush.PushSubscription,
  payload: string
): Promise<'ok' | 'expired' | 'error'> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await webpush.sendNotification(subscription, payload, {
        TTL: 3600, // Deliver within 1 hour
        urgency: 'high'
      });
      console.log(`[Push] Delivered to ${endpointDesc} (attempt ${attempt})`);
      return 'ok';
    } catch (err: any) {
      const statusCode: number = err?.statusCode ?? 0;

      // 410 Gone / 404 Not Found → subscription is no longer valid, remove it
      if (statusCode === 410 || statusCode === 404) {
        console.warn(`[Push] Subscription expired/invalid (${statusCode}), removing: ${storedId}`);
        pushSubscriptionStore.removeById(storedId);
        return 'expired';
      }

      // Transient error — retry after delay
      if (attempt < MAX_RETRIES) {
        console.warn(`[Push] Delivery failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms:`, err?.message);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error(`[Push] Delivery permanently failed after ${MAX_RETRIES} attempts for ${storedId}:`, err?.message);
        return 'error';
      }
    }
  }
  return 'error';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Broadcast a theft-alert push notification to all registered subscriptions.
 * Guards against duplicate sends for the same event ID.
 */
export async function sendTheftPushNotification(event: SecurityEvent): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[Push] VAPID not configured, skipping push.');
    return;
  }

  // Duplicate guard
  if (event.id !== undefined && event.id === lastPushedEventId) {
    console.log(`[Push] Duplicate guard: event #${event.id} already pushed, skipping.`);
    return;
  }
  if (event.id !== undefined) {
    lastPushedEventId = event.id;
  }

  // Always fire direct Windows OS desktop toast (works when browser is minimized or in another app)
  sendNativeWindowsToast(
    '🚨 INTRUDER DETECTED!',
    `Distance: ${event.distance.toFixed(1)} cm | Intruder within detection range!`
  );

  const subscriptions = pushSubscriptionStore.getAll();
  if (subscriptions.length === 0) {
    console.log('[Push] No active subscriptions — push skipped.');
    return;
  }

  const payload = JSON.stringify(buildTheftPayload(event));
  console.log(`[Push] Sending theft alert to ${subscriptions.length} subscription(s)...`);

  const results = await Promise.allSettled(
    subscriptions.map(s =>
      sendToSubscription(s.id, s.subscription.endpoint.slice(-20), s.subscription, payload)
    )
  );

  const counts = { ok: 0, expired: 0, error: 0 };
  for (const r of results) {
    if (r.status === 'fulfilled') counts[r.value]++;
    else counts.error++;
  }
  console.log(`[Push] Results — Delivered: ${counts.ok}, Expired: ${counts.expired}, Failed: ${counts.error}`);
}

/**
 * Send a test notification to all subscriptions.
 */
export async function sendTestPushNotification(): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured.');
  }

  // Always fire direct Windows OS desktop toast (works when browser is minimized or in another app)
  sendNativeWindowsToast(
    '🔔 Test Notification',
    'Desktop notifications are working! Tested from IoT Theft System.'
  );

  const subscriptions = pushSubscriptionStore.getAll();
  if (subscriptions.length === 0) {
    throw new Error('No active push subscriptions found.');
  }

  const payload = JSON.stringify({
    title: '🔔 Test Notification',
    body: 'Push notifications are working!\nThis is a test from the ESP8266 Theft Detection System.',
    distance: 0,
    timestamp: new Date().toISOString(),
    status: 'TEST',
    tag: 'test-notification',
    url: '/'
  });

  const results = await Promise.allSettled(
    subscriptions.map(s =>
      sendToSubscription(s.id, s.subscription.endpoint.slice(-20), s.subscription, payload)
    )
  );

  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === 'error'));
  if (failed.length === subscriptions.length) {
    throw new Error('All test deliveries failed.');
  }
}

/** Returns the VAPID public key (safe to expose to the browser) */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
