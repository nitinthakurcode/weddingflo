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
 *
 * Architecture note: Failed sign-in logging lives here (not in BetterAuth
 * databaseHooks) because failed sign-ins don't create DB records — there's
 * no session/user/account row for databaseHooks to fire on. The route handler
 * is the correct HTTP boundary for request/response observability.
 *
 * Successful sign-ins and sign-ups are logged via databaseHooks in auth.ts
 * (session.create.after and user.create.after respectively).
 */

const { GET: betterAuthGet, POST: betterAuthPost } = toNextJsHandler(auth);

type EndpointType = 'sign-in' | 'sign-up' | 'password-reset';

/**
 * Check if request path matches a rate-limited endpoint
 */
function getEndpointType(pathname: string): EndpointType | null {
  if (pathname.includes('/sign-in')) return 'sign-in';
  if (pathname.includes('/sign-up')) return 'sign-up';
  if (pathname.includes('/reset-password') || pathname.includes('/forgot-password')) return 'password-reset';
  return null;
}

/**
 * Safely parse and sanitize request body for auth endpoints.
 *
 * Called ONCE before BetterAuth consumes the request stream.
 * The parsed body is shared across rate-limiting and audit logging
 * so we never clone the request multiple times.
 *
 * Only parses for endpoints that need body data (sign-in, password-reset).
 * Sign-up rate-limiting is IP-only, so no body parse needed.
 */
async function parseAuthBody(
  request: NextRequest,
  endpointType: EndpointType | null
): Promise<Record<string, unknown> | null> {
  if (endpointType !== 'sign-in' && endpointType !== 'password-reset') {
    return null;
  }

  try {
    return await request.clone().json();
  } catch {
    return null;
  }
}

/**
 * Extract and sanitize email from parsed body.
 * Truncates to RFC 5321 max (254 chars) and strips control characters
 * to prevent log injection. Used only for audit logging — never for auth.
 */
function sanitizeEmail(body: Record<string, unknown> | null): string | undefined {
  if (!body || typeof body.email !== 'string' || body.email.length === 0) {
    return undefined;
  }
  return body.email.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 254) || undefined;
}

/**
 * Apply rate limiting to auth endpoints.
 * Uses pre-parsed body for password-reset (email-based limiting).
 * Sign-in and sign-up use IP-based limiting (no body needed).
 */
async function applyRateLimit(
  request: NextRequest,
  endpointType: EndpointType | null,
  parsedBody: Record<string, unknown> | null
): Promise<NextResponse | null> {
  if (!endpointType) return null;

  const ip = getClientIp(request.headers);

  let result;
  if (endpointType === 'sign-in') {
    result = await checkSignInRateLimit(ip);
  } else if (endpointType === 'sign-up') {
    result = await checkSignUpRateLimit(ip);
  } else if (endpointType === 'password-reset') {
    const email = parsedBody?.email;
    if (email && typeof email === 'string') {
      result = await checkPasswordResetRateLimit(email);
    } else {
      result = { success: true, remaining: 1, reset: Date.now() + 3600000 };
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

/**
 * Log a failed sign-in attempt for security auditing.
 * Non-blocking: failures are caught and swallowed per handbook H.10.
 */
async function auditFailedSignIn(
  request: NextRequest,
  parsedBody: Record<string, unknown> | null,
  responseStatus: number
): Promise<void> {
  try {
    const email = sanitizeEmail(parsedBody);
    const ip = getClientIp(request.headers);
    const userAgent = request.headers.get('user-agent') || undefined;

    await logSignInFailed(
      email || 'unknown',
      ip,
      userAgent,
      responseStatus === 401 ? 'invalid_credentials' : 'error'
    );
  } catch (error: unknown) {
    console.error(
      '[Auth] Failed to log failed sign-in:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

export async function GET(request: NextRequest) {
  return betterAuthGet(request);
}

export async function POST(request: NextRequest) {
  const endpointType = getEndpointType(request.nextUrl.pathname);

  // Parse body ONCE before BetterAuth consumes the stream.
  // Shared by rate-limiting (password-reset) and audit logging (sign-in).
  const parsedBody = await parseAuthBody(request, endpointType);

  // Check rate limit
  const rateLimitResponse = await applyRateLimit(request, endpointType, parsedBody);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Execute the auth handler (consumes request body stream)
  const response = await betterAuthPost(request);

  // Audit failed sign-in attempts (non-blocking per handbook H.10)
  if (endpointType === 'sign-in' && response.status >= 400) {
    await auditFailedSignIn(request, parsedBody, response.status);
  }

  return response;
}
