import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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

export const getUnreadCount = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('user_id', args.userId).eq('read', false))
      .collect();

    return notifications.length;
  },
});

export const create = mutation({
  args: {
    user_id: v.string(),
    company_id: v.id('companies'),
    client_id: v.optional(v.id('clients')),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    action_url: v.optional(v.string()),
    action_label: v.optional(v.string()),
    priority: v.union(v.literal('high'), v.literal('normal'), v.literal('low')),
    expires_at: v.optional(v.number()),
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

export const markRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    await ctx.db.patch(args.notificationId, {
      read: true,
      read_at: Date.now(),
    });

    return args.notificationId;
  },
});

export const markAllRead = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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

export const deleteExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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
