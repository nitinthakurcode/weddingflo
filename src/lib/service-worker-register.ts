/**
 * Service Worker Registration
 * Registers the service worker and handles updates
 */

import { Workbox } from 'workbox-window';

export interface ServiceWorkerCallbacks {
  onInstalled?: () => void;
  onUpdated?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
  onError?: (error: Error) => void;
}

export class ServiceWorkerManager {
  private wb: Workbox | null = null;
  private callbacks: ServiceWorkerCallbacks = {};

  constructor(callbacks?: ServiceWorkerCallbacks) {
    this.callbacks = callbacks || {};
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    // Only register in production and if browser supports it
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Workers are not supported in this browser');
      return null;
    }

    try {
      this.wb = new Workbox('/sw.js', {
        scope: '/',
      });

      // Setup event listeners
      this.setupEventListeners();

      // Register the service worker
      const registration = await this.wb.register();

      console.log('✅ Service Worker registered successfully');
      return registration ?? null;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      this.callbacks.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Setup Workbox event listeners
   */
  private setupEventListeners() {
    if (!this.wb) return;

    // Installed event - first time SW is installed
    this.wb.addEventListener('installed', (event) => {
      console.log('📦 Service Worker installed:', event.isUpdate ? 'Update' : 'First install');

      if (!event.isUpdate) {
        this.callbacks.onInstalled?.();
        this.showNotification('App ready for offline use!', 'success');
      }
    });

    // Waiting event - new SW is waiting to activate
    this.wb.addEventListener('waiting', () => {
      console.log('⏳ New Service Worker waiting...');
      this.showUpdatePrompt();
    });

    // Controlling event - SW has taken control
    this.wb.addEventListener('controlling', () => {
      console.log('🎮 Service Worker is controlling the page');
      window.location.reload();
    });

    // Activated event - SW has been activated
    this.wb.addEventListener('activated', (event) => {
      console.log('✅ Service Worker activated:', event.isUpdate ? 'Updated' : 'First activation');

      if (event.isUpdate) {
        this.callbacks.onUpdated?.(event.sw as any);
      }
    });

    // Message handler for SW communication
    this.wb.addEventListener('message', (event) => {
      console.log('📨 Message from SW:', event.data);

      if (event.data.type === 'SYNC_COMPLETE') {
        this.showNotification(
          `Synced ${event.data.payload.synced} offline actions`,
          'success'
        );
      }

      if (event.data.type === 'CACHE_UPDATED') {
        console.log('📦 Cache updated');
      }
    });

    // Setup online/offline handlers
    this.setupConnectionMonitoring();
  }

  /**
   * Setup online/offline connection monitoring
   */
  private setupConnectionMonitoring() {
    window.addEventListener('online', () => {
      console.log('🌐 Back online');
      this.callbacks.onOnline?.();
      this.showNotification('Back online! Syncing data...', 'success');

      // Trigger background sync
      this.triggerSync('sync-offline-actions');
    });

    window.addEventListener('offline', () => {
      console.log('📴 Gone offline');
      this.callbacks.onOffline?.();
      this.showNotification('You are offline. Changes will be synced when back online.', 'warning');
    });

    // Check initial connection status
    if (!navigator.onLine) {
      this.callbacks.onOffline?.();
    }
  }

  /**
   * Show update prompt to user
   */
  private showUpdatePrompt() {
    if (
      confirm(
        'A new version of the app is available. Reload to update?'
      )
    ) {
      this.skipWaiting();
    }
  }

  /**
   * Skip waiting and activate new SW
   */
  skipWaiting() {
    if (this.wb) {
      this.wb.messageSkipWaiting();
    }
  }

  /**
   * Trigger background sync
   */
  async triggerSync(tag: string): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register(tag);
        console.log('🔄 Background sync registered:', tag);
      } catch (error) {
        console.error('❌ Background sync registration failed:', error);
      }
    } else {
      console.warn('⚠️ Background Sync is not supported');
    }
  }

  /**
   * Send message to SW
   */
  sendMessage(message: any): void {
    if (this.wb) {
      this.wb.messageSW(message);
    }
  }

  /**
   * Show notification (can be replaced with your toast system)
   */
  private showNotification(message: string, type: 'success' | 'warning' | 'error' = 'success') {
    // Dispatch custom event that can be caught by UI components
    window.dispatchEvent(
      new CustomEvent('sw-notification', {
        detail: { message, type },
      })
    );

    // Fallback to console
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('✅ Service Worker unregistered');
    }
  }

  /**
   * Check if online
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get SW registration
   */
  async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      return (await navigator.serviceWorker.getRegistration()) ?? null;
    }
    return null;
  }
}

// Export singleton instance
let swManager: ServiceWorkerManager | null = null;

export function getServiceWorkerManager(
  callbacks?: ServiceWorkerCallbacks
): ServiceWorkerManager {
  if (!swManager) {
    swManager = new ServiceWorkerManager(callbacks);
  }
  return swManager;
}

// Helper function to register SW
export async function registerServiceWorker(
  callbacks?: ServiceWorkerCallbacks
): Promise<ServiceWorkerRegistration | null> {
  const manager = getServiceWorkerManager(callbacks);
  return await manager.register();
}

// Helper to check if SW is active
export async function isServiceWorkerActive(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    return !!registration?.active;
  }
  return false;
}
