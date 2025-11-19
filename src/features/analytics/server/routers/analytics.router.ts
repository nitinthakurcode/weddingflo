import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '@/server/trpc/trpc';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Input schemas
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const topClientsSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
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

        const { data, error } = await ctx.supabase.rpc('get_revenue_analytics', {
          p_company_id: ctx.companyId,
          p_start_date: startOfDay(startDate).toISOString(),
          p_end_date: endOfDay(endDate).toISOString(),
        });

        if (error) throw error;

        return {
          data: data || [],
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

        const { data, error } = await ctx.supabase.rpc('get_payment_status_breakdown', {
          p_company_id: ctx.companyId,
          p_start_date: startOfDay(startDate).toISOString(),
          p_end_date: endOfDay(endDate).toISOString(),
        });

        if (error) throw error;

        return {
          data: data || [],
          totalAmount: data?.reduce((sum, item) => sum + Number(item.total_amount || 0), 0) || 0,
          totalCount: data?.reduce((sum, item) => sum + Number(item.count || 0), 0) || 0,
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
        const { data, error } = await ctx.supabase.rpc('get_top_revenue_clients', {
          p_company_id: ctx.companyId,
          p_limit: input.limit,
        });

        if (error) throw error;

        return data || [];
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

        const { data, error } = await ctx.supabase.rpc('get_notification_stats', {
          p_company_id: ctx.companyId,
          p_start_date: startOfDay(startDate).toISOString(),
          p_end_date: endOfDay(endDate).toISOString(),
        });

        if (error) throw error;

        return data || [];
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
        const { data, error } = await ctx.supabase.rpc('get_monthly_revenue_trend', {
          p_company_id: ctx.companyId,
        });

        if (error) throw error;

        return data || [];
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
          ctx.supabase.rpc('get_revenue_analytics', {
            p_company_id: ctx.companyId,
            p_start_date: startOfDay(thirtyDaysAgo).toISOString(),
            p_end_date: endOfDay(now).toISOString(),
          }),
          ctx.supabase.rpc('get_payment_status_breakdown', {
            p_company_id: ctx.companyId,
            p_start_date: startOfDay(thirtyDaysAgo).toISOString(),
            p_end_date: endOfDay(now).toISOString(),
          }),
          ctx.supabase.rpc('get_notification_stats', {
            p_company_id: ctx.companyId,
            p_start_date: startOfDay(thirtyDaysAgo).toISOString(),
            p_end_date: endOfDay(now).toISOString(),
          }),
          ctx.supabase.rpc('get_top_revenue_clients', {
            p_company_id: ctx.companyId,
            p_limit: 5,
          }),
        ]);

        // Calculate totals
        const totalRevenue = revenueData.data?.reduce(
          (sum, item) => sum + Number(item.revenue || 0),
          0
        ) || 0;

        const totalTransactions = revenueData.data?.reduce(
          (sum, item) => sum + Number(item.transaction_count || 0),
          0
        ) || 0;

        return {
          revenue: {
            total: totalRevenue,
            transactionCount: totalTransactions,
            data: revenueData.data || [],
          },
          payments: {
            breakdown: paymentBreakdown.data || [],
          },
          notifications: notificationStats.data || [],
          topClients: topClients.data || [],
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
});
