/**
 * Activity Router
 *
 * February 2026 - Full Activity & Notifications System for WeddingFlo
 * Manages user notifications, activity feed, and real-time updates.
 *
 * Features:
 * - Notification management (read/unread)
 * - Activity feed with filtering
 * - Notification creation from other modules
 */

import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, count, isNull, sql, lte, gte } from 'drizzle-orm';
import { notifications } from '@/lib/db/schema';

// Notification types
const notificationTypeSchema = z.enum([
  'lead_new',
  'lead_stage_change',
  'proposal_sent',
  'proposal_viewed',
  'proposal_accepted',
  'proposal_declined',
  'contract_signed',
  'payment_received',
  'payment_overdue',
  'rsvp_received',
  'event_reminder',
  'task_assigned',
  'task_completed',
  'team_invite',
  'system',
]);

export const activityRouter = router({
  /**
   * Get unread notification/activity count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      return { count: 0 };
    }

    const [result] = await ctx.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.companyId, ctx.companyId),
          eq(notifications.userId, ctx.userId),
          eq(notifications.isRead, false)
        )
      );

    return {
      count: Number(result?.count || 0),
    };
  }),

  /**
   * Get recent activity feed with pagination
   */
  getRecent: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        unreadOnly: z.boolean().optional().default(false),
        type: notificationTypeSchema.optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        return [];
      }

      const conditions = [
        eq(notifications.companyId, ctx.companyId),
        eq(notifications.userId, ctx.userId),
      ];

      if (input?.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      if (input?.type) {
        conditions.push(eq(notifications.type, input.type));
      }

      const result = await ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(input?.limit || 20)
        .offset(input?.offset || 0);

      return result;
    }),

  /**
   * Get a single notification by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [notification] = await ctx.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.companyId, ctx.companyId),
            eq(notifications.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification not found',
        });
      }

      return notification;
    }),

  /**
   * Mark a single activity/notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [updated] = await ctx.db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.companyId, ctx.companyId),
            eq(notifications.userId, ctx.userId)
          )
        )
        .returning();

      return { success: true, notification: updated };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID not found in session',
      });
    }

    await ctx.db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.companyId, ctx.companyId),
          eq(notifications.userId, ctx.userId),
          eq(notifications.isRead, false)
        )
      );

    return { success: true };
  }),

  /**
   * Create a notification (internal use - called from other routers)
   * This is a protected procedure that can be called internally
   */
  create: protectedProcedure
    .input(
      z.object({
        userId: z.string(), // Target user ID
        type: notificationTypeSchema,
        title: z.string().min(1).max(200),
        message: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      const [notification] = await ctx.db
        .insert(notifications)
        .values({
          companyId: ctx.companyId,
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          metadata: input.metadata,
        })
        .returning();

      return notification;
    }),

  /**
   * Delete a notification
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found in session',
        });
      }

      await ctx.db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.companyId, ctx.companyId),
            eq(notifications.userId, ctx.userId)
          )
        );

      return { success: true };
    }),

  /**
   * Delete all read notifications (cleanup)
   */
  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.companyId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Company ID not found in session',
      });
    }

    await ctx.db
      .delete(notifications)
      .where(
        and(
          eq(notifications.companyId, ctx.companyId),
          eq(notifications.userId, ctx.userId),
          eq(notifications.isRead, true)
        )
      );

    return { success: true };
  }),

  /**
   * Get notification stats (for dashboard)
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      return {
        total: 0,
        unread: 0,
        byType: {},
        recentCount: 0,
      };
    }

    // Total count
    const [totalResult] = await ctx.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.companyId, ctx.companyId),
          eq(notifications.userId, ctx.userId)
        )
      );

    // Unread count
    const [unreadResult] = await ctx.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.companyId, ctx.companyId),
          eq(notifications.userId, ctx.userId),
          eq(notifications.isRead, false)
        )
      );

    // Count by type
    const typeCounts = await ctx.db
      .select({
        type: notifications.type,
        count: count(),
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.companyId, ctx.companyId),
          eq(notifications.userId, ctx.userId)
        )
      )
      .groupBy(notifications.type);

    // Recent (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentResult] = await ctx.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.companyId, ctx.companyId),
          eq(notifications.userId, ctx.userId),
          gte(notifications.createdAt, yesterday)
        )
      );

    return {
      total: Number(totalResult?.count || 0),
      unread: Number(unreadResult?.count || 0),
      byType: typeCounts.reduce(
        (acc, row) => {
          acc[row.type] = Number(row.count);
          return acc;
        },
        {} as Record<string, number>
      ),
      recentCount: Number(recentResult?.count || 0),
    };
  }),
});
