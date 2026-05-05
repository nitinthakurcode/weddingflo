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
 * Tool to Query mapping (49 mutation tools)
 * When a tool is executed, the listed queries should be invalidated.
 * queryPath names sourced from each module's router broadcastSync calls.
 */
export const TOOL_QUERY_MAP: Record<string, string[]> = {
  // Client tools — matches clients.router.ts procedure names
  create_client: ['clients.list', 'clients.getAll'],
  update_client: ['clients.list', 'clients.getAll', 'clients.getById'],

  // Guest tools — matches guests.router.ts procedure names
  add_guest: ['guests.getAll', 'guests.getStats', 'hotels.getAll', 'guestTransport.getAll', 'budget.getSummary'],
  update_guest_rsvp: ['guests.getAll', 'guests.getStats', 'budget.getSummary'],
  bulk_update_guests: ['guests.getAll', 'guests.getStats', 'hotels.getAll', 'guestTransport.getAll', 'budget.getSummary'],
  check_in_guest: ['guests.getAll', 'guests.getStats'],
  assign_guests_to_events: ['guests.getAll', 'guests.getStats', 'events.getAll'],
  update_table_dietary: ['guests.getAll', 'guests.getStats'],

  // Event tools — matches events.router.ts procedure names
  create_event: ['events.getAll', 'timeline.getAll'],
  update_event: ['events.getAll', 'timeline.getAll'],

  // Timeline tools — matches timeline.router.ts procedure names
  add_timeline_item: ['timeline.getAll'],
  update_timeline_item: ['timeline.getAll', 'timeline.getStats'],
  shift_timeline: ['timeline.getAll'],

  // Vendor tools — matches vendors.router.ts procedure names (includes cascade targets)
  add_vendor: ['vendors.getAll', 'budget.getAll', 'timeline.getAll'],
  update_vendor: ['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary', 'timeline.getAll', 'clients.list', 'clients.getAll'],

  // Hotel tools — matches hotels.router.ts procedure names
  add_hotel_booking: ['hotels.getAll'],
  update_hotel_booking: ['hotels.getAll'],
  delete_hotel_booking: ['hotels.getAll'],
  bulk_add_hotel_bookings: ['hotels.getAll'],

  // Transport tools — matches guest-transport.router.ts procedure names
  assign_transport: ['guestTransport.getAll'],
  update_transport: ['guestTransport.getAll'],
  delete_transport: ['guestTransport.getAll'],

  // Budget tools — matches budget.router.ts procedure names
  create_budget_item: ['budget.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll'],
  update_budget_item: ['budget.getAll', 'budget.getSummary'],

  // Gift tools — matches gifts.router.ts procedure names
  add_gift: ['gifts.getAll'],
  update_gift: ['gifts.getAll'],

  // Floor plan / Seating tools — matches floor-plans.router.ts procedure names
  add_seating_constraint: ['floorPlans.list'],
  delete_seating_constraint: ['floorPlans.list'],

  // Communication tools (no dedicated communications router — emails/sms/whatsapp are separate routers)
  send_communication: [],

  // Pipeline tools
  create_pipeline_lead: ['pipeline.list'],
  update_pipeline: ['pipeline.list'],
  delete_pipeline_lead: ['pipeline.list'],

  // Creative tools — creatives router uses getAll
  create_creative: ['creatives.getAll'],
  update_creative: ['creatives.getAll'],
  delete_creative: ['creatives.getAll'],

  // Team tools — team router uses listTeamMembers
  assign_team_member: ['team.listTeamMembers'],

  // Proposal tools — proposals router uses getAll
  create_proposal: ['proposals.getAll'],
  update_proposal: ['proposals.getAll'],
  delete_proposal: ['proposals.getAll'],

  // Contract tools
  create_contract: ['clients.list'],
  update_contract: ['clients.list'],
  delete_contract: ['clients.list'],

  // Invoice tools — invalidate client list (client summary includes invoice status)
  create_invoice: ['clients.list', 'clients.getAll'],
  update_invoice: ['clients.list', 'clients.getAll'],
  delete_invoice: ['clients.list', 'clients.getAll'],

  // Questionnaire tools
  create_questionnaire: ['clients.list'],
  update_questionnaire: ['clients.list'],
  delete_questionnaire: ['clients.list'],

  // Website tools
  create_website: ['websites.list'],
  update_website: ['websites.list'],
  delete_website: ['websites.list'],

  // Workflow tools — workflows router uses getAll
  create_workflow: ['workflows.getAll'],
  update_workflow: ['workflows.getAll'],
  delete_workflow: ['workflows.getAll'],

  // Delete tools — matches UI router broadcastSync queryPaths
  delete_guest: ['guests.getAll', 'guests.getStats', 'hotels.getAll', 'guestTransport.getAll', 'budget.getSummary'],
  delete_event: ['events.getAll', 'timeline.getAll', 'guests.getAll'],
  delete_vendor: ['vendors.getAll', 'budget.getAll', 'timeline.getAll'],
  delete_budget_item: ['budget.getAll', 'budget.getSummary', 'timeline.getAll'],
  delete_timeline_item: ['timeline.getAll'],
  delete_gift: ['gifts.getAll'],
  delete_client: ['clients.list', 'clients.getAll', 'guests.getAll', 'guests.getStats', 'budget.getAll', 'budget.getSummary', 'vendors.getAll', 'events.getAll', 'timeline.getAll', 'hotels.getAll', 'guestTransport.getAll', 'gifts.getAll', 'floorPlans.list'],

  // Document & E-Signature tools (April 2026)
  create_document: ['clients.list'],
  update_document: ['clients.list'],
  delete_document: ['clients.list'],
  request_signature: ['clients.list'],
  send_signature_reminder: ['clients.list'],
  cancel_signature_request: ['clients.list'],

  // Payment tools (April 2026)
  record_payment: ['clients.list', 'clients.getAll', 'budget.getSummary'],
  create_refund: ['clients.list', 'clients.getAll', 'budget.getSummary'],

  // Floor Plan tools (April 2026)
  create_floor_plan: ['floorPlans.list'],
  add_table: ['floorPlans.list', 'floorPlans.getById'],
  remove_table: ['floorPlans.list', 'floorPlans.getById'],
  assign_guest_to_table: ['floorPlans.list', 'floorPlans.getById', 'guests.getAll'],
  batch_assign_guests: ['floorPlans.list', 'floorPlans.getById', 'guests.getAll'],

  // Pipeline Enhancement tools (April 2026)
  create_pipeline_stage: ['pipeline.list'],
  convert_lead_to_client: ['pipeline.list', 'clients.list', 'clients.getAll'],
  create_pipeline_activity: ['pipeline.list'],

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
 * Must match the 19 query tools in TOOL_METADATA (definitions.ts)
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
    'get_document_audit_trail',
    'get_payment_stats',
    'get_questionnaire_responses',
    'get_website_analytics',
    'get_floor_plan_summary',
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
  creatives: ['creatives.getAll'],
  team: ['team.listTeamMembers'],
  proposals: ['proposals.getAll'],
  websites: ['websites.list'],
  workflows: ['workflows.getAll'],
  documents: ['clients.list'],
  payments: ['clients.list', 'budget.getSummary'],
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
