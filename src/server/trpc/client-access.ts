/**
 * Client-access authorization — the single chokepoint for "can this user touch
 * this client's data?". Fail-closed.
 *
 *  - super_admin   → allowed (platform-wide)
 *  - company_admin → allowed iff the client is in their company (not soft-deleted)
 *  - staff         → allowed iff the client is in their company AND they have a
 *                    team_client_assignments row for it
 *  - anything else (client_user, missing role) → FORBIDDEN
 *
 * Used by `staffProcedure` (auto-checks a direct `input.clientId`) and called
 * explicitly by resolvers that derive a clientId from an entity id.
 */
import { TRPCError } from '@trpc/server'
import { and, eq, isNull, inArray, sql, type SQL, type Column } from 'drizzle-orm'
import { clients, teamClientAssignments } from '@/lib/db/schema-features'
import type { Context } from './context'

type AccessContext = Pick<Context, 'db' | 'role' | 'userId' | 'companyId'>

export async function assertClientAccess(
  ctx: AccessContext,
  clientId: string | null | undefined
): Promise<void> {
  if (!clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing clientId for access check' })
  }

  // Platform admins bypass company/assignment scoping.
  if (ctx.role === 'super_admin') return

  if (!ctx.userId || !ctx.companyId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No company context' })
  }

  // The client must exist, belong to the caller's company, and not be deleted.
  const [client] = await ctx.db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.companyId, ctx.companyId),
        isNull(clients.deletedAt)
      )
    )
    .limit(1)

  if (!client) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not found in your company' })
  }

  if (ctx.role === 'company_admin') return

  if (ctx.role === 'staff') {
    const [assignment] = await ctx.db
      .select({ id: teamClientAssignments.id })
      .from(teamClientAssignments)
      .where(
        and(
          eq(teamClientAssignments.teamMemberId, ctx.userId),
          eq(teamClientAssignments.clientId, clientId)
        )
      )
      .limit(1)

    if (!assignment) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not assigned to this client' })
    }
    return
  }

  // client_user or any unexpected role
  throw new TRPCError({ code: 'FORBIDDEN' })
}

/**
 * Authorize access to an entity identified by a NON-clientId id (floorPlanId,
 * budgetItemId, guestId, …). Derives the owning clientId via `loadClientId` and
 * funnels through the single `assertClientAccess` chokepoint above — so a resolver
 * that reads/writes a child entity by its own id can't forget tenant scoping.
 *
 * Fail-closed: an absent owner (entity missing OR not linked to a client) throws
 * NOT_FOUND, never leaking another tenant's row. Returns the verified clientId so
 * callers can reuse it for downstream cascades/broadcasts.
 *
 *   await assertEntityAccess(ctx, async () =>
 *     (await ctx.db.query.floorPlans.findFirst({ where: eq(floorPlans.id, id) }))?.clientId)
 */
export async function assertEntityAccess(
  ctx: AccessContext,
  loadClientId: () => Promise<string | null | undefined>,
): Promise<string> {
  const clientId = await loadClientId()
  if (!clientId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found in your company' })
  }
  await assertClientAccess(ctx, clientId)
  return clientId
}

/**
 * A SQL condition that restricts a client-id column to clients in the caller's
 * company. For company-wide aggregate reads over tables that key on `clientId`
 * but lack a denormalized `companyId` (e.g. sms_logs): scopes BY CONSTRUCTION
 * instead of returning every tenant's rows when no clientId filter is supplied.
 *
 *   .where(and(eq(smsLogs.status, status), withinCompanyClients(ctx, smsLogs.clientId)))
 *
 * super_admin (platform-wide, consistent with assertClientAccess) gets an
 * unrestricted condition; a caller with no company context fails closed (no rows).
 */
export function withinCompanyClients(ctx: AccessContext, clientIdColumn: Column): SQL {
  if (ctx.role === 'super_admin') {
    return sql`true`
  }
  if (!ctx.companyId) {
    return sql`false`
  }
  return inArray(
    clientIdColumn,
    ctx.db.select({ id: clients.id }).from(clients).where(eq(clients.companyId, ctx.companyId)),
  )
}

/** Extract a top-level clientId from a procedure's raw input, if present. */
export function clientIdFromInput(rawInput: unknown): string | null {
  if (rawInput && typeof rawInput === 'object' && 'clientId' in rawInput) {
    const v = (rawInput as { clientId?: unknown }).clientId
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}
