"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCreative = exports.complete = exports.uploadFile = exports.updateProgress = exports.update = exports.create = exports.getByStatus = exports.list = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.get = (0, server_1.query)({
    args: { creativeId: values_1.v.id('creatives') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db.get(args.creativeId);
    },
});
exports.list = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('creatives')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
    },
});
exports.getByStatus = (0, server_1.query)({
    args: {
        clientId: values_1.v.id('clients'),
        status: values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_progress'), values_1.v.literal('review'), values_1.v.literal('approved'), values_1.v.literal('completed')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('creatives')
            .withIndex('by_status', (q) => q.eq('client_id', args.clientId).eq('status', args.status))
            .collect();
    },
});
exports.create = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        creative_name: values_1.v.string(),
        creative_type: values_1.v.string(),
        creative_category: values_1.v.optional(values_1.v.string()),
        num_of_jobs_quantity: values_1.v.number(),
        job_start_date: values_1.v.number(),
        job_end_date: values_1.v.number(),
        assigned_to: values_1.v.optional(values_1.v.string()),
        details: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.update = (0, server_1.mutation)({
    args: {
        creativeId: values_1.v.id('creatives'),
        creative_name: values_1.v.optional(values_1.v.string()),
        assigned_to: values_1.v.optional(values_1.v.string()),
        details: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const { creativeId, ...updates } = args;
        await ctx.db.patch(creativeId, { ...updates, updated_at: Date.now() });
        return creativeId;
    },
});
exports.updateProgress = (0, server_1.mutation)({
    args: {
        creativeId: values_1.v.id('creatives'),
        jobs_completed: values_1.v.number(),
        progress_percentage: values_1.v.number(),
        status: values_1.v.union(values_1.v.literal('pending'), values_1.v.literal('in_progress'), values_1.v.literal('review'), values_1.v.literal('approved'), values_1.v.literal('completed')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.creativeId, {
            jobs_completed: args.jobs_completed,
            progress_percentage: args.progress_percentage,
            status: args.status,
            updated_at: Date.now(),
        });
        return args.creativeId;
    },
});
exports.uploadFile = (0, server_1.mutation)({
    args: {
        creativeId: values_1.v.id('creatives'),
        file_url: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const creative = await ctx.db.get(args.creativeId);
        if (!creative)
            throw new Error('Creative not found');
        await ctx.db.patch(args.creativeId, {
            file_urls: [...creative.file_urls, args.file_url],
            updated_at: Date.now(),
        });
        return args.creativeId;
    },
});
exports.complete = (0, server_1.mutation)({
    args: {
        creativeId: values_1.v.id('creatives'),
        actual_end_date: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const creative = await ctx.db.get(args.creativeId);
        if (!creative)
            throw new Error('Creative not found');
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
exports.deleteCreative = (0, server_1.mutation)({
    args: { creativeId: values_1.v.id('creatives') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.delete(args.creativeId);
        return { success: true };
    },
});
