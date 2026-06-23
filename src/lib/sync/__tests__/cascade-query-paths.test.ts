/**
 * Guards against the exact drift bug this refactor fixed: the chatbot's
 * create_client / update_client invalidation sets must stay identical to the
 * shared cascade-query-paths constants used by clients.router broadcastSync.
 */

import {
  CLIENT_CREATE_BASE_PATHS,
  CLIENT_CREATE_EVENT_PATHS,
  CLIENT_CREATE_VENDOR_PATHS,
  CLIENT_CREATE_ALL_PATHS,
  CLIENT_UPDATE_PATHS,
  GUEST_MUTATION_PATHS,
  VENDOR_MUTATION_PATHS,
  BUDGET_MUTATION_PATHS,
  EVENT_MUTATION_PATHS,
  EVENT_DELETE_PATHS,
  HOTEL_MUTATION_PATHS,
  TRANSPORT_MUTATION_PATHS,
} from '../cascade-query-paths'
import { TOOL_QUERY_MAP } from '@/features/chatbot/server/services/query-invalidation-map'

describe('cascade-query-paths', () => {
  it('CLIENT_CREATE_ALL_PATHS is the deduped union of every create segment', () => {
    const expected = Array.from(
      new Set<string>([
        ...CLIENT_CREATE_BASE_PATHS,
        ...CLIENT_CREATE_EVENT_PATHS,
        ...CLIENT_CREATE_VENDOR_PATHS,
      ])
    )
    expect([...CLIENT_CREATE_ALL_PATHS].sort()).toEqual(expected.sort())
    // No duplicates
    expect(new Set(CLIENT_CREATE_ALL_PATHS).size).toBe(CLIENT_CREATE_ALL_PATHS.length)
  })

  it('always invalidates the client list queries on create', () => {
    expect(CLIENT_CREATE_ALL_PATHS).toEqual(expect.arrayContaining(['clients.list', 'clients.getAll']))
  })

  it('create cascade covers events, timeline, vendors and budget', () => {
    expect(CLIENT_CREATE_ALL_PATHS).toEqual(
      expect.arrayContaining([
        'events.getAll',
        'timeline.getAll',
        'vendors.getAll',
        'vendors.getStats',
        'budget.getAll',
        'budget.getSummary',
      ])
    )
  })

  it('update cascade includes events + timeline (wedding fields sync into the event)', () => {
    expect(CLIENT_UPDATE_PATHS).toEqual(
      expect.arrayContaining([
        'clients.list',
        'clients.getAll',
        'clients.getById',
        'events.getAll',
        'timeline.getAll',
      ])
    )
  })

  describe('chatbot TOOL_QUERY_MAP stays in sync (no drift)', () => {
    it('create_client === CLIENT_CREATE_ALL_PATHS', () => {
      expect(TOOL_QUERY_MAP.create_client).toEqual([...CLIENT_CREATE_ALL_PATHS])
    })

    it('update_client === CLIENT_UPDATE_PATHS', () => {
      expect(TOOL_QUERY_MAP.update_client).toEqual([...CLIENT_UPDATE_PATHS])
    })
  })

  /**
   * Drift guard for every other mutation tool: the chatbot's invalidation set for
   * a tool must be a SUPERSET of the canonical per-module constant the UI routers
   * use. Over-invalidation (extra paths) is harmless; UNDER-invalidation is the
   * bug we keep regressing (e.g. chatbot add_guest forgetting clients.*), so this
   * fails CI whenever a tool drops a path the router still broadcasts.
   */
  describe('chatbot mutation tools are a superset of the module constants', () => {
    const cases: Array<[string, readonly string[]]> = [
      ['add_guest', GUEST_MUTATION_PATHS],
      ['update_guest_rsvp', GUEST_MUTATION_PATHS],
      ['bulk_update_guests', GUEST_MUTATION_PATHS],
      ['delete_guest', GUEST_MUTATION_PATHS],
      ['add_vendor', VENDOR_MUTATION_PATHS],
      ['update_vendor', VENDOR_MUTATION_PATHS],
      ['delete_vendor', VENDOR_MUTATION_PATHS],
      ['update_budget_item', BUDGET_MUTATION_PATHS],
      ['delete_budget_item', BUDGET_MUTATION_PATHS],
      ['create_event', EVENT_MUTATION_PATHS],
      ['update_event', EVENT_MUTATION_PATHS],
      ['delete_event', EVENT_DELETE_PATHS],
      ['add_hotel_booking', HOTEL_MUTATION_PATHS],
      ['bulk_add_hotel_bookings', HOTEL_MUTATION_PATHS],
      ['assign_transport', TRANSPORT_MUTATION_PATHS],
    ]

    it.each(cases)('%s ⊇ its module constant', (tool, constant) => {
      const actual = TOOL_QUERY_MAP[tool]
      expect(actual, `TOOL_QUERY_MAP is missing tool "${tool}"`).toBeDefined()
      expect(actual).toEqual(expect.arrayContaining([...constant]))
    })
  })

  it('guest/vendor/budget mutations always refresh the dashboard client cards', () => {
    for (const c of [GUEST_MUTATION_PATHS, VENDOR_MUTATION_PATHS, BUDGET_MUTATION_PATHS]) {
      expect(c).toEqual(expect.arrayContaining(['clients.list', 'clients.getAll']))
    }
  })

  it('event/hotel/transport mutations do NOT invalidate client cards (no stat coupling)', () => {
    for (const c of [EVENT_MUTATION_PATHS, HOTEL_MUTATION_PATHS, TRANSPORT_MUTATION_PATHS]) {
      expect(c).not.toContain('clients.list')
      expect(c).not.toContain('clients.getAll')
    }
  })
})
