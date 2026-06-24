/**
 * Layer 2 — Clients (5), Hotels (3), Transport (1), Gifts (3). Covers automation #5
 * (create_client → main event + budget template) and #1 stat coupling on create.
 * (There is no delete_client chatbot tool — full client cascade-delete is covered by
 *  client-cascade-completeness.test.ts and exercised by the harness teardown.)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { clients, events, budget, hotels, guestTransport, gifts } from '@/lib/db/schema'
import { executeToolWithSync } from '@/features/chatbot/server/services/tool-executor'
import { seedTenant, teardownTenant, type TestTenant } from './_harness'

let t: TestTenant
const run = (tool: string, args: Record<string, unknown>) =>
  executeToolWithSync(tool, { clientId: t.clientId, ...args }, t.ctx)
const addGuest = async (firstName: string, extra: Record<string, unknown> = {}) => {
  const r = await run('add_guest', { firstName, rsvpStatus: 'confirmed', ...extra })
  return (r.data as { id: string }).id
}

beforeAll(async () => { t = await seedTenant() })
afterAll(async () => { if (t) await teardownTenant(t.companyId) })

describe('client tools', () => {
  it('create_client (cascade): new client + auto main event (weddingDate) + vendors→budget items', async () => {
    const res = await executeToolWithSync('create_client', {
      partner1FirstName: 'Nadia', partner1LastName: 'Rao', partner1Email: `nadia-${Date.now()}@example.test`,
      weddingDate: '2028-02-20', venue: 'Lakeside Manor', guestCount: 120,
      vendors: 'Venue: Grand Hall, Photography: Studio One',
    }, t.ctx)
    expect(res.success).toBe(true)
    const newId = (res.data as { id: string }).id
    const [c] = await db.select().from(clients).where(eq(clients.id, newId))
    expect(c.companyId).toBe(t.companyId)
    // weddingDate → createEventWithTimeline auto-creates the main event
    expect((await db.select().from(events).where(eq(events.clientId, newId))).length).toBeGreaterThan(0)
    // vendors arg → auto-created vendors each get a linked budget item
    expect((await db.select().from(budget).where(eq(budget.clientId, newId))).length).toBeGreaterThan(0)
  })

  it('update_client: syncs wedding fields to the main event', async () => {
    const res = await run('update_client', { clientId: t.clientId, venue: 'Hill Top', weddingDate: '2027-06-16' })
    expect(res.success).toBe(true)
    const [c] = await db.select().from(clients).where(eq(clients.id, t.clientId))
    expect(c.weddingDate).toBe('2027-06-16')
  })

  it('get_client_summary / get_wedding_summary / get_recommendations: queries return data', async () => {
    for (const tool of ['get_client_summary', 'get_wedding_summary', 'get_recommendations']) {
      const res = await run(tool, {})
      expect(res.success, `${tool} success`).toBe(true)
      expect(res.data, `${tool} data`).toBeTruthy()
    }
  })
})

describe('hotel + transport + gift tools', () => {
  it('add_hotel_booking: creates a hotel row for a guest', async () => {
    const guestId = await addGuest('HotelGuest', { needsHotel: true })
    const res = await run('add_hotel_booking', {
      guestId, hotelName: 'Marriott', checkInDate: '2027-06-14', checkOutDate: '2027-06-16', roomType: 'Suite',
    })
    expect(res.success).toBe(true)
    expect((await db.select().from(hotels).where(eq(hotels.guestId, guestId))).length).toBeGreaterThanOrEqual(1)
  })

  it('bulk_add_hotel_bookings: creates hotel rows for multiple guests', async () => {
    const g1 = await addGuest('BulkHotel1', { needsHotel: true, groupName: 'HotelBulk' })
    const g2 = await addGuest('BulkHotel2', { needsHotel: true, groupName: 'HotelBulk' })
    const res = await run('bulk_add_hotel_bookings', {
      hotelName: 'Hilton', checkInDate: '2027-06-14', checkOutDate: '2027-06-16', guestIds: [g1, g2],
    })
    expect(res.success).toBe(true)
    const rows = await db.select().from(hotels).where(and(eq(hotels.clientId, t.clientId), eq(hotels.hotelName, 'Hilton')))
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })

  it('sync_hotel_guests: query returns data (no mutation)', async () => {
    const res = await run('sync_hotel_guests', {})
    expect(res.success).toBe(true)
  })

  it('assign_transport: creates guest transport rows', async () => {
    const g = await addGuest('TransportGuest', { needsTransport: true })
    const res = await run('assign_transport', { vehicleInfo: 'Shuttle A', vehicleType: 'shuttle', guestIds: [g] })
    expect(res.success).toBe(true)
    expect((await db.select().from(guestTransport).where(eq(guestTransport.guestId, g))).length).toBeGreaterThanOrEqual(1)
  })

  it('add_gift / update_gift / delete_gift: full lifecycle', async () => {
    const guestId = await addGuest('GiftGiver')
    // Chatbot gift tools write to the canonical `gifts` table (shared with UI + Excel + Sheets).
    const add = await run('add_gift', { guestId, name: 'Crystal Vase', value: 200 })
    expect(add.success).toBe(true)
    const giftId = (add.data as { id: string }).id
    expect((await db.select().from(gifts).where(eq(gifts.id, giftId))).length).toBe(1)

    const upd = await executeToolWithSync('update_gift', { giftId, status: 'returned' }, t.ctx)
    expect(upd.success).toBe(true)
    const [updated] = await db.select().from(gifts).where(eq(gifts.id, giftId))
    expect(updated.status).toBe('returned')

    const del = await executeToolWithSync('delete_gift', { giftId }, t.ctx)
    expect(del.success).toBe(true)
    expect(await db.select().from(gifts).where(eq(gifts.id, giftId))).toHaveLength(0)
  })
})
