"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpired = exports.markAllRead = exports.markRead = exports.create = exports.getUnreadCount = exports.list = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.list = (0, server_1.query)({
    args: { userId: values_1.v.string(), limit: values_1.v.optional(values_1.v.number()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const query = ctx.db
            .query('notifications')
            .withIndex('by_user', (q) => q.eq('user_id', args.userId))
            .order('desc');
        if (args.limit) {
            return await query.take(args.limit);
        }
        return await query.collect();
    },
});
exports.getUnreadCount = (0, server_1.query)({
    args: { userId: values_1.v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user', (q) => q.eq('user_id', args.userId).eq('read', false))
            .collect();
        return notifications.length;
    },
});
exports.create = (0, server_1.mutation)({
    args: {
        user_id: values_1.v.string(),
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.optional(values_1.v.id('clients')),
        type: values_1.v.string(),
        title: values_1.v.string(),
        message: values_1.v.string(),
        action_url: values_1.v.optional(values_1.v.string()),
        action_label: values_1.v.optional(values_1.v.string()),
        priority: values_1.v.union(values_1.v.literal('high'), values_1.v.literal('normal'), values_1.v.literal('low')),
        expires_at: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return await ctx.db.insert('notifications', {
            ...args,
            read: false,
            push_sent: false,
            created_at: now,
        });
    },
});
exports.markRead = (0, server_1.mutation)({
    args: { notificationId: values_1.v.id('notifications') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        await ctx.db.patch(args.notificationId, {
            read: true,
            read_at: Date.now(),
        });
        return args.notificationId;
    },
});
exports.markAllRead = (0, server_1.mutation)({
    args: { userId: values_1.v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user', (q) => q.eq('user_id', args.userId).eq('read', false))
            .collect();
        const now = Date.now();
        for (const notification of notifications) {
            await ctx.db.patch(notification._id, {
                read: true,
                read_at: now,
            });
        }
        return { count: notifications.length };
    },
});
exports.deleteExpired = (0, server_1.mutation)({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const now = Date.now();
        const notifications = await ctx.db.query('notifications').collect();
        let deleted = 0;
        for (const notification of notifications) {
            if (notification.expires_at && notification.expires_at < now) {
                await ctx.db.delete(notification._id);
                deleted++;
            }
        }
        return { deleted };
    },
});
