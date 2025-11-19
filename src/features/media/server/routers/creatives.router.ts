import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const creativesRouter = router({
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

      // Fetch creative jobs
      const { data: creativeJobs, error } = await ctx.supabase
        .from('creative_jobs')
        .select('*')
        .eq('client_id', input.clientId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return creativeJobs || []
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: creativeJob, error } = await ctx.supabase
        .from('creative_jobs')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error || !creativeJob) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return creativeJob
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      jobType: z.enum(['video', 'photo', 'graphic', 'invitation', 'other']),
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      status: z.enum(['requested', 'in_progress', 'review', 'approved', 'completed']).optional(),
      assignedTo: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      notes: z.string().optional(),
      fileUrl: z.string().url().optional(),
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

      const { data: creativeJob, error } = await ctx.supabase
        .from('creative_jobs')
        .insert({
          client_id: input.clientId,
          job_type: input.jobType,
          title: input.title,
          description: input.description,
          due_date: input.dueDate,
          status: input.status || 'requested',
          assigned_to: input.assignedTo,
          priority: input.priority || 'medium',
          notes: input.notes,
          file_url: input.fileUrl,
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return creativeJob
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        jobType: z.enum(['video', 'photo', 'graphic', 'invitation', 'other']).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        status: z.enum(['requested', 'in_progress', 'review', 'approved', 'completed']).optional(),
        assignedTo: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        notes: z.string().optional(),
        fileUrl: z.string().url().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const updateData: any = {}
      if (input.data.jobType !== undefined) updateData.job_type = input.data.jobType
      if (input.data.title !== undefined) updateData.title = input.data.title
      if (input.data.description !== undefined) updateData.description = input.data.description
      if (input.data.dueDate !== undefined) updateData.due_date = input.data.dueDate
      if (input.data.status !== undefined) updateData.status = input.data.status
      if (input.data.assignedTo !== undefined) updateData.assigned_to = input.data.assignedTo
      if (input.data.priority !== undefined) updateData.priority = input.data.priority
      if (input.data.notes !== undefined) updateData.notes = input.data.notes
      if (input.data.fileUrl !== undefined) updateData.file_url = input.data.fileUrl

      const { error } = await ctx.supabase
        .from('creative_jobs')
        .update(updateData)
        .eq('id', input.id)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return { success: true }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { error } = await ctx.supabase
        .from('creative_jobs')
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
      status: z.enum(['requested', 'in_progress', 'review', 'approved', 'completed']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: creativeJob, error } = await ctx.supabase
        .from('creative_jobs')
        .update({ status: input.status })
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return creativeJob
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

      // Get all creative jobs
      const { data: creativeJobs } = await ctx.supabase
        .from('creative_jobs')
        .select('*')
        .eq('client_id', input.clientId)

      const now = Date.now()
      const total = creativeJobs?.length || 0
      const requested = creativeJobs?.filter(j => j.status === 'requested').length || 0
      const inProgress = creativeJobs?.filter(j => j.status === 'in_progress').length || 0
      const inReview = creativeJobs?.filter(j => j.status === 'review').length || 0
      const approved = creativeJobs?.filter(j => j.status === 'approved').length || 0
      const completed = creativeJobs?.filter(j => j.status === 'completed').length || 0

      const overdue = creativeJobs?.filter(j => {
        if (!j.due_date || j.status === 'completed') return false
        const dueDate = new Date(j.due_date).getTime()
        return dueDate < now
      }).length || 0

      const highPriority = creativeJobs?.filter(j => j.priority === 'high' && j.status !== 'completed').length || 0

      const stats = {
        total,
        requested,
        inProgress,
        inReview,
        approved,
        completed,
        overdue,
        highPriority,
      }

      return stats
    }),
})
