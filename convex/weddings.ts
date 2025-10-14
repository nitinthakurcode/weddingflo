import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Id } from './_generated/dataModel';

// Get all weddings for a client
export const getByClient = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('weddings')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();
  },
});

// Get a single wedding
export const get = query({
  args: { weddingId: v.id('weddings') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db.get(args.weddingId);
  },
});

// Create a wedding
export const create = mutation({
  args: {
    companyId: v.id('companies'),
    clientId: v.id('clients'),
    weddingName: v.string(),
    weddingDate: v.number(),
    venue: v.optional(v.string()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const now = Date.now();
    return await ctx.db.insert('weddings', {
      company_id: args.companyId,
      client_id: args.clientId,
      wedding_name: args.weddingName,
      wedding_date: args.weddingDate,
      venue: args.venue,
      status: args.status,
      created_at: now,
      updated_at: now,
    });
  },
});

// Update a wedding
export const update = mutation({
  args: {
    weddingId: v.id('weddings'),
    weddingName: v.optional(v.string()),
    weddingDate: v.optional(v.number()),
    venue: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { weddingId, ...updates } = args;
    await ctx.db.patch(weddingId, {
      ...updates,
      updated_at: Date.now(),
    });
    return weddingId;
  },
});

// Delete a wedding
export const remove = mutation({
  args: { weddingId: v.id('weddings') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.delete(args.weddingId);
    return { success: true };
  },
});

// Create a default wedding for a client if they don't have one
export const createDefault = mutation({
  args: {
    clientId: v.id('clients'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Check if client already has a wedding
    const existingWeddings = await ctx.db
      .query('weddings')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();

    if (existingWeddings.length > 0) {
      return existingWeddings[0]._id;
    }

    // Get client details
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error('Client not found');

    // Create default wedding
    const now = Date.now();
    return await ctx.db.insert('weddings', {
      company_id: client.company_id,
      client_id: args.clientId,
      wedding_name: `${client.client_name}'s Wedding`,
      wedding_date: client.wedding_date,
      venue: client.venue,
      status: 'planning',
      created_at: now,
      updated_at: now,
    });
  },
});
