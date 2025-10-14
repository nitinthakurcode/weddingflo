export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  secretKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,

  // Price IDs from environment
  prices: {
    starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER!,
    professional: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL!,
    enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE!,
  },

  // Checkout URLs
  successUrl: '/settings/billing?success=true',
  cancelUrl: '/settings/billing?canceled=true',

  // Test mode detection
  isTestMode: process.env.STRIPE_SECRET_KEY?.includes('test') ?? true,
} as const;

// Debug logging
if (typeof window === 'undefined') {
  // Server-side only
  console.log('💳 Stripe Config Loaded:', {
    starter: STRIPE_CONFIG.prices.starter?.substring(0, 20),
    professional: STRIPE_CONFIG.prices.professional?.substring(0, 20),
    enterprise: STRIPE_CONFIG.prices.enterprise?.substring(0, 20),
  });
}
