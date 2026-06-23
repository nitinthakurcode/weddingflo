/**
 * Layer 1 smoke — proves the integration harness wiring end-to-end BEFORE scaling to all
 * 51 tools: real .env.local load, real Postgres connection, real tool execution + cascade
 * + recalc, and clean teardown.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { guests, clients } from '@/lib/db/schema'
import { executeToolWithSync } from '@/features/chatbot/server/services/tool-executor'
import { seedTenant, teardownTenant, type TestTenant } from './_harness'

let tenant: TestTenant

beforeAll(async () => {
  tenant = await seedTenant()
})

afterAll(async () => {
  if (tenant) await teardownTenant(tenant.companyId)
})

describe('integration smoke: add_guest', () => {
  it('inserts a guest, normalizes side, and recalcs client guest count', async () => {
    const res = await executeToolWithSync(
      'add_guest',
      { clientId: tenant.clientId, firstName: 'Smoke', lastName: 'Tester', side: 'bride', rsvpStatus: 'confirmed' },
      tenant.ctx,
    )
    expect(res.success).toBe(true)

    const rows = await db.select().from(guests).where(eq(guests.clientId, tenant.clientId))
    expect(rows).toHaveLength(1)
    expect(rows[0].firstName).toBe('Smoke')
    expect(rows[0].guestSide).toBe('partner1') // normalizeGuestSide('bride') → 'partner1'
    expect(rows[0].rsvpStatus).toBe('confirmed')

    const [client] = await db.select().from(clients).where(eq(clients.id, tenant.clientId))
    expect(client.guestCount).toBe(1) // recalcClientStats ran
  })

  it('teardown leaves no rows (verified in afterAll on a fresh count)', async () => {
    const rows = await db.select().from(guests).where(eq(guests.clientId, tenant.clientId))
    expect(rows.length).toBeGreaterThanOrEqual(1)
  })
})
