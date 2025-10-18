'use client'
import * as Sentry from '@sentry/react'

export type ErrorContext = {
  userId?: string;
  companyId?: string;
  guestId?: string;
  vendorId?: string;
  eventId?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, unknown>;
};

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Capture an exception with context (CLIENT-SIDE ONLY)
 */
export function captureClientException(
  error: Error | string,
  context?: ErrorContext,
  severity: ErrorSeverity = 'error'
): void {
  const errorMessage = typeof error === 'string' ? error : error.message;

  Sentry.captureException(error, {
    level: severity,
    tags: {
      component: context?.component,
      action: context?.action,
    },
    contexts: {
      user: {
        id: context?.userId,
        companyId: context?.companyId,
      },
      guest: context?.guestId ? {
        id: context?.guestId,
      } : undefined,
      vendor: context?.vendorId ? {
        id: context?.vendorId,
      } : undefined,
      event: context?.eventId ? {
        id: context?.eventId,
      } : undefined,
    },
    extra: context?.metadata,
  });

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[Sentry Client] ${errorMessage}`, { context });
  }
}

/**
 * Set user context for all future events (CLIENT-SIDE)
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  companyId?: string;
  plan?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });

  Sentry.setContext('user_details', {
    role: user.role,
    companyId: user.companyId,
    plan: user.plan,
  });
}

/**
 * Clear user context (on logout) - CLIENT-SIDE
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracking user actions (CLIENT-SIDE)
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: ErrorSeverity = 'info'
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture UI errors (for error boundaries) - CLIENT-SIDE
 */
export function captureUiError(
  error: Error,
  errorInfo: React.ErrorInfo,
  componentStack?: string,
  context?: ErrorContext
): void {
  captureClientException(error, {
    ...context,
    action: 'ui_error',
    metadata: {
      ...context?.metadata,
      componentStack: errorInfo.componentStack || componentStack,
    },
  }, 'error');
}
