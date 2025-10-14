"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEventFlow = exports.linkDependencies = exports.updateStatus = exports.reorder = exports.update = exports.create = exports.getByDate = exports.list = exports.get = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.get = (0, server_1.query)({
    args: { eventFlowId: values_1.v.id('event_flow') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db.get(args.eventFlowId);
    },
});
exports.list = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('event_flow')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .order('asc')
            .collect();
    },
});
exports.getByDate = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients'), date: values_1.v.number() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('event_flow')
            .withIndex('by_date_order', (q) => q.eq('client_id', args.clientId).eq('date', args.date))
            .order('asc')
            .collect();
    },
});
exports.create = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        event_id: values_1.v.optional(values_1.v.id('event_brief')),
        date: values_1.v.number(),
        activity: values_1.v.string(),
        activity_type: values_1.v.string(),
        activity_description: values_1.v.optional(values_1.v.string()),
        start_time: values_1.v.string(),
        duration_minutes: values_1.v.number(),
        end_time: values_1.v.string(),
        buffer_minutes: values_1.v.optional(values_1.v.number()),
        event: values_1.v.string(),
        location: values_1.v.string(),
        manager: values_1.v.string(),
        responsible_vendor: values_1.v.optional(values_1.v.id('vendors')),
        order: values_1.v.number(),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.update = (0, server_1.mutation)({
    args: {
        eventFlowId: values_1.v.id('event_flow'),
        activity: values_1.v.optional(values_1.v.string()),
        start_time: values_1.v.optional(values_1.v.string()),
        duration_minutes: values_1.v.optional(values_1.v.number()),
        end_time: values_1.v.optional(values_1.v.string()),
        location: values_1.v.optional(values_1.v.string()),
        manager: values_1.v.optional(values_1.v.string()),
        notes: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const { eventFlowId, ...updates } = args;
        await ctx.db.patch(eventFlowId, { ...updates, updated_at: Date.now() });
        return eventFlowId;
    },
});
exports.reorder = (0, server_1.mutation)({
    args: {
        eventFlowId: values_1.v.id('event_flow'),
        newOrder: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.eventFlowId, {
            order: args.newOrder,
            updated_at: Date.now(),
        });
        return args.eventFlowId;
    },
});
exports.updateStatus = (0, server_1.mutation)({
    args: {
        eventFlowId: values_1.v.id('event_flow'),
        status: values_1.v.union(values_1.v.literal('planned'), values_1.v.literal('confirmed'), values_1.v.literal('in_progress'), values_1.v.literal('completed'), values_1.v.literal('delayed')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.eventFlowId, {
            status: args.status,
            updated_at: Date.now(),
        });
        return args.eventFlowId;
    },
});
exports.linkDependencies = (0, server_1.mutation)({
    args: {
        eventFlowId: values_1.v.id('event_flow'),
        depends_on: values_1.v.array(values_1.v.id('event_flow')),
        blocks: values_1.v.array(values_1.v.id('event_flow')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.eventFlowId, {
            depends_on: args.depends_on,
            blocks: args.blocks,
            updated_at: Date.now(),
        });
        return args.eventFlowId;
    },
});
exports.deleteEventFlow = (0, server_1.mutation)({
    args: { eventFlowId: values_1.v.id('event_flow') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.delete(args.eventFlowId);
        return { success: true };
    },
});
