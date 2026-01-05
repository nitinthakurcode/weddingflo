/**
 * PRODUCTION-GRADE Stripe Webhook Handler
 *
 * Enterprise implementation with:
 * - Idempotency (prevents duplicate processing)
 * - Atomic transactions (all-or-nothing database updates)
 * - Status validation (state machine)
 * - Comprehensive error handling
 * - Audit logging
 * - Performance tracking
 */

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/config';
import { db, sql } from '@/lib/db';

// Import professional webhook helpers
import {
  processWebhookWithIdempotency,
  getProcessingDuration,
} from '@/lib/webhooks/idempotency';
import {
  logWebhookReceived,
  logWebhookSuccess,
  logWebhookError,
  logWebhookSkipped,
  trackWebhookPerformance,
  categorizeWebhookError,
} from '@/lib/webhooks/audit';
import {
  validateStripePaymentIntent,
  validateStripeCharge,
  validateStripeSubscription,
  validateStripeMetadata,
} from '@/lib/webhooks/validation';
import {
  SignatureVerificationError,
  DuplicateWebhookError,
  ValidationError,
  DatabaseError,
  type TransactionContext,
} from '@/lib/webhooks/types';

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export async function POST(req: Request) {
  const startTime = Date.now();
  let eventId = 'unknown';

  try {
    // STEP 1: Parse request body and headers
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      throw new SignatureVerificationError('stripe', 'no-signature');
    }

    // STEP 2: Verify Stripe signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      const error = err as Error;
      throw new SignatureVerificationError('stripe', error.message);
    }

    eventId = event.id;

    // STEP 3: Log webhook received
    logWebhookReceived('stripe', eventId, event.type, {
      created: event.created,
      livemode: event.livemode,
    });

    // STEP 4: Process with idempotency check
    const { result, isDuplicate } = await processWebhookWithIdempotency(
      'stripe',
      eventId,
      event.type,
      event as any,
      async (context) => {
        // Route to specific handler based on event type
        switch (event.type) {
          case 'checkout.session.completed':
            return await handleCheckoutCompleted(
              event.data.object as Stripe.Checkout.Session,
              context
            );

          case 'customer.subscription.created':
          case 'customer.subscription.updated':
            return await handleSubscriptionUpdate(
              event.data.object as Stripe.Subscription,
              context
            );

          case 'customer.subscription.deleted':
            return await handleSubscriptionDeleted(
              event.data.object as Stripe.Subscription,
              context
            );

          case 'invoice.paid':
            return await handleInvoicePaid(
              event.data.object as Stripe.Invoice,
              context
            );

          case 'invoice.payment_failed':
            return await handlePaymentFailed(
              event.data.object as Stripe.Invoice,
              context
            );

          case 'customer.subscription.trial_will_end':
            return await handleTrialWillEnd(
              event.data.object as Stripe.Subscription,
              context
            );

          case 'payment_intent.succeeded':
            return await handlePaymentIntentSucceeded(
              event.data.object as Stripe.PaymentIntent,
              context
            );

          case 'payment_intent.payment_failed':
            return await handlePaymentIntentFailed(
              event.data.object as Stripe.PaymentIntent,
              context
            );

          case 'charge.refunded':
            return await handleChargeRefunded(
              event.data.object as Stripe.Charge,
              context
            );

          case 'account.updated':
            return await handleAccountUpdated(
              event.data.object as Stripe.Account,
              context
            );

          default:
            logWebhookSkipped('stripe', eventId, event.type, 'Unhandled event type');
            return { skipped: true };
        }
      },
      Object.fromEntries(headersList.entries()),
      req.headers.get('x-forwarded-for'),
      req.headers.get('user-agent')
    );

    // STEP 5: Log success and track performance
    const processingDuration = Date.now() - startTime;
    const context: TransactionContext = {
      webhookId: 'completed',
      startTime,
      provider: 'stripe',
      eventId,
      eventType: event.type,
    };

    logWebhookSuccess(context, processingDuration, { result });
    trackWebhookPerformance(context, processingDuration);

    // STEP 6: Return 200 OK
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

    // Handle duplicate webhooks (already processed - this is OK)
    if (error instanceof DuplicateWebhookError) {
      logWebhookSkipped('stripe', eventId, error.eventId, 'Duplicate webhook (already processed)');
      return NextResponse.json({
        received: true,
        status: 'already_processed',
        event_id: eventId,
      });
    }

    // Handle signature verification errors
    if (error instanceof SignatureVerificationError) {
      return NextResponse.json(
        {
          error: 'Invalid signature',
          event_id: eventId,
        },
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
      const context: TransactionContext = {
        webhookId: 'error',
        startTime,
        provider: 'stripe',
        eventId,
        eventType: 'error',
      };
      logWebhookError(context, err, processingDuration);

      return NextResponse.json(
        {
          error: 'Database error',
          event_id: eventId,
          message: 'Temporary error - will retry',
        },
        { status: 503 } // Service Unavailable - Stripe will retry
      );
    }

    // Handle unknown errors
    const category = categorizeWebhookError(err);
    console.error('❌ Stripe webhook error:', {
      event_id: eventId,
      error: err.message,
      category: category.category,
      retryable: category.retryable,
      severity: category.severity,
      stack: err.stack,
    });

    // Return appropriate status code based on retryability
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
// EVENT HANDLERS - Subscription Management
// ============================================================================

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  context: TransactionContext
): Promise<void> {
  // Validate metadata
  validateStripeMetadata(
    session.metadata,
    ['companyId', 'tier'],
    'stripe',
    context.eventId
  );

  const companyId = session.metadata!.companyId;
  const tier = session.metadata!.tier;
  const subscriptionId = session.subscription as string;

  try {
    // Use atomic database function via raw SQL
    await db.execute(sql`
      SELECT update_company_subscription(
        ${companyId},
        ${tier},
        'active',
        ${subscriptionId}
      )
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to update company subscription: ${error.message}`,
      'stripe',
      context.eventId,
      error
    );
  }
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  context: TransactionContext
): Promise<void> {
  validateStripeSubscription(subscription, 'stripe', context.eventId);
  validateStripeMetadata(
    subscription.metadata,
    ['companyId'],
    'stripe',
    context.eventId
  );

  const companyId = subscription.metadata!.companyId;
  const tier = subscription.metadata?.tier || 'starter';

  try {
    await db.execute(sql`
      SELECT update_company_subscription(
        ${companyId},
        ${tier},
        ${subscription.status},
        ${subscription.id}
      )
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to update subscription: ${error.message}`,
      'stripe',
      context.eventId,
      error
    );
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  context: TransactionContext
): Promise<void> {
  validateStripeSubscription(subscription, 'stripe', context.eventId);
  validateStripeMetadata(
    subscription.metadata,
    ['companyId'],
    'stripe',
    context.eventId
  );

  const companyId = subscription.metadata!.companyId;

  try {
    await db.execute(sql`
      SELECT update_company_subscription(
        ${companyId},
        'starter',
        'canceled',
        NULL
      )
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to cancel subscription: ${error.message}`,
      'stripe',
      context.eventId,
      error
    );
  }
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  context: TransactionContext
): Promise<void> {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  // Log successful payment (could send receipt email here)
  console.log(`✅ Invoice paid: ${invoice.id} - Amount: ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()}`);
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  context: TransactionContext
): Promise<void> {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  validateStripeMetadata(
    subscription.metadata,
    ['companyId'],
    'stripe',
    context.eventId
  );

  const companyId = subscription.metadata!.companyId;

  try {
    await db.execute(sql`
      SELECT update_company_subscription(
        ${companyId},
        ${subscription.metadata?.tier || 'starter'},
        'past_due',
        ${subscription.id}
      )
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to mark payment as past_due: ${error.message}`,
      'stripe',
      context.eventId,
      error
    );
  }

  // TODO: Send payment failure email
}

async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  context: TransactionContext
): Promise<void> {
  validateStripeMetadata(
    subscription.metadata,
    ['companyId'],
    'stripe',
    context.eventId
  );

  const companyId = subscription.metadata!.companyId;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : 'unknown';

  console.log(`⏰ Trial ending soon for company ${companyId} - Ends: ${trialEnd}`);

  // TODO: Send trial ending email
}

// ============================================================================
// EVENT HANDLERS - Payment Processing
// ============================================================================

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  context: TransactionContext
): Promise<void> {
  validateStripePaymentIntent(paymentIntent, 'stripe', context.eventId);

  try {
    // Use atomic database function via raw SQL
    await db.execute(sql`
      SELECT update_payment_from_webhook(
        ${paymentIntent.id},
        'paid',
        NULL,
        NULL,
        ${new Date().toISOString()}::timestamptz
      )
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to update payment status: ${error.message}`,
      'stripe',
      context.eventId,
      error
    );
  }
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  context: TransactionContext
): Promise<void> {
  validateStripePaymentIntent(paymentIntent, 'stripe', context.eventId);

  const failureMessage = paymentIntent.last_payment_error?.message || 'Unknown error';
  const errorCode = paymentIntent.last_payment_error?.code || null;

  try {
    await db.execute(sql`
      SELECT update_payment_from_webhook(
        ${paymentIntent.id},
        'canceled',
        ${failureMessage},
        ${errorCode},
        NULL
      )
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to mark payment as failed: ${error.message}`,
      'stripe',
      context.eventId,
      error
    );
  }
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
  context: TransactionContext
): Promise<void> {
  validateStripeCharge(charge, 'stripe', context.eventId);

  const refund = charge.refunds?.data[0];
  const refundId = refund?.id || null;
  const refundAmount = refund?.amount || 0;

  try {
    // Use atomic transaction function via raw SQL
    await db.execute(sql`
      SELECT process_refund_webhook(
        ${charge.id},
        ${refundId || ''},
        ${refundAmount}
      )
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to process refund: ${error.message}`,
      'stripe',
      context.eventId,
      error
    );
  }
}

async function handleAccountUpdated(
  account: Stripe.Account,
  context: TransactionContext
): Promise<void> {
  try {
    const currentlyDue = JSON.stringify(account.requirements?.currently_due || []);
    const eventuallyDue = JSON.stringify(account.requirements?.eventually_due || []);
    const disabledReason = account.requirements?.disabled_reason || null;

    await db.execute(sql`
      SELECT update_stripe_account_from_webhook(
        ${account.id},
        ${account.charges_enabled},
        ${account.payouts_enabled},
        ${account.details_submitted},
        ${currentlyDue}::jsonb,
        ${eventuallyDue}::jsonb,
        ${disabledReason}
      )
    `);
  } catch (error: any) {
    throw new DatabaseError(
      `Failed to update Stripe account: ${error.message}`,
      'stripe',
      context.eventId,
      error
    );
  }
}
