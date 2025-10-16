import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';

/**
 * Get user by ID
 */
export const get = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found');

    return user;
  },
});

/**
 * Get user by Clerk ID
 */
export const getByClerkId = query({
  args: { clerkId: v.string() },
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
export const getCurrent = query({
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
 * Get current user by Clerk ID (for permissions)
 */
export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerk_id', args.clerkId))
      .first();

    return user;
  },
});

/**
 * List users by company
 */
export const listByCompany = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
export const create = mutation({
  args: {
    clerk_id: v.string(),
    email: v.string(),
    name: v.string(),
    avatar_url: v.optional(v.string()),
    company_id: v.id('companies'),
    role: v.union(
      v.literal('super_admin'),
      v.literal('company_admin'),
      v.literal('staff'),
      v.literal('client_viewer')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Check if user already exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerk_id', args.clerk_id))
      .first();

    if (existing) throw new Error('User already exists');

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
export const update = mutation({
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal('super_admin'),
        v.literal('company_admin'),
        v.literal('staff'),
        v.literal('client_viewer')
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found');

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
export const updatePreferences = mutation({
  args: {
    userId: v.id('users'),
    preferences: v.object({
      theme: v.union(v.literal('light'), v.literal('dark'), v.literal('auto')),
      notifications_enabled: v.boolean(),
      email_digest: v.union(v.literal('daily'), v.literal('weekly'), v.literal('never')),
      language: v.string(),
      timezone: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found');

    await ctx.db.patch(args.userId, {
      preferences: args.preferences,
    });

    return args.userId;
  },
});

/**
 * Update last active timestamp
 */
export const updateLastActive = mutation({
  args: {
    userId: v.id('users'),
    last_ip: v.optional(v.string()),
    device_info: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found');

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
export const onboardUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
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
export const onboardUserInternal = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
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


/**
 * Get all team members for current user's company
 */
export const getTeamMembers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerk_id', identity.subject))
      .first();

    if (!currentUser) throw new Error('Current user not found');

    const teamMembers = await ctx.db
      .query('users')
      .withIndex('by_company', (q) => q.eq('company_id', currentUser.company_id))
      .collect();

    return teamMembers;
  },
});

/**
 * Update user role (admin only)
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id('users'),
    role: v.union(
      v.literal('super_admin'),
      v.literal('company_admin'),
      v.literal('staff'),
      v.literal('client_viewer')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerk_id', identity.subject))
      .first();

    if (!currentUser) throw new Error('User not found');

    if (currentUser.role !== 'company_admin' && currentUser.role !== 'super_admin') {
      throw new Error('Unauthorized: Only admins can change roles');
    }

    await ctx.db.patch(args.userId, { role: args.role });

    return args.userId;
  },
});

/**
 * Remove user from team (admin only)
 */
export const removeTeamMember = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerk_id', identity.subject))
      .first();

    if (!currentUser) throw new Error('User not found');

    if (currentUser.role !== 'company_admin' && currentUser.role !== 'super_admin') {
      throw new Error('Unauthorized: Only admins can remove team members');
    }

    const userToRemove = await ctx.db.get(args.userId);
    if (!userToRemove) throw new Error('User to remove not found');

    if (userToRemove._id === currentUser._id) {
      throw new Error('Cannot remove yourself from the team');
    }

    if (userToRemove.company_id !== currentUser.company_id) {
      throw new Error('Unauthorized: User is not in your company');
    }

    await ctx.db.delete(args.userId);

    return { success: true };
  },
});

/**
 * Make user super admin - Internal mutation (no auth required)
 * USE WITH CAUTION: Only for initial setup or emergency access
 */
export const makeSuperAdmin = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { role: 'super_admin' });
    return { success: true };
  },
});

