/**
 * IndexedDB Setup for Offline Storage
 * Manages local database for offline functionality
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database name and version
const DB_NAME = 'WeddingFlowDB';
const DB_VERSION = 1;

// Define database schema
interface WeddingFlowDB extends DBSchema {
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
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_category: string;
  guest_side: string;
  invite_status: string;
  form_submitted: boolean;
  checked_in: boolean;
  qr_code_token?: string;
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
let dbInstance: IDBPDatabase<WeddingFlowDB> | null = null;

/**
 * Initialize IndexedDB
 */
export async function initializeDB(): Promise<IDBPDatabase<WeddingFlowDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<WeddingFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
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
    throw error;
  }
}

/**
 * Get database instance
 */
export async function getDB(): Promise<IDBPDatabase<WeddingFlowDB>> {
  if (!dbInstance) {
    return await initializeDB();
  }
  return dbInstance;
}

/**
 * Clear all data from database
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
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
