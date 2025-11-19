import { router, adminProcedure, protectedProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const guestsRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company (session claims)
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.clientId)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        })
      }

      // Fetch all guests (RLS filters by company automatically)
      const { data: guests, error } = await ctx.supabase
        .from('guests')
        .select('*')
        .eq('client_id', input.clientId)
        .order('first_name', { ascending: true })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return guests || []
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Fetch guest (RLS ensures company access)
      const { data: guest, error } = await ctx.supabase
        .from('guests')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error || !guest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Guest not found'
        })
      }

      return guest
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      groupName: z.string().optional(),
      plusOne: z.boolean().default(false),
      dietaryRestrictions: z.string().optional(),
      accessibilityNeeds: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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

      // Create guest - split name into first/last
      const nameParts = input.name.trim().split(' ')
      const firstName = nameParts[0] || input.name
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

      const { data: guest, error } = await ctx.supabase
        .from('guests')
        .insert({
          client_id: input.clientId,
          first_name: firstName,
          last_name: lastName,
          email: input.email,
          phone: input.phone,
          group_name: input.groupName,
          plus_one_allowed: input.plusOne,
          dietary_restrictions: input.dietaryRestrictions,
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

      return guest
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        groupName: z.string().optional(),
        rsvpStatus: z.enum(['pending', 'accepted', 'declined']).optional(),
        dietaryRestrictions: z.string().optional(),
        accessibilityNeeds: z.string().optional(),
        plusOne: z.boolean().optional(),
        checkedIn: z.boolean().optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Build update object (convert camelCase to snake_case)
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (input.data.name !== undefined) {
        const nameParts = input.data.name.trim().split(' ')
        updateData.first_name = nameParts[0] || input.data.name
        updateData.last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
      }
      if (input.data.email !== undefined) updateData.email = input.data.email
      if (input.data.phone !== undefined) updateData.phone = input.data.phone
      if (input.data.groupName !== undefined) updateData.group_name = input.data.groupName
      if (input.data.rsvpStatus !== undefined) updateData.rsvp_status = input.data.rsvpStatus
      if (input.data.dietaryRestrictions !== undefined) updateData.dietary_restrictions = input.data.dietaryRestrictions
      if (input.data.plusOne !== undefined) updateData.plus_one_allowed = input.data.plusOne
      if (input.data.checkedIn !== undefined) updateData.checked_in = input.data.checkedIn
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update guest (RLS ensures company access)
      const { data: guest, error } = await ctx.supabase
        .from('guests')
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

      return guest
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Delete guest (RLS ensures company access)
      const { error } = await ctx.supabase
        .from('guests')
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

  bulkImport: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      guests: z.array(z.object({
        name: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        groupName: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
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

      // Prepare guest records
      const guestRecords = input.guests.map(g => {
        const nameParts = g.name.trim().split(' ')
        return {
          client_id: input.clientId,
          first_name: nameParts[0] || g.name,
          last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
          email: g.email,
          phone: g.phone,
          group_name: g.groupName,
        }
      })

      // Bulk insert
      const { data, error } = await ctx.supabase
        .from('guests')
        .insert(guestRecords)
        .select()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return {
        count: data?.length || 0,
        guests: data || []
      }
    }),

  getStats: adminProcedure
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

      // Get all guests for stats calculation
      const { data: guests } = await ctx.supabase
        .from('guests')
        .select('rsvp_status, checked_in')
        .eq('client_id', input.clientId)

      const stats = {
        total: guests?.length || 0,
        attending: guests?.filter(g => g.rsvp_status === 'accepted').length || 0,
        declined: guests?.filter(g => g.rsvp_status === 'declined').length || 0,
        pending: guests?.filter(g => !g.rsvp_status || g.rsvp_status === 'pending').length || 0,
        checkedIn: guests?.filter(g => g.checked_in === true).length || 0,
      }

      return stats
    }),

  updateRSVP: protectedProcedure
    .input(z.object({
      guestId: z.string().uuid(),
      rsvpStatus: z.enum(['pending', 'accepted', 'declined']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Update RSVP (RLS ensures proper access)
      const { data: guest, error } = await ctx.supabase
        .from('guests')
        .update({
          rsvp_status: input.rsvpStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.guestId)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return guest
    }),
})
