import { router, protectedProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

const reportTypeEnum = z.enum([
  'client_summary',
  'guest_analytics',
  'budget',
  'timeline',
  'vendor',
  'revenue'
]);

const fileFormatEnum = z.enum(['xlsx', 'pdf', 'csv', 'json']);
const frequencyEnum = z.enum(['daily', 'weekly', 'monthly']);

/**
 * Analytics Export Router
 * Session 54: Report generation and scheduling
 *
 * Features:
 * - Company analytics summary
 * - Export generation (CSV, Excel, PDF)
 * - Scheduled reports
 * - Report archive management
 */
export const analyticsExportRouter = router({
  /**
   * Get company analytics
   */
  getCompanyAnalytics: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Manual query until migration is applied and types regenerated
      try {
        // Get all clients for the company
        const { data: clients, error: clientsError } = await ctx.supabase
          .from('clients')
          .select('id, status, wedding_date, created_at')
          .eq('company_id', ctx.companyId);

        if (clientsError) throw clientsError;

        // Get guests count
        const { count: guestsCount, error: guestsError } = await ctx.supabase
          .from('guests')
          .select('*', { count: 'exact', head: true })
          .in('client_id', clients?.map(c => c.id) || []);

        if (guestsError) throw guestsError;

        // Get budget totals
        const { data: budgets, error: budgetsError } = await ctx.supabase
          .from('budget')
          .select('estimated_cost, paid_amount')
          .in('client_id', clients?.map(c => c.id) || []);

        if (budgetsError) throw budgetsError;

        // Calculate metrics
        const totalClients = clients?.length || 0;
        const activeClients = clients?.filter(c =>
          ['planning', 'confirmed', 'in_progress'].includes(c.status)
        ).length || 0;

        const totalBudget = budgets?.reduce((sum, b) => sum + (b.estimated_cost || 0), 0) || 0;
        const totalPaid = budgets?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;

        const currentMonth = new Date();
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const eventsThisMonth = clients?.filter(c => {
          if (!c.wedding_date) return false;
          const weddingDate = new Date(c.wedding_date);
          return weddingDate >= firstDay && weddingDate <= lastDay;
        }).length || 0;

        return {
          total_clients: totalClients,
          active_clients: activeClients,
          total_guests: guestsCount || 0,
          total_budget: totalBudget,
          total_paid: totalPaid,
          events_this_month: eventsThisMonth,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to get analytics',
        });
      }
    }),

  /**
   * Generate export (async job)
   */
  generateExport: adminProcedure
    .input(z.object({
      reportType: reportTypeEnum,
      fileFormat: fileFormatEnum,
      filters: z.any().optional(),
      dateRangeStart: z.string().optional(),
      dateRangeEnd: z.string().optional(),
      includeCharts: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // TODO: Implement actual export generation
      // This would call export utilities (xlsx, pdf, csv)
      // and upload to Cloudflare R2

      const reportName = `${input.reportType}_${new Date().toISOString().split('T')[0]}`;
      const fileUrl = `https://r2.weddingflow.com/reports/${reportName}.${input.fileFormat}`;

      // Type cast until migration is applied
      const { data, error } = await (ctx.supabase as any)
        .from('generated_reports')
        .insert({
          company_id: ctx.companyId,
          report_type: input.reportType,
          report_name: reportName,
          file_format: input.fileFormat,
          file_url: fileUrl,
          filters: input.filters || {},
          date_range_start: input.dateRangeStart || null,
          date_range_end: input.dateRangeEnd || null,
          generated_by: ctx.userId!,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
    }),

  /**
   * List generated reports
   */
  listGeneratedReports: protectedProcedure
    .input(z.object({
      reportType: reportTypeEnum.optional(),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Type cast until migration is applied
      let query = (ctx.supabase as any)
        .from('generated_reports')
        .select('*')
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (input.reportType) {
        query = query.eq('report_type', input.reportType);
      }

      const { data, error } = await query;

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data || [];
    }),

  /**
   * Track report download
   */
  trackDownload: protectedProcedure
    .input(z.object({ reportId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Type cast until migration is applied
      const { data: report } = await (ctx.supabase as any)
        .from('generated_reports')
        .select('download_count')
        .eq('id', input.reportId)
        .eq('company_id', ctx.companyId)
        .single();

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found',
        });
      }

      const { error } = await (ctx.supabase as any)
        .from('generated_reports')
        .update({
          download_count: report.download_count + 1,
          last_downloaded_at: new Date().toISOString(),
        })
        .eq('id', input.reportId)
        .eq('company_id', ctx.companyId);

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return { success: true };
    }),

  /**
   * Delete generated report
   */
  deleteReport: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // TODO: Also delete file from R2
      // Type cast until migration is applied
      const { error } = await (ctx.supabase as any)
        .from('generated_reports')
        .delete()
        .eq('id', input.id)
        .eq('company_id', ctx.companyId);

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return { success: true };
    }),

  // ===== SCHEDULED REPORTS =====

  /**
   * Create scheduled report
   */
  createSchedule: adminProcedure
    .input(z.object({
      name: z.string(),
      reportType: reportTypeEnum,
      fileFormat: fileFormatEnum,
      frequency: frequencyEnum,
      dayOfWeek: z.number().int().min(0).max(6).optional(),
      dayOfMonth: z.number().int().min(1).max(31).optional(),
      timeOfDay: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
      emailRecipients: z.array(z.string().email()),
      config: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Type cast until migration is applied
      const { data, error } = await (ctx.supabase as any)
        .from('scheduled_reports')
        .insert({
          company_id: ctx.companyId,
          name: input.name,
          report_type: input.reportType,
          file_format: input.fileFormat,
          frequency: input.frequency,
          day_of_week: input.dayOfWeek || null,
          day_of_month: input.dayOfMonth || null,
          time_of_day: input.timeOfDay,
          email_recipients: input.emailRecipients,
          config: input.config || {},
          created_by: ctx.userId!,
        })
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
    }),

  /**
   * List scheduled reports
   */
  listSchedules: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Type cast until migration is applied
      const { data, error } = await (ctx.supabase as any)
        .from('scheduled_reports')
        .select('*')
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: false });

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data || [];
    }),

  /**
   * Toggle schedule active status
   */
  toggleSchedule: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Type cast until migration is applied
      const { data, error } = await (ctx.supabase as any)
        .from('scheduled_reports')
        .update({ is_active: input.isActive })
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)
        .select()
        .single();

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return data;
    }),

  /**
   * Delete scheduled report
   */
  deleteSchedule: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Type cast until migration is applied
      const { error } = await (ctx.supabase as any)
        .from('scheduled_reports')
        .delete()
        .eq('id', input.id)
        .eq('company_id', ctx.companyId);

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });

      return { success: true };
    }),
});
