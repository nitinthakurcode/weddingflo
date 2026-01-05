/**
 * Analytics Router - Drizzle ORM
 * December 2025 - Migrated from Supabase RPC to Drizzle
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import * as analyticsQueries from '@/lib/db/queries/analytics';

// Input schemas
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const topClientsSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
});

const periodComparisonSchema = z.object({
  currentStart: z.string().datetime(),
  currentEnd: z.string().datetime(),
  previousStart: z.string().datetime(),
  previousEnd: z.string().datetime(),
});

export const analyticsRouter = router({
  // Get revenue analytics by date range
  getRevenueAnalytics: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const startDate = input.startDate
          ? new Date(input.startDate)
          : subDays(new Date(), 30);
        const endDate = input.endDate
          ? new Date(input.endDate)
          : new Date();

        const data = await analyticsQueries.getRevenueAnalytics(
          ctx.companyId,
          startDate,
          endDate
        );

        return {
          data,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch revenue analytics',
          cause: error,
        });
      }
    }),

  // Get payment status breakdown
  getPaymentStatusBreakdown: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const startDate = input.startDate
          ? new Date(input.startDate)
          : subDays(new Date(), 30);
        const endDate = input.endDate
          ? new Date(input.endDate)
          : new Date();

        const data = await analyticsQueries.getPaymentStatusBreakdown(
          ctx.companyId,
          startDate,
          endDate
        );

        return {
          data,
          totalAmount: data.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
          totalCount: data.reduce((sum, item) => sum + Number(item.count || 0), 0),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch payment status breakdown',
          cause: error,
        });
      }
    }),

  // Get top revenue clients
  getTopRevenueClients: protectedProcedure
    .input(topClientsSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        return await analyticsQueries.getTopRevenueClients(
          ctx.companyId,
          input.limit
        );
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch top revenue clients',
          cause: error,
        });
      }
    }),

  // Get notification statistics (email + SMS)
  getNotificationStats: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const startDate = input.startDate
          ? new Date(input.startDate)
          : subDays(new Date(), 30);
        const endDate = input.endDate
          ? new Date(input.endDate)
          : new Date();

        return await analyticsQueries.getNotificationStats(
          ctx.companyId,
          startDate,
          endDate
        );
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notification statistics',
          cause: error,
        });
      }
    }),

  // Get monthly revenue trend (last 12 months)
  getMonthlyRevenueTrend: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        return await analyticsQueries.getMonthlyRevenueTrend(ctx.companyId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch monthly revenue trend',
          cause: error,
        });
      }
    }),

  // Get dashboard overview (aggregated stats)
  getDashboardOverview: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const thirtyDaysAgo = subDays(new Date(), 30);
        const now = new Date();

        // Parallel queries for better performance
        const [
          revenueData,
          paymentBreakdown,
          notificationStats,
          topClients,
        ] = await Promise.all([
          analyticsQueries.getRevenueAnalytics(ctx.companyId, thirtyDaysAgo, now),
          analyticsQueries.getPaymentStatusBreakdown(ctx.companyId, thirtyDaysAgo, now),
          analyticsQueries.getNotificationStats(ctx.companyId, thirtyDaysAgo, now),
          analyticsQueries.getTopRevenueClients(ctx.companyId, 5),
        ]);

        // Calculate totals
        const totalRevenue = revenueData.reduce(
          (sum, item) => sum + Number(item.revenue || 0),
          0
        );

        const totalTransactions = revenueData.reduce(
          (sum, item) => sum + Number(item.transaction_count || 0),
          0
        );

        return {
          revenue: {
            total: totalRevenue,
            transactionCount: totalTransactions,
            data: revenueData,
          },
          payments: {
            breakdown: paymentBreakdown,
          },
          notifications: notificationStats,
          topClients,
          period: {
            startDate: thirtyDaysAgo.toISOString(),
            endDate: now.toISOString(),
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch dashboard overview',
          cause: error,
        });
      }
    }),

  // Get task analytics for a company
  getTaskAnalytics: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const startDate = input.startDate
          ? new Date(input.startDate)
          : subDays(new Date(), 30);
        const endDate = input.endDate
          ? new Date(input.endDate)
          : new Date();

        return await analyticsQueries.getTaskAnalytics(
          ctx.companyId,
          startDate,
          endDate
        );
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch task analytics',
          cause: error,
        });
      }
    }),

  // Get guest RSVP funnel analytics
  getGuestRsvpFunnel: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        return await analyticsQueries.getGuestRsvpFunnel(ctx.companyId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch guest RSVP funnel',
          cause: error,
        });
      }
    }),

  // Get budget variance analytics
  getBudgetVarianceAnalytics: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        return await analyticsQueries.getBudgetVarianceAnalytics(ctx.companyId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch budget variance analytics',
          cause: error,
        });
      }
    }),

  // Get period comparison analytics
  getPeriodComparison: protectedProcedure
    .input(periodComparisonSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        const data = await analyticsQueries.getPeriodComparison(
          ctx.companyId,
          new Date(input.currentStart),
          new Date(input.currentEnd),
          new Date(input.previousStart),
          new Date(input.previousEnd)
        );

        // Transform array into object keyed by metric name
        const metrics: Record<string, {
          current: number;
          previous: number;
          change: number;
          changePercentage: number | null;
        }> = {};

        data.forEach((row) => {
          metrics[row.metric_name] = {
            current: row.current_value,
            previous: row.previous_value,
            change: row.change_amount,
            changePercentage: row.change_percentage,
          };
        });

        return metrics;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch period comparison',
          cause: error,
        });
      }
    }),

  // Get vendor analytics
  getVendorAnalytics: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        return await analyticsQueries.getVendorAnalytics(ctx.companyId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch vendor analytics',
          cause: error,
        });
      }
    }),

  // Get dashboard stats (simplified overview)
  getDashboardStats: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session claims',
        });
      }

      try {
        return await analyticsQueries.getDashboardStats(ctx.companyId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch dashboard stats',
          cause: error,
        });
      }
    }),
});
