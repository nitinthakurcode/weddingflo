# CONVERGENCE — why 5 "bulletproof" runs each found NEW bugs (Prompt 2.5, read-only)

> Direct answer + the mechanical change that permanently removes the dominant class.
> Re-validated in Prompt 6. Evidence cited to STATE.md (M1–M7) and ROOTCAUSE.md (R/S).

## The answer in one sentence
Each run found "new" bugs not because new bugs were written, but because the defects live
as a **class spread across many sibling call-sites**, and every prior run **(a) verified one
representative call-site, declared the whole category fixed, and (b) did so with a harness
that asserted SHAPE, not behavior** — so the untested siblings carrying the identical class
resurfaced as "new" findings the next run. The bug count didn't grow; the **sample** moved.

## Mechanism 1 — per-module SAMPLING masquerading as category coverage
A run would verify the *canonical / most-polished* path and mark the concern done:
- "Excel import ✓" was proven on **budget** (the one parser that does validate + cascade
  correctly). The siblings `importGuest`/`importGift`/`importGuestGift` carried **D1, B1, C1**
  the entire time — never run. (ROOTCAUSE Cluster R.)
- "Tenant isolation looks fine" because `floorPlans.getById` IS scoped — while its 11 sibling
  reads + 8 writes were unscoped and untested. (ROOTCAUSE Cluster S; the sibling sweep this
  pass turned "2 IDORs" into 19.)
- "Realtime ✓ (9ms)" measured publish, not delivery (H1).
"budget fixed" was silently read as "import fixed"; "getById safe" as "tenant isolation safe."
The category claim always exceeded what was actually exercised.

## Mechanism 2 — a FALSE-GREEN harness (M1–M7) made even the sampled claim hollow
Per STATE.md, the prior harness lacked the means to assert behavior, so green meant little:
- **M1** no deterministic seed (random UUIDs) → could not assert a specific row changed.
- **M2** no real `.xlsx` round-trip — the existing contract test was header-only, in-memory
  Maps (D3): it asserted column SHAPE, never an upsert/delete/cascade. A broken importer
  passed it.
- **M3** no offline Sheets test, **M4** no perf/SLO test, **M5** no cross-tab realtime,
  **M6** E2E not pinned to a known DB, **M7** no local DB at all.
Result: tests passed without running the behavior → a "FIXED" with no running cascade
assertion is the canonical false green (RAILS standing addendum). The repeat loop fed on it.

## Mechanism 3 — instance-patching, never class-enumeration
Each run hunted bugs ad-hoc and patched the instance it tripped over, never enumerating ALL
members of the class (every importer; every tenant-scoped read/write). Because the underlying
roots are "a cross-cutting concern reimplemented per call-site" (R: import mechanics; S:
tenant scope), patching one instance leaves N−1 identical siblings — guaranteeing the next
run finds "new" ones. This is the engine of the loop.

## The dominant class
**Cross-cutting logic copied per call-site instead of centralized + enforced** (ROOTCAUSE R & S).
It regenerates findings indefinitely under sampling + false-green harness.

## Mechanical change that PERMANENTLY removes it
Four moves, the first two already built this audit, the last two scheduled for Prompt 3/6:
1. **Deterministic, behavior-asserting, PER-MODULE harness** (built P1–P2):
   fixed seed (M1) + real local DB (M7) + real `.xlsx`/Sheets round-trip with DB+cascade+
   broadcast assertions (M2/M3) + true cross-tab T2 (M4/M5) — and run for EVERY module, not a
   representative. Converts "sampled budget" → "every module asserted." (20 audit files now.)
2. **Sibling enumeration as a step** (this prompt): for every confirmed defect, grep ALL
   call-sites of its class (the IDOR sweep, the importer matrix) and log each — so a class is
   closed by inventory, not by luck.
3. **Centralize the cross-cutting concern** (Prompt 3, ROOTCAUSE R/S fixes): collapse the N
   import call-sites into ONE import service and the N tenant-scope checks into ONE enforced
   seam (+ RLS fail-closed). After collapse there is exactly ONE place to test per class — a
   class can no longer have untested siblings. (This is what the `*_MUTATION_PATHS` SSOT
   already did for broadcast drift; broadcast stopped regressing once centralized.)
4. **CI gate** (Prompt 6): run `vitest.audit.config.ts` against the pinned test stack on every
   PR, plus a contract test on the centralized service + an RLS/scope test that fails closed.
   Any new call-site that bypasses the service, or any unscoped query, breaks the build.

Net: sampling is replaced by full per-module + sibling coverage (1+2); centralization removes
the siblings entirely (3); the CI gate prevents reintroduction (4). The loop's fuel —
untested siblings of a known class — is eliminated, not merely drained.

## Falsifiable prediction (re-validate in Prompt 6)
After the Cluster R/S centralizations + CI gate land, a 6th independent audit pass should find
**zero new instances of Clusters R and S** (it may still find genuinely new, unrelated defects
— that's normal). If a 6th pass finds another importer or unscoped read of the SAME class, the
centralization was incomplete (a call-site bypassed the service) — that, not a brand-new class,
is the thing to check.
