/**
 * @module sse-connection-manager
 * @description Redis-backed SSE connection limiter for tRPC real-time subscriptions.
 *
 * Without limits, a malicious user (or one with many browser tabs) can exhaust
 * server memory by opening hundreds of SSE connections. This module enforces
 * per-user and per-company caps using atomic Redis operations.
 *
 * Architecture:
 *   - Each SSE connection calls `register()` on open and `unregister()` on close
 *   - Redis INCR/DECR with TTL provides atomic counting across server instances
 *   - TTL acts as a safety net: if the server crashes without calling unregister(),
 *     the counter auto-expires instead of leaking forever
 *
 * Integration with tRPC SSE subscription:
 * ```typescript
 * // In sync.router.ts
 * import { sseConnections } from '@/lib/sse/connection-manager';
 *
 * onSync: protectedProcedure.subscription(async function* ({ ctx, signal }) {
 *   const guard = await sseConnections.acquire(ctx.userId, ctx.companyId);
 *   try {
 *     while (!signal?.aborted) {
 *       // ... poll Redis, yield events ...
 *     }
 *   } finally {
 *     await guard.release();
 *   }
 * });
 * ```
 *
 * @requires @upstash/redis — Upstash Redis client (already in WeddingFlo deps)
 *
 * WeddingFlo Security Remediation — Phase 2.5
 */

import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum SSE connections per user (across all browser tabs/devices) */
const MAX_PER_USER = 5;

/** Maximum SSE connections per company (across all users + all tabs) */
const MAX_PER_COMPANY = 50;

/** TTL for connection counters in seconds.
 *  Acts as a safety net if unregister() is never called (e.g., server crash).
 *  Should be >= your SSE max connection duration. */
const COUNTER_TTL_SECONDS = 7200; // 2 hours

/** Redis key prefix for SSE connection counters */
const KEY_PREFIX = 'sse:conn' as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Handle returned by acquire() — call release() when the connection closes */
export interface ConnectionGuard {
  /** Release this connection slot. Safe to call multiple times. */
  release: () => Promise<void>;
  /** Whether this guard has been released */
  released: boolean;
}

/** Current connection counts */
export interface ConnectionCounts {
  userConnections: number;
  companyConnections: number;
  userLimit: number;
  companyLimit: number;
}

/** Options for creating the connection manager */
export interface SSEConnectionManagerOptions {
  maxPerUser?: number;
  maxPerCompany?: number;
  counterTtlSeconds?: number;
}

// ---------------------------------------------------------------------------
// Connection Manager Class
// ---------------------------------------------------------------------------

export class SSEConnectionManager {
  private readonly redis: Redis;
  private readonly maxPerUser: number;
  private readonly maxPerCompany: number;
  private readonly counterTtl: number;

  constructor(options?: SSEConnectionManagerOptions) {
    this.redis = Redis.fromEnv();
    this.maxPerUser = options?.maxPerUser ?? MAX_PER_USER;
    this.maxPerCompany = options?.maxPerCompany ?? MAX_PER_COMPANY;
    this.counterTtl = options?.counterTtlSeconds ?? COUNTER_TTL_SECONDS;
  }

  /** Redis key for per-user connection count */
  private userKey(userId: string): string {
    return `${KEY_PREFIX}:user:${userId}`;
  }

  /** Redis key for per-company connection count */
  private companyKey(companyId: string): string {
    return `${KEY_PREFIX}:company:${companyId}`;
  }

  /**
   * Check if a new connection is allowed without actually registering it.
   *
   * @param userId - The authenticated user's ID
   * @param companyId - The user's company ID
   * @returns Current counts and whether a new connection is allowed
   */
  async canConnect(userId: string, companyId: string): Promise<{
    allowed: boolean;
    counts: ConnectionCounts;
  }> {
    const [userCount, companyCount] = await Promise.all([
      this.redis.get<number>(this.userKey(userId)),
      this.redis.get<number>(this.companyKey(companyId)),
    ]);

    const counts: ConnectionCounts = {
      userConnections: userCount ?? 0,
      companyConnections: companyCount ?? 0,
      userLimit: this.maxPerUser,
      companyLimit: this.maxPerCompany,
    };

    const allowed =
      counts.userConnections < this.maxPerUser &&
      counts.companyConnections < this.maxPerCompany;

    return { allowed, counts };
  }

  /**
   * Acquire a connection slot. Increments Redis counters atomically.
   *
   * Returns a ConnectionGuard with a `release()` method. You MUST call
   * release() when the SSE connection closes (use try/finally).
   *
   * @param userId - The authenticated user's ID
   * @param companyId - The user's company ID
   * @returns ConnectionGuard handle
   *
   * @throws {SSEConnectionLimitError} If per-user or per-company limit is exceeded
   */
  async acquire(userId: string, companyId: string): Promise<ConnectionGuard> {
    const userKeyStr = this.userKey(userId);
    const companyKeyStr = this.companyKey(companyId);

    try {
      // Increment first, then check limits (avoids TOCTOU race — S7-M01)
      const pipeline = this.redis.pipeline();
      pipeline.incr(userKeyStr);
      pipeline.expire(userKeyStr, this.counterTtl);
      pipeline.incr(companyKeyStr);
      pipeline.expire(companyKeyStr, this.counterTtl);
      const results = await pipeline.exec();

      // Pipeline results: [INCR user, EXPIRE user, INCR company, EXPIRE company]
      const newUserCount = results[0] as number;
      const newCompanyCount = results[2] as number;

      // Check if we've exceeded limits AFTER incrementing
      if (newUserCount > this.maxPerUser || newCompanyCount > this.maxPerCompany) {
        // Rollback: decrement both counters
        const rollback = this.redis.pipeline();
        rollback.decr(userKeyStr);
        rollback.decr(companyKeyStr);
        await rollback.exec();

        const reason = newUserCount > this.maxPerUser
          ? `Per-user limit reached (${newUserCount}/${this.maxPerUser})`
          : `Per-company limit reached (${newCompanyCount}/${this.maxPerCompany})`;

        throw new SSEConnectionLimitError(reason, {
          userConnections: newUserCount,
          companyConnections: newCompanyCount,
          userLimit: this.maxPerUser,
          companyLimit: this.maxPerCompany,
        });
      }

      // Build release guard
      let released = false;

      const release = async (): Promise<void> => {
        if (released) return; // Idempotent
        released = true;

        try {
          const pipeline = this.redis.pipeline();
          pipeline.decr(userKeyStr);
          pipeline.decr(companyKeyStr);
          const results = await pipeline.exec();

          // Clean up zero/negative counters (can happen if TTL expired mid-session)
          const userVal = results[0] as number;
          const companyVal = results[1] as number;

          if (userVal <= 0) {
            await this.redis.del(userKeyStr);
          }
          if (companyVal <= 0) {
            await this.redis.del(companyKeyStr);
          }
        } catch (error) {
          console.warn('[SSE Connection Manager] Release failed (non-fatal):', error);
        }
      };

      return {
        release,
        get released() { return released; },
      };
    } catch (error) {
      // Re-throw limit errors — those are intentional rejections
      if (error instanceof SSEConnectionLimitError) {
        throw error;
      }
      // Redis failure — degrade gracefully: allow connection without limits (S7-M08)
      console.warn('[SSE Connection Manager] Redis unavailable, allowing connection without limit enforcement:', error);
      return {
        release: async () => {},
        get released() { return true; },
      };
    }
  }

  /**
   * Get current connection counts for monitoring/debugging.
   *
   * @param userId - The user's ID (optional)
   * @param companyId - The company's ID (optional)
   */
  async getCounts(userId?: string, companyId?: string): Promise<{
    userConnections?: number;
    companyConnections?: number;
  }> {
    const result: { userConnections?: number; companyConnections?: number } = {};

    if (userId) {
      result.userConnections = (await this.redis.get<number>(this.userKey(userId))) ?? 0;
    }
    if (companyId) {
      result.companyConnections = (await this.redis.get<number>(this.companyKey(companyId))) ?? 0;
    }

    return result;
  }

  /**
   * Force-clear all connection counters for a user.
   * Use for emergency situations or session revocation.
   */
  async forceDisconnectUser(userId: string): Promise<void> {
    await this.redis.del(this.userKey(userId));
  }

  /**
   * Force-clear all connection counters for a company.
   * Use for emergency situations.
   */
  async forceDisconnectCompany(companyId: string): Promise<void> {
    await this.redis.del(this.companyKey(companyId));
  }
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

export class SSEConnectionLimitError extends Error {
  public readonly counts: ConnectionCounts;

  constructor(reason: string, counts: ConnectionCounts) {
    super(`SSE connection limit exceeded: ${reason}`);
    this.name = 'SSEConnectionLimitError';
    this.counts = counts;
  }
}

// ---------------------------------------------------------------------------
// Singleton instance (import this in your tRPC router)
// ---------------------------------------------------------------------------

/** Default SSE connection manager instance. Import and use directly. */
export const sseConnections = new SSEConnectionManager();
