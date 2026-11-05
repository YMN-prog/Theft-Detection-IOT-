/**
 * services/pushNotifications.ts
 * Handles browser-side Web Push logic:
 *  - Service Worker registration
 *  - Subscription management (subscribe / unsubscribe)
 *  - Sending subscriptions to the backend
 *  - Test notification trigger
 */

const API_BASE = '/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export interface PushStatus {
  supported: boolean;
  permission: PushPermissionStatus;
  subscribed: boolean;
  swRegistered: boolean;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a base64url VAPID public key to Uint8Array for the browser API */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Fetch the VAPID public key from the backend */
async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/push/vapid-public-key`);
  if (!res.ok) throw new Error('Failed to fetch VAPID public key from server.');
  const data = await res.json();
  if (!data.vapidPublicKey) throw new Error('Server returned empty VAPID public key.');
  return data.vapidPublicKey;
}

/** Send a PushSubscription to the backend for storage */
async function registerSubscriptionOnServer(subscription: PushSubscription): Promise<void> {
  const res = await fetch(`${API_BASE}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to register subscription on server.');
  }
}

/** Remove a PushSubscription from the backend */
async function unregisterSubscriptionOnServer(endpoint: string): Promise<void> {
  const res = await fetch(`${API_BASE}/push/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint })
  });
  if (!res.ok) {
    console.warn('[Push] Server unsubscribe returned non-OK:', res.status);
  }
}

// ── Core API ──────────────────────────────────────────────────────────────────

/** Check whether the browser supports all required APIs */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Register the Service Worker if not already registered */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported in this browser.');
  }
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  console.log('[Push] Service Worker registered:', registration.scope);

  // Wait until the SW is active
  await navigator.serviceWorker.ready;
  return registration;
}

/**
 * Request notification permission, subscribe to push,
 * and register the subscription with the backend.
 * Returns the resulting permission status.
 */
export async function enablePushNotifications(): Promise<PushPermissionStatus> {
  if (!isPushSupported()) {
    return 'unsupported';
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return permission as PushPermissionStatus;
  }

  try {
    const registration = await registerServiceWorker();
    const vapidPublicKey = await fetchVapidPublicKey();
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

    // Check for an existing subscription and reuse it
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    await registerSubscriptionOnServer(subscription);
    console.log('[Push] Successfully subscribed to push notifications.');
    return 'granted';
  } catch (err) {
    console.error('[Push] Error enabling push notifications:', err);
    throw err;
  }
}

/**
 * Unsubscribe from push notifications and notify the backend.
 */
export async function disablePushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await unregisterSubscriptionOnServer(endpoint);
  console.log('[Push] Successfully unsubscribed from push notifications.');
}

/**
 * Check the current push subscription state without changing anything.
 */
export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) {
    return { supported: false, permission: 'unsupported', subscribed: false, swRegistered: false, error: null };
  }

  const permission = Notification.permission as PushPermissionStatus;
  let swRegistered = false;
  let subscribed = false;
  let error: string | null = null;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    swRegistered = !!registration;

    if (registration && permission === 'granted') {
      const subscription = await registration.pushManager.getSubscription();
      subscribed = !!subscription;
    }
  } catch (err: any) {
    error = err?.message || 'Unknown error checking push status.';
  }

  return { supported: true, permission, subscribed, swRegistered, error };
}

/**
 * Trigger a test push notification via the backend.
 */
export async function sendTestNotification(): Promise<void> {
  const res = await fetch(`${API_BASE}/push/test`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Test notification failed on server.');
  }
}

/**
 * Handle PUSH_SUBSCRIPTION_CHANGED from the Service Worker
 * (browser rotated push keys). Re-subscribe automatically.
 */
export function listenForSubscriptionChange(onResubscribe: (success: boolean) => void): () => void {
  const handler = async (event: MessageEvent) => {
    if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
      console.warn('[Push] Subscription changed, re-subscribing...');
      try {
        await enablePushNotifications();
        onResubscribe(true);
      } catch {
        onResubscribe(false);
      }
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
