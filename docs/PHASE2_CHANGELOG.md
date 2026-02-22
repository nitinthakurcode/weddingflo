# Phase 2 Security Remediation — Changelog

**Date:** 2026-02-22
**Scope:** HIGH-severity findings from December 2025 security audit
**Status:** Implementation COMPLETE — pending staging deployment

---

## SQL Migrations

All migrations target the production PostgreSQL database via `drizzle-kit migrate`.

| # | File | Status | Description |
|---|------|--------|-------------|
| 1 | `drizzle/migrations/0022_create_app_role.sql` | ADDED | Creates non-superuser `weddingflo_app` role with least-privilege grants. Superusers bypass RLS, so this is a prerequisite for all RLS policies. |
| 2 | `drizzle/migrations/0023_rls_helpers_and_denormalize.sql` | ADDED | Creates `current_company_id()` helper function, denormalizes `company_id` onto child tables (guests, vendors, services, etc.) for RLS filtering. |
| 3 | `drizzle/migrations/0024_enable_rls_all_tables.sql` | ADDED | Enables Row-Level Security on all 85+ tenant-scoped tables. Creates `SELECT/INSERT/UPDATE/DELETE` policies using `current_company_id()`. |
| 4 | `drizzle/migrations/0025_prepare_oauth_encryption.sql` | ADDED | Adds `tokens_encrypted_at TIMESTAMPTZ` column to the `account` table for tracking OAuth token encryption migration progress. |

---

## Security Modules

Core security implementations added to the application source.

| # | File | Status | Description |
|---|------|--------|-------------|
| 1 | `src/lib/auth/argon2-password.ts` | ADDED | Argon2id password hashing (64 MiB, 3 iterations, 1 parallelism) with transparent bcrypt migration. Exports `hashPassword()`, `verifyPassword()`, `isLegacyBcryptHash()`, `rehashIfNeeded()`. |
| 2 | `src/lib/crypto/token-encryption.ts` | ADDED | AES-256-GCM encryption for OAuth tokens at rest. Exports `encryptToken()`, `decryptToken()`, `isEncrypted()`, `reEncryptToken()`. Format: `enc:v1:<iv>:<authTag>:<ciphertext>`. Gracefully passes through plaintext for gradual migration. |
| 3 | `src/lib/sse/connection-manager.ts` | ADDED | Redis-backed SSE connection limiter. `SSEConnectionManager` class enforces 5 connections/user and 50 connections/company with atomic Redis counters and TTL fallback. Exports `acquire()`, `release()`, force-disconnect methods. |
| 4 | `src/lib/db/with-tenant-scope.ts` | ADDED | Drizzle ORM wrapper that sets PostgreSQL session variable (`SET LOCAL app.current_company_id`) before queries. Enables application-level RLS context. Exports `withTenantScope()`, `createTenantScopeMethod()`. |

---

## Tests

All test files use `@jest-environment node` docblock for Node.js crypto/Redis access.

| # | File | Status | Description |
|---|------|--------|-------------|
| 1 | `tests/security/argon2-password.test.ts` | ADDED | 16 tests: hash/verify round-trip, unique salts, hash format validation, bcrypt backward compatibility, `isLegacyBcryptHash()` detection, edge cases (empty, long, special chars), performance (<1s). |
| 2 | `tests/security/token-encryption.test.ts` | ADDED | 21 tests: encrypt/decrypt round-trip, format validation (`enc:v1:` prefix), tamper detection (GCM auth tag), double-encryption prevention, plaintext passthrough, key rotation, empty/null handling, long token support. |
| 3 | `tests/security/rls-isolation.test.ts` | ADDED | Integration test for cross-tenant RLS isolation. Requires live PostgreSQL with `weddingflo_app` role — skips gracefully without DB. |
| 4 | `tests/security/sse-connection-manager.test.ts` | ADDED | Integration test for per-user/company SSE limits with Redis. Requires live Upstash Redis — skips gracefully without connection. |

**Test results (local):**
- `token-encryption.test.ts` — 21/21 PASSED
- `argon2-password.test.ts` — 16/16 PASSED
- `rls-isolation.test.ts` — Expected skip (needs live DB)
- `sse-connection-manager.test.ts` — Expected skip (needs live Redis)
- Existing app tests — 9 suites, 173 tests, ALL PASSED (0 regressions)

---

## Scripts

| # | File | Status | Description |
|---|------|--------|-------------|
| 1 | `scripts/encrypt-existing-tokens.ts` | ADDED | One-time batch migration to encrypt existing plaintext OAuth tokens. Processes 100 rows/batch, supports `--dry-run`, idempotent (skips already-encrypted rows), stamps `tokens_encrypted_at`. Usage: `npx tsx scripts/encrypt-existing-tokens.ts`. |
| 2 | `scripts/verify-phase2.sh` | ADDED | Post-deployment verification (5 checks): health endpoint, RLS manual psql commands, HSTS header, CSP header, `npm audit --audit-level=high`. Color output (green/red/yellow), exit code = failure count. Usage: `./scripts/verify-phase2.sh`. |

---

## CI/CD

These files were committed in a prior deployment cycle and verified during Phase 2.

| # | File | Status | Description |
|---|------|--------|-------------|
| 1 | `.github/workflows/security.yml` | ALREADY COMMITTED | 7-job security pipeline: framework version check, npm audit (HIGH+CRITICAL), Semgrep SAST, TruffleHog secret detection, TypeScript type checking, license compliance (blocks GPL/AGPL), OWASP Dependency Check with SARIF upload. Security gate requires all jobs to pass. |
| 2 | `.github/dependabot.yml` | ALREADY COMMITTED | Automated dependency updates: npm (daily, 10 PR limit, security patch grouping), GitHub Actions (weekly), Docker (weekly). Reviewer: nitinthakur. |

---

## Documentation

| # | File | Status | Description |
|---|------|--------|-------------|
| 1 | `docs/phase2/README.md` | ADDED | Comprehensive Phase 2 implementation guide: 9 steps, pre-flight checklist, architecture changes table, post-deployment verification, rollback procedures. |
| 2 | `docs/SECRET_ROTATION_RUNBOOK.md` | ADDED | 90-day secret rotation schedule covering DATABASE password, BETTER_AUTH_SECRET, TOKEN_ENCRYPTION_KEY, API keys (OpenAI, Stripe, Resend, Twilio), Google OAuth client secret, Firebase admin credentials. Includes step-by-step procedures and verification commands. |
| 3 | `WEDDINGFLO_ARCHITECTURE.md` | MODIFIED | Updated security rating from 10/10 to 8.5/10 (4 locations). Updated password hashing references from bcrypt to Argon2id (4 locations). Updated OAuth token encryption to AES-256-GCM. Added "Phase 2 Security Changes (February 2026)" section with before/after architecture changes table and key files list. |
| 4 | `docs/PHASE2_CHANGELOG.md` | ADDED | This file. |

---

## Config Changes

### Modified Application Files

| # | File | What Changed |
|---|------|-------------|
| 1 | `src/lib/auth.ts` | Wired `hashPassword` and `verifyPasswordWithRehash` from `argon2-password.ts` into BetterAuth `emailAndPassword.password` config. All new password hashes use Argon2id; legacy bcrypt verified transparently. |
| 2 | `src/server/trpc/context.ts` | Added `withTenantScope()` call to set RLS session variable (`app.current_company_id`) on authenticated tRPC requests. |
| 3 | `src/app/api/calendar/google/callback/route.ts` | Integrated `encryptToken()`/`decryptToken()` for Google Calendar OAuth `accessToken` and `refreshToken` read/write paths. |
| 4 | `src/features/backup/server/routers/googleSheets.router.ts` | Integrated `encryptToken()`/`decryptToken()` for Google Sheets OAuth tokens in `handleOAuthCallback`, `syncNow`, and `importFromSheet` procedures. |
| 5 | `src/server/trpc/routers/sync.router.ts` | Integrated `encryptToken()`/`decryptToken()` for sync router OAuth token access. Added SSE `acquire()`/`release()` guard in `try/finally` block. |
| 6 | `jest.config.js` | Removed `/tests/` from `testPathIgnorePatterns` (was blocking security tests). Added `/docs/phase2/` (prevent duplicate matching). Added `'\\.spec\\.ts$'` (exclude Playwright specs from Jest). |
| 7 | `jest.setup.ts` | Wrapped browser-only mocks (`window.matchMedia`, `IntersectionObserver`, `ResizeObserver`) in `if (typeof window !== 'undefined')` guard for `@jest-environment node` compatibility. |
| 8 | `package.json` | Added `@node-rs/argon2` dependency. |
| 9 | `package-lock.json` | Lock file updated for `@node-rs/argon2` and its native bindings. |
| 10 | `.env.production.example` | Added `TOKEN_ENCRYPTION_KEY` with generation instructions. |

### Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `@node-rs/argon2` | `^2.0.2` | Native Argon2id password hashing. OWASP 2025 recommended algorithm. N-API bindings for performance (~100-500ms per hash on modern hardware). |

### Environment Variables Introduced

| Variable | File | Required | Description |
|----------|------|----------|-------------|
| `TOKEN_ENCRYPTION_KEY` | `.env.production.example` | Yes (for token encryption) | AES-256-GCM key for encrypting OAuth tokens at rest. Generate with: `openssl rand -base64 32`. Without this key, `encryptToken()` is a no-op and tokens remain plaintext. |

---

## Remaining for Staging

The following items require live infrastructure and cannot be verified locally:

### Integration Tests Requiring Live Infrastructure

1. **`tests/security/rls-isolation.test.ts`** — Requires PostgreSQL with the `weddingflo_app` role created by migration `0022`. Verifies that setting `app.current_company_id` via `SET LOCAL` correctly isolates tenant data and that queries without tenant context return zero rows.

2. **`tests/security/sse-connection-manager.test.ts`** — Requires Upstash Redis (or compatible) with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set. Verifies per-user (5) and per-company (50) connection limits, atomic counter behavior, TTL fallback, and force-disconnect.

### Production Migration Script

3. **`scripts/encrypt-existing-tokens.ts`** — Must be run against the production database after deploying the `0025_prepare_oauth_encryption.sql` migration. Encrypts all existing plaintext OAuth tokens in the `account` table using `TOKEN_ENCRYPTION_KEY`. Run with `--dry-run` first to preview affected rows.

   ```bash
   # Dry run (preview only)
   TOKEN_ENCRYPTION_KEY=<key> npx tsx scripts/encrypt-existing-tokens.ts --dry-run

   # Production run
   TOKEN_ENCRYPTION_KEY=<key> npx tsx scripts/encrypt-existing-tokens.ts
   ```

---

*Phase 2 Security Remediation — Implementation COMPLETE.*
*Generated: 2026-02-22*
