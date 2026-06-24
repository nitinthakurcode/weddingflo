/**
 * Layer 2 — Event (3) + Timeline (3) tools. Covers automation #5 (createEventWithTimeline
 * auto-generates timeline from template) and event-delete cascade (timeline cleanup).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events, timeline } from '@/lib/db/schema'
import { executeToolWithSync } from '@/features/chatbot/server/services/tool-executor'
import { seedTenant, teardownTenant, type TestTenant } from './_harness'

let t: TestTenant
const run = (tool: string, args: Record<string, unknown>) =>
  executeToolWithSync(tool, { clientId: t.clientId, ...args }, t.ctx)

beforeAll(async () => { t = await seedTenant() })
afterAll(async () => { if (t) await teardownTenant(t.companyId) })

describe('event + timeline tools', () => {
  let createdEventId = ''
  let timelineItemId = ''

  it('create_event: creates event + auto-generates timeline items from template', async () => {
    const res = await run('create_event', { title: 'Sangeet Night', eventType: 'Sangeet', eventDate: '2027-06-13' })
    expect(res.success).toBe(true)
    createdEventId = (res.data as { id: string }).id
    const [ev] = await db.select().from(events).where(eq(events.id, createdEventId))
    expect(ev.title).toBe('Sangeet Night')
    const tl = await db.select().from(timeline).where(eq(timeline.eventId, createdEventId))
    expect(tl.length).toBeGreaterThan(0) // template-generated timeline items
  })

  it('update_event: updates title AND persists venueAddress to the address column', async () => {
    // Regression: venueAddress must map to events.address (events has no venueAddress column).
    const res = await run('update_event', { eventId: createdEventId, title: 'Sangeet Gala', venueAddress: '12 Palace Road' })
    expect(res.success).toBe(true)
    const [ev] = await db.select().from(events).where(eq(events.id, createdEventId))
    expect(ev.title).toBe('Sangeet Gala')
    expect(ev.address).toBe('12 Palace Road')
  })

  it('add_timeline_item: inserts a timeline row', async () => {
    const res = await run('add_timeline_item', { eventId: createdEventId, title: 'First Dance', startTime: '20:00' })
    expect(res.success).toBe(true)
    timelineItemId = (res.data as { id: string }).id
    const [item] = await db.select().from(timeline).where(eq(timeline.id, timelineItemId))
    expect(item.title).toBe('First Dance')
  })

  it('shift_timeline: shifts items without error', async () => {
    const res = await run('shift_timeline', { eventId: createdEventId, shiftMinutes: 30 })
    expect(res.success).toBe(true)
  })

  it('delete_timeline_item: removes the timeline row', async () => {
    const res = await executeToolWithSync('delete_timeline_item', { timelineItemId }, t.ctx)
    expect(res.success).toBe(true)
    expect(await db.select().from(timeline).where(eq(timeline.id, timelineItemId))).toHaveLength(0)
  })

  it('delete_event (cascade): removes the event + its timeline items', async () => {
    const created = await run('create_event', { title: 'Throwaway Brunch', eventType: 'Other', eventDate: '2027-06-17' })
    const evId = (created.data as { id: string }).id
    const res = await run('delete_event', { eventId: evId })
    expect(res.success).toBe(true)
    expect(await db.select().from(events).where(eq(events.id, evId))).toHaveLength(0)
    expect(await db.select().from(timeline).where(eq(timeline.eventId, evId))).toHaveLength(0)
  })
})
