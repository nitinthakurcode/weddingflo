import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const list = query({
  args: { clientId: v.id('clients'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const query = ctx.db
      .query('messages')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .order('desc');

    const messages = args.limit ? await query.take(args.limit) : await query.collect();

    // Return in chronological order (oldest first)
    return messages.reverse();
  },
});

export const listByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    return await ctx.db
      .query('messages')
      .withIndex('by_thread', (q) => q.eq('thread_id', args.threadId))
      .collect();
  },
});

export const getUnreadCount = query({
  args: { userId: v.string(), clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_client', (q) => q.eq('client_id', args.clientId))
      .collect();

    return messages.filter(
      (m) => !m.read && !m.read_by.includes(args.userId)
    ).length;
  },
});

export const send = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    sender_type: v.union(
      v.literal('company'),
      v.literal('client'),
      v.literal('ai_assistant')
    ),
    sender_id: v.optional(v.string()),
    sender_name: v.string(),
    message: v.string(),
    message_html: v.optional(v.string()),
    thread_id: v.optional(v.string()),
    reply_to: v.optional(v.id('messages')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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

export const markRead = mutation({
  args: { messageId: v.id('messages'), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error('Message not found');

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

export const markAllRead = mutation({
  args: { clientId: v.id('clients'), userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

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

export const createThread = mutation({
  args: {
    company_id: v.id('companies'),
    client_id: v.id('clients'),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { threadId };
  },
});

// Get list of conversations grouped by client with last message preview
export const getConversations = query({
  args: {
    companyId: v.id('companies'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Get all clients for this company
    const clients = await ctx.db
      .query('clients')
      .withIndex('by_company', (q) => q.eq('company_id', args.companyId))
      .collect();

    // For each client, get the last message and unread count
    const conversations = await Promise.all(
      clients.map(async (client) => {
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

        const unreadCount = allMessages.filter(
          (msg) => !msg.read_by.includes(args.userId) && msg.sender_id !== args.userId
        ).length;

        return {
          client,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Sort by last message time (most recent first)
    return conversations.sort((a, b) => {
      const timeA = a.lastMessage?.created_at || 0;
      const timeB = b.lastMessage?.created_at || 0;
      return timeB - timeA;
    });
  },
});
