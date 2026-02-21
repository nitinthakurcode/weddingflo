import { router, protectedProcedure } from '@/server/trpc/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, or, lt, desc, asc, isNull, inArray, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

/**
 * Messages Router - Drizzle ORM
 *
 * Uses BetterAuth session for authorization
 * - ctx.companyId - from session
 * - ctx.userId - from BetterAuth user
 *
 * Schema fields:
 * - content (not body)
 * - receiverId (not recipient_id)
 * - isRead, readAt
 * - parentId (not parent_message_id)
 * - metadata for extra fields (senderName, senderType, channelType)
 */
export const messagesRouter = router({
  /**
   * Get paginated messages for a client
   */
  getMessages: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session'
        });
      }

      // Verify client belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(eq(schema.clients.id, input.clientId), eq(schema.clients.companyId, companyId)))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        });
      }

      // Get cursor message if provided
      let cursorDate: Date | null = null;
      if (input.cursor) {
        const [cursorMsg] = await db
          .select({ createdAt: schema.messages.createdAt })
          .from(schema.messages)
          .where(eq(schema.messages.id, input.cursor))
          .limit(1);
        cursorDate = cursorMsg?.createdAt || null;
      }

      // Build query
      const conditions = [eq(schema.messages.clientId, input.clientId)];
      if (cursorDate) {
        conditions.push(lt(schema.messages.createdAt, cursorDate));
      }

      const messages = await db
        .select()
        .from(schema.messages)
        .where(and(...conditions))
        .orderBy(desc(schema.messages.createdAt))
        .limit(input.limit);

      const nextCursor = messages.length === input.limit
        ? messages[messages.length - 1].id
        : undefined;

      return {
        messages,
        nextCursor,
      };
    }),

  /**
   * Send a new message
   */
  sendMessage: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      recipientId: z.string().uuid(),
      subject: z.string().optional(),
      content: z.string().min(1).max(5000),
      parentMessageId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, userId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session'
        });
      }

      // Verify client belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(eq(schema.clients.id, input.clientId), eq(schema.clients.companyId, companyId)))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        });
      }

      // Get user ID
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found'
        });
      }

      // Look up user's database UUID from BetterAuth ID
      const [dbUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, userId))
        .limit(1);

      if (!dbUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found in database'
        });
      }

      // Insert message
      const [newMessage] = await db
        .insert(schema.messages)
        .values({
          companyId,
          clientId: input.clientId,
          senderId: dbUser.id,
          receiverId: input.recipientId,
          subject: input.subject,
          content: input.content,
          parentId: input.parentMessageId,
          isRead: false,
        })
        .returning();

      return newMessage;
    }),

  /**
   * Mark messages as read
   */
  markAsRead: protectedProcedure
    .input(z.object({
      messageIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, userId } = ctx;

      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found'
        });
      }

      // Look up user's database UUID from BetterAuth ID
      const [dbUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, userId))
        .limit(1);

      if (!dbUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found in database'
        });
      }

      // Mark messages as read (only where current user is receiver)
      await db
        .update(schema.messages)
        .set({
          isRead: true,
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(schema.messages.id, input.messageIds),
            eq(schema.messages.receiverId, dbUser.id)
          )
        );

      return { success: true };
    }),

  /**
   * Get unread message count for a client
   */
  getUnreadCount: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, companyId, userId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session'
        });
      }

      // Verify client belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(eq(schema.clients.id, input.clientId), eq(schema.clients.companyId, companyId)))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        });
      }

      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found'
        });
      }

      // Look up user's database UUID from BetterAuth ID
      // The users table stores authId (BetterAuth ID) separately from id (UUID)
      const [dbUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, userId))
        .limit(1);

      // If user not found in legacy users table, return 0 count
      if (!dbUser) {
        return { count: 0 };
      }

      // Count unread messages where current user is receiver
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.messages)
        .where(
          and(
            eq(schema.messages.clientId, input.clientId),
            eq(schema.messages.receiverId, dbUser.id),
            eq(schema.messages.isRead, false)
          )
        );

      return { count: result?.count || 0 };
    }),

  /**
   * Get conversation between current user and another user
   */
  getConversation: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      otherUserId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, companyId, userId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session'
        });
      }

      // Verify client belongs to company
      const [client] = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(eq(schema.clients.id, input.clientId), eq(schema.clients.companyId, companyId)))
        .limit(1);

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        });
      }

      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not found'
        });
      }

      // Look up user's database UUID from BetterAuth ID
      const [dbUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, userId))
        .limit(1);

      if (!dbUser) {
        return [];
      }

      // Get conversation (messages between current user and other user)
      const messages = await db
        .select()
        .from(schema.messages)
        .where(
          and(
            eq(schema.messages.clientId, input.clientId),
            or(
              and(eq(schema.messages.senderId, dbUser.id), eq(schema.messages.receiverId, input.otherUserId)),
              and(eq(schema.messages.senderId, input.otherUserId), eq(schema.messages.receiverId, dbUser.id))
            )
          )
        )
        .orderBy(asc(schema.messages.createdAt));

      return messages;
    }),

  // ============================================================================
  // TEAM CHAT CHANNELS (November 2025 - Team Management)
  // ============================================================================

  /**
   * Get team chat channels available to the user
   */
  getTeamChannels: protectedProcedure
    .query(async ({ ctx }) => {
      const { db, companyId, userId } = ctx;

      if (!companyId || !userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      // Get clients the user is assigned to
      const assignments = await db
        .select({
          clientId: schema.teamClientAssignments.clientId,
          role: schema.teamClientAssignments.role,
          client: {
            id: schema.clients.id,
            partner1FirstName: schema.clients.partner1FirstName,
            partner1LastName: schema.clients.partner1LastName,
            partner2FirstName: schema.clients.partner2FirstName,
            partner2LastName: schema.clients.partner2LastName,
          },
        })
        .from(schema.teamClientAssignments)
        .leftJoin(schema.clients, eq(schema.teamClientAssignments.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.teamClientAssignments.teamMemberId, userId),
            eq(schema.clients.companyId, companyId)
          )
        );

      // Build channel list
      const channels: Array<{
        id: string;
        type: 'team_global' | 'team_client';
        name: string;
        clientId: string | null;
      }> = [
        {
          id: 'team_global',
          type: 'team_global',
          name: 'Team Chat',
          clientId: null,
        }
      ];

      // Add client-specific channels
      assignments.forEach(a => {
        if (a.clientId && a.client) {
          const clientName = a.client.partner2FirstName
            ? `${a.client.partner1FirstName} & ${a.client.partner2FirstName}`
            : `${a.client.partner1FirstName} ${a.client.partner1LastName}`;

          channels.push({
            id: `team_client_${a.client.id}`,
            type: 'team_client' as const,
            name: `Team: ${clientName}`,
            clientId: a.client.id,
          });
        }
      });

      // For global role, get all clients
      const hasGlobal = assignments.some(a => a.role === 'global');
      if (hasGlobal) {
        const allClients = await db
          .select({
            id: schema.clients.id,
            partner1FirstName: schema.clients.partner1FirstName,
            partner1LastName: schema.clients.partner1LastName,
            partner2FirstName: schema.clients.partner2FirstName,
            partner2LastName: schema.clients.partner2LastName,
          })
          .from(schema.clients)
          .where(
            and(
              eq(schema.clients.companyId, companyId),
              isNull(schema.clients.deletedAt)
            )
          );

        allClients.forEach(client => {
          const existing = channels.find(c => c.clientId === client.id);
          if (!existing) {
            const clientName = client.partner2FirstName
              ? `${client.partner1FirstName} & ${client.partner2FirstName}`
              : `${client.partner1FirstName} ${client.partner1LastName}`;

            channels.push({
              id: `team_client_${client.id}`,
              type: 'team_client' as const,
              name: `Team: ${clientName}`,
              clientId: client.id,
            });
          }
        });
      }

      return channels;
    }),

  /**
   * Get messages from a team channel
   */
  getTeamMessages: protectedProcedure
    .input(z.object({
      channelType: z.enum(['team_global', 'team_client']),
      clientId: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { db, companyId } = ctx;

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company ID not found in session'
        });
      }

      if (input.channelType === 'team_client' && !input.clientId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Client ID required for team_client channel'
        });
      }

      // Get cursor date if provided
      let cursorDate: Date | null = null;
      if (input.cursor) {
        const [cursorMsg] = await db
          .select({ createdAt: schema.messages.createdAt })
          .from(schema.messages)
          .where(eq(schema.messages.id, input.cursor))
          .limit(1);
        cursorDate = cursorMsg?.createdAt || null;
      }

      // Build conditions
      const conditions = [
        eq(schema.messages.companyId, companyId),
        sql`${schema.messages.metadata}->>'channelType' = ${input.channelType}`,
      ];

      if (input.channelType === 'team_client' && input.clientId) {
        conditions.push(eq(schema.messages.clientId, input.clientId));
      }

      if (cursorDate) {
        conditions.push(lt(schema.messages.createdAt, cursorDate));
      }

      // OPTIMIZED: Single query with LEFT JOIN for sender info
      const results = await db
        .select({
          message: schema.messages,
          senderId: schema.users.id,
          senderFirstName: schema.users.firstName,
          senderLastName: schema.users.lastName,
          senderAvatarUrl: schema.users.avatarUrl,
        })
        .from(schema.messages)
        .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
        .where(and(...conditions))
        .orderBy(desc(schema.messages.createdAt))
        .limit(input.limit);

      const nextCursor = results.length === input.limit
        ? results[results.length - 1].message.id
        : undefined;

      return {
        messages: results.map(r => ({
          ...r.message,
          sender: r.senderId ? {
            id: r.senderId,
            firstName: r.senderFirstName,
            lastName: r.senderLastName,
            avatarUrl: r.senderAvatarUrl,
          } : null,
        })),
        nextCursor,
      };
    }),

  /**
   * Send a message to a team channel
   */
  sendTeamMessage: protectedProcedure
    .input(z.object({
      channelType: z.enum(['team_global', 'team_client']),
      clientId: z.string().uuid().optional(),
      content: z.string().min(1).max(5000),
      parentMessageId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, companyId, userId, user } = ctx;

      if (!companyId || !userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
      }

      if (input.channelType === 'team_client' && !input.clientId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Client ID required for team_client channel'
        });
      }

      // For team_client, verify client access
      if (input.channelType === 'team_client' && input.clientId) {
        const [client] = await db
          .select({ id: schema.clients.id })
          .from(schema.clients)
          .where(
            and(
              eq(schema.clients.id, input.clientId),
              eq(schema.clients.companyId, companyId)
            )
          )
          .limit(1);

        if (!client) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Client not found or access denied'
          });
        }
      }

      // Look up user's database UUID from BetterAuth ID
      const [dbUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, userId))
        .limit(1);

      if (!dbUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found in database'
        });
      }

      // Insert message
      const [newMessage] = await db
        .insert(schema.messages)
        .values({
          companyId,
          clientId: input.clientId,
          senderId: dbUser.id,
          content: input.content,
          parentId: input.parentMessageId,
          isRead: false,
          metadata: {
            channelType: input.channelType,
            senderName: user?.name || 'Unknown',
            senderType: 'staff',
          },
        })
        .returning();

      return newMessage;
    }),
});
