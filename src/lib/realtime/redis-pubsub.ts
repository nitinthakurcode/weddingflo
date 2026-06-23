/**
 * Redis Pub/Sub Layer for Real-Time Sync
 *
 * February 2026 - Scalable real-time sync using Upstash Redis
 *
 * This module provides:
 * - Cross-instance broadcasting via Redis pub/sub
 * - Offline recovery via sorted sets (stores last 1000 actions)
 * - Type-safe SyncAction interface
 *
 * Architecture: Linear-inspired pattern for horizontal scaling
 */

import { Redis } from '@upstash/redis'

// Initialize Redis client (reuses existing Upstash credentials)
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn(
    'UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Redis pub/sub will not work.'
  );
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

/**
 * SyncAction represents a data mutation that needs to be broadcast
 * to all connected clients in the same company
 */
export interface SyncAction {
  /** Unique identifier for this action */
  id: string
  /** Type of mutation */
  type: 'insert' | 'update' | 'delete'
  /** Module that was affected */
  module:
    | 'guests'
    | 'budget'
    | 'events'
    | 'vendors'
    | 'hotels'
    | 'transport'
    | 'timeline'
    | 'gifts'
    | 'clients'
    | 'floorPlans'
    | 'documents'
    | 'team'
    | 'proposals'
    | 'contracts'
    | 'workflows'
    | 'pipeline'
    | 'questionnaires'
    | 'creatives'
    | 'websites'
    | 'accommodations'
    | 'communications'
  /** ID of the entity that was affected */
  entityId: string
  /** Additional data about the mutation */
  data?: Record<string, unknown>
  /** Company ID for multi-tenant isolation */
  companyId: string
  /** Client ID if this action is client-scoped */
  clientId?: string
  /** User who initiated the action */
  userId: string
  /** Unix timestamp when action occurred */
  timestamp: number
  /** tRPC query paths to invalidate */
  queryPaths: string[]
  /** Original tool name that triggered this action */
  toolName?: string
}

/**
 * Store a sync action for offline recovery
 * Uses Redis sorted set with timestamp as score for efficient range queries
 * Keeps only the last 1000 actions per company
 *
 * @param action - The sync action to store
 */
export async function storeSyncAction(action: SyncAction): Promise<void> {
  const key = `sync:${action.companyId}:actions`

  try {
    // Add to sorted set with timestamp as score
    await redis.zadd(key, {
      score: action.timestamp,
      member: JSON.stringify(action),
    })

    // Keep only last 5000 actions (remove oldest if over limit)
    // zremrangebyrank removes elements by rank (0 = lowest score = oldest)
    // 5000 covers ~50 hours at peak usage, handling weekend outages
    await redis.zremrangebyrank(key, 0, -5001)

    // Set TTL of 72 hours on the key (cleanup if company becomes inactive)
    // 72h ensures actions survive long weekends for offline recovery
    await redis.expire(key, 259200)
  } catch (error) {
    console.error('[Redis Pub/Sub] Failed to store sync action:', error)
    // Don't throw - storage failure shouldn't break the main operation
  }
}

/**
 * Get missed sync actions since a given timestamp
 * Used for offline recovery when a client reconnects
 *
 * @param companyId - The company ID to query
 * @param since - Unix timestamp to query from (exclusive)
 * @returns Array of sync actions that occurred after the timestamp
 */
export async function getMissedActions(
  companyId: string,
  since: number
): Promise<SyncAction[]> {
  const key = `sync:${companyId}:actions`

  try {
    // Get all actions with score > since
    // Using zrange with BYSCORE option (Upstash REST API)
    const results = await redis.zrange(key, since + 1, '+inf', {
      byScore: true,
    })

    return results.map((r: unknown) => {
      if (typeof r === 'string') {
        return JSON.parse(r) as SyncAction
      }
      return r as SyncAction
    })
  } catch (error) {
    console.error('[Redis Pub/Sub] Failed to get missed actions:', error)
    return []
  }
}

/**
 * Subscribe to sync actions for a company
 * Returns an async generator that yields actions as they arrive
 *
 * Note: Upstash REST API doesn't support persistent subscriptions,
 * so we use polling as a fallback. For true pub/sub, consider
 * using Upstash Redis with the @upstash/redis library's
 * subscribe functionality when available.
 *
 * @param companyId - The company ID to subscribe to
 * @param signal - AbortSignal to cancel the subscription
 */
export async function* subscribeToCompany(
  companyId: string,
  signal?: AbortSignal
): AsyncGenerator<SyncAction, void, unknown> {
  const key = `sync:${companyId}:actions`
  let lastTimestamp = Date.now()
  let errorBackoff = 1000

  // Adaptive poll interval. This is a fallback for the Upstash REST API which
  // doesn't support persistent pub/sub (see docs/audit/realtime-pubsub-rfc.md
  // for the proper migration). Most connections are idle most of the time, so
  // we poll fast (300ms) right after activity and back off toward 2s while
  // idle — cutting steady-state Redis ops ~5–10x at scale with no perceived
  // latency cost during active use.
  const MIN_INTERVAL = 300
  const MAX_INTERVAL = 2000
  let interval = MIN_INTERVAL

  while (!signal?.aborted) {
    try {
      const newActions = await getMissedActions(companyId, lastTimestamp)

      if (newActions.length > 0) {
        for (const action of newActions) {
          lastTimestamp = Math.max(lastTimestamp, action.timestamp)
          yield action
        }
        interval = MIN_INTERVAL // activity → poll fast again
      } else {
        interval = Math.min(Math.round(interval * 1.5), MAX_INTERVAL) // idle → back off
      }

      // Reset error backoff on successful poll
      errorBackoff = 1000

      // Wait (adaptive) before polling again
      await new Promise((resolve) => setTimeout(resolve, interval))
    } catch (error) {
      if (signal?.aborted) break
      console.error('[Redis Pub/Sub] Subscription error:', error)
      // Exponential backoff on error: 1s, 2s, 4s, 8s, ... up to 30s
      await new Promise((resolve) => setTimeout(resolve, errorBackoff))
      errorBackoff = Math.min(errorBackoff * 2, 30000)
    }
  }
}

/**
 * Get the Redis client instance for direct operations
 * Use sparingly - prefer the higher-level functions above
 */
export function getRedisClient(): Redis {
  return redis
}
