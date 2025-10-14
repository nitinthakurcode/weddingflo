import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const get = query({
  args: { creativeId: v.id('creatives') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db.get(args.creativeId);
  },
});

export const list = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('creatives')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();
  },
});

export const getByStatus = query({
  args: {
    clientId: v.id('clients'),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('review'),
      v.literal('approved'),
      v.literal('completed')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.db
      .query('creatives')
      .withIndex('by_status', (q) => q.eq('client_id', args.clientId).eq('status', args.status))
      .collect();
  },
});

export const create = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    creative_name: v.string(),
    creative_type: v.string(),
    creative_category: v.optional(v.string()),
    num_of_jobs_quantity: v.number(),
    job_start_date: v.number(),
    job_end_date: v.number(),
    assigned_to: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const now = Date.now();
    return await ctx.db.insert('creatives', {
      ...args,
      jobs_completed: 0,
      status: 'pending',
      progress_percentage: 0,
      file_urls: [],
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    creativeId: v.id('creatives'),
    creative_name: v.optional(v.string()),
    assigned_to: v.optional(v.string()),
    details: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { creativeId, ...updates } = args;
    await ctx.db.patch(creativeId, { ...updates, updated_at: Date.now() });
    return creativeId;
  },
});

export const updateProgress = mutation({
  args: {
    creativeId: v.id('creatives'),
    jobs_completed: v.number(),
    progress_percentage: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('review'),
      v.literal('approved'),
      v.literal('completed')
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.creativeId, {
      jobs_completed: args.jobs_completed,
      progress_percentage: args.progress_percentage,
      status: args.status,
      updated_at: Date.now(),
    });
    return args.creativeId;
  },
});

export const uploadFile = mutation({
  args: {
    creativeId: v.id('creatives'),
    file_url: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const creative = await ctx.db.get(args.creativeId);
    if (!creative) throw new Error('Creative not found');

    await ctx.db.patch(args.creativeId, {
      file_urls: [...creative.file_urls, args.file_url],
      updated_at: Date.now(),
    });
    return args.creativeId;
  },
});

export const complete = mutation({
  args: {
    creativeId: v.id('creatives'),
    actual_end_date: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const creative = await ctx.db.get(args.creativeId);
    if (!creative) throw new Error('Creative not found');

    await ctx.db.patch(args.creativeId, {
      status: 'completed',
      progress_percentage: 100,
      jobs_completed: creative.num_of_jobs_quantity,
      actual_end_date: args.actual_end_date,
      updated_at: Date.now(),
    });
    return args.creativeId;
  },
});

export const deleteCreative = mutation({
  args: { creativeId: v.id('creatives') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    await ctx.db.delete(args.creativeId);
    return { success: true };
  },
});
