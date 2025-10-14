import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Get current subscription for a company
 */
export const getCurrentSubscription = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    return company.subscription;
  },
});

/**
 * Get usage stats for a company
 */
export const getUsageStats = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    // Get actual counts
    const events = await ctx.db
      .query('events')
      .withIndex('by_company', (q) => q.eq('company_id', args.companyId))
      .collect();

    const users = await ctx.db
      .query('users')
      .withIndex('by_company', (q) => q.eq('company_id', args.companyId))
      .collect();

    // Get all clients for this company, then count their guests
    const clients = await ctx.db
      .query('clients')
      .withIndex('by_company', (q) => q.eq('company_id', args.companyId))
      .collect();

    let guestsCount = 0;
    for (const client of clients) {
      const clientGuests = await ctx.db
        .query('guests')
        .withIndex('by_client', (q) => q.eq('client_id', client._id))
        .collect();
      guestsCount += clientGuests.length;
    }

    return {
      eventsCount: events.length,
      guestsCount,
      usersCount: users.length,
      tier: company.subscription.tier,
    };
  },
});

/**
 * Update subscription from Stripe webhook
 */
export const updateSubscriptionFromStripe = mutation({
  args: {
    companyId: v.id('companies'),
    stripeData: v.object({
      stripe_customer_id: v.optional(v.string()),
      stripe_subscription_id: v.optional(v.string()),
      stripe_price_id: v.optional(v.string()),
      tier: v.union(
        v.literal('starter'),
        v.literal('professional'),
        v.literal('enterprise')
      ),
      status: v.union(
        v.literal('active'),
        v.literal('trial'),
        v.literal('past_due'),
        v.literal('canceled'),
        v.literal('incomplete'),
        v.literal('incomplete_expired'),
        v.literal('trialing'),
        v.literal('unpaid')
      ),
      current_period_start: v.optional(v.number()),
      current_period_end: v.optional(v.number()),
      cancel_at_period_end: v.optional(v.boolean()),
      canceled_at: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    // Merge with existing subscription data
    const updatedSubscription = {
      ...company.subscription,
      tier: args.stripeData.tier,
      status: args.stripeData.status,
      stripe_customer_id: args.stripeData.stripe_customer_id,
      stripe_subscription_id: args.stripeData.stripe_subscription_id,
      stripe_price_id: args.stripeData.stripe_price_id,
      current_period_start: args.stripeData.current_period_start,
      current_period_end: args.stripeData.current_period_end,
      cancel_at_period_end: args.stripeData.cancel_at_period_end,
      canceled_at: args.stripeData.canceled_at,
      billing_cycle: 'monthly',
    };

    await ctx.db.patch(args.companyId, {
      subscription: updatedSubscription,
      updated_at: Date.now(),
    });

    return args.companyId;
  },
});

/**
 * Get company by Stripe customer ID
 */
export const getCompanyByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const companies = await ctx.db.query('companies').collect();
    const company = companies.find(
      (c) => c.subscription.stripe_customer_id === args.stripeCustomerId
    );

    return company ?? null;
  },
});

/**
 * Update Stripe customer ID
 */
export const updateStripeCustomerId = mutation({
  args: {
    companyId: v.id('companies'),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    await ctx.db.patch(args.companyId, {
      subscription: {
        ...company.subscription,
        stripe_customer_id: args.stripeCustomerId,
      },
      updated_at: Date.now(),
    });

    return args.companyId;
  },
});
