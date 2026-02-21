import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  checkSignInRateLimit,
  checkSignUpRateLimit,
  checkPasswordResetRateLimit,
  getClientIp,
  createRateLimitHeaders,
} from '@/lib/auth/rate-limiter';
import { logSignInFailed } from '@/lib/auth/auth-logger';

/**
 * BetterAuth Catch-All Handler
 *
 * Handles all BetterAuth API routes including:
 * - /api/auth/sign-in/*
 * - /api/auth/sign-out
 * - /api/auth/sign-up/*
 * - /api/auth/session
 * - /api/auth/callback/*
 * - etc.
 *
 * February 2026 - Added rate limiting for brute force protection
 */

const { GET: betterAuthGet, POST: betterAuthPost } = toNextJsHandler(auth);

/**
 * Check if request path matches a rate-limited endpoint
 */
function getEndpointType(pathname: string): 'sign-in' | 'sign-up' | 'password-reset' | null {
  if (pathname.includes('/sign-in')) return 'sign-in';
  if (pathname.includes('/sign-up')) return 'sign-up';
  if (pathname.includes('/reset-password') || pathname.includes('/forgot-password')) return 'password-reset';
  return null;
}

/**
 * Apply rate limiting to auth endpoints
 */
async function applyRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const endpointType = getEndpointType(request.nextUrl.pathname);

  if (!endpointType) {
    // No rate limiting for other endpoints
    return null;
  }

  const ip = getClientIp(request.headers);

  // Apply rate limiting based on endpoint type
  let result;
  if (endpointType === 'sign-in') {
    result = await checkSignInRateLimit(ip);
  } else if (endpointType === 'sign-up') {
    result = await checkSignUpRateLimit(ip);
  } else if (endpointType === 'password-reset') {
    // For password reset, rate limit by email
    try {
      const body = await request.clone().json();
      const email = body.email;
      if (email && typeof email === 'string') {
        result = await checkPasswordResetRateLimit(email);
      } else {
        result = { success: true, remaining: 1, reset: Date.now() + 3600000 };
      }
    } catch {
      // If we can't parse body, fall back to IP-based limiting
      result = await checkPasswordResetRateLimit(ip);
    }
  } else {
    return null;
  }

  if (!result.success) {
    const headers = createRateLimitHeaders(result);
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Please wait ${result.retryAfter} seconds before trying again`,
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  return null;
}

export async function GET(request: NextRequest) {
  return betterAuthGet(request);
}

export async function POST(request: NextRequest) {
  // Check rate limit before processing
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const endpointType = getEndpointType(request.nextUrl.pathname);

  // Execute the auth handler
  const response = await betterAuthPost(request);

  // Log failed sign-in attempts
  if (endpointType === 'sign-in' && response.status >= 400) {
    try {
      const body = await request.clone().json().catch(() => ({}));
      const email = body.email || 'unknown';
      const ip = getClientIp(request.headers);
      const userAgent = request.headers.get('user-agent') || undefined;

      // Log the failed attempt
      await logSignInFailed(
        email,
        ip,
        userAgent,
        response.status === 401 ? 'invalid_credentials' : 'error'
      );
    } catch (logError) {
      console.error('[Auth] Failed to log failed sign-in:', logError);
    }
  }

  return response;
}
