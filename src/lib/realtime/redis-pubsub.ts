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

    // Keep only last 1000 actions (remove oldest if over limit)
    // zremrangebyrank removes elements by rank (0 = lowest score = oldest)
    await redis.zremrangebyrank(key, 0, -1001)

    // Set TTL of 24 hours on the key (cleanup if company becomes inactive)
    await redis.expire(key, 86400)
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

  // Poll for new actions every 500ms
  // This is a fallback for Upstash REST API which doesn't support
  // persistent pub/sub connections. In production with Upstash
  // Redis TCP, you'd use actual subscription.
  while (!signal?.aborted) {
    try {
      const newActions = await getMissedActions(companyId, lastTimestamp)

      for (const action of newActions) {
        lastTimestamp = Math.max(lastTimestamp, action.timestamp)
        yield action
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 500))
    } catch (error) {
      if (signal?.aborted) break
      console.error('[Redis Pub/Sub] Subscription error:', error)
      // Wait a bit longer on error
      await new Promise((resolve) => setTimeout(resolve, 2000))
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
