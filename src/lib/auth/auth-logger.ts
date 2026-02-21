/**
 * Auth Event Logger
 *
 * February 2026 - Logs authentication events to activity table
 *
 * Events logged:
 * - sign_in: User signs in (email/password or OAuth)
 * - sign_out: User signs out
 * - sign_up: New user registration
 * - password_reset_request: Password reset requested
 * - password_reset_complete: Password successfully reset
 * - sign_in_failed: Failed sign-in attempt
 *
 * All events include IP address and user agent for security auditing
 */

import { db } from '@/lib/db';
import { activity } from '@/lib/db/schema-features';

export type AuthAction =
  | 'sign_in'
  | 'sign_out'
  | 'sign_up'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'sign_in_failed'
  | 'session_refresh'
  | 'account_locked';

export interface AuthLogEvent {
  userId?: string;
  companyId?: string;
  action: AuthAction;
  ipAddress?: string;
  userAgent?: string;
  data?: Record<string, unknown>;
}

/**
 * Log an authentication event
 */
export async function logAuthEvent(event: AuthLogEvent): Promise<void> {
  try {
    await db.insert(activity).values({
      id: crypto.randomUUID(),
      userId: event.userId || null,
      companyId: event.companyId || null,
      type: 'auth',
      action: event.action,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      data: event.data || null,
      read: false,
    });
  } catch (error) {
    // Log but don't throw - auth logging should not block auth operations
    console.error('[AuthLogger] Failed to log auth event:', error);
  }
}

/**
 * Log a successful sign-in
 */
export async function logSignIn(
  userId: string,
  companyId: string | null,
  ipAddress?: string,
  userAgent?: string,
  provider?: string
): Promise<void> {
  await logAuthEvent({
    userId,
    companyId: companyId || undefined,
    action: 'sign_in',
    ipAddress,
    userAgent,
    data: { provider: provider || 'email' },
  });
}

/**
 * Log a sign-out
 */
export async function logSignOut(
  userId: string,
  companyId: string | null,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuthEvent({
    userId,
    companyId: companyId || undefined,
    action: 'sign_out',
    ipAddress,
    userAgent,
  });
}

/**
 * Log a new user registration
 */
export async function logSignUp(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'sign_up',
    ipAddress,
    userAgent,
    data: { email },
  });
}

/**
 * Log a failed sign-in attempt
 */
export async function logSignInFailed(
  email: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
): Promise<void> {
  await logAuthEvent({
    action: 'sign_in_failed',
    ipAddress,
    userAgent,
    data: { email, reason: reason || 'invalid_credentials' },
  });
}

/**
 * Log a password reset request
 */
export async function logPasswordResetRequest(
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuthEvent({
    action: 'password_reset_request',
    ipAddress,
    userAgent,
    data: { email },
  });
}

/**
 * Log a password reset completion
 */
export async function logPasswordResetComplete(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'password_reset_complete',
    ipAddress,
    userAgent,
  });
}

/**
 * Log an account lockout
 */
export async function logAccountLocked(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
): Promise<void> {
  await logAuthEvent({
    userId,
    action: 'account_locked',
    ipAddress,
    userAgent,
    data: { reason: reason || 'too_many_failed_attempts' },
  });
}

/**
 * Get client IP from request headers
 */
export function getClientIp(headers: Headers): string | undefined {
  // Check common proxy headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get('user-agent') || undefined;
}
