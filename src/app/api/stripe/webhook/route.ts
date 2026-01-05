import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe-client';
import { STRIPE_CONFIG } from '@/lib/stripe/config';
import { getPlanByPriceId } from '@/lib/stripe/plans';
import { db, sql, eq } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature found' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`Processing webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId;
  if (!companyId) {
    console.error('No companyId found in session metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('No subscription ID found in session');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanByPriceId(priceId);

  if (!plan) {
    console.error(`Unknown price ID: ${priceId}`);
    return;
  }

  // Update company subscription using Drizzle
  await db
    .update(companies)
    .set({
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      subscriptionTier: plan.id as any,
      subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status as any,
      subscriptionEndsAt: new Date((subscription as any).current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(companies.id, companyId));

  console.log(`Subscription created for company ${companyId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find company by customer ID using Drizzle
  const companyResult = await db
    .select()
    .from(companies)
    .where(eq(companies.stripeCustomerId, subscription.customer as string))
    .limit(1);

  const company = companyResult[0];

  if (!company) {
    console.error('No company found for subscription');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanByPriceId(priceId);

  if (!plan) {
    console.error(`Unknown price ID: ${priceId}`);
    return;
  }

  // Update company subscription using Drizzle
  await db
    .update(companies)
    .set({
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      subscriptionTier: plan.id as any,
      subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status as any,
      subscriptionEndsAt: new Date((subscription as any).current_period_end * 1000),
      updatedAt: new Date(),
    })
    .where(eq(companies.id, company.id));

  console.log(`Subscription updated for company ${company.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Find company by customer ID using Drizzle
  const companyResult = await db
    .select()
    .from(companies)
    .where(eq(companies.stripeCustomerId, subscription.customer as string))
    .limit(1);

  const company = companyResult[0];

  if (!company) {
    console.error('Company not found');
    return;
  }

  // Update subscription status to canceled using Drizzle
  await db
    .update(companies)
    .set({
      subscriptionStatus: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(companies.id, company.id));

  console.log(`Subscription canceled for company ${company.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find company using Drizzle
  const companyResult = await db
    .select()
    .from(companies)
    .where(eq(companies.stripeCustomerId, customerId))
    .limit(1);

  const company = companyResult[0];

  if (!company) {
    console.error('Company not found for invoice payment');
    return;
  }

  console.log(`Payment succeeded for company ${company.id}, amount: ${invoice.amount_paid}`);

  // Here you could:
  // 1. Send a receipt email
  // 2. Log the payment
  // 3. Update payment history
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find company using Drizzle
  const companyResult = await db
    .select()
    .from(companies)
    .where(eq(companies.stripeCustomerId, customerId))
    .limit(1);

  const company = companyResult[0];

  if (!company) {
    console.error('Company not found for failed invoice');
    return;
  }

  console.error(`Payment failed for company ${company.id}`);

  // Here you could:
  // 1. Send alert email to admin
  // 2. Update subscription status
  // 3. Trigger dunning process
}
