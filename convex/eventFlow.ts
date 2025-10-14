import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const get = query({
  args: { eventFlowId: v.id('event_flow') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db.get(args.eventFlowId);
  },
});

export const list = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('event_flow')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .order('asc')
      .collect();
  },
});

export const getByDate = query({
  args: { clientId: v.id('clients'), date: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('event_flow')
      .withIndex('by_date_order', (q) => q.eq('client_id', args.clientId).eq('date', args.date))
      .order('asc')
      .collect();
  },
});

export const create = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    event_id: v.optional(v.id('event_brief')),
    date: v.number(),
    activity: v.string(),
    activity_type: v.string(),
    activity_description: v.optional(v.string()),
    start_time: v.string(),
    duration_minutes: v.number(),
    end_time: v.string(),
    buffer_minutes: v.optional(v.number()),
    event: v.string(),
    location: v.string(),
    manager: v.string(),
    responsible_vendor: v.optional(v.id('vendors')),
    order: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const now = Date.now();
    return await ctx.db.insert('event_flow', {
      ...args,
      depends_on: [],
      blocks: [],
      ai_optimized: false,
      ai_conflict_detected: false,
      ai_suggestions: [],
      status: 'planned',
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    eventFlowId: v.id('event_flow'),
    activity: v.optional(v.string()),
    start_time: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    end_time: v.optional(v.string()),
    location: v.optional(v.string()),
    manager: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { eventFlowId, ...updates } = args;
    await ctx.db.patch(eventFlowId, { ...updates, updated_at: Date.now() });
    return eventFlowId;
  },
});

export const reorder = mutation({
  args: {
    eventFlowId: v.id('event_flow'),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.eventFlowId, {
      order: args.newOrder,
      updated_at: Date.now(),
    });
    return args.eventFlowId;
  },
});

export const updateStatus = mutation({
  args: {
    eventFlowId: v.id('event_flow'),
    status: v.union(
      v.literal('planned'),
      v.literal('confirmed'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('delayed')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.eventFlowId, {
      status: args.status,
      updated_at: Date.now(),
    });
    return args.eventFlowId;
  },
});

export const linkDependencies = mutation({
  args: {
    eventFlowId: v.id('event_flow'),
    depends_on: v.array(v.id('event_flow')),
    blocks: v.array(v.id('event_flow')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.eventFlowId, {
      depends_on: args.depends_on,
      blocks: args.blocks,
      updated_at: Date.now(),
    });
    return args.eventFlowId;
  },
});

export const deleteEventFlow = mutation({
  args: { eventFlowId: v.id('event_flow') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    await ctx.db.delete(args.eventFlowId);
    return { success: true };
  },
});
