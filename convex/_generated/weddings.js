"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefault = exports.remove = exports.update = exports.create = exports.get = exports.getByClient = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
// Get all weddings for a client
exports.getByClient = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('weddings')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
    },
});
// Get a single wedding
exports.get = (0, server_1.query)({
    args: { weddingId: values_1.v.id('weddings') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db.get(args.weddingId);
    },
});
// Create a wedding
exports.create = (0, server_1.mutation)({
    args: {
        companyId: values_1.v.id('companies'),
        clientId: values_1.v.id('clients'),
        weddingName: values_1.v.string(),
        weddingDate: values_1.v.number(),
        venue: values_1.v.optional(values_1.v.string()),
        status: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.update = (0, server_1.mutation)({
    args: {
        weddingId: values_1.v.id('weddings'),
        weddingName: values_1.v.optional(values_1.v.string()),
        weddingDate: values_1.v.optional(values_1.v.number()),
        venue: values_1.v.optional(values_1.v.string()),
        status: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const { weddingId, ...updates } = args;
        await ctx.db.patch(weddingId, {
            ...updates,
            updated_at: Date.now(),
        });
        return weddingId;
    },
});
// Delete a wedding
exports.remove = (0, server_1.mutation)({
    args: { weddingId: values_1.v.id('weddings') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.delete(args.weddingId);
        return { success: true };
    },
});
// Create a default wedding for a client if they don't have one
exports.createDefault = (0, server_1.mutation)({
    args: {
        clientId: values_1.v.id('clients'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
        if (!client)
            throw new Error('Client not found');
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
