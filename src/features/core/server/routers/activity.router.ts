import { router, protectedProcedure } from '@/server/trpc/trpc';

/**
 * Activity Router - Stub
 *
 * Placeholder for activity/notification features.
 * TODO: Implement full activity feed functionality
 */
export const activityRouter = router({
  /**
   * Get unread notification/activity count
   */
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: Implement actual unread count from notifications table
      return {
        count: 0,
      };
    }),

  /**
   * Get recent activity feed
   */
  getRecent: protectedProcedure
    .query(async ({ ctx }) => {
      // TODO: Implement actual activity feed
      return [];
    }),

  /**
   * Mark activity as read
   */
  markAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      // TODO: Implement mark as read
      return { success: true };
    }),
});
