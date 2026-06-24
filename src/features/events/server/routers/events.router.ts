import { router, staffProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc, gte, lte, inArray, sql } from 'drizzle-orm'
import { events, clients, timeline, guests } from '@/lib/db/schema'
import { broadcastSync } from '@/lib/realtime/broadcast-sync'
import { EVENT_MUTATION_PATHS, EVENT_DELETE_PATHS } from '@/lib/sync/cascade-query-paths'
import { createEventWithTimeline } from '@/lib/sync/event-timeline-sync'

/**
 * Events tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding events with multi-tenant security.
 * Migrated from Supabase to Drizzle - December 2025
 */
export const eventsRouter = router({
  getAll: staffProcedure
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

  getById: staffProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // SECURITY: Verify event belongs to company via client join
      const [result] = await ctx.db
        .select({ event: events })
        .from(events)
        .innerJoin(clients, eq(events.clientId, clients.id))
        .where(
          and(
            eq(events.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.assertClientAccess(result.event.clientId)

      return result.event
    }),

  create: staffProcedure
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

      // ATOMIC CREATE: Event + template-generated timeline items in a single
      // transaction. Shared with clients.router + chatbot via the canonical helper.
      const { event } = await ctx.db.transaction(async (tx) =>
        createEventWithTimeline(tx, {
          clientId: input.clientId,
          companyId: ctx.companyId!,
          title: input.title,
          description: input.description,
          eventType: input.eventType,
          eventDate: input.eventDate,
          startTime: input.startTime,
          endTime: input.endTime,
          location: input.location,
          venueName: input.venueName,
          address: input.address,
          guestCount: input.guestCount,
          notes: input.notes,
          status: eventStatus,
        })
      )

      // Broadcast real-time sync
      await broadcastSync({
        type: 'insert',
        module: 'events',
        entityId: event.id,
        companyId: ctx.companyId!,
        clientId: input.clientId,
        userId: ctx.userId!,
        queryPaths: [...EVENT_MUTATION_PATHS],
      })

      return event
    }),

  update: staffProcedure
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

      // SECURITY: Verify event belongs to company via client join before update
      const [existingEvent] = await ctx.db
        .select({ event: events })
        .from(events)
        .innerJoin(clients, eq(events.clientId, clients.id))
        .where(
          and(
            eq(events.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1)

      if (!existingEvent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        })
      }

      await ctx.assertClientAccess(existingEvent.event.clientId)

      // Build update object
      const updateData: Partial<typeof events.$inferInsert> = {
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

      // Prepare timeline update data (before transaction, no DB access needed)
      const timelineUpdate: Partial<typeof timeline.$inferInsert> = { updatedAt: new Date() }
      if (input.data.title !== undefined) timelineUpdate.title = input.data.title
      if (input.data.description !== undefined) timelineUpdate.description = input.data.description
      if (input.data.location !== undefined || input.data.venueName !== undefined) {
        timelineUpdate.location = input.data.location || input.data.venueName
      }
      if (input.data.notes !== undefined) timelineUpdate.notes = input.data.notes

      // ATOMIC UPDATE: Event + timeline sync in a single transaction
      const event = await ctx.db.transaction(async (tx) => {
        const [updatedEvent] = await tx
          .update(events)
          .set(updateData)
          .where(eq(events.id, input.id))
          .returning()

        if (!updatedEvent) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update event'
          })
        }

        // TIMELINE SYNC: Update linked timeline entry
        // Update date/time if changed (needs updatedEvent for fallback values)
        if (input.data.eventDate !== undefined || input.data.startTime !== undefined) {
          const eventDate = input.data.eventDate || updatedEvent.eventDate
          const startTime = input.data.startTime || updatedEvent.startTime
          if (eventDate) {
            let startDateTime = new Date(eventDate)
            if (startTime) {
              const [hours, minutes] = startTime.split(':').map(Number)
              startDateTime.setHours(hours || 0, minutes || 0, 0, 0)
            }
            timelineUpdate.startTime = startDateTime
          }
        }

        if (input.data.endTime !== undefined) {
          const eventDate = input.data.eventDate || updatedEvent.eventDate
          if (eventDate) {
            let endDateTime = new Date(eventDate)
            const [hours, minutes] = input.data.endTime.split(':').map(Number)
            endDateTime.setHours(hours || 0, minutes || 0, 0, 0)
            timelineUpdate.endTime = endDateTime
          }
        }

        await tx
          .update(timeline)
          .set(timelineUpdate)
          .where(
            and(
              eq(timeline.sourceModule, 'events'),
              eq(timeline.sourceId, input.id)
            )
          )

        console.log(`[Timeline] Updated entry for event: ${updatedEvent.title}`)
        return updatedEvent
      })

      // Broadcast real-time sync
      await broadcastSync({
        type: 'update',
        module: 'events',
        entityId: event.id,
        companyId: ctx.companyId!,
        clientId: existingEvent.event.clientId,
        userId: ctx.userId!,
        queryPaths: [...EVENT_MUTATION_PATHS],
      })

      return event
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // SECURITY: Verify event belongs to company via client join before delete
      const [existingEvent] = await ctx.db
        .select({ event: events })
        .from(events)
        .innerJoin(clients, eq(events.clientId, clients.id))
        .where(
          and(
            eq(events.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1)

      if (!existingEvent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        })
      }

      await ctx.assertClientAccess(existingEvent.event.clientId)

      // ATOMIC DELETE: All cleanup + delete in a transaction for data consistency
      // Order: clean up references first, then delete the entity
      await ctx.db.transaction(async (tx) => {
        // 1. GUEST CLEANUP: Remove deleted eventId from all guests' attendingEvents arrays
        await tx.execute(sql`
          UPDATE guests
          SET attending_events = array_remove(attending_events, ${input.id}),
              updated_at = NOW()
          WHERE client_id = ${existingEvent.event.clientId}
            AND ${input.id} = ANY(attending_events)
        `)

        // 2. TIMELINE CLEANUP: Delete linked timeline entries
        await tx
          .delete(timeline)
          .where(
            and(
              eq(timeline.sourceModule, 'events'),
              eq(timeline.sourceId, input.id)
            )
          )

        // 3. DELETE EVENT (last - after all references are cleaned up)
        await tx
          .delete(events)
          .where(eq(events.id, input.id))
      })

      console.log(`[Event Delete] Atomically deleted event ${input.id} with cleanup`)

      // Broadcast real-time sync (OUTSIDE transaction - best-effort, shouldn't block delete)
      await broadcastSync({
        type: 'delete',
        module: 'events',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: existingEvent.event.clientId,
        userId: ctx.userId!,
        queryPaths: [...EVENT_DELETE_PATHS],
      })

      return { success: true }
    }),

  updateStatus: staffProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // SECURITY: Verify event belongs to company via client join before update
      const [existingEvent] = await ctx.db
        .select({ event: events })
        .from(events)
        .innerJoin(clients, eq(events.clientId, clients.id))
        .where(
          and(
            eq(events.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1)

      if (!existingEvent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event not found'
        })
      }

      await ctx.assertClientAccess(existingEvent.event.clientId)

      // Update status (already verified ownership)
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
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update event status'
        })
      }

      return event
    }),

  getUpcoming: staffProcedure
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

  getStats: staffProcedure
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
  getEventsThisMonth: staffProcedure
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
