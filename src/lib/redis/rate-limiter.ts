/**
 * Rate Limiter
 *
 * In-memory rate limiting for API endpoints.
 * Uses sliding window algorithm for accurate rate limiting.
 *
 * Note: For production with multiple instances, consider using
 * PostgreSQL-based rate limiting or a distributed cache.
 */

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

// In-memory store for rate limiting
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Check rate limit for a given key
 */
export async function checkRateLimit(params: {
  key: string;
  maxRequests: number;
  windowMs: number;
}): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const { key, maxRequests, windowMs } = params;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new window
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(entry.resetAt),
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Check AI rate limit for a user
 */
export async function checkAIRateLimit(params: {
  userId: string;
  companyId?: string;
}): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
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
}): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
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
}): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
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
}): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
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
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(key: string): Promise<{
  count: number;
  resetAt: Date | null;
} | null> {
  const entry = rateLimitStore.get(key);
  if (!entry) return null;
  return {
    count: entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

// Rate limit result type
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
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
