"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.log = exports.listByUser = exports.listByClient = exports.listByCompany = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.listByCompany = (0, server_1.query)({
    args: { companyId: values_1.v.id('companies'), limit: values_1.v.optional(values_1.v.number()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.listByClient = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients'), limit: values_1.v.optional(values_1.v.number()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.listByUser = (0, server_1.query)({
    args: { userId: values_1.v.string(), limit: values_1.v.optional(values_1.v.number()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
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
exports.log = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.optional(values_1.v.id('clients')),
        user_id: values_1.v.string(),
        action: values_1.v.string(),
        entity_type: values_1.v.string(),
        entity_id: values_1.v.string(),
        changes: values_1.v.optional(values_1.v.any()),
        previous_value: values_1.v.optional(values_1.v.any()),
        new_value: values_1.v.optional(values_1.v.any()),
        ip_address: values_1.v.optional(values_1.v.string()),
        user_agent: values_1.v.optional(values_1.v.string()),
        device_type: values_1.v.optional(values_1.v.string()),
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
exports.create = (0, server_1.mutation)({
    args: {
        action: values_1.v.string(),
        entityType: values_1.v.string(),
        entityId: values_1.v.string(),
        changes: values_1.v.optional(values_1.v.any()),
        previousValue: values_1.v.optional(values_1.v.any()),
        newValue: values_1.v.optional(values_1.v.any()),
        clientId: values_1.v.optional(values_1.v.id('clients')),
        userAgent: values_1.v.optional(values_1.v.string()),
        deviceType: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Get current user
        const user = await ctx.db
            .query('users')
            .withIndex('by_clerk_id', (q) => q.eq('clerk_id', identity.subject))
            .first();
        if (!user)
            throw new Error('User not found');
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
