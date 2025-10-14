import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe-client';
import { STRIPE_CONFIG } from '@/lib/stripe/config';
import { getPlanByPriceId } from '@/lib/stripe/plans';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
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

  // Update company subscription
  await fetchMutation(api.billing.updateSubscriptionFromStripe, {
    companyId: companyId as any,
    stripeData: {
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      tier: plan.id,
      status: subscription.status === 'active' ? 'active' : subscription.status,
      current_period_start: subscription.current_period_start * 1000,
      current_period_end: subscription.current_period_end * 1000,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
  });

  console.log(`Subscription created for company ${companyId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId;
  if (!companyId) {
    // Try to find company by customer ID
    const company = await fetchQuery(api.billing.getCompanyByStripeCustomerId, {
      stripeCustomerId: subscription.customer as string,
    });
    if (!company) {
      console.error('No company found for subscription');
      return;
    }
  }

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanByPriceId(priceId);

  if (!plan) {
    console.error(`Unknown price ID: ${priceId}`);
    return;
  }

  const company = await fetchQuery(api.billing.getCompanyByStripeCustomerId, {
    stripeCustomerId: subscription.customer as string,
  });

  if (!company) {
    console.error('Company not found');
    return;
  }

  // Update company subscription
  await fetchMutation(api.billing.updateSubscriptionFromStripe, {
    companyId: company._id,
    stripeData: {
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      tier: plan.id,
      status: subscription.status === 'active' ? 'active' : subscription.status,
      current_period_start: subscription.current_period_start * 1000,
      current_period_end: subscription.current_period_end * 1000,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
    },
  });

  console.log(`Subscription updated for company ${company._id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const company = await fetchQuery(api.billing.getCompanyByStripeCustomerId, {
    stripeCustomerId: subscription.customer as string,
  });

  if (!company) {
    console.error('Company not found');
    return;
  }

  // Update subscription status to canceled
  await fetchMutation(api.billing.updateSubscriptionFromStripe, {
    companyId: company._id,
    stripeData: {
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      tier: company.subscription.tier,
      status: 'canceled',
      canceled_at: Date.now(),
    },
  });

  console.log(`Subscription canceled for company ${company._id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const company = await fetchQuery(api.billing.getCompanyByStripeCustomerId, {
    stripeCustomerId: customerId,
  });

  if (!company) {
    console.error('Company not found for invoice payment');
    return;
  }

  console.log(`Payment succeeded for company ${company._id}, amount: ${invoice.amount_paid}`);

  // Here you could:
  // 1. Send a receipt email
  // 2. Log the payment
  // 3. Update payment history
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const company = await fetchQuery(api.billing.getCompanyByStripeCustomerId, {
    stripeCustomerId: customerId,
  });

  if (!company) {
    console.error('Company not found for failed invoice');
    return;
  }

  console.error(`Payment failed for company ${company._id}`);

  // Here you could:
  // 1. Send alert email to admin
  // 2. Update subscription status
  // 3. Trigger dunning process
}
