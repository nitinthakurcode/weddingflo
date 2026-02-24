import { router, adminProcedure, protectedProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { timeline, clients, user, clientUsers, events } from '@/lib/db/schema'
import { broadcastSync } from '@/lib/realtime/broadcast-sync'

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

  /**
   * SECURITY: Verifies timeline item belongs to a client owned by the user's company
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Join with clients to verify company ownership
      const [result] = await ctx.db
        .select({ timelineItem: timeline })
        .from(timeline)
        .innerJoin(clients, eq(timeline.clientId, clients.id))
        .where(
          and(
            eq(timeline.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return result.timelineItem
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      eventId: z.string().uuid().optional(), // Optional link to specific event
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

      // Generate UUID for new timeline item
      const { v4: uuidv4 } = await import('uuid')

      // Create timeline item
      const [timelineItem] = await ctx.db
        .insert(timeline)
        .values({
          id: uuidv4(),
          clientId: input.clientId,
          eventId: input.eventId || null, // Link to specific event if provided
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

      await broadcastSync({
        type: 'insert',
        module: 'timeline',
        entityId: timelineItem.id,
        companyId: ctx.companyId!,
        clientId: input.clientId,
        userId: ctx.userId!,
        queryPaths: ['timeline.getAll'],
      })

      return timelineItem
    }),

  /**
   * SECURITY: Verifies timeline item belongs to a client owned by the user's company
   */
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

      // Verify timeline item belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: timeline.id })
        .from(timeline)
        .innerJoin(clients, eq(timeline.clientId, clients.id))
        .where(
          and(
            eq(timeline.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Timeline item not found' })
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

      await broadcastSync({
        type: 'update',
        module: 'timeline',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: timelineItem.clientId,
        userId: ctx.userId!,
        queryPaths: ['timeline.getAll'],
      })

      return timelineItem
    }),

  /**
   * SECURITY: Verifies timeline item belongs to a client owned by the user's company
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify timeline item belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: timeline.id, clientId: timeline.clientId })
        .from(timeline)
        .innerJoin(clients, eq(timeline.clientId, clients.id))
        .where(
          and(
            eq(timeline.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Timeline item not found' })
      }

      await ctx.db
        .delete(timeline)
        .where(eq(timeline.id, input.id))

      await broadcastSync({
        type: 'delete',
        module: 'timeline',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: existing.clientId,
        userId: ctx.userId!,
        queryPaths: ['timeline.getAll'],
      })

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

  /**
   * SECURITY: Verifies timeline item belongs to a client owned by the user's company
   */
  markComplete: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      completed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify timeline item belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: timeline.id })
        .from(timeline)
        .innerJoin(clients, eq(timeline.clientId, clients.id))
        .where(
          and(
            eq(timeline.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Timeline item not found' })
      }

      const [timelineItem] = await ctx.db
        .update(timeline)
        .set({
          completed: input.completed,
          updatedAt: new Date(),
        })
        .where(eq(timeline.id, input.id))
        .returning()

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

      // Get all timeline items with times and location (exclude soft-deleted)
      const items = await ctx.db
        .select({
          id: timeline.id,
          title: timeline.title,
          startTime: timeline.startTime,
          endTime: timeline.endTime,
          durationMinutes: timeline.durationMinutes,
          location: timeline.location, // Include location for smart conflict detection
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

      // Detect conflicts - only flag overlaps at the SAME location or when location is shared/unspecified
      // Activities at DIFFERENT locations can run in parallel (e.g., Bride Getting Ready vs Groom Getting Ready)
      const conflicts = []
      for (let i = 0; i < items.length - 1; i++) {
        const currentEnd = getEndTime(items[i])
        const nextStart = new Date(items[i + 1].startTime)

        if (currentEnd > nextStart) {
          const item1Location = items[i].location?.trim().toLowerCase() || ''
          const item2Location = items[i + 1].location?.trim().toLowerCase() || ''

          // Skip conflict if both items have different, non-empty locations
          // This allows parallel activities at different venues (e.g., Bridal Suite vs Groom Suite)
          if (item1Location && item2Location && item1Location !== item2Location) {
            continue // Not a conflict - different locations
          }

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
      const [portalUser] = await ctx.db
        .select({ id: user.id, role: user.role })
        .from(user)
        .where(eq(user.id, ctx.userId))
        .limit(1)

      if (!portalUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      // Get client_user link to find the client
      const [clientUser] = await ctx.db
        .select({ clientId: clientUsers.clientId })
        .from(clientUsers)
        .where(eq(clientUsers.userId, portalUser.id))
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

  /**
   * Get timeline items grouped by event and date
   * Returns timeline items organized by date -> events -> items
   */
  /**
   * Bulk import timeline items from Excel
   * Supports create, update, and delete operations
   */
  bulkImport: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      items: z.array(z.object({
        id: z.string().uuid().optional(),
        eventId: z.string().uuid().optional().nullable(),
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        phase: z.enum(['setup', 'showtime', 'wrapup']).optional().nullable(),
        date: z.string().optional().nullable(), // YYYY-MM-DD
        startTime: z.string().optional().nullable(), // HH:MM
        endTime: z.string().optional().nullable(), // HH:MM
        durationMinutes: z.number().int().optional().nullable(),
        location: z.string().optional().nullable(),
        participants: z.array(z.string()).optional().nullable(),
        responsiblePerson: z.string().optional().nullable(),
        completed: z.boolean().optional().nullable(),
        sortOrder: z.number().int().optional().nullable(),
        notes: z.string().optional().nullable(),
        _action: z.enum(['create', 'update', 'delete']).optional(),
      })),
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

      const results = {
        created: 0,
        updated: 0,
        deleted: 0,
        errors: [] as { item: string; error: string }[],
      }

      // Helper to combine date and time into timestamp
      const combineDateTime = (date?: string | null, time?: string | null): Date | null => {
        if (!date) return null
        const baseDate = new Date(date)
        if (time) {
          const [hours, minutes] = time.split(':').map(Number)
          baseDate.setHours(hours || 0, minutes || 0, 0, 0)
        }
        return baseDate
      }

      // Generate UUIDs for new items
      const { v4: uuidv4 } = await import('uuid')

      // Process each item
      for (const item of input.items) {
        try {
          if (item._action === 'delete' && item.id) {
            // Delete item (hard delete)
            await ctx.db
              .delete(timeline)
              .where(
                and(
                  eq(timeline.id, item.id),
                  eq(timeline.clientId, input.clientId)
                )
              )
            results.deleted++
          } else if (item._action === 'update' && item.id) {
            // Update existing item
            const startDateTime = combineDateTime(item.date, item.startTime)
            const endDateTime = combineDateTime(item.date, item.endTime)

            await ctx.db
              .update(timeline)
              .set({
                eventId: item.eventId || null,
                title: item.title,
                description: item.description || null,
                phase: item.phase || 'showtime',
                startTime: startDateTime || new Date(),
                endTime: endDateTime,
                durationMinutes: item.durationMinutes || null,
                location: item.location || null,
                participants: item.participants || null,
                responsiblePerson: item.responsiblePerson || null,
                completed: item.completed ?? false,
                sortOrder: item.sortOrder ?? 0,
                notes: item.notes || null,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(timeline.id, item.id),
                  eq(timeline.clientId, input.clientId)
                )
              )
            results.updated++
          } else {
            // Create new item
            const startDateTime = combineDateTime(item.date, item.startTime)
            const endDateTime = combineDateTime(item.date, item.endTime)

            await ctx.db
              .insert(timeline)
              .values({
                id: uuidv4(),
                clientId: input.clientId,
                eventId: item.eventId || null,
                title: item.title,
                description: item.description || null,
                phase: item.phase || 'showtime',
                startTime: startDateTime || new Date(),
                endTime: endDateTime,
                durationMinutes: item.durationMinutes || null,
                location: item.location || null,
                participants: item.participants || null,
                responsiblePerson: item.responsiblePerson || null,
                completed: item.completed ?? false,
                sortOrder: item.sortOrder ?? 0,
                notes: item.notes || null,
              })
            results.created++
          }
        } catch (error) {
          results.errors.push({
            item: item.title,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      await broadcastSync({
        type: 'insert',
        module: 'timeline',
        entityId: 'bulk',
        companyId: ctx.companyId!,
        clientId: input.clientId,
        userId: ctx.userId!,
        queryPaths: ['timeline.getAll'],
      })

      return results
    }),

  getGroupedByEvent: adminProcedure
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

      // Fetch all events for this client
      const clientEvents = await ctx.db
        .select({
          id: events.id,
          title: events.title,
          eventType: events.eventType,
          eventDate: events.eventDate,
        })
        .from(events)
        .where(eq(events.clientId, input.clientId))
        .orderBy(asc(events.eventDate))

      // Fetch all timeline items for this client (exclude soft-deleted)
      const timelineItems = await ctx.db
        .select()
        .from(timeline)
        .where(
          and(
            eq(timeline.clientId, input.clientId),
            isNull(timeline.deletedAt)
          )
        )
        .orderBy(asc(timeline.startTime), asc(timeline.sortOrder))

      // Group timeline items by eventId
      const itemsByEvent = new Map<string | null, typeof timelineItems>()
      for (const item of timelineItems) {
        const eventId = item.eventId
        if (!itemsByEvent.has(eventId)) {
          itemsByEvent.set(eventId, [])
        }
        itemsByEvent.get(eventId)!.push(item)
      }

      // Build grouped structure: date -> events -> items
      const dateGroups = new Map<string, {
        date: string
        events: {
          eventId: string
          eventTitle: string
          eventType: string | null
          items: typeof timelineItems
        }[]
      }>()

      // Process events and their timeline items
      for (const event of clientEvents) {
        const eventItems = itemsByEvent.get(event.id) || []
        const dateKey = event.eventDate || 'unknown'

        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, {
            date: dateKey,
            events: []
          })
        }

        dateGroups.get(dateKey)!.events.push({
          eventId: event.id,
          eventTitle: event.title,
          eventType: event.eventType,
          items: eventItems
        })
      }

      // Handle timeline items without eventId (orphaned items)
      const orphanedItems = itemsByEvent.get(null) || []
      if (orphanedItems.length > 0) {
        // Group orphaned items by their startTime date
        const orphanedByDate = new Map<string, typeof timelineItems>()
        for (const item of orphanedItems) {
          const dateKey = item.startTime ? item.startTime.toISOString().split('T')[0] : 'unknown'
          if (!orphanedByDate.has(dateKey)) {
            orphanedByDate.set(dateKey, [])
          }
          orphanedByDate.get(dateKey)!.push(item)
        }

        // Add orphaned items as "General" event under each date
        for (const [dateKey, items] of orphanedByDate) {
          if (!dateGroups.has(dateKey)) {
            dateGroups.set(dateKey, {
              date: dateKey,
              events: []
            })
          }
          dateGroups.get(dateKey)!.events.push({
            eventId: 'general',
            eventTitle: 'General',
            eventType: null,
            items
          })
        }
      }

      // Convert to array and sort by date
      const result = Array.from(dateGroups.values()).sort((a, b) => {
        if (a.date === 'unknown') return 1
        if (b.date === 'unknown') return -1
        return a.date.localeCompare(b.date)
      })

      return result
    }),
})
