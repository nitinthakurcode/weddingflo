/**
 * Shared vendor export-data fetch (service layer — Prompt 6A.2).
 *
 * Two surfaces need the SAME per-client view of a vendor: the combined client export
 * (`export.router.exportClientData`) and the per-module vendor template
 * (`import.router.downloadTemplate('vendors')`). Each needs the global `vendors` master
 * row ENRICHED with its `clientVendors` link (event, contract / deposit / payment, service
 * date, on-site POC, deliverables, approval) plus derived totals (Total Paid / Balance).
 *
 * Authored independently, they drifted: downloadTemplate enriched from `clientVendors`,
 * while the combined export read bare global `vendors` — so its §G.6 per-link columns were
 * blank. Because the importer is non-destructive on HEADER-presence (a present-but-blank
 * column overwrites — `buildPresentUpdate`, `excel-parser-server.ts`), a combined-export →
 * re-import silently CLEARED those per-link fields on un-edited vendors (KNOWN_GAPS §5).
 *
 * Centralizing the fetch is the data-side analogue of the module-shape SSOT (Cluster E):
 * one "how", so neither caller can drift. This owns only the fetch/enrich; callers keep the
 * "when/auth" — both routers already verify the client belongs to `ctx.companyId` (tenant
 * scope) before calling in.
 */
import { eq, inArray } from 'drizzle-orm'
import { vendors, clientVendors, events, budget, advancePayments } from '@/lib/db/schema-features'
import type { db } from '@/lib/db'

/** The concrete Drizzle client both routers pass in (`ctx.db`) — full column inference. */
type Db = typeof db

type VendorRow = typeof vendors.$inferSelect

/**
 * A global vendor master row enriched with this client's `clientVendors` link fields
 * + derived totals. Keys are the camelCase shape both consumers read:
 *  - `MODULE_SHAPES.vendors.toCell` (combined export) via its `pick()` aliases, and
 *  - `downloadTemplate('vendors')`'s inline row mapper.
 */
export interface ClientVendorExportRow extends VendorRow {
  clientVendorId: string | null
  eventId: string | null
  eventName: string | null
  contractAmount: string | null
  totalPaid: string | null
  balanceRemaining: string
  depositAmount: string | null
  depositPaid: boolean
  paymentStatus: string
  serviceDate: string | null
  approvalStatus: string
  approvalNotes: string | null
  serviceLocation: string | null
  onSiteContact: string | null
  onSitePhone: string | null
  servicesProvided: string | null
}

/**
 * Fetch this company's vendors, each enriched with the given client's `clientVendors` link
 * (where one exists) + derived Total Paid / Balance Remaining. The row SET is the company's
 * full vendor master list (same as before); the per-link columns now populate for vendors
 * linked to this client, so the combined export round-trips them faithfully.
 *
 * READ-ONLY. Caller owns tenant scope (verify `clientId` ∈ `companyId` first).
 */
export async function fetchClientVendorExportRows(
  db: Db,
  params: { clientId: string; companyId: string },
): Promise<ClientVendorExportRow[]> {
  const { clientId, companyId } = params

  // Company-wide vendor master list + this client's link rows / events / budget items.
  const [vendorsList, clientVendorsList, clientEvents, vendorBudgetItems] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.companyId, companyId)),
    db.select().from(clientVendors).where(eq(clientVendors.clientId, clientId)),
    db.select().from(events).where(eq(events.clientId, clientId)),
    db.select().from(budget).where(eq(budget.clientId, clientId)),
  ])

  const eventMap = new Map(clientEvents.map((e) => [e.id, e.title]))
  const clientVendorMap = new Map(clientVendorsList.map((cv) => [cv.vendorId, cv]))
  const budgetByVendor = new Map(
    vendorBudgetItems.filter((b) => b.vendorId).map((b) => [b.vendorId, b]),
  )

  // Sum advance payments per linked budget item (for Total Paid).
  const budgetIds = vendorBudgetItems.map((b) => b.id)
  const advancesByBudget = new Map<string, number>()
  if (budgetIds.length > 0) {
    const advances = await db
      .select()
      .from(advancePayments)
      .where(inArray(advancePayments.budgetItemId, budgetIds))
    for (const adv of advances) {
      if (!adv.budgetItemId) continue
      const current = advancesByBudget.get(adv.budgetItemId) || 0
      advancesByBudget.set(adv.budgetItemId, current + parseFloat(adv.amount || '0'))
    }
  }

  return vendorsList.map((v): ClientVendorExportRow => {
    const cv = clientVendorMap.get(v.id)
    const budgetItem = budgetByVendor.get(v.id)
    const totalAdvances = budgetItem ? advancesByBudget.get(budgetItem.id) || 0 : 0
    const totalPaid = totalAdvances + parseFloat(budgetItem?.paidAmount || '0')
    const contractAmt = parseFloat(cv?.contractAmount || '0')
    const balance = contractAmt - totalPaid

    return {
      ...v,
      clientVendorId: cv?.id || null,
      eventId: cv?.eventId || null,
      eventName: (cv?.eventId ? eventMap.get(cv.eventId) : null) ?? null,
      contractAmount: cv?.contractAmount || null,
      totalPaid: totalPaid > 0 ? String(totalPaid) : null,
      balanceRemaining: balance > 0 ? String(balance) : '0',
      depositAmount: cv?.depositAmount || null,
      depositPaid: cv?.depositPaid || false,
      paymentStatus: cv?.paymentStatus || 'pending',
      serviceDate: cv?.serviceDate || null,
      approvalStatus: cv?.approvalStatus || 'pending',
      approvalNotes: cv?.approvalComments || null,
      serviceLocation: cv?.venueAddress || null,
      onSiteContact: cv?.onsitePocName || null,
      onSitePhone: cv?.onsitePocPhone || null,
      servicesProvided: cv?.deliverables || null,
    }
  })
}
