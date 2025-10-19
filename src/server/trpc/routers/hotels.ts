import { router, adminProcedure } from '../trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const hotelsRouter = router({
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

      // Fetch hotels
      const { data: hotels, error } = await ctx.supabase
        .from('hotels')
        .select('*')
        .eq('client_id', input.clientId)
        .order('guest_name', { ascending: true })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return hotels || []
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: hotel, error } = await ctx.supabase
        .from('hotels')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error || !hotel) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return hotel
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      guestId: z.string().uuid().optional(),
      guestName: z.string().min(1),
      hotelName: z.string().optional(),
      roomNumber: z.string().optional(),
      roomType: z.string().optional(),
      checkInDate: z.string().optional(),
      checkOutDate: z.string().optional(),
      accommodationNeeded: z.boolean().default(true),
      cost: z.number().optional(),
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

      // Create hotel record
      const { data: hotel, error } = await ctx.supabase
        .from('hotels')
        .insert({
          client_id: input.clientId,
          guest_id: input.guestId,
          guest_name: input.guestName,
          hotel_name: input.hotelName,
          room_number: input.roomNumber,
          room_type: input.roomType,
          check_in_date: input.checkInDate,
          check_out_date: input.checkOutDate,
          accommodation_needed: input.accommodationNeeded,
          cost: input.cost,
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

      return hotel
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        guestName: z.string().optional(),
        hotelName: z.string().optional(),
        roomNumber: z.string().optional(),
        roomType: z.string().optional(),
        checkInDate: z.string().optional(),
        checkOutDate: z.string().optional(),
        accommodationNeeded: z.boolean().optional(),
        bookingConfirmed: z.boolean().optional(),
        checkedIn: z.boolean().optional(),
        cost: z.number().optional(),
        paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
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

      if (input.data.guestName !== undefined) updateData.guest_name = input.data.guestName
      if (input.data.hotelName !== undefined) updateData.hotel_name = input.data.hotelName
      if (input.data.roomNumber !== undefined) updateData.room_number = input.data.roomNumber
      if (input.data.roomType !== undefined) updateData.room_type = input.data.roomType
      if (input.data.checkInDate !== undefined) updateData.check_in_date = input.data.checkInDate
      if (input.data.checkOutDate !== undefined) updateData.check_out_date = input.data.checkOutDate
      if (input.data.accommodationNeeded !== undefined) updateData.accommodation_needed = input.data.accommodationNeeded
      if (input.data.bookingConfirmed !== undefined) updateData.booking_confirmed = input.data.bookingConfirmed
      if (input.data.checkedIn !== undefined) updateData.checked_in = input.data.checkedIn
      if (input.data.cost !== undefined) updateData.cost = input.data.cost
      if (input.data.paymentStatus !== undefined) updateData.payment_status = input.data.paymentStatus
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update hotel
      const { data: hotel, error } = await ctx.supabase
        .from('hotels')
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

      return hotel
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { error } = await ctx.supabase
        .from('hotels')
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

  checkIn: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: hotel, error } = await ctx.supabase
        .from('hotels')
        .update({
          checked_in: true,
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

      return hotel
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

      // Get hotels
      const { data: hotels } = await ctx.supabase
        .from('hotels')
        .select('booking_confirmed, checked_in, accommodation_needed')
        .eq('client_id', input.clientId)

      const stats = {
        total: hotels?.length || 0,
        needingAccommodation: hotels?.filter(h => h.accommodation_needed).length || 0,
        bookingConfirmed: hotels?.filter(h => h.booking_confirmed).length || 0,
        checkedIn: hotels?.filter(h => h.checked_in).length || 0,
        pending: hotels?.filter(h => h.accommodation_needed && !h.booking_confirmed).length || 0,
      }

      return stats
    }),
})
