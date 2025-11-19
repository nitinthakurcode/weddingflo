/**
 * PRODUCTION-GRADE Resend Webhook Handler
 *
 * Enterprise implementation with:
 * - Idempotency (prevents duplicate processing)
 * - Atomic counter updates (no race conditions)
 * - Status validation (state machine)
 * - Comprehensive error handling
 * - Audit logging
 * - Performance tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import type { Database } from '@/lib/database.types';

// Import professional webhook helpers
import {
  processWebhookWithIdempotency,
} from '@/lib/webhooks/idempotency';
import {
  logWebhookReceived,
  logWebhookSuccess,
  logWebhookSkipped,
  trackWebhookPerformance,
  categorizeWebhookError,
} from '@/lib/webhooks/audit';
import {
  validateResendEmailPayload,
} from '@/lib/webhooks/validation';
import {
  SignatureVerificationError,
  DuplicateWebhookError,
  ValidationError,
  DatabaseError,
  type TransactionContext,
  type ResendEventType,
} from '@/lib/webhooks/types';

// ============================================================================
// SUPABASE ADMIN CLIENT
// ============================================================================

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
// SIGNATURE VERIFICATION
// ============================================================================

function verifyResendSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch (error) {
    return false;
  }
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let eventId = 'unknown';

  try {
    // STEP 1: Parse request
    const body = await req.text();
    const signature = req.headers.get('resend-signature');

    if (!signature) {
      throw new SignatureVerificationError('resend', 'no-signature');
    }

    // STEP 2: Verify signature
    const isValid = verifyResendSignature(
      body,
      signature,
      process.env.RESEND_WEBHOOK_SECRET!
    );

    if (!isValid) {
      throw new SignatureVerificationError('resend', 'invalid-signature');
    }

    // STEP 3: Parse event
    const event = JSON.parse(body);
    eventId = event.data?.email_id || 'unknown';

    // STEP 4: Validate payload
    validateResendEmailPayload(event.data, 'resend', eventId);

    // STEP 5: Log webhook received
    logWebhookReceived('resend', eventId, event.type);

    // STEP 6: Process with idempotency check
    const { result, isDuplicate } = await processWebhookWithIdempotency(
      'resend',
      eventId,
      event.type,
      event,
      async (context) => {
        // Route to specific handler based on event type
        switch (event.type as ResendEventType) {
          case 'email.sent':
            return await handleEmailSent(event.data.email_id, context);

          case 'email.delivered':
            return await handleEmailDelivered(event.data.email_id, context);

          case 'email.delivery_delayed':
            return await handleEmailDelayed(event.data.email_id, event.data.reason, context);

          case 'email.complained':
            return await handleEmailComplained(event.data.email_id, context);

          case 'email.bounced':
            return await handleEmailBounced(event.data.email_id, event.data.reason, context);

          case 'email.opened':
            return await handleEmailOpened(event.data.email_id, context);

          case 'email.clicked':
            return await handleEmailClicked(event.data.email_id, context);

          default:
            logWebhookSkipped('resend', eventId, event.type, 'Unhandled event type');
            return { skipped: true };
        }
      },
      Object.fromEntries(req.headers.entries()),
      req.headers.get('x-forwarded-for'),
      req.headers.get('user-agent')
    );

    // STEP 7: Log success and track performance
    const processingDuration = Date.now() - startTime;
    const context: TransactionContext = {
      webhookId: 'completed',
      startTime,
      provider: 'resend',
      eventId,
      eventType: event.type,
    };

    logWebhookSuccess(context, processingDuration, { result });
    trackWebhookPerformance(context, processingDuration);

    // STEP 8: Return 200 OK
    return NextResponse.json({
      received: true,
      event_id: eventId,
      event_type: event.type,
      processing_time_ms: processingDuration,
      isDuplicate,
    });

  } catch (error) {
    const err = error as Error;
    const processingDuration = Date.now() - startTime;

    // Handle duplicate webhooks
    if (error instanceof DuplicateWebhookError) {
      logWebhookSkipped('resend', eventId, error.eventId, 'Duplicate webhook');
      return NextResponse.json({
        received: true,
        status: 'already_processed',
        event_id: eventId,
      });
    }

    // Handle signature verification errors
    if (error instanceof SignatureVerificationError) {
      return NextResponse.json(
        { error: 'Invalid signature', event_id: eventId },
        { status: 401 }
      );
    }

    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          event_id: eventId,
          details: error.validationErrors,
        },
        { status: 400 }
      );
    }

    // Handle database errors (retryable)
    if (error instanceof DatabaseError) {
      return NextResponse.json(
        {
          error: 'Database error',
          event_id: eventId,
          message: 'Temporary error - will retry',
        },
        { status: 503 }
      );
    }

    // Handle unknown errors
    const category = categorizeWebhookError(err);
    console.error('❌ Resend webhook error:', {
      event_id: eventId,
      error: err.message,
      category: category.category,
      retryable: category.retryable,
      severity: category.severity,
      stack: err.stack,
    });

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        event_id: eventId,
        retryable: category.retryable,
      },
      { status: category.retryable ? 503 : 500 }
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleEmailSent(emailId: string, context: TransactionContext): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('update_email_status', {
    p_resend_id: emailId,
    p_status: 'sent',
    p_sent_at: new Date().toISOString(),
  });

  if (error) {
    throw new DatabaseError(
      `Failed to update email sent status: ${error.message}`,
      'resend',
      context.eventId,
      error
    );
  }
}

async function handleEmailDelivered(emailId: string, context: TransactionContext): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('update_email_status', {
    p_resend_id: emailId,
    p_status: 'delivered',
    p_delivered_at: new Date().toISOString(),
  });

  if (error) {
    throw new DatabaseError(
      `Failed to update email delivered status: ${error.message}`,
      'resend',
      context.eventId,
      error
    );
  }
}

async function handleEmailDelayed(
  emailId: string,
  reason: string | undefined,
  context: TransactionContext
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('update_email_status', {
    p_resend_id: emailId,
    p_status: 'delayed',
    p_error_message: reason || 'Delivery delayed by recipient server',
  });

  if (error) {
    throw new DatabaseError(
      `Failed to update email delayed status: ${error.message}`,
      'resend',
      context.eventId,
      error
    );
  }
}

async function handleEmailComplained(emailId: string, context: TransactionContext): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('update_email_status', {
    p_resend_id: emailId,
    p_status: 'complained',
    p_complained_at: new Date().toISOString(),
  });

  if (error) {
    throw new DatabaseError(
      `Failed to update email complained status: ${error.message}`,
      'resend',
      context.eventId,
      error
    );
  }
}

async function handleEmailBounced(
  emailId: string,
  reason: string | undefined,
  context: TransactionContext
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.rpc('update_email_status', {
    p_resend_id: emailId,
    p_status: 'bounced',
    p_error_message: reason || 'Email bounced',
    p_bounced_at: new Date().toISOString(),
  });

  if (error) {
    throw new DatabaseError(
      `Failed to update email bounced status: ${error.message}`,
      'resend',
      context.eventId,
      error
    );
  }
}

async function handleEmailOpened(emailId: string, context: TransactionContext): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Use atomic function to prevent race conditions
  const { error } = await supabase.rpc('increment_email_opened', {
    p_resend_id: emailId,
  });

  if (error) {
    throw new DatabaseError(
      `Failed to increment email opened count: ${error.message}`,
      'resend',
      context.eventId,
      error
    );
  }
}

async function handleEmailClicked(emailId: string, context: TransactionContext): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Use atomic function to prevent race conditions
  const { error } = await supabase.rpc('increment_email_clicked', {
    p_resend_id: emailId,
  });

  if (error) {
    throw new DatabaseError(
      `Failed to increment email clicked count: ${error.message}`,
      'resend',
      context.eventId,
      error
    );
  }
}
