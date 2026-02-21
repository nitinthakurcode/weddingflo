/**
 * Enhanced Gift Tracking Router
 * Simplified to match actual schema:
 * - giftsEnhanced: id, clientId, guestId, name, type, value, thankYouSent, createdAt, updatedAt
 * - giftCategories: id, companyId, name, createdAt
 * - thankYouNoteTemplates: id, companyId, name, content, createdAt, updatedAt
 */

import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, desc, ilike, isNull } from 'drizzle-orm'
import { giftsEnhanced, giftCategories, thankYouNoteTemplates, guests, clients } from '@/lib/db/schema'

const giftTypeEnum = z.enum(['physical', 'cash', 'gift_card', 'experience'])

export const giftsEnhancedRouter = router({
  /**
   * List all gifts for a client
   */
  list: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      search: z.string().optional(),
      thankYouSent: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        })
      }

      // SECURITY: Verify client belongs to user's company
      const [client] = await ctx.db.select({ id: clients.id }).from(clients)
        .where(and(
          eq(clients.id, input.clientId),
          eq(clients.companyId, ctx.companyId),
          isNull(clients.deletedAt)
        ))
        .limit(1)

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found',
        })
      }

      const conditions = [eq(giftsEnhanced.clientId, input.clientId)]

      if (input.search) {
        conditions.push(ilike(giftsEnhanced.name, `%${input.search}%`))
      }

      if (input.thankYouSent !== undefined) {
        conditions.push(eq(giftsEnhanced.thankYouSent, input.thankYouSent))
      }

      const data = await ctx.db
        .select({
          gift: giftsEnhanced,
          guest: {
            firstName: guests.firstName,
            lastName: guests.lastName,
            email: guests.email,
          },
        })
        .from(giftsEnhanced)
        .leftJoin(guests, eq(giftsEnhanced.guestId, guests.id))
        .where(and(...conditions))
        .orderBy(desc(giftsEnhanced.createdAt))

      return data.map(row => ({
        ...row.gift,
        guests: row.guest?.firstName ? row.guest : null,
      }))
    }),

  /**
   * Get gift by ID
   * SECURITY: Verifies gift belongs to a client owned by the user's company
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        })
      }

      // Join with clients to verify company ownership
      const [result] = await ctx.db
        .select({
          gift: giftsEnhanced,
          guest: guests,
        })
        .from(giftsEnhanced)
        .innerJoin(clients, eq(giftsEnhanced.clientId, clients.id))
        .leftJoin(guests, eq(giftsEnhanced.guestId, guests.id))
        .where(
          and(
            eq(giftsEnhanced.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gift not found',
        })
      }

      return {
        ...result.gift,
        guests: result.guest,
      }
    }),

  /**
   * Create new gift
   */
  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      guestId: z.string().uuid().optional(),
      name: z.string().min(1),
      type: giftTypeEnum.optional(),
      value: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      // SECURITY: Verify client belongs to user's company
      const [client] = await ctx.db.select({ id: clients.id }).from(clients)
        .where(and(
          eq(clients.id, input.clientId),
          eq(clients.companyId, ctx.companyId),
          isNull(clients.deletedAt)
        ))
        .limit(1)

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found',
        })
      }

      const [data] = await ctx.db
        .insert(giftsEnhanced)
        .values({
          id: crypto.randomUUID(),
          clientId: input.clientId,
          guestId: input.guestId,
          name: input.name,
          type: input.type || 'physical',
          value: input.value,
        })
        .returning()

      return data
    }),

  /**
   * Update gift
   * SECURITY: Verifies gift belongs to a client owned by the user's company
   */
  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      type: giftTypeEnum.optional(),
      value: z.number().optional(),
      guestId: z.string().uuid().optional(),
      thankYouSent: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      // Verify gift belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: giftsEnhanced.id })
        .from(giftsEnhanced)
        .innerJoin(clients, eq(giftsEnhanced.clientId, clients.id))
        .where(
          and(
            eq(giftsEnhanced.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gift not found',
        })
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() }
      if (input.name !== undefined) updates.name = input.name
      if (input.type !== undefined) updates.type = input.type
      if (input.value !== undefined) updates.value = input.value
      if (input.guestId !== undefined) updates.guestId = input.guestId
      if (input.thankYouSent !== undefined) updates.thankYouSent = input.thankYouSent

      const [data] = await ctx.db
        .update(giftsEnhanced)
        .set(updates)
        .where(eq(giftsEnhanced.id, input.id))
        .returning()

      return data
    }),

  /**
   * Delete gift
   * SECURITY: Verifies gift belongs to a client owned by the user's company
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      // Verify gift belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: giftsEnhanced.id })
        .from(giftsEnhanced)
        .innerJoin(clients, eq(giftsEnhanced.clientId, clients.id))
        .where(
          and(
            eq(giftsEnhanced.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gift not found',
        })
      }

      await ctx.db
        .delete(giftsEnhanced)
        .where(eq(giftsEnhanced.id, input.id))

      return { success: true }
    }),

  /**
   * Mark thank you sent
   * SECURITY: Verifies gift belongs to a client owned by the user's company
   */
  markThankYouSent: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      sent: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      // Verify gift belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: giftsEnhanced.id })
        .from(giftsEnhanced)
        .innerJoin(clients, eq(giftsEnhanced.clientId, clients.id))
        .where(
          and(
            eq(giftsEnhanced.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Gift not found',
        })
      }

      const [data] = await ctx.db
        .update(giftsEnhanced)
        .set({
          thankYouSent: input.sent,
          updatedAt: new Date(),
        })
        .where(eq(giftsEnhanced.id, input.id))
        .returning()

      return data
    }),

  // ==============================
  // Gift Categories
  // ==============================

  /**
   * List gift categories
   */
  listCategories: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID not found' })
    }

    return ctx.db.query.giftCategories.findMany({
      where: eq(giftCategories.companyId, ctx.companyId),
      orderBy: [desc(giftCategories.createdAt)],
    })
  }),

  /**
   * Create gift category
   */
  createCategory: adminProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' })
      }

      const [data] = await ctx.db
        .insert(giftCategories)
        .values({
          id: crypto.randomUUID(),
          companyId: ctx.companyId,
          name: input.name,
        })
        .returning()

      return data
    }),

  /**
   * Delete gift category
   */
  deleteCategory: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' })
      }

      await ctx.db
        .delete(giftCategories)
        .where(and(
          eq(giftCategories.id, input.id),
          eq(giftCategories.companyId, ctx.companyId)
        ))

      return { success: true }
    }),

  // ==============================
  // Thank You Note Templates
  // ==============================

  /**
   * List thank you templates
   */
  listThankYouTemplates: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.companyId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID not found' })
    }

    return ctx.db.query.thankYouNoteTemplates.findMany({
      where: eq(thankYouNoteTemplates.companyId, ctx.companyId),
      orderBy: [desc(thankYouNoteTemplates.createdAt)],
    })
  }),

  /**
   * Create thank you template
   */
  createThankYouTemplate: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      content: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' })
      }

      const [data] = await ctx.db
        .insert(thankYouNoteTemplates)
        .values({
          id: crypto.randomUUID(),
          companyId: ctx.companyId,
          name: input.name,
          content: input.content,
        })
        .returning()

      return data
    }),

  /**
   * Delete thank you template
   */
  deleteThankYouTemplate: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID required' })
      }

      await ctx.db
        .delete(thankYouNoteTemplates)
        .where(and(
          eq(thankYouNoteTemplates.id, input.id),
          eq(thankYouNoteTemplates.companyId, ctx.companyId)
        ))

      return { success: true }
    }),

  // ==============================
  // Statistics
  // ==============================

  /**
   * Get gift statistics for a client
   */
  getStats: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Company ID not found' })
      }

      // SECURITY: Verify client belongs to user's company
      const [client] = await ctx.db.select({ id: clients.id }).from(clients)
        .where(and(
          eq(clients.id, input.clientId),
          eq(clients.companyId, ctx.companyId),
          isNull(clients.deletedAt)
        ))
        .limit(1)

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found',
        })
      }

      const gifts = await ctx.db.query.giftsEnhanced.findMany({
        where: eq(giftsEnhanced.clientId, input.clientId),
      })

      const totalGifts = gifts.length
      const thankYouSentCount = gifts.filter(g => g.thankYouSent).length
      const totalValue = gifts.reduce((sum, g) => sum + (g.value || 0), 0)

      return {
        totalGifts,
        thankYouSentCount,
        thankYouPending: totalGifts - thankYouSentCount,
        totalValue,
      }
    }),
})
