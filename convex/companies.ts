import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Get a company by ID
 */
export const get = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    return company;
  },
});

/**
 * Get company by subdomain
 */
export const getBySubdomain = query({
  args: { subdomain: v.string() },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query('companies')
      .withIndex('by_subdomain', (q) => q.eq('subdomain', args.subdomain))
      .first();

    return company;
  },
});

/**
 * Get company by custom domain
 */
export const getByCustomDomain = query({
  args: { customDomain: v.string() },
  handler: async (ctx, args) => {
    const company = await ctx.db
      .query('companies')
      .withIndex('by_custom_domain', (q) => q.eq('custom_domain', args.customDomain))
      .first();

    return company;
  },
});

/**
 * Create a new company
 */
export const create = mutation({
  args: {
    company_name: v.string(),
    subdomain: v.string(),
    custom_domain: v.optional(v.string()),
    branding: v.object({
      logo_url: v.optional(v.string()),
      app_icon_url: v.optional(v.string()),
      primary_color: v.string(),
      secondary_color: v.string(),
      accent_color: v.string(),
      font_family: v.string(),
      custom_css: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Check if subdomain is already taken
    const existing = await ctx.db
      .query('companies')
      .withIndex('by_subdomain', (q) => q.eq('subdomain', args.subdomain))
      .first();

    if (existing) throw new Error('Subdomain already taken');

    const now = Date.now();
    const companyId = await ctx.db.insert('companies', {
      company_name: args.company_name,
      subdomain: args.subdomain,
      custom_domain: args.custom_domain,
      branding: args.branding,
      ai_config: {
        enabled: true,
        seating_ai_enabled: true,
        budget_predictions_enabled: true,
        auto_timeline_enabled: true,
        email_assistant_enabled: true,
        voice_assistant_enabled: false,
      },
      subscription: {
        tier: 'starter',
        status: 'trial',
        trial_ends_at: now + 14 * 24 * 60 * 60 * 1000, // 14 days
        billing_cycle: 'monthly',
      },
      usage_stats: {
        total_weddings: 0,
        active_weddings: 0,
        total_guests: 0,
        storage_used_mb: 0,
        ai_queries_this_month: 0,
      },
      created_at: now,
      updated_at: now,
    });

    return companyId;
  },
});

/**
 * Update company basic info
 */
export const update = mutation({
  args: {
    companyId: v.id('companies'),
    company_name: v.optional(v.string()),
    custom_domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    await ctx.db.patch(args.companyId, {
      ...(args.company_name && { company_name: args.company_name }),
      ...(args.custom_domain && { custom_domain: args.custom_domain }),
      updated_at: Date.now(),
    });

    return args.companyId;
  },
});

/**
 * Update company branding
 */
export const updateBranding = mutation({
  args: {
    companyId: v.id('companies'),
    branding: v.object({
      logo_url: v.optional(v.string()),
      app_icon_url: v.optional(v.string()),
      primary_color: v.string(),
      secondary_color: v.string(),
      accent_color: v.string(),
      font_family: v.string(),
      custom_css: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    await ctx.db.patch(args.companyId, {
      branding: args.branding,
      updated_at: Date.now(),
    });

    return args.companyId;
  },
});

/**
 * Update AI configuration
 */
export const updateAIConfig = mutation({
  args: {
    companyId: v.id('companies'),
    ai_config: v.object({
      enabled: v.boolean(),
      seating_ai_enabled: v.boolean(),
      budget_predictions_enabled: v.boolean(),
      auto_timeline_enabled: v.boolean(),
      email_assistant_enabled: v.boolean(),
      voice_assistant_enabled: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    await ctx.db.patch(args.companyId, {
      ai_config: args.ai_config,
      updated_at: Date.now(),
    });

    return args.companyId;
  },
});

/**
 * Update subscription
 */
export const updateSubscription = mutation({
  args: {
    companyId: v.id('companies'),
    subscription: v.object({
      tier: v.union(
        v.literal('starter'),
        v.literal('professional'),
        v.literal('enterprise')
      ),
      status: v.union(
        v.literal('active'),
        v.literal('trial'),
        v.literal('past_due'),
        v.literal('canceled')
      ),
      trial_ends_at: v.optional(v.number()),
      billing_cycle: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    await ctx.db.patch(args.companyId, {
      subscription: args.subscription,
      updated_at: Date.now(),
    });

    return args.companyId;
  },
});

/**
 * Update usage stats
 */
export const updateUsageStats = mutation({
  args: {
    companyId: v.id('companies'),
    usage_stats: v.object({
      total_weddings: v.number(),
      active_weddings: v.number(),
      total_guests: v.number(),
      storage_used_mb: v.number(),
      ai_queries_this_month: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error('Company not found');

    await ctx.db.patch(args.companyId, {
      usage_stats: args.usage_stats,
      updated_at: Date.now(),
    });

    return args.companyId;
  },
});
