/**
 * Firebase Admin SDK Configuration
 *
 * Server-side Firebase configuration for sending push notifications
 * Uses service account credentials for authentication
 *
 * SECURITY: This file should only be imported in server-side code
 * Never expose admin credentials to the client
 *
 * @see https://firebase.google.com/docs/admin/setup
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import type {
  FCMMessage,
  NotificationRequest,
  NotificationResponse,
} from '@/types/push-notifications';

// Validate environment variables
function validateAdminConfig() {
  const requiredVars = {
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase Admin configuration: ${missing.join(', ')}. ` +
      `Please check your environment variables.`
    );
  }

  return requiredVars as Record<string, string>;
}

// Initialize Firebase Admin SDK (singleton)
let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  try {
    const config = validateAdminConfig();

    // Parse private key (handle escaped newlines)
    const privateKey = config.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');

    adminApp = initializeApp({
      credential: cert({
        projectId: config.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: config.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    return adminApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

// Get messaging instance
let messagingInstance: Messaging | null = null;

function getAdminMessaging(): Messaging {
  if (messagingInstance) {
    return messagingInstance;
  }

  try {
    const app = getAdminApp();
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (error) {
    console.error('Failed to get Admin Messaging instance:', error);
    throw error;
  }
}

/**
 * Firebase Admin Push Notification Service
 * Handles server-side push notification sending
 */
export class FirebaseAdminPushService {
  /**
   * Send push notification to a single device
   *
   * @param token - FCM registration token
   * @param notification - Notification payload
   * @returns Success/failure status
   */
  static async sendToDevice(
    token: string,
    request: NotificationRequest
  ): Promise<NotificationResponse> {
    try {
      const messaging = getAdminMessaging();

      const message: FCMMessage = {
        notification: {
          title: request.title,
          body: request.body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        },
        data: {
          notification_type: request.notification_type,
          url: request.url || '/dashboard',
          requireInteraction: request.requireInteraction ? 'true' : 'false',
          ...request.data,
        },
        token,
      };

      const response = await messaging.send(message as any);

      return {
        success: true,
        sent_count: 1,
        failed_count: 0,
      };
    } catch (error: any) {
      console.error('Failed to send notification:', error);

      return {
        success: false,
        error: error.message || 'Failed to send notification',
        sent_count: 0,
        failed_count: 1,
      };
    }
  }

  /**
   * Send push notification to multiple devices
   *
   * @param tokens - Array of FCM registration tokens
   * @param request - Notification payload
   * @returns Batch send results
   */
  static async sendToMultipleDevices(
    tokens: string[],
    request: NotificationRequest
  ): Promise<NotificationResponse> {
    if (tokens.length === 0) {
      return {
        success: false,
        error: 'No tokens provided',
        sent_count: 0,
        failed_count: 0,
      };
    }

    try {
      const messaging = getAdminMessaging();

      // Build multicast message
      const message = {
        notification: {
          title: request.title,
          body: request.body,
        },
        data: {
          notification_type: request.notification_type,
          url: request.url || '/dashboard',
          requireInteraction: request.requireInteraction ? 'true' : 'false',
          ...(request.data || {}),
        },
        tokens,
        android: {
          notification: {
            icon: 'notification_icon',
            color: '#4F46E5',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);

      return {
        success: response.successCount > 0,
        sent_count: response.successCount,
        failed_count: response.failureCount,
      };
    } catch (error: any) {
      console.error('Failed to send multicast notification:', error);

      return {
        success: false,
        error: error.message || 'Failed to send notifications',
        sent_count: 0,
        failed_count: tokens.length,
      };
    }
  }

  /**
   * Send notification to a topic
   * Useful for broadcasting to all users or specific groups
   *
   * @param topic - Topic name (e.g., 'all-users', 'company-123')
   * @param request - Notification payload
   */
  static async sendToTopic(
    topic: string,
    request: NotificationRequest
  ): Promise<NotificationResponse> {
    try {
      const messaging = getAdminMessaging();

      const message = {
        notification: {
          title: request.title,
          body: request.body,
        },
        data: {
          notification_type: request.notification_type,
          url: request.url || '/dashboard',
          ...(request.data || {}),
        },
        topic,
        android: {
          notification: {
            icon: 'notification_icon',
            color: '#4F46E5',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
          },
        },
      };

      await messaging.send(message);

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Failed to send topic notification:', error);

      return {
        success: false,
        error: error.message || 'Failed to send notification',
      };
    }
  }

  /**
   * Subscribe device tokens to a topic
   *
   * @param tokens - Array of FCM tokens
   * @param topic - Topic name
   */
  static async subscribeToTopic(tokens: string[], topic: string): Promise<boolean> {
    try {
      const messaging = getAdminMessaging();
      await messaging.subscribeToTopic(tokens, topic);
      return true;
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      return false;
    }
  }

  /**
   * Unsubscribe device tokens from a topic
   *
   * @param tokens - Array of FCM tokens
   * @param topic - Topic name
   */
  static async unsubscribeFromTopic(tokens: string[], topic: string): Promise<boolean> {
    try {
      const messaging = getAdminMessaging();
      await messaging.unsubscribeFromTopic(tokens, topic);
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from topic:', error);
      return false;
    }
  }

  /**
   * Validate an FCM token
   * Useful for cleaning up invalid tokens from the database
   *
   * @param token - FCM token to validate
   */
  static async validateToken(token: string): Promise<boolean> {
    try {
      const messaging = getAdminMessaging();

      // Try to send a dry run message
      await messaging.send(
        {
          token,
          data: { test: 'true' },
        },
        true // dry run
      );

      return true;
    } catch (error: any) {
      // Token is invalid if we get specific error codes
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        return false;
      }

      // Other errors might be temporary, assume token is valid
      console.warn('Token validation inconclusive:', error.message);
      return true;
    }
  }
}

// Export singleton instance
export const firebaseAdminPush = FirebaseAdminPushService;
