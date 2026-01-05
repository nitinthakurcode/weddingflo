/**
 * Professional Webhook System - Type Definitions
 *
 * Enterprise-grade type safety for webhook processing.
 * Includes interfaces, enums, and custom error classes.
 */

// ============================================================================
// WEBHOOK PROVIDERS
// ============================================================================

export type WebhookProvider = 'stripe' | 'resend' | 'twilio';

// ============================================================================
// WEBHOOK EVENT STATUS
// ============================================================================

export type WebhookEventStatus =
  | 'pending'      // Received but not processed yet
  | 'processing'   // Currently being processed
  | 'processed'    // Successfully processed
  | 'failed'       // Processing failed (will retry)
  | 'skipped';     // Skipped (e.g., unhandled event type)

// ============================================================================
// PAYMENT STATUS (from database.types)
// ============================================================================

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'succeeded'
  | 'canceled'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

// ============================================================================
// EMAIL STATUS (from database.types)
// ============================================================================

export type EmailStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'delayed'
  | 'failed'
  | 'bounced'
  | 'complained'
  | 'opened'
  | 'clicked';

// ============================================================================
// SMS STATUS (from database.types)
// ============================================================================

export type SmsStatus =
  | 'pending'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed';

// ============================================================================
// STRIPE WEBHOOK TYPES
// ============================================================================

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, any>;
  };
  created: number;
}

export type StripeEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'customer.subscription.trial_will_end'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'charge.refunded'
  | 'account.updated';

// ============================================================================
// RESEND WEBHOOK TYPES
// ============================================================================

export interface ResendWebhookEvent {
  type: ResendEventType;
  data: {
    email_id: string;
    reason?: string;
    [key: string]: any;
  };
  created_at: string;
}

export type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked';

// ============================================================================
// TWILIO WEBHOOK TYPES
// ============================================================================

export interface TwilioWebhookParams {
  MessageSid?: string;
  SmsSid?: string;
  MessageStatus?: string;
  SmsStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  From?: string;
  To?: string;
  Body?: string;
  [key: string]: string | undefined;
}

export type TwilioMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed';

// ============================================================================
// WEBHOOK EVENT RECORD
// ============================================================================

export interface WebhookEventRecord {
  id: string;
  provider: WebhookProvider;
  event_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: WebhookEventStatus;
  processed_at: string | null;
  processing_duration_ms: number | null;
  error_message: string | null;
  retry_count: number;
  http_headers: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// IDEMPOTENCY CHECK RESULT
// ============================================================================

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  webhookId: string;
  existingStatus: WebhookEventStatus | null;
  shouldProcess: boolean;
}

// ============================================================================
// AUDIT LOG ENTRY
// ============================================================================

export interface AuditLogEntry {
  event_type: string;
  event_id: string;
  provider: WebhookProvider;
  payload: Record<string, any>;
  status: 'success' | 'error';
  processing_time_ms: number;
  error_message?: string;
  error_stack?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// STATE MACHINE TRANSITIONS
// ============================================================================

export type StatusTransitions<T extends string> = {
  [K in T]: T[];
};

// Valid payment status transitions
export const PAYMENT_STATUS_TRANSITIONS: StatusTransitions<PaymentStatus> = {
  pending: ['processing', 'canceled', 'failed'],
  processing: ['requires_action', 'succeeded', 'failed', 'canceled'],
  requires_action: ['processing', 'succeeded', 'failed', 'canceled'],
  succeeded: ['refunded', 'partially_refunded'],
  canceled: [], // Terminal state
  failed: ['processing'], // Can retry
  refunded: [], // Terminal state
  partially_refunded: ['refunded'],
};

// Valid email status transitions
export const EMAIL_STATUS_TRANSITIONS: StatusTransitions<EmailStatus> = {
  pending: ['sent', 'failed'],
  sent: ['delivered', 'delayed', 'bounced', 'failed'],
  delivered: ['opened', 'clicked', 'complained'],
  delayed: ['sent', 'delivered', 'failed', 'bounced'],
  failed: [], // Terminal state
  bounced: [], // Terminal state
  complained: [], // Terminal state
  opened: ['clicked'], // Can transition to clicked
  clicked: [], // Terminal state
};

// Valid SMS status transitions
export const SMS_STATUS_TRANSITIONS: StatusTransitions<SmsStatus> = {
  pending: ['queued', 'failed'],
  queued: ['sending', 'failed'],
  sending: ['sent', 'failed'],
  sent: ['delivered', 'undelivered', 'failed'],
  delivered: [], // Terminal state
  undelivered: [], // Terminal state
  failed: [], // Terminal state
};

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Base webhook error class
 */
export class WebhookError extends Error {
  constructor(
    message: string,
    public readonly provider: WebhookProvider,
    public readonly eventId: string,
    public readonly statusCode: number = 500,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

/**
 * Webhook signature verification failed
 */
export class SignatureVerificationError extends WebhookError {
  constructor(provider: WebhookProvider, eventId: string) {
    super(
      'Webhook signature verification failed',
      provider,
      eventId,
      401, // Unauthorized
      false // Don't retry - signature will always fail
    );
    this.name = 'SignatureVerificationError';
  }
}

/**
 * Webhook payload validation failed
 */
export class ValidationError extends WebhookError {
  constructor(
    message: string,
    provider: WebhookProvider,
    eventId: string,
    public readonly validationErrors: string[]
  ) {
    super(
      message,
      provider,
      eventId,
      400, // Bad Request
      false // Don't retry - payload will always be invalid
    );
    this.name = 'ValidationError';
  }
}

/**
 * Invalid status transition attempted
 */
export class InvalidStatusTransitionError extends WebhookError {
  constructor(
    currentStatus: string,
    newStatus: string,
    provider: WebhookProvider,
    eventId: string
  ) {
    super(
      `Invalid status transition: ${currentStatus} → ${newStatus}`,
      provider,
      eventId,
      400, // Bad Request
      false // Don't retry - transition will always be invalid
    );
    this.name = 'InvalidStatusTransitionError';
  }
}

/**
 * Database operation failed
 */
export class DatabaseError extends WebhookError {
  constructor(
    message: string,
    provider: WebhookProvider,
    eventId: string,
    public readonly originalError?: Error
  ) {
    super(
      message,
      provider,
      eventId,
      500, // Internal Server Error
      true // Retry - might be transient
    );
    this.name = 'DatabaseError';
  }
}

/**
 * Record not found in database
 */
export class RecordNotFoundError extends WebhookError {
  constructor(
    tableName: string,
    identifier: string,
    provider: WebhookProvider,
    eventId: string
  ) {
    super(
      `Record not found in ${tableName}: ${identifier}`,
      provider,
      eventId,
      404, // Not Found
      false // Don't retry - record doesn't exist
    );
    this.name = 'RecordNotFoundError';
  }
}

/**
 * Webhook already processed (idempotency check)
 */
export class DuplicateWebhookError extends WebhookError {
  constructor(
    provider: WebhookProvider,
    eventId: string,
    public readonly existingStatus: string
  ) {
    super(
      `Webhook already processed with status: ${existingStatus}`,
      provider,
      eventId,
      200, // OK - not really an error, just info
      false // Don't retry - already processed
    );
    this.name = 'DuplicateWebhookError';
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if status transition is valid
 */
export function isValidTransition<T extends string>(
  transitions: StatusTransitions<T>,
  currentStatus: T,
  newStatus: T
): boolean {
  return transitions[currentStatus].includes(newStatus);
}

/**
 * Type guard for Stripe webhook event
 */
export function isStripeWebhookEvent(event: any): event is StripeWebhookEvent {
  return (
    typeof event === 'object' &&
    'id' in event &&
    'type' in event &&
    'data' in event &&
    typeof event.data === 'object' &&
    'object' in event.data
  );
}

/**
 * Type guard for Resend webhook event
 */
export function isResendWebhookEvent(event: any): event is ResendWebhookEvent {
  return (
    typeof event === 'object' &&
    'type' in event &&
    'data' in event &&
    typeof event.data === 'object' &&
    'email_id' in event.data
  );
}

/**
 * Type guard for Twilio webhook params
 */
export function isTwilioWebhookParams(params: any): params is TwilioWebhookParams {
  return (
    typeof params === 'object' &&
    ('MessageSid' in params || 'SmsSid' in params) &&
    ('MessageStatus' in params || 'SmsStatus' in params)
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  success: boolean;
  webhookId: string;
  eventId: string;
  eventType: string;
  status: WebhookEventStatus;
  processingTimeMs: number;
  error?: {
    message: string;
    code: string;
    retryable: boolean;
  };
}

/**
 * Transaction context for database operations
 */
export interface TransactionContext {
  webhookId: string;
  startTime: number;
  provider: WebhookProvider;
  eventId: string;
  eventType: string;
}
