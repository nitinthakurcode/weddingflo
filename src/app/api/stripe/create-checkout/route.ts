import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe/stripe-client';
import { STRIPE_CONFIG } from '@/lib/stripe/config';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
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

    // Get company data with auth
    const token = await getToken({ template: 'convex' });
    const company = await fetchQuery(
      api.companies.get,
      { companyId },
      { token: token ?? undefined }
    );
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if customer already exists
    let customerId = company.subscription.stripe_customer_id;

    if (!customerId) {
      // Get user's email from Clerk
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const userEmail = user.emailAddresses[0]?.emailAddress;

      if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          companyId: companyId,
          company_name: company.company_name,
        },
      });
      customerId = customer.id;

      // Update company with customer ID
      const { fetchMutation } = await import('convex/nextjs');
      await fetchMutation(
        api.billing.updateStripeCustomerId,
        {
          companyId,
          stripeCustomerId: customerId,
        },
        { token: token ?? undefined }
      );
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
