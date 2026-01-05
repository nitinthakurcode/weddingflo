/**
 * Enhanced Gift Tracking Router
 * December 2025 - BetterAuth + Drizzle + Hetzner PostgreSQL
 *
 * Feature: Gift registry + thank you note tracking
 * Business Domain: Events Feature Pocket
 *
 * Capabilities:
 * - Track gifts with full delivery status
 * - Thank you note management with auto-calculated due dates
 * - Gift categories (customizable per company)
 * - Group gift support
 * - Receipt storage integration
 * - Gift statistics and reporting
 *
 * @see SESSION_51: Gift Tracking & Management
 */

import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, desc, ilike, lt, isNull, sql } from 'drizzle-orm'
import { giftsEnhanced, giftCategories, thankYouNoteTemplates, guests } from '@/lib/db/schema'

const giftTypeEnum = z.enum(['physical', 'cash', 'gift_card', 'experience'])
const deliveryStatusEnum = z.enum(['ordered', 'shipped', 'delivered', 'returned'])

export const giftsEnhancedRouter = router({
  /**
   * List all gifts for a client
   *
   * @requires protectedProcedure - User must be authenticated
   * @param clientId - Client UUID
   * @param search - Optional search filter
   * @param deliveryStatus - Optional delivery status filter
   * @param thankYouSent - Optional thank you sent filter
   * @returns Array of gifts with guest and category details
   */
  list: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      search: z.string().optional(),
      deliveryStatus: deliveryStatusEnum.optional(),
      thankYouSent: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID not found',
        })
      }

      const conditions = [
        eq(giftsEnhanced.clientId, input.clientId),
        eq(giftsEnhanced.companyId, ctx.companyId),
      ]

      if (input.search) {
        conditions.push(ilike(giftsEnhanced.giftName, `%${input.search}%`))
      }

      if (input.deliveryStatus) {
        conditions.push(eq(giftsEnhanced.deliveryStatus, input.deliveryStatus))
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
          category: {
            name: giftCategories.name,
            icon: giftCategories.icon,
            color: giftCategories.color,
          },
        })
        .from(giftsEnhanced)
        .leftJoin(guests, eq(giftsEnhanced.guestId, guests.id))
        .leftJoin(giftCategories, eq(giftsEnhanced.categoryId, giftCategories.id))
        .where(and(...conditions))
        .orderBy(desc(giftsEnhanced.createdAt))

      // Flatten the results to match the expected format
      return data.map(row => ({
        ...row.gift,
        guests: row.guest?.firstName ? row.guest : null,
        gift_categories: row.category?.name ? row.category : null,
      }))
    }),

  /**
   * Get gift by ID
   *
   * @requires protectedProcedure - User must be authenticated
   * @param id - Gift UUID
   * @returns Gift with guest and category details
   * @throws NOT_FOUND if gift doesn't exist or doesn't belong to company
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({
          gift: giftsEnhanced,
          guest: guests,
          category: giftCategories,
        })
        .from(giftsEnhanced)
        .leftJoin(guests, eq(giftsEnhanced.guestId, guests.id))
        .leftJoin(giftCategories, eq(giftsEnhanced.categoryId, giftCategories.id))
        .where(and(
          eq(giftsEnhanced.id, input.id),
          eq(giftsEnhanced.companyId, ctx.companyId!)
        ))
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
        gift_categories: result.category,
      }
    }),

  /**
   * Create new gift
   *
   * @requires adminProcedure - Admin or company_admin only
   * @param clientId - Client UUID
   * @param guestId - Optional guest UUID
   * @param giftName - Gift name/description
   * @param giftType - Type of gift (physical, cash, gift_card, experience)
   * @returns Created gift object
   */
  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      guestId: z.string().uuid().optional(),
      giftName: z.string().min(1),
      description: z.string().optional(),
      categoryId: z.string().uuid().optional(),
      giftType: giftTypeEnum,
      monetaryValue: z.number().optional(),
      currency: z.string().length(3).default('USD'),
      registryName: z.string().optional(),
      registryUrl: z.string().url().optional(),
      isGroupGift: z.boolean().default(false),
      groupGiftOrganizer: z.string().optional(),
      groupGiftContributors: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Company ID required',
        })
      }

      const [data] = await ctx.db
        .insert(giftsEnhanced)
        .values({
          clientId: input.clientId,
          companyId: ctx.companyId,
          guestId: input.guestId,
          giftName: input.giftName,
          description: input.description,
          categoryId: input.categoryId,
          giftType: input.giftType,
          monetaryValue: input.monetaryValue?.toString(),
          currency: input.currency,
          registryName: input.registryName,
          registryUrl: input.registryUrl,
          isGroupGift: input.isGroupGift,
          groupGiftOrganizer: input.groupGiftOrganizer,
          groupGiftContributors: input.groupGiftContributors,
          tags: input.tags,
        })
        .returning()

      return data
    }),

  /**
   * Update gift
   *
   * @requires adminProcedure - Admin or company_admin only
   * @param id - Gift UUID
   * @returns Updated gift object
   */
  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      giftName: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.string().uuid().optional(),
      monetaryValue: z.number().optional(),
      deliveryStatus: deliveryStatusEnum.optional(),
      orderedDate: z.string().optional(),
      shippedDate: z.string().optional(),
      receivedDate: z.string().optional(),
      trackingNumber: z.string().optional(),
      internalNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const [data] = await ctx.db
        .update(giftsEnhanced)
        .set({
          giftName: updates.giftName,
          description: updates.description,
          categoryId: updates.categoryId,
          monetaryValue: updates.monetaryValue?.toString(),
          deliveryStatus: updates.deliveryStatus,
          orderedDate: updates.orderedDate,
          shippedDate: updates.shippedDate,
          receivedDate: updates.receivedDate,
          trackingNumber: updates.trackingNumber,
          internalNotes: updates.internalNotes,
          updatedAt: new Date(),
        })
        .where(and(
          eq(giftsEnhanced.id, id),
          eq(giftsEnhanced.companyId, ctx.companyId!)
        ))
        .returning()

      return data
    }),

  /**
   * Mark thank you note as sent
   *
   * @requires adminProcedure - Admin or company_admin only
   * @param id - Gift UUID
   * @param thankYouNote - Optional thank you note text
   * @returns Updated gift object
   */
  markThankYouSent: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      thankYouNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().split('T')[0]

      const [data] = await ctx.db
        .update(giftsEnhanced)
        .set({
          thankYouSent: true,
          thankYouSentDate: today,
          thankYouNote: input.thankYouNote,
          updatedAt: new Date(),
        })
        .where(and(
          eq(giftsEnhanced.id, input.id),
          eq(giftsEnhanced.companyId, ctx.companyId!)
        ))
        .returning()

      return data
    }),

  /**
   * Get thank you notes due
   *
   * @requires protectedProcedure - User must be authenticated
   * @param daysAhead - Number of days ahead to check (default 7)
   * @returns Array of gifts with thank you notes due
   */
  getThankYouNotesDue: protectedProcedure
    .input(z.object({
      daysAhead: z.number().int().min(1).max(90).default(7),
    }))
    .query(async ({ ctx, input }) => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + input.daysAhead)
      const futureDateStr = futureDate.toISOString().split('T')[0]

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
        .where(and(
          eq(giftsEnhanced.companyId, ctx.companyId!),
          eq(giftsEnhanced.thankYouSent, false),
          lt(giftsEnhanced.thankYouDueDate, futureDateStr)
        ))
        .orderBy(giftsEnhanced.thankYouDueDate)

      return data.map(row => ({
        ...row.gift,
        guests: row.guest,
      }))
    }),

  /**
   * Get gift statistics
   *
   * @requires protectedProcedure - User must be authenticated
   * @param clientId - Client UUID
   * @returns Gift statistics for the client
   */
  getStats: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const allGifts = await ctx.db
        .select()
        .from(giftsEnhanced)
        .where(eq(giftsEnhanced.clientId, input.clientId))

      const totalGifts = allGifts.length
      const totalValue = allGifts.reduce((sum, g) => {
        const value = g.giftType === 'cash'
          ? Number(g.monetaryValue || 0)
          : Number(g.estimatedValue || g.monetaryValue || 0)
        return sum + value
      }, 0)
      const thankYousSent = allGifts.filter(g => g.thankYouSent).length
      const thankYousPending = totalGifts - thankYousSent

      return {
        totalGifts,
        totalValue,
        thankYousSent,
        thankYousPending,
      }
    }),

  /**
   * Delete gift
   *
   * @requires adminProcedure - Admin or company_admin only
   * @param id - Gift UUID
   * @returns Success status
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(giftsEnhanced)
        .where(and(
          eq(giftsEnhanced.id, input.id),
          eq(giftsEnhanced.companyId, ctx.companyId!)
        ))

      return { success: true }
    }),

  // ===== GIFT CATEGORIES =====

  /**
   * List gift categories
   *
   * @requires protectedProcedure - User must be authenticated
   * @returns Array of gift categories for the company
   */
  listCategories: protectedProcedure
    .query(async ({ ctx }) => {
      const data = await ctx.db
        .select()
        .from(giftCategories)
        .where(eq(giftCategories.companyId, ctx.companyId!))
        .orderBy(giftCategories.name)

      return data
    }),

  /**
   * Create gift category
   *
   * @requires adminProcedure - Admin or company_admin only
   * @param name - Category name
   * @param icon - Optional emoji or icon name
   * @param color - Optional hex color code
   * @returns Created category object
   */
  createCategory: adminProcedure
    .input(z.object({
      name: z.string(),
      icon: z.string().optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [data] = await ctx.db
        .insert(giftCategories)
        .values({
          companyId: ctx.companyId!,
          name: input.name,
          icon: input.icon,
          color: input.color,
        })
        .returning()

      return data
    }),

  // ===== THANK YOU NOTE TEMPLATES =====

  /**
   * List thank you note templates
   *
   * @requires protectedProcedure - User must be authenticated
   * @returns Array of templates for the company
   */
  listTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      const data = await ctx.db
        .select()
        .from(thankYouNoteTemplates)
        .where(eq(thankYouNoteTemplates.companyId, ctx.companyId!))
        .orderBy(desc(thankYouNoteTemplates.isDefault), thankYouNoteTemplates.name)

      return data
    }),

  /**
   * Create thank you note template
   *
   * @requires adminProcedure - Admin or company_admin only
   * @param name - Template name
   * @param templateText - Template text with variables
   * @param isDefault - Whether this is the default template
   * @returns Created template object
   */
  createTemplate: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      templateText: z.string().min(1),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const [data] = await ctx.db
        .insert(thankYouNoteTemplates)
        .values({
          companyId: ctx.companyId!,
          name: input.name,
          templateText: input.templateText,
          isDefault: input.isDefault,
        })
        .returning()

      return data
    }),

  /**
   * Update thank you note template
   *
   * @requires adminProcedure - Admin or company_admin only
   * @param id - Template UUID
   * @returns Updated template object
   */
  updateTemplate: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      templateText: z.string().min(1).optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      const [data] = await ctx.db
        .update(thankYouNoteTemplates)
        .set({
          name: updates.name,
          templateText: updates.templateText,
          isDefault: updates.isDefault,
          updatedAt: new Date(),
        })
        .where(and(
          eq(thankYouNoteTemplates.id, id),
          eq(thankYouNoteTemplates.companyId, ctx.companyId!)
        ))
        .returning()

      return data
    }),

  /**
   * Delete thank you note template
   *
   * @requires adminProcedure - Admin or company_admin only
   * @param id - Template UUID
   * @returns Success status
   */
  deleteTemplate: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(thankYouNoteTemplates)
        .where(and(
          eq(thankYouNoteTemplates.id, input.id),
          eq(thankYouNoteTemplates.companyId, ctx.companyId!)
        ))

      return { success: true }
    }),

  // ===== REMINDERS & REPORTS =====

  /**
   * Get overdue thank you notes
   *
   * @requires protectedProcedure - User must be authenticated
   * @param clientId - Client UUID
   * @returns Array of gifts with overdue thank you notes
   */
  getOverdueThankYous: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const today = new Date().toISOString().split('T')[0]

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
        .where(and(
          eq(giftsEnhanced.clientId, input.clientId),
          eq(giftsEnhanced.companyId, ctx.companyId!),
          eq(giftsEnhanced.thankYouSent, false),
          lt(giftsEnhanced.thankYouDueDate, today)
        ))
        .orderBy(giftsEnhanced.thankYouDueDate)

      return data.map(row => ({
        ...row.gift,
        guests: row.guest,
      }))
    }),

  /**
   * Get total gift value for a client
   *
   * @requires protectedProcedure - User must be authenticated
   * @param clientId - Client UUID
   * @returns Total monetary value of all gifts
   */
  getTotalValue: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const data = await ctx.db
        .select({
          monetaryValue: giftsEnhanced.monetaryValue,
          estimatedValue: giftsEnhanced.estimatedValue,
          giftType: giftsEnhanced.giftType,
        })
        .from(giftsEnhanced)
        .where(and(
          eq(giftsEnhanced.clientId, input.clientId),
          eq(giftsEnhanced.companyId, ctx.companyId!)
        ))

      // Calculate total value client-side
      const total = data.reduce((sum, gift) => {
        if (gift.giftType === 'cash' && gift.monetaryValue) {
          return sum + Number(gift.monetaryValue)
        }
        return sum + Number(gift.estimatedValue || gift.monetaryValue || 0)
      }, 0)

      return total
    }),

  /**
   * Get most generous guests
   *
   * @requires protectedProcedure - User must be authenticated
   * @param clientId - Client UUID
   * @param limit - Maximum number of guests to return
   * @returns Array of guests sorted by gift value
   */
  getMostGenerous: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      limit: z.number().int().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const data = await ctx.db
        .select({
          guestId: giftsEnhanced.guestId,
          monetaryValue: giftsEnhanced.monetaryValue,
          estimatedValue: giftsEnhanced.estimatedValue,
          giftType: giftsEnhanced.giftType,
          guest: {
            id: guests.id,
            firstName: guests.firstName,
            lastName: guests.lastName,
          },
        })
        .from(giftsEnhanced)
        .leftJoin(guests, eq(giftsEnhanced.guestId, guests.id))
        .where(and(
          eq(giftsEnhanced.clientId, input.clientId),
          eq(giftsEnhanced.companyId, ctx.companyId!)
        ))

      // Group by guest and calculate totals
      const guestMap = new Map<string, {
        guest_id: string
        guest_name: string
        total_value: number
        gift_count: number
      }>()

      for (const gift of data) {
        if (!gift.guestId || !gift.guest?.id) continue

        const value = gift.giftType === 'cash'
          ? Number(gift.monetaryValue || 0)
          : Number(gift.estimatedValue || gift.monetaryValue || 0)

        const existing = guestMap.get(gift.guestId)
        if (existing) {
          existing.total_value += value
          existing.gift_count += 1
        } else {
          guestMap.set(gift.guestId, {
            guest_id: gift.guestId,
            guest_name: `${gift.guest.firstName} ${gift.guest.lastName}`,
            total_value: value,
            gift_count: 1,
          })
        }
      }

      // Sort and limit
      return Array.from(guestMap.values())
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, input.limit)
    }),
})
