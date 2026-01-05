import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { stripe } from '@/lib/stripe/stripe-client';
import { db, eq } from '@/lib/db';
import { companies } from '@/lib/db/schema';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { companyId, newPriceId } = body;

    if (!companyId || !newPriceId) {
      return NextResponse.json(
        { error: 'Missing required fields: companyId and newPriceId' },
        { status: 400 }
      );
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

    const subscriptionId = company.stripeSubscriptionId;
    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'always_invoice',
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
