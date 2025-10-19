import { router, adminProcedure } from '../trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const giftsRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch gifts
      const { data: gifts, error } = await ctx.supabase
        .from('gifts')
        .select('*')
        .eq('client_id', input.clientId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return gifts || []
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: gift, error } = await ctx.supabase
        .from('gifts')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error || !gift) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return gift
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      giftName: z.string().min(1),
      fromName: z.string().optional(),
      fromEmail: z.string().email().optional(),
      deliveryDate: z.string().optional(),
      deliveryStatus: z.enum(['pending', 'received', 'returned']).default('pending'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Create gift
      const { data: gift, error } = await ctx.supabase
        .from('gifts')
        .insert({
          client_id: input.clientId,
          gift_name: input.giftName,
          from_name: input.fromName,
          from_email: input.fromEmail,
          delivery_date: input.deliveryDate,
          delivery_status: input.deliveryStatus,
          notes: input.notes,
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
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
        fromEmail: z.string().email().optional(),
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
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (input.data.giftName !== undefined) updateData.gift_name = input.data.giftName
      if (input.data.fromName !== undefined) updateData.from_name = input.data.fromName
      if (input.data.fromEmail !== undefined) updateData.from_email = input.data.fromEmail
      if (input.data.deliveryDate !== undefined) updateData.delivery_date = input.data.deliveryDate
      if (input.data.deliveryStatus !== undefined) updateData.delivery_status = input.data.deliveryStatus
      if (input.data.thankYouSent !== undefined) updateData.thank_you_sent = input.data.thankYouSent
      if (input.data.thankYouSentDate !== undefined) updateData.thank_you_sent_date = input.data.thankYouSentDate
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update gift
      const { data: gift, error } = await ctx.supabase
        .from('gifts')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return gift
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { error } = await ctx.supabase
        .from('gifts')
        .delete()
        .eq('id', input.id)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

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

      const { data: gift, error } = await ctx.supabase
        .from('gifts')
        .update({
          thank_you_sent: true,
          thank_you_sent_date: input.sentDate || new Date().toISOString().split('T')[0], // YYYY-MM-DD
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
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
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get gifts
      const { data: gifts } = await ctx.supabase
        .from('gifts')
        .select('delivery_status, thank_you_sent')
        .eq('client_id', input.clientId)

      const stats = {
        total: gifts?.length || 0,
        received: gifts?.filter(g => g.delivery_status === 'received').length || 0,
        pending: gifts?.filter(g => g.delivery_status === 'pending').length || 0,
        returned: gifts?.filter(g => g.delivery_status === 'returned').length || 0,
        thankYouSent: gifts?.filter(g => g.thank_you_sent).length || 0,
        thankYouPending: gifts?.filter(g => g.delivery_status === 'received' && !g.thank_you_sent).length || 0,
      }

      return stats
    }),
})
