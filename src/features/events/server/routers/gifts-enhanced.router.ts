// @ts-nocheck - Temporary workaround for Supabase TypeScript inference issues (tables not yet in generated types)
/**
 * Enhanced Gift Tracking Router
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
 * Dependencies:
 * - Supabase (gifts_enhanced, gift_categories tables)
 * - Clerk (authentication via session claims)
 *
 * @see SESSION_51: Gift Tracking & Management
 */

import { router, protectedProcedure, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

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

      let query = ctx.supabase
        .from('gifts_enhanced')
        .select(`
          *,
          guests(first_name, last_name, email),
          gift_categories(name, icon, color)
        `)
        .eq('client_id', input.clientId)
        .eq('company_id', ctx.companyId)
        .order('created_at', { ascending: false })

      if (input.search) {
        query = query.ilike('gift_name', `%${input.search}%`)
      }

      if (input.deliveryStatus) {
        query = query.eq('delivery_status', input.deliveryStatus)
      }

      if (input.thankYouSent !== undefined) {
        query = query.eq('thank_you_sent', input.thankYouSent)
      }

      const { data, error } = await query

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

      return data || []
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
      const { data, error } = await ctx.supabase
        .from('gifts_enhanced')
        .select('*, guests(*), gift_categories(*)')
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)
        .maybeSingle()

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

      if (!data) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Gift not found',
      })

      return data
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

      const { data, error } = await ctx.supabase
        .from('gifts_enhanced')
        .insert({
          client_id: input.clientId,
          company_id: ctx.companyId,
          guest_id: input.guestId,
          gift_name: input.giftName,
          description: input.description,
          category_id: input.categoryId,
          gift_type: input.giftType,
          monetary_value: input.monetaryValue,
          currency: input.currency,
          registry_name: input.registryName,
          registry_url: input.registryUrl,
          is_group_gift: input.isGroupGift,
          group_gift_organizer: input.groupGiftOrganizer,
          group_gift_contributors: input.groupGiftContributors,
          tags: input.tags,
        })
        .select()
        .single()

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

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

      const { data, error } = await ctx.supabase
        .from('gifts_enhanced')
        .update({
          gift_name: updates.giftName,
          description: updates.description,
          category_id: updates.categoryId,
          monetary_value: updates.monetaryValue,
          delivery_status: updates.deliveryStatus,
          ordered_date: updates.orderedDate,
          shipped_date: updates.shippedDate,
          received_date: updates.receivedDate,
          tracking_number: updates.trackingNumber,
          internal_notes: updates.internalNotes,
        })
        .eq('id', id)
        .eq('company_id', ctx.companyId)
        .select()
        .single()

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

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
      const { data, error } = await ctx.supabase
        .from('gifts_enhanced')
        .update({
          thank_you_sent: true,
          thank_you_sent_date: new Date().toISOString(),
          thank_you_note: input.thankYouNote,
        })
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)
        .select()
        .single()

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

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
      const { data, error } = await ctx.supabase
        .rpc('get_thank_you_notes_due', {
          p_company_id: ctx.companyId,
          p_days_ahead: input.daysAhead,
        })

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

      return data || []
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
      const { data, error } = await ctx.supabase
        .rpc('get_gift_stats', {
          p_client_id: input.clientId,
        })

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

      return data?.[0] || null
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
      const { error } = await ctx.supabase
        .from('gifts_enhanced')
        .delete()
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

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
      const { data, error } = await ctx.supabase
        .from('gift_categories')
        .select('*')
        .eq('company_id', ctx.companyId)
        .order('name')

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

      return data || []
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
      const { data, error } = await ctx.supabase
        .from('gift_categories')
        .insert({
          company_id: ctx.companyId,
          name: input.name,
          icon: input.icon,
          color: input.color,
        })
        .select()
        .single()

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

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
      const { data, error } = await ctx.supabase
        .from('thank_you_note_templates')
        .select('*')
        .eq('company_id', ctx.companyId)
        .order('is_default', { ascending: false })
        .order('name')

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

      return data || []
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
      const { data, error } = await ctx.supabase
        .from('thank_you_note_templates')
        .insert({
          company_id: ctx.companyId,
          name: input.name,
          template_text: input.templateText,
          is_default: input.isDefault,
        })
        .select()
        .single()

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

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

      const { data, error } = await ctx.supabase
        .from('thank_you_note_templates')
        .update({
          name: updates.name,
          template_text: updates.templateText,
          is_default: updates.isDefault,
        })
        .eq('id', id)
        .eq('company_id', ctx.companyId)
        .select()
        .single()

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

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
      const { error } = await ctx.supabase
        .from('thank_you_note_templates')
        .delete()
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

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
      const { data, error } = await ctx.supabase
        .from('gifts_enhanced')
        .select(`
          *,
          guests(first_name, last_name, email)
        `)
        .eq('client_id', input.clientId)
        .eq('company_id', ctx.companyId)
        .eq('thank_you_sent', false)
        .lt('thank_you_due_date', new Date().toISOString())
        .order('thank_you_due_date')

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

      return data || []
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
      const { data, error } = await ctx.supabase
        .from('gifts_enhanced')
        .select('monetary_value, estimated_value, gift_type')
        .eq('client_id', input.clientId)
        .eq('company_id', ctx.companyId)

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

      // Calculate total value client-side
      const total = (data || []).reduce((sum, gift) => {
        if (gift.gift_type === 'cash' && gift.monetary_value) {
          return sum + Number(gift.monetary_value)
        }
        return sum + Number(gift.estimated_value || gift.monetary_value || 0)
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
      const { data, error } = await ctx.supabase
        .from('gifts_enhanced')
        .select(`
          guest_id,
          monetary_value,
          estimated_value,
          gift_type,
          guests(id, first_name, last_name)
        `)
        .eq('client_id', input.clientId)
        .eq('company_id', ctx.companyId)
        .not('guest_id', 'is', null)

      if (error) throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })

      // Group by guest and calculate totals
      const guestMap = new Map<string, any>()

      for (const gift of data || []) {
        if (!gift.guest_id || !gift.guests) continue

        const value = gift.gift_type === 'cash'
          ? Number(gift.monetary_value || 0)
          : Number(gift.estimated_value || gift.monetary_value || 0)

        const existing = guestMap.get(gift.guest_id)
        if (existing) {
          existing.total_value += value
          existing.gift_count += 1
        } else {
          guestMap.set(gift.guest_id, {
            guest_id: gift.guest_id,
            guest_name: `${gift.guests.first_name} ${gift.guests.last_name}`,
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
