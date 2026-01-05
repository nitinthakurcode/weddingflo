import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc';
import { stripe, SUBSCRIPTION_TIERS, getPrice, type SubscriptionTier } from '@/lib/stripe/config';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export const stripeRouter = router({
  // Create checkout session for subscription
  createCheckoutSession: adminProcedure
    .input(z.object({
      tier: z.enum(['starter', 'professional', 'enterprise']),
      interval: z.enum(['monthly', 'yearly']),
      currency: z.enum(['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'AUD', 'CAD', 'INR', 'CNY', 'BRL']),
      successUrl: z.string(),
      cancelUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      // Get company
      const [company] = await ctx.db
        .select({
          id: schema.companies.id,
          name: schema.companies.name,
          stripeCustomerId: schema.companies.stripeCustomerId
        })
        .from(schema.companies)
        .where(eq(schema.companies.id, ctx.companyId))
        .limit(1);

      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      let customerId = company.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: company.name,
          metadata: {
            companyId: company.id,
          },
        });

        customerId = customer.id;

        // Update company with customer ID
        await ctx.db
          .update(schema.companies)
          .set({ stripeCustomerId: customerId })
          .where(eq(schema.companies.id, company.id));
      }

      // Get price for this tier and currency
      const priceAmount = getPrice(input.tier, input.currency, input.interval);

      // Get or create Stripe Price ID
      const priceId = await getOrCreateStripePrice(
        input.tier,
        input.currency,
        input.interval,
        priceAmount
      );

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        currency: input.currency.toLowerCase(),
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          companyId: company.id,
          tier: input.tier,
        },
        subscription_data: {
          metadata: {
            companyId: company.id,
            tier: input.tier,
          },
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  // Get current subscription
  getSubscription: adminProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const [company] = await ctx.db
        .select({
          stripeCustomerId: schema.companies.stripeCustomerId,
          stripeSubscriptionId: schema.companies.stripeSubscriptionId,
          subscriptionTier: schema.companies.subscriptionTier,
          subscriptionStatus: schema.companies.subscriptionStatus,
        })
        .from(schema.companies)
        .where(eq(schema.companies.id, ctx.companyId))
        .limit(1);

      if (!company?.stripeSubscriptionId) {
        return null;
      }

      try {
        const subscription = await stripe.subscriptions.retrieve(
          company.stripeSubscriptionId
        );

        return {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: (subscription as any).current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          plan: company.subscriptionTier,
          currency: subscription.currency.toUpperCase(),
          interval: subscription.items.data[0]?.plan?.interval || 'month',
        };
      } catch (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }
    }),

  // Create billing portal session
  createBillingPortalSession: adminProcedure
    .input(z.object({
      returnUrl: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const [company] = await ctx.db
        .select({ stripeCustomerId: schema.companies.stripeCustomerId })
        .from(schema.companies)
        .where(eq(schema.companies.id, ctx.companyId))
        .limit(1);

      if (!company?.stripeCustomerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No active subscription'
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: company.stripeCustomerId,
        return_url: input.returnUrl,
      });

      return {
        url: session.url,
      };
    }),

  // Cancel subscription at period end
  cancelSubscription: adminProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const [company] = await ctx.db
        .select({ stripeSubscriptionId: schema.companies.stripeSubscriptionId })
        .from(schema.companies)
        .where(eq(schema.companies.id, ctx.companyId))
        .limit(1);

      if (!company?.stripeSubscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No active subscription'
        });
      }

      // Cancel at period end (don't cancel immediately)
      const subscription = await stripe.subscriptions.update(
        company.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      return {
        success: true,
        cancelAt: subscription.cancel_at,
      };
    }),

  // Reactivate cancelled subscription
  reactivateSubscription: adminProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const [company] = await ctx.db
        .select({ stripeSubscriptionId: schema.companies.stripeSubscriptionId })
        .from(schema.companies)
        .where(eq(schema.companies.id, ctx.companyId))
        .limit(1);

      if (!company?.stripeSubscriptionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No active subscription'
        });
      }

      const subscription = await stripe.subscriptions.update(
        company.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        }
      );

      return {
        success: true,
      };
    }),

  // Get pricing for all tiers (for pricing page)
  getPricing: protectedProcedure
    .input(z.object({
      currency: z.string(),
    }))
    .query(async ({ input }) => {
      return {
        starter: {
          name: SUBSCRIPTION_TIERS.starter.name,
          description: SUBSCRIPTION_TIERS.starter.description,
          features: SUBSCRIPTION_TIERS.starter.features,
          monthlyPrice: getPrice('starter', input.currency, 'monthly'),
          yearlyPrice: getPrice('starter', input.currency, 'yearly'),
          limits: SUBSCRIPTION_TIERS.starter.limits,
        },
        professional: {
          name: SUBSCRIPTION_TIERS.professional.name,
          description: SUBSCRIPTION_TIERS.professional.description,
          features: SUBSCRIPTION_TIERS.professional.features,
          monthlyPrice: getPrice('professional', input.currency, 'monthly'),
          yearlyPrice: getPrice('professional', input.currency, 'yearly'),
          limits: SUBSCRIPTION_TIERS.professional.limits,
        },
        enterprise: {
          name: SUBSCRIPTION_TIERS.enterprise.name,
          description: SUBSCRIPTION_TIERS.enterprise.description,
          features: SUBSCRIPTION_TIERS.enterprise.features,
          monthlyPrice: getPrice('enterprise', input.currency, 'monthly'),
          yearlyPrice: getPrice('enterprise', input.currency, 'yearly'),
          limits: SUBSCRIPTION_TIERS.enterprise.limits,
        },
      };
    }),
});

// Helper: Get or create Stripe Price
// This function creates Price IDs in Stripe on-demand
// In production, you might want to pre-create these and store the IDs
async function getOrCreateStripePrice(
  tier: SubscriptionTier,
  currency: string,
  interval: 'monthly' | 'yearly',
  amount: number
): Promise<string> {
  const productName = `WeddingFlo - ${SUBSCRIPTION_TIERS[tier].name}`;
  const intervalValue = interval === 'monthly' ? 'month' : 'year';

  try {
    // Search for existing price
    const prices = await stripe.prices.list({
      currency: currency.toLowerCase(),
      active: true,
      type: 'recurring',
      limit: 100,
    });

    const existingPrice = prices.data.find(
      (price) =>
        price.unit_amount === Math.round(amount * 100) &&
        price.recurring?.interval === intervalValue &&
        price.metadata?.tier === tier
    );

    if (existingPrice) {
      return existingPrice.id;
    }

    // Create new product and price
    const product = await stripe.products.create({
      name: productName,
      description: SUBSCRIPTION_TIERS[tier].description,
      metadata: {
        tier,
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      currency: currency.toLowerCase(),
      unit_amount: Math.round(amount * 100), // Convert to cents
      recurring: {
        interval: intervalValue,
      },
      metadata: {
        tier,
        interval,
      },
    });

    return price.id;
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create Stripe price',
    });
  }
}
