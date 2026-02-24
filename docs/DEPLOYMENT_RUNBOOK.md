# WeddingFlo — Production Deployment Runbook

> **Last Updated:** 2026-02-24 (Session 8)
> **Applies To:** Post-audit deployment with 28 migrations (0000–0027)
> **Target:** Dokploy on Hetzner

---

## Prerequisites

- SSH access to production server
- `DATABASE_URL` for production PostgreSQL (Supabase)
- `psql` client available locally or on server
- `gh` CLI authenticated (for Dokploy deploy trigger if applicable)

---

## Phase 1: Pre-Deployment Verification (LOCAL)

Run all checks locally against the codebase before deploying:

```bash
# 1. TypeScript — zero errors required
npx tsc --noEmit

# 2. Tests — 307 pass, 0 fail
npx vitest run

# 3. Production build — all routes must compile
npm run build

# 4. Migration consistency — "Everything's fine"
npx drizzle-kit check
```

**STOP if any check fails.** Fix before proceeding.

---

## Phase 2: Database Backup

```bash
# Full database backup (adjust connection string)
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%Y%m%d-%H%M%S).dump"

# Verify backup is non-empty
ls -lh backup-*.dump
```

Keep this backup for at least 7 days post-deploy.

---

## Phase 3: Run Migrations

```bash
# Apply all pending Drizzle migrations
npx drizzle-kit migrate
```

**What this does:**
- Migrations 0000–0022: Schema setup (tables, indexes, foreign keys)
- Migration 0023: RLS helper functions + company_id denormalization
- Migration 0024: Enable RLS on all tenant-scoped tables
- Migration 0025: OAuth token encryption preparation
- Migration 0026: Schema reconciliation (type fixes, NOT NULL constraints)
- Migration 0027: company_id backfill + RLS catch-up for late tables

**Note:** Migration 0026 wraps all SET NOT NULL in exception handlers — they silently skip if NULLs exist. The normalization script in Phase 4 re-applies them after backfill.

---

## Phase 4: Run Data Normalization Script

```bash
# DRY RUN first — uncomment the SELECT statements in the script header
# to see how many rows would be affected, then re-comment them

# Execute the normalization
psql "$DATABASE_URL" -f scripts/normalize-existing-data.sql
```

**What this does (5 sections):**

1. **RSVP normalization** — `attending`/`accepted`/`yes` → `confirmed`, `not_attending`/`no` → `declined`, `tentative` → `maybe`, catch-all → `pending`
2. **Guest side normalization** — `bride`/`bride_side` → `partner1`, `groom`/`groom_side` → `partner2`, `both`/`common`/`shared` → `mutual`
3. **company_id backfill** — Fills NULL company_id on 10 child tables from parent client/conversation
4. **NOT NULL re-apply** — Re-applies NOT NULL constraints that may have silently failed in migration 0026
5. **Client stats recalculation** — Recalculates `guest_count` and `budget` on all clients from actual data

**Post-run verification:**

```sql
-- Confirm no legacy enum values remain
SELECT rsvp_status, COUNT(*) FROM guests GROUP BY rsvp_status ORDER BY 2 DESC;
SELECT guest_side, COUNT(*) FROM guests GROUP BY guest_side ORDER BY 2 DESC;

-- Confirm no NULL company_ids on critical tables
SELECT COUNT(*) AS null_company_guests FROM guests WHERE company_id IS NULL;
SELECT COUNT(*) AS null_company_events FROM events WHERE company_id IS NULL;
SELECT COUNT(*) AS null_company_budget FROM budget WHERE company_id IS NULL;

-- Spot-check client stats accuracy (should return 0 rows)
SELECT id, partner1_first_name, guest_count,
       (SELECT COUNT(*) FROM guests g WHERE g.client_id = clients.id) AS actual_count
FROM clients
WHERE deleted_at IS NULL
  AND guest_count != (SELECT COUNT(*) FROM guests g WHERE g.client_id = clients.id)
LIMIT 10;
```

---

## Phase 5: Deploy New Code

Deploy to Dokploy on Hetzner using your standard process:

```bash
# Push to main (or trigger deploy branch)
git push origin main

# Or trigger via Dokploy API/dashboard
# Verify build completes in Dokploy logs
```

Wait for the deployment to finish and the health check to pass.

---

## Phase 6: Post-Deployment Smoke Tests

Run through these 8 QA flows manually after deploy:

### Flow 1: Authentication
- [ ] Sign in with email/password
- [ ] Sign in with Google OAuth
- [ ] Sign out and redirect to `/sign-in`
- [ ] Verify session persists across page refresh

### Flow 2: Client CRUD
- [ ] Create a new client (should auto-create budget template)
- [ ] Verify `guest_count` shows 0 and `budget` shows template total
- [ ] Edit client details
- [ ] Soft-delete a client (verify it disappears from list)

### Flow 3: Guest Management
- [ ] Add a guest — verify `guest_count` increments on client card
- [ ] Update RSVP to "confirmed" — verify budget recalculation
- [ ] Check in a guest — verify real-time update for other users
- [ ] Delete a guest — verify `guest_count` decrements

### Flow 4: Budget Operations
- [ ] Add a budget item — verify `clients.budget` total updates
- [ ] Add an advance payment
- [ ] Delete a budget item — verify total recalculates

### Flow 5: Import/Export
- [ ] Import guests from Excel — verify normalization (legacy RSVP values → canonical)
- [ ] Export guests to Excel — verify column headers and data
- [ ] Google Sheets sync (if configured) — import and verify

### Flow 6: Chatbot
- [ ] Start a conversation
- [ ] Ask chatbot to add a guest — verify `recalcClientStats` runs
- [ ] Ask chatbot to add a vendor — verify budget item created

### Flow 7: Multi-Tenant Isolation
- [ ] Log in as Company A user — verify only Company A data visible
- [ ] Log in as Company B user — verify only Company B data visible
- [ ] Verify RLS policies block cross-tenant access

### Flow 8: Real-Time Sync
- [ ] Open same client in two browser tabs/users
- [ ] Make a change in tab 1 — verify tab 2 updates within 5 seconds
- [ ] Verify SSE connection establishes (check Network tab for `/api/chatbot/stream`)

---

## Phase 7: Monitoring Checklist (First 24 Hours)

Watch for these signals in the first day:

| Signal | Where to Check | Action if Triggered |
|--------|---------------|---------------------|
| 500 errors | Dokploy logs / server error logs | Check for missing env vars or migration issues |
| Slow queries (>5s) | PostgreSQL slow query log | Check if new indexes from migrations are in place |
| RLS policy violations | Application error logs (`tenant_isolation`) | Verify company_id is populated on all rows |
| SSE connection failures | Browser console / Network tab | Check Redis connection, verify SSE endpoint |
| Client stats drift | Dashboard showing wrong guest/budget counts | Run emergency SQL (Section 9) |
| Auth failures | Sign-in page errors | Verify BetterAuth session table, check cookie domain |
| Chatbot errors | Chatbot conversation UI | Check SSE streaming endpoint, verify tRPC router |
| Enum display issues | Guest list showing raw values | Verify normalization script ran; check UI label mapping |

---

## Phase 8: Rollback Procedure

### Code Rollback
```bash
# In Dokploy, redeploy the previous commit
# Or locally:
git log --oneline -5  # Find the previous good commit
git revert HEAD       # Create a revert commit
git push origin main  # Trigger redeploy
```

### Database Rollback
```bash
# Restore from the backup taken in Phase 2
pg_restore --dbname="$DATABASE_URL" --clean --if-exists "backup-YYYYMMDD-HHMMSS.dump"
```

**Warning:** Database rollback will lose any data created after the backup. Only use as a last resort.

### Partial Rollback (Data Only)
If only the normalization script caused issues:
```sql
-- The normalization script is idempotent and only changes legacy values.
-- There is no "undo" because the old values were incorrect.
-- If you need to investigate, check the updated_at timestamps:
SELECT * FROM guests WHERE updated_at > '2026-02-24' ORDER BY updated_at DESC LIMIT 20;
```

---

## Phase 9: Emergency SQL — Fix Client Stats Drift

If client dashboard shows wrong guest counts or budget totals, run this:

```sql
-- Recalculate ALL client cached stats (safe to run anytime)
UPDATE clients SET
  guest_count = COALESCE(sub.cnt, 0),
  budget = COALESCE(sub.total, '0'),
  updated_at = NOW()
FROM (
  SELECT
    c.id AS client_id,
    (SELECT COUNT(*)::INTEGER FROM guests g WHERE g.client_id = c.id) AS cnt,
    (SELECT COALESCE(SUM(CAST(b.estimated_cost AS NUMERIC)), 0)::TEXT
     FROM budget b WHERE b.client_id = c.id) AS total
  FROM clients c
  WHERE c.deleted_at IS NULL
) sub
WHERE clients.id = sub.client_id
  AND clients.deleted_at IS NULL;
```

This matches the logic in `src/lib/sync/client-stats-sync.ts` and is idempotent.

---

## Reference

- **Migration files:** `drizzle/migrations/0000–0027`
- **Normalization script:** `scripts/normalize-existing-data.sql`
- **Session 8 final report:** `docs/audit/session-8-final-report.md`
- **Architecture rules:** `docs/audit/session-8-final-report.md` Section 7 (38 rules)
- **Standards:** `.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md`
- **Drizzle config:** `drizzle.config.ts`
