import 'server-only'
import * as Sentry from '@sentry/nextjs'

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
 * Capture an exception with context (SERVER-SIDE ONLY)
 */
export function captureServerException(
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
    console.error(`[Sentry Server] ${errorMessage}`, { context });
  }
}

/**
 * Capture API errors (SERVER-SIDE)
 */
export function captureApiError(
  error: Error | string,
  endpoint: string,
  method: string,
  statusCode?: number,
  context?: ErrorContext
): void {
  captureServerException(error, {
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
 * Add breadcrumb for tracking server actions (SERVER-SIDE)
 */
export function addServerBreadcrumb(
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
 * Wrap async server functions with error handling
 */
export function withServerErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureServerException(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      throw error;
    }
  }) as T;
}
