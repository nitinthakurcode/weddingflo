/**
 * Auth Rate Limiter
 *
 * February 2026 - PostgreSQL UNLOGGED table for auth rate limiting
 *
 * Why PostgreSQL UNLOGGED instead of Redis:
 * - No additional infrastructure (already have PostgreSQL)
 * - No network hop to external service
 * - 2x faster writes than logged tables (0.03ms vs 0.24ms per query)
 * - Sufficient for auth flows (67ms read latency is imperceptible)
 * - Survives clean deploys/restarts
 *
 * Trade-off: Data lost on unexpected crash (acceptable - users just retry)
 *
 * Source: https://dizzy.zone/2025/09/24/Redis-is-fast-Ill-cache-in-Postgres/
 *
 * Protects against:
 * - Brute force attacks on sign-in
 * - Account enumeration via sign-up
 * - Password reset abuse
 */

import { db, eq, lt, sql } from '@/lib/db';
import { rateLimitEntries } from '@/lib/db/schema';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Rate limit configuration presets
 */
export const AUTH_RATE_LIMITS = {
  // Sign-in: 5 attempts per minute per IP
  signIn: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  // Sign-up: 3 accounts per hour per IP
  signUp: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Password reset: 3 requests per hour per email
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Verification email: 5 requests per hour per user
  verificationEmail: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Session refresh: 30 per minute (generous for SSO flows)
  sessionRefresh: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

/**
 * Check rate limit using PostgreSQL UNLOGGED table
 * Uses fixed window algorithm for simplicity and performance
 */
async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);

  try {
    // Try to get existing entry
    const [existing] = await db
      .select()
      .from(rateLimitEntries)
      .where(eq(rateLimitEntries.key, key))
      .limit(1);

    if (!existing) {
      // First request - create entry
      await db.insert(rateLimitEntries).values({
        key,
        count: 1,
        resetAt,
      });

      return {
        success: true,
        remaining: maxRequests - 1,
        reset: Math.ceil(resetAt.getTime() / 1000),
      };
    }

    // Check if window has expired
    if (existing.resetAt < new Date()) {
      // Reset the window
      await db
        .update(rateLimitEntries)
        .set({
          count: 1,
          resetAt,
        })
        .where(eq(rateLimitEntries.key, key));

      return {
        success: true,
        remaining: maxRequests - 1,
        reset: Math.ceil(resetAt.getTime() / 1000),
      };
    }

    // Window is active - check count
    if (existing.count >= maxRequests) {
      const retryAfter = Math.ceil((existing.resetAt.getTime() - now) / 1000);
      return {
        success: false,
        remaining: 0,
        reset: Math.ceil(existing.resetAt.getTime() / 1000),
        retryAfter: Math.max(retryAfter, 1),
      };
    }

    // Increment count atomically to prevent race conditions
    const [updated] = await db
      .update(rateLimitEntries)
      .set({
        count: sql`${rateLimitEntries.count} + 1`,
      })
      .where(eq(rateLimitEntries.key, key))
      .returning({ count: rateLimitEntries.count });

    const newCount = updated?.count ?? existing.count + 1;

    return {
      success: true,
      remaining: Math.max(0, maxRequests - newCount),
      reset: Math.ceil(existing.resetAt.getTime() / 1000),
    };
  } catch (error) {
    console.error('[AuthRateLimit] PostgreSQL error:', error);
    // On DB error, allow the request (fail open for auth availability)
    return {
      success: true,
      remaining: maxRequests - 1,
      reset: Math.ceil(resetAt.getTime() / 1000),
    };
  }
}

/**
 * Rate limit sign-in attempts
 * Key: IP address or user identifier
 */
export async function checkSignInRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = AUTH_RATE_LIMITS.signIn;
  return checkRateLimit(`signin:${identifier}`, maxRequests, windowMs);
}

/**
 * Rate limit sign-up attempts
 * Key: IP address
 */
export async function checkSignUpRateLimit(ip: string): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = AUTH_RATE_LIMITS.signUp;
  return checkRateLimit(`signup:${ip}`, maxRequests, windowMs);
}

/**
 * Rate limit password reset requests
 * Key: Email address
 */
export async function checkPasswordResetRateLimit(
  email: string
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = AUTH_RATE_LIMITS.passwordReset;
  return checkRateLimit(`pwreset:${email.toLowerCase()}`, maxRequests, windowMs);
}

/**
 * Rate limit verification email requests
 * Key: User ID
 */
export async function checkVerificationEmailRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = AUTH_RATE_LIMITS.verificationEmail;
  return checkRateLimit(`verify:${userId}`, maxRequests, windowMs);
}

/**
 * Rate limit session refresh
 * Key: Session token or user ID
 */
export async function checkSessionRefreshRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  const { maxRequests, windowMs } = AUTH_RATE_LIMITS.sessionRefresh;
  return checkRateLimit(`session:${identifier}`, maxRequests, windowMs);
}

/**
 * Validate IP address format (IPv4 or IPv6)
 */
function isValidIp(ip: string): boolean {
  // IPv4: 0-255.0-255.0-255.0-255
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }
  // IPv6: hex groups separated by colons (simplified check)
  if (/^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':')) {
    return true;
  }
  return false;
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string {
  // Check common proxy headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (original client)
    const ip = forwarded.split(',')[0].trim();
    if (isValidIp(ip)) return ip;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) {
    return realIp;
  }

  // Fallback - more specific for rate limiting
  return 'unknown-ip';
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };

  if (!result.success && result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Reset rate limit for a key (admin/testing use)
 */
export async function resetAuthRateLimit(key: string): Promise<void> {
  try {
    await db.delete(rateLimitEntries).where(eq(rateLimitEntries.key, key));
  } catch (error) {
    console.error('[AuthRateLimit] Failed to reset rate limit:', error);
  }
}

/**
 * Clean up expired rate limit entries
 * Call this periodically (e.g., via cron job)
 */
export async function cleanupExpiredRateLimits(): Promise<void> {
  try {
    await db
      .delete(rateLimitEntries)
      .where(lt(rateLimitEntries.resetAt, new Date()));
  } catch (error) {
    console.error('[AuthRateLimit] Failed to cleanup expired entries:', error);
  }
}
