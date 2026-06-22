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
import { and, eq, isNull } from 'drizzle-orm'
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

/** Extract a top-level clientId from a procedure's raw input, if present. */
export function clientIdFromInput(rawInput: unknown): string | null {
  if (rawInput && typeof rawInput === 'object' && 'clientId' in rawInput) {
    const v = (rawInput as { clientId?: unknown }).clientId
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}
