/**
 * Chatbot Tool Permission System
 *
 * April 2026 - Role-Based Access Control for Chatbot
 *
 * Maps every chatbot tool to the Permission required to execute it.
 * Uses the existing permission matrix from src/lib/permissions/roles.ts.
 *
 * Security model:
 * - null permission = all authenticated users can use (query tools)
 * - Specific Permission = checked via hasPermission(role, permission)
 * - Unknown tools = DENY by default (fail-safe)
 */

import { Permissions, hasPermission, type Role, type Permission } from '@/lib/permissions/roles'
import { db, eq, and, or } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'

/**
 * Maps each chatbot tool to the Permission required to execute it.
 * null = any authenticated user (query tools available to all roles).
 * Missing key = DENY (fail-safe for unknown tools).
 */
export const TOOL_PERMISSION_MAP: Record<string, Permission | null> = {
  // ============================================
  // QUERY TOOLS — Available to ALL roles (null = no permission check)
  // ============================================
  get_client_summary: null,
  get_wedding_summary: null,
  get_recommendations: null,
  get_guest_stats: null,
  sync_hotel_guests: null,
  get_budget_overview: null,
  budget_currency_convert: null,
  search_entities: null,
  query_data: null,
  query_cross_client_events: null,
  export_data: null,
  query_analytics: null,
  get_weather: null,
  get_document_upload_url: null,

  // ============================================
  // CLIENT MANAGEMENT
  // ============================================
  create_client: Permissions.CLIENTS_CREATE,
  update_client: Permissions.CLIENTS_EDIT,
  delete_client: Permissions.CLIENTS_DELETE,

  // ============================================
  // GUEST MANAGEMENT
  // ============================================
  add_guest: Permissions.GUESTS_CREATE,
  update_guest_rsvp: Permissions.GUESTS_EDIT,
  bulk_update_guests: Permissions.GUESTS_EDIT,
  check_in_guest: Permissions.GUESTS_CHECKIN,
  assign_guests_to_events: Permissions.GUESTS_EDIT,
  delete_guest: Permissions.GUESTS_DELETE,

  // ============================================
  // EVENT & TIMELINE MANAGEMENT
  // ============================================
  create_event: Permissions.CLIENTS_EDIT,
  update_event: Permissions.CLIENTS_EDIT,
  add_timeline_item: Permissions.CLIENTS_EDIT,
  update_timeline_item: Permissions.CLIENTS_EDIT,
  shift_timeline: Permissions.CLIENTS_EDIT,
  delete_event: Permissions.CLIENTS_DELETE,
  delete_timeline_item: Permissions.CLIENTS_EDIT,

  // ============================================
  // VENDOR MANAGEMENT
  // ============================================
  add_vendor: Permissions.VENDORS_CREATE,
  update_vendor: Permissions.VENDORS_EDIT,
  delete_vendor: Permissions.VENDORS_DELETE,

  // ============================================
  // HOTEL & TRANSPORT
  // ============================================
  add_hotel_booking: Permissions.GUESTS_CREATE,
  update_hotel_booking: Permissions.GUESTS_EDIT,
  delete_hotel_booking: Permissions.GUESTS_DELETE,
  bulk_add_hotel_bookings: Permissions.GUESTS_CREATE,
  assign_transport: Permissions.GUESTS_CREATE,
  update_transport: Permissions.GUESTS_EDIT,
  delete_transport: Permissions.GUESTS_DELETE,

  // ============================================
  // BUDGET
  // ============================================
  create_budget_item: Permissions.BUDGET_CREATE,
  update_budget_item: Permissions.BUDGET_EDIT,
  delete_budget_item: Permissions.BUDGET_DELETE,

  // ============================================
  // GIFTS & SEATING
  // ============================================
  add_gift: Permissions.CLIENTS_EDIT,
  update_gift: Permissions.CLIENTS_EDIT,
  delete_gift: Permissions.CLIENTS_EDIT,
  add_seating_constraint: Permissions.CLIENTS_EDIT,
  delete_seating_constraint: Permissions.CLIENTS_EDIT,
  update_table_dietary: Permissions.GUESTS_EDIT,

  // ============================================
  // CREATIVE & TEAM
  // ============================================
  create_creative: Permissions.CREATIVES_CREATE,
  update_creative: Permissions.CREATIVES_EDIT,
  delete_creative: Permissions.CREATIVES_DELETE,
  assign_team_member: Permissions.CLIENTS_EDIT,

  // ============================================
  // COMMUNICATION — client_user CAN send messages
  // ============================================
  send_communication: Permissions.MESSAGES_SEND,

  // ============================================
  // BUSINESS OPERATIONS
  // ============================================
  create_proposal: Permissions.CLIENTS_EDIT,
  update_proposal: Permissions.CLIENTS_EDIT,
  delete_proposal: Permissions.CLIENTS_DELETE,
  create_contract: Permissions.CLIENTS_EDIT,
  update_contract: Permissions.CLIENTS_EDIT,
  delete_contract: Permissions.CLIENTS_DELETE,
  create_invoice: Permissions.CLIENTS_EDIT,
  update_invoice: Permissions.CLIENTS_EDIT,
  delete_invoice: Permissions.CLIENTS_DELETE,
  create_questionnaire: Permissions.CLIENTS_EDIT,
  update_questionnaire: Permissions.CLIENTS_EDIT,
  delete_questionnaire: Permissions.CLIENTS_DELETE,
  update_pipeline: Permissions.CLIENTS_EDIT,
  create_pipeline_lead: Permissions.CLIENTS_CREATE,
  delete_pipeline_lead: Permissions.CLIENTS_DELETE,
  update_website: Permissions.CLIENTS_EDIT,
  create_website: Permissions.CLIENTS_EDIT,
  delete_website: Permissions.CLIENTS_DELETE,
  create_workflow: Permissions.CLIENTS_EDIT,
  update_workflow: Permissions.CLIENTS_EDIT,
  delete_workflow: Permissions.CLIENTS_DELETE,

  // ============================================
  // UTILITIES
  // ============================================
  generate_qr_codes: Permissions.GUESTS_EXPORT,
  sync_calendar: Permissions.CLIENTS_EDIT,

  // ============================================
  // DOCUMENT & E-SIGNATURE (April 2026)
  // ============================================
  create_document: Permissions.CLIENTS_EDIT,
  update_document: Permissions.CLIENTS_EDIT,
  delete_document: Permissions.CLIENTS_DELETE,
  request_signature: Permissions.CLIENTS_EDIT,
  send_signature_reminder: Permissions.CLIENTS_EDIT,
  cancel_signature_request: Permissions.CLIENTS_EDIT,
  get_document_audit_trail: null,  // query tool

  // ============================================
  // PAYMENTS (April 2026)
  // ============================================
  record_payment: Permissions.CLIENTS_EDIT,
  get_payment_stats: null,  // query tool
  create_refund: Permissions.CLIENTS_DELETE,

  // ============================================
  // FLOOR PLANS (April 2026)
  // ============================================
  create_floor_plan: Permissions.CLIENTS_EDIT,
  add_table: Permissions.CLIENTS_EDIT,
  remove_table: Permissions.CLIENTS_EDIT,
  assign_guest_to_table: Permissions.CLIENTS_EDIT,
  batch_assign_guests: Permissions.CLIENTS_EDIT,

  // ============================================
  // PIPELINE ENHANCEMENTS (April 2026)
  // ============================================
  create_pipeline_stage: Permissions.CLIENTS_EDIT,
  convert_lead_to_client: Permissions.CLIENTS_CREATE,
  create_pipeline_activity: Permissions.CLIENTS_EDIT,

  // ============================================
  // ADDITIONAL QUERIES (April 2026)
  // ============================================
  get_questionnaire_responses: null,  // query tool
  get_website_analytics: null,  // query tool
  get_floor_plan_summary: null,  // query tool
}

/**
 * Check if a role can execute a specific chatbot tool.
 * Unknown tools default to DENY (fail-safe).
 */
export function canUserExecuteTool(role: Role, toolName: string): boolean {
  const requiredPermission = TOOL_PERMISSION_MAP[toolName]

  // Unknown tool — deny by default
  if (requiredPermission === undefined) {
    return false
  }

  // null = query tool, available to all authenticated users
  if (requiredPermission === null) {
    return true
  }

  return hasPermission(role, requiredPermission)
}

/**
 * Get all tool names that a role can execute.
 * Used to filter the LLM tool list and system prompt.
 */
export function getToolsForRole(role: Role): string[] {
  return Object.keys(TOOL_PERMISSION_MAP).filter(
    toolName => canUserExecuteTool(role, toolName)
  )
}

/**
 * Get a role-specific permission denied message with contact info.
 *
 * - staff → "Access not granted. Please contact [admin name]."
 * - client_user → "Access not granted. Please contact [planner name]."
 * - fallback → generic message
 */
export async function getPermissionDeniedMessage(
  role: Role,
  _toolName: string,
  dbClient: typeof db,
  companyId: string,
): Promise<string> {
  if (role === 'staff') {
    try {
      const [admin] = await dbClient
        .select({
          name: userTable.name,
          email: userTable.email,
          firstName: userTable.firstName,
          lastName: userTable.lastName,
        })
        .from(userTable)
        .where(
          and(
            eq(userTable.companyId, companyId),
            eq(userTable.role, 'company_admin')
          )
        )
        .limit(1)

      if (admin) {
        const adminName = admin.firstName
          ? `${admin.firstName}${admin.lastName ? ` ${admin.lastName}` : ''}`
          : admin.name || 'your admin'
        const emailPart = admin.email ? ` (${admin.email})` : ''
        return `Access not granted. This action requires admin privileges. Please contact ${adminName}${emailPart} for assistance.`
      }
    } catch {
      // Fall through to default
    }

    return 'Access not granted. This action requires admin privileges. Please contact your company administrator.'
  }

  if (role === 'client_user') {
    try {
      const [planner] = await dbClient
        .select({
          name: userTable.name,
          firstName: userTable.firstName,
          lastName: userTable.lastName,
        })
        .from(userTable)
        .where(
          and(
            eq(userTable.companyId, companyId),
            or(
              eq(userTable.role, 'company_admin'),
              eq(userTable.role, 'staff')
            )
          )
        )
        .limit(1)

      if (planner) {
        const plannerName = planner.firstName
          ? `${planner.firstName}${planner.lastName ? ` ${planner.lastName}` : ''}`
          : planner.name || 'your wedding planner'
        return `Access not granted. Your wedding planner ${plannerName} handles all modifications. Please reach out to them for any changes.`
      }
    } catch {
      // Fall through to default
    }

    return 'Access not granted. Please contact your wedding planner for any changes to your wedding details.'
  }

  return 'You don\'t have permission to perform this action.'
}
