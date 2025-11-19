import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface QueueItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface OfflineDB extends DBSchema {
  queue: {
    key: string;
    value: QueueItem;
    indexes: { 'by-timestamp': number };
  };
}

class OfflineQueueManager {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private readonly DB_NAME = 'weddingflow-offline';
  private readonly STORE_NAME = 'queue';
  private readonly MAX_RETRIES = 3;

  async init() {
    if (typeof window === 'undefined') return;

    this.db = await openDB<OfflineDB>(this.DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore('queue', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });

    // Start processing queue when online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue());
    }
  }

  async addToQueue(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: any
  ): Promise<void> {
    if (!this.db) await this.init();

    const item: QueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      url,
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.MAX_RETRIES,
    };

    await this.db!.add('queue', item);
  }

  async processQueue(): Promise<void> {
    if (!this.db || !navigator.onLine) return;

    const items = await this.db.getAll('queue');

    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });

        if (response.ok) {
          // Success - remove from queue
          await this.db.delete('queue', item.id);
        } else if (item.retryCount >= item.maxRetries) {
          // Max retries reached - remove and log error
          console.error('Queue item failed after max retries:', item);
          await this.db.delete('queue', item.id);
        } else {
          // Retry - increment counter
          item.retryCount++;
          await this.db.put('queue', item);
        }
      } catch (error) {
        // Network error - will retry later
        console.warn('Queue processing failed:', error);
      }
    }
  }

  async getQueueSize(): Promise<number> {
    if (!this.db) await this.init();
    return (await this.db!.count('queue')) || 0;
  }

  async clearQueue(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('queue');
  }
}

export const offlineQueue = new OfflineQueueManager();
