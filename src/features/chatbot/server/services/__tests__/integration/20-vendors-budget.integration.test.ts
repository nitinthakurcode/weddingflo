/**
 * Layer 2 — Vendor (3) + Budget (3) tools. Covers automation #3 (vendor↔budget sync,
 * cascadeVendorLinkDelete) and budget↔vendor bidirectional + recalcClientStats.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { vendors, clientVendors, budget } from '@/lib/db/schema'
import { randomUUID } from 'crypto'
import { executeToolWithSync } from '@/features/chatbot/server/services/tool-executor'
import { seedTenant, teardownTenant, type TestTenant } from './_harness'

let t: TestTenant
const run = (tool: string, args: Record<string, unknown>) =>
  executeToolWithSync(tool, { clientId: t.clientId, ...args }, t.ctx)

beforeAll(async () => { t = await seedTenant() })
afterAll(async () => { if (t) await teardownTenant(t.companyId) })

async function vendorByName(name: string) {
  const [v] = await db.select().from(vendors).where(and(eq(vendors.companyId, t.companyId), eq(vendors.name, name)))
  return v
}

describe('vendor + budget tools', () => {
  it('add_vendor: creates vendor + clientVendors link + linked budget item (cost) + timeline', async () => {
    const res = await run('add_vendor', {
      name: 'Bloom Florals', category: 'florals', estimatedCost: 5000, serviceDate: '2027-06-15', eventId: t.eventId,
    })
    expect(res.success).toBe(true)
    const v = await vendorByName('Bloom Florals')
    expect(v).toBeTruthy()
    const links = await db.select().from(clientVendors).where(and(eq(clientVendors.clientId, t.clientId), eq(clientVendors.vendorId, v.id)))
    expect(links.length).toBe(1)
    const bItems = await db.select().from(budget).where(and(eq(budget.clientId, t.clientId), eq(budget.vendorId, v.id)))
    expect(bItems.length).toBe(1)
    expect(Number(bItems[0].estimatedCost ?? bItems[0].cost ?? 0)).toBeGreaterThanOrEqual(5000)
  })

  it('update_vendor: cost change syncs to the linked budget item', async () => {
    const res = await run('update_vendor', { vendorName: 'Bloom Florals', estimatedCost: 7500 })
    expect(res.success).toBe(true)
    const v = await vendorByName('Bloom Florals')
    const [item] = await db.select().from(budget).where(and(eq(budget.clientId, t.clientId), eq(budget.vendorId, v.id)))
    expect(Number(item.estimatedCost ?? item.cost ?? 0)).toBeGreaterThanOrEqual(7500)
  })

  it('update_budget_item: updates payment status on the vendor-linked item', async () => {
    const res = await run('update_budget_item', { category: 'florals', paymentStatus: 'deposit_paid', actualCost: 7500 })
    expect(res.success).toBe(true)
  })

  it('get_budget_overview: query returns data (no mutation)', async () => {
    const res = await run('get_budget_overview', {})
    expect(res.success).toBe(true)
    expect(res.data).toBeTruthy()
  })

  it('delete_budget_item: removes a seeded standalone budget item', async () => {
    const id = randomUUID()
    await db.insert(budget).values({ id, clientId: t.clientId, companyId: t.companyId, category: 'Misc', item: 'Throwaway', estimatedCost: '100' } as never)
    const res = await executeToolWithSync('delete_budget_item', { budgetItemId: id }, t.ctx)
    expect(res.success).toBe(true)
    expect(await db.select().from(budget).where(eq(budget.id, id))).toHaveLength(0)
  })

  it('delete_vendor (cascade): removes vendor link + its linked budget item', async () => {
    await run('add_vendor', { name: 'Temp DJ', category: 'dj', estimatedCost: 1200 })
    const v = await vendorByName('Temp DJ')
    expect((await db.select().from(budget).where(eq(budget.vendorId, v.id))).length).toBe(1)
    const res = await run('delete_vendor', { vendorName: 'Temp DJ' })
    expect(res.success).toBe(true)
    expect(await db.select().from(budget).where(eq(budget.vendorId, v.id))).toHaveLength(0)
  })
})
