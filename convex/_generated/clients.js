"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlanningStage = exports.updateAIInsights = exports.deleteClient = exports.update = exports.create = exports.search = exports.list = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
const permissions_1 = require("./permissions");
/**
 * Get a client by ID
 */
exports.get = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'clients:view');
        const client = await ctx.db.get(args.clientId);
        if (!client)
            throw new Error('Client not found');
        // Verify client belongs to user's company
        await (0, permissions_1.requireSameCompany)(ctx, client.company_id);
        return client;
    },
});
/**
 * List all clients for a company
 */
exports.list = (0, server_1.query)({
    args: { companyId: values_1.v.id('companies') },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'clients:view');
        // Verify user can access this company's data
        await (0, permissions_1.requireSameCompany)(ctx, args.companyId);
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
exports.search = (0, server_1.query)({
    args: {
        companyId: values_1.v.id('companies'),
        query: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'clients:view');
        // Verify user can access this company's data
        await (0, permissions_1.requireSameCompany)(ctx, args.companyId);
        const results = await ctx.db
            .query('clients')
            .withSearchIndex('search_clients', (q) => q.search('client_name', args.query).eq('company_id', args.companyId))
            .collect();
        return results;
    },
});
/**
 * Create a new client
 */
exports.create = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        clerk_id: values_1.v.string(),
        client_name: values_1.v.string(),
        email: values_1.v.string(),
        phone: values_1.v.optional(values_1.v.string()),
        wedding_date: values_1.v.number(),
        venue: values_1.v.optional(values_1.v.string()),
        venue_coordinates: values_1.v.optional(values_1.v.object({
            lat: values_1.v.number(),
            lng: values_1.v.number(),
        })),
        planning_stage: values_1.v.union(values_1.v.literal('inquiry'), values_1.v.literal('consultation'), values_1.v.literal('early_planning'), values_1.v.literal('mid_planning'), values_1.v.literal('final_details'), values_1.v.literal('week_of'), values_1.v.literal('completed')),
    },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'clients:create');
        // Verify user can create clients for this company
        await (0, permissions_1.requireSameCompany)(ctx, args.company_id);
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
exports.update = (0, server_1.mutation)({
    args: {
        clientId: values_1.v.id('clients'),
        client_name: values_1.v.optional(values_1.v.string()),
        email: values_1.v.optional(values_1.v.string()),
        phone: values_1.v.optional(values_1.v.string()),
        wedding_date: values_1.v.optional(values_1.v.number()),
        venue: values_1.v.optional(values_1.v.string()),
        venue_coordinates: values_1.v.optional(values_1.v.object({
            lat: values_1.v.number(),
            lng: values_1.v.number(),
        })),
    },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'clients:edit');
        const client = await ctx.db.get(args.clientId);
        if (!client)
            throw new Error('Client not found');
        // Verify client belongs to user's company
        await (0, permissions_1.requireSameCompany)(ctx, client.company_id);
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
exports.deleteClient = (0, server_1.mutation)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'clients:delete');
        const client = await ctx.db.get(args.clientId);
        if (!client)
            throw new Error('Client not found');
        // Verify client belongs to user's company
        await (0, permissions_1.requireSameCompany)(ctx, client.company_id);
        await ctx.db.delete(args.clientId);
        return { success: true };
    },
});
/**
 * Update AI insights
 */
exports.updateAIInsights = (0, server_1.mutation)({
    args: {
        clientId: values_1.v.id('clients'),
        ai_insights: values_1.v.object({
            completion_percentage: values_1.v.number(),
            risk_factors: values_1.v.array(values_1.v.string()),
            recommendations: values_1.v.array(values_1.v.string()),
            budget_health: values_1.v.string(),
            timeline_status: values_1.v.string(),
            predicted_completion_date: values_1.v.optional(values_1.v.number()),
        }),
    },
    handler: async (ctx, args) => {
        const client = await ctx.db.get(args.clientId);
        if (!client)
            throw new Error('Client not found');
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
exports.updatePlanningStage = (0, server_1.mutation)({
    args: {
        clientId: values_1.v.id('clients'),
        planning_stage: values_1.v.union(values_1.v.literal('inquiry'), values_1.v.literal('consultation'), values_1.v.literal('early_planning'), values_1.v.literal('mid_planning'), values_1.v.literal('final_details'), values_1.v.literal('week_of'), values_1.v.literal('completed')),
    },
    handler: async (ctx, args) => {
        await (0, permissions_1.requirePermission)(ctx, 'clients:edit');
        const client = await ctx.db.get(args.clientId);
        if (!client)
            throw new Error('Client not found');
        // Verify client belongs to user's company
        await (0, permissions_1.requireSameCompany)(ctx, client.company_id);
        await ctx.db.patch(args.clientId, {
            planning_stage: args.planning_stage,
            updated_at: Date.now(),
        });
        return args.clientId;
    },
});
