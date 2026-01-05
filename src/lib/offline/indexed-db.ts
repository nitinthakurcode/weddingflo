/**
 * IndexedDB Setup for Offline Storage
 * Manages local database for offline functionality
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database name and version
const DB_NAME = 'WeddingFloDB';
const DB_VERSION = 1;

// Define database schema
interface WeddingFloDB extends DBSchema {
  // Offline action queue
  offlineQueue: {
    key: number;
    value: OfflineAction;
    indexes: {
      'by-timestamp': number;
      'by-type': string;
      'by-status': 'pending' | 'syncing' | 'failed';
    };
  };

  // Cached guests
  guests: {
    key: string;
    value: CachedGuest;
    indexes: {
      'by-client': string;
      'by-updated': number;
    };
  };

  // Cached budget items
  budgets: {
    key: string;
    value: CachedBudgetItem;
    indexes: {
      'by-wedding': string;
      'by-updated': number;
    };
  };

  // Cached vendors
  vendors: {
    key: string;
    value: CachedVendor;
    indexes: {
      'by-wedding': string;
      'by-updated': number;
    };
  };

  // App metadata
  metadata: {
    key: string;
    value: AppMetadata;
  };
}

// Type definitions
export interface OfflineAction {
  id?: number;
  type: 'check-in' | 'add-guest' | 'edit-guest' | 'delete-guest' | 'add-budget' | 'edit-budget' | 'other';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data: any;
  headers?: Record<string, string>;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface CachedGuest {
  _id: string;
  clientId: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  group_name?: string;
  party_size: number;
  rsvp_status: string;
  checked_in: boolean;
  updatedAt: number;
}

export interface CachedBudgetItem {
  _id: string;
  weddingId: string;
  item_name: string;
  category: string;
  budget: number;
  actual_cost: number;
  paid_amount: number;
  payment_status: string;
  updatedAt: number;
}

export interface CachedVendor {
  _id: string;
  weddingId: string;
  name: string;
  category: string;
  status: string;
  totalCost: number;
  updatedAt: number;
}

export interface AppMetadata {
  key: string;
  lastSync?: number;
  version?: string;
  user?: {
    id: string;
    email?: string;
  };
}

// Database instance
let dbInstance: IDBPDatabase<WeddingFloDB> | null = null;
let isConnecting = false;

/**
 * Check if the database connection is valid and open
 */
function isConnectionValid(db: IDBPDatabase<WeddingFloDB> | null): boolean {
  if (!db) return false;
  try {
    // Check if we can access objectStoreNames - this will throw if connection is closed
    return db.objectStoreNames.length >= 0;
  } catch {
    return false;
  }
}

/**
 * Close the database connection safely
 */
export function closeDB(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore close errors
    }
    dbInstance = null;
  }
}

/**
 * Initialize IndexedDB
 */
export async function initializeDB(): Promise<IDBPDatabase<WeddingFloDB>> {
  // Return existing valid connection
  if (isConnectionValid(dbInstance)) {
    return dbInstance!;
  }

  // Wait if another initialization is in progress
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (isConnectionValid(dbInstance)) {
      return dbInstance!;
    }
  }

  // Clean up stale connection
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore
    }
    dbInstance = null;
  }

  isConnecting = true;

  try {
    dbInstance = await openDB<WeddingFloDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`🔄 Upgrading DB from v${oldVersion} to v${newVersion}`);

        // Create offline queue store
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const offlineStore = db.createObjectStore('offlineQueue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          offlineStore.createIndex('by-timestamp', 'timestamp');
          offlineStore.createIndex('by-type', 'type');
          offlineStore.createIndex('by-status', 'status');
        }

        // Create guests store
        if (!db.objectStoreNames.contains('guests')) {
          const guestsStore = db.createObjectStore('guests', { keyPath: '_id' });
          guestsStore.createIndex('by-client', 'clientId');
          guestsStore.createIndex('by-updated', 'updatedAt');
        }

        // Create budgets store
        if (!db.objectStoreNames.contains('budgets')) {
          const budgetsStore = db.createObjectStore('budgets', { keyPath: '_id' });
          budgetsStore.createIndex('by-wedding', 'weddingId');
          budgetsStore.createIndex('by-updated', 'updatedAt');
        }

        // Create vendors store
        if (!db.objectStoreNames.contains('vendors')) {
          const vendorsStore = db.createObjectStore('vendors', { keyPath: '_id' });
          vendorsStore.createIndex('by-wedding', 'weddingId');
          vendorsStore.createIndex('by-updated', 'updatedAt');
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        console.log('✅ Database upgraded successfully');
      },
      blocked() {
        console.warn('⚠️ Database upgrade blocked - close other tabs');
      },
      blocking() {
        console.warn('⚠️ This tab is blocking a database upgrade');
        // Close connection to unblock other tabs
        closeDB();
      },
      terminated() {
        console.error('❌ Database connection terminated unexpectedly');
        dbInstance = null;
      },
    });

    console.log('✅ IndexedDB initialized');
    return dbInstance;
  } catch (error) {
    console.error('❌ Failed to initialize IndexedDB:', error);
    dbInstance = null;
    throw error;
  } finally {
    isConnecting = false;
  }
}

/**
 * Get database instance (with auto-reconnect)
 */
export async function getDB(): Promise<IDBPDatabase<WeddingFloDB>> {
  // Always verify connection is valid before returning
  if (!isConnectionValid(dbInstance)) {
    return await initializeDB();
  }
  return dbInstance!;
}

/**
 * Safe transaction wrapper - handles closed connection errors
 */
export async function withTransaction<T>(
  storeNames: (keyof WeddingFloDB)[],
  mode: IDBTransactionMode,
  operation: (db: IDBPDatabase<WeddingFloDB>) => Promise<T>
): Promise<T> {
  let retries = 2;

  while (retries > 0) {
    try {
      const db = await getDB();
      return await operation(db);
    } catch (error) {
      const isConnectionError =
        error instanceof DOMException &&
        (error.name === 'InvalidStateError' || error.message.includes('connection is closing'));

      if (isConnectionError && retries > 1) {
        console.warn('⚠️ Database connection error, reconnecting...');
        closeDB();
        retries--;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to execute transaction after retries');
}

/**
 * Clear all data from database
 */
export async function clearAllData(): Promise<void> {
  await withTransaction(
    ['offlineQueue', 'guests', 'budgets', 'vendors', 'metadata'],
    'readwrite',
    async (db) => {
      const tx = db.transaction(['offlineQueue', 'guests', 'budgets', 'vendors', 'metadata'], 'readwrite');

      await Promise.all([
        tx.objectStore('offlineQueue').clear(),
        tx.objectStore('guests').clear(),
        tx.objectStore('budgets').clear(),
        tx.objectStore('vendors').clear(),
        tx.objectStore('metadata').clear(),
      ]);

      await tx.done;
      console.log('🗑️ All data cleared from IndexedDB');
    }
  );
}

/**
 * Get database size estimate
 */
export async function getDatabaseSize(): Promise<{ usage: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { usage: 0, quota: 0 };
}

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
  return 'indexedDB' in window;
}

/**
 * Export database for debugging
 */
export async function exportDatabase(): Promise<any> {
  const db = await getDB();
  const data: any = {};

  // Get all stores
  const stores = ['offlineQueue', 'guests', 'budgets', 'vendors', 'metadata'];

  for (const storeName of stores) {
    const allData = await db.getAll(storeName as any);
    data[storeName] = allData;
  }

  return data;
}

/**
 * Get database info
 */
export async function getDatabaseInfo() {
  const db = await getDB();
  const size = await getDatabaseSize();

  const counts = {
    offlineQueue: await db.count('offlineQueue'),
    guests: await db.count('guests'),
    budgets: await db.count('budgets'),
    vendors: await db.count('vendors'),
  };

  return {
    name: DB_NAME,
    version: DB_VERSION,
    size,
    counts,
  };
}
