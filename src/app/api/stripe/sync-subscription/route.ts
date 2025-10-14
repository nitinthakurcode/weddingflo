import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe/stripe-client';
import { getPlanByPriceId } from '@/lib/stripe/plans';
import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

/**
 * Manual sync endpoint to update subscription from Stripe
 * Useful for development when webhooks can't reach localhost
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
    }

    // Get company data
    const token = await getToken({ template: 'convex' });
    const company = await fetchQuery(
      api.companies.get,
      { companyId },
      { token: token ?? undefined }
    );

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const customerId = company.subscription.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json({ error: 'No Stripe customer ID found' }, { status: 400 });
    }

    console.log('🔄 Syncing subscription for customer:', customerId);

    // Get all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'No subscription found for customer' }, { status: 404 });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;
    const plan = getPlanByPriceId(priceId);

    if (!plan) {
      console.error('Unknown price ID:', priceId);
      return NextResponse.json({ error: `Unknown price ID: ${priceId}` }, { status: 400 });
    }

    console.log('📦 Found subscription:', {
      subscriptionId: subscription.id,
      priceId,
      tier: plan.id,
      status: subscription.status,
    });

    // Update company subscription in Convex
    await fetchMutation(
      api.billing.updateSubscriptionFromStripe,
      {
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
          canceled_at: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
        },
      },
      { token: token ?? undefined }
    );

    console.log('✅ Subscription synced successfully');

    return NextResponse.json({
      success: true,
      subscription: {
        tier: plan.id,
        status: subscription.status,
        priceId,
      },
    });
  } catch (error: any) {
    console.error('❌ Error syncing subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}
