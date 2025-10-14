"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardUserInternal = exports.onboardUser = exports.updateLastActive = exports.updatePreferences = exports.update = exports.create = exports.listByCompany = exports.getCurrent = exports.getByClerkId = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
/**
 * Get user by ID
 */
exports.get = (0, server_1.query)({
    args: { userId: values_1.v.id('users') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const user = await ctx.db.get(args.userId);
        if (!user)
            throw new Error('User not found');
        return user;
    },
});
/**
 * Get user by Clerk ID
 */
exports.getByClerkId = (0, server_1.query)({
    args: { clerkId: values_1.v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerk_id', args.clerkId))
            .first();
        return user;
    },
});
/**
 * Get current user
 */
exports.getCurrent = (0, server_1.query)({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        // Return null if not authenticated - allows proper loading states
        if (!identity) {
            return null;
        }
        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerk_id', identity.subject))
            .first();
        return user;
    },
});
/**
 * List users by company
 */
exports.listByCompany = (0, server_1.query)({
    args: { companyId: values_1.v.id('companies') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const users = await ctx.db
            .query('users')
            .withIndex('by_company', (q) => q.eq('company_id', args.companyId))
            .collect();
        return users;
    },
});
/**
 * Create a new user
 */
exports.create = (0, server_1.mutation)({
    args: {
        clerk_id: values_1.v.string(),
        email: values_1.v.string(),
        name: values_1.v.string(),
        avatar_url: values_1.v.optional(values_1.v.string()),
        company_id: values_1.v.id('companies'),
        role: values_1.v.union(values_1.v.literal('super_admin'), values_1.v.literal('company_admin'), values_1.v.literal('staff'), values_1.v.literal('client_viewer')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Check if user already exists
        const existing = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerk_id', args.clerk_id))
            .first();
        if (existing)
            throw new Error('User already exists');
        const now = Date.now();
        const userId = await ctx.db.insert('users', {
            clerk_id: args.clerk_id,
            email: args.email,
            name: args.name,
            avatar_url: args.avatar_url,
            company_id: args.company_id,
            role: args.role,
            preferences: {
                theme: 'light',
                notifications_enabled: true,
                email_digest: 'daily',
                language: 'en',
                timezone: 'UTC',
            },
            last_active_at: now,
            created_at: now,
        });
        return userId;
    },
});
/**
 * Update user basic info
 */
exports.update = (0, server_1.mutation)({
    args: {
        userId: values_1.v.id('users'),
        name: values_1.v.optional(values_1.v.string()),
        avatar_url: values_1.v.optional(values_1.v.string()),
        role: values_1.v.optional(values_1.v.union(values_1.v.literal('super_admin'), values_1.v.literal('company_admin'), values_1.v.literal('staff'), values_1.v.literal('client_viewer'))),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const user = await ctx.db.get(args.userId);
        if (!user)
            throw new Error('User not found');
        await ctx.db.patch(args.userId, {
            ...(args.name && { name: args.name }),
            ...(args.avatar_url && { avatar_url: args.avatar_url }),
            ...(args.role && { role: args.role }),
        });
        return args.userId;
    },
});
/**
 * Update user preferences
 */
exports.updatePreferences = (0, server_1.mutation)({
    args: {
        userId: values_1.v.id('users'),
        preferences: values_1.v.object({
            theme: values_1.v.union(values_1.v.literal('light'), values_1.v.literal('dark'), values_1.v.literal('auto')),
            notifications_enabled: values_1.v.boolean(),
            email_digest: values_1.v.union(values_1.v.literal('daily'), values_1.v.literal('weekly'), values_1.v.literal('never')),
            language: values_1.v.string(),
            timezone: values_1.v.string(),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const user = await ctx.db.get(args.userId);
        if (!user)
            throw new Error('User not found');
        await ctx.db.patch(args.userId, {
            preferences: args.preferences,
        });
        return args.userId;
    },
});
/**
 * Update last active timestamp
 */
exports.updateLastActive = (0, server_1.mutation)({
    args: {
        userId: values_1.v.id('users'),
        last_ip: values_1.v.optional(values_1.v.string()),
        device_info: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user)
            throw new Error('User not found');
        await ctx.db.patch(args.userId, {
            last_active_at: Date.now(),
            ...(args.last_ip && { last_ip: args.last_ip }),
            ...(args.device_info && { device_info: args.device_info }),
        });
        return args.userId;
    },
});
/**
 * Onboard a new user - creates company, user, and sample client
 * Called by Clerk webhook when a new user signs up OR from the frontend onboard page
 * NOTE: Does NOT require authentication to allow initial user creation
 */
exports.onboardUser = (0, server_1.mutation)({
    args: {
        clerkId: values_1.v.string(),
        email: values_1.v.string(),
        name: values_1.v.string(),
        avatarUrl: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        console.log('🚀 Starting onboardUser for:', args.email);
        // Check if user already exists
        const existing = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerk_id', args.clerkId))
            .first();
        if (existing) {
            console.log('✅ User already exists:', args.clerkId);
            return existing._id;
        }
        const now = Date.now();
        // Step 1: Create a company for this user
        const companyId = await ctx.db.insert('companies', {
            company_name: `${args.name}'s Company`,
            subdomain: `company-${now}`,
            branding: {
                primary_color: '#9333ea',
                secondary_color: '#7c3aed',
                accent_color: '#a855f7',
                font_family: 'Inter, sans-serif',
            },
            ai_config: {
                enabled: true,
                seating_ai_enabled: true,
                budget_predictions_enabled: true,
                auto_timeline_enabled: true,
                email_assistant_enabled: false,
                voice_assistant_enabled: false,
            },
            subscription: {
                tier: 'starter',
                status: 'trial',
                trial_ends_at: now + (14 * 24 * 60 * 60 * 1000),
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
        // Step 2: Create the user
        const userId = await ctx.db.insert('users', {
            clerk_id: args.clerkId,
            email: args.email,
            name: args.name,
            avatar_url: args.avatarUrl,
            company_id: companyId,
            role: 'company_admin',
            preferences: {
                theme: 'light',
                notifications_enabled: true,
                email_digest: 'daily',
                language: 'en',
                timezone: 'America/New_York',
            },
            last_active_at: now,
            created_at: now,
        });
        // Step 3: Create a sample client for testing
        const weddingDate = new Date();
        weddingDate.setMonth(weddingDate.getMonth() + 6); // 6 months from now
        const clientId = await ctx.db.insert('clients', {
            company_id: companyId,
            clerk_id: args.clerkId,
            client_name: 'Sample Wedding',
            email: args.email,
            wedding_date: weddingDate.getTime(),
            venue: 'Sample Venue',
            planning_stage: 'early_planning',
            ai_insights: {
                completion_percentage: 5,
                risk_factors: [],
                recommendations: ['Start by adding guests to your guest list', 'Set up hotel accommodations for out-of-town guests'],
                budget_health: 'good',
                timeline_status: 'on_track',
            },
            created_at: now,
            updated_at: now,
        });
        console.log('✅ User onboarded:', {
            userId,
            companyId,
            clientId,
            email: args.email,
        });
        return userId;
    },
});
/**
 * Internal mutation for onboarding - doesn't require authentication
 * Used by HTTP actions and webhooks
 */
exports.onboardUserInternal = (0, server_1.internalMutation)({
    args: {
        clerkId: values_1.v.string(),
        email: values_1.v.string(),
        name: values_1.v.string(),
        avatarUrl: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        console.log('🚀 Starting onboardUserInternal for:', args.email);
        // Check if user already exists
        const existing = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerk_id', args.clerkId))
            .first();
        if (existing) {
            console.log('User already exists:', args.clerkId);
            return existing._id;
        }
        const now = Date.now();
        // Step 1: Create a company for this user
        const companyId = await ctx.db.insert('companies', {
            company_name: `${args.name}'s Company`,
            subdomain: `company-${now}`,
            branding: {
                primary_color: '#9333ea',
                secondary_color: '#7c3aed',
                accent_color: '#a855f7',
                font_family: 'Inter, sans-serif',
            },
            ai_config: {
                enabled: true,
                seating_ai_enabled: true,
                budget_predictions_enabled: true,
                auto_timeline_enabled: true,
                email_assistant_enabled: false,
                voice_assistant_enabled: false,
            },
            subscription: {
                tier: 'starter',
                status: 'trial',
                trial_ends_at: now + (14 * 24 * 60 * 60 * 1000),
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
        // Step 2: Create the user
        const userId = await ctx.db.insert('users', {
            clerk_id: args.clerkId,
            email: args.email,
            name: args.name,
            avatar_url: args.avatarUrl,
            company_id: companyId,
            role: 'company_admin',
            preferences: {
                theme: 'light',
                notifications_enabled: true,
                email_digest: 'daily',
                language: 'en',
                timezone: 'America/New_York',
            },
            last_active_at: now,
            created_at: now,
        });
        // Step 3: Create a sample client for testing
        const weddingDate = new Date();
        weddingDate.setMonth(weddingDate.getMonth() + 6); // 6 months from now
        const clientId = await ctx.db.insert('clients', {
            company_id: companyId,
            clerk_id: args.clerkId,
            client_name: 'Sample Wedding',
            email: args.email,
            wedding_date: weddingDate.getTime(),
            venue: 'Sample Venue',
            planning_stage: 'early_planning',
            ai_insights: {
                completion_percentage: 5,
                risk_factors: [],
                recommendations: ['Start by adding guests to your guest list', 'Set up hotel accommodations for out-of-town guests'],
                budget_health: 'good',
                timeline_status: 'on_track',
            },
            created_at: now,
            updated_at: now,
        });
        console.log('✅ User onboarded (internal):', {
            userId,
            companyId,
            clientId,
            email: args.email,
        });
        return userId;
    },
});
