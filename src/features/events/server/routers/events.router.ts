import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const eventsRouter = router({
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

      // Fetch events
      const { data: events, error } = await ctx.supabase
        .from('events')
        .select('*')
        .eq('client_id', input.clientId)
        .order('event_date', { ascending: true })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return events || []
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: event, error } = await ctx.supabase
        .from('events')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error || !event) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return event
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      eventType: z.string().optional(),
      eventDate: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      venueName: z.string().optional(),
      address: z.string().optional(),
      guestCount: z.number().int().optional(),
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

      // Create event
      const { data: event, error } = await ctx.supabase
        .from('events')
        .insert({
          client_id: input.clientId,
          title: input.title,
          description: input.description,
          event_type: input.eventType,
          event_date: input.eventDate,
          start_time: input.startTime,
          end_time: input.endTime,
          location: input.location,
          venue_name: input.venueName,
          address: input.address,
          guest_count: input.guestCount,
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

      return event
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        eventType: z.string().optional(),
        eventDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        location: z.string().optional(),
        venueName: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']).optional(),
        guestCount: z.number().int().optional(),
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

      if (input.data.title !== undefined) updateData.title = input.data.title
      if (input.data.description !== undefined) updateData.description = input.data.description
      if (input.data.eventType !== undefined) updateData.event_type = input.data.eventType
      if (input.data.eventDate !== undefined) updateData.event_date = input.data.eventDate
      if (input.data.startTime !== undefined) updateData.start_time = input.data.startTime
      if (input.data.endTime !== undefined) updateData.end_time = input.data.endTime
      if (input.data.location !== undefined) updateData.location = input.data.location
      if (input.data.venueName !== undefined) updateData.venue_name = input.data.venueName
      if (input.data.address !== undefined) updateData.address = input.data.address
      if (input.data.status !== undefined) updateData.status = input.data.status
      if (input.data.guestCount !== undefined) updateData.guest_count = input.data.guestCount
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update event
      const { data: event, error } = await ctx.supabase
        .from('events')
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

      return event
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { error } = await ctx.supabase
        .from('events')
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

  updateStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['planned', 'confirmed', 'completed', 'cancelled']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: event, error } = await ctx.supabase
        .from('events')
        .update({
          status: input.status,
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

      return event
    }),

  getUpcoming: adminProcedure
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

      // Get today's date
      const today = new Date().toISOString().split('T')[0]

      // Fetch upcoming events
      const { data: events, error } = await ctx.supabase
        .from('events')
        .select('*')
        .eq('client_id', input.clientId)
        .gte('event_date', today)
        .order('event_date', { ascending: true })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return events || []
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

      // Get events
      const { data: events } = await ctx.supabase
        .from('events')
        .select('status')
        .eq('client_id', input.clientId)

      const stats = {
        total: events?.length || 0,
        planned: events?.filter(e => e.status === 'planned').length || 0,
        confirmed: events?.filter(e => e.status === 'confirmed').length || 0,
        completed: events?.filter(e => e.status === 'completed').length || 0,
        cancelled: events?.filter(e => e.status === 'cancelled').length || 0,
      }

      return stats
    }),
})
