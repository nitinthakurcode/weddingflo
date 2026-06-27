# ROOTCAUSE — Bulletproof Re-Audit (Prompt 2.5, read-only)

> Confirmed defects (FINDINGS.md) clustered by DEEP shared root cause, not surface symptom.
> Each cluster: the single underlying defect, the systemic fix, and EVERY finding it resolves.
> Skill bodies loaded: service-layer-architecture, source-code-context. NO src/ changes here.

The symptoms span guests, gifts, floor-plans, sms, budget, analytics, payments… but they
collapse into **two** deep roots plus two lighter ones. Both deep roots are the SAME shape:
**a cross-cutting concern (import mechanics / tenant scoping) is reimplemented per-call-site
instead of centralized in one enforced service — so call sites drift, and a fix in one path
never reaches its siblings.** This is precisely the failure /service-layer-architecture warns
about ("a bug fix in one workflow doesn't propagate to the others doing the same thing").

---

## Cluster R — NO SINGLE IMPORT SERVICE  (the dominant functional root)
**Hypothesis (B1/C1/P1/D1 share one root) — CONFIRMED.**

**Underlying defect.** Spreadsheet ingestion is implemented ≥4 independent times, each
re-deciding validation, sheet selection, column mapping, and which cascades fire:
1. Canonical buffer parsers — `excel-parser-server.ts` (budget/hotels/transport/vendors/events):
   validate → parse by sheet name → typed upsert → module cascades → broadcast. CORRECT.
2. Inline ad-hoc importers — `import.router.ts` `importGuest`:1218 / `importGift`:1863 /
   `importGuestGift`:2240: hand-rolled parsing, no `validateExcelFile`, first-non-INSTRUCTIONS
   sheet pick, untyped write objects.
3. Sheets importers — `sheets-sync.ts` `import*FromSheet`: a third mapping + a different
   (sometimes incomplete) cascade set.
4. Dead inline reimplementations — `import.router.ts` importVendor/importBudget/importHotel/
   importTransport (unreachable, drift silently).

Because each copy owns the "how," they diverge. Every one of these is the SAME class:

| Finding | Symptom | The drift |
|---------|---------|-----------|
| **D1** | inline guests/gifts skip `validateExcelFile` | path 2 omits the validation step path 1 has |
| **B1** | combined-export guests/gifts/guestGifts import no-ops | path 2 picks `Cover` (generic sheet-find) instead of the module sheet path 1 names explicitly |
| **C1** | Excel gift EDIT no-ops / ADD crashes | path 2 untyped write maps `giftName`→ no column; path 3 (`importGiftsFromSheet`) maps `name` correctly → proves drift from a shared contract |
| **P1** | Sheets guest confirm leaves per-guest budget stale | path 3 omits `recalcPerGuestBudgetItems` that paths 1/UI/chatbot run |
| **I1** | single-module vendor sheet sync leaves client stats stale | path 3 omits `recalcClientStats` in one branch |
| **I2** | 4 dead inline importers | abandoned path-2 reimplementations |

**Systemic fix (Prompt 3).** Extract ONE per-module import service (service-layer "how"):
`importModule(tx, { module, clientId, companyId, rows })` that owns, in order: (1)
`validateExcelFile` for buffer sources, (2) parse-by-module-sheet-name, (3) TYPED column
mapping via Drizzle `$inferInsert` (kills C1's class — wrong column names won't compile),
(4) upsert, (5) the module's FULL cascade set (recalcClientStats + recalcPerGuestBudgetItems
where guest/RSVP state changes + sync*ToTimeline), (6) broadcast via the existing
`*_MUTATION_PATHS` SSOT. Every entry point — Excel buffer route, Sheets sync, chatbot bulk —
calls it; the router/sheet/chatbot keep only the "when/auth." Delete the dead reimplementations.
This is the same move that the `*_MUTATION_PATHS` SSOT already did for broadcast paths (which
is why broadcast no longer drifts) — applied to parse+validate+cascade.

**Resolves: D1, B1, C1, P1, I1, I2** (and prevents the next instance of this class).

---

## Cluster S — NO CENTRALIZED TENANT SCOPE  (the dominant SECURITY root)
**Kept separate per directive. The 2 known IDORs were the tip — 11 reads + 8 writes found.**

**Underlying defect.** Cross-tenant authorization is enforced PER-RESOLVER, not by an
invariant. `protectedProcedure` guarantees only authentication (`trpc.ts:77-87`);
`staffProcedure` auto-runs `assertClientAccess` ONLY for `role==='staff'` with a top-level
`clientId` (`trpc.ts:170-175`). So any resolver that (a) is `company_admin`-reachable, or
(b) keys on a non-`clientId` id (floorPlanId, budgetItemId, guestId…), or (c) simply forgets
the `ctx.companyId` filter, reads/writes across tenants. Many do. The fix lives in each
resolver's WHERE clause, so it is omitted exactly where a developer didn't think of it —
and `budget.getAdvancePayments` (unscoped) sitting directly above `budget.getSummary`
(scoped) is the smoking gun that this is per-call-site luck, not an enforced rule.

Resolves the entire sweep inventory: **reads T1–T11**, **writes W1–W8**, plus the
read-into-write PII copies (contracts.create/proposals.create). Includes the global-aggregate
leaks (analyticsExport.getCompanyAnalytics, sms.getSmsStats) and dump-all (sms.getSmsLogs).

**Systemic fix (Prompt 3), defense-in-depth:**
1. **DB-level RLS** on every tenant table keyed to `app.current_company_id`, so a missing
   app-level check FAILS CLOSED instead of leaking. The 11 child tables lacking `companyId`
   (INVENTORY.md:29) get an explicit `companyId` + policy so they're scopable.
2. **A scoped read/write helper** (repository seam) that REQUIRES a companyId and, for
   child-table access by a non-clientId id, verifies the parent's company before returning —
   turning "remember to scope" into "can't forget." Resolvers call it instead of raw `ctx.db`.
3. Convert the offending `protectedProcedure` reads to scope on `ctx.companyId`/parent-ownership.

This is the security analogue of Cluster R: centralize the cross-cutting "how" (tenant scope)
so call sites can't drift.

---

## Cluster E — EXPORT/IMPORT SHAPE NOT SINGLE-SOURCED  (lighter, functional)
**Underlying defect.** The export column/sheet shape (`export-utils.ts`) and the import
parser expectations (`excel-parser-server.ts` / inline) are authored independently, so the
round-trip contract drifts: Events absent from the combined export (E1), transport Guest Name
derived-then-blanked (E2), Gifts/Timeline view-only sheets with no ID/round-trip (E3),
gifts Serial# vs importer ID. Same family as R (no shared module schema), lower severity.
**Systemic fix:** a per-module field SSOT (header ⇄ column ⇄ required) consumed by BOTH the
exporter and the import service from Cluster R. **Resolves: E1, E2, E3** (+ removes the gifts
Serial#/ID mismatch surfaced under B/C).

---

## Cluster H — HARNESS FIDELITY  (meta; not app defects)
H1 (RESOLVED — true T2 measured), H2 (Rail-3 omits Redis-endpoint guard), H3/H4/H5/H6.
Addressed in the harness-hardening pass, not Prompt 3 app fixes. See FINDINGS Cluster H.

---

## One-line map
- **R** (no import service) → D1, B1, C1, P1, I1, I2
- **S** (no centralized tenant scope) → T1–T11, W1–W8, contracts/proposals PII copy
- **E** (no export/import shape SSOT) → E1, E2, E3
- **H** (harness) → H1–H6
