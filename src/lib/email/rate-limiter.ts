/**
 * Email Rate Limiter - Redis-backed for Production
 *
 * Prevents spam and API abuse with:
 * - Per user: 10 emails/hour
 * - Per recipient: 3 emails/hour
 * - Global: 100 emails/hour
 *
 * Uses Redis for shared rate limiting across server instances.
 * Falls back to in-memory if Redis unavailable.
 */

import {
  checkEmailUserRateLimit,
  checkEmailRecipientRateLimit,
  checkEmailGlobalRateLimit,
  resetRateLimit,
  RateLimitResult,
} from '@/lib/redis/rate-limiter'

// Rate limit configuration (for reference)
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
} as const

/**
 * Check rate limit for a user
 */
export async function checkUserRateLimit(userId: string): Promise<RateLimitResult> {
  return checkEmailUserRateLimit(userId)
}

/**
 * Check rate limit for an email address
 */
export async function checkEmailRateLimit(email: string): Promise<RateLimitResult> {
  return checkEmailRecipientRateLimit(email)
}

/**
 * Check global rate limit
 */
export async function checkGlobalRateLimit(): Promise<RateLimitResult> {
  return checkEmailGlobalRateLimit()
}

/**
 * Check all email rate limits
 *
 * @param userId - User sending the email
 * @param recipientEmail - Email address of recipient
 * @returns Combined result with lowest remaining
 */
export async function checkAllEmailRateLimits(
  userId: string,
  recipientEmail: string
): Promise<{
  allowed: boolean
  reason?: string
  userLimit: RateLimitResult
  emailLimit: RateLimitResult
  globalLimit: RateLimitResult
}> {
  const [userLimit, emailLimit, globalLimit] = await Promise.all([
    checkUserRateLimit(userId),
    checkEmailRateLimit(recipientEmail),
    checkGlobalRateLimit(),
  ])

  if (!userLimit.allowed) {
    return {
      allowed: false,
      reason: `You've reached your hourly email limit (${RATE_LIMITS.perUser.maxRequests}/hour). Try again later.`,
      userLimit,
      emailLimit,
      globalLimit,
    }
  }

  if (!emailLimit.allowed) {
    return {
      allowed: false,
      reason: `Too many emails sent to ${recipientEmail}. Try again later.`,
      userLimit,
      emailLimit,
      globalLimit,
    }
  }

  if (!globalLimit.allowed) {
    return {
      allowed: false,
      reason: 'System email limit reached. Please try again later.',
      userLimit,
      emailLimit,
      globalLimit,
    }
  }

  return {
    allowed: true,
    userLimit,
    emailLimit,
    globalLimit,
  }
}

/**
 * Reset rate limit for a key
 */
export async function resetEmailRateLimit(key: string): Promise<void> {
  await resetRateLimit(key)
}

/**
 * Clear user's email rate limit
 */
export async function clearUserEmailRateLimit(userId: string): Promise<void> {
  await resetRateLimit(`email:user:${userId}`)
}

/**
 * Clear recipient's email rate limit
 */
export async function clearRecipientEmailRateLimit(email: string): Promise<void> {
  await resetRateLimit(`email:to:${email}`)
}
