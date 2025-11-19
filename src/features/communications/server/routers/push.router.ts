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

/**
 * Input validation schemas
 */

// Device type must match database CHECK constraint
const deviceTypeSchema = z.enum(['desktop', 'mobile', 'tablet']);

// Notification type must match database CHECK constraint
const notificationTypeSchema = z.enum([
  'payment_alert',
  'rsvp_update',
  'event_reminder',
  'task_deadline',
  'vendor_message',
  'system_notification',
]);

// Notification status must match database CHECK constraint
const notificationStatusSchema = z.enum(['pending', 'sent', 'failed', 'delivered']);

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
   * @param p256dhKey - Public key for message encryption (Web Push)
   * @param authKey - Authentication secret for Web Push
   * @param userAgent - Browser user agent string
   * @param deviceType - Device type (desktop, mobile, tablet)
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().min(1, 'Endpoint is required'),
        p256dhKey: z.string().min(1, 'P256DH key is required'),
        authKey: z.string().min(1, 'Auth key is required'),
        userAgent: z.string().optional(),
        deviceType: deviceTypeSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId, companyId } = ctx;

      // Verify company context
      if (!companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company context required. Please ensure you are logged in to a company.',
        });
      }

      try {
        // Upsert subscription (update if exists, insert if new)
        // Uses unique constraint on (user_id, endpoint)
        const { data: subscription, error: subscriptionError } = await supabase
          .from('push_subscriptions')
          .upsert(
            {
              user_id: userId,
              company_id: companyId,
              endpoint: input.endpoint,
              p256dh_key: input.p256dhKey,
              auth_key: input.authKey,
              user_agent: input.userAgent || null,
              device_type: input.deviceType || null,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,endpoint',
            }
          )
          .select()
          .single();

        if (subscriptionError) {
          console.error('Failed to save push subscription:', subscriptionError);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save push subscription',
          });
        }

        // Create default preferences if they don't exist
        // Uses upsert to avoid conflicts if preferences already exist
        const { error: preferencesError } = await supabase
          .from('push_notification_preferences')
          .upsert(
            {
              user_id: userId,
              company_id: companyId,
              enabled: true,
              payment_alerts: true,
              rsvp_updates: true,
              event_reminders: true,
              task_deadlines: true,
              vendor_messages: true,
            },
            {
              onConflict: 'user_id',
            }
          );

        if (preferencesError) {
          console.warn('Failed to create default preferences:', preferencesError);
          // Don't throw error - subscription was successful
        }

        return {
          success: true,
          subscription,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

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
      const { supabase, userId } = ctx;

      try {
        const { error } = await supabase
          .from('push_subscriptions')
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('endpoint', input.endpoint);

        if (error) {
          console.error('Failed to unsubscribe:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to unsubscribe from push notifications',
          });
        }

        return {
          success: true,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

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
    const { supabase, userId } = ctx;

    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch subscriptions:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch push subscriptions',
        });
      }

      return data || [];
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

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
    const { supabase, userId, companyId } = ctx;

    if (!companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company context required',
      });
    }

    try {
      const { data, error } = await supabase
        .from('push_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch preferences:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notification preferences',
        });
      }

      // If no preferences exist, create defaults
      if (!data) {
        const { data: newPreferences, error: insertError } = await supabase
          .from('push_notification_preferences')
          .insert({
            user_id: userId,
            company_id: companyId,
            enabled: true,
            payment_alerts: true,
            rsvp_updates: true,
            event_reminders: true,
            task_deadlines: true,
            vendor_messages: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create default preferences:', insertError);
          // Return default values even if insert fails
          return {
            enabled: true,
            payment_alerts: true,
            rsvp_updates: true,
            event_reminders: true,
            task_deadlines: true,
            vendor_messages: true,
          };
        }

        return newPreferences;
      }

      return data;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

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
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        paymentAlerts: z.boolean().optional(),
        rsvpUpdates: z.boolean().optional(),
        eventReminders: z.boolean().optional(),
        taskDeadlines: z.boolean().optional(),
        vendorMessages: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;

      try {
        // Build update object with only provided fields
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (input.enabled !== undefined) {
          updateData.enabled = input.enabled;
        }
        if (input.paymentAlerts !== undefined) {
          updateData.payment_alerts = input.paymentAlerts;
        }
        if (input.rsvpUpdates !== undefined) {
          updateData.rsvp_updates = input.rsvpUpdates;
        }
        if (input.eventReminders !== undefined) {
          updateData.event_reminders = input.eventReminders;
        }
        if (input.taskDeadlines !== undefined) {
          updateData.task_deadlines = input.taskDeadlines;
        }
        if (input.vendorMessages !== undefined) {
          updateData.vendor_messages = input.vendorMessages;
        }

        const { data, error } = await supabase
          .from('push_notification_preferences')
          .update(updateData)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Failed to update preferences:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update notification preferences',
          });
        }

        return {
          success: true,
          preferences: data,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

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
      const { supabase, userId } = ctx;

      try {
        let query = supabase
          .from('push_notification_logs')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        // Apply status filter if provided
        if (input.status) {
          query = query.eq('status', input.status);
        }

        const { data, error, count } = await query;

        if (error) {
          console.error('Failed to fetch notification logs:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch notification logs',
          });
        }

        return {
          logs: data || [],
          total: count || 0,
          hasMore: (count || 0) > input.offset + input.limit,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

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
    const { supabase, userId } = ctx;

    try {
      // Get logs from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs, error } = await supabase
        .from('push_notification_logs')
        .select('status')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Failed to fetch notification stats:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notification statistics',
        });
      }

      // Calculate statistics
      const total = logs?.length || 0;
      const sent = logs?.filter((l) => l.status === 'sent' || l.status === 'delivered').length || 0;
      const failed = logs?.filter((l) => l.status === 'failed').length || 0;
      const pending = logs?.filter((l) => l.status === 'pending').length || 0;

      return {
        total,
        sent,
        failed,
        pending,
        deliveryRate: total > 0 ? Math.round((sent / total) * 100 * 10) / 10 : 0,
        period: 'last_30_days',
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

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
      const { supabase, userId } = ctx;

      try {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', input.subscriptionId)
          .eq('user_id', userId); // Ensure user can only delete their own subscriptions

        if (error) {
          console.error('Failed to delete subscription:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete subscription',
          });
        }

        return {
          success: true,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Unexpected error in push.deleteSubscription:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        });
      }
    }),
});
