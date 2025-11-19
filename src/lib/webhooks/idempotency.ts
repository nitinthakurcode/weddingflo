/**
 * Professional Webhook System - Idempotency Helpers
 *
 * Prevents duplicate webhook processing using database-backed idempotency checks.
 * Uses the record_webhook_event() database function for atomic operations.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type {
  WebhookProvider,
  WebhookEventStatus,
  IdempotencyCheckResult,
  TransactionContext,
} from './types';
import { DuplicateWebhookError, DatabaseError } from './types';

/**
 * Create Supabase admin client (bypasses RLS for webhook processing)
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
// IDEMPOTENCY CHECK
// ============================================================================

/**
 * Check if webhook has already been processed (idempotency check)
 *
 * This function uses the database function record_webhook_event() which:
 * 1. Attempts to insert the webhook event
 * 2. If event_id already exists, returns existing record
 * 3. If new, inserts and returns new record
 *
 * This approach is atomic and prevents race conditions.
 *
 * @param provider - Webhook provider (stripe, resend, twilio)
 * @param eventId - Unique event ID from provider
 * @param eventType - Event type (e.g., 'payment_intent.succeeded')
 * @param payload - Full webhook payload for audit trail
 * @param httpHeaders - HTTP headers from request
 * @param ipAddress - Source IP address
 * @param userAgent - User agent string
 * @returns IdempotencyCheckResult with duplicate status
 * @throws DatabaseError if database operation fails
 */
export async function checkWebhookIdempotency(
  provider: WebhookProvider,
  eventId: string,
  eventType: string,
  payload: Record<string, any>,
  httpHeaders: Record<string, any> = {},
  ipAddress: string | null = null,
  userAgent: string | null = null
): Promise<IdempotencyCheckResult> {
  const supabase = getSupabaseAdmin();

  try {
    // Call database function for atomic idempotency check + insert
    const { data, error } = await supabase.rpc('record_webhook_event', {
      p_provider: provider,
      p_event_id: eventId,
      p_event_type: eventType,
      p_payload: payload as any,
      p_http_headers: httpHeaders as any,
      p_ip_address: ipAddress || undefined,
      p_user_agent: userAgent || undefined,
    });

    if (error) {
      throw new DatabaseError(
        `Failed to check webhook idempotency: ${error.message}`,
        provider,
        eventId,
        error
      );
    }

    if (!data || data.length === 0) {
      throw new DatabaseError(
        'No data returned from record_webhook_event',
        provider,
        eventId
      );
    }

    const result = data[0];

    return {
      isDuplicate: result.is_duplicate,
      webhookId: result.webhook_id,
      existingStatus: result.existing_status as WebhookEventStatus | null,
      shouldProcess: !result.is_duplicate, // Only process if not duplicate
    };
  } catch (error) {
    // If it's already one of our custom errors, re-throw
    if (error instanceof DatabaseError) {
      throw error;
    }

    // Wrap unknown errors
    throw new DatabaseError(
      `Unexpected error during idempotency check: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      provider,
      eventId,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// MARK WEBHOOK PROCESSED
// ============================================================================

/**
 * Mark webhook as successfully processed
 *
 * @param webhookId - Webhook record ID from idempotency check
 * @param status - Final status (processed, failed, skipped)
 * @param processingDurationMs - How long processing took
 * @param errorMessage - Error message if failed
 * @returns True if update succeeded
 * @throws DatabaseError if update fails
 */
export async function markWebhookProcessed(
  webhookId: string,
  provider: WebhookProvider,
  eventId: string,
  status: WebhookEventStatus,
  processingDurationMs: number,
  errorMessage?: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase.rpc('mark_webhook_processed', {
      p_webhook_id: webhookId,
      p_status: status,
      p_processing_duration_ms: processingDurationMs,
      p_error_message: errorMessage || undefined,
    });

    if (error) {
      throw new DatabaseError(
        `Failed to mark webhook as processed: ${error.message}`,
        provider,
        eventId,
        error
      );
    }

    return data === true;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError(
      `Unexpected error marking webhook as processed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      provider,
      eventId,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// INCREMENT RETRY COUNT
// ============================================================================

/**
 * Increment webhook retry count (for failed processing)
 *
 * @param webhookId - Webhook record ID
 * @param provider - Webhook provider
 * @param eventId - Event ID for error reporting
 * @returns New retry count
 * @throws DatabaseError if update fails
 */
export async function incrementWebhookRetry(
  webhookId: string,
  provider: WebhookProvider,
  eventId: string
): Promise<number> {
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase.rpc('increment_webhook_retry', {
      p_webhook_id: webhookId,
    });

    if (error) {
      throw new DatabaseError(
        `Failed to increment webhook retry count: ${error.message}`,
        provider,
        eventId,
        error
      );
    }

    return data as number;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }

    throw new DatabaseError(
      `Unexpected error incrementing retry count: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      provider,
      eventId,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// TRANSACTION CONTEXT
// ============================================================================

/**
 * Create transaction context for webhook processing
 *
 * This context object is passed through the webhook processing pipeline
 * to track timing, provide consistent error reporting, and enable
 * proper audit logging.
 *
 * @param webhookId - Webhook record ID
 * @param provider - Webhook provider
 * @param eventId - Unique event ID
 * @param eventType - Event type
 * @returns TransactionContext object
 */
export function createTransactionContext(
  webhookId: string,
  provider: WebhookProvider,
  eventId: string,
  eventType: string
): TransactionContext {
  return {
    webhookId,
    startTime: Date.now(),
    provider,
    eventId,
    eventType,
  };
}

/**
 * Calculate processing duration from transaction context
 *
 * @param context - Transaction context
 * @returns Processing duration in milliseconds
 */
export function getProcessingDuration(context: TransactionContext): number {
  return Date.now() - context.startTime;
}

// ============================================================================
// WEBHOOK PROCESSING WRAPPER
// ============================================================================

/**
 * Wrap webhook processing with idempotency check and audit logging
 *
 * This is a higher-order function that wraps the actual webhook processing logic.
 * It handles:
 * 1. Idempotency check
 * 2. Creating transaction context
 * 3. Executing processing logic
 * 4. Marking webhook as processed/failed
 * 5. Error handling
 *
 * @param provider - Webhook provider
 * @param eventId - Unique event ID
 * @param eventType - Event type
 * @param payload - Full webhook payload
 * @param processingFn - Function that processes the webhook
 * @param httpHeaders - HTTP headers from request
 * @param ipAddress - Source IP address
 * @param userAgent - User agent string
 * @returns Processing result
 */
export async function processWebhookWithIdempotency<T>(
  provider: WebhookProvider,
  eventId: string,
  eventType: string,
  payload: Record<string, any>,
  processingFn: (context: TransactionContext) => Promise<T>,
  httpHeaders: Record<string, any> = {},
  ipAddress: string | null = null,
  userAgent: string | null = null
): Promise<{ result: T | null; isDuplicate: boolean }> {
  // Step 1: Check idempotency
  const idempotencyResult = await checkWebhookIdempotency(
    provider,
    eventId,
    eventType,
    payload,
    httpHeaders,
    ipAddress,
    userAgent
  );

  // Step 2: If duplicate, throw error (caller should return 200)
  if (idempotencyResult.isDuplicate) {
    throw new DuplicateWebhookError(
      provider,
      eventId,
      idempotencyResult.existingStatus || 'unknown'
    );
  }

  // Step 3: Create transaction context
  const context = createTransactionContext(
    idempotencyResult.webhookId,
    provider,
    eventId,
    eventType
  );

  try {
    // Step 4: Execute processing logic
    const result = await processingFn(context);

    // Step 5: Mark as successfully processed
    const processingDurationMs = getProcessingDuration(context);
    await markWebhookProcessed(
      context.webhookId,
      provider,
      eventId,
      'processed',
      processingDurationMs
    );

    return { result, isDuplicate: false };
  } catch (error) {
    // Step 6: Mark as failed and re-throw
    const processingDurationMs = getProcessingDuration(context);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await markWebhookProcessed(
      context.webhookId,
      provider,
      eventId,
      'failed',
      processingDurationMs,
      errorMessage
    );

    // Re-throw for caller to handle
    throw error;
  }
}

// ============================================================================
// HELPER: Get webhook event by ID
// ============================================================================

/**
 * Get webhook event record by event ID
 *
 * Useful for checking if a webhook has been processed without
 * creating a new record.
 *
 * @param provider - Webhook provider
 * @param eventId - Unique event ID
 * @returns Webhook event record or null if not found
 */
export async function getWebhookEvent(
  provider: WebhookProvider,
  eventId: string
): Promise<{ id: string; status: WebhookEventStatus } | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('webhook_events')
    .select('id, status')
    .eq('provider', provider)
    .eq('event_id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found - this is okay
      return null;
    }
    throw new DatabaseError(
      `Failed to get webhook event: ${error.message}`,
      provider,
      eventId,
      error
    );
  }

  return data as { id: string; status: WebhookEventStatus };
}
