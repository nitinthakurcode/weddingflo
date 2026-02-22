/**
 * Query Invalidation Map
 *
 * February 2026 - Real-time sync between chatbot and module pages
 *
 * Maps chatbot tool calls to tRPC queries that need to be invalidated
 * when data changes via the chatbot.
 */

/**
 * Tool to Query mapping
 * When a tool is executed, the listed queries should be invalidated
 */
export const TOOL_QUERY_MAP: Record<string, string[]> = {
  // Guest tools
  add_guest: ['guests.getAll', 'guests.getForClient', 'chatbot.getContext'],
  update_guest: ['guests.getAll', 'guests.getById', 'guests.getForClient'],
  update_guest_rsvp: ['guests.getAll', 'guests.getById', 'budget.getAll', 'budget.getSummary'],
  delete_guest: ['guests.getAll', 'guests.getForClient', 'chatbot.getContext'],
  bulk_update_guests: ['guests.getAll', 'guests.getForClient'],

  // Event tools
  create_event: ['events.getAll', 'events.getForClient', 'events.getUpcoming', 'timeline.getAll', 'chatbot.getContext'],
  update_event: ['events.getAll', 'events.getById', 'events.getUpcoming', 'timeline.getAll'],
  delete_event: ['events.getAll', 'events.getForClient', 'events.getUpcoming', 'timeline.getAll'],
  update_event_status: ['events.getAll', 'events.getById'],

  // Budget tools
  create_budget_item: ['budget.getAll', 'budget.getSummary', 'budget.getForClient', 'chatbot.getContext'],
  update_budget_item: ['budget.getAll', 'budget.getSummary', 'budget.getById'],
  delete_budget_item: ['budget.getAll', 'budget.getSummary', 'budget.getForClient'],
  record_payment: ['budget.getAll', 'budget.getSummary', 'budget.getById'],

  // Vendor tools
  add_vendor: ['vendors.getAll', 'vendors.getForClient', 'chatbot.getContext'],
  update_vendor: ['vendors.getAll', 'vendors.getById', 'vendors.getForClient'],
  delete_vendor: ['vendors.getAll', 'vendors.getForClient'],
  assign_vendor_to_client: ['vendors.getForClient', 'clientVendors.getAll'],
  update_vendor_payment: ['vendors.getForClient', 'clientVendors.getAll', 'budget.getSummary'],

  // Hotel/Accommodation tools
  create_hotel_booking: ['hotels.getAll', 'hotels.getAllWithGuests', 'hotels.getCapacitySummary', 'timeline.getAll'],
  update_hotel_booking: ['hotels.getAll', 'hotels.getById', 'hotels.getCapacitySummary', 'timeline.getAll'],
  delete_hotel_booking: ['hotels.getAll', 'hotels.getCapacitySummary', 'timeline.getAll'],
  check_in_guest: ['hotels.getAll', 'hotels.getStats'],

  // Transport tools
  create_transport: ['transport.getAll', 'transport.getForClient', 'timeline.getAll'],
  update_transport: ['transport.getAll', 'transport.getById', 'timeline.getAll'],
  delete_transport: ['transport.getAll', 'transport.getForClient', 'timeline.getAll'],

  // Timeline tools
  create_timeline_item: ['timeline.getAll', 'timeline.getForClient', 'timeline.getForEvent'],
  update_timeline_item: ['timeline.getAll', 'timeline.getById', 'timeline.getForEvent'],
  delete_timeline_item: ['timeline.getAll', 'timeline.getForClient', 'timeline.getForEvent'],
  complete_timeline_item: ['timeline.getAll', 'timeline.getById'],

  // Gift tools
  add_gift: ['gifts.getAll', 'gifts.getForClient', 'guestGifts.getAll'],
  update_gift: ['gifts.getAll', 'gifts.getById'],
  delete_gift: ['gifts.getAll', 'gifts.getForClient'],
  record_gift_delivery: ['gifts.getAll', 'guestGifts.getAll'],

  // Client tools
  create_client: ['clients.getAll', 'clients.getForCompany', 'chatbot.getContext'],
  update_client: ['clients.getAll', 'clients.getById', 'chatbot.getContext'],
  delete_client: ['clients.getAll', 'clients.getForCompany'],

  // Floor plan tools
  assign_guest_to_table: ['floorPlans.getById', 'floorPlanGuests.getAll'],
  remove_guest_from_table: ['floorPlans.getById', 'floorPlanGuests.getAll'],
  create_table: ['floorPlans.getById', 'floorPlanTables.getAll'],
  update_table: ['floorPlans.getById', 'floorPlanTables.getById'],

  // Import/Export
  bulk_import: ['guests.getAll', 'hotels.getAll', 'transport.getAll', 'budget.getAll', 'vendors.getAll'],
  sync_to_sheets: ['googleSheets.getSyncStatus'],
  import_from_sheets: ['guests.getAll', 'hotels.getAll', 'transport.getAll', 'budget.getAll', 'vendors.getAll', 'timeline.getAll', 'gifts.getAll'],
}

/**
 * Get queries to invalidate for a given tool
 */
export function getQueriesToInvalidate(toolName: string): string[] {
  return TOOL_QUERY_MAP[toolName] || []
}

/**
 * Check if a tool is a query-only tool (doesn't modify data)
 */
export function isQueryOnlyTool(toolName: string): boolean {
  const queryTools = [
    'get_client_info',
    'get_guests',
    'get_guest_by_name',
    'get_events',
    'get_budget_summary',
    'get_vendors',
    'get_timeline',
    'get_hotels',
    'get_transport',
    'get_gifts',
    'search_guests',
    'search_vendors',
    'get_floor_plan',
    'get_statistics',
    'get_wedding_summary',
  ]

  return queryTools.includes(toolName)
}

/**
 * Module to primary query mapping
 * Used for determining which module page needs to refresh
 */
export const MODULE_PRIMARY_QUERIES: Record<string, string[]> = {
  guests: ['guests.getAll', 'guests.getForClient'],
  events: ['events.getAll', 'events.getForClient'],
  budget: ['budget.getAll', 'budget.getSummary'],
  vendors: ['vendors.getAll', 'vendors.getForClient'],
  hotels: ['hotels.getAll', 'hotels.getAllWithGuests'],
  transport: ['transport.getAll', 'transport.getForClient'],
  timeline: ['timeline.getAll', 'timeline.getForClient'],
  gifts: ['gifts.getAll', 'gifts.getForClient'],
  floorPlan: ['floorPlans.getById', 'floorPlanGuests.getAll'],
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
