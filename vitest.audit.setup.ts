/**
 * Audit integration setup — runs in the worker BEFORE any test module imports
 * `@/lib/db` (which connects eagerly using process.env.DATABASE_URL).
 *
 * 1. Loads `.env.test.local` with override:true so the PROVEN test DB + local SRH win
 *    over any ambient/.env.local values (the app-under-test can ONLY hit the test stack).
 * 2. Runs the Rail-3 fail-closed guard for the WHOLE stack: DB (host + db-name +
 *    TEST_DB_CONFIRMED) AND the Redis/SRH endpoint (host + TEST_DB_CONFIRMED) [H2].
 * 3. Starts msw with defensive side-effect stubs; SRH/Postgres pass through (bypass).
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { sideEffectHandlers } from './src/test-support/msw-side-effect-handlers';

loadEnv({ path: path.resolve(process.cwd(), '.env.test.local'), override: true });

// Rail-3 fail-closed: throws (aborting the whole run) unless BOTH the DB and the Redis/SRH
// endpoint are proven non-prod test targets with explicit write authorization [H2].
import { assertTestDb, assertTestRedis } from './src/test-support/rail3-guard';
const proof = assertTestDb();
const redisProof = assertTestRedis();
// eslint-disable-next-line no-console
console.log(
  `[audit-setup] RAIL-3 OK — db host=${proof.host} db=${proof.dbname} ` +
    `redisHost=${redisProof.host} TEST_DB_CONFIRMED=${process.env.TEST_DB_CONFIRMED}`,
);

export const mswServer = setupServer(...sideEffectHandlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());
