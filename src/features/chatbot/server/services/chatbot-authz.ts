/**
 * Chatbot Authorization — the single, declarative authorization chokepoint for
 * the assistant. Every chatbot tool execution funnels through `enforceChatbotAccess`
 * (called inside `executeTool`), and both entry paths (tRPC + SSE) reuse the same
 * helpers. Fail-closed by design.
 *
 * Layers it enforces (see docs/DEVELOPER_HANDBOOK Section H/J):
 *  1. Role allowlist — only super_admin | company_admin | staff (planners) may use the chatbot.
 *  2. Per-client access — staff are restricted to their team_client_assignments;
 *     admins to their company; super_admin platform-wide (reuses `assertClientAccess`).
 *  3. Mutation policy — admins may mutate anything in their company; staff may
 *     mutate ONLY their assigned clients; team/pipeline/client-creation are admin-only.
 *  4. Cross-client scoping — list/search/analytics tools must restrict results to the
 *     caller's permitted clients via `getClientScopeCondition` (EXISTS-free inArray
 *     subquery on the indexed team_client_assignments).
 *
 * Tool access policy lives HERE (one auditable file) rather than scattered across
 * 51 handlers. A new tool with no entry in TOOL_ACCESS_SCOPE fails closed, and a
 * test asserts every CHATBOT_TOOLS name is classified.
 */
import { TRPCError } from '@trpc/server'
import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { clients, teamClientAssignments } from '@/lib/db/schema-features'
import { assertClientAccess } from '@/server/trpc/client-access'
import type { Context } from '@/server/trpc/context'
import type { ToolType } from '../../tools/definitions'

export type AuthzContext = Pick<Context, 'db' | 'role' | 'userId' | 'companyId'>

/** Roles permitted to use the assistant at all. client_user / vendor are excluded. */
const ALLOWED_ROLES = ['super_admin', 'company_admin', 'staff'] as const

/**
 * Per-tool access scope.
 *  - 'client'       → operates on one client's data; requires access to that client.
 *  - 'cross_client' → searches/aggregates across clients; results scoped via getClientScopeCondition.
 *  - 'company'      → company-level, not tied to an existing client (e.g. create_client, pipeline).
 *  - 'global'       → no tenant data (currency math, weather).
 */
export type ToolAccessScope = 'client' | 'cross_client' | 'company' | 'global'

export const TOOL_ACCESS_SCOPE: Record<string, ToolAccessScope> = {
  // --- client-scoped (act on a single client; clientId injected from active context) ---
  update_client: 'client',
  get_client_summary: 'client',
  get_wedding_summary: 'client',
  check_in_guest: 'client',
  get_recommendations: 'client',
  add_guest: 'client',
  update_guest_rsvp: 'client',
  get_guest_stats: 'client',
  bulk_update_guests: 'client',
  create_event: 'client',
  update_event: 'client',
  add_timeline_item: 'client',
  shift_timeline: 'client',
  add_vendor: 'client',
  update_vendor: 'client',
  add_hotel_booking: 'client',
  sync_hotel_guests: 'client',
  get_budget_overview: 'client',
  update_budget_item: 'client',
  send_communication: 'client',
  assign_transport: 'client',
  assign_guests_to_events: 'client',
  bulk_add_hotel_bookings: 'client',
  update_table_dietary: 'client',
  add_seating_constraint: 'client',
  add_gift: 'client',
  update_gift: 'client',
  update_creative: 'client',
  create_proposal: 'client',
  create_invoice: 'client',
  update_website: 'client',
  generate_qr_codes: 'client',
  sync_calendar: 'client',
  get_document_upload_url: 'client',
  assign_team_member: 'client',
  export_data: 'client', // requires a specific clientId → enforce per-client access
  delete_guest: 'client',
  delete_event: 'client',
  delete_vendor: 'client',
  delete_budget_item: 'client',
  delete_timeline_item: 'client',
  delete_gift: 'client',

  // --- cross-client (must scope results to permitted clients for staff) ---
  search_entities: 'cross_client',
  query_data: 'cross_client',
  query_cross_client_events: 'cross_client',
  query_analytics: 'cross_client', // company-wide analytics → admin-only (see ADMIN_ONLY_TOOLS)

  // --- company-level (no existing client) ---
  create_client: 'company',
  update_pipeline: 'company',
  create_workflow: 'company',

  // --- global (no tenant data) ---
  budget_currency_convert: 'global',
  get_weather: 'global',
}

/**
 * Tools reserved for admins regardless of type — team management and company-wide
 * analytics (financials/leads across ALL clients), which staff must not see.
 */
const ADMIN_ONLY_TOOLS = new Set(['assign_team_member', 'query_analytics'])

export function getToolAccessScope(toolName: string): ToolAccessScope | undefined {
  return TOOL_ACCESS_SCOPE[toolName]
}

export function isChatbotAdmin(ctx: AuthzContext): boolean {
  return ctx.role === 'company_admin' || ctx.role === 'super_admin'
}

/** Role allowlist gate — call at every entry point. */
export function assertChatbotEntry(ctx: AuthzContext): void {
  if (!ctx.role || !ALLOWED_ROLES.includes(ctx.role as (typeof ALLOWED_ROLES)[number])) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'The assistant is only available to planner accounts.',
    })
  }
}

/** Reuse the canonical client-access chokepoint (staff → team_client_assignments). */
export async function authorizeClientForChatbot(
  ctx: AuthzContext,
  clientId: string | null | undefined
): Promise<void> {
  await assertClientAccess(ctx, clientId)
}

/**
 * Drizzle condition restricting a clientId column to the caller's permitted clients.
 * Admins → undefined (no extra filter; the handler's companyId filter is the boundary).
 * Staff  → only assigned clients (indexed subquery on team_client_assignments).
 * Unknown role → impossible match (fail-closed).
 */
export function getClientScopeCondition(
  ctx: AuthzContext,
  clientIdColumn: PgColumn
): SQL | undefined {
  if (isChatbotAdmin(ctx)) return undefined

  if (ctx.role === 'staff' && ctx.userId) {
    return inArray(
      clientIdColumn,
      ctx.db
        .select({ id: teamClientAssignments.clientId })
        .from(teamClientAssignments)
        .where(eq(teamClientAssignments.teamMemberId, ctx.userId))
    )
  }

  // client_user / missing context → match nothing.
  return inArray(
    clientIdColumn,
    ctx.db
      .select({ id: teamClientAssignments.clientId })
      .from(teamClientAssignments)
      .where(eq(teamClientAssignments.teamMemberId, '__no_such_user__'))
  )
}

/**
 * Strong tenant + per-user filter for a clientId column. Restricts to clients in the
 * caller's company (not soft-deleted) AND, for staff, only their assigned clients.
 * Use this in cross-client handlers that lack their own companyId filter (e.g. query_data),
 * so a missing clientId can never widen the query to other tenants.
 *  - super_admin → undefined (platform-wide).
 *  - no company context → matches nothing (fail-closed).
 */
export function getAccessibleClientFilter(
  ctx: AuthzContext,
  clientIdColumn: PgColumn
): SQL | undefined {
  if (ctx.role === 'super_admin') return undefined

  if (!ctx.companyId) {
    return sql`false` // fail-closed: no company context, match nothing
  }

  const staffScope =
    ctx.role === 'staff' && ctx.userId
      ? inArray(
          clients.id,
          ctx.db
            .select({ id: teamClientAssignments.clientId })
            .from(teamClientAssignments)
            .where(eq(teamClientAssignments.teamMemberId, ctx.userId))
        )
      : undefined

  return inArray(
    clientIdColumn,
    ctx.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.companyId, ctx.companyId), isNull(clients.deletedAt), staffScope))
  )
}

/**
 * THE central chokepoint. Runs before any tool handler. Enforces role allowlist,
 * per-client access, and mutation policy. Cross-client *result* scoping is applied
 * inside the cross-client handlers via getClientScopeCondition.
 */
export async function enforceChatbotAccess(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AuthzContext,
  toolType: ToolType
): Promise<void> {
  assertChatbotEntry(ctx)

  const scope = getToolAccessScope(toolName)
  if (!scope) {
    // New tool without a declared policy → deny until classified.
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `No access policy for tool "${toolName}".`,
    })
  }

  // Admin-only tools (any type) are off-limits to staff.
  if (ADMIN_ONLY_TOOLS.has(toolName) && !isChatbotAdmin(ctx)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can use this action.' })
  }

  const targetClientId =
    typeof args.clientId === 'string' && args.clientId.length > 0 ? args.clientId : null

  // Per-client access for client-scoped tools.
  if (scope === 'client') {
    if (targetClientId) {
      await authorizeClientForChatbot(ctx, targetClientId)
    } else if (!isChatbotAdmin(ctx)) {
      // Staff must operate inside an assigned client's context.
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Open one of your assigned clients to use this action.',
      })
    }
    // admin + no clientId → allowed; the handler's companyId filter is the boundary.
  }

  // Mutation policy.
  if (toolType === 'mutation') {
    if (ADMIN_ONLY_TOOLS.has(toolName)) {
      if (!isChatbotAdmin(ctx)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can perform this action.' })
      }
      return
    }
    if (isChatbotAdmin(ctx)) return
    // Staff may mutate only their assigned clients (already authorized above).
    if (ctx.role === 'staff' && scope === 'client' && targetClientId) return
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to make this change via the assistant.',
    })
  }
}
