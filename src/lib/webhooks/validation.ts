/**
 * Professional Webhook System - Validation & State Machine
 *
 * Status transition validation using state machine pattern.
 * Ensures only valid status changes are allowed.
 */

import type {
  PaymentStatus,
  EmailStatus,
  SmsStatus,
  WebhookProvider,
} from './types';
import {
  PAYMENT_STATUS_TRANSITIONS,
  EMAIL_STATUS_TRANSITIONS,
  SMS_STATUS_TRANSITIONS,
  InvalidStatusTransitionError,
  ValidationError,
} from './types';

// ============================================================================
// STATUS TRANSITION VALIDATION
// ============================================================================

/**
 * Validate payment status transition
 *
 * @param currentStatus - Current payment status
 * @param newStatus - Proposed new status
 * @param provider - Webhook provider (for error reporting)
 * @param eventId - Event ID (for error reporting)
 * @throws InvalidStatusTransitionError if transition is not allowed
 */
export function validatePaymentStatusTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus,
  provider: WebhookProvider,
  eventId: string
): void {
  const allowedTransitions = PAYMENT_STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw new InvalidStatusTransitionError(
      currentStatus,
      newStatus,
      provider,
      eventId
    );
  }
}

/**
 * Validate email status transition
 *
 * @param currentStatus - Current email status
 * @param newStatus - Proposed new status
 * @param provider - Webhook provider (for error reporting)
 * @param eventId - Event ID (for error reporting)
 * @throws InvalidStatusTransitionError if transition is not allowed
 */
export function validateEmailStatusTransition(
  currentStatus: EmailStatus,
  newStatus: EmailStatus,
  provider: WebhookProvider,
  eventId: string
): void {
  const allowedTransitions = EMAIL_STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw new InvalidStatusTransitionError(
      currentStatus,
      newStatus,
      provider,
      eventId
    );
  }
}

/**
 * Validate SMS status transition
 *
 * @param currentStatus - Current SMS status
 * @param newStatus - Proposed new status
 * @param provider - Webhook provider (for error reporting)
 * @param eventId - Event ID (for error reporting)
 * @throws InvalidStatusTransitionError if transition is not allowed
 */
export function validateSmsStatusTransition(
  currentStatus: SmsStatus,
  newStatus: SmsStatus,
  provider: WebhookProvider,
  eventId: string
): void {
  const allowedTransitions = SMS_STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw new InvalidStatusTransitionError(
      currentStatus,
      newStatus,
      provider,
      eventId
    );
  }
}

// ============================================================================
// PAYLOAD VALIDATION
// ============================================================================

/**
 * Validate Stripe payment intent webhook payload
 *
 * @param paymentIntent - Payment intent object from Stripe
 * @param provider - Webhook provider
 * @param eventId - Event ID
 * @throws ValidationError if payload is invalid
 */
export function validateStripePaymentIntent(
  paymentIntent: any,
  provider: WebhookProvider,
  eventId: string
): void {
  const errors: string[] = [];

  if (!paymentIntent.id) {
    errors.push('Missing payment_intent.id');
  }

  if (typeof paymentIntent.amount !== 'number') {
    errors.push('Invalid payment_intent.amount (must be number)');
  }

  if (!paymentIntent.currency || typeof paymentIntent.currency !== 'string') {
    errors.push('Invalid payment_intent.currency (must be string)');
  }

  if (!paymentIntent.status) {
    errors.push('Missing payment_intent.status');
  }

  if (errors.length > 0) {
    throw new ValidationError(
      'Invalid Stripe payment intent payload',
      provider,
      eventId,
      errors
    );
  }
}

/**
 * Validate Stripe charge webhook payload
 *
 * @param charge - Charge object from Stripe
 * @param provider - Webhook provider
 * @param eventId - Event ID
 * @throws ValidationError if payload is invalid
 */
export function validateStripeCharge(
  charge: any,
  provider: WebhookProvider,
  eventId: string
): void {
  const errors: string[] = [];

  if (!charge.id) {
    errors.push('Missing charge.id');
  }

  if (typeof charge.amount !== 'number') {
    errors.push('Invalid charge.amount (must be number)');
  }

  if (!charge.currency || typeof charge.currency !== 'string') {
    errors.push('Invalid charge.currency (must be string)');
  }

  if (errors.length > 0) {
    throw new ValidationError(
      'Invalid Stripe charge payload',
      provider,
      eventId,
      errors
    );
  }
}

/**
 * Validate Stripe subscription webhook payload
 *
 * @param subscription - Subscription object from Stripe
 * @param provider - Webhook provider
 * @param eventId - Event ID
 * @throws ValidationError if payload is invalid
 */
export function validateStripeSubscription(
  subscription: any,
  provider: WebhookProvider,
  eventId: string
): void {
  const errors: string[] = [];

  if (!subscription.id) {
    errors.push('Missing subscription.id');
  }

  if (!subscription.status) {
    errors.push('Missing subscription.status');
  }

  if (!subscription.metadata || typeof subscription.metadata !== 'object') {
    errors.push('Invalid subscription.metadata (must be object)');
  }

  if (errors.length > 0) {
    throw new ValidationError(
      'Invalid Stripe subscription payload',
      provider,
      eventId,
      errors
    );
  }
}

/**
 * Validate Resend email webhook payload
 *
 * @param data - Email data from Resend
 * @param provider - Webhook provider
 * @param eventId - Event ID
 * @throws ValidationError if payload is invalid
 */
export function validateResendEmailPayload(
  data: any,
  provider: WebhookProvider,
  eventId: string
): void {
  const errors: string[] = [];

  if (!data.email_id || typeof data.email_id !== 'string') {
    errors.push('Missing or invalid email_id (must be string)');
  }

  if (errors.length > 0) {
    throw new ValidationError(
      'Invalid Resend email payload',
      provider,
      eventId,
      errors
    );
  }
}

/**
 * Validate Twilio SMS webhook payload
 *
 * @param params - SMS params from Twilio
 * @param provider - Webhook provider
 * @param eventId - Event ID
 * @throws ValidationError if payload is invalid
 */
export function validateTwilioSmsPayload(
  params: any,
  provider: WebhookProvider,
  eventId: string
): void {
  const errors: string[] = [];

  const messageSid = params.MessageSid || params.SmsSid;
  const messageStatus = params.MessageStatus || params.SmsStatus;

  if (!messageSid || typeof messageSid !== 'string') {
    errors.push('Missing or invalid MessageSid/SmsSid (must be string)');
  }

  if (!messageStatus || typeof messageStatus !== 'string') {
    errors.push('Missing or invalid MessageStatus/SmsStatus (must be string)');
  }

  if (errors.length > 0) {
    throw new ValidationError(
      'Invalid Twilio SMS payload',
      provider,
      eventId,
      errors
    );
  }
}

// ============================================================================
// BUSINESS LOGIC VALIDATION
// ============================================================================

/**
 * Validate refund amount
 *
 * Ensures refund amount doesn't exceed original payment amount
 *
 * @param refundAmount - Amount to refund
 * @param paymentAmount - Original payment amount
 * @param alreadyRefunded - Amount already refunded
 * @param provider - Webhook provider
 * @param eventId - Event ID
 * @throws ValidationError if refund amount is invalid
 */
export function validateRefundAmount(
  refundAmount: number,
  paymentAmount: number,
  alreadyRefunded: number,
  provider: WebhookProvider,
  eventId: string
): void {
  const errors: string[] = [];

  if (refundAmount <= 0) {
    errors.push('Refund amount must be positive');
  }

  if (refundAmount + alreadyRefunded > paymentAmount) {
    errors.push(
      `Refund amount (${refundAmount}) + already refunded (${alreadyRefunded}) exceeds payment amount (${paymentAmount})`
    );
  }

  if (errors.length > 0) {
    throw new ValidationError(
      'Invalid refund amount',
      provider,
      eventId,
      errors
    );
  }
}

/**
 * Validate phone number format (E.164)
 *
 * @param phoneNumber - Phone number to validate
 * @returns True if valid E.164 format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +[country code][number]
  // Example: +14155552671
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Validate email address format
 *
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate currency code (ISO 4217)
 *
 * @param currency - Currency code to validate
 * @returns True if valid currency code
 */
export function isValidCurrency(currency: string): boolean {
  // List of supported currencies
  const supportedCurrencies = [
    'usd',
    'eur',
    'gbp',
    'cad',
    'aud',
    'jpy',
    'inr',
  ];

  return supportedCurrencies.includes(currency.toLowerCase());
}

// ============================================================================
// METADATA VALIDATION
// ============================================================================

/**
 * Validate Stripe metadata contains required fields
 *
 * @param metadata - Metadata object from Stripe
 * @param requiredFields - Required field names
 * @param provider - Webhook provider
 * @param eventId - Event ID
 * @throws ValidationError if required fields are missing
 */
export function validateStripeMetadata(
  metadata: Record<string, any> | undefined | null,
  requiredFields: string[],
  provider: WebhookProvider,
  eventId: string
): void {
  const errors: string[] = [];

  if (!metadata || typeof metadata !== 'object') {
    errors.push('Metadata is missing or invalid');
  } else {
    for (const field of requiredFields) {
      if (!(field in metadata) || !metadata[field]) {
        errors.push(`Missing required metadata field: ${field}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(
      'Invalid Stripe metadata',
      provider,
      eventId,
      errors
    );
  }
}

// ============================================================================
// TERMINAL STATE CHECKS
// ============================================================================

/**
 * Check if payment status is terminal (cannot be changed)
 *
 * @param status - Payment status
 * @returns True if status is terminal
 */
export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return PAYMENT_STATUS_TRANSITIONS[status].length === 0;
}

/**
 * Check if email status is terminal (cannot be changed)
 *
 * @param status - Email status
 * @returns True if status is terminal
 */
export function isTerminalEmailStatus(status: EmailStatus): boolean {
  return EMAIL_STATUS_TRANSITIONS[status].length === 0;
}

/**
 * Check if SMS status is terminal (cannot be changed)
 *
 * @param status - SMS status
 * @returns True if status is terminal
 */
export function isTerminalSmsStatus(status: SmsStatus): boolean {
  return SMS_STATUS_TRANSITIONS[status].length === 0;
}

// ============================================================================
// IDEMPOTENCY VALIDATION
// ============================================================================

/**
 * Check if status change is idempotent (same status transition)
 *
 * If current status equals new status, this is an idempotent webhook
 * and should be safely skipped.
 *
 * @param currentStatus - Current status
 * @param newStatus - New status
 * @returns True if idempotent
 */
export function isIdempotentStatusChange(
  currentStatus: string,
  newStatus: string
): boolean {
  return currentStatus === newStatus;
}
