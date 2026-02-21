import Stripe from 'stripe';

// Initialize Stripe with your secret key (Latest API version: January 2026)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
});

// Subscription tiers with multi-currency pricing
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    description: 'Perfect for small wedding planning businesses',
    features: [
      'Up to 5 active weddings',
      'Guest management (up to 500 guests per wedding)',
      'Basic vendor tracking',
      'Budget management',
      'Email support',
      'Mobile app access',
    ],
    prices: {
      USD: { monthly: 29, yearly: 290 },   // $29/mo or $290/yr (save $58)
      EUR: { monthly: 27, yearly: 270 },   // €27/mo
      GBP: { monthly: 23, yearly: 230 },   // £23/mo
      CHF: { monthly: 26, yearly: 260 },   // CHF 26/mo
      JPY: { monthly: 4300, yearly: 43000 }, // ¥4,300/mo
      AUD: { monthly: 44, yearly: 440 },   // A$44/mo
      CAD: { monthly: 39, yearly: 390 },   // C$39/mo
      INR: { monthly: 2400, yearly: 24000 }, // ₹2,400/mo
      CNY: { monthly: 210, yearly: 2100 }, // ¥210/mo
      BRL: { monthly: 145, yearly: 1450 }, // R$145/mo
    },
    limits: {
      maxClients: 5,
      maxStaff: 2,
      maxGuestsPerWedding: 500,
      storageGB: 5,
    },
  },
  professional: {
    name: 'Professional',
    description: 'For growing wedding planning companies',
    features: [
      'Up to 20 active weddings',
      'Advanced guest management (up to 1,500 guests per wedding)',
      'Full vendor suite with contracts',
      'Advanced budget tracking',
      'Real-time chat with clients',
      'Priority email & chat support',
      'Custom branding (logo & colors)',
      'Export reports (PDF/Excel)',
    ],
    prices: {
      USD: { monthly: 79, yearly: 790 },   // $79/mo or $790/yr (save $158)
      EUR: { monthly: 73, yearly: 730 },   // €73/mo
      GBP: { monthly: 62, yearly: 620 },   // £62/mo
      CHF: { monthly: 70, yearly: 700 },   // CHF 70/mo
      JPY: { monthly: 11800, yearly: 118000 }, // ¥11,800/mo
      AUD: { monthly: 120, yearly: 1200 }, // A$120/mo
      CAD: { monthly: 107, yearly: 1070 }, // C$107/mo
      INR: { monthly: 6600, yearly: 66000 }, // ₹6,600/mo
      CNY: { monthly: 570, yearly: 5700 }, // ¥570/mo
      BRL: { monthly: 395, yearly: 3950 }, // R$395/mo
    },
    limits: {
      maxClients: 20,
      maxStaff: 10,
      maxGuestsPerWedding: 1500,
      storageGB: 50,
    },
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For established wedding planning agencies',
    features: [
      'Unlimited weddings',
      'Unlimited guests per wedding',
      'All Professional features',
      'White-label branding (custom domain)',
      'API access',
      'Multi-location support',
      'Dedicated account manager',
      'Phone support',
      'Custom integrations',
      'Priority feature requests',
    ],
    prices: {
      USD: { monthly: 199, yearly: 1990 },  // $199/mo or $1,990/yr (save $398)
      EUR: { monthly: 183, yearly: 1830 },  // €183/mo
      GBP: { monthly: 157, yearly: 1570 },  // £157/mo
      CHF: { monthly: 175, yearly: 1750 },  // CHF 175/mo
      JPY: { monthly: 29800, yearly: 298000 }, // ¥29,800/mo
      AUD: { monthly: 302, yearly: 3020 },  // A$302/mo
      CAD: { monthly: 270, yearly: 2700 },  // C$270/mo
      INR: { monthly: 16600, yearly: 166000 }, // ₹16,600/mo
      CNY: { monthly: 1440, yearly: 14400 }, // ¥1,440/mo
      BRL: { monthly: 995, yearly: 9950 },  // R$995/mo
    },
    limits: {
      maxClients: -1, // unlimited
      maxStaff: -1,   // unlimited
      maxGuestsPerWedding: -1, // unlimited
      storageGB: -1,  // unlimited
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type BillingInterval = 'monthly' | 'yearly';

// Get price for specific tier, currency, and interval
export function getPrice(
  tier: SubscriptionTier,
  currency: string,
  interval: BillingInterval
): number {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const prices = tierConfig.prices[currency as keyof typeof tierConfig.prices];

  if (!prices) {
    // Fallback to USD if currency not supported
    return tierConfig.prices.USD[interval];
  }

  return prices[interval];
}

// Get all features for a tier
export function getTierFeatures(tier: SubscriptionTier): readonly string[] {
  return SUBSCRIPTION_TIERS[tier].features;
}

// Get tier limits
export function getTierLimits(tier: SubscriptionTier) {
  return SUBSCRIPTION_TIERS[tier].limits;
}

// Check if company is within tier limits
export function isWithinLimits(
  tier: SubscriptionTier,
  current: {
    clients: number;
    staff: number;
    guestsInLargestWedding: number;
    storageUsedGB: number;
  }
): { allowed: boolean; exceededLimits: string[] } {
  const limits = getTierLimits(tier);
  const exceeded: string[] = [];

  // Check each limit (-1 means unlimited)
  if (limits.maxClients !== -1 && current.clients > limits.maxClients) {
    exceeded.push(`clients (${current.clients}/${limits.maxClients})`);
  }

  if (limits.maxStaff !== -1 && current.staff > limits.maxStaff) {
    exceeded.push(`staff (${current.staff}/${limits.maxStaff})`);
  }

  if (limits.maxGuestsPerWedding !== -1 && current.guestsInLargestWedding > limits.maxGuestsPerWedding) {
    exceeded.push(`guests per wedding (${current.guestsInLargestWedding}/${limits.maxGuestsPerWedding})`);
  }

  if (limits.storageGB !== -1 && current.storageUsedGB > limits.storageGB) {
    exceeded.push(`storage (${current.storageUsedGB}GB/${limits.storageGB}GB)`);
  }

  return {
    allowed: exceeded.length === 0,
    exceededLimits: exceeded,
  };
}

// Calculate savings for yearly billing
export function getYearlySavings(tier: SubscriptionTier, currency: string): number {
  const monthly = getPrice(tier, currency, 'monthly');
  const yearly = getPrice(tier, currency, 'yearly');
  return (monthly * 12) - yearly;
}

// Get discount percentage for yearly billing
export function getYearlyDiscountPercent(tier: SubscriptionTier, currency: string): number {
  const savings = getYearlySavings(tier, currency);
  const monthlyTotal = getPrice(tier, currency, 'monthly') * 12;
  return Math.round((savings / monthlyTotal) * 100);
}

// Stripe webhook events we handle
export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.trial_will_end',
] as const;

// Map Stripe subscription status to our app status
export function mapStripeStatus(stripeStatus: string): 'active' | 'past_due' | 'canceled' | 'trialing' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    case 'trialing':
      return 'trialing';
    default:
      return 'canceled';
  }
}

/**
 * Legacy STRIPE_CONFIG for backward compatibility
 *
 * Note: This is deprecated. New code should use:
 * - SUBSCRIPTION_TIERS for pricing information
 * - tRPC stripe.createCheckoutSession for checkout
 * - Direct env var access for URLs and secrets
 */
export const STRIPE_CONFIG = {
  // Price IDs from environment variables (for legacy code)
  prices: {
    starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || '',
    professional: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL || '',
    enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE || '',
  },
  // Webhook secret
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  // Checkout URLs
  successUrl: '/dashboard?subscription=success',
  cancelUrl: '/settings/billing?subscription=canceled',
  // Test mode detection
  isTestMode: process.env.STRIPE_SECRET_KEY?.includes('sk_test') || false,
} as const;
