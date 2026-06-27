# FLOWS — End-to-end flows the handbook promises (each gets a green test)

Source of truth: `docs/DEVELOPER_HANDBOOK.md`. Each flow below maps to a CHECKLIST
assertion and a test (to be built in the harness phase). "Cascade" = the downstream
automations that MUST also fire.

## F1 — Excel round-trip (per module: guests, budget, hotels, transport, vendors, gifts, timeline, events)
Export `.xlsx` → user edits a row / adds a row / sets Action=DELETE → re-import.
Promise: edit updates the right column on the right record; new row inserts; DELETE row
removes; non-destructive (a column absent from the file is NOT nulled); upsert keyed by `ID`.
Cascade: recalcClientStats (guests/budget/vendors), recalcPerGuestBudgetItems (guests),
syncVendorBudgetItem + cascadeVendorLinkDelete (vendors), sync*ToTimelineTx (hotels/
transport/events), broadcastSync. Headers must be client-readable display names + hint row.

## F2 — Google Sheets round-trip (same 7 modules)
Sheets export (USER_ENTERED) → edit → import. Promise: name-based column mapping, OAuth
token refresh on expiry, Action=DELETE removes, same cascade set as F1, broadcastSheetSync.
Failure modes distinct from Excel (OAuth, range, quota). Verified via FakeSheetsClient seam
(deterministic) + a separate nightly live-sandbox smoke.

## F3 — Chatbot mutation parity
add/edit/delete tool → same automation set + identical `*_MUTATION_PATHS` invalidation as the
UI router and the import path. Verified against real DB via the integration harness.

## F4 — New client auto-creation cascade
`clients.create` with wedding_date (+optional vendors) → `createEventWithTimeline()`
auto-creates Main Wedding event + template timeline + placeholder budget + vendor rows, in one
transaction; broadcasts events/timeline/budget/vendors paths. (NEW-entity real-time path.)

## F5 — Existing client wedding-date change
`clients.update` with new wedding_date → main event synced + timeline items shifted via
`shiftEventTimelineForDateChange()` (preserves per-item offsets); broadcast events/timeline.
(EXISTING-entity real-time path.)

## F6 — Guest RSVP change
RSVP mutation → normalizeRsvpStatus → recalcPerGuestBudgetItems (confirmed-count × perGuest)
→ recalcClientStats → cascade hotels/transport/timeline/budget.getSummary → broadcast.

## F7 — Vendor cost / event change
add/update vendor → syncVendorBudgetItem (upsert linked budget item with event/category) →
timeline entry → recalcClientStats → broadcast. Event auto-linked by serviceDate when applicable.

## F8 — Cross-tab / cross-user live propagation
Mutation in client A's tab → broadcastSync (Redis sorted-set) → SSE `sync.onSync` → other
tab/user `useRealtimeSync` invalidates the listed queryPaths and refetches. Must work for both
NEW and EXISTING entities. broadcastSync must never throw (best-effort).

## F9 — Client soft-delete + manual 23-table cascade
`clients.delete` soft-sets `deletedAt` (so DB FK cascade never fires) and MUST hard-delete all
23 child tables in FK-safe order inside one transaction → no orphans. Guarded by
`client-cascade-completeness.test.ts`.

## F10 — Vendor per-event segregation
`vendors.getAll({eventId})` returns only that event's vendors; `'unassigned'` returns
eventId IS NULL; omitted returns all. Excel/Sheets `Event` column round-trips to
`clientVendors.eventId`.
