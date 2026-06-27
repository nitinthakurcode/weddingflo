/**
 * Read/clear the realtime sync sorted-set directly (via the real Redis/SRH chain) so
 * round-trip tests can assert the EXACT queryPaths a mutation broadcast — without
 * mocking broadcastSync. This is the same data `sync.onSync` delivers to clients, so it
 * doubles as the transport probe for the C7 T2 propagation measurement.
 *
 * Key: `sync:${companyId}:actions` (ZADD by timestamp score) — see redis-pubsub.ts.
 */
import { getMissedActions, getRedisClient } from '@/lib/realtime/redis-pubsub';
import { assertTestRedis } from '@/test-support/rail3-guard';

export interface SyncActionLike {
  module?: string;
  type?: string;
  queryPaths?: string[];
  timestamp?: number;
  [k: string]: unknown;
}

/** All sync actions stored for a company since `sinceTs` (default: from the beginning). */
export async function readSyncActions(companyId: string, sinceTs = 0): Promise<SyncActionLike[]> {
  return (await getMissedActions(companyId, sinceTs)) as unknown as SyncActionLike[];
}

/** Distinct queryPaths broadcast for a company since `sinceTs`. */
export async function readSyncPaths(companyId: string, sinceTs = 0): Promise<string[]> {
  const actions = await readSyncActions(companyId, sinceTs);
  return [...new Set(actions.flatMap((a) => a.queryPaths ?? []))];
}

/** Wipe the sorted-set so the next assertion starts clean. */
export async function clearSync(companyId: string): Promise<void> {
  // H2 defense-in-depth: this is the probe's only destructive Redis op (DEL). Re-assert the
  // endpoint is a proven non-prod target at point-of-use, so even a setup bypass can't DEL prod.
  assertTestRedis();
  await getRedisClient().del(`sync:${companyId}:actions`);
}
