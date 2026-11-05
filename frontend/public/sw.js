/**
 * sw.js — ESP8266 Theft Detection System Service Worker
 *
 * Handles:
 *  • Web Push events (background notifications)
 *  • Notification click (open/focus dashboard tab)
 *  • Push subscription change (auto re-subscribe on key rotation)
 */

const DASHBOARD_URL = '/';

// ── Push Event ───────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('[SW] Push event received with no data, skipping.');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    console.error('[SW] Failed to parse push payload:', e);
    return;
  }

  const {
    title = '🚨 INTRUDER DETECTED!',
    body = 'Suspicious movement detected!',
    tag = 'theft-alert',
    url = '/',
    distance = 0,
    timestamp,
    status = 'ALARM ACTIVE'
  } = payload;

  // Build rich notification body
  const ts = timestamp
    ? new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : new Date().toLocaleTimeString();

  const notificationBody = distance > 0
    ? `${body}\n📏 Distance: ${Number(distance).toFixed(1)} cm\n🔴 Status: ${status}\n🕒 ${ts}`
    : `${body}\n🔔 Status: ${status}\n🕒 ${ts}`;

  const uniqueTag = `theft-alert-${Date.now()}`;

  const options = {
    body: notificationBody,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: uniqueTag,         // Unique tag forces Windows to trigger a fresh toast popup every time
    renotify: true,         // Play chime even if replacing
    requireInteraction: true, // Theft alerts stay visible on desktop until dismissed
    silent: false,          // Play alert sound
    data: { url },
    actions: [
      { action: 'open',    title: '📊 Open Dashboard' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ],
    vibrate: [300, 100, 300, 100, 500],
    timestamp: timestamp ? new Date(timestamp).getTime() : Date.now()
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.warn('[SW] showNotification options failed, falling back to basic notification:', err);
      return self.registration.showNotification(title, {
        body: notificationBody,
        tag: 'theft-alert'
      });
    })
  );
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return; // User explicitly dismissed
  }

  // 'open' action or body click → open/focus the dashboard
  const targetUrl = (event.notification.data && event.notification.data.url) || DASHBOARD_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if dashboard is already open
      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === targetUrl || clientUrl.pathname === '/') {
          return client.focus();
        }
      }
      // No matching tab found — open a new one
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Push Subscription Change ──────────────────────────────────────────────────
// Fires when the browser rotates push keys (e.g., browser update).
// The frontend handles re-registration; this event just logs it.
self.addEventListener('pushsubscriptionchange', (event) => {
  console.warn('[SW] Push subscription changed. Triggering re-subscription from frontend...');
  // Post a message to all controlled clients so the React app can re-subscribe
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      }
    })
  );
});

// ── Install / Activate (passthrough, no caching) ──────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
