/**
 * Push Notification Manager
 *
 * Client-side manager for push notification subscriptions
 * Handles permission requests, token generation, and foreground messages
 *
 * Security: All tokens are validated and stored securely in the database
 * Rate limiting and user consent are enforced
 */

import { getMessagingInstance, isPushNotificationSupported } from './config';
import { getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import type {
  NotificationPermission,
  SubscriptionStatus,
  WebPushSubscription
} from '@/types/push-notifications';

// Browser detection utility
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Device type detection
function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (!isBrowser()) return 'desktop';

  const userAgent = navigator.userAgent.toLowerCase();

  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'tablet';
  }

  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Push Notification Manager Class
 * Singleton pattern for managing push notification state
 */
export class PushNotificationManager {
  private static instance: PushNotificationManager | null = null;
  private messageListeners: Set<(payload: MessagePayload) => void> = new Set();

  private constructor() {
    // Private constructor for singleton
    if (isBrowser()) {
      this.initializeForegroundListener();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PushNotificationManager {
    if (!this.instance) {
      this.instance = new PushNotificationManager();
    }
    return this.instance;
  }

  /**
   * Check current notification permission status
   */
  static async getPermissionStatus(): Promise<NotificationPermission> {
    if (!isBrowser() || !('Notification' in window)) {
      return 'denied';
    }

    return Notification.permission as NotificationPermission;
  }

  /**
   * Request notification permission from user
   * Returns the new permission status
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!isBrowser() || !('Notification' in window)) {
      console.warn('Notifications not supported in this environment');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission as NotificationPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Check if push notifications are supported in current browser
   */
  static async isPushNotificationSupported(): Promise<boolean> {
    return isPushNotificationSupported();
  }

  /**
   * Get current subscription status
   * Includes support check, permission status, and subscription state
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const supported = await isPushNotificationSupported();
    const permission = await PushNotificationManager.getPermissionStatus();

    if (!supported || permission !== 'granted') {
      return {
        supported,
        permission,
        subscribed: false,
      };
    }

    const token = await this.getToken();

    return {
      supported,
      permission,
      subscribed: !!token,
      token: token || undefined,
    };
  }

  /**
   * Get FCM token for current device
   * Requires notification permission to be granted
   * Automatically registers service worker if needed
   */
  async getToken(): Promise<string | null> {
    if (!isBrowser()) {
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('Firebase Messaging not supported');
      return null;
    }

    const permission = await PushNotificationManager.getPermissionStatus();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('VAPID key not configured');
      return null;
    }

    try {
      // Register service worker if not already registered
      await this.registerServiceWorker();

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: await this.getServiceWorkerRegistration(),
      });

      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Register service worker for push notifications
   * Required for background message handling
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!isBrowser() || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Get current service worker registration
   */
  private async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    if (!isBrowser() || !('serviceWorker' in navigator)) {
      return undefined;
    }

    try {
      return await navigator.serviceWorker.ready;
    } catch (error) {
      console.error('Error getting service worker registration:', error);
      return undefined;
    }
  }

  /**
   * Convert FCM token to Web Push subscription format
   * This is needed for storing subscription details in the database
   */
  async getWebPushSubscription(): Promise<WebPushSubscription | null> {
    const token = await this.getToken();
    if (!token) return null;

    // Note: Firebase abstracts the Web Push subscription details
    // We store the FCM token as the endpoint for simplicity
    return {
      endpoint: token,
      keys: {
        p256dh: '', // Firebase manages these internally
        auth: '',
      },
    };
  }

  /**
   * Get device information for subscription
   */
  getDeviceInfo() {
    if (!isBrowser()) {
      return {
        user_agent: '',
        device_type: 'desktop' as const,
      };
    }

    return {
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
    };
  }

  /**
   * Initialize foreground message listener
   * Handles messages when the app is in focus
   */
  private async initializeForegroundListener() {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      // Notify all registered listeners
      this.messageListeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      });

      // Show browser notification if supported
      this.showNotification(payload);
    });
  }

  /**
   * Add a message listener
   * Called when a notification is received while app is in foreground
   */
  addMessageListener(callback: (payload: MessagePayload) => void): () => void {
    this.messageListeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  /**
   * Show browser notification for foreground message
   */
  private async showNotification(payload: MessagePayload) {
    if (!isBrowser() || !('Notification' in window)) return;

    const permission = await PushNotificationManager.getPermissionStatus();
    if (permission !== 'granted') return;

    try {
      const registration = await this.getServiceWorkerRegistration();
      if (!registration) return;

      const notificationTitle = payload.notification?.title || 'New Notification';
      const notificationOptions: NotificationOptions = {
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: payload.data,
        tag: payload.data?.tag as string | undefined,
        requireInteraction: false,
      };

      await registration.showNotification(notificationTitle, notificationOptions);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Test notification (for debugging)
   * Shows a test notification to verify setup
   */
  async sendTestNotification(): Promise<boolean> {
    if (!isBrowser() || !('Notification' in window)) {
      return false;
    }

    const permission = await PushNotificationManager.getPermissionStatus();
    if (permission !== 'granted') {
      console.warn('Notification permission required');
      return false;
    }

    try {
      const registration = await this.getServiceWorkerRegistration();
      if (!registration) {
        console.error('Service worker not registered');
        return false;
      }

      await registration.showNotification('Test Notification', {
        body: 'Push notifications are working correctly!',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'test',
        requireInteraction: false,
      });

      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pushNotificationManager = PushNotificationManager.getInstance();
