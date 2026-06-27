# Safety Rails — Bulletproof Re-Audit (verbatim, governs EVERY prompt)

> Canonical transcription of the SAFETY RAILS issued in Prompt 0. These govern every
> phase. If any instruction conflicts with a rail, the rail wins.

0. **PRE-FLIGHT GATE** — run first and paste raw output before anything else:
   `pwd`, `git rev-parse --show-toplevel`, `git remote -v`, confirm
   `docs/DEVELOPER_HANDBOOK.md` exists, confirm `.claude/skills`, grep the stack in
   `package.json`. If the handbook is absent OR the stack grep returns nothing: STOP
   and report "This does not look like the WeddingFlo app — I am in <pwd>. I will not
   proceed." Do NOT scaffold the app, create missing files, cd elsewhere, or relaunch
   without explicit approval. If handbook+stack present but a skill is missing,
   install it from the Downloads source; if that's absent, STOP. After the gate passes,
   run /agentic-engineering-workflow and confirm the body loaded; if it doesn't load,
   the session is in the wrong folder — STOP.

1. **BRANCH + BASELINE**: `git switch -c audit/bulletproof`. Commit a clean baseline.
   Never touch main. `git revert` ONLY restores TRACKED files. Before ANY destructive
   phase, DISCOVER untracked critical state AT RUNTIME (do not hardcode paths): read
   `.gitignore` and `git status --porcelain --ignored` to enumerate gitignored critical
   artifacts (env files, local images/upload dir, seed/test DB). For each that ACTUALLY
   EXISTS, copy it OUT OF TREE into `../weddingflo-safety-backup-$(date +%s)/` and
   pg_dump the dev/test DB into the same folder. Verify each source path exists before
   copying; never invent a path. State explicitly which artifacts are NOT
   git-recoverable. A git commit is NOT a backup of untracked data. (User uploads may
   live in S3, not locally — do not assume a local upload dir exists.)

2. **SOURCE OF TRUTH**: `docs/DEVELOPER_HANDBOOK.md` (exact casing) took months to build
   and is ~217KB. Read it FULLY but in CHUNKS to avoid context loss. NEVER edit it. It
   DEFINES correct behavior — when code disagrees, the CODE is the bug. If the handbook
   itself looks outdated, STOP and ask; do not assume. If the file is not at that exact
   path/casing, STOP.

3. **NON-PROD DATA & SIDE-EFFECTS (fail-closed)**: before ANY write/delete test, print
   the resolved DB connection host + db-name. PROOF of non-prod = host matches
   `^(localhost|127\.0\.0\.1|.*\.local|.*-test|.*-dev)` AND db-name contains `dev` AND
   env var `TEST_DB_CONFIRMED=1` is set by the user. ALSO — this app's automations can
   fire REAL external side-effects: email (resend), SMS (twilio), push
   (firebase/firebase-admin), payments (stripe), and S3 writes (@aws-sdk/client-s3).
   Before running ANY automation/cascade test, PROVE every one is sandboxed — stubbed
   via msw OR pointed at sandbox/test keys and a non-prod S3 bucket/prefix. NEVER let a
   test send a real email/SMS, create a real charge, or write to a prod bucket. If
   DB-proof OR side-effect-sandbox cannot be proven, STOP and ask. Default is REFUSE.
   Never mutate data through any DB-bound MCP — use it read-only; mutating tests connect
   directly to the proven test DB.

4. **MCP/TOOL VERIFICATION**: verify in-session which browser-testing path is live
   (Playwright MCP tool names present? webapp-testing skill? @playwright/test via npx
   playwright?). Never simulate E2E. If none is live when a prompt needs it, STOP.

5. **ONE CHANGE AT A TIME**: after each change run typecheck + lint + relevant tests
   (vitest unit / @playwright/test e2e). Any gate RED → revert THAT change immediately
   and report. Never batch/pile.

6. **DO NOT rebuild or rewrite anything that already works.** Improve in place, smallest
   diff. Never delete a file without evidence + explicit approval.

7. **DO NOT SUPPOSE.** Verify against code and CURRENT (June 2026) SDK source in
   node_modules. Every defect must cite expected-behavior (handbook section) AND
   actual-behavior (file:line). If you cannot cite both, mark it UNVERIFIED and read the
   SDK source before asserting. No concern PASSES without a green test logged in STATE.md.

8. **SECRETS**: never `git add -A`. Stage by explicit path. Before any commit, scan the
   STAGED DIFF CONTENT (not just filenames) and abort WITHOUT killing the shell:
   block secret-like filenames (`.env|secret|key|credential`) and secret values
   (`sk-…`, `AIza…`, `ghp_…`, `-----BEGIN … PRIVATE KEY-----`). Run in a subshell so a
   hit aborts the commit, never the agent's session.

9. **GOVERNING PROCESS** for every prompt: follow /agentic-engineering-workflow
   (plan-then-build, smallest reviewable unit, search-before-create, source-as-context,
   separate cleanup pass, review-fix loop). If any instruction conflicts with a rail,
   the rail wins.

---

## Standing addenda (approved during Prompt 0)

- **Treat ALL prior "FIXED" claims as UNVERIFIED** until a test actually runs the
  behavior. A "fixed" with no running cascade assertion is the false-green that caused
  the repeat-bug loop.
- **Working mode**: read-only orientation first; manual edit approval throughout (no
  auto mode); do not auto-run the roadmap; STOP between phases and wait.
- **Tiered performance SLO** (all P95, measured + recorded in STATE.md; FAIL over budget;
  record P50/P95 regardless):
  - T1 interactive mutation ack < 500ms (primary gate).
  - T2 propagation (mutation→broadcast→SSE deliver→other-client invalidate) < 2s
    end-to-end, target < 1.5s; 500ms SSE poll is the hard floor (don't set below ~1s).
  - T3 23-table client cascade delete: MEASURE first; if blocking → ceiling < 2s + flag
    async candidate; if async → ack < 500ms + settled signal < 5s.
  - Test T1/T2 on NEW and EXISTING entities; cascade-delete on freshly-seeded AND legacy
    back-filled clients. Harness timestamps a mutation and polls until settled — never
    fixed sleeps.
- **Single authorized src/ change in the harness phase**: the FakeSheetsClient DI seam
  (concern 1b), behavior-preserving, via /service-layer-architecture, reviewed via
  /code-review, logged in STATE.md. All other real fixes wait for Prompt 3.
