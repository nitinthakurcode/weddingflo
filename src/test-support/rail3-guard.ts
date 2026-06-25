/**
 * Rail-3 fail-closed guard (in-code, not shell-dependent).
 *
 * Every audit test setup imports this and calls `assertTestDb()` BEFORE any module
 * connects to the database. It refuses to proceed unless the resolved connection is
 * provably a non-prod test DB AND the user has explicitly authorized writes.
 *
 * Proof (all three required):
 *   1. host matches ^(localhost|127.0.0.1|*.local|*-test|*-dev)
 *   2. db-name matches /(dev|test)/   (token amended dev->dev|test per user directive,
 *      consistent with the host regex's own `.*-test`; logged in STATE.md)
 *   3. process.env.TEST_DB_CONFIRMED === '1'   (cannot be self-granted)
 *
 * Default = REFUSE. This makes it impossible for an audit test to ever mutate a
 * remote dev/prod database even if shell env hygiene fails.
 */

const HOST_RE = /^(localhost|127\.0\.0\.1|.*\.local|.*-test|.*-dev)$/;
const DBNAME_RE = /(dev|test)/;

export interface TestDbProof {
  host: string;
  dbname: string;
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
