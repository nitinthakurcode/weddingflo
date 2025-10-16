import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requirePermission, requireSameCompany } from './permissions';

/**
 * Get a client by ID
 */
export const get = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'clients:view');

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error('Client not found');

    // Verify client belongs to user's company
    await requireSameCompany(ctx, client.company_id);

    return client;
  },
});

/**
 * List all clients for a company
 */
export const list = query({
  args: { companyId: v.id('companies') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'clients:view');

    // Verify user can access this company's data
    await requireSameCompany(ctx, args.companyId);

    const clients = await ctx.db
      .query('clients')
      .withIndex('by_company', (q) => q.eq('company_id', args.companyId))
      .collect();

    return clients;
  },
});

/**
 * Search clients by name
 */
export const search = query({
  args: {
    companyId: v.id('companies'),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'clients:view');

    // Verify user can access this company's data
    await requireSameCompany(ctx, args.companyId);

    const results = await ctx.db
      .query('clients')
      .withSearchIndex('search_clients', (q) =>
        q.search('client_name', args.query).eq('company_id', args.companyId)
      )
      .collect();

    return results;
  },
});

/**
 * Create a new client
 */
export const create = mutation({
  args: {
    company_id: v.id('companies'),
    clerk_id: v.string(),
    client_name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    wedding_date: v.number(),
    venue: v.optional(v.string()),
    venue_coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    planning_stage: v.union(
      v.literal('inquiry'),
      v.literal('consultation'),
      v.literal('early_planning'),
      v.literal('mid_planning'),
      v.literal('final_details'),
      v.literal('week_of'),
      v.literal('completed')
    ),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'clients:create');

    // Verify user can create clients for this company
    await requireSameCompany(ctx, args.company_id);

    const now = Date.now();
    const clientId = await ctx.db.insert('clients', {
      company_id: args.company_id,
      clerk_id: args.clerk_id,
      client_name: args.client_name,
      email: args.email,
      phone: args.phone,
      wedding_date: args.wedding_date,
      venue: args.venue,
      venue_coordinates: args.venue_coordinates,
      planning_stage: args.planning_stage,
      ai_insights: {
        completion_percentage: 0,
        risk_factors: [],
        recommendations: [],
        budget_health: 'good',
        timeline_status: 'on_track',
      },
      created_at: now,
      updated_at: now,
    });

    return clientId;
  },
});

/**
 * Update client basic info
 */
export const update = mutation({
  args: {
    clientId: v.id('clients'),
    client_name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    wedding_date: v.optional(v.number()),
    venue: v.optional(v.string()),
    venue_coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'clients:edit');

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error('Client not found');

    // Verify client belongs to user's company
    await requireSameCompany(ctx, client.company_id);

    await ctx.db.patch(args.clientId, {
      ...(args.client_name && { client_name: args.client_name }),
      ...(args.email && { email: args.email }),
      ...(args.phone !== undefined && { phone: args.phone }),
      ...(args.wedding_date && { wedding_date: args.wedding_date }),
      ...(args.venue !== undefined && { venue: args.venue }),
      ...(args.venue_coordinates !== undefined && { venue_coordinates: args.venue_coordinates }),
      updated_at: Date.now(),
    });

    return args.clientId;
  },
});

/**
 * Delete a client
 */
export const deleteClient = mutation({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'clients:delete');

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error('Client not found');

    // Verify client belongs to user's company
    await requireSameCompany(ctx, client.company_id);

    await ctx.db.delete(args.clientId);
    return { success: true };
  },
});

/**
 * Update AI insights
 */
export const updateAIInsights = mutation({
  args: {
    clientId: v.id('clients'),
    ai_insights: v.object({
      completion_percentage: v.number(),
      risk_factors: v.array(v.string()),
      recommendations: v.array(v.string()),
      budget_health: v.string(),
      timeline_status: v.string(),
      predicted_completion_date: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error('Client not found');

    await ctx.db.patch(args.clientId, {
      ai_insights: args.ai_insights,
      updated_at: Date.now(),
    });

    return args.clientId;
  },
});

/**
 * Update planning stage
 */
export const updatePlanningStage = mutation({
  args: {
    clientId: v.id('clients'),
    planning_stage: v.union(
      v.literal('inquiry'),
      v.literal('consultation'),
      v.literal('early_planning'),
      v.literal('mid_planning'),
      v.literal('final_details'),
      v.literal('week_of'),
      v.literal('completed')
    ),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, 'clients:edit');

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error('Client not found');

    // Verify client belongs to user's company
    await requireSameCompany(ctx, client.company_id);

    await ctx.db.patch(args.clientId, {
      planning_stage: args.planning_stage,
      updated_at: Date.now(),
    });

    return args.clientId;
  },
});
