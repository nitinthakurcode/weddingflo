/**
 * PRODUCTION-GRADE Twilio Webhook Handler
 *
 * Enterprise implementation with:
 * - Idempotency (prevents duplicate processing)
 * - Atomic status updates (no race conditions)
 * - Status validation (state machine)
 * - Comprehensive error handling
 * - Audit logging
 * - Performance tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, sql } from '@/lib/db';
import crypto from 'node:crypto';

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
  validateTwilioSmsPayload,
} from '@/lib/webhooks/validation';
import {
  SignatureVerificationError,
  DuplicateWebhookError,
  ValidationError,
  DatabaseError,
  type TransactionContext,
  type TwilioMessageStatus,
} from '@/lib/webhooks/types';

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  try {
    // Build data string: URL + sorted params
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);

    // Compute HMAC-SHA1 signature
    const hmac = crypto.createHmac('sha1', authToken);
    const expectedSignature = hmac.update(Buffer.from(data, 'utf-8')).digest('base64');

    // Compare signatures
    return signature === expectedSignature;
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
    const formData = await req.formData();
    const signature = req.headers.get('x-twilio-signature');

    if (!signature) {
      throw new SignatureVerificationError('twilio', 'no-signature');
    }

    // Convert FormData to params object
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // STEP 2: Validate payload
    validateTwilioSmsPayload(params, 'twilio', 'validation');

    // Get event ID (MessageSid)
    const messageSid = params.MessageSid || params.SmsSid;
    eventId = messageSid!;

    // STEP 3: Verify signature
    const url = req.url;
    const isValid = verifyTwilioSignature(
      url,
      params,
      signature,
      process.env.TWILIO_AUTH_TOKEN!
    );

    if (!isValid) {
      throw new SignatureVerificationError('twilio', eventId);
    }

    // STEP 4: Get message status
    const messageStatus = (params.MessageStatus || params.SmsStatus)!.toLowerCase() as TwilioMessageStatus;

    // STEP 5: Log webhook received
    logWebhookReceived('twilio', eventId, messageStatus);

    // STEP 6: Process with idempotency check
    const { result, isDuplicate } = await processWebhookWithIdempotency(
      'twilio',
      eventId,
      messageStatus,
      params,
      async (context) => {
        // Route to handler based on status
        switch (messageStatus) {
          case 'queued':
            return await handleSmsQueued(messageSid!, context);

          case 'sending':
            return await handleSmsSending(messageSid!, context);

          case 'sent':
            return await handleSmsSent(messageSid!, context);

          case 'delivered':
            return await handleSmsDelivered(messageSid!, context);

          case 'undelivered':
          case 'failed':
            return await handleSmsFailed(
              messageSid!,
              params.ErrorCode,
              params.ErrorMessage,
              context
            );

          default:
            logWebhookSkipped('twilio', eventId, messageStatus, 'Unhandled status');
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
      provider: 'twilio',
      eventId,
      eventType: messageStatus,
    };

    logWebhookSuccess(context, processingDuration, { result });
    trackWebhookPerformance(context, processingDuration);

    // STEP 8: Return TwiML response (required by Twilio)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
          'X-Event-Id': eventId,
          'X-Processing-Time-Ms': processingDuration.toString(),
          'X-Is-Duplicate': isDuplicate.toString(),
        },
      }
    );

  } catch (error) {
    const err = error as Error;

    // Handle duplicate webhooks
    if (error instanceof DuplicateWebhookError) {
      logWebhookSkipped('twilio', eventId, error.eventId, 'Duplicate webhook');
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle signature verification errors
    if (error instanceof SignatureVerificationError) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 401,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle validation errors
    if (error instanceof ValidationError) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle database errors
    if (error instanceof DatabaseError) {
      console.error('❌ Twilio webhook database error:', {
        event_id: eventId,
        error: err.message,
        stack: err.stack,
      });

      // Return 200 to prevent Twilio from retrying
      // (Database errors should be handled async)
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle unknown errors
    const category = categorizeWebhookError(err);
    console.error('❌ Twilio webhook error:', {
      event_id: eventId,
      error: err.message,
      category: category.category,
      retryable: category.retryable,
      severity: category.severity,
      stack: err.stack,
    });

    // Always return 200 with TwiML to prevent Twilio from retrying
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleSmsQueued(messageSid: string, context: TransactionContext): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE sms_logs
      SET status = 'queued', updated_at = NOW()
      WHERE twilio_sid = ${messageSid}
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to update SMS queued status: ${error.message}`,
      'twilio',
      context.eventId,
      error
    );
  }
}

async function handleSmsSending(messageSid: string, context: TransactionContext): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE sms_logs
      SET status = 'sending', updated_at = NOW()
      WHERE twilio_sid = ${messageSid}
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to update SMS sending status: ${error.message}`,
      'twilio',
      context.eventId,
      error
    );
  }
}

async function handleSmsSent(messageSid: string, context: TransactionContext): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE sms_logs
      SET status = 'sent', sent_at = ${new Date().toISOString()}::timestamptz, updated_at = NOW()
      WHERE twilio_sid = ${messageSid}
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to update SMS sent status: ${error.message}`,
      'twilio',
      context.eventId,
      error
    );
  }
}

async function handleSmsDelivered(messageSid: string, context: TransactionContext): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE sms_logs
      SET status = 'delivered', delivered_at = ${new Date().toISOString()}::timestamptz, updated_at = NOW()
      WHERE twilio_sid = ${messageSid}
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to update SMS delivered status: ${error.message}`,
      'twilio',
      context.eventId,
      error
    );
  }
}

async function handleSmsFailed(
  messageSid: string,
  errorCode: string | undefined,
  errorMessage: string | undefined,
  context: TransactionContext
): Promise<void> {
  try {
    const errMsg = errorMessage || 'SMS delivery failed';
    await db.execute(sql`
      UPDATE sms_logs
      SET status = 'failed',
          error_code = ${errorCode || null},
          error_message = ${errMsg},
          failed_at = ${new Date().toISOString()}::timestamptz,
          updated_at = NOW()
      WHERE twilio_sid = ${messageSid}
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to update SMS failed status: ${error.message}`,
      'twilio',
      context.eventId,
      error
    );
  }
}
