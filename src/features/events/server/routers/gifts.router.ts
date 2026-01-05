import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { clients, gifts } from '@/lib/db/schema'

/**
 * Gifts tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding gifts with multi-tenant security.
 * Migrated from Supabase to Drizzle - December 2025
 */
export const giftsRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
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
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch gifts
      const giftList = await ctx.db
        .select()
        .from(gifts)
        .where(eq(gifts.clientId, input.clientId))
        .orderBy(desc(gifts.createdAt))

      // Return with snake_case for backward compatibility
      return giftList.map(g => ({
        id: g.id,
        client_id: g.clientId,
        gift_name: g.giftName,
        from_name: g.fromName,
        from_email: g.fromEmail,
        delivery_date: g.deliveryDate,
        delivery_status: g.deliveryStatus,
        thank_you_sent: g.thankYouSent,
        thank_you_sent_date: g.thankYouSentDate,
        notes: g.notes,
        created_at: g.createdAt?.toISOString() || undefined,
        updated_at: g.updatedAt?.toISOString() || undefined,
      }))
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [gift] = await ctx.db
        .select()
        .from(gifts)
        .where(eq(gifts.id, input.id))
        .limit(1)

      if (!gift) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return gift
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      giftName: z.string().min(1),
      fromName: z.string().optional(),
      fromEmail: z.preprocess(
        (val) => (val === '' ? undefined : val),
        z.string().email().optional()
      ),
      deliveryDate: z.string().optional(),
      deliveryStatus: z.enum(['pending', 'received', 'returned']).default('pending'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
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
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Create gift
      const [gift] = await ctx.db
        .insert(gifts)
        .values({
          clientId: input.clientId,
          giftName: input.giftName,
          fromName: input.fromName || null,
          fromEmail: input.fromEmail || null,
          deliveryDate: input.deliveryDate || null,
          deliveryStatus: input.deliveryStatus as any,
          notes: input.notes || null,
        })
        .returning()

      if (!gift) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create gift'
        })
      }

      return gift
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        giftName: z.string().optional(),
        fromName: z.string().optional(),
        fromEmail: z.preprocess(
          (val) => (val === '' ? undefined : val),
          z.string().email().optional()
        ),
        deliveryDate: z.string().optional(),
        deliveryStatus: z.enum(['pending', 'received', 'returned']).optional(),
        thankYouSent: z.boolean().optional(),
        thankYouSentDate: z.string().optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Build update object
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (input.data.giftName !== undefined) updateData.giftName = input.data.giftName
      if (input.data.fromName !== undefined) updateData.fromName = input.data.fromName
      if (input.data.fromEmail !== undefined) updateData.fromEmail = input.data.fromEmail
      if (input.data.deliveryDate !== undefined) updateData.deliveryDate = input.data.deliveryDate
      if (input.data.deliveryStatus !== undefined) updateData.deliveryStatus = input.data.deliveryStatus
      if (input.data.thankYouSent !== undefined) updateData.thankYouSent = input.data.thankYouSent
      if (input.data.thankYouSentDate !== undefined) updateData.thankYouSentDate = input.data.thankYouSentDate
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update gift
      const [gift] = await ctx.db
        .update(gifts)
        .set(updateData)
        .where(eq(gifts.id, input.id))
        .returning()

      if (!gift) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return gift
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      await ctx.db
        .delete(gifts)
        .where(eq(gifts.id, input.id))

      return { success: true }
    }),

  markThankYouSent: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      sentDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [gift] = await ctx.db
        .update(gifts)
        .set({
          thankYouSent: true,
          thankYouSentDate: input.sentDate || new Date().toISOString().split('T')[0],
          updatedAt: new Date(),
        })
        .where(eq(gifts.id, input.id))
        .returning()

      if (!gift) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return gift
    }),

  getStats: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
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
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get gifts
      const giftList = await ctx.db
        .select({
          deliveryStatus: gifts.deliveryStatus,
          thankYouSent: gifts.thankYouSent,
        })
        .from(gifts)
        .where(eq(gifts.clientId, input.clientId))

      const stats = {
        total: giftList.length,
        received: giftList.filter(g => g.deliveryStatus === 'received').length,
        pending: giftList.filter(g => g.deliveryStatus === 'pending').length,
        returned: giftList.filter(g => g.deliveryStatus === 'returned').length,
        thankYouSent: giftList.filter(g => g.thankYouSent).length,
        thankYouPending: giftList.filter(g => g.deliveryStatus === 'received' && !g.thankYouSent).length,
      }

      return stats
    }),
})
