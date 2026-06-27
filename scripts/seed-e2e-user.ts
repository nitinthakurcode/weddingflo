/**
 * Provisions a DETERMINISTIC E2E test account directly in the target Postgres so
 * Playwright's global-setup can log in via the real BetterAuth sign-in form WITHOUT
 * depending on any pre-existing user or external secret. Fully idempotent.
 *
 * Creates, on fixed ids:
 *   - a company (onboarding already complete),
 *   - a BetterAuth `user` (company_admin, email verified, onboarding complete,
 *     companyId set → login lands on /dashboard with no /sync detour),
 *   - a `credential` account row with an Argon2id password hash (via the app's
 *     own hashPassword, so auth.ts verifyPassword accepts it).
 *
 *   DATABASE_URL=... [TEST_USER_EMAIL=... TEST_USER_PASSWORD=...] npx tsx scripts/seed-e2e-user.ts
 *
 * The TEST_USER_EMAIL/PASSWORD defaults match e2e/helpers/auth.ts, so CI needs no
 * TEST_USER_* secrets — the seed and the Playwright login use the same known values.
 */
import { hashPassword } from '@/lib/auth/argon2-password'
import postgres from 'postgres'

const EMAIL = process.env.TEST_USER_EMAIL || 'test@test.com'
const PASSWORD = process.env.TEST_USER_PASSWORD || 'E2eTest!Pass123'
const NAME = process.env.TEST_USER_NAME || 'E2E Test User'

// Deterministic fixed identifiers — re-running updates the same rows (idempotent).
const COMPANY_ID = '00000000-0000-4000-a000-0000000000e2'
const USER_ID = 'e2e-test-user-0001'
const ACCOUNT_ID = 'e2e-test-account-0001'

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required')
  const sql = postgres(process.env.DATABASE_URL, { max: 1 })
  try {
    // 1) Company (mirrors /api/user/sync defaults; onboarding already complete).
    await sql`
      insert into companies (id, name, subscription_tier, subscription_status, onboarding_completed, onboarding_step)
      values (${COMPANY_ID}, 'E2E Test Company', 'free', 'trialing', true, 1)
      on conflict (id) do nothing`

    // 2) BetterAuth user — fully configured so login lands on /dashboard (no /sync detour).
    const existing = await sql`select id from "user" where email = ${EMAIL} limit 1`
    const userId = existing.length ? existing[0].id : USER_ID
    if (existing.length) {
      await sql`
        update "user" set
          email_verified = true, role = 'company_admin', company_id = ${COMPANY_ID},
          onboarding_completed = true, is_active = true, name = ${NAME}, updated_at = now()
        where id = ${userId}`
    } else {
      await sql`
        insert into "user" (id, name, email, email_verified, role, company_id, onboarding_completed, is_active, created_at, updated_at)
        values (${USER_ID}, ${NAME}, ${EMAIL}, true, 'company_admin', ${COMPANY_ID}, true, true, now(), now())`
    }

    // 3) Credential account with Argon2id password hash (matches auth.ts verifyPassword).
    const hash = await hashPassword(PASSWORD)
    const acct = await sql`select id from account where user_id = ${userId} and provider_id = 'credential' limit 1`
    if (acct.length) {
      await sql`update account set password = ${hash}, updated_at = now() where id = ${acct[0].id}`
    } else {
      await sql`
        insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
        values (${ACCOUNT_ID}, ${userId}, 'credential', ${userId}, ${hash}, now(), now())`
    }

    console.log(`[seed-e2e-user] Provisioned ${EMAIL} (user=${userId}, company=${COMPANY_ID})`)
  } finally {
    await sql.end()
  }
}
main().catch((e) => { console.error('[seed-e2e-user]', e instanceof Error ? e.message : e); process.exit(1) })
