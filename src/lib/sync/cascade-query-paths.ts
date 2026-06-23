/**
 * Cascade Query Paths — Single source of truth for the broadcastSync queryPaths
 * triggered by client create/update.
 *
 * A client create/update can cascade into events, timeline, vendors and budget
 * (auto-created "Main Wedding" event + auto-created vendors/budget items). These
 * paths MUST stay identical between:
 *   - clients.router.ts broadcastSync calls (UI/tRPC path)
 *   - query-invalidation-map.ts TOOL_QUERY_MAP (chatbot path)
 *
 * Historically these two drifted (the chatbot's create_client only invalidated
 * clients.list/getAll while the tRPC path invalidated the full cascade), leaving
 * the Events/Timeline/Vendors/Budget modules stale after a chatbot create. Both
 * now import from here so they can never drift again.
 *
 * Every string MUST match a real tRPC procedure name (CLAUDE.md rule 14).
 */

/** Always invalidated by a client create. */
export const CLIENT_CREATE_BASE_PATHS = ['clients.list', 'clients.getAll'] as const

/** Added when a "Main Wedding" event is auto-created (wedding_date present). */
export const CLIENT_CREATE_EVENT_PATHS = ['events.getAll', 'timeline.getAll'] as const

/** Added when vendors (+ their budget items) are auto-created. */
export const CLIENT_CREATE_VENDOR_PATHS = [
  'vendors.getAll',
  'vendors.getStats',
  'budget.getAll',
  'budget.getSummary',
  'timeline.getAll',
] as const

/**
 * Full deduped union for client create. The chatbot's create_client always runs
 * every cascade branch, so it uses this union (over-invalidation is harmless —
 * it just refetches). The tRPC clients.create builds its set conditionally from
 * the segment constants above.
 */
export const CLIENT_CREATE_ALL_PATHS: string[] = Array.from(
  new Set<string>([
    ...CLIENT_CREATE_BASE_PATHS,
    ...CLIENT_CREATE_EVENT_PATHS,
    ...CLIENT_CREATE_VENDOR_PATHS,
  ])
)

/**
 * Invalidated by a client update. Includes events.getAll + timeline.getAll
 * because updating wedding_date/venue/guest_count/wedding_name syncs into the
 * main event row and shifts its linked timeline items.
 */
export const CLIENT_UPDATE_PATHS = [
  'clients.list',
  'clients.getAll',
  'clients.getById',
  'events.getAll',
  'timeline.getAll',
] as const

/* ────────────────────────────────────────────────────────────────────────────
 * Per-module mutation paths — single source of truth for the broadcastSync
 * queryPaths of every create/update/delete in each module. The UI routers, the
 * chatbot TOOL_QUERY_MAP (query-invalidation-map.ts) and the Excel/Sheets import
 * router all import these so the three paths can never drift again.
 *
 * Contents are fact-checked against the actual data coupling:
 *  - Guests/Vendors/Budget mutations call recalcClientStats → include clients.*
 *    (client dashboard cards read weddingDate/guestCount/budget from the clients
 *     table, which those recalcs update).
 *  - Events/Hotels/Transport mutations do NOT touch the clients row or client
 *    stats (clients→event sync is one-directional; hotel/transport costs are not
 *    in client stats) → they deliberately OMIT clients.* (no-op invalidation).
 *  - Hotels/Transport include their *.getStats so stat cards refresh too.
 *
 * Every string MUST match a real tRPC procedure name (CLAUDE.md rule 14).
 * ──────────────────────────────────────────────────────────────────────────── */

/** Guest create/update/delete/RSVP/bulk-import — cascades into rooms, transport,
 *  per-guest budget, timeline and client stats. Matches guests.router.ts. */
export const GUEST_MUTATION_PATHS = [
  'guests.getAll',
  'guests.getStats',
  'hotels.getAll',
  'guestTransport.getAll',
  'timeline.getAll',
  'budget.getSummary',
  'clients.list',
  'clients.getAll',
] as const

/** Vendor create/update/delete — cascades into linked budget items, timeline and
 *  client stats. Matches vendors.router.ts. */
export const VENDOR_MUTATION_PATHS = [
  'vendors.getAll',
  'vendors.getStats',
  'budget.getAll',
  'budget.getSummary',
  'timeline.getAll',
  'clients.list',
  'clients.getAll',
] as const

/** Budget create/update/delete — feeds client stats. Matches budget.router.ts. */
export const BUDGET_MUTATION_PATHS = [
  'budget.getAll',
  'budget.getSummary',
  'clients.list',
  'clients.getAll',
] as const

/** Event create/update — syncs the linked timeline entry. Does NOT write back to
 *  the clients row, so NO clients.* (would be a no-op). Matches events.router.ts. */
export const EVENT_MUTATION_PATHS = ['events.getAll', 'timeline.getAll'] as const

/** Event delete additionally frees guests assigned to the event. */
export const EVENT_DELETE_PATHS = ['events.getAll', 'timeline.getAll', 'guests.getAll'] as const

/** Hotel/room create/update/delete — refreshes hotel list + stat cards and the
 *  linked timeline. No client-stat coupling. */
export const HOTEL_MUTATION_PATHS = ['hotels.getAll', 'hotels.getStats', 'timeline.getAll'] as const

/** Guest-transport create/update/delete — refreshes transport list + stat cards
 *  and the linked timeline. No client-stat coupling. */
export const TRANSPORT_MUTATION_PATHS = [
  'guestTransport.getAll',
  'guestTransport.getStats',
  'timeline.getAll',
] as const
