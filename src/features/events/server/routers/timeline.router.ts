import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const timelineRouter = router({
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

      // Fetch timeline items
      const { data: timelineItems, error } = await ctx.supabase
        .from('timeline')
        .select('*')
        .eq('client_id', input.clientId)
        .order('sort_order', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return timelineItems || []
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: timelineItem, error } = await ctx.supabase
        .from('timeline')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error || !timelineItem) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return timelineItem
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      startTime: z.string(),
      endTime: z.string().optional(),
      durationMinutes: z.number().int().optional(),
      location: z.string().optional(),
      responsiblePerson: z.string().optional(),
      sortOrder: z.number().int().default(0),
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

      // Create timeline item
      const { data: timelineItem, error } = await ctx.supabase
        .from('timeline')
        .insert({
          client_id: input.clientId,
          title: input.title,
          description: input.description,
          start_time: input.startTime,
          end_time: input.endTime,
          duration_minutes: input.durationMinutes,
          location: input.location,
          responsible_person: input.responsiblePerson,
          sort_order: input.sortOrder,
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

      return timelineItem
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        durationMinutes: z.number().int().optional(),
        location: z.string().optional(),
        responsiblePerson: z.string().optional(),
        sortOrder: z.number().int().optional(),
        completed: z.boolean().optional(),
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
      if (input.data.startTime !== undefined) updateData.start_time = input.data.startTime
      if (input.data.endTime !== undefined) updateData.end_time = input.data.endTime
      if (input.data.durationMinutes !== undefined) updateData.duration_minutes = input.data.durationMinutes
      if (input.data.location !== undefined) updateData.location = input.data.location
      if (input.data.responsiblePerson !== undefined) updateData.responsible_person = input.data.responsiblePerson
      if (input.data.sortOrder !== undefined) updateData.sort_order = input.data.sortOrder
      if (input.data.completed !== undefined) updateData.completed = input.data.completed
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update timeline item
      const { data: timelineItem, error } = await ctx.supabase
        .from('timeline')
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

      return timelineItem
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { error } = await ctx.supabase
        .from('timeline')
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

  reorder: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      itemIds: z.array(z.string().uuid()),
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

      // Update sort_order for each item
      const updates = input.itemIds.map((id, index) =>
        ctx.supabase
          .from('timeline')
          .update({ sort_order: index })
          .eq('id', id)
      )

      // Execute all updates
      await Promise.all(updates)

      return { success: true }
    }),

  markComplete: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      completed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: timelineItem, error } = await ctx.supabase
        .from('timeline')
        .update({
          completed: input.completed,
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

      return timelineItem
    }),

  detectConflicts: adminProcedure
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

      // Get all timeline items with times
      const { data: items } = await ctx.supabase
        .from('timeline')
        .select('id, title, start_time, end_time, duration_minutes')
        .eq('client_id', input.clientId)
        .order('start_time', { ascending: true })

      if (!items || items.length === 0) {
        return []
      }

      // Helper function to convert time to minutes
      const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
      }

      // Helper function to calculate end time
      const getEndTime = (item: any) => {
        if (item.end_time) {
          return timeToMinutes(item.end_time)
        } else if (item.duration_minutes) {
          return timeToMinutes(item.start_time) + item.duration_minutes
        }
        return timeToMinutes(item.start_time) + 60 // default 1 hour
      }

      // Detect conflicts
      const conflicts = []
      for (let i = 0; i < items.length - 1; i++) {
        const currentEnd = getEndTime(items[i])
        const nextStart = timeToMinutes(items[i + 1].start_time)

        if (currentEnd > nextStart) {
          conflicts.push({
            item1: items[i],
            item2: items[i + 1],
            overlapMinutes: currentEnd - nextStart,
          })
        }
      }

      return conflicts
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

      // Get timeline items
      const { data: items } = await ctx.supabase
        .from('timeline')
        .select('completed, duration_minutes')
        .eq('client_id', input.clientId)

      const totalDuration = items?.reduce((sum, item) => sum + (item.duration_minutes || 0), 0) || 0

      const stats = {
        total: items?.length || 0,
        completed: items?.filter(item => item.completed).length || 0,
        pending: items?.filter(item => !item.completed).length || 0,
        totalDuration, // in minutes
        totalDurationHours: Math.floor(totalDuration / 60),
        totalDurationMinutes: totalDuration % 60,
      }

      return stats
    }),
})
