/**
 * Real-DB integration harness for chatbot tool execution.
 *
 * Seeds an ISOLATED throwaway tenant (company + company_admin planner + client with a
 * main event) in the local Postgres, builds the exact `Context` the tool executor +
 * `enforceChatbotAccess` expect, and tears the tenant down completely afterwards so no
 * persistent data is polluted.
 *
 * The app DB role (weddingflo_admin) is a superuser → bypasses RLS, so no app.current_*
 * context is needed. `executeToolWithSync` runs mutations through the global `db` via
 * `withTransaction`, exactly as production does.
 */
import { randomUUID } from 'crypto'
import { sql, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { companies, clients, events, budget, user as userTable } from '@/lib/db/schema'
import type { Context } from '@/server/trpc/context'

export interface TestTenant {
  companyId: string
  userId: string
  clientId: string
  /** id of the auto-seeded main wedding event */
  eventId: string
  ctx: Context
}

/** Build the minimal-but-faithful Context a chatbot tool handler reads. */
export function buildCtx(o: { companyId: string; userId: string; role?: string }): Context {
  const role = o.role ?? 'company_admin'
  return {
    userId: o.userId,
    role,
    companyId: o.companyId,
    db,
    queries: {} as Record<string, unknown>,
    user: { id: o.userId, role, companyId: o.companyId },
    withTenantScope: undefined,
  } as unknown as Context
}

export async function seedTenant(opts?: { planningSide?: string }): Promise<TestTenant> {
  const [company] = await db
    .insert(companies)
    .values({ name: `WF-IT ${randomUUID().slice(0, 8)}` })
    .returning()
  const companyId = company.id

  // Once the company exists, self-clean on ANY later failure so a partial seed never
  // leaks an orphan tenant (the failure that bit us before the events-insert fix).
  try {
    const userId = randomUUID()
    await db.insert(userTable).values({
      id: userId,
      name: 'Integration Planner',
      email: `it-${userId}@example.test`,
      role: 'company_admin',
      companyId,
    } as never)

    const clientId = randomUUID()
    await db.insert(clients).values({
      id: clientId,
      companyId,
      partner1FirstName: 'Test',
      partner1LastName: 'Couple',
      planningSide: opts?.planningSide ?? 'both',
      weddingDate: '2027-06-15',
    } as never)

    // A main wedding event so event-scoped tools (vendors by date, transport by event,
    // assign_guests_to_events, timeline) have something to act on.
    const [event] = await db
      .insert(events)
      .values({
        id: randomUUID(),
        clientId,
        companyId,
        title: 'Main Wedding',
        eventType: 'wedding',
        eventDate: '2027-06-15',
      } as never)
      .returning()

    return { companyId, userId, clientId, eventId: event.id, ctx: buildCtx({ companyId, userId }) }
  } catch (err) {
    await teardownTenant(companyId).catch(() => {})
    throw err
  }
}

/**
 * Completely remove a seeded tenant. Runs in ONE transaction with FK enforcement
 * disabled (SET LOCAL session_replication_role — superuser, transaction-scoped so it
 * survives postgres-js connection pooling) so delete order doesn't matter.
 *
 * Bulletproof + future-proof: dynamically sweeps EVERY table that has a `client_id`
 * column (for the seeded client) AND every table with a `company_id` column (for the
 * tenant). Grandchildren that have neither column (gift links, seating links, workflow
 * steps) are cleared via parent subqueries first, while their parents still exist.
 */
export async function teardownTenant(companyId: string): Promise<void> {
  const clientRows = (await db.execute(
    sql`SELECT id FROM clients WHERE company_id = ${companyId}`,
  )) as unknown as Array<{ id: string }>
  const clientIds = clientRows.map((r) => r.id)

  await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL session_replication_role = replica`)

    // Grandchildren lacking both company_id and client_id — delete via parent subqueries.
    await tx.execute(sql`DELETE FROM guest_gifts WHERE guest_id IN (SELECT id FROM guests WHERE company_id = ${companyId})`)
    await tx.execute(sql`DELETE FROM floor_plan_guests WHERE table_id IN (SELECT t.id FROM floor_plan_tables t JOIN floor_plans f ON t.floor_plan_id = f.id WHERE f.company_id = ${companyId})`)
    await tx.execute(sql`DELETE FROM floor_plan_tables WHERE floor_plan_id IN (SELECT id FROM floor_plans WHERE company_id = ${companyId})`)
    await tx.execute(sql`DELETE FROM workflow_steps WHERE workflow_id IN (SELECT id FROM workflows WHERE company_id = ${companyId})`)

    // Dynamic sweep: every table with a client_id column, for this tenant's client(s).
    const clientIdTables = (await tx.execute(
      sql`SELECT table_name FROM information_schema.columns WHERE column_name = 'client_id' AND table_schema = 'public'`,
    )) as unknown as Array<{ table_name: string }>
    for (const cid of clientIds) {
      for (const { table_name } of clientIdTables) {
        await tx.execute(sql`DELETE FROM ${sql.identifier(table_name)} WHERE client_id = ${cid}`)
      }
    }

    // Dynamic sweep: every table with a company_id column, for this tenant.
    const companyIdTables = (await tx.execute(
      sql`SELECT table_name FROM information_schema.columns WHERE column_name = 'company_id' AND table_schema = 'public'`,
    )) as unknown as Array<{ table_name: string }>
    for (const { table_name } of companyIdTables) {
      await tx.execute(sql`DELETE FROM ${sql.identifier(table_name)} WHERE company_id = ${companyId}`)
    }

    await tx.execute(sql`DELETE FROM companies WHERE id = ${companyId}`)
  })
}

/**
 * Seed a per-guest budget item (isPerGuestItem=true) so the RSVP→budget automation
 * (recalcPerGuestBudgetItems) can be asserted: estimatedCost = perGuestCost × confirmed.
 * Returns the budget row id.
 */
export async function seedPerGuestBudgetItem(
  clientId: string,
  companyId: string,
  perGuestCost = 100,
): Promise<string> {
  const id = randomUUID()
  await db.insert(budget).values({
    id,
    clientId,
    companyId,
    category: 'Catering',
    item: 'Per-plate catering',
    isPerGuestItem: true,
    perGuestCost: String(perGuestCost),
    estimatedCost: '0',
  } as never)
  return id
}

/** Convenience: count rows of a table for a client (uses the global db). */
export { db, sql, eq }
