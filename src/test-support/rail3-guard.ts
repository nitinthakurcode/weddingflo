/**
 * Rail-3 fail-closed guard (in-code, not shell-dependent).
 *
 * Every audit test setup imports this and calls `assertTestDb()` AND `assertTestRedis()`
 * BEFORE any module connects to the database or Redis. It refuses to proceed unless the
 * WHOLE test stack — Postgres AND the Redis/SRH endpoint — is provably a non-prod test
 * target AND the user has explicitly authorized writes. (H2: the original guard inspected
 * only DATABASE_URL, so a stale/absent `.env.test.local` with ambient prod-Upstash env
 * would let ZADD/DEL hit prod Redis while the DB guard still passed. The whole stack must
 * be proven non-prod, not just the DB.)
 *
 * DB proof (all three required):
 *   1. host matches ^(localhost|127.0.0.1|*.local|*-test|*-dev)
 *   2. db-name contains the `dev`/`test` token as a BOUNDED word (H3: tightened from a
 *      loose substring so accidental matches like `latest_prod` no longer authorize a wipe;
 *      `weddingflo_test` still passes — strictly stricter, never weaker. Token amended
 *      dev->dev|test per user directive, consistent with the host regex's `.*-test`).
 *   3. process.env.TEST_DB_CONFIRMED === '1'   (cannot be self-granted)
 *
 * Redis proof (both required):
 *   1. UPSTASH_REDIS_REST_URL host matches the SAME non-prod host regex.
 *   2. process.env.TEST_DB_CONFIRMED === '1'.
 *
 * Default = REFUSE. This makes it impossible for an audit test to ever mutate a remote
 * dev/prod database OR a remote/prod Redis even if shell env hygiene fails.
 */

const HOST_RE = /^(localhost|127\.0\.0\.1|.*\.local|.*-test|.*-dev)$/;
// H3: `dev`/`test` must appear as a bounded token (start/end or `_`/`-` delimited), not a
// loose substring — so `latest_prod`, `attestation`, etc. no longer pass while
// `weddingflo_test` / `*_dev` still do. Stricter than the prior /(dev|test)/, never weaker.
const DBNAME_RE = /(^|[_-])(dev|test)([_-]|$)/;

export interface TestDbProof {
  host: string;
  dbname: string;
}

export interface TestRedisProof {
  host: string;
}

export function assertTestDb(): TestDbProof {
  const url = process.env.DATABASE_URL ?? '';
  let host = '';
  let dbname = '';
  try {
    const u = new URL(url);
    host = u.hostname;
    dbname = u.pathname.replace(/^\//, '');
  } catch {
    throw new Error(`[RAIL-3 FAIL-CLOSED] DATABASE_URL is unparseable or unset: "${url}"`);
  }

  const hostOk = HOST_RE.test(host);
  const nameOk = DBNAME_RE.test(dbname);
  const confirmed = process.env.TEST_DB_CONFIRMED === '1';

  if (!hostOk || !nameOk || !confirmed) {
    throw new Error(
      `[RAIL-3 FAIL-CLOSED] Refusing to run mutating audit tests.\n` +
        `  host=${host} (regex ok=${hostOk})\n` +
        `  db=${dbname} (dev|test ok=${nameOk})\n` +
        `  TEST_DB_CONFIRMED=${process.env.TEST_DB_CONFIRMED ?? '<unset>'} (ok=${confirmed})\n` +
        `  Bring up the stack (scripts/start-test-stack.sh) and ensure .env.test.local is loaded.`,
    );
  }

  return { host, dbname };
}

/**
 * H2 — Rail-3 guard for the Redis/SRH endpoint. The realtime sync layer (broadcastSync ZADD,
 * the redis-sync-probe DEL) connects to whatever `UPSTASH_REDIS_REST_URL` resolves to. This
 * asserts that endpoint is the same proven non-prod host class as the DB, so the WHOLE test
 * stack is fail-closed — not just Postgres. Default = REFUSE.
 */
export function assertTestRedis(): TestRedisProof {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? '';
  let host = '';
  try {
    const u = new URL(url);
    host = u.hostname;
  } catch {
    throw new Error(
      `[RAIL-3 FAIL-CLOSED] UPSTASH_REDIS_REST_URL is unparseable or unset: "${url}"\n` +
        `  Bring up the stack (scripts/start-test-stack.sh) and ensure .env.test.local is loaded.`,
    );
  }

  const hostOk = HOST_RE.test(host);
  const confirmed = process.env.TEST_DB_CONFIRMED === '1';

  if (!hostOk || !confirmed) {
    throw new Error(
      `[RAIL-3 FAIL-CLOSED] Refusing to run audit tests against a non-test Redis endpoint.\n` +
        `  redisHost=${host} (regex ok=${hostOk})\n` +
        `  TEST_DB_CONFIRMED=${process.env.TEST_DB_CONFIRMED ?? '<unset>'} (ok=${confirmed})\n` +
        `  The WHOLE test stack (DB + Redis/SRH) must be provably non-prod — point\n` +
        `  UPSTASH_REDIS_REST_URL at the local SRH (127.0.0.1) via .env.test.local.`,
    );
  }

  return { host };
}
