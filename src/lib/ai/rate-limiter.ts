/**
 * AI Rate Limiter - Redis-backed for Production
 *
 * Max 10 AI calls per minute per user.
 * Uses Redis for shared rate limiting across server instances.
 * Falls back to in-memory if Redis unavailable.
 */

import { checkAIRateLimit, RateLimitError } from '@/lib/redis/rate-limiter'

/**
 * Check if user has exceeded AI rate limit
 *
 * @param userId - User ID from BetterAuth session
 * @throws RateLimitError if limit exceeded
 */
export async function checkRateLimit(userId: string): Promise<void> {
  const result = await checkAIRateLimit(userId)

  if (!result.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
      result.retryAfter || 60,
      result.resetAt
    )
  }
}

// Re-export for convenience
export { RateLimitError }
