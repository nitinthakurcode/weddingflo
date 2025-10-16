/**
 * Centralized error handling utilities
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ErrorContext {
  userId?: string
  component?: string
  action?: string
  metadata?: Record<string, any>
}

export class AppError extends Error {
  public readonly severity: ErrorSeverity
  public readonly context?: ErrorContext
  public readonly timestamp: Date

  constructor(
    message: string,
    severity: ErrorSeverity = 'medium',
    context?: ErrorContext
  ) {
    super(message)
    this.name = 'AppError'
    this.severity = severity
    this.context = context
    this.timestamp = new Date()

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'low', context)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'medium', context)
    this.name = 'NetworkError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: ErrorContext) {
    super(message, 'high', context)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied', context?: ErrorContext) {
    super(message, 'high', context)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: ErrorContext) {
    super(message, 'low', context)
    this.name = 'NotFoundError'
  }
}

/**
 * Handle errors with proper logging and user feedback
 */
export function handleError(
  error: unknown,
  context?: ErrorContext
): AppError {
  // If it's already an AppError, just return it
  if (error instanceof AppError) {
    logError(error)
    return error
  }

  // If it's a standard Error, wrap it
  if (error instanceof Error) {
    const appError = new AppError(error.message, 'medium', context)
    logError(appError)
    return appError
  }

  // If it's a string, create an AppError
  if (typeof error === 'string') {
    const appError = new AppError(error, 'medium', context)
    logError(appError)
    return appError
  }

  // Unknown error type
  const appError = new AppError('An unknown error occurred', 'medium', context)
  logError(appError)
  return appError
}

/**
 * Log error to console and external services
 */
export function logError(error: AppError | Error): void {
  // Console logging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof AppError && {
        severity: error.severity,
        context: error.context,
        timestamp: error.timestamp,
      }),
    })
  }

  // Send to error tracking service (e.g., Sentry)
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    ;(window as any).Sentry.captureException(error, {
      level: error instanceof AppError ? mapSeverityToLevel(error.severity) : 'error',
      contexts: {
        custom: error instanceof AppError ? error.context : undefined,
      },
    })
  }
}

/**
 * Map error severity to Sentry level
 */
function mapSeverityToLevel(severity: ErrorSeverity): string {
  switch (severity) {
    case 'low':
      return 'info'
    case 'medium':
      return 'warning'
    case 'high':
      return 'error'
    case 'critical':
      return 'fatal'
    default:
      return 'error'
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message
  }

  if (error instanceof AuthenticationError) {
    return 'Please sign in to continue.'
  }

  if (error instanceof AuthorizationError) {
    return 'You do not have permission to perform this action.'
  }

  if (error instanceof NotFoundError) {
    return 'The requested resource could not be found.'
  }

  if (error instanceof NetworkError) {
    return 'Network error. Please check your connection and try again.'
  }

  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Check if error is retriable
 */
export function isRetriableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true
  }

  if (error instanceof Error) {
    // Check for specific error messages that indicate retriable errors
    const retriablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /fetch/i,
      /temporary/i,
    ]

    return retriablePatterns.some((pattern) => pattern.test(error.message))
  }

  return false
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if it's not a retriable error
      if (!isRetriableError(error)) {
        throw error
      }

      // Don't delay after the last attempt
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
