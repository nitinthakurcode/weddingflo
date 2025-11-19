/**
 * Professional Webhook System - Audit Logging
 *
 * Comprehensive audit trail for webhook processing.
 * Logs all webhook events, errors, and performance metrics.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type {
  WebhookProvider,
  AuditLogEntry,
  WebhookProcessingResult,
  TransactionContext,
} from './types';

/**
 * Create Supabase admin client (bypasses RLS for system logging)
 */
function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ============================================================================
// STRUCTURED LOGGING
// ============================================================================

/**
 * Log levels for structured logging
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Structured log entry
 */
interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  provider: WebhookProvider;
  event_id: string;
  event_type: string;
  message: string;
  duration_ms?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Log message with structured format
 *
 * In production, this should integrate with your logging service
 * (e.g., DataDog, New Relic, CloudWatch)
 *
 * @param entry - Structured log entry
 */
function logStructured(entry: StructuredLogEntry): void {
  const logMessage = JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  switch (entry.level) {
    case 'DEBUG':
      console.debug(logMessage);
      break;
    case 'INFO':
      console.info(logMessage);
      break;
    case 'WARN':
      console.warn(logMessage);
      break;
    case 'ERROR':
      console.error(logMessage);
      break;
  }
}

// ============================================================================
// WEBHOOK EVENT LOGGING
// ============================================================================

/**
 * Log webhook event received
 *
 * @param provider - Webhook provider
 * @param eventId - Unique event ID
 * @param eventType - Event type
 * @param metadata - Additional metadata
 */
export function logWebhookReceived(
  provider: WebhookProvider,
  eventId: string,
  eventType: string,
  metadata?: Record<string, any>
): void {
  logStructured({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    provider,
    event_id: eventId,
    event_type: eventType,
    message: `Webhook received: ${provider}.${eventType}`,
    metadata,
  });
}

/**
 * Log webhook processing started
 *
 * @param context - Transaction context
 * @param metadata - Additional metadata
 */
export function logWebhookProcessingStarted(
  context: TransactionContext,
  metadata?: Record<string, any>
): void {
  logStructured({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    provider: context.provider,
    event_id: context.eventId,
    event_type: context.eventType,
    message: `Webhook processing started`,
    metadata: {
      webhook_id: context.webhookId,
      ...metadata,
    },
  });
}

/**
 * Log webhook successfully processed
 *
 * @param context - Transaction context
 * @param durationMs - Processing duration
 * @param metadata - Additional metadata
 */
export function logWebhookSuccess(
  context: TransactionContext,
  durationMs: number,
  metadata?: Record<string, any>
): void {
  logStructured({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    provider: context.provider,
    event_id: context.eventId,
    event_type: context.eventType,
    message: `Webhook processed successfully`,
    duration_ms: durationMs,
    metadata: {
      webhook_id: context.webhookId,
      ...metadata,
    },
  });
}

/**
 * Log webhook processing failed
 *
 * @param context - Transaction context
 * @param error - Error that occurred
 * @param durationMs - Processing duration
 * @param metadata - Additional metadata
 */
export function logWebhookError(
  context: TransactionContext,
  error: Error,
  durationMs: number,
  metadata?: Record<string, any>
): void {
  logStructured({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    provider: context.provider,
    event_id: context.eventId,
    event_type: context.eventType,
    message: `Webhook processing failed: ${error.message}`,
    duration_ms: durationMs,
    error: {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    },
    metadata: {
      webhook_id: context.webhookId,
      ...metadata,
    },
  });
}

/**
 * Log webhook skipped (duplicate or unhandled event type)
 *
 * @param provider - Webhook provider
 * @param eventId - Unique event ID
 * @param eventType - Event type
 * @param reason - Why webhook was skipped
 * @param metadata - Additional metadata
 */
export function logWebhookSkipped(
  provider: WebhookProvider,
  eventId: string,
  eventType: string,
  reason: string,
  metadata?: Record<string, any>
): void {
  logStructured({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    provider,
    event_id: eventId,
    event_type: eventType,
    message: `Webhook skipped: ${reason}`,
    metadata,
  });
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Track webhook processing performance
 *
 * Logs slow webhooks for monitoring
 *
 * @param context - Transaction context
 * @param durationMs - Processing duration
 * @param threshold - Slow threshold in ms (default 1000ms)
 */
export function trackWebhookPerformance(
  context: TransactionContext,
  durationMs: number,
  threshold: number = 1000
): void {
  if (durationMs > threshold) {
    logStructured({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      provider: context.provider,
      event_id: context.eventId,
      event_type: context.eventType,
      message: `Slow webhook processing detected`,
      duration_ms: durationMs,
      metadata: {
        webhook_id: context.webhookId,
        threshold_ms: threshold,
      },
    });
  }
}

// ============================================================================
// WEBHOOK STATISTICS
// ============================================================================

/**
 * Get webhook statistics for monitoring
 *
 * @param provider - Webhook provider (optional - null for all providers)
 * @param hours - Number of hours to look back (default 24)
 * @returns Webhook statistics
 */
export async function getWebhookStatistics(
  provider: WebhookProvider | null = null,
  hours: number = 24
): Promise<{
  provider: string;
  total_webhooks: number;
  processed_webhooks: number;
  failed_webhooks: number;
  pending_webhooks: number;
  success_rate: number;
  avg_processing_time_ms: number;
}[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc('get_webhook_stats', {
    p_provider: provider || undefined,
    p_hours: hours,
  });

  if (error) {
    console.error('Failed to get webhook statistics:', error);
    return [];
  }

  return data as any[];
}

// ============================================================================
// ERROR CATEGORIZATION
// ============================================================================

/**
 * Categorize webhook errors for monitoring
 *
 * @param error - Error that occurred
 * @returns Error category
 */
export function categorizeWebhookError(error: Error): {
  category: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name;

  // Signature verification errors
  if (
    errorName === 'SignatureVerificationError' ||
    errorMessage.includes('signature')
  ) {
    return {
      category: 'authentication',
      retryable: false,
      severity: 'high',
    };
  }

  // Validation errors
  if (
    errorName === 'ValidationError' ||
    errorName === 'InvalidStatusTransitionError' ||
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid')
  ) {
    return {
      category: 'validation',
      retryable: false,
      severity: 'medium',
    };
  }

  // Database errors
  if (
    errorName === 'DatabaseError' ||
    errorMessage.includes('database') ||
    errorMessage.includes('supabase') ||
    errorMessage.includes('connection')
  ) {
    return {
      category: 'database',
      retryable: true,
      severity: 'high',
    };
  }

  // Record not found
  if (
    errorName === 'RecordNotFoundError' ||
    errorMessage.includes('not found')
  ) {
    return {
      category: 'not_found',
      retryable: false,
      severity: 'medium',
    };
  }

  // Network/timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('network') ||
    errorMessage.includes('ECONNREFUSED')
  ) {
    return {
      category: 'network',
      retryable: true,
      severity: 'medium',
    };
  }

  // Unknown errors
  return {
    category: 'unknown',
    retryable: true,
    severity: 'critical',
  };
}

// ============================================================================
// MONITORING ALERTS
// ============================================================================

/**
 * Check if webhook error rate is above threshold
 *
 * This function can trigger alerts to ops team
 *
 * @param provider - Webhook provider
 * @param hours - Hours to look back
 * @param threshold - Error rate threshold (0-100)
 * @returns True if error rate is above threshold
 */
export async function checkWebhookErrorRate(
  provider: WebhookProvider,
  hours: number = 1,
  threshold: number = 5
): Promise<{
  isAboveThreshold: boolean;
  errorRate: number;
  totalWebhooks: number;
  failedWebhooks: number;
}> {
  const stats = await getWebhookStatistics(provider, hours);

  if (stats.length === 0) {
    return {
      isAboveThreshold: false,
      errorRate: 0,
      totalWebhooks: 0,
      failedWebhooks: 0,
    };
  }

  const providerStats = stats[0];
  const errorRate = 100 - providerStats.success_rate;

  const isAboveThreshold = errorRate > threshold;

  if (isAboveThreshold) {
    logStructured({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      provider,
      event_id: 'MONITORING',
      event_type: 'error_rate_alert',
      message: `Webhook error rate above threshold: ${errorRate.toFixed(2)}%`,
      metadata: {
        threshold,
        error_rate: errorRate,
        total_webhooks: providerStats.total_webhooks,
        failed_webhooks: providerStats.failed_webhooks,
        hours,
      },
    });

    // TODO: Send alert to ops team (email, Slack, PagerDuty, etc.)
    // await sendOpsAlert({...});
  }

  return {
    isAboveThreshold,
    errorRate,
    totalWebhooks: providerStats.total_webhooks,
    failedWebhooks: providerStats.failed_webhooks,
  };
}

// ============================================================================
// WEBHOOK PROCESSING RESULT FORMATTER
// ============================================================================

/**
 * Create webhook processing result for API response
 *
 * @param context - Transaction context
 * @param success - Whether processing succeeded
 * @param durationMs - Processing duration
 * @param error - Error if failed
 * @returns Formatted result
 */
export function createWebhookResult(
  context: TransactionContext,
  success: boolean,
  durationMs: number,
  error?: Error
): WebhookProcessingResult {
  return {
    success,
    webhookId: context.webhookId,
    eventId: context.eventId,
    eventType: context.eventType,
    status: success ? 'processed' : 'failed',
    processingTimeMs: durationMs,
    ...(error && {
      error: {
        message: error.message,
        code: error.name,
        retryable: categorizeWebhookError(error).retryable,
      },
    }),
  };
}

// ============================================================================
// DEBUG HELPERS
// ============================================================================

/**
 * Log webhook payload for debugging (sanitized)
 *
 * Removes sensitive fields before logging
 *
 * @param provider - Webhook provider
 * @param eventId - Event ID
 * @param payload - Webhook payload
 */
export function logWebhookPayload(
  provider: WebhookProvider,
  eventId: string,
  payload: Record<string, any>
): void {
  // Sanitize sensitive fields
  const sanitized = JSON.parse(JSON.stringify(payload));

  // Remove common sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'api_key',
    'credit_card',
    'ssn',
    'social_security',
  ];

  function redactSensitiveFields(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    for (const key in obj) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        obj[key] = redactSensitiveFields(obj[key]);
      }
    }

    return obj;
  }

  const redacted = redactSensitiveFields(sanitized);

  logStructured({
    timestamp: new Date().toISOString(),
    level: 'DEBUG',
    provider,
    event_id: eventId,
    event_type: 'payload_debug',
    message: 'Webhook payload (sanitized)',
    metadata: { payload: redacted },
  });
}
