/**
 * Simple in-memory rate limiter to prevent excessive API calls
 * Max 10 AI calls per minute per user
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();
const MAX_REQUESTS_PER_MINUTE = 10;
const WINDOW_MS = 60 * 1000; // 1 minute

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export function checkRateLimit(userId: string): void {
  const now = Date.now();

  // Cleanup old entries inline (instead of setInterval which doesn't work in serverless)
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key);
    }
  }

  const entry = rateLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    // Create new window
    rateLimits.set(userId, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return;
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    const waitTime = Math.ceil((entry.resetAt - now) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded. Please try again in ${waitTime} seconds.`
    );
  }

  entry.count++;
}
