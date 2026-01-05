import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { stripe } from '@/lib/stripe/stripe-client';
import { STRIPE_CONFIG } from '@/lib/stripe/config';
import { db, eq } from '@/lib/db';
import { companies } from '@/lib/db/schema';

export async function POST(req: NextRequest) {
  try {
    const { userId, user } = await getServerSession();
    if (!userId || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { priceId, companyId } = body;

    console.log('🔍 Checkout Request:', { priceId, companyId });

    if (!priceId || !companyId) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId and companyId' },
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

    // Check if customer already exists
    let customerId = company.stripeCustomerId;

    if (!customerId) {
      // Get user's email from session
      const userEmail = user.email;

      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          companyId: companyId,
          company_name: company.name,
        },
      });
      customerId = customer.id;

      // Update company with customer ID using Drizzle
      await db
        .update(companies)
        .set({ stripeCustomerId: customerId })
        .where(eq(companies.id, companyId));
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}${STRIPE_CONFIG.successUrl}`,
      cancel_url: `${req.headers.get('origin')}${STRIPE_CONFIG.cancelUrl}`,
      metadata: {
        companyId,
      },
      subscription_data: {
        metadata: {
          companyId,
        },
      },
    });

    console.log('✅ Checkout session created:', { url: session.url, sessionId: session.id });
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('❌ Error creating checkout session:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
