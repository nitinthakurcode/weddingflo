"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStripeCustomerId = exports.getCompanyByStripeCustomerId = exports.updateSubscriptionFromStripe = exports.getUsageStats = exports.getCurrentSubscription = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
/**
 * Get current subscription for a company
 */
exports.getCurrentSubscription = (0, server_1.query)({
    args: { companyId: values_1.v.id('companies') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
        return company.subscription;
    },
});
/**
 * Get usage stats for a company
 */
exports.getUsageStats = (0, server_1.query)({
    args: { companyId: values_1.v.id('companies') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
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
exports.updateSubscriptionFromStripe = (0, server_1.mutation)({
    args: {
        companyId: values_1.v.id('companies'),
        stripeData: values_1.v.object({
            stripe_customer_id: values_1.v.optional(values_1.v.string()),
            stripe_subscription_id: values_1.v.optional(values_1.v.string()),
            stripe_price_id: values_1.v.optional(values_1.v.string()),
            tier: values_1.v.union(values_1.v.literal('starter'), values_1.v.literal('professional'), values_1.v.literal('enterprise')),
            status: values_1.v.union(values_1.v.literal('active'), values_1.v.literal('trial'), values_1.v.literal('past_due'), values_1.v.literal('canceled'), values_1.v.literal('incomplete'), values_1.v.literal('incomplete_expired'), values_1.v.literal('trialing'), values_1.v.literal('unpaid'), values_1.v.literal('paused')),
            current_period_start: values_1.v.optional(values_1.v.number()),
            current_period_end: values_1.v.optional(values_1.v.number()),
            cancel_at_period_end: values_1.v.optional(values_1.v.boolean()),
            canceled_at: values_1.v.optional(values_1.v.number()),
        }),
    },
    handler: async (ctx, args) => {
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
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
exports.getCompanyByStripeCustomerId = (0, server_1.query)({
    args: { stripeCustomerId: values_1.v.string() },
    handler: async (ctx, args) => {
        const companies = await ctx.db.query('companies').collect();
        const company = companies.find((c) => c.subscription.stripe_customer_id === args.stripeCustomerId);
        return company ?? null;
    },
});
/**
 * Update Stripe customer ID
 */
exports.updateStripeCustomerId = (0, server_1.mutation)({
    args: {
        companyId: values_1.v.id('companies'),
        stripeCustomerId: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
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
