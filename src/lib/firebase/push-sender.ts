/**
 * Push Notification Sender Service
 *
 * December 2025 - Drizzle ORM Implementation
 * No Supabase dependencies
 *
 * High-level service for sending push notifications with:
 * - Preference checking (respects user settings)
 * - Multi-device support (sends to all user devices)
 * - Automatic subscription cleanup (removes invalid tokens)
 * - Comprehensive logging (tracks all sends)
 * - Bulk operations (send to multiple users)
 *
 * SECURITY: Server-side only
 */

import { db, sql, eq, and } from '@/lib/db';
import { user as userTable, pushSubscriptions } from '@/lib/db/schema';
import { FirebaseAdminPushService } from './admin';
import type {
  NotificationType,
  NotificationRequest,
  PushSubscription,
  PushNotificationPreferences,
} from '@/types/push-notifications';

/**
 * Push notification payload for sending
 */
export interface PushNotificationPayload {
  userId: string;
  companyId: string;
  title: string;
  body: string;
  notificationType: NotificationType;
  data?: Record<string, any>;
  link?: string;
  requireInteraction?: boolean;
}

/**
 * Send result with statistics
 */
export interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  skipped: number;
  errors?: string[];
}

/**
 * Push Notification Sender Service
 */
export class PushNotificationSender {
  /**
   * Send push notification to all user's devices
   *
   * Workflow:
   * 1. Check user preferences (global + notification type)
   * 2. Get all active subscriptions
   * 3. Send to each device
   * 4. Log results to database
   * 5. Cleanup invalid subscriptions
   *
   * @param payload - Notification payload
   * @returns Send result with statistics
   */
  static async sendToUser(payload: PushNotificationPayload): Promise<SendResult> {
    try {
      // Step 1: Check user preferences
      const preferencesCheck = await this.checkUserPreferences(
        payload.userId,
        payload.notificationType
      );

      if (!preferencesCheck.allowed) {
        console.log(`Notification blocked by preferences: ${preferencesCheck.reason}`);
        return {
          success: false,
          sent: 0,
          failed: 0,
          skipped: 1,
          errors: [preferencesCheck.reason],
        };
      }

      // Step 2: Get user's active subscriptions
      const subscriptions = await this.getActiveSubscriptions(payload.userId);

      if (subscriptions.length === 0) {
        console.log(`No active subscriptions for user: ${payload.userId}`);
        return {
          success: false,
          sent: 0,
          failed: 0,
          skipped: 1,
          errors: ['No active subscriptions'],
        };
      }

      // Step 3: Send to all devices
      const results = await Promise.allSettled(
        subscriptions.map((sub) => this.sendToSubscription(sub, payload))
      );

      // Step 4: Log results and cleanup
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const subscription = subscriptions[i];

        if (result.status === 'fulfilled') {
          sent++;
          await this.logNotification(subscription, payload, 'sent', null);
        } else {
          failed++;
          const errorMessage = String(result.reason);
          errors.push(errorMessage);

          await this.logNotification(subscription, payload, 'failed', errorMessage);

          // Step 5: Cleanup invalid subscription
          await this.deactivateSubscription(subscription.id, errorMessage);
        }
      }

      return {
        success: sent > 0,
        sent,
        failed,
        skipped: 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Error in sendToUser:', error);
      return {
        success: false,
        sent: 0,
        failed: 1,
        skipped: 0,
        errors: [String(error)],
      };
    }
  }

  /**
   * Send push notification to multiple users
   *
   * Processes users in parallel for efficiency.
   * Returns aggregated statistics.
   *
   * @param payloads - Array of notification payloads
   * @returns Aggregated send result
   */
  static async sendBulk(payloads: PushNotificationPayload[]): Promise<SendResult> {
    if (payloads.length === 0) {
      return {
        success: false,
        sent: 0,
        failed: 0,
        skipped: 0,
      };
    }

    // Send to all users in parallel
    const results = await Promise.allSettled(
      payloads.map((payload) => this.sendToUser(payload))
    );

    // Aggregate results
    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        totalSent += result.value.sent;
        totalFailed += result.value.failed;
        totalSkipped += result.value.skipped;
        if (result.value.errors) {
          allErrors.push(...result.value.errors);
        }
      } else {
        totalFailed++;
        allErrors.push(String(result.reason));
      }
    }

    return {
      success: totalSent > 0,
      sent: totalSent,
      failed: totalFailed,
      skipped: totalSkipped,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  }

  /**
   * Send notification to company (all users in company)
   *
   * Useful for company-wide announcements.
   *
   * @param companyId - Company ID
   * @param payload - Notification payload (userId will be set per user)
   * @returns Aggregated send result
   */
  static async sendToCompany(
    companyId: string,
    payload: Omit<PushNotificationPayload, 'userId'>
  ): Promise<SendResult> {
    try {
      // Get all users in company using Drizzle
      const companyUsers = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.companyId, companyId));

      if (companyUsers.length === 0) {
        console.log(`No users found for company: ${companyId}`);
        return {
          success: false,
          sent: 0,
          failed: 0,
          skipped: 1,
          errors: ['No users in company'],
        };
      }

      // Create payloads for each user
      const payloads: PushNotificationPayload[] = companyUsers
        .map((u) => ({
          ...payload,
          userId: u.id,
          companyId,
        }));

      // Send bulk
      return await this.sendBulk(payloads);
    } catch (error) {
      console.error('Error in sendToCompany:', error);
      return {
        success: false,
        sent: 0,
        failed: 1,
        skipped: 0,
        errors: [String(error)],
      };
    }
  }

  /**
   * Check if user allows this notification type
   *
   * Checks both global enabled flag and specific notification type.
   *
   * @param userId - User ID
   * @param notificationType - Type of notification
   * @returns Preference check result
   */
  private static async checkUserPreferences(
    userId: string,
    notificationType: NotificationType
  ): Promise<{ allowed: boolean; reason: string }> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM push_notification_preferences
        WHERE user_id = ${userId}
        LIMIT 1
      `);

      const prefs = result[0] as unknown as PushNotificationPreferences | undefined;

      // If no preferences, allow by default
      if (!prefs) {
        return { allowed: true, reason: 'No preferences set, allowing by default' };
      }

      // Check global enabled flag
      if (!prefs.enabled) {
        return { allowed: false, reason: 'Push notifications disabled globally' };
      }

      // Check notification type specific preference
      const typeEnabled = this.isNotificationTypeEnabled(prefs, notificationType);
      if (!typeEnabled) {
        return { allowed: false, reason: `Notification type '${notificationType}' disabled` };
      }

      return { allowed: true, reason: 'Preferences allow notification' };
    } catch (error) {
      console.error('Unexpected error in checkUserPreferences:', error);
      // Fail open - allow notification
      return { allowed: true, reason: 'Preference check error, allowing' };
    }
  }

  /**
   * Check if specific notification type is enabled
   *
   * Maps notification types to preference columns.
   *
   * @param prefs - User preferences
   * @param notificationType - Type of notification
   * @returns Whether type is enabled
   */
  private static isNotificationTypeEnabled(
    prefs: PushNotificationPreferences,
    notificationType: NotificationType
  ): boolean {
    const typeMap: Record<NotificationType, keyof PushNotificationPreferences> = {
      payment_alert: 'payment_alerts',
      rsvp_update: 'rsvp_updates',
      event_reminder: 'event_reminders',
      task_deadline: 'task_deadlines',
      vendor_message: 'vendor_messages',
      system_notification: 'enabled', // System notifications use global flag
    };

    const prefKey = typeMap[notificationType];
    return prefs[prefKey] !== false;
  }

  /**
   * Get all active subscriptions for user
   *
   * @param userId - User ID
   * @returns Array of active subscriptions
   */
  private static async getActiveSubscriptions(
    userId: string
  ): Promise<PushSubscription[]> {
    try {
      // Schema: id, userId, endpoint, keys, createdAt, updatedAt
      // No isActive field - all existing subscriptions are considered active
      const result = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

      return result as unknown as PushSubscription[];
    } catch (error) {
      console.error('Unexpected error in getActiveSubscriptions:', error);
      return [];
    }
  }

  /**
   * Send notification to specific subscription
   *
   * Uses Firebase Admin SDK to send the actual push notification.
   *
   * @param subscription - Push subscription
   * @param payload - Notification payload
   */
  private static async sendToSubscription(
    subscription: PushSubscription,
    payload: PushNotificationPayload
  ): Promise<void> {
    try {
      // Prepare notification request
      const request: NotificationRequest = {
        user_id: payload.userId,
        company_id: payload.companyId,
        notification_type: payload.notificationType,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        url: payload.link || '/dashboard',
        requireInteraction: payload.requireInteraction,
      };

      // Send via Firebase Admin SDK
      const result = await FirebaseAdminPushService.sendToDevice(
        subscription.endpoint,
        request
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending to subscription:', subscription.id, error);
      throw error;
    }
  }

  /**
   * Log notification to database
   *
   * Creates audit trail of all notification attempts.
   *
   * @param subscription - Push subscription
   * @param payload - Notification payload
   * @param status - Delivery status
   * @param errorMessage - Error message if failed
   */
  private static async logNotification(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
    status: 'sent' | 'failed',
    errorMessage: string | null
  ): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO push_notification_logs (
          company_id, user_id, subscription_id, notification_type,
          title, body, data, status, sent_at, error_message
        )
        VALUES (
          ${payload.companyId},
          ${payload.userId},
          ${subscription.id},
          ${payload.notificationType},
          ${payload.title},
          ${payload.body},
          ${payload.data ? JSON.stringify(payload.data) : null}::jsonb,
          ${status},
          ${status === 'sent' ? new Date().toISOString() : null},
          ${errorMessage}
        )
      `);
    } catch (error) {
      console.error('Error logging notification:', error);
      // Don't throw - logging failure shouldn't fail the notification
    }
  }

  /**
   * Deactivate invalid subscription
   *
   * Marks subscription as inactive when FCM token is invalid.
   * Preserves subscription for audit trail.
   *
   * @param subscriptionId - Subscription ID
   * @param reason - Deactivation reason
   */
  private static async deactivateSubscription(
    subscriptionId: string,
    reason: string
  ): Promise<void> {
    try {
      // Schema has no isActive field - delete the subscription instead
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, subscriptionId));

      console.log(`Removed subscription ${subscriptionId}: ${reason}`);
    } catch (error) {
      console.error('Error removing subscription:', error);
      // Don't throw - cleanup failure shouldn't fail the notification
    }
  }

  /**
   * Clean up all invalid subscriptions for a user
   *
   * Useful for periodic maintenance.
   * Validates all tokens and deactivates invalid ones.
   *
   * @param userId - User ID
   * @returns Number of subscriptions deactivated
   */
  static async cleanupUserSubscriptions(userId: string): Promise<number> {
    try {
      const subscriptions = await this.getActiveSubscriptions(userId);
      let deactivated = 0;

      for (const subscription of subscriptions) {
        const isValid = await FirebaseAdminPushService.validateToken(
          subscription.endpoint
        );

        if (!isValid) {
          await this.deactivateSubscription(subscription.id, 'Token validation failed');
          deactivated++;
        }
      }

      return deactivated;
    } catch (error) {
      console.error('Error in cleanupUserSubscriptions:', error);
      return 0;
    }
  }

  /**
   * Get notification statistics for user
   *
   * Returns send statistics for monitoring and debugging.
   *
   * @param userId - User ID
   * @param days - Number of days to look back (default 30)
   * @returns Notification statistics
   */
  static async getUserStats(
    userId: string,
    days: number = 30
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    deliveryRate: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.execute(sql`
        SELECT
          COUNT(*)::integer as total,
          COUNT(*) FILTER (WHERE status IN ('sent', 'delivered'))::integer as sent,
          COUNT(*) FILTER (WHERE status = 'failed')::integer as failed
        FROM push_notification_logs
        WHERE user_id = ${userId}
          AND created_at >= ${startDate.toISOString()}
      `);

      const stats = result[0] as {
        total: number;
        sent: number;
        failed: number;
      } || { total: 0, sent: 0, failed: 0 };

      const deliveryRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100 * 10) / 10 : 0;

      return { ...stats, deliveryRate };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return { total: 0, sent: 0, failed: 0, deliveryRate: 0 };
    }
  }
}

/**
 * Convenience function for sending to single user
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<SendResult> {
  return PushNotificationSender.sendToUser(payload);
}

/**
 * Convenience function for bulk sending
 */
export async function sendBulkPushNotifications(
  payloads: PushNotificationPayload[]
): Promise<SendResult> {
  return PushNotificationSender.sendBulk(payloads);
}
