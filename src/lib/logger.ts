import * as Sentry from '@sentry/nextjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  companyId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface LogMessage {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  error?: Error;
}

/**
 * Logger class for structured logging
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private minLevel: LogLevel = this.isDevelopment ? 'debug' : 'info';

  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatMessage(logMessage: LogMessage): string {
    const { timestamp, level, message, context } = logMessage;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${prefix} ${message}${contextStr}`;
  }

  private logToConsole(logMessage: LogMessage): void {
    const formatted = this.formatMessage(logMessage);

    switch (logMessage.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted, logMessage.error);
        break;
    }
  }

  private logToSentry(logMessage: LogMessage): void {
    const { level, message, context, error } = logMessage;

    // Add breadcrumb for non-error logs
    if (level !== 'error') {
      Sentry.addBreadcrumb({
        message,
        level: level as Sentry.SeverityLevel,
        data: context?.metadata,
        category: context?.component || 'general',
      });
      return;
    }

    // Capture errors in Sentry
    if (error) {
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          component: context?.component,
          action: context?.action,
        },
        contexts: {
          user: context?.userId ? { id: context.userId } : undefined,
          company: context?.companyId ? { id: context.companyId } : undefined,
        },
        extra: context?.metadata,
      });
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        tags: {
          component: context?.component,
          action: context?.action,
        },
        contexts: {
          user: context?.userId ? { id: context.userId } : undefined,
          company: context?.companyId ? { id: context.companyId } : undefined,
        },
        extra: context?.metadata,
      });
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const logMessage: LogMessage = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      error,
    };

    // Always log to console in development
    if (this.isDevelopment) {
      this.logToConsole(logMessage);
    }

    // Log to Sentry in production
    if (!this.isDevelopment) {
      this.logToSentry(logMessage);
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Utility functions for common logging scenarios
 */

export function logMutation(
  mutationName: string,
  args: unknown,
  context?: Omit<LogContext, 'component' | 'action'>
): void {
  logger.info(`Mutation: ${mutationName}`, {
    ...context,
    component: 'convex',
    action: 'mutation',
    metadata: { mutationName, args },
  });
}

export function logQuery(
  queryName: string,
  args: unknown,
  context?: Omit<LogContext, 'component' | 'action'>
): void {
  logger.debug(`Query: ${queryName}`, {
    ...context,
    component: 'convex',
    action: 'query',
    metadata: { queryName, args },
  });
}

export function logApiRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  context?: Omit<LogContext, 'component' | 'action'>
): void {
  const level = statusCode >= 400 ? 'error' : 'info';
  const message = `API ${method} ${endpoint} - ${statusCode}`;

  if (level === 'error') {
    logger.error(message, undefined, {
      ...context,
      component: 'api',
      action: 'request',
      metadata: { endpoint, method, statusCode },
    });
  } else {
    logger.info(message, {
      ...context,
      component: 'api',
      action: 'request',
      metadata: { endpoint, method, statusCode },
    });
  }
}

export function logAIOperation(
  operation: string,
  duration: number,
  success: boolean,
  context?: Omit<LogContext, 'component' | 'action'>
): void {
  logger.info(`AI Operation: ${operation}`, {
    ...context,
    component: 'ai',
    action: operation,
    metadata: { duration, success },
  });
}

export function logExport(
  exportType: string,
  itemCount: number,
  format: string,
  context?: Omit<LogContext, 'component' | 'action'>
): void {
  logger.info(`Export: ${exportType}`, {
    ...context,
    component: 'export',
    action: 'generate',
    metadata: { exportType, itemCount, format },
  });
}

export function logAuth(
  action: 'login' | 'logout' | 'signup',
  userId: string,
  context?: Omit<LogContext, 'component' | 'action' | 'userId'>
): void {
  logger.info(`Auth: ${action}`, {
    ...context,
    userId,
    component: 'auth',
    action,
  });
}
