/**
 * Event + Timeline Sync — Shared canonical logic for creating a wedding/event
 * together with its auto-generated timeline items.
 *
 * Single source of truth used by EVERY path that creates an event:
 *   - events.router.ts        (create event via Events module)
 *   - clients.router.ts       (auto-create "Main Wedding" event on client create/update)
 *   - tool-executor.ts        (chatbot create_client)
 *
 * Before this helper existed, each path inserted into `events` directly with its
 * own logic. They drifted: the client/chatbot paths omitted `companyId` (storing
 * NULL on a tenant-scoped table) and skipped timeline generation entirely (empty
 * Timeline module). Centralizing here guarantees all three behave identically.
 *
 * IMPORTANT:
 *   - Always sets `companyId` on BOTH the event and its timeline items
 *     (tenant-isolation Rules 1 & 3).
 *   - Accepts a TransactionClient (Drizzle tx) so callers control the transaction;
 *     it never opens its own and never calls broadcastSync (that stays in callers,
 *     OUTSIDE the transaction).
 *   - Template preparation failure never rolls back the event (matches the
 *     original events.router behavior).
 */

import { eq, and, asc, sql, isNull } from 'drizzle-orm'
import { events, timeline, timelineTemplates } from '@/lib/db/schema'
import {
  getDefaultTemplate,
  type TimelineTemplateItem,
} from '@/lib/templates/timeline-defaults'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = any

export interface CreateEventWithTimelineInput {
  clientId: string
  /** REQUIRED — fixes the historical NULL-tenant bug on auto-created events. */
  companyId: string
  title: string
  eventType?: string | null
  eventDate: string
  startTime?: string | null
  endTime?: string | null
  location?: string | null
  venueName?: string | null
  address?: string | null
  guestCount?: number | null
  notes?: string | null
  description?: string | null
  status?: string
  /** Optional caller-supplied UUID (otherwise generated). */
  eventId?: string
}

/**
 * Prepare (but do not insert) the template-generated timeline items for an event.
 * Read-only; returns [] on any template-prep failure so the caller's event write
 * is never rolled back. Shared by createEventWithTimeline and syncEventsToTimelineTx
 * so the template logic lives in exactly one place.
 */
async function prepareTimelineItemsForEvent(
  tx: TransactionClient,
  input: {
    eventId: string
    clientId: string
    companyId: string
    title: string
    eventType?: string | null
    eventDate: string
    startTime?: string | null
    location?: string | null
    venueName?: string | null
  }
): Promise<Array<typeof timeline.$inferInsert>> {
  try {
    // Anchor timeline at the event start (defaults to noon if no start time).
    const eventStartDateTime = new Date(input.eventDate)
    if (input.startTime) {
      const [hours, minutes] = input.startTime.split(':').map(Number)
      eventStartDateTime.setHours(hours || 0, minutes || 0, 0, 0)
    } else {
      eventStartDateTime.setHours(12, 0, 0, 0)
    }

    const normalizedEventType =
      input.eventType?.toLowerCase().replace(/[^a-z_]/g, '_') || 'wedding'

    // Prefer company-customized templates, fall back to defaults.
    let templateItems: TimelineTemplateItem[] = []
    const customTemplates = await tx
      .select()
      .from(timelineTemplates)
      .where(
        and(
          eq(timelineTemplates.companyId, input.companyId),
          eq(timelineTemplates.eventType, normalizedEventType),
          eq(timelineTemplates.isActive, true)
        )
      )
      .orderBy(asc(timelineTemplates.sortOrder))

    if (customTemplates.length > 0) {
      templateItems = customTemplates.map((t: typeof timelineTemplates.$inferSelect) => ({
        title: t.title,
        description: t.description || '',
        offsetMinutes: t.offsetMinutes,
        durationMinutes: t.durationMinutes,
        location: t.location || undefined,
        phase: (t.phase || 'showtime') as 'setup' | 'showtime' | 'wrapup',
      }))
    } else {
      templateItems = getDefaultTemplate(input.eventType)
    }

    const eventLocation = input.location || input.venueName || null

    return templateItems.map((item, index) => {
      const itemStartTime = new Date(
        eventStartDateTime.getTime() + item.offsetMinutes * 60 * 1000
      )
      const itemEndTime = new Date(
        itemStartTime.getTime() + item.durationMinutes * 60 * 1000
      )

      return {
        id: crypto.randomUUID(),
        clientId: input.clientId,
        companyId: input.companyId,
        eventId: input.eventId,
        title: item.title,
        description: item.description,
        phase: item.phase,
        startTime: itemStartTime,
        endTime: itemEndTime,
        durationMinutes: item.durationMinutes,
        location: item.location || eventLocation,
        sortOrder: index,
        sourceModule: 'events',
        sourceId: input.eventId,
        metadata: JSON.stringify({
          eventType: input.eventType || 'Wedding Event',
          eventTitle: input.title,
        }),
      }
    })
  } catch (timelineError) {
    console.warn('[event-timeline-sync] Failed to prepare timeline entries:', timelineError)
    return []
  }
}

/**
 * Create an event and its template-generated timeline items inside the caller's
 * transaction. Returns the created event row + timeline item count.
 */
export async function createEventWithTimeline(
  tx: TransactionClient,
  input: CreateEventWithTimelineInput
): Promise<{ eventId: string; timelineCount: number; event: typeof events.$inferSelect }> {
  const eventId = input.eventId ?? crypto.randomUUID()
  const eventStatus = input.status || 'planned'

  // TIMELINE TEMPLATE PREP (read-only). On failure the event still creates.
  const preparedTimelineItems = await prepareTimelineItemsForEvent(tx, {
    eventId,
    clientId: input.clientId,
    companyId: input.companyId,
    title: input.title,
    eventType: input.eventType,
    eventDate: input.eventDate,
    startTime: input.startTime,
    location: input.location,
    venueName: input.venueName,
  })

  const [event] = await tx
    .insert(events)
    .values({
      id: eventId,
      clientId: input.clientId,
      companyId: input.companyId,
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
    throw new Error('Failed to create event')
  }

  if (preparedTimelineItems.length > 0) {
    await tx.insert(timeline).values(preparedTimelineItems)
  }

  return { eventId, timelineCount: preparedTimelineItems.length, event }
}

/**
 * Shift the timeline items linked to an event when its date/start time changes.
 *
 * Preserves each item's relative offset by applying the SAME delta to every
 * linked item (unlike the older inline events.router logic which collapsed all
 * items to a single timestamp). Used when a client's wedding date is edited so
 * the auto-generated wedding timeline moves with the wedding.
 *
 * Returns the number of timeline items shifted (0 if no change / no items).
 */
export async function shiftEventTimelineForDateChange(
  tx: TransactionClient,
  eventId: string,
  opts: {
    oldEventDate: string | null
    oldStartTime: string | null
    newEventDate: string | null
    newStartTime?: string | null
  }
): Promise<number> {
  if (!opts.oldEventDate || !opts.newEventDate) return 0

  const anchor = (date: string, time: string | null): Date => {
    const d = new Date(date)
    if (time) {
      const [h, m] = time.split(':').map(Number)
      d.setHours(h || 0, m || 0, 0, 0)
    } else {
      d.setHours(12, 0, 0, 0)
    }
    return d
  }

  const oldStart = anchor(opts.oldEventDate, opts.oldStartTime)
  const newStart = anchor(opts.newEventDate, opts.newStartTime ?? opts.oldStartTime)
  const deltaSeconds = Math.round((newStart.getTime() - oldStart.getTime()) / 1000)

  if (deltaSeconds === 0) return 0

  const result = await tx
    .update(timeline)
    .set({
      startTime: sql`${timeline.startTime} + (${deltaSeconds} * interval '1 second')`,
      endTime: sql`CASE WHEN ${timeline.endTime} IS NOT NULL THEN ${timeline.endTime} + (${deltaSeconds} * interval '1 second') ELSE NULL END`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(timeline.sourceModule, 'events'), eq(timeline.sourceId, eventId))
    )
    .returning({ id: timeline.id })

  return Array.isArray(result) ? result.length : 0
}

/**
 * Ensure every (non-deleted) event for a client has its template-generated
 * timeline items. Used after a bulk Events import (Excel/Sheets) so newly
 * imported events get their wedding-day schedule, mirroring the UI create path.
 *
 * Generate-when-missing only: events that already have linked timeline items are
 * left untouched, so a re-import of unchanged events is a no-op. Returns the
 * number of timeline items created.
 */
export async function syncEventsToTimelineTx(
  tx: TransactionClient,
  clientId: string
): Promise<number> {
  const clientEvents = await tx
    .select()
    .from(events)
    .where(and(eq(events.clientId, clientId), isNull(events.deletedAt)))

  let created = 0
  for (const ev of clientEvents) {
    // Can't anchor a timeline without a date; skip tenant-less rows (Rule 3).
    if (!ev.eventDate || !ev.companyId) continue

    const existing = await tx
      .select({ id: timeline.id })
      .from(timeline)
      .where(and(eq(timeline.sourceModule, 'events'), eq(timeline.sourceId, ev.id)))
      .limit(1)

    if (existing.length > 0) continue // already has timeline items

    const items = await prepareTimelineItemsForEvent(tx, {
      eventId: ev.id,
      clientId: ev.clientId,
      companyId: ev.companyId,
      title: ev.title,
      eventType: ev.eventType,
      eventDate: ev.eventDate,
      startTime: ev.startTime,
      location: ev.location,
      venueName: ev.venueName,
    })

    if (items.length > 0) {
      await tx.insert(timeline).values(items)
      created += items.length
    }
  }

  return created
}
