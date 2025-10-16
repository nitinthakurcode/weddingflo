"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAll = exports.generateUploadUrl = exports.getCurrentUserCompany = exports.updateUsageStats = exports.updateSubscription = exports.updateAIConfig = exports.updateBranding = exports.update = exports.create = exports.getByCustomDomain = exports.getBySubdomain = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
const permissions_1 = require("./permissions");
/**
 * Get a company by ID
 */
exports.get = (0, server_1.query)({
    args: { companyId: values_1.v.id('companies') },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'company:view');
        // Verify user can access this company
        await (0, permissions_1.requireSameCompany)(ctx, args.companyId);
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
        return company;
    },
});
/**
 * Get company by subdomain
 */
exports.getBySubdomain = (0, server_1.query)({
    args: { subdomain: values_1.v.string() },
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
exports.getByCustomDomain = (0, server_1.query)({
    args: { customDomain: values_1.v.string() },
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
exports.create = (0, server_1.mutation)({
    args: {
        company_name: values_1.v.string(),
        subdomain: values_1.v.string(),
        custom_domain: values_1.v.optional(values_1.v.string()),
        branding: values_1.v.object({
            logo_url: values_1.v.optional(values_1.v.string()),
            app_icon_url: values_1.v.optional(values_1.v.string()),
            primary_color: values_1.v.string(),
            secondary_color: values_1.v.string(),
            accent_color: values_1.v.string(),
            text_color: values_1.v.optional(values_1.v.string()),
            font_family: values_1.v.string(),
            custom_css: values_1.v.optional(values_1.v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Check if subdomain is already taken
        const existing = await ctx.db
            .query('companies')
            .withIndex('by_subdomain', (q) => q.eq('subdomain', args.subdomain))
            .first();
        if (existing)
            throw new Error('Subdomain already taken');
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
exports.update = (0, server_1.mutation)({
    args: {
        companyId: values_1.v.id('companies'),
        company_name: values_1.v.optional(values_1.v.string()),
        custom_domain: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'company:edit');
        // Verify user can edit this company
        await (0, permissions_1.requireSameCompany)(ctx, args.companyId);
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
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
exports.updateBranding = (0, server_1.mutation)({
    args: {
        companyId: values_1.v.id('companies'),
        branding: values_1.v.object({
            logo_url: values_1.v.optional(values_1.v.string()),
            app_icon_url: values_1.v.optional(values_1.v.string()),
            primary_color: values_1.v.string(),
            secondary_color: values_1.v.string(),
            accent_color: values_1.v.string(),
            text_color: values_1.v.optional(values_1.v.string()),
            font_family: values_1.v.string(),
            custom_css: values_1.v.optional(values_1.v.string()),
        }),
    },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'company:branding');
        // Verify user can edit this company's branding
        await (0, permissions_1.requireSameCompany)(ctx, args.companyId);
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
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
exports.updateAIConfig = (0, server_1.mutation)({
    args: {
        companyId: values_1.v.id('companies'),
        ai_config: values_1.v.object({
            enabled: values_1.v.boolean(),
            seating_ai_enabled: values_1.v.boolean(),
            budget_predictions_enabled: values_1.v.boolean(),
            auto_timeline_enabled: values_1.v.boolean(),
            email_assistant_enabled: values_1.v.boolean(),
            voice_assistant_enabled: values_1.v.boolean(),
        }),
    },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'company:ai_config');
        // Verify user can edit this company's AI config
        await (0, permissions_1.requireSameCompany)(ctx, args.companyId);
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
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
exports.updateSubscription = (0, server_1.mutation)({
    args: {
        companyId: values_1.v.id('companies'),
        subscription: values_1.v.object({
            tier: values_1.v.union(values_1.v.literal('starter'), values_1.v.literal('professional'), values_1.v.literal('enterprise')),
            status: values_1.v.union(values_1.v.literal('active'), values_1.v.literal('trial'), values_1.v.literal('past_due'), values_1.v.literal('canceled')),
            trial_ends_at: values_1.v.optional(values_1.v.number()),
            billing_cycle: values_1.v.string(),
        }),
    },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'company:billing');
        // Verify user can edit this company's billing
        await (0, permissions_1.requireSameCompany)(ctx, args.companyId);
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
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
exports.updateUsageStats = (0, server_1.mutation)({
    args: {
        companyId: values_1.v.id('companies'),
        usage_stats: values_1.v.object({
            total_weddings: values_1.v.number(),
            active_weddings: values_1.v.number(),
            total_guests: values_1.v.number(),
            storage_used_mb: values_1.v.number(),
            ai_queries_this_month: values_1.v.number(),
        }),
    },
    handler: async (ctx, args) => {
        const company = await ctx.db.get(args.companyId);
        if (!company)
            throw new Error('Company not found');
        await ctx.db.patch(args.companyId, {
            usage_stats: args.usage_stats,
            updated_at: Date.now(),
        });
        return args.companyId;
    },
});
/**
 * Get current user's company
 * Returns null if user is not authenticated or has no company
 */
exports.getCurrentUserCompany = (0, server_1.query)({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            console.log('⚠️ getCurrentUserCompany: No identity');
            return null;
        }
        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerk_id', identity.subject))
            .first();
        if (!user) {
            console.log('⚠️ getCurrentUserCompany: User not found for clerk_id:', identity.subject);
            return null;
        }
        const company = await ctx.db.get(user.company_id);
        if (!company) {
            console.log('⚠️ getCurrentUserCompany: Company not found for company_id:', user.company_id);
            return null;
        }
        // Enrich with logo/icon URLs if they have storage IDs
        let enrichedBranding = company.branding;
        console.log('✅ getCurrentUserCompany: Success', {
            companyId: company._id,
            companyName: company.company_name,
            hasBranding: !!company.branding,
            primaryColor: company.branding?.primary_color
        });
        return {
            ...company,
            branding: enrichedBranding
        };
    },
});
/**
 * Generate upload URL for company logo/icons
 */
exports.generateUploadUrl = (0, server_1.mutation)({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.storage.generateUploadUrl();
    },
});
/**
 * List all companies (Super Admin only)
 */
exports.listAll = (0, server_1.query)({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Get current user to check if super admin
        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerk_id', identity.subject))
            .first();
        if (!user)
            throw new Error('User not found');
        if (user.role !== 'super_admin') {
            throw new Error('Unauthorized: Only super admins can list all companies');
        }
        // Get all companies with usage stats
        const companies = await ctx.db.query('companies').collect();
        // Enrich each company with user count
        const enrichedCompanies = await Promise.all(companies.map(async (company) => {
            const users = await ctx.db
                .query('users')
                .withIndex('by_company', (q) => q.eq('company_id', company._id))
                .collect();
            return {
                ...company,
                usage_stats: {
                    ...company.usage_stats,
                    total_users: users.length,
                },
            };
        }));
        return enrichedCompanies;
    },
});
