"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversations = exports.createThread = exports.markAllRead = exports.markRead = exports.send = exports.getUnreadCount = exports.listByThread = exports.list = void 0;
const values_1 = require("convex/values");
const server_1 = require("./_generated/server");
exports.list = (0, server_1.query)({
    args: { clientId: values_1.v.id('clients'), limit: values_1.v.optional(values_1.v.number()) },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const query = ctx.db
            .query('messages')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .order('desc');
        const messages = args.limit ? await query.take(args.limit) : await query.collect();
        // Return in chronological order (oldest first)
        return messages.reverse();
    },
});
exports.listByThread = (0, server_1.query)({
    args: { threadId: values_1.v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        return await ctx.db
            .query('messages')
            .withIndex('by_thread', (q) => q.eq('thread_id', args.threadId))
            .collect();
    },
});
exports.getUnreadCount = (0, server_1.query)({
    args: { userId: values_1.v.string(), clientId: values_1.v.id('clients') },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const messages = await ctx.db
            .query('messages')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        return messages.filter((m) => !m.read && !m.read_by.includes(args.userId)).length;
    },
});
exports.send = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        sender_type: values_1.v.union(values_1.v.literal('company'), values_1.v.literal('client'), values_1.v.literal('ai_assistant')),
        sender_id: values_1.v.optional(values_1.v.string()),
        sender_name: values_1.v.string(),
        message: values_1.v.string(),
        message_html: values_1.v.optional(values_1.v.string()),
        thread_id: values_1.v.optional(values_1.v.string()),
        reply_to: values_1.v.optional(values_1.v.id('messages')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const now = Date.now();
        return await ctx.db.insert('messages', {
            ...args,
            attachments: [],
            read: false,
            read_by: args.sender_id ? [args.sender_id] : [],
            ai_generated: args.sender_type === 'ai_assistant',
            created_at: now,
        });
    },
});
exports.markRead = (0, server_1.mutation)({
    args: { messageId: values_1.v.id('messages'), userId: values_1.v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const message = await ctx.db.get(args.messageId);
        if (!message)
            throw new Error('Message not found');
        if (!message.read_by.includes(args.userId)) {
            await ctx.db.patch(args.messageId, {
                read: true,
                read_by: [...message.read_by, args.userId],
                read_at: Date.now(),
            });
        }
        return args.messageId;
    },
});
exports.markAllRead = (0, server_1.mutation)({
    args: { clientId: values_1.v.id('clients'), userId: values_1.v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const messages = await ctx.db
            .query('messages')
            .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
            .collect();
        const now = Date.now();
        for (const message of messages) {
            if (!message.read_by.includes(args.userId)) {
                await ctx.db.patch(message._id, {
                    read: true,
                    read_by: [...message.read_by, args.userId],
                    read_at: now,
                });
            }
        }
        return { success: true };
    },
});
exports.createThread = (0, server_1.mutation)({
    args: {
        company_id: values_1.v.id('companies'),
        client_id: values_1.v.id('clients'),
        subject: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return { threadId };
    },
});
// Get list of conversations grouped by client with last message preview
exports.getConversations = (0, server_1.query)({
    args: {
        companyId: values_1.v.id('companies'),
        userId: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity)
            throw new Error('Not authenticated');
        // Get all clients for this company
        const clients = await ctx.db
            .query('clients')
            .withIndex('by_company', (q) => q.eq('company_id', args.companyId))
            .collect();
        // For each client, get the last message and unread count
        const conversations = await Promise.all(clients.map(async (client) => {
            const messages = await ctx.db
                .query('messages')
                .withIndex('by_client', (q) => q.eq('client_id', client._id))
                .order('desc')
                .take(1);
            const lastMessage = messages[0];
            // Get unread count
            const allMessages = await ctx.db
                .query('messages')
                .withIndex('by_client', (q) => q.eq('client_id', client._id))
                .collect();
            const unreadCount = allMessages.filter((msg) => !msg.read_by.includes(args.userId) && msg.sender_id !== args.userId).length;
            return {
                client,
                lastMessage,
                unreadCount,
            };
        }));
        // Sort by last message time (most recent first)
        return conversations.sort((a, b) => {
            const timeA = a.lastMessage?.created_at || 0;
            const timeB = b.lastMessage?.created_at || 0;
            return timeB - timeA;
        });
    },
});
