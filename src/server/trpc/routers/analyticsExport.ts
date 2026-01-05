import { router, protectedProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { clients, guests, budget, generatedReports, scheduledReports } from '@/lib/db/schema';

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
 * Analytics Export Router - Drizzle ORM Version
 * December 2025 - Migrated from Supabase compat layer
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

      try {
        // Get all clients for the company
        const clientsList = await ctx.db
          .select({
            id: clients.id,
            status: clients.status,
            weddingDate: clients.weddingDate,
            createdAt: clients.createdAt,
          })
          .from(clients)
          .where(eq(clients.companyId, ctx.companyId));

        const clientIds = clientsList.map(c => c.id);

        // Get guests count
        let guestsCount = 0;
        if (clientIds.length > 0) {
          const guestsResult = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(guests)
            .where(inArray(guests.clientId, clientIds));
          guestsCount = guestsResult[0]?.count || 0;
        }

        // Get budget totals
        let budgetsList: { estimatedCost: string | null; paidAmount: string | null }[] = [];
        if (clientIds.length > 0) {
          budgetsList = await ctx.db
            .select({
              estimatedCost: budget.estimatedCost,
              paidAmount: budget.paidAmount,
            })
            .from(budget)
            .where(inArray(budget.clientId, clientIds));
        }

        // Calculate metrics
        const totalClients = clientsList.length;
        const activeClients = clientsList.filter(c =>
          ['planning', 'confirmed', 'in_progress'].includes(c.status || '')
        ).length;

        const totalBudget = budgetsList.reduce((sum, b) => sum + Number(b.estimatedCost || 0), 0);
        const totalPaid = budgetsList.reduce((sum, b) => sum + Number(b.paidAmount || 0), 0);

        const currentMonth = new Date();
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const eventsThisMonth = clientsList.filter(c => {
          if (!c.weddingDate) return false;
          const weddingDate = new Date(c.weddingDate);
          return weddingDate >= firstDay && weddingDate <= lastDay;
        }).length;

        return {
          total_clients: totalClients,
          active_clients: activeClients,
          total_guests: guestsCount,
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

      const [data] = await ctx.db
        .insert(generatedReports)
        .values({
          companyId: ctx.companyId,
          reportType: input.reportType,
          reportName: reportName,
          format: input.fileFormat,
          fileUrl: fileUrl,
          parameters: {
            filters: input.filters || {},
            dateRangeStart: input.dateRangeStart || null,
            dateRangeEnd: input.dateRangeEnd || null,
            includeCharts: input.includeCharts,
          },
          generatedBy: ctx.userId!,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        })
        .returning();

      // Return with snake_case for backward compatibility
      return {
        id: data.id,
        company_id: data.companyId,
        report_type: data.reportType,
        report_name: data.reportName,
        file_format: data.format,
        file_url: data.fileUrl,
        parameters: data.parameters,
        generated_by: data.generatedBy,
        expires_at: data.expiresAt?.toISOString(),
        created_at: data.createdAt.toISOString(),
      };
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

      let query = ctx.db
        .select()
        .from(generatedReports)
        .where(eq(generatedReports.companyId, ctx.companyId))
        .orderBy(desc(generatedReports.createdAt))
        .limit(input.limit);

      if (input.reportType) {
        query = ctx.db
          .select()
          .from(generatedReports)
          .where(
            and(
              eq(generatedReports.companyId, ctx.companyId),
              eq(generatedReports.reportType, input.reportType)
            )
          )
          .orderBy(desc(generatedReports.createdAt))
          .limit(input.limit);
      }

      const data = await query;

      // Return with snake_case for backward compatibility
      return data.map(r => ({
        id: r.id,
        company_id: r.companyId,
        client_id: r.clientId,
        report_type: r.reportType,
        report_name: r.reportName,
        file_format: r.format,
        file_url: r.fileUrl,
        file_size: r.fileSize,
        parameters: r.parameters,
        generated_by: r.generatedBy,
        expires_at: r.expiresAt?.toISOString(),
        created_at: r.createdAt.toISOString(),
      }));
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

      // Verify report exists and belongs to company
      const [report] = await ctx.db
        .select({ id: generatedReports.id })
        .from(generatedReports)
        .where(
          and(
            eq(generatedReports.id, input.reportId),
            eq(generatedReports.companyId, ctx.companyId)
          )
        )
        .limit(1);

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found',
        });
      }

      // Note: The schema doesn't have download_count or last_downloaded_at
      // This is tracked in the parameters JSON field instead
      // For now, we just return success
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
      await ctx.db
        .delete(generatedReports)
        .where(
          and(
            eq(generatedReports.id, input.id),
            eq(generatedReports.companyId, ctx.companyId)
          )
        );

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

      // Build schedule string (cron-like format)
      let schedule: string = input.frequency;
      if (input.frequency === 'weekly' && input.dayOfWeek !== undefined) {
        schedule = `weekly:${input.dayOfWeek}:${input.timeOfDay}`;
      } else if (input.frequency === 'monthly' && input.dayOfMonth !== undefined) {
        schedule = `monthly:${input.dayOfMonth}:${input.timeOfDay}`;
      } else {
        schedule = `${input.frequency}:${input.timeOfDay}`;
      }

      const [data] = await ctx.db
        .insert(scheduledReports)
        .values({
          companyId: ctx.companyId,
          reportType: input.reportType,
          reportName: input.name,
          schedule: schedule,
          format: input.fileFormat,
          recipients: input.emailRecipients,
          parameters: {
            config: input.config || {},
            dayOfWeek: input.dayOfWeek,
            dayOfMonth: input.dayOfMonth,
            timeOfDay: input.timeOfDay,
            createdBy: ctx.userId,
          },
        })
        .returning();

      // Return with snake_case for backward compatibility
      return {
        id: data.id,
        company_id: data.companyId,
        name: data.reportName,
        report_type: data.reportType,
        file_format: data.format,
        schedule: data.schedule,
        recipients: data.recipients,
        is_active: data.isActive,
        created_at: data.createdAt.toISOString(),
      };
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

      const data = await ctx.db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.companyId, ctx.companyId))
        .orderBy(desc(scheduledReports.createdAt));

      // Return with snake_case for backward compatibility
      return data.map(r => ({
        id: r.id,
        company_id: r.companyId,
        name: r.reportName,
        report_type: r.reportType,
        file_format: r.format,
        schedule: r.schedule,
        recipients: r.recipients,
        parameters: r.parameters,
        is_active: r.isActive,
        last_run_at: r.lastRunAt?.toISOString(),
        next_run_at: r.nextRunAt?.toISOString(),
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt.toISOString(),
      }));
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

      const [data] = await ctx.db
        .update(scheduledReports)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(
          and(
            eq(scheduledReports.id, input.id),
            eq(scheduledReports.companyId, ctx.companyId)
          )
        )
        .returning();

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      return {
        id: data.id,
        is_active: data.isActive,
      };
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

      await ctx.db
        .delete(scheduledReports)
        .where(
          and(
            eq(scheduledReports.id, input.id),
            eq(scheduledReports.companyId, ctx.companyId)
          )
        );

      return { success: true };
    }),
});
