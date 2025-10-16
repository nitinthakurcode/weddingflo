import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const listByCompany = query({
  args: { companyId: v.id('companies'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const query = ctx.db
      .query('activity_log')
      .withIndex('by_company', (q) => q.eq('company_id', args.companyId))
      .order('desc');

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

export const listByClient = query({
  args: { clientId: v.id('clients'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const query = ctx.db
      .query('activity_log')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .order('desc');

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

export const listByUser = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const query = ctx.db
      .query('activity_log')
      .withIndex('by_user', (q) => q.eq('user_id', args.userId))
      .order('desc');

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

export const log = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.optional(v.id('clients')),
    user_id: v.string(),
    action: v.string(),
    entity_type: v.string(),
    entity_id: v.string(),
    changes: v.optional(v.any()),
    previous_value: v.optional(v.any()),
    new_value: v.optional(v.any()),
    ip_address: v.optional(v.string()),
    user_agent: v.optional(v.string()),
    device_type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('activity_log', {
      ...args,
      created_at: Date.now(),
    });
  },
});

/**
 * Create activity log entry (alias for easier use)
 */
export const create = mutation({
  args: {
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.optional(v.any()),
    previousValue: v.optional(v.any()),
    newValue: v.optional(v.any()),
    clientId: v.optional(v.id('clients')),
    userAgent: v.optional(v.string()),
    deviceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get current user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerk_id', identity.subject))
      .first();

    if (!user) throw new Error('User not found');

    return await ctx.db.insert('activity_log', {
      company_id: user.company_id,
      client_id: args.clientId,
      user_id: identity.subject,
      action: args.action,
      entity_type: args.entityType,
      entity_id: args.entityId,
      changes: args.changes,
      previous_value: args.previousValue,
      new_value: args.newValue,
      user_agent: args.userAgent,
      device_type: args.deviceType,
      created_at: Date.now(),
    });
  },
});
