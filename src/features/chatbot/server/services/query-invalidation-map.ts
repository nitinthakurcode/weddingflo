/**
 * Query Invalidation Map
 *
 * February 2026 - Real-time sync between chatbot and module pages
 *
 * Maps chatbot tool calls to tRPC queries that need to be invalidated
 * when data changes via the chatbot.
 *
 * IMPORTANT: Every key must match a mutation tool name in TOOL_METADATA (definitions.ts).
 * Query path names must match the broadcastSync queryPaths used by UI routers.
 */

import {
  CLIENT_CREATE_ALL_PATHS,
  CLIENT_UPDATE_PATHS,
  GUEST_MUTATION_PATHS,
  VENDOR_MUTATION_PATHS,
  BUDGET_MUTATION_PATHS,
  EVENT_MUTATION_PATHS,
  EVENT_DELETE_PATHS,
  HOTEL_MUTATION_PATHS,
  TRANSPORT_MUTATION_PATHS,
} from '@/lib/sync/cascade-query-paths'

/**
 * Tool to Query mapping (31 mutation tools)
 * When a tool is executed, the listed queries should be invalidated.
 * queryPath names sourced from each module's router broadcastSync calls.
 */
export const TOOL_QUERY_MAP: Record<string, string[]> = {
  // Client tools — paths sourced from the shared cascade-query-paths constants so
  // they can never drift from clients.router.ts. create_client auto-creates a
  // wedding event (+timeline) and vendors (+budget), so it uses the full union.
  create_client: [...CLIENT_CREATE_ALL_PATHS],
  update_client: [...CLIENT_UPDATE_PATHS],

  // Guest tools — full guest cascade (rooms, transport, per-guest budget,
  // timeline, client stats). Sourced from the shared GUEST_MUTATION_PATHS so the
  // chatbot can never drift from guests.router.ts again.
  add_guest: [...GUEST_MUTATION_PATHS],
  update_guest_rsvp: [...GUEST_MUTATION_PATHS],
  bulk_update_guests: [...GUEST_MUTATION_PATHS],
  // check-in only flips a flag — intentionally lighter than the full cascade.
  check_in_guest: ['guests.getAll', 'guests.getStats'],
  assign_guests_to_events: ['guests.getAll', 'guests.getStats', 'events.getAll'],
  update_table_dietary: ['guests.getAll', 'guests.getStats'],

  // Event tools — matches events.router.ts (syncs linked timeline; no client row)
  create_event: [...EVENT_MUTATION_PATHS],
  update_event: [...EVENT_MUTATION_PATHS],

  // Timeline tools — matches timeline.router.ts procedure names
  add_timeline_item: ['timeline.getAll'],
  shift_timeline: ['timeline.getAll'],

  // Vendor tools — full vendor cascade (linked budget, timeline, client stats)
  add_vendor: [...VENDOR_MUTATION_PATHS],
  update_vendor: [...VENDOR_MUTATION_PATHS],

  // Hotel tools — matches hotels.router.ts (list + stats + linked timeline)
  add_hotel_booking: [...HOTEL_MUTATION_PATHS],
  bulk_add_hotel_bookings: [...HOTEL_MUTATION_PATHS],

  // Transport tools — matches guest-transport.router.ts (list + stats + timeline)
  assign_transport: [...TRANSPORT_MUTATION_PATHS],

  // Budget tools — feeds client stats
  update_budget_item: [...BUDGET_MUTATION_PATHS],

  // Gift tools — matches gifts.router.ts procedure names
  add_gift: ['gifts.getAll'],
  update_gift: ['gifts.getAll'],

  // Floor plan / Seating tools — matches floor-plans.router.ts procedure names
  add_seating_constraint: ['floorPlans.list'],

  // Communication tools (no broadcastSync in router)
  send_communication: ['communications.list'],

  // Pipeline tools (no broadcastSync in router)
  update_pipeline: ['pipeline.list'],

  // Creative tools (no broadcastSync in router)
  update_creative: ['creatives.list'],

  // Team tools (no broadcastSync in router)
  assign_team_member: ['team.list'],

  // Proposal/Invoice tools (no broadcastSync in router)
  create_proposal: ['proposals.list'],
  create_invoice: ['invoices.list'],

  // Website tools (no broadcastSync in router)
  update_website: ['websites.list'],

  // Workflow tools (no broadcastSync in router)
  create_workflow: ['workflows.list'],

  // Delete tools — sourced from the same shared constants as the UI routers
  delete_guest: [...GUEST_MUTATION_PATHS],
  delete_event: [...EVENT_DELETE_PATHS],
  delete_vendor: [...VENDOR_MUTATION_PATHS],
  delete_budget_item: [...BUDGET_MUTATION_PATHS, 'timeline.getAll'],
  delete_timeline_item: ['timeline.getAll'],
  delete_gift: ['gifts.getAll'],

  // Side-effect-only tools (no cache invalidation needed)
  generate_qr_codes: [],
  sync_calendar: [],
}

/**
 * Get queries to invalidate for a given tool
 */
export function getQueriesToInvalidate(toolName: string): string[] {
  return TOOL_QUERY_MAP[toolName] || []
}

/**
 * Check if a tool is a query-only tool (doesn't modify data)
 * Must match the 14 query tools in TOOL_METADATA (definitions.ts)
 */
export function isQueryOnlyTool(toolName: string): boolean {
  const queryTools = [
    'get_client_summary',
    'get_wedding_summary',
    'get_recommendations',
    'get_guest_stats',
    'sync_hotel_guests',
    'get_budget_overview',
    'budget_currency_convert',
    'search_entities',
    'query_data',
    'query_cross_client_events',
    'export_data',
    'query_analytics',
    'get_weather',
    'get_document_upload_url',
  ]

  return queryTools.includes(toolName)
}

/**
 * Module to primary query mapping
 * Used for determining which module page needs to refresh.
 * Uses the same queryPath names as UI router broadcastSync calls.
 */
export const MODULE_PRIMARY_QUERIES: Record<string, string[]> = {
  guests: ['guests.getAll', 'guests.getStats'],
  events: ['events.getAll'],
  budget: ['budget.getAll', 'budget.getSummary'],
  vendors: ['vendors.getAll'],
  hotels: ['hotels.getAll'],
  transport: ['guestTransport.getAll'],
  timeline: ['timeline.getAll'],
  gifts: ['gifts.getAll'],
  floorPlan: ['floorPlans.list'],
  pipeline: ['pipeline.list'],
  communications: ['communications.list'],
  creatives: ['creatives.list'],
  team: ['team.list'],
  proposals: ['proposals.list'],
  invoices: ['invoices.list'],
  websites: ['websites.list'],
  workflows: ['workflows.list'],
}

/**
 * Get affected modules for a tool call
 */
export function getAffectedModules(toolName: string): string[] {
  const queries = getQueriesToInvalidate(toolName)
  const modules: Set<string> = new Set()

  for (const [module, moduleQueries] of Object.entries(MODULE_PRIMARY_QUERIES)) {
    if (moduleQueries.some(q => queries.includes(q))) {
      modules.add(module)
    }
  }

  return Array.from(modules)
}
