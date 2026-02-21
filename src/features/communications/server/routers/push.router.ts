/**
 * Push Notifications tRPC Router
 *
 * Manages push notification subscriptions, preferences, and logs.
 * Integrates with Firebase Cloud Messaging for browser push notifications.
 *
 * Security:
 * - All procedures require authentication (protectedProcedure)
 * - RLS policies enforce user and company isolation
 * - Input validation with Zod schemas
 * - Rate limiting should be implemented at API gateway level
 *
 * @see https://firebase.google.com/docs/cloud-messaging
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import { eq, and, desc, gte, count } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

/**
 * Input validation schemas
 */

// Device type must match database CHECK constraint
const deviceTypeSchema = z.enum(['desktop', 'mobile', 'tablet']);

// Notification status must match database CHECK constraint
const notificationStatusSchema = z.enum(['pending', 'sent', 'failed', 'delivered']);

// Keys JSONB structure for push subscriptions
interface PushSubscriptionKeys {
  p256dh?: string;
  auth?: string;
  fcmToken?: string;
  deviceType?: string;
  isActive?: boolean;
}

/**
 * Push Notifications Router
 */
export const pushRouter = router({
  /**
   * Subscribe to push notifications
   *
   * Creates or updates a push subscription for the current user.
   * Uses upsert to handle cases where the endpoint already exists.
   * Automatically creates default preferences if they don't exist.
   *
   * @param endpoint - FCM registration token or Web Push endpoint
   * @param p256dh - Public key for message encryption (Web Push)
   * @param auth - Authentication secret for Web Push
   * @param fcmToken - FCM token (optional)
   * @param deviceType - Device type (desktop, mobile, tablet)
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().min(1, 'Endpoint is required'),
        p256dh: z.string().optional(),
        auth: z.string().optional(),
        fcmToken: z.string().optional(),
        deviceType: deviceTypeSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      try {
        // Build keys JSONB object
        const keys: PushSubscriptionKeys = {
          p256dh: input.p256dh,
          auth: input.auth,
          fcmToken: input.fcmToken,
          deviceType: input.deviceType,
          isActive: true,
        };

        // Check if subscription exists
        const existing = await db.query.pushSubscriptions.findFirst({
          where: and(
            eq(schema.pushSubscriptions.userId, userId),
            eq(schema.pushSubscriptions.endpoint, input.endpoint)
          ),
        });

        let subscription;

        if (existing) {
          // Merge with existing keys
          const existingKeys = (existing.keys as PushSubscriptionKeys) || {};
          const mergedKeys: PushSubscriptionKeys = {
            ...existingKeys,
            ...keys,
            isActive: true,
          };

          // Update existing subscription
          const [updated] = await db
            .update(schema.pushSubscriptions)
            .set({
              keys: mergedKeys,
              updatedAt: new Date(),
            })
            .where(eq(schema.pushSubscriptions.id, existing.id))
            .returning();
          subscription = updated;
        } else {
          // Create new subscription
          const [created] = await db
            .insert(schema.pushSubscriptions)
            .values({
              id: crypto.randomUUID(),
              userId,
              endpoint: input.endpoint,
              keys,
            })
            .returning();
          subscription = created;
        }

        // Create default preferences if they don't exist
        // Schema: id, userId, enabled, rsvpUpdates, messages, reminders, createdAt, updatedAt
        const existingPrefs = await db.query.pushNotificationPreferences.findFirst({
          where: eq(schema.pushNotificationPreferences.userId, userId),
        });

        if (!existingPrefs) {
          await db.insert(schema.pushNotificationPreferences).values({
            id: crypto.randomUUID(),
            userId,
            enabled: true,
            rsvpUpdates: true,
            messages: true,
            reminders: true,
          });
        }

        return {
          success: true,
          subscription,
        };
      } catch (error) {
        console.error('Unexpected error in push.subscribe:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Unsubscribe from push notifications
   *
   * Marks a subscription as inactive without deleting it.
   * This allows for subscription history tracking.
   *
   * @param endpoint - The endpoint to unsubscribe
   */
  unsubscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().min(1, 'Endpoint is required'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      try {
        // Get existing subscription to update keys
        const existing = await db.query.pushSubscriptions.findFirst({
          where: and(
            eq(schema.pushSubscriptions.userId, userId),
            eq(schema.pushSubscriptions.endpoint, input.endpoint)
          ),
        });

        if (existing) {
          const existingKeys = (existing.keys as PushSubscriptionKeys) || {};
          const updatedKeys: PushSubscriptionKeys = {
            ...existingKeys,
            isActive: false,
          };

          await db
            .update(schema.pushSubscriptions)
            .set({
              keys: updatedKeys,
              updatedAt: new Date(),
            })
            .where(eq(schema.pushSubscriptions.id, existing.id));
        }

        return {
          success: true,
        };
      } catch (error) {
        console.error('Unexpected error in push.unsubscribe:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get all active push subscriptions
   *
   * Returns all active subscriptions for the current user.
   * Useful for displaying subscribed devices.
   */
  getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;

    try {
      const subscriptions = await db.query.pushSubscriptions.findMany({
        where: eq(schema.pushSubscriptions.userId, userId),
        orderBy: [desc(schema.pushSubscriptions.createdAt)],
      });

      // Filter to active subscriptions (isActive is in keys JSONB)
      const activeSubscriptions = subscriptions.filter((sub) => {
        const keys = sub.keys as PushSubscriptionKeys | null;
        return keys?.isActive !== false;
      });

      return activeSubscriptions;
    } catch (error) {
      console.error('Unexpected error in push.getSubscriptions:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }),

  /**
   * Get push notification preferences
   *
   * Returns the user's notification preferences.
   * Creates default preferences if they don't exist.
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;

    try {
      let preferences = await db.query.pushNotificationPreferences.findFirst({
        where: eq(schema.pushNotificationPreferences.userId, userId),
      });

      // If no preferences exist, create defaults
      // Schema: id, userId, enabled, rsvpUpdates, messages, reminders, createdAt, updatedAt
      if (!preferences) {
        const [created] = await db
          .insert(schema.pushNotificationPreferences)
          .values({
            id: crypto.randomUUID(),
            userId,
            enabled: true,
            rsvpUpdates: true,
            messages: true,
            reminders: true,
          })
          .returning();

        preferences = created;
      }

      return preferences;
    } catch (error) {
      console.error('Unexpected error in push.getPreferences:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }),

  /**
   * Update push notification preferences
   *
   * Updates one or more preference settings.
   * Only provided fields are updated (partial update).
   * Schema: enabled, rsvpUpdates, messages, reminders
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        rsvpUpdates: z.boolean().optional(),
        messages: z.boolean().optional(),
        reminders: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      try {
        const [updated] = await db
          .update(schema.pushNotificationPreferences)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(schema.pushNotificationPreferences.userId, userId))
          .returning();

        return {
          success: true,
          preferences: updated,
        };
      } catch (error) {
        console.error('Unexpected error in push.updatePreferences:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get push notification logs
   *
   * Returns notification delivery logs for the current user.
   * Supports pagination and status filtering.
   *
   * @param limit - Maximum number of logs to return (1-100, default 50)
   * @param offset - Number of logs to skip for pagination
   * @param status - Filter by notification status
   */
  getLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        status: notificationStatusSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      try {
        const conditions = [eq(schema.pushNotificationLogs.userId, userId)];

        if (input.status) {
          conditions.push(eq(schema.pushNotificationLogs.status, input.status));
        }

        const logs = await db.query.pushNotificationLogs.findMany({
          where: and(...conditions),
          orderBy: [desc(schema.pushNotificationLogs.createdAt)],
          limit: input.limit,
          offset: input.offset,
        });

        // Get total count
        const [countResult] = await db
          .select({ count: count() })
          .from(schema.pushNotificationLogs)
          .where(and(...conditions));

        const total = countResult?.count || 0;

        return {
          logs,
          total,
          hasMore: total > input.offset + input.limit,
        };
      } catch (error) {
        console.error('Unexpected error in push.getLogs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),

  /**
   * Get push notification statistics
   *
   * Returns delivery statistics for the last 30 days:
   * - Total notifications sent
   * - Successfully delivered
   * - Failed deliveries
   * - Delivery rate percentage
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const { db, userId } = ctx;

    try {
      // Get logs from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const logs = await db.query.pushNotificationLogs.findMany({
        where: and(
          eq(schema.pushNotificationLogs.userId, userId),
          gte(schema.pushNotificationLogs.createdAt, thirtyDaysAgo)
        ),
        columns: {
          status: true,
        },
      });

      // Calculate statistics
      const total = logs.length;
      const sent = logs.filter((l) => l.status === 'sent' || l.status === 'delivered').length;
      const failed = logs.filter((l) => l.status === 'failed').length;
      const pending = logs.filter((l) => l.status === 'pending').length;

      return {
        total,
        sent,
        failed,
        pending,
        deliveryRate: total > 0 ? Math.round((sent / total) * 100 * 10) / 10 : 0,
        period: 'last_30_days',
      };
    } catch (error) {
      console.error('Unexpected error in push.getStats:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }),

  /**
   * Delete a specific subscription
   *
   * Permanently removes a subscription from the database.
   * Use this when a user explicitly removes a device.
   */
  deleteSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string().uuid('Invalid subscription ID'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      try {
        await db
          .delete(schema.pushSubscriptions)
          .where(
            and(
              eq(schema.pushSubscriptions.id, input.subscriptionId),
              eq(schema.pushSubscriptions.userId, userId) // Ensure user can only delete their own subscriptions
            )
          );

        return {
          success: true,
        };
      } catch (error) {
        console.error('Unexpected error in push.deleteSubscription:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),
});
