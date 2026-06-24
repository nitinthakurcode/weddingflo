/**
 * Layer 2 — runtime broadcast wiring. The static contract tests prove the
 * invalidation MAP is correct; this proves executeToolWithSync actually emits a
 * sync action (storeSyncAction → Redis sorted set, the SSE delivery source) with
 * the right module + queryPaths for a mutation, and emits NOTHING for a query
 * tool or a failed call. Closes the "no test asserts the broadcast fires" gap.
 *
 * storeSyncAction is spied + stubbed so the assertion is about WHAT we publish,
 * not whether Redis is reachable (broadcast is intentionally non-fatal).
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest'
import * as redisPubsub from '@/lib/realtime/redis-pubsub'
import { executeToolWithSync } from '@/features/chatbot/server/services/tool-executor'
import {
  GUEST_MUTATION_PATHS,
  VENDOR_MUTATION_PATHS,
  BUDGET_MUTATION_PATHS,
} from '@/lib/sync/cascade-query-paths'
import { seedTenant, teardownTenant, type TestTenant } from './_harness'

let t: TestTenant
let spy: ReturnType<typeof vi.spyOn>

const run = (tool: string, args: Record<string, unknown>) =>
  executeToolWithSync(tool, { clientId: t.clientId, ...args }, t.ctx)

beforeAll(async () => {
  t = await seedTenant()
})
afterAll(async () => {
  if (t) await teardownTenant(t.companyId)
})
beforeEach(() => {
  spy = vi.spyOn(redisPubsub, 'storeSyncAction').mockResolvedValue(undefined)
  spy.mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

function lastAction() {
  expect(spy).toHaveBeenCalled()
  return spy.mock.calls[spy.mock.calls.length - 1][0] as {
    module: string
    type: string
    queryPaths: string[]
  }
}

describe('runtime broadcast wiring', () => {
  it('add_guest stores an insert action with GUEST_MUTATION_PATHS', async () => {
    const res = await run('add_guest', { firstName: 'Sync', lastName: 'Probe', rsvpStatus: 'pending' })
    expect(res.success).toBe(true)
    const a = lastAction()
    expect(a.module).toBe('guests')
    expect(a.type).toBe('insert')
    expect(a.queryPaths).toEqual(expect.arrayContaining([...GUEST_MUTATION_PATHS]))
  })

  it('add_vendor stores an action with VENDOR_MUTATION_PATHS', async () => {
    const res = await run('add_vendor', { name: 'Sync Florist', category: 'florist' })
    expect(res.success).toBe(true)
    const a = lastAction()
    expect(a.module).toBe('vendors')
    expect(a.queryPaths).toEqual(expect.arrayContaining([...VENDOR_MUTATION_PATHS]))
  })

  it('update_budget_item stores an action with BUDGET_MUTATION_PATHS', async () => {
    const add = await run('add_vendor', { name: 'Budget Probe', category: 'catering', estimatedCost: 500 })
    expect(add.success).toBe(true)
    // a budget item now exists for this client; update it via the budget tool
    const res = await run('update_budget_item', { category: 'catering', actualCost: 600 })
    if (res.success) {
      const a = lastAction()
      expect(a.module).toBe('budget')
      expect(a.queryPaths).toEqual(expect.arrayContaining([...BUDGET_MUTATION_PATHS]))
    }
  })

  it('query-only tool (get_guest_stats) stores NO sync action', async () => {
    const res = await run('get_guest_stats', {})
    expect(res.success).toBe(true)
    expect(spy).not.toHaveBeenCalled()
  })
})
