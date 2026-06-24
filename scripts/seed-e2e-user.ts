/**
 * Ensures the E2E test account has a known credential password so Playwright's
 * global-setup can log in. Idempotent + best-effort: it sets the BetterAuth
 * credential password (argon2) for an EXISTING user identified by
 * TEST_USER_EMAIL. Run before `npm run test:e2e` (locally or in CI).
 *
 *   TEST_USER_EMAIL=... TEST_USER_PASSWORD=... npx tsx scripts/seed-e2e-user.ts
 */
import { hashPassword } from '@/lib/auth/argon2-password'
import postgres from 'postgres'
import { randomUUID } from 'crypto'

const EMAIL = process.env.TEST_USER_EMAIL || 'test@test.com'
const PASSWORD = process.env.TEST_USER_PASSWORD || 'E2eTest!Pass123'

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required')
  const sql = postgres(process.env.DATABASE_URL, { max: 1 })
  try {
    const [u] = await sql`select id from "user" where email = ${EMAIL} limit 1`
    if (!u) {
      console.warn(`[seed-e2e-user] No user ${EMAIL} — provision it via sign-up first. Skipping.`)
      return
    }
    const hash = await hashPassword(PASSWORD)
    const acct = await sql`select id from account where user_id = ${u.id} and provider_id = 'credential' limit 1`
    if (acct.length) {
      await sql`update account set password = ${hash}, updated_at = now() where id = ${acct[0].id}`
    } else {
      await sql`insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
                values (${randomUUID()}, ${u.id}, 'credential', ${u.id}, ${hash}, now(), now())`
    }
    console.log(`[seed-e2e-user] Credential set for ${EMAIL}`)
  } finally {
    await sql.end()
  }
}
main().catch((e) => { console.error('[seed-e2e-user]', e instanceof Error ? e.message : e); process.exit(1) })
