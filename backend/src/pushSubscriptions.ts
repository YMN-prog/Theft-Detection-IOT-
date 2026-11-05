/**
 * pushSubscriptions.ts
 * Manages browser Web Push subscription objects.
 * Persists to data/push_subscriptions.json alongside the main DB.
 */

import fs from 'fs';
import path from 'path';
import type { PushSubscription } from 'web-push';

/** Stored subscription record */
export interface StoredSubscription {
  /** Unique key derived from endpoint URL */
  id: string;
  /** The PushSubscription object from the browser */
  subscription: PushSubscription;
  /** ISO timestamp when subscription was registered */
  registeredAt: string;
  /** User-agent string for diagnostics (optional) */
  userAgent?: string;
}

class PushSubscriptionStore {
  private filePath: string;
  private subscriptions: Map<string, StoredSubscription> = new Map();
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'push_subscriptions.json');
    this.load();
  }

  /** Derive a stable ID from the endpoint URL (last 32 chars is unique enough) */
  private makeId(endpoint: string): string {
    return Buffer.from(endpoint).toString('base64').slice(-32).replace(/[/+=]/g, '_');
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const list: StoredSubscription[] = JSON.parse(raw);
        for (const item of list) {
          this.subscriptions.set(item.id, item);
        }
        console.log(`[PushStore] Loaded ${this.subscriptions.size} subscription(s) from disk.`);
      }
    } catch (err) {
      console.error('[PushStore] Failed to load subscriptions from disk:', err);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const list = Array.from(this.subscriptions.values());
        fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
      } catch (err) {
        console.error('[PushStore] Failed to persist subscriptions to disk:', err);
      }
    }, 300);
  }

  /** Add or update a subscription */
  public add(subscription: PushSubscription, userAgent?: string): StoredSubscription {
    const id = this.makeId(subscription.endpoint);
    const record: StoredSubscription = {
      id,
      subscription,
      registeredAt: new Date().toISOString(),
      userAgent
    };
    this.subscriptions.set(id, record);
    this.scheduleSave();
    console.log(`[PushStore] Subscription registered: ${id} (total: ${this.subscriptions.size})`);
    return record;
  }

  /** Remove a subscription by endpoint */
  public removeByEndpoint(endpoint: string): boolean {
    const id = this.makeId(endpoint);
    const existed = this.subscriptions.has(id);
    if (existed) {
      this.subscriptions.delete(id);
      this.scheduleSave();
      console.log(`[PushStore] Subscription removed: ${id} (remaining: ${this.subscriptions.size})`);
    }
    return existed;
  }

  /** Remove a subscription by its stored ID */
  public removeById(id: string): boolean {
    const existed = this.subscriptions.has(id);
    if (existed) {
      this.subscriptions.delete(id);
      this.scheduleSave();
    }
    return existed;
  }

  /** Return all stored subscriptions */
  public getAll(): StoredSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /** Total active subscription count */
  public count(): number {
    return this.subscriptions.size;
  }
}

export const pushSubscriptionStore = new PushSubscriptionStore();
