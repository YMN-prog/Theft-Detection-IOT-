/**
 * NotificationSettings.tsx
 * Dashboard panel for managing Web Push notification settings.
 *
 * Features:
 *  - Enable Notifications button (requests permission, subscribes)
 *  - Disable Notifications option
 *  - Live permission + subscription status
 *  - Test Notification button
 *  - In-app notification history (last 20 push events shown)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, BellRing, CheckCircle2, XCircle, AlertTriangle, Loader2, FlaskConical, History, ChevronDown, ChevronUp } from 'lucide-react';
import {
  isPushSupported,
  getPushStatus,
  enablePushNotifications,
  disablePushNotifications,
  sendTestNotification,
  listenForSubscriptionChange,
  type PushStatus
} from '../services/pushNotifications';
import type { SecurityEvent } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────
interface NotificationHistoryEntry {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'theft' | 'test' | 'system';
}

interface NotificationSettingsProps {
  /** Security events from the main app — used to populate notification history */
  events: SecurityEvent[];
}

// ── Helper: status badge ───────────────────────────────────────────────────────
function PermissionBadge({ permission }: { permission: string }) {
  if (permission === 'granted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3 h-3" /> Granted
      </span>
    );
  }
  if (permission === 'denied') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
        <XCircle className="w-3 h-3" /> Denied
      </span>
    );
  }
  if (permission === 'unsupported') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        <XCircle className="w-3 h-3" /> Not Supported
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <AlertTriangle className="w-3 h-3" /> Not Set
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ events }) => {
  const [status, setStatus] = useState<PushStatus>({
    supported: false,
    permission: 'default',
    subscribed: false,
    swRegistered: false,
    error: null
  });
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // ── Load push status on mount ─────────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    const s = await getPushStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    refreshStatus();

    // Listen for browser-driven subscription changes
    const cleanup = listenForSubscriptionChange((success) => {
      setActionMsg({
        text: success ? 'Push subscription renewed automatically.' : 'Failed to renew subscription. Please re-enable.',
        ok: success
      });
      refreshStatus();
    });

    return cleanup;
  }, [refreshStatus]);

  // ── Enable Notifications ──────────────────────────────────────────────────
  const handleEnable = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      const result = await enablePushNotifications();
      if (result === 'granted') {
        setActionMsg({ text: 'Push notifications enabled! You will receive alerts even when this tab is closed.', ok: true });
      } else if (result === 'denied') {
        setActionMsg({ text: 'Permission was denied. Enable notifications in your browser settings and try again.', ok: false });
      } else if (result === 'unsupported') {
        setActionMsg({ text: 'Your browser does not support push notifications.', ok: false });
      } else {
        setActionMsg({ text: 'Permission request was dismissed. Click "Enable" to try again.', ok: false });
      }
      await refreshStatus();
    } catch (err: any) {
      setActionMsg({ text: err?.message || 'Failed to enable notifications.', ok: false });
    } finally {
      setLoading(false);
    }
  };

  // ── Disable Notifications ─────────────────────────────────────────────────
  const handleDisable = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      await disablePushNotifications();
      setActionMsg({ text: 'Push notifications disabled. You can re-enable them at any time.', ok: true });
      await refreshStatus();
    } catch (err: any) {
      setActionMsg({ text: err?.message || 'Failed to disable notifications.', ok: false });
    } finally {
      setLoading(false);
    }
  };

  // ── Test Notification ─────────────────────────────────────────────────────
  const handleTest = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      await sendTestNotification();
      setActionMsg({ text: 'Test notification sent! Check your browser notifications.', ok: true });
    } catch (err: any) {
      setActionMsg({ text: err?.message || 'Test failed. Make sure notifications are enabled.', ok: false });
    } finally {
      setLoading(false);
    }
  };

  // ── Notification history (from events prop) ───────────────────────────────
  const notificationHistory: NotificationHistoryEntry[] = events
    .filter(e => e.type === 'INTRUDER_ALERT' || e.type === 'TEST_ALERT')
    .slice(0, 20)
    .map(e => ({
      id: `${e.id}-${e.timestamp}`,
      title: e.type === 'INTRUDER_ALERT' ? '🚨 INTRUDER DETECTED!' : '🔔 Test Notification',
      body: e.description,
      timestamp: e.timestamp,
      type: e.type === 'INTRUDER_ALERT' ? 'theft' : 'test'
    }));

  // ── Derived state ─────────────────────────────────────────────────────────
  const isNotSupported = !isPushSupported();
  const isDenied = status.permission === 'denied';
  const isSubscribed = status.subscribed && status.permission === 'granted';

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <BellRing className="w-5 h-5 text-amber-400" />
        <h2 className="text-base font-semibold text-white">Push Notification Settings</h2>
        {isSubscribed && (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Active
          </span>
        )}
      </div>

      {/* Not-supported warning */}
      {isNotSupported && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Your browser does not support Web Push Notifications (requires HTTPS + a modern browser).
            Background notifications are unavailable, but in-app alerts will still work.
          </span>
        </div>
      )}

      {/* Permission denied warning */}
      {!isNotSupported && isDenied && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Notifications are <strong>blocked</strong> in your browser.
            To re-enable: click the lock icon in the address bar → Notifications → Allow.
          </span>
        </div>
      )}

      {/* Status grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3">
          <p className="text-xs text-slate-500 mb-1">Permission Status</p>
          <PermissionBadge permission={isNotSupported ? 'unsupported' : status.permission} />
        </div>
        <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3">
          <p className="text-xs text-slate-500 mb-1">Push Subscription</p>
          {isSubscribed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> Registered
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              <BellOff className="w-3 h-3" /> Not Subscribed
            </span>
          )}
        </div>
        <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3">
          <p className="text-xs text-slate-500 mb-1">Service Worker</p>
          {status.swRegistered ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <CheckCircle2 className="w-3 h-3" /> Registered
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              Not Registered
            </span>
          )}
        </div>
        <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3">
          <p className="text-xs text-slate-500 mb-1">Background Alerts</p>
          {isSubscribed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              ✓ Supported
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              Requires Subscription
            </span>
          )}
        </div>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div className={`mb-4 flex items-start gap-2 p-3 rounded-xl border text-xs ${
          actionMsg.ok
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {actionMsg.ok
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          }
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Control buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Enable button */}
        {!isSubscribed && !isNotSupported && !isDenied && (
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Enable Notifications
          </button>
        )}

        {/* Re-subscribe button (shown when subscribed — allows refreshing subscription) */}
        {isSubscribed && (
          <button
            onClick={handleEnable}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-sm border border-slate-700 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            Refresh Subscription
          </button>
        )}

        {/* Disable button */}
        {isSubscribed && (
          <button
            onClick={handleDisable}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 font-medium rounded-xl text-sm border border-slate-700 hover:border-red-500/40 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
            Disable
          </button>
        )}

        {/* Test button */}
        {isSubscribed && (
          <button
            onClick={handleTest}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-500 text-white font-medium rounded-xl text-sm border border-blue-500/30 shadow-lg shadow-blue-600/10 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Send Test Notification
          </button>
        )}
      </div>

      {/* Notification History */}
      <div className="mt-5 border-t border-slate-800 pt-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors w-full text-left"
        >
          <History className="w-4 h-4 text-purple-400" />
          <span className="font-medium">Notification History</span>
          <span className="text-xs text-slate-600 ml-1">({notificationHistory.length})</span>
          {showHistory ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>

        {showHistory && (
          <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40">
            {notificationHistory.length === 0 ? (
              <p className="py-6 text-center text-slate-600 text-xs">No push notifications sent yet.</p>
            ) : (
              <ul className="divide-y divide-slate-800/50">
                {notificationHistory.map(entry => (
                  <li key={entry.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-800/20 transition-colors">
                    <span className="text-base mt-0.5 flex-shrink-0">
                      {entry.type === 'theft' ? '🚨' : '🔔'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold truncate ${entry.type === 'theft' ? 'text-red-400' : 'text-blue-400'}`}>
                        {entry.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{entry.body}</p>
                    </div>
                    <span className="text-xs text-slate-600 font-mono whitespace-nowrap flex-shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
