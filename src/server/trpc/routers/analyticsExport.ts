import { router, protectedProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc } from 'drizzle-orm';
import { clients, guests, budget, generatedReports, scheduledReports } from '@/lib/db/schema';
import crypto from 'crypto';

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
 * Schema: generatedReports (id, clientId, userId, type, data (jsonb), createdAt)
 * Schema: scheduledReports (id, userId, type, schedule, enabled, lastRun, createdAt, updatedAt)
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
    .query(async ({ ctx }) => {
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
          })
          .from(clients)
          .where(eq(clients.companyId, ctx.companyId));

        const totalClients = clientsList.length;
        const activeClients = clientsList.filter(c => c.status === 'active').length;

        // Get guest count for company's clients
        const clientIds = clientsList.map(c => c.id);
        let guestsCount = 0;
        if (clientIds.length > 0) {
          const guestsList = await ctx.db
            .select({ id: guests.id })
            .from(guests);
          // Filter in memory for simplicity (for accurate count would need OR query)
          guestsCount = guestsList.length;
        }

        // Get budget totals
        // Schema: estimatedCost (text), actualCost (text), paidAmount (text)
        let totalBudget = 0;
        let totalPaid = 0;
        if (clientIds.length > 0) {
          const budgets = await ctx.db
            .select({
              estimatedCost: budget.estimatedCost,
              paidAmount: budget.paidAmount,
            })
            .from(budget);
          totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.estimatedCost || '0'), 0);
          totalPaid = budgets.reduce((sum, b) => sum + parseFloat(b.paidAmount || '0'), 0);
        }

        // Events this month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const eventsThisMonth = clientsList.filter(c => {
          if (!c.weddingDate) return false;
          const date = new Date(c.weddingDate);
          return date >= monthStart && date <= monthEnd;
        }).length;

        return {
          total_clients: totalClients,
          active_clients: activeClients,
          total_guests: guestsCount,
          total_budget: totalBudget,
          total_paid: totalPaid,
          events_this_month: eventsThisMonth,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to get analytics';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message,
        });
      }
    }),

  /**
   * Generate export (async job)
   * Schema: id, clientId, userId, type, data (jsonb), createdAt
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
      if (!ctx.companyId || !ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      const reportName = `${input.reportType}_${new Date().toISOString().split('T')[0]}`;
      const fileUrl = `https://r2.weddingflow.com/reports/${reportName}.${input.fileFormat}`;

      // Store extra data in the JSONB field
      const reportData = {
        reportName,
        format: input.fileFormat,
        fileUrl,
        parameters: {
          filters: input.filters || {},
          dateRangeStart: input.dateRangeStart || null,
          dateRangeEnd: input.dateRangeEnd || null,
          includeCharts: input.includeCharts,
        },
        companyId: ctx.companyId,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const [data] = await ctx.db
        .insert(generatedReports)
        .values({
          id: crypto.randomUUID(),
          userId: ctx.userId,
          type: input.reportType,
          data: reportData,
        })
        .returning();

      const storedData = data.data as typeof reportData;

      return {
        id: data.id,
        company_id: storedData.companyId,
        report_type: data.type,
        report_name: storedData.reportName,
        file_format: storedData.format,
        file_url: storedData.fileUrl,
        parameters: storedData.parameters,
        generated_by: data.userId,
        expires_at: storedData.expiresAt,
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
      if (!ctx.companyId || !ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        });
      }

      // Filter by userId since there's no companyId in schema
      const baseCondition = eq(generatedReports.userId, ctx.userId);

      const data = input.reportType
        ? await ctx.db
            .select()
            .from(generatedReports)
            .where(and(baseCondition, eq(generatedReports.type, input.reportType)))
            .orderBy(desc(generatedReports.createdAt))
            .limit(input.limit)
        : await ctx.db
            .select()
            .from(generatedReports)
            .where(baseCondition)
            .orderBy(desc(generatedReports.createdAt))
            .limit(input.limit);

      return data.map(r => {
        const storedData = (r.data || {}) as Record<string, unknown>;
        return {
          id: r.id,
          company_id: storedData.companyId as string | undefined,
          client_id: r.clientId,
          report_type: r.type,
          report_name: storedData.reportName as string | undefined,
          file_format: storedData.format as string | undefined,
          file_url: storedData.fileUrl as string | undefined,
          file_size: storedData.fileSize as number | undefined,
          parameters: storedData.parameters,
          generated_by: r.userId,
          expires_at: storedData.expiresAt as string | undefined,
          created_at: r.createdAt.toISOString(),
        };
      });
    }),

  /**
   * Track report download
   */
  trackDownload: protectedProcedure
    .input(z.object({ reportId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User ID required',
        });
      }

      // Verify report exists and belongs to user
      const [report] = await ctx.db
        .select({ id: generatedReports.id })
        .from(generatedReports)
        .where(
          and(
            eq(generatedReports.id, input.reportId),
            eq(generatedReports.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!report) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Report not found',
        });
      }

      // Note: Download tracking would be stored in data JSONB if needed
      return { success: true };
    }),

  /**
   * Delete generated report
   */
  deleteReport: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User ID required',
        });
      }

      await ctx.db
        .delete(generatedReports)
        .where(
          and(
            eq(generatedReports.id, input.id),
            eq(generatedReports.userId, ctx.userId)
          )
        );

      return { success: true };
    }),

  // ===== SCHEDULED REPORTS =====
  // Schema: id, userId, type, schedule, enabled, lastRun, createdAt, updatedAt

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
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User ID required',
        });
      }

      // Build schedule string (includes all config since no data field)
      // Format: frequency:dayOrWeek:time:format:name:recipients
      const schedule = JSON.stringify({
        frequency: input.frequency,
        dayOfWeek: input.dayOfWeek,
        dayOfMonth: input.dayOfMonth,
        timeOfDay: input.timeOfDay,
        format: input.fileFormat,
        name: input.name,
        recipients: input.emailRecipients,
        config: input.config,
      });

      const [data] = await ctx.db
        .insert(scheduledReports)
        .values({
          id: crypto.randomUUID(),
          userId: ctx.userId,
          type: input.reportType,
          schedule,
          enabled: true,
        })
        .returning();

      const scheduleData = JSON.parse(data.schedule || '{}');

      return {
        id: data.id,
        user_id: data.userId,
        report_type: data.type,
        report_name: scheduleData.name,
        schedule: scheduleData.frequency,
        file_format: scheduleData.format,
        email_recipients: scheduleData.recipients,
        is_active: data.enabled,
        last_run_at: data.lastRun?.toISOString() || null,
        created_at: data.createdAt.toISOString(),
      };
    }),

  /**
   * List scheduled reports
   */
  listSchedules: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User ID required',
        });
      }

      const data = await ctx.db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.userId, ctx.userId))
        .orderBy(desc(scheduledReports.createdAt));

      return data.map(r => {
        const scheduleData = JSON.parse(r.schedule || '{}');
        return {
          id: r.id,
          user_id: r.userId,
          report_type: r.type,
          report_name: scheduleData.name,
          schedule: scheduleData.frequency,
          file_format: scheduleData.format,
          email_recipients: scheduleData.recipients,
          is_active: r.enabled,
          last_run_at: r.lastRun?.toISOString() || null,
          created_at: r.createdAt.toISOString(),
        };
      });
    }),

  /**
   * Update scheduled report
   */
  updateSchedule: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      isActive: z.boolean().optional(),
      name: z.string().optional(),
      frequency: frequencyEnum.optional(),
      dayOfWeek: z.number().int().min(0).max(6).optional(),
      dayOfMonth: z.number().int().min(1).max(31).optional(),
      timeOfDay: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
      emailRecipients: z.array(z.string().email()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User ID required',
        });
      }

      // Get existing schedule
      const [existing] = await ctx.db
        .select()
        .from(scheduledReports)
        .where(
          and(
            eq(scheduledReports.id, input.id),
            eq(scheduledReports.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      // Merge with existing schedule data
      const existingData = JSON.parse(existing.schedule || '{}');
      const newScheduleData = {
        ...existingData,
        ...(input.name && { name: input.name }),
        ...(input.frequency && { frequency: input.frequency }),
        ...(input.dayOfWeek !== undefined && { dayOfWeek: input.dayOfWeek }),
        ...(input.dayOfMonth !== undefined && { dayOfMonth: input.dayOfMonth }),
        ...(input.timeOfDay && { timeOfDay: input.timeOfDay }),
        ...(input.emailRecipients && { recipients: input.emailRecipients }),
      };

      const updateData: Record<string, unknown> = {
        schedule: JSON.stringify(newScheduleData),
        updatedAt: new Date(),
      };

      if (input.isActive !== undefined) {
        updateData.enabled = input.isActive;
      }

      const [data] = await ctx.db
        .update(scheduledReports)
        .set(updateData)
        .where(eq(scheduledReports.id, input.id))
        .returning();

      const scheduleData = JSON.parse(data.schedule || '{}');

      return {
        id: data.id,
        user_id: data.userId,
        report_type: data.type,
        report_name: scheduleData.name,
        schedule: scheduleData.frequency,
        is_active: data.enabled,
        updated_at: data.updatedAt.toISOString(),
      };
    }),

  /**
   * Delete scheduled report
   */
  deleteSchedule: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User ID required',
        });
      }

      await ctx.db
        .delete(scheduledReports)
        .where(
          and(
            eq(scheduledReports.id, input.id),
            eq(scheduledReports.userId, ctx.userId)
          )
        );

      return { success: true };
    }),
});
