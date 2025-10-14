/**
 * Simple in-memory rate limiter for email sending
 * Prevents spam and API abuse
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
export const RATE_LIMITS = {
  perUser: {
    maxRequests: 10, // 10 emails per hour per user
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  perEmail: {
    maxRequests: 3, // 3 emails per hour to same recipient
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  global: {
    maxRequests: 100, // 100 emails per hour globally
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Check if rate limit is exceeded
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous entry or window expired
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  // Within rate limit
  if (entry.count < maxRequests) {
    entry.count++;
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
  };
}

/**
 * Check rate limit for a user
 */
export function checkUserRateLimit(userId: string) {
  return checkRateLimit(
    `user:${userId}`,
    RATE_LIMITS.perUser.maxRequests,
    RATE_LIMITS.perUser.windowMs
  );
}

/**
 * Check rate limit for an email address
 */
export function checkEmailRateLimit(email: string) {
  return checkRateLimit(
    `email:${email}`,
    RATE_LIMITS.perEmail.maxRequests,
    RATE_LIMITS.perEmail.windowMs
  );
}

/**
 * Check global rate limit
 */
export function checkGlobalRateLimit() {
  return checkRateLimit(
    'global',
    RATE_LIMITS.global.maxRequests,
    RATE_LIMITS.global.windowMs
  );
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string) {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits() {
  rateLimitStore.clear();
}

/**
 * Cleanup expired entries (run periodically)
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup expired entries every 5 minutes
if (typeof window === 'undefined') {
  // Only run on server
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
