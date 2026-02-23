/**
 * Per-Guest Budget Recalculation
 *
 * Shared utility for recalculating per-guest budget items
 * when guest counts change (RSVP updates, guest creation/deletion,
 * party size changes).
 *
 * Used by:
 * - guests.router.ts (update, updateRSVP, delete procedures)
 * - tool-executor.ts (chatbot executeUpdateGuestRsvp)
 * - guest-cascade.ts (after guest creation with confirmed status)
 */

import { eq, and } from 'drizzle-orm'
import { guests, budget } from '@/lib/db/schema'
import { RSVP_STATUS } from '@/lib/constants/enums'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = any

interface RecalcResult {
  confirmedCount: number
  updatedItems: number
}

/**
 * Recalculate all per-guest budget items for a client.
 *
 * Counts confirmed guests (sum of partySize), then for each budget item
 * where isPerGuestItem=true, sets estimatedCost = perGuestCost × confirmedCount.
 *
 * @param tx - Drizzle transaction or db instance
 * @param clientId - The client whose budget items to recalculate
 * @returns The confirmed count and number of updated budget items
 */
export async function recalcPerGuestBudgetItems(
  tx: TransactionClient,
  clientId: string
): Promise<RecalcResult> {
  // 1. Count confirmed guests (sum of party sizes)
  const guestList = await tx
    .select({ partySize: guests.partySize })
    .from(guests)
    .where(
      and(
        eq(guests.clientId, clientId),
        eq(guests.rsvpStatus, RSVP_STATUS.CONFIRMED)
      )
    )

  const confirmedCount = guestList.reduce(
    (sum: number, g: { partySize: number | null }) => sum + (g.partySize || 1),
    0
  )

  // 2. Find per-guest budget items
  const perGuestItems = await tx
    .select()
    .from(budget)
    .where(
      and(
        eq(budget.clientId, clientId),
        eq(budget.isPerGuestItem, true)
      )
    )

  if (perGuestItems.length === 0) {
    return { confirmedCount, updatedItems: 0 }
  }

  // 3. Update each: estimatedCost = perGuestCost × confirmedCount
  let updatedItems = 0
  for (const item of perGuestItems) {
    const perGuestCost = Number(item.perGuestCost || 0)
    const newEstimatedCost = perGuestCost * confirmedCount

    await tx
      .update(budget)
      .set({
        estimatedCost: String(newEstimatedCost),
        updatedAt: new Date(),
      })
      .where(eq(budget.id, item.id))
    updatedItems++
  }

  if (updatedItems > 0) {
    console.log(
      `[Budget Recalc] Updated ${updatedItems} per-guest budget items for client ${clientId}: confirmedGuests=${confirmedCount}`
    )
  }

  return { confirmedCount, updatedItems }
}
