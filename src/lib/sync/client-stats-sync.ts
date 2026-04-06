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
 *
 * Budget update policy:
 *   The clients.budget column serves dual purpose — it holds the user-entered
 *   budget target (from client create/edit) AND the computed sum of itemized
 *   costs. To avoid overwriting the user's target with $0 when only auto-created
 *   placeholder items exist (estimatedCost='0'), we only overwrite clients.budget
 *   when the computed sum is > 0 (i.e., real itemized costs exist). Once the user
 *   starts entering actual costs on the budget page, the cached value reflects
 *   the real sum. The user can always set the target directly via client edit
 *   (which does NOT call recalcClientStats).
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
  // Only overwrite cached budget when itemized costs sum to > 0.
  // This preserves the user-entered budget target (set during client create/edit)
  // until real budget item costs are entered on the budget page.
  // Auto-created vendor placeholders have estimatedCost='0' and should NOT
  // zero out the user's entered budget.
  const budgetTotal = Number(budgetRow?.total ?? '0')

  await db
    .update(clients)
    .set({
      ...(budgetTotal > 0 ? { budget: budgetRow?.total ?? '0' } : {}),
      guestCount: guestRow?.count ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId))
}
