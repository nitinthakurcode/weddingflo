/**
 * Setup Stripe Products and Prices
 *
 * This script creates the subscription products and prices in your Stripe account.
 * Run with: npx tsx scripts/setup-stripe-products.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

async function setupProducts() {
  console.log('🔧 Setting up Stripe products and prices...\n');

  try {
    // 1. Starter Plan
    console.log('Creating Starter Plan...');
    const starterProduct = await stripe.products.create({
      name: 'WeddingFlow Pro - Starter',
      description: 'Perfect for small weddings. Up to 100 guests, 5 events, 2 team members.',
      metadata: {
        tier: 'starter',
      },
    });

    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 2900, // $29.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'starter',
      },
    });

    console.log(`✓ Starter Plan created`);
    console.log(`  Product ID: ${starterProduct.id}`);
    console.log(`  Price ID: ${starterPrice.id}\n`);

    // 2. Professional Plan
    console.log('Creating Professional Plan...');
    const professionalProduct = await stripe.products.create({
      name: 'WeddingFlow Pro - Professional',
      description: 'For medium to large weddings. Up to 1000 guests, unlimited events, 10 team members.',
      metadata: {
        tier: 'professional',
      },
    });

    const professionalPrice = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 9900, // $99.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'professional',
      },
    });

    console.log(`✓ Professional Plan created`);
    console.log(`  Product ID: ${professionalProduct.id}`);
    console.log(`  Price ID: ${professionalPrice.id}\n`);

    // 3. Enterprise Plan
    console.log('Creating Enterprise Plan...');
    const enterpriseProduct = await stripe.products.create({
      name: 'WeddingFlow Pro - Enterprise',
      description: 'For wedding planners and large organizations. Unlimited everything.',
      metadata: {
        tier: 'enterprise',
      },
    });

    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 29900, // $299.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'enterprise',
      },
    });

    console.log(`✓ Enterprise Plan created`);
    console.log(`  Product ID: ${enterpriseProduct.id}`);
    console.log(`  Price ID: ${enterprisePrice.id}\n`);

    // Print the results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ All products created successfully!\n');
    console.log('📝 Add these to your .env.local file:\n');
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_STARTER=${starterPrice.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL=${professionalPrice.id}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE=${enterprisePrice.id}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Error setting up products:', error.message);
    process.exit(1);
  }
}

setupProducts();
