import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

/**
 * Messages Router
 *
 * Uses session claims for authorization (NO database queries for auth checks)
 * - ctx.companyId - from sessionClaims.metadata.company_id
 * - ctx.userId - from Clerk user ID
 *
 * Schema: Uses existing messages table structure
 * - body (not message_text)
 * - is_read (not read)
 * - recipient_id, subject, parent_message_id, metadata
 */
export const messagesRouter = router({
  /**
   * Get paginated messages for a client
   * Verifies client belongs to company via session claims
   */
  getMessages: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify company ID from session claims
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session'
        });
      }

      // Verify client belongs to company (session claims)
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single();

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        });
      }

      // Build query
      let query = ctx.supabase
        .from('messages')
        .select('*')
        .eq('client_id', input.clientId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      // Add cursor for pagination
      if (input.cursor) {
        const { data: cursorMessage } = await ctx.supabase
          .from('messages')
          .select('created_at')
          .eq('id', input.cursor)
          .maybeSingle() as { data: { created_at: string } | null; error: any };

        if (cursorMessage && 'created_at' in cursorMessage) {
          query = query.lt('created_at', cursorMessage.created_at);
        }
      }

      const { data: messages, error } = await query as {
        data: any[] | null;
        error: any
      };

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        });
      }

      // Get next cursor
      const nextCursor = messages && messages.length === input.limit
        ? messages[messages.length - 1].id
        : undefined;

      return {
        messages: messages || [],
        nextCursor,
      };
    }),

  /**
   * Send a new message
   * Verifies client belongs to company via session claims
   */
  sendMessage: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      recipientId: z.string().uuid(),
      subject: z.string().optional(),
      body: z.string().min(1).max(5000),
      parentMessageId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify company ID from session claims
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session'
        });
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single();

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        });
      }

      // Get user info for sender
      const { data: user } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('clerk_id', ctx.userId)
        .single() as { data: { id: string } | null; error: any };

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found'
        });
      }

      // Insert message
      const { data: newMessage, error } = await ctx.supabase
        .from('messages')
        .insert({
          client_id: input.clientId,
          sender_id: user.id,
          recipient_id: input.recipientId,
          subject: input.subject || null,
          body: input.body,
          parent_message_id: input.parentMessageId || null,
          is_read: false,
        } as any)
        .select()
        .single() as { data: any; error: any };

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        });
      }

      return newMessage;
    }),

  /**
   * Mark messages as read
   * Only marks messages where current user is recipient
   */
  markAsRead: protectedProcedure
    .input(z.object({
      messageIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current user ID
      const { data: user } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('clerk_id', ctx.userId)
        .single() as { data: { id: string } | null; error: any };

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found'
        });
      }

      // Mark messages as read (only where current user is recipient)
      const result = await (ctx.supabase as any)
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .in('id', input.messageIds)
        .eq('recipient_id', user.id);

      const { error } = result as { error: any };

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        });
      }

      return { success: true };
    }),

  /**
   * Get unread message count for a client
   * Only counts messages where current user is recipient
   */
  getUnreadCount: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify company ID from session claims
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session'
        });
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single();

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        });
      }

      // Get current user ID
      const { data: user } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('clerk_id', ctx.userId)
        .single() as { data: { id: string } | null; error: any };

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found'
        });
      }

      // Count unread messages where current user is recipient
      const { count, error } = await ctx.supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', input.clientId)
        .eq('recipient_id', user.id)
        .eq('is_read', false) as { count: number | null; error: any };

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        });
      }

      return { count: count || 0 };
    }),

  /**
   * Get conversation between current user and another user
   * Returns all messages between the two users for a specific client
   */
  getConversation: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      otherUserId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify company ID from session claims
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session'
        });
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single();

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        });
      }

      // Get current user ID
      const { data: user } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('clerk_id', ctx.userId)
        .single() as { data: { id: string } | null; error: any };

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found'
        });
      }

      // Get conversation (messages between current user and other user)
      const { data: messages, error } = await ctx.supabase
        .from('messages')
        .select('*')
        .eq('client_id', input.clientId)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${input.otherUserId}),and(sender_id.eq.${input.otherUserId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true }) as { data: any[] | null; error: any };

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        });
      }

      return messages || [];
    }),
});
