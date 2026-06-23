/**
 * Vendor ↔ Budget/Timeline sync — single source of truth for the cross-module
 * automation that keeps a vendor's linked budget item (and on delete, its timeline
 * entry) in step with the vendor's cost / event / payment data.
 *
 * The tRPC vendors.router create/update/delete already performs this automation
 * inline. The IMPORT paths (Excel `importVendorsExcel`, Google Sheets
 * `importVendorsFromSheet`) and the chatbot `update_vendor` tool historically did
 * NOT — they upserted only `vendors` + `client_vendors`, so importing/editing a
 * vendor cost never reached the budget module and client dashboard totals went
 * stale (the subsequent `recalcClientStats` was a no-op because no budget row
 * changed). This module closes that gap so every entry point fires the same
 * automation. Budget rows are linked to a vendor via `budget.vendorId`.
 *
 * Always pair an upsert/delete with `recalcClientStats(tx, clientId)` by the caller
 * (after the write) so the cached client budget total refreshes.
 */

import { and, eq } from 'drizzle-orm'
import { budget, events, timeline } from '@/lib/db/schema'

// Drizzle transaction OR base db client. Matches the loose typing used across the
// import/sync layer (recalcClientStats etc.).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbOrTx = any

export interface VendorBudgetSyncParams {
  clientId: string
  companyId: string
  vendorId: string
  /** Display name written to budget.item. */
  vendorName: string
  /**
   * Contract amount → budget.estimatedCost. Pass `undefined` to leave an existing
   * budget item's cost untouched; pass a value (incl. 0/'') to set it.
   */
  cost?: number | string | null
  /** Deposit/advance paid → budget.paidAmount. `undefined` = leave untouched. */
  depositAmount?: number | string | null
  /** Payment status → budget.paymentStatus. `undefined` = leave untouched. */
  paymentStatus?: string | null
  /**
   * Event link → budget.eventId (+ category derived from the event title).
   * `undefined` = leave untouched; `null` = unassign (category → 'Unassigned').
   */
  eventId?: string | null
}

function toMoneyString(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0'
  return String(value)
}

/**
 * Upsert the budget item linked to a vendor (budget.vendorId === vendorId for the
 * given client). Creates the item if missing (mirrors vendors.router.create, which
 * always auto-creates a budget line — this also back-fills vendors imported before
 * this automation existed). Only fields explicitly provided are changed on update.
 */
export async function syncVendorBudgetItem(
  db: DbOrTx,
  params: VendorBudgetSyncParams,
): Promise<void> {
  const { clientId, companyId, vendorId, vendorName } = params

  // Resolve budget category from the linked event title when an event is set.
  let category: string | undefined
  if (params.eventId !== undefined) {
    if (params.eventId) {
      const [ev] = await db
        .select({ title: events.title })
        .from(events)
        .where(eq(events.id, params.eventId))
        .limit(1)
      category = ev?.title || 'Unassigned'
    } else {
      category = 'Unassigned'
    }
  }

  const [existing] = await db
    .select({ id: budget.id })
    .from(budget)
    .where(and(eq(budget.clientId, clientId), eq(budget.vendorId, vendorId)))
    .limit(1)

  if (existing) {
    const set: Record<string, unknown> = { updatedAt: new Date() }
    set.item = vendorName
    if (params.cost !== undefined) set.estimatedCost = toMoneyString(params.cost)
    if (params.depositAmount !== undefined) set.paidAmount = toMoneyString(params.depositAmount)
    if (params.paymentStatus !== undefined && params.paymentStatus) set.paymentStatus = params.paymentStatus
    if (params.eventId !== undefined) {
      set.eventId = params.eventId
      set.category = category
    }
    await db.update(budget).set(set).where(eq(budget.id, existing.id))
    return
  }

  await db.insert(budget).values({
    id: crypto.randomUUID(),
    clientId,
    companyId,
    vendorId,
    eventId: params.eventId ?? null,
    category: category ?? 'Unassigned',
    segment: 'vendors',
    item: vendorName,
    estimatedCost: toMoneyString(params.cost),
    actualCost: null,
    paidAmount: toMoneyString(params.depositAmount),
    paymentStatus: params.paymentStatus || 'pending',
    clientVisible: true,
    isLumpSum: false,
    notes: `Auto-created from vendor: ${vendorName}`,
  })
}

/**
 * Cascade cleanup when a vendor↔client link is removed (e.g. via an Excel/Sheets
 * DELETE row). Removes the linked budget item (scoped to this client + vendor) and
 * the vendor's timeline entry. Mirrors vendors.router.delete, but budget is scoped
 * by clientId too so a global vendor shared across clients keeps its other clients'
 * budget lines.
 */
export async function cascadeVendorLinkDelete(
  db: DbOrTx,
  params: { clientId: string; vendorId: string; clientVendorId?: string },
): Promise<void> {
  await db
    .delete(budget)
    .where(and(eq(budget.clientId, params.clientId), eq(budget.vendorId, params.vendorId)))

  if (params.clientVendorId) {
    await db
      .delete(timeline)
      .where(and(eq(timeline.sourceModule, 'vendors'), eq(timeline.sourceId, params.clientVendorId)))
  }
}
