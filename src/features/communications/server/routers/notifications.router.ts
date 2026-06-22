/**
 * Notifications Router
 *
 * Read-side API for the in-app notification bell/dropdown. Notification rows are
 * created by `@/features/core/server/services/notification.service` from across
 * the app; this router lets the signed-in user list, count, mark-read and delete
 * their own notifications. All queries are scoped to `ctx.userId`.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/trpc/trpc';
import { notifications } from '@/lib/db/schema';
import { and, eq, desc, count } from 'drizzle-orm';

export const notificationsRouter = router({
  /** List the current user's notifications (most recent first). */
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          unreadOnly: z.boolean().default(false),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const conditions = [eq(notifications.userId, ctx.userId)];
      if (input?.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      return ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    }),

  /** Count of unread notifications for the current user (drives the bell badge). */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.userId), eq(notifications.isRead, false)));

    return row?.value ?? 0;
  }),

  /** Mark a single notification as read (only if it belongs to the current user). */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.userId)))
        .returning({ id: notifications.id });

      if (updated.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Notification not found' });
      }

      return { success: true };
    }),

  /** Mark all of the current user's unread notifications as read. */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const updated = await ctx.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, ctx.userId), eq(notifications.isRead, false)))
      .returning({ id: notifications.id });

    return { success: true, count: updated.length };
  }),

  /** Delete a single notification (only if it belongs to the current user). */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(notifications)
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.userId)));

      return { success: true };
    }),
});
