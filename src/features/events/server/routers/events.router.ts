import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc, gte, lte, inArray } from 'drizzle-orm'
import { events, clients, timeline } from '@/lib/db/schema'

/**
 * Events tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding events with multi-tenant security.
 * Migrated from Supabase to Drizzle - December 2025
 */
export const eventsRouter = router({
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

      // Fetch events
      const eventList = await ctx.db
        .select()
        .from(events)
        .where(eq(events.clientId, input.clientId))
        .orderBy(asc(events.eventDate))

      return eventList
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [event] = await ctx.db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1)

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return event
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      eventType: z.string().optional(),
      eventDate: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      venueName: z.string().optional(),
      address: z.string().optional(),
      guestCount: z.number().int().optional(),
      notes: z.string().optional(),
      status: z.enum(['draft', 'planned', 'confirmed', 'completed', 'cancelled']).optional(),
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

      // Default status is 'planned' unless explicitly provided (synced with pipeline)
      const eventStatus = input.status || 'planned'

      // Create event
      const [event] = await ctx.db
        .insert(events)
        .values({
          clientId: input.clientId,
          title: input.title,
          description: input.description || null,
          eventType: input.eventType || null,
          eventDate: input.eventDate,
          startTime: input.startTime || null,
          endTime: input.endTime || null,
          location: input.location || null,
          venueName: input.venueName || null,
          address: input.address || null,
          guestCount: input.guestCount || null,
          notes: input.notes || null,
          status: eventStatus,
        })
        .returning()

      if (!event) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create event'
        })
      }

      // TIMELINE SYNC: Auto-create timeline entry for this event
      try {
        // Parse event date and time for timeline
        let startDateTime = new Date(input.eventDate)
        if (input.startTime) {
          const [hours, minutes] = input.startTime.split(':').map(Number)
          startDateTime.setHours(hours || 0, minutes || 0, 0, 0)
        }

        let endDateTime: Date | null = null
        if (input.endTime) {
          endDateTime = new Date(input.eventDate)
          const [hours, minutes] = input.endTime.split(':').map(Number)
          endDateTime.setHours(hours || 0, minutes || 0, 0, 0)
        }

        // Calculate duration if both times provided
        let durationMinutes: number | null = null
        if (startDateTime && endDateTime) {
          durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
        }

        await ctx.db.insert(timeline).values({
          clientId: input.clientId,
          title: input.title,
          description: input.description || `Event: ${input.eventType || 'Wedding Event'}`,
          startTime: startDateTime,
          endTime: endDateTime,
          durationMinutes,
          location: input.location || input.venueName || null,
          notes: input.notes || null,
          sourceModule: 'events',
          sourceId: event.id,
          metadata: JSON.stringify({ eventType: input.eventType || 'Wedding Event' }),
        })
        console.log(`[Timeline] Auto-created entry for event: ${input.title}`)
      } catch (timelineError) {
        // Log but don't fail - event was created successfully
        console.warn('[Timeline] Failed to auto-create timeline entry for event:', timelineError)
      }

      return event
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        eventType: z.string().optional(),
        eventDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        location: z.string().optional(),
        venueName: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(['draft', 'planned', 'confirmed', 'completed', 'cancelled']).optional(),
        guestCount: z.number().int().optional(),
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
      if (input.data.eventType !== undefined) updateData.eventType = input.data.eventType
      if (input.data.eventDate !== undefined) updateData.eventDate = input.data.eventDate
      if (input.data.startTime !== undefined) updateData.startTime = input.data.startTime
      if (input.data.endTime !== undefined) updateData.endTime = input.data.endTime
      if (input.data.location !== undefined) updateData.location = input.data.location
      if (input.data.venueName !== undefined) updateData.venueName = input.data.venueName
      if (input.data.address !== undefined) updateData.address = input.data.address
      if (input.data.status !== undefined) updateData.status = input.data.status
      if (input.data.guestCount !== undefined) updateData.guestCount = input.data.guestCount
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update event
      const [event] = await ctx.db
        .update(events)
        .set(updateData)
        .where(eq(events.id, input.id))
        .returning()

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        })
      }

      // TIMELINE SYNC: Update linked timeline entry using efficient DB query
      try {
        const timelineUpdate: Record<string, any> = { updatedAt: new Date() }

        if (input.data.title !== undefined) timelineUpdate.title = input.data.title
        if (input.data.description !== undefined) timelineUpdate.description = input.data.description
        if (input.data.location !== undefined || input.data.venueName !== undefined) {
          timelineUpdate.location = input.data.location || input.data.venueName
        }
        if (input.data.notes !== undefined) timelineUpdate.notes = input.data.notes

        // Update date/time if changed
        if (input.data.eventDate !== undefined || input.data.startTime !== undefined) {
          const eventDate = input.data.eventDate || event.eventDate
          const startTime = input.data.startTime || event.startTime
          let startDateTime = new Date(eventDate)
          if (startTime) {
            const [hours, minutes] = startTime.split(':').map(Number)
            startDateTime.setHours(hours || 0, minutes || 0, 0, 0)
          }
          timelineUpdate.startTime = startDateTime
        }

        if (input.data.endTime !== undefined) {
          const eventDate = input.data.eventDate || event.eventDate
          let endDateTime = new Date(eventDate)
          const [hours, minutes] = input.data.endTime.split(':').map(Number)
          endDateTime.setHours(hours || 0, minutes || 0, 0, 0)
          timelineUpdate.endTime = endDateTime
        }

        // Direct DB update using sourceModule and sourceId columns
        await ctx.db
          .update(timeline)
          .set(timelineUpdate)
          .where(
            and(
              eq(timeline.sourceModule, 'events'),
              eq(timeline.sourceId, input.id)
            )
          )

        console.log(`[Timeline] Updated entry for event: ${event.title}`)
      } catch (timelineError) {
        console.warn('[Timeline] Failed to sync timeline entry for event update:', timelineError)
      }

      return event
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Delete event
      await ctx.db
        .delete(events)
        .where(eq(events.id, input.id))

      // TIMELINE SYNC: Delete linked timeline entry using efficient DB query
      try {
        await ctx.db
          .delete(timeline)
          .where(
            and(
              eq(timeline.sourceModule, 'events'),
              eq(timeline.sourceId, input.id)
            )
          )
        console.log(`[Timeline] Deleted entry for event: ${input.id}`)
      } catch (timelineError) {
        console.warn('[Timeline] Failed to delete timeline entry for event:', timelineError)
      }

      return { success: true }
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [event] = await ctx.db
        .update(events)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.id))
        .returning()

      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        })
      }

      return event
    }),

  getUpcoming: adminProcedure
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

      // Get today's date
      const today = new Date().toISOString().split('T')[0]

      // Fetch upcoming events
      const eventList = await ctx.db
        .select()
        .from(events)
        .where(
          and(
            eq(events.clientId, input.clientId),
            gte(events.eventDate, today)
          )
        )
        .orderBy(asc(events.eventDate))

      return eventList
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

      // Get events
      const eventList = await ctx.db
        .select({ status: events.status })
        .from(events)
        .where(eq(events.clientId, input.clientId))

      const stats = {
        total: eventList.length,
        planned: eventList.filter(e => e.status === 'planned').length,
        confirmed: eventList.filter(e => e.status === 'confirmed').length,
        completed: eventList.filter(e => e.status === 'completed').length,
        cancelled: eventList.filter(e => e.status === 'cancelled').length,
      }

      return stats
    }),

  /**
   * Get all events for the current month across all clients in the company.
   * Used for dashboard stats like "Active This Month".
   */
  getEventsThisMonth: adminProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get first and last day of current month (using UTC to avoid timezone issues)
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()

      // Format as YYYY-MM-DD strings directly to avoid timezone conversion
      const firstDayStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
      // Get last day of month (day 0 of next month = last day of current month)
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
      const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`

      // Get all client IDs for this company
      const companyClients = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )

      if (companyClients.length === 0) {
        return []
      }

      const clientIds = companyClients.map(c => c.id)

      // Get events for these clients in current month
      const eventList = await ctx.db
        .select({
          id: events.id,
          clientId: events.clientId,
          title: events.title,
          eventDate: events.eventDate,
        })
        .from(events)
        .where(
          and(
            inArray(events.clientId, clientIds),
            gte(events.eventDate, firstDayStr),
            lte(events.eventDate, lastDayStr)
          )
        )
        .orderBy(asc(events.eventDate))

      return eventList
    }),
})
