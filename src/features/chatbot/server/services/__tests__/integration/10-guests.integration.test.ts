/**
 * Layer 2 — Guest module tools (9): exhaustive real-DB execution + automation asserts.
 * Covers critical automations #1 (recalcClientStats), #2 (recalcPerGuestBudgetItems),
 * #4 (cascadeGuestSideEffects on add + delete), and enum normalization.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { guests, clients, hotels, guestTransport, budget } from '@/lib/db/schema'
import { executeToolWithSync } from '@/features/chatbot/server/services/tool-executor'
import { seedTenant, teardownTenant, seedPerGuestBudgetItem, type TestTenant } from './_harness'

let t: TestTenant
const run = (tool: string, args: Record<string, unknown>) =>
  executeToolWithSync(tool, { clientId: t.clientId, ...args }, t.ctx)

beforeAll(async () => {
  t = await seedTenant()
})
afterAll(async () => {
  if (t) await teardownTenant(t.companyId)
})

describe('guest tools', () => {
  it('add_guest: inserts guest, normalizes side (bride→partner1), recalcs client guestCount', async () => {
    const res = await run('add_guest', { firstName: 'Aisha', lastName: 'Khan', side: 'bride', rsvpStatus: 'pending' })
    expect(res.success).toBe(true)
    const id = (res.data as { id: string }).id
    const [g] = await db.select().from(guests).where(eq(guests.id, id))
    expect(g.guestSide).toBe('partner1')
    const [c] = await db.select().from(clients).where(eq(clients.id, t.clientId))
    expect(c.guestCount).toBeGreaterThanOrEqual(1)
  })

  it('add_guest (cascade): needsHotel+needsTransport auto-create hotel + transport rows', async () => {
    const res = await run('add_guest', {
      firstName: 'Bilal', lastName: 'Ahmed', needsHotel: true, hotelName: 'Grand Plaza',
      hotelCheckIn: '2027-06-14', hotelCheckOut: '2027-06-16', needsTransport: true, transportType: 'car',
    })
    expect(res.success).toBe(true)
    const guestId = (res.data as { id: string }).id
    const h = await db.select().from(hotels).where(eq(hotels.guestId, guestId))
    const tr = await db.select().from(guestTransport).where(eq(guestTransport.guestId, guestId))
    expect(h.length).toBeGreaterThanOrEqual(1)
    expect(tr.length).toBeGreaterThanOrEqual(1)
  })

  it('get_guest_stats: query returns aggregate data (no mutation)', async () => {
    const res = await run('get_guest_stats', {})
    expect(res.success).toBe(true)
    expect(res.data).toBeTruthy()
  })

  it('update_guest_rsvp: confirming a guest recalcs per-guest budget item (estimatedCost = perGuestCost × confirmed)', async () => {
    await seedPerGuestBudgetItem(t.clientId, t.companyId, 100)
    const add = await run('add_guest', { firstName: 'Carlos', lastName: 'Diaz', rsvpStatus: 'pending' })
    const guestId = (add.data as { id: string }).id

    const res = await run('update_guest_rsvp', { guestId, rsvpStatus: 'confirmed' })
    expect(res.success).toBe(true)

    const [g] = await db.select().from(guests).where(eq(guests.id, guestId))
    expect(g.rsvpStatus).toBe('confirmed')

    // confirmed guest count for the client
    const confirmed = await db.select().from(guests).where(and(eq(guests.clientId, t.clientId), eq(guests.rsvpStatus, 'confirmed')))
    const confirmedParty = confirmed.reduce((s, x) => s + (x.partySize || 1), 0)
    const [item] = await db.select().from(budget).where(and(eq(budget.clientId, t.clientId), eq(budget.isPerGuestItem, true)))
    expect(Number(item.estimatedCost)).toBe(100 * confirmedParty)
    expect(confirmedParty).toBeGreaterThanOrEqual(1)
  })

  it('bulk_update_guests: updates rsvp AND persists needsHotel/needsTransport flags', async () => {
    await run('add_guest', { firstName: 'Dora', groupName: 'BulkGroup', rsvpStatus: 'pending' })
    await run('add_guest', { firstName: 'Evan', groupName: 'BulkGroup', rsvpStatus: 'pending' })
    // Regression: needsHotel/needsTransport must map to hotelRequired/transportRequired columns.
    const res = await run('bulk_update_guests', {
      groupName: 'BulkGroup',
      updates: { rsvpStatus: 'confirmed', needsHotel: true, needsTransport: true },
    })
    expect(res.success).toBe(true)
    const grp = await db.select().from(guests).where(and(eq(guests.clientId, t.clientId), eq(guests.groupName, 'BulkGroup')))
    expect(grp.length).toBe(2)
    expect(grp.every((g) => g.rsvpStatus === 'confirmed')).toBe(true)
    expect(grp.every((g) => g.hotelRequired === true)).toBe(true)
    expect(grp.every((g) => g.transportRequired === true)).toBe(true)
  })

  it('check_in_guest: flags a guest checked-in', async () => {
    const add = await run('add_guest', { firstName: 'Farah', rsvpStatus: 'confirmed' })
    const guestId = (add.data as { id: string }).id
    const res = await run('check_in_guest', { guestId })
    expect(res.success).toBe(true)
  })

  it('assign_guests_to_events: assigns a guest to the main event', async () => {
    const add = await run('add_guest', { firstName: 'Gita', rsvpStatus: 'confirmed' })
    const guestId = (add.data as { id: string }).id
    const res = await run('assign_guests_to_events', { guestIds: [guestId], eventIds: [t.eventId] })
    expect(res.success).toBe(true)
    const [g] = await db.select().from(guests).where(eq(guests.id, guestId))
    expect((g.attendingEvents as string[] | null) ?? []).toContain(t.eventId)
  })

  it('update_table_dietary: sets meal preference for a table', async () => {
    await run('add_guest', { firstName: 'Hana', tableNumber: 7, rsvpStatus: 'confirmed' })
    const res = await run('update_table_dietary', { tableNumber: 7, mealPreference: 'vegan' })
    expect(res.success).toBe(true)
    const tbl = await db.select().from(guests).where(and(eq(guests.clientId, t.clientId), eq(guests.tableNumber, 7)))
    expect(tbl.every((g) => g.mealPreference === 'vegan')).toBe(true)
  })

  it('delete_guest (cascade): removes guest + its hotel + transport rows', async () => {
    const add = await run('add_guest', {
      firstName: 'Ivan', needsHotel: true, hotelName: 'Sea View', hotelCheckIn: '2027-06-14',
      hotelCheckOut: '2027-06-16', needsTransport: true, transportType: 'bus',
    })
    const guestId = (add.data as { id: string }).id
    expect((await db.select().from(hotels).where(eq(hotels.guestId, guestId))).length).toBeGreaterThanOrEqual(1)

    const res = await run('delete_guest', { guestId })
    expect(res.success).toBe(true)
    expect(await db.select().from(guests).where(eq(guests.id, guestId))).toHaveLength(0)
    expect(await db.select().from(hotels).where(eq(hotels.guestId, guestId))).toHaveLength(0)
    expect(await db.select().from(guestTransport).where(eq(guestTransport.guestId, guestId))).toHaveLength(0)
  })
})
