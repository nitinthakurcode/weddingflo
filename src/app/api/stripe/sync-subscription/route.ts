import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { stripe } from '@/lib/stripe/stripe-client';
import { getPlanByPriceId } from '@/lib/stripe/plans';
import { db, eq } from '@/lib/db';
import { companies } from '@/lib/db/schema';

/**
 * Manual sync endpoint to update subscription from Stripe
 * Useful for development when webhooks can't reach localhost
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
    }

    // Get company data using Drizzle
    const companyResult = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const company = companyResult[0];

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const customerId = company.stripeCustomerId;
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

    // Update company subscription using Drizzle
    await db
      .update(companies)
      .set({
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        subscriptionTier: plan.id as any,
        subscriptionStatus: subscription.status === 'active' ? 'active' : subscription.status as any,
        subscriptionEndsAt: new Date((subscription as any).current_period_end * 1000),
      })
      .where(eq(companies.id, companyId));

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
