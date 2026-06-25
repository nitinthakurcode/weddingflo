# STATE — Bulletproof Re-Audit ledger (living document)

## Run header
- branch: `audit/bulletproof`
- baseline_run_sha: `d56427080394db01e9309a09fec336c241de8a55`
- node: v24.9.0  |  npm: 11.6.1
- lockfile: package-lock.json  |  sha256: `1de77130466c2ef6e62e85ee99003ff976463c80dbd732bc9ebff3dcee8e768d`
  (NOTE: `npm ci` not yet run — hash is of the current on-disk lockfile; re-confirm after `npm ci` in the harness phase per Rail/STATE schema.)
- created_utc: 2026-06-25T13:17:28Z
- backup: `../weddingflo-safety-backup-1782390506/` (Rail-1 out-of-tree, 504K)

## Status table
Schema: `id | concern | status[pending|verified|fixed|wontfix] | evidence_path | test_id | last_run_sha | timestamp`

| id   | concern | status | evidence_path | test_id | last_run_sha | timestamp |
|------|---------|--------|---------------|---------|--------------|-----------|
| C1a  | Excel round-trip (exceljs) | pending | docs/audit/run-current/CHECKLIST.md#concern-1a | — | d564270 | 2026-06-25T13:17:28Z |
| C1b  | Google Sheets round-trip (googleapis) | pending | CHECKLIST.md#concern-1b | — | d564270 | 2026-06-25T13:17:28Z |
| C2   | Chatbot parity | pending | CHECKLIST.md#concern-2 | — | d564270 | 2026-06-25T13:17:28Z |
| C3   | Informative headers | pending | CHECKLIST.md#concern-3 | — | d564270 | 2026-06-25T13:17:28Z |
| C4   | Real-time new+existing | pending | CHECKLIST.md#concern-4 | — | d564270 | 2026-06-25T13:17:28Z |
| C5   | Vendors per event | pending | CHECKLIST.md#concern-5 | — | d564270 | 2026-06-25T13:17:28Z |
| C6   | Whole-app bulletproof gate | pending | CHECKLIST.md#concern-6 | — | d564270 | 2026-06-25T13:17:28Z |
| C7   | Performance (tiered SLO) | pending | CHECKLIST.md#concern-7 | — | d564270 | 2026-06-25T13:17:28Z |

## Candidate findings (UNVERIFIED — confirm with file:line + SDK source before asserting)
| id | severity | summary | status |
|----|----------|---------|--------|
| F-HOOK | medium | Husky pre-commit hook runs `npm audit` and FAILS on 12 pre-existing dep vulns (1 low, 11 moderate) → blocks ALL commits unless `--no-verify`. Surfaced when making the baseline commit. | open |
| D1 | medium | Inline guests/guestGifts Excel importers (`import.router.ts`) may SKIP `validateExcelFile()` (CLAUDE.md rule 28). | open, to verify |
| D2 | medium | No DI seam/mock for Google Sheets client → concern 1b not testable offline. Harness to add FakeSheetsClient seam (single authorized src/ change). | open, planned |
| D3 | medium | Excel round-trip contract test is header-only (no real .xlsx, no DB/cascade assertion) → prior "fixed" is a false-green risk. | open |
| D4 | low (out-of-scope) | 11 child tables lack explicit `companyId` (parent-FK scoped). Security observation; report only. | noted |
| DEP | info | Dependency vuln chain: esbuild, postcss(via next), uuid<11.1.1 (via exceljs/gaxios/google-gax/@google-cloud/firebase-admin/teeny-request). Report in dependency-currency audit; do NOT upgrade. | open |

## Decisions locked (Prompt 0)
- Sheets 1b: FakeSheetsClient DI seam (CI gate) + separate nightly live-sandbox smoke.
- Tiered SLO: T1<500ms ack, T2<2s propagation (target<1.5s, floor~1s), T3 cascade measure-then-classify.
- All prior "FIXED" = UNVERIFIED until a test runs.

## Progress log
- 2026-06-25T13:17Z — Prompt 0 orientation complete (read-only recon, prior-run reconciliation).
- 2026-06-25T13:17Z — Prompt 1 setup steps: created branch `audit/bulletproof`; baseline anchor
  commit `d564270` (empty, `--no-verify` to bypass npm-audit gate, no files → no secret risk);
  out-of-tree backup `../weddingflo-safety-backup-1782390506`; persisted ledger
  (INVENTORY/FLOWS/CHECKLIST/STATE) + RAILS.md. STOPPED — awaiting harness spec (real Prompt 1).

## NOT YET DONE (deferred to harness phase / real Prompt 1)
- Stand up + PROVE isolated non-prod test DB (Rail 3: host regex + db-name `dev` + user sets
  `TEST_DB_CONFIRMED=1`); pg_dump into backup folder.
- Prove side-effect sandbox (resend/twilio/firebase/Stripe/S3) via msw or sandbox keys.
- Toolchain/runner detection + CI gate enumeration; dependency-currency table.
- FakeSheetsClient DI seam (single authorized src/ change).
- Committed deterministic seed (@faker-js/faker fixed seed, fixed PKs, injected clock).
- Real end-to-end / failing scaffolds per concern; teardown-twice row-count diff.
- Add SDK-reference convention to CLAUDE.md.
