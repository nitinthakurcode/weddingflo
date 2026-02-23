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

/**
 * Tool to Query mapping (31 mutation tools)
 * When a tool is executed, the listed queries should be invalidated.
 * queryPath names sourced from each module's router broadcastSync calls.
 */
export const TOOL_QUERY_MAP: Record<string, string[]> = {
  // Client tools (no broadcastSync in router — use conventional names)
  create_client: ['clients.list'],
  update_client: ['clients.list'],

  // Guest tools (from guests.router.ts broadcastSync)
  add_guest: ['guests.list', 'guests.getStats', 'hotels.list', 'guestTransport.list', 'budget.overview'],
  update_guest_rsvp: ['guests.list', 'guests.getStats', 'budget.overview'],
  bulk_update_guests: ['guests.list', 'guests.getStats'],
  check_in_guest: ['guests.list', 'guests.getStats'],
  assign_guests_to_events: ['guests.list', 'events.list'],
  update_table_dietary: ['guests.list'],

  // Event tools (from events.router.ts broadcastSync)
  create_event: ['events.list', 'timeline.list'],
  update_event: ['events.list', 'timeline.list'],

  // Timeline tools (from timeline.router.ts broadcastSync)
  add_timeline_item: ['timeline.list'],
  shift_timeline: ['timeline.list'],

  // Vendor tools (from vendors.router.ts broadcastSync)
  add_vendor: ['vendors.list', 'budget.list', 'timeline.list'],
  update_vendor: ['vendors.list', 'budget.list'],

  // Hotel tools (from hotels.router.ts broadcastSync)
  add_hotel_booking: ['hotels.list'],
  bulk_add_hotel_bookings: ['hotels.list'],

  // Transport tools (from guest-transport.router.ts broadcastSync)
  assign_transport: ['guestTransport.list'],

  // Budget tools (from budget.router.ts broadcastSync)
  update_budget_item: ['budget.list', 'budget.overview'],

  // Gift tools (from gifts.router.ts broadcastSync)
  add_gift: ['gifts.list'],
  update_gift: ['gifts.list'],

  // Floor plan / Seating tools (from floor-plans.router.ts broadcastSync)
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

  // Delete tools (from UI router broadcastSync queryPaths)
  delete_guest: ['guests.list', 'guests.getStats', 'hotels.list', 'guestTransport.list', 'budget.overview'],
  delete_event: ['events.list', 'timeline.list', 'guests.list'],
  delete_vendor: ['vendors.list', 'budget.list', 'timeline.list'],
  delete_budget_item: ['budget.list', 'budget.overview', 'timeline.list'],
  delete_timeline_item: ['timeline.list'],
  delete_gift: ['gifts.list'],

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
  guests: ['guests.list', 'guests.getStats'],
  events: ['events.list'],
  budget: ['budget.list', 'budget.overview'],
  vendors: ['vendors.list'],
  hotels: ['hotels.list'],
  transport: ['guestTransport.list'],
  timeline: ['timeline.list'],
  gifts: ['gifts.list'],
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
