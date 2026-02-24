/**
 * Client Stats Sync — Recalculate cached budget & guestCount on clients table
 *
 * The clients table stores two cached aggregates:
 *   - budget (TEXT)  — SUM of all budget.estimatedCost for the client
 *   - guestCount (INTEGER) — COUNT of all guests for the client
 *
 * These must be refreshed whenever budget items or guests are created,
 * updated, or deleted. This utility is called from every mutation path:
 *   - budget.router.ts (6 mutations)
 *   - guests.router.ts (5 mutations)
 *   - import.router.ts (guest + budget import)
 *   - sheets-sync.ts (importGuestsFromSheet + importBudgetFromSheet)
 *   - tool-executor.ts (7 chatbot functions)
 *   - clients.router.ts (create — after budget template creation)
 */

import { eq, sql } from 'drizzle-orm'
import { guests, budget, clients } from '@/lib/db/schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = any

/**
 * Recalculate and persist the cached budget total and guest count for a client.
 *
 * @param db - Drizzle transaction or db instance
 * @param clientId - The client whose stats to recalculate
 */
export async function recalcClientStats(
  db: TransactionClient,
  clientId: string
): Promise<void> {
  // 1. SUM budget.estimatedCost (TEXT column) → cast to NUMERIC for aggregation
  const [budgetRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${budget.estimatedCost} AS NUMERIC)), 0)::TEXT`,
    })
    .from(budget)
    .where(eq(budget.clientId, clientId))

  // 2. COUNT guests
  const [guestRow] = await db
    .select({
      count: sql<number>`COUNT(*)::INTEGER`,
    })
    .from(guests)
    .where(eq(guests.clientId, clientId))

  // 3. Write back to clients table
  await db
    .update(clients)
    .set({
      budget: budgetRow?.total ?? '0',
      guestCount: guestRow?.count ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId))
}
