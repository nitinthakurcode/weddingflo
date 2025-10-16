import * as Sentry from '@sentry/nextjs';

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
 * Capture an exception with context
 */
export function captureError(
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
    console.error(`[Sentry] ${errorMessage}`, { context });
  }
}

/**
 * Capture API errors
 */
export function captureApiError(
  error: Error | string,
  endpoint: string,
  method: string,
  statusCode?: number,
  context?: ErrorContext
): void {
  captureError(error, {
    ...context,
    action: 'api_call',
    metadata: {
      ...context?.metadata,
      endpoint,
      method,
      statusCode,
    },
  });
}

/**
 * Capture Convex errors
 */
export function captureConvexError(
  error: Error | string,
  mutation: string,
  context?: ErrorContext
): void {
  captureError(error, {
    ...context,
    action: 'convex_mutation',
    component: 'convex',
    metadata: {
      ...context?.metadata,
      mutation,
    },
  });
}

/**
 * Capture UI errors (for error boundaries)
 */
export function captureUiError(
  error: Error,
  errorInfo: React.ErrorInfo,
  componentStack?: string,
  context?: ErrorContext
): void {
  captureError(error, {
    ...context,
    action: 'ui_error',
    metadata: {
      ...context?.metadata,
      componentStack: errorInfo.componentStack || componentStack,
    },
  }, 'error');
}

/**
 * Set user context for all future events
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
 * Clear user context (on logout)
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracking user actions
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
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      throw error;
    }
  }) as T;
}
