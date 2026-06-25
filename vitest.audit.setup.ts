/**
 * Audit integration setup — runs in the worker BEFORE any test module imports
 * `@/lib/db` (which connects eagerly using process.env.DATABASE_URL).
 *
 * 1. Loads `.env.test.local` with override:true so the PROVEN test DB + local SRH win
 *    over any ambient/.env.local values (the app-under-test can ONLY hit the test stack).
 * 2. Runs the Rail-3 fail-closed guard (host + db-name + TEST_DB_CONFIRMED).
 * 3. Starts msw with defensive side-effect stubs; SRH/Postgres pass through (bypass).
 */
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { sideEffectHandlers } from './src/test-support/msw-side-effect-handlers';

loadEnv({ path: path.resolve(process.cwd(), '.env.test.local'), override: true });

// Rail-3 fail-closed: throws (aborting the whole run) unless the target is a proven
// non-prod test DB with explicit write authorization.
import { assertTestDb } from './src/test-support/rail3-guard';
const proof = assertTestDb();
// eslint-disable-next-line no-console
console.log(
  `[audit-setup] RAIL-3 OK — host=${proof.host} db=${proof.dbname} TEST_DB_CONFIRMED=${process.env.TEST_DB_CONFIRMED}`,
);

export const mswServer = setupServer(...sideEffectHandlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());
