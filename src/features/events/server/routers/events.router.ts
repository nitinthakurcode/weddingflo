import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc, gte, lte, inArray, sql } from 'drizzle-orm'
import { events, clients, timeline, timelineTemplates, guests } from '@/lib/db/schema'
import {
  getDefaultTemplate,
  type TimelineTemplateItem,
} from '@/lib/templates/timeline-defaults'
import { broadcastSync } from '@/lib/realtime/broadcast-sync'

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

      return result.event
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

      // Generate UUID for new event (needed before transaction for timeline item generation)
      const { v4: uuidv4 } = await import('uuid')
      const eventId = uuidv4()

      // TIMELINE TEMPLATE LOOKUP: Prepare timeline items before transaction (read-only)
      // If template preparation fails, event still creates without timeline items
      let preparedTimelineItems: Array<typeof timeline.$inferInsert> = []
      try {
        // Parse event date and time for timeline
        let eventStartDateTime = new Date(input.eventDate)
        if (input.startTime) {
          const [hours, minutes] = input.startTime.split(':').map(Number)
          eventStartDateTime.setHours(hours || 0, minutes || 0, 0, 0)
        } else {
          // Default to noon if no start time provided
          eventStartDateTime.setHours(12, 0, 0, 0)
        }

        // Normalize event type for template lookup
        const normalizedEventType = input.eventType?.toLowerCase().replace(/[^a-z_]/g, '_') || 'wedding'

        // Check for company-customized templates first
        let templateItems: TimelineTemplateItem[] = []
        if (ctx.companyId) {
          const customTemplates = await ctx.db
            .select()
            .from(timelineTemplates)
            .where(
              and(
                eq(timelineTemplates.companyId, ctx.companyId),
                eq(timelineTemplates.eventType, normalizedEventType),
                eq(timelineTemplates.isActive, true)
              )
            )
            .orderBy(asc(timelineTemplates.sortOrder))

          if (customTemplates.length > 0) {
            templateItems = customTemplates.map((t) => ({
              title: t.title,
              description: t.description || '',
              offsetMinutes: t.offsetMinutes,
              durationMinutes: t.durationMinutes,
              location: t.location || undefined,
              phase: (t.phase || 'showtime') as 'setup' | 'showtime' | 'wrapup',
            }))
            console.log(`[Timeline] Using ${customTemplates.length} custom template items for ${normalizedEventType}`)
          }
        }

        // Fall back to default templates if no custom ones
        if (templateItems.length === 0) {
          templateItems = getDefaultTemplate(input.eventType)
          console.log(`[Timeline] Using default template for ${normalizedEventType}`)
        }

        const eventLocation = input.location || input.venueName || null

        // Generate timeline items from template
        preparedTimelineItems = templateItems.map((item, index) => {
          const itemStartTime = new Date(eventStartDateTime.getTime() + item.offsetMinutes * 60 * 1000)
          const itemEndTime = new Date(itemStartTime.getTime() + item.durationMinutes * 60 * 1000)

          return {
            id: uuidv4(),
            clientId: input.clientId,
            companyId: ctx.companyId!,
            eventId: eventId,
            title: item.title,
            description: item.description,
            phase: item.phase,
            startTime: itemStartTime,
            endTime: itemEndTime,
            durationMinutes: item.durationMinutes,
            location: item.location || eventLocation,
            sortOrder: index,
            sourceModule: 'events',
            sourceId: eventId,
            metadata: JSON.stringify({ eventType: input.eventType || 'Wedding Event', eventTitle: input.title }),
          }
        })
      } catch (timelineError) {
        // Template preparation failed - event will still be created without timeline items
        console.warn('[Timeline] Failed to prepare timeline entries for event:', timelineError)
      }

      // ATOMIC CREATE: Event + timeline items in a single transaction
      const event = await ctx.db.transaction(async (tx) => {
        const [newEvent] = await tx
          .insert(events)
          .values({
            id: eventId,
            clientId: input.clientId,
            companyId: ctx.companyId!,
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

        if (!newEvent) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create event'
          })
        }

        // Insert timeline items if template preparation succeeded
        if (preparedTimelineItems.length > 0) {
          await tx.insert(timeline).values(preparedTimelineItems)
          console.log(`[Timeline] Auto-created ${preparedTimelineItems.length} items for event: ${input.title} (${input.eventType})`)
        }

        return newEvent
      })

      // Broadcast real-time sync
      await broadcastSync({
        type: 'insert',
        module: 'events',
        entityId: event.id,
        companyId: ctx.companyId!,
        clientId: input.clientId,
        userId: ctx.userId!,
        queryPaths: ['events.getAll', 'timeline.getAll'],
      })

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

      // Prepare timeline update data (before transaction, no DB access needed)
      const timelineUpdate: Record<string, any> = { updatedAt: new Date() }
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
        queryPaths: ['events.getAll', 'timeline.getAll'],
      })

      return event
    }),

  delete: adminProcedure
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
        queryPaths: ['events.getAll', 'timeline.getAll', 'guests.getAll'],
      })

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
