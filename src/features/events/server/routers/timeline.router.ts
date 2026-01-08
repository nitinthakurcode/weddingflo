import { router, adminProcedure, protectedProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { timeline, clients, users, clientUsers } from '@/lib/db/schema'

/**
 * Timeline tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding timeline items with multi-tenant security.
 * Migrated from Supabase to Drizzle - December 2025
 */
export const timelineRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch timeline items (exclude soft-deleted)
      const timelineItems = await ctx.db
        .select()
        .from(timeline)
        .where(
          and(
            eq(timeline.clientId, input.clientId),
            isNull(timeline.deletedAt)
          )
        )
        .orderBy(asc(timeline.sortOrder), asc(timeline.startTime))

      return timelineItems
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [timelineItem] = await ctx.db
        .select()
        .from(timeline)
        .where(eq(timeline.id, input.id))
        .limit(1)

      if (!timelineItem) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return timelineItem
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      startTime: z.string(),
      endTime: z.string().optional(),
      durationMinutes: z.number().int().optional(),
      location: z.string().optional(),
      responsiblePerson: z.string().optional(),
      sortOrder: z.number().int().default(0),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Create timeline item
      const [timelineItem] = await ctx.db
        .insert(timeline)
        .values({
          clientId: input.clientId,
          title: input.title,
          description: input.description || null,
          startTime: new Date(input.startTime),
          endTime: input.endTime ? new Date(input.endTime) : null,
          durationMinutes: input.durationMinutes || null,
          location: input.location || null,
          responsiblePerson: input.responsiblePerson || null,
          sortOrder: input.sortOrder,
          notes: input.notes || null,
        })
        .returning()

      if (!timelineItem) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create timeline item'
        })
      }

      return timelineItem
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        durationMinutes: z.number().int().optional(),
        location: z.string().optional(),
        responsiblePerson: z.string().optional(),
        sortOrder: z.number().int().optional(),
        completed: z.boolean().optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Build update object
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (input.data.title !== undefined) updateData.title = input.data.title
      if (input.data.description !== undefined) updateData.description = input.data.description
      if (input.data.startTime !== undefined) updateData.startTime = new Date(input.data.startTime)
      if (input.data.endTime !== undefined) updateData.endTime = input.data.endTime ? new Date(input.data.endTime) : null
      if (input.data.durationMinutes !== undefined) updateData.durationMinutes = input.data.durationMinutes
      if (input.data.location !== undefined) updateData.location = input.data.location
      if (input.data.responsiblePerson !== undefined) updateData.responsiblePerson = input.data.responsiblePerson
      if (input.data.sortOrder !== undefined) updateData.sortOrder = input.data.sortOrder
      if (input.data.completed !== undefined) updateData.completed = input.data.completed
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update timeline item
      const [timelineItem] = await ctx.db
        .update(timeline)
        .set(updateData)
        .where(eq(timeline.id, input.id))
        .returning()

      if (!timelineItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Timeline item not found'
        })
      }

      return timelineItem
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      await ctx.db
        .delete(timeline)
        .where(eq(timeline.id, input.id))

      return { success: true }
    }),

  reorder: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      itemIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Update sort_order for each item
      const updates = input.itemIds.map((id, index) =>
        ctx.db
          .update(timeline)
          .set({ sortOrder: index })
          .where(eq(timeline.id, id))
      )

      // Execute all updates
      await Promise.all(updates)

      return { success: true }
    }),

  markComplete: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      completed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [timelineItem] = await ctx.db
        .update(timeline)
        .set({
          completed: input.completed,
          updatedAt: new Date(),
        })
        .where(eq(timeline.id, input.id))
        .returning()

      if (!timelineItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Timeline item not found'
        })
      }

      return timelineItem
    }),

  detectConflicts: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get all timeline items with times (exclude soft-deleted)
      const items = await ctx.db
        .select({
          id: timeline.id,
          title: timeline.title,
          startTime: timeline.startTime,
          endTime: timeline.endTime,
          durationMinutes: timeline.durationMinutes,
        })
        .from(timeline)
        .where(
          and(
            eq(timeline.clientId, input.clientId),
            isNull(timeline.deletedAt)
          )
        )
        .orderBy(asc(timeline.startTime))

      if (!items || items.length === 0) {
        return []
      }

      // Helper function to get end time as Date
      const getEndTime = (item: any): Date => {
        if (item.endTime) {
          return new Date(item.endTime)
        } else if (item.durationMinutes && item.startTime) {
          const end = new Date(item.startTime)
          end.setMinutes(end.getMinutes() + item.durationMinutes)
          return end
        }
        // default 1 hour
        const end = new Date(item.startTime)
        end.setHours(end.getHours() + 1)
        return end
      }

      // Detect conflicts
      const conflicts = []
      for (let i = 0; i < items.length - 1; i++) {
        const currentEnd = getEndTime(items[i])
        const nextStart = new Date(items[i + 1].startTime)

        if (currentEnd > nextStart) {
          const overlapMs = currentEnd.getTime() - nextStart.getTime()
          conflicts.push({
            item1: items[i],
            item2: items[i + 1],
            overlapMinutes: Math.round(overlapMs / (1000 * 60)),
          })
        }
      }

      return conflicts
    }),

  getStats: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get timeline items (exclude soft-deleted)
      const items = await ctx.db
        .select({
          completed: timeline.completed,
          durationMinutes: timeline.durationMinutes,
        })
        .from(timeline)
        .where(
          and(
            eq(timeline.clientId, input.clientId),
            isNull(timeline.deletedAt)
          )
        )

      const totalDuration = items.reduce((sum, item) => sum + (item.durationMinutes || 0), 0)

      const stats = {
        total: items.length,
        completed: items.filter(item => item.completed).length,
        pending: items.filter(item => !item.completed).length,
        totalDuration,
        totalDurationHours: Math.floor(totalDuration / 60),
        totalDurationMinutes: totalDuration % 60,
      }

      return stats
    }),

  /**
   * Portal Timeline - For client users (couples) to view their wedding timeline
   * Uses protectedProcedure and looks up clientId from client_users table
   */
  getPortalTimeline: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
      }

      // Get user record
      const [user] = await ctx.db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1)

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      // Get client_user link to find the client
      const [clientUser] = await ctx.db
        .select({ clientId: clientUsers.clientId })
        .from(clientUsers)
        .where(eq(clientUsers.userId, user.id))
        .limit(1)

      if (!clientUser) {
        return []
      }

      // Fetch timeline items for this client (exclude soft-deleted)
      const timelineItems = await ctx.db
        .select()
        .from(timeline)
        .where(
          and(
            eq(timeline.clientId, clientUser.clientId),
            isNull(timeline.deletedAt)
          )
        )
        .orderBy(asc(timeline.sortOrder), asc(timeline.startTime))

      return timelineItems
    }),
})
