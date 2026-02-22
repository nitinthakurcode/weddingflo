/**
 * Rate Limiter - Redis-backed for Horizontal Scaling
 *
 * February 2026 - Uses Upstash Redis for distributed rate limiting
 * across multiple server instances.
 *
 * Uses sliding window algorithm implemented with Redis sorted sets
 * for accurate rate limiting across all instances.
 *
 * Security Audit Fix: Moved from in-memory Map to Redis to prevent
 * rate limit bypass when traffic is distributed across multiple instances.
 */

import { Redis } from '@upstash/redis'

// Initialize Redis client (reuses existing Upstash credentials)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Rate limit error class
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number,
    public readonly limit: number,
    public readonly remaining: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Rate limit result type
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit for a given key using Redis sliding window
 *
 * Uses a sorted set where:
 * - Each request adds a member with current timestamp as score
 * - Expired requests (outside window) are removed
 * - Count of remaining members determines if limit exceeded
 */
export async function checkRateLimit(params: {
  key: string;
  maxRequests: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const { key, maxRequests, windowMs } = params;
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  try {
    // Use a pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove expired entries (outside the window)
    pipeline.zremrangebyscore(redisKey, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(redisKey);

    // Execute pipeline
    const results = await pipeline.exec();
    const currentCount = (results[1] as number) || 0;

    if (currentCount >= maxRequests) {
      // Get the oldest request timestamp to calculate retry time
      const oldest = await redis.zrange(redisKey, 0, 0, { withScores: true });
      const oldestTimestamp = oldest.length > 0 ? (oldest[0] as { score: number }).score || now - windowMs : now - windowMs;
      const resetAt = new Date(oldestTimestamp + windowMs);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add current request
    await redis.zadd(redisKey, {
      score: now,
      member: `${now}:${Math.random().toString(36).substring(7)}`,
    });

    // Set TTL on the key (cleanup after window expires)
    await redis.expire(redisKey, Math.ceil(windowMs / 1000) + 60);

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetAt: new Date(now + windowMs),
    };
  } catch (error) {
    console.error('[Redis Rate Limiter] Failed to check rate limit:', error);
    // Fail open: allow request if Redis is unavailable
    // This prevents blocking legitimate users during Redis outages
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(now + windowMs),
    };
  }
}

/**
 * Check AI rate limit for a user
 */
export async function checkAIRateLimit(params: {
  userId: string;
  companyId?: string;
}): Promise<RateLimitResult> {
  const key = `ai:${params.companyId || params.userId}`;
  return checkRateLimit({
    key,
    maxRequests: 100, // 100 AI queries per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Check email rate limit
 */
export async function checkEmailRateLimit(params: {
  userId: string;
  companyId?: string;
}): Promise<RateLimitResult> {
  const key = `email:${params.companyId || params.userId}`;
  return checkRateLimit({
    key,
    maxRequests: 100, // 100 emails per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Check SMS rate limit
 */
export async function checkSmsRateLimit(params: {
  userId: string;
  companyId?: string;
}): Promise<RateLimitResult> {
  const key = `sms:${params.companyId || params.userId}`;
  return checkRateLimit({
    key,
    maxRequests: 50, // 50 SMS per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Check API rate limit (general)
 */
export async function checkApiRateLimit(params: {
  ip: string;
  userId?: string;
}): Promise<RateLimitResult> {
  const key = `api:${params.userId || params.ip}`;
  return checkRateLimit({
    key,
    maxRequests: 1000, // 1000 requests per minute
    windowMs: 60 * 1000, // 1 minute
  });
}

/**
 * Reset rate limit for a key (for testing or admin)
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await redis.del(`ratelimit:${key}`);
  } catch (error) {
    console.error('[Redis Rate Limiter] Failed to reset rate limit:', error);
  }
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(key: string): Promise<{
  count: number;
  resetAt: Date | null;
} | null> {
  const redisKey = `ratelimit:${key}`;

  try {
    const count = await redis.zcard(redisKey);
    if (count === 0) return null;

    // Get the oldest entry to calculate reset time
    const oldest = await redis.zrange(redisKey, 0, 0, { withScores: true });
    const oldestTimestamp = oldest.length > 0 ? (oldest[0] as { score: number }).score : null;

    return {
      count,
      resetAt: oldestTimestamp ? new Date(oldestTimestamp + 60 * 60 * 1000) : null,
    };
  } catch (error) {
    console.error('[Redis Rate Limiter] Failed to get rate limit status:', error);
    return null;
  }
}

/**
 * Check email rate limit for a user
 */
export async function checkEmailUserRateLimit(userId: string): Promise<RateLimitResult> {
  const key = `email:user:${userId}`;
  return checkRateLimit({
    key,
    maxRequests: 10, // 10 emails per hour per user
    windowMs: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Check email rate limit for a recipient
 */
export async function checkEmailRecipientRateLimit(email: string): Promise<RateLimitResult> {
  const key = `email:to:${email}`;
  return checkRateLimit({
    key,
    maxRequests: 3, // 3 emails per hour to same recipient
    windowMs: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Check global email rate limit
 */
export async function checkEmailGlobalRateLimit(): Promise<RateLimitResult> {
  const key = `email:global`;
  return checkRateLimit({
    key,
    maxRequests: 100, // 100 emails per hour globally
    windowMs: 60 * 60 * 1000, // 1 hour
  });
}
