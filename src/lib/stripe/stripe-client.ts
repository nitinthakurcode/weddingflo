import Stripe from 'stripe';

// Lazy initialization - client created on first use (not at build time)
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Intentionally pinned to the account's API version; the SDK type tracks its
      // own newer default, so cast to keep the pin while staying type-safe.
      apiVersion: '2026-04-22.dahlia' as NonNullable<ConstructorParameters<typeof Stripe>[1]>['apiVersion'],
      typescript: true,
    });
  }
  return stripeClient;
}

// Legacy export for backward compatibility
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as any)[prop];
  }
});
