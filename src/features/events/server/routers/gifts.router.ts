/**
 * Gifts tRPC Router
 * Simplified to match actual schema:
 * - gifts: id, clientId, guestId, name, value, status, createdAt, updatedAt
 */

import { router, adminProcedure, protectedProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { clients, gifts, guests } from '@/lib/db/schema'
import { broadcastSync } from '@/lib/realtime/broadcast-sync'

export const giftsRouter = router({
  /**
   * Get all gifts for a client
   */
  getAll: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      // Verify client belongs to company
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not found' })
      }

      // Fetch gifts with guest info
      const giftList = await ctx.db
        .select({
          gift: gifts,
          guest: {
            firstName: guests.firstName,
            lastName: guests.lastName,
          },
        })
        .from(gifts)
        .leftJoin(guests, eq(gifts.guestId, guests.id))
        .where(eq(gifts.clientId, input.clientId))
        .orderBy(desc(gifts.createdAt))

      return giftList.map(row => ({
        ...row.gift,
        guest: row.guest?.firstName ? row.guest : null,
      }))
    }),

  /**
   * Get gift by ID
   * SECURITY: Verifies gift belongs to a client owned by the user's company
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      // Join with clients to verify company ownership
      const [result] = await ctx.db
        .select({
          gift: gifts,
          guest: guests,
        })
        .from(gifts)
        .innerJoin(clients, eq(gifts.clientId, clients.id))
        .leftJoin(guests, eq(gifts.guestId, guests.id))
        .where(
          and(
            eq(gifts.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gift not found' })
      }

      return {
        ...result.gift,
        guest: result.guest,
      }
    }),

  /**
   * Create gift
   */
  create: adminProcedure
    .input(z.object({
      clientId: z.string(),
      guestId: z.string().optional(),
      name: z.string().min(1),
      value: z.number().optional(),
      status: z.enum(['pending', 'received', 'returned']).default('received'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      // Verify client
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not found' })
      }

      const [gift] = await ctx.db
        .insert(gifts)
        .values({
          id: crypto.randomUUID(),
          clientId: input.clientId,
          guestId: input.guestId || null,
          name: input.name,
          value: input.value || null,
          status: input.status,
        })
        .returning()

      await broadcastSync({
        type: 'insert',
        module: 'gifts',
        entityId: gift.id,
        companyId: ctx.companyId!,
        clientId: input.clientId,
        userId: ctx.userId!,
        queryPaths: ['gifts.getAll'],
      })

      return gift
    }),

  /**
   * Update gift
   * SECURITY: Verifies gift belongs to a client owned by the user's company
   */
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      guestId: z.string().optional(),
      value: z.number().optional(),
      status: z.enum(['pending', 'received', 'returned']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      // Verify gift belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: gifts.id })
        .from(gifts)
        .innerJoin(clients, eq(gifts.clientId, clients.id))
        .where(
          and(
            eq(gifts.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gift not found' })
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() }
      if (input.name !== undefined) updates.name = input.name
      if (input.guestId !== undefined) updates.guestId = input.guestId
      if (input.value !== undefined) updates.value = input.value
      if (input.status !== undefined) updates.status = input.status

      const [gift] = await ctx.db
        .update(gifts)
        .set(updates)
        .where(eq(gifts.id, input.id))
        .returning()

      await broadcastSync({
        type: 'update',
        module: 'gifts',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: gift.clientId,
        userId: ctx.userId!,
        queryPaths: ['gifts.getAll'],
      })

      return gift
    }),

  /**
   * Delete gift
   * SECURITY: Verifies gift belongs to a client owned by the user's company
   */
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      // Verify gift belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: gifts.id, clientId: gifts.clientId })
        .from(gifts)
        .innerJoin(clients, eq(gifts.clientId, clients.id))
        .where(
          and(
            eq(gifts.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gift not found' })
      }

      await ctx.db
        .delete(gifts)
        .where(eq(gifts.id, input.id))

      await broadcastSync({
        type: 'delete',
        module: 'gifts',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: existing.clientId,
        userId: ctx.userId!,
        queryPaths: ['gifts.getAll'],
      })

      return { success: true }
    }),

  /**
   * Get gift statistics for a client
   */
  getStats: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
      }

      // Verify client
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not found' })
      }

      const giftList = await ctx.db
        .select({
          status: gifts.status,
          value: gifts.value,
        })
        .from(gifts)
        .where(eq(gifts.clientId, input.clientId))

      const totalValue = giftList.reduce((sum, g) => sum + (g.value || 0), 0)

      return {
        total: giftList.length,
        received: giftList.filter(g => g.status === 'received').length,
        pending: giftList.filter(g => g.status === 'pending').length,
        returned: giftList.filter(g => g.status === 'returned').length,
        totalValue,
      }
    }),
})
