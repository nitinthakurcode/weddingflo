/**
 * Sync Manager
 * Handles background synchronization of offline data
 */

import { getPendingActions, updateActionStatus, removeAction } from './offline-queue';
import { getDB, CachedGuest, CachedBudgetItem, CachedVendor } from './indexed-db';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export interface SyncCallbacks {
  onProgress?: (current: number, total: number) => void;
  onComplete?: (result: SyncResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Sync Manager Class
 */
export class SyncManager {
  private isSyncing = false;
  private callbacks: SyncCallbacks = {};

  constructor(callbacks?: SyncCallbacks) {
    this.callbacks = callbacks || {};
  }

  /**
   * Check if currently syncing
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Sync all pending offline actions
   */
  async syncOfflineActions(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.warn('⚠️ Sync already in progress');
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    if (!navigator.onLine) {
      console.warn('⚠️ Cannot sync while offline');
      return { success: false, synced: 0, failed: 0, errors: ['Device is offline'] };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      console.log('🔄 Starting sync...');
      const actions = await getPendingActions();
      const total = actions.length;

      console.log(`📊 Found ${total} pending actions`);

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        this.callbacks.onProgress?.(i + 1, total);

        try {
          // Update status to syncing
          if (action.id) {
            await updateActionStatus(action.id, 'syncing');
          }

          // Execute the action
          const response = await fetch(action.endpoint, {
            method: action.method,
            headers: {
              ...action.headers,
              'Content-Type': 'application/json',
            },
            body: action.method !== 'GET' ? JSON.stringify(action.data) : undefined,
          });

          if (response.ok) {
            // Success - remove from queue
            if (action.id) {
              await removeAction(action.id);
            }
            result.synced++;
            console.log(`✅ Synced action ${i + 1}/${total}:`, action.type);
          } else {
            // Failed - update status
            const errorText = await response.text();
            if (action.id) {
              await updateActionStatus(action.id, 'failed', errorText);
            }
            result.failed++;
            result.errors.push(`Action ${action.id}: ${errorText}`);
            console.error(`❌ Failed to sync action ${i + 1}/${total}:`, errorText);
          }
        } catch (error) {
          // Network or other error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (action.id) {
            await updateActionStatus(action.id, 'failed', errorMessage);
          }
          result.failed++;
          result.errors.push(`Action ${action.id}: ${errorMessage}`);
          console.error(`❌ Error syncing action ${i + 1}/${total}:`, error);
        }
      }

      result.success = result.failed === 0;
      console.log(`✅ Sync complete: ${result.synced} synced, ${result.failed} failed`);

      this.callbacks.onComplete?.(result);
      return result;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.callbacks.onError?.(error as Error);
      return result;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync guest data from server
   */
  async syncGuestsFromServer(clientId: string): Promise<void> {
    if (!navigator.onLine) {
      console.warn('⚠️ Cannot sync while offline');
      return;
    }

    try {
      console.log('🔄 Syncing guests from server...');

      // In a real app, you'd fetch from your API
      // This is a placeholder - integrate with your tRPC endpoints

      const db = await getDB();

      // Example: Fetch guests from API
      // const response = await fetch(`/api/guests?clientId=${clientId}`);
      // const guests = await response.json();

      // Store in IndexedDB
      // for (const guest of guests) {
      //   const cachedGuest: CachedGuest = {
      //     ...guest,
      //     updatedAt: Date.now(),
      //   };
      //   await db.put('guests', cachedGuest);
      // }

      console.log('✅ Guests synced from server');
    } catch (error) {
      console.error('❌ Failed to sync guests:', error);
      throw error;
    }
  }

  /**
   * Cache guest list for offline access
   */
  async cacheGuests(guests: CachedGuest[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('guests', 'readwrite');

    for (const guest of guests) {
      await tx.store.put({
        ...guest,
        updatedAt: Date.now(),
      });
    }

    await tx.done;
    console.log(`✅ Cached ${guests.length} guests`);
  }

  /**
   * Get cached guests
   */
  async getCachedGuests(clientId: string): Promise<CachedGuest[]> {
    const db = await getDB();
    const guests = await db.getAllFromIndex('guests', 'by-client', clientId);
    return guests.sort((a, b) => a.first_name.localeCompare(b.first_name));
  }

  /**
   * Cache budget items
   */
  async cacheBudgetItems(items: CachedBudgetItem[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('budgets', 'readwrite');

    for (const item of items) {
      await tx.store.put({
        ...item,
        updatedAt: Date.now(),
      });
    }

    await tx.done;
    console.log(`✅ Cached ${items.length} budget items`);
  }

  /**
   * Get cached budget items
   */
  async getCachedBudgetItems(weddingId: string): Promise<CachedBudgetItem[]> {
    const db = await getDB();
    return await db.getAllFromIndex('budgets', 'by-wedding', weddingId);
  }

  /**
   * Cache vendors
   */
  async cacheVendors(vendors: CachedVendor[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('vendors', 'readwrite');

    for (const vendor of vendors) {
      await tx.store.put({
        ...vendor,
        updatedAt: Date.now(),
      });
    }

    await tx.done;
    console.log(`✅ Cached ${vendors.length} vendors`);
  }

  /**
   * Get cached vendors
   */
  async getCachedVendors(weddingId: string): Promise<CachedVendor[]> {
    const db = await getDB();
    return await db.getAllFromIndex('vendors', 'by-wedding', weddingId);
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSyncTimestamp(): Promise<void> {
    const db = await getDB();
    await db.put('metadata', {
      key: 'lastSync',
      lastSync: Date.now(),
    });
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTimestamp(): Promise<number | null> {
    const db = await getDB();
    const metadata = await db.get('metadata', 'lastSync');
    return metadata?.lastSync || null;
  }

  /**
   * Check if data is stale (older than threshold)
   */
  async isDataStale(thresholdMinutes: number = 30): Promise<boolean> {
    const lastSync = await this.getLastSyncTimestamp();
    if (!lastSync) return true;

    const now = Date.now();
    const threshold = thresholdMinutes * 60 * 1000;
    return now - lastSync > threshold;
  }
}

// Export singleton instance
let syncManager: SyncManager | null = null;

export function getSyncManager(callbacks?: SyncCallbacks): SyncManager {
  if (!syncManager) {
    syncManager = new SyncManager(callbacks);
  }
  return syncManager;
}

// Helper functions
export async function syncNow(callbacks?: SyncCallbacks): Promise<SyncResult> {
  const manager = getSyncManager(callbacks);
  return await manager.syncOfflineActions();
}

export async function isSyncNeeded(): Promise<boolean> {
  const manager = getSyncManager();
  const isStale = await manager.isDataStale(30); // 30 minutes
  const actions = await getPendingActions();
  return isStale || actions.length > 0;
}
