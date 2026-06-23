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

import { eq, and, asc, sql } from 'drizzle-orm'
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
  let preparedTimelineItems: Array<typeof timeline.$inferInsert> = []
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

    preparedTimelineItems = templateItems.map((item, index) => {
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
        eventId,
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
        metadata: JSON.stringify({
          eventType: input.eventType || 'Wedding Event',
          eventTitle: input.title,
        }),
      }
    })
  } catch (timelineError) {
    console.warn('[event-timeline-sync] Failed to prepare timeline entries:', timelineError)
  }

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
