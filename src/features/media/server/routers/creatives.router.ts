import { router, adminProcedure, protectedProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, desc } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import { budget } from '@/lib/db/schema'

export const creativesRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company
      const [client] = await ctx.db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(
          eq(schema.clients.id, input.clientId),
          eq(schema.clients.companyId, ctx.companyId)
        ))
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch creative jobs
      const creativeJobs = await ctx.db
        .select()
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.clientId, input.clientId))
        .orderBy(desc(schema.creativeJobs.createdAt))

      return creativeJobs
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [creativeJob] = await ctx.db
        .select()
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.id, input.id))
        .limit(1)

      if (!creativeJob) {
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
      quantity: z.number().int().min(1).default(1),
      jobStartDate: z.string().optional(),
      dueDate: z.string().optional(),
      status: z.enum(['requested', 'in_progress', 'review', 'approved', 'completed']).optional(),
      assignedTo: z.string().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      notes: z.string().optional(),
      fileUrl: z.string().url().optional(),
      clientVisible: z.boolean().default(true),
      estimatedCost: z.number().optional(), // For budget integration
      currency: z.string().length(3).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client
      const [client] = await ctx.db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(
          eq(schema.clients.id, input.clientId),
          eq(schema.clients.companyId, ctx.companyId)
        ))
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const [creativeJob] = await ctx.db
        .insert(schema.creativeJobs)
        .values({
          clientId: input.clientId,
          jobType: input.jobType,
          title: input.title,
          description: input.description,
          quantity: input.quantity,
          jobStartDate: input.jobStartDate,
          dueDate: input.dueDate,
          status: input.status || 'requested',
          assignedTo: input.assignedTo,
          priority: input.priority || 'medium',
          notes: input.notes,
          fileUrl: input.fileUrl,
          clientVisible: input.clientVisible,
          approvalStatus: 'pending',
          estimatedCost: input.estimatedCost ? String(input.estimatedCost) : null,
          currency: input.currency || 'USD',
        })
        .returning()

      // Auto-create budget item for this creative job (seamless module integration)
      if (input.estimatedCost && input.estimatedCost > 0) {
        try {
          await ctx.db.insert(budget).values({
            clientId: input.clientId,
            category: input.jobType, // video, photo, graphic, invitation, other
            segment: 'creatives', // All creative costs go to creatives segment
            item: input.title,
            estimatedCost: String(input.estimatedCost),
            currency: input.currency || 'USD',
            paymentStatus: 'pending',
            clientVisible: input.clientVisible,
            isLumpSum: false,
            notes: `Auto-created from creative job: ${input.title}`,
          })
        } catch (budgetError) {
          // Log but don't fail - creative job was created successfully
          console.warn('Failed to auto-create budget item for creative job:', budgetError)
        }
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
        quantity: z.number().int().min(1).optional(),
        jobStartDate: z.string().optional(),
        dueDate: z.string().optional(),
        status: z.enum(['requested', 'in_progress', 'review', 'approved', 'completed']).optional(),
        assignedTo: z.string().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        notes: z.string().optional(),
        fileUrl: z.string().url().optional(),
        clientVisible: z.boolean().optional(),
        approvalStatus: z.enum(['pending', 'approved', 'rejected', 'revision_requested']).optional(),
        estimatedCost: z.number().optional(),
        currency: z.string().length(3).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const updateData: Partial<typeof schema.creativeJobs.$inferInsert> = {
        updatedAt: new Date(),
      }

      if (input.data.jobType !== undefined) updateData.jobType = input.data.jobType
      if (input.data.title !== undefined) updateData.title = input.data.title
      if (input.data.description !== undefined) updateData.description = input.data.description
      if (input.data.quantity !== undefined) updateData.quantity = input.data.quantity
      if (input.data.jobStartDate !== undefined) updateData.jobStartDate = input.data.jobStartDate
      if (input.data.dueDate !== undefined) updateData.dueDate = input.data.dueDate
      if (input.data.status !== undefined) updateData.status = input.data.status
      if (input.data.assignedTo !== undefined) updateData.assignedTo = input.data.assignedTo
      if (input.data.priority !== undefined) updateData.priority = input.data.priority
      if (input.data.notes !== undefined) updateData.notes = input.data.notes
      if (input.data.fileUrl !== undefined) updateData.fileUrl = input.data.fileUrl
      if (input.data.clientVisible !== undefined) updateData.clientVisible = input.data.clientVisible
      if (input.data.approvalStatus !== undefined) updateData.approvalStatus = input.data.approvalStatus
      if (input.data.estimatedCost !== undefined) updateData.estimatedCost = String(input.data.estimatedCost)
      if (input.data.currency !== undefined) updateData.currency = input.data.currency

      const [creativeJob] = await ctx.db
        .update(schema.creativeJobs)
        .set(updateData)
        .where(eq(schema.creativeJobs.id, input.id))
        .returning()

      if (!creativeJob) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return creativeJob
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      await ctx.db
        .delete(schema.creativeJobs)
        .where(eq(schema.creativeJobs.id, input.id))

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

      const [creativeJob] = await ctx.db
        .update(schema.creativeJobs)
        .set({
          status: input.status,
          updatedAt: new Date()
        })
        .where(eq(schema.creativeJobs.id, input.id))
        .returning()

      if (!creativeJob) {
        throw new TRPCError({ code: 'NOT_FOUND' })
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
      const [client] = await ctx.db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(and(
          eq(schema.clients.id, input.clientId),
          eq(schema.clients.companyId, ctx.companyId)
        ))
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get all creative jobs
      const creativeJobs = await ctx.db
        .select()
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.clientId, input.clientId))

      const now = Date.now()
      const total = creativeJobs.length
      const requested = creativeJobs.filter(j => j.status === 'requested').length
      const inProgress = creativeJobs.filter(j => j.status === 'in_progress').length
      const inReview = creativeJobs.filter(j => j.status === 'review').length
      const approved = creativeJobs.filter(j => j.approvalStatus === 'approved').length
      const completed = creativeJobs.filter(j => j.status === 'completed').length
      const pendingApproval = creativeJobs.filter(j => j.approvalStatus === 'pending' && j.status === 'review').length
      const revisionRequested = creativeJobs.filter(j => j.approvalStatus === 'revision_requested').length

      const overdue = creativeJobs.filter(j => {
        if (!j.dueDate || j.status === 'completed') return false
        const dueDate = new Date(j.dueDate).getTime()
        return dueDate < now
      }).length

      const highPriority = creativeJobs.filter(j => j.priority === 'high' && j.status !== 'completed').length

      return {
        total,
        requested,
        inProgress,
        inReview,
        approved,
        completed,
        pendingApproval,
        revisionRequested,
        overdue,
        highPriority,
      }
    }),

  // Portal procedures for client access
  getForPortal: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Get user's internal ID from auth ID
      const [user] = await ctx.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, ctx.userId))
        .limit(1)

      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' })
      }

      // Verify user has access to this client
      const [clientAccess] = await ctx.db
        .select({ id: schema.clientUsers.id })
        .from(schema.clientUsers)
        .where(and(
          eq(schema.clientUsers.clientId, input.clientId),
          eq(schema.clientUsers.userId, user.id)
        ))
        .limit(1)

      if (!clientAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this client' })
      }

      // Fetch only client-visible creative jobs
      const creativeJobs = await ctx.db
        .select()
        .from(schema.creativeJobs)
        .where(and(
          eq(schema.creativeJobs.clientId, input.clientId),
          eq(schema.creativeJobs.clientVisible, true)
        ))
        .orderBy(desc(schema.creativeJobs.createdAt))

      return creativeJobs
    }),

  // Client approval action
  clientApprove: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      approved: z.boolean(),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Get user's internal ID from auth ID
      const [user] = await ctx.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, ctx.userId))
        .limit(1)

      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' })
      }

      // Get the creative job to check client access
      const [creativeJob] = await ctx.db
        .select({
          clientId: schema.creativeJobs.clientId,
          clientVisible: schema.creativeJobs.clientVisible
        })
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.id, input.id))
        .limit(1)

      if (!creativeJob || !creativeJob.clientVisible) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Verify user has access to this client
      const [clientAccess] = await ctx.db
        .select({ id: schema.clientUsers.id })
        .from(schema.clientUsers)
        .where(and(
          eq(schema.clientUsers.clientId, creativeJob.clientId),
          eq(schema.clientUsers.userId, user.id)
        ))
        .limit(1)

      if (!clientAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this client' })
      }

      // Update approval status
      const [updatedJob] = await ctx.db
        .update(schema.creativeJobs)
        .set({
          approvalStatus: input.approved ? 'approved' : 'rejected',
          approvalComments: input.comments || null,
          approvedBy: user.id,
          approvedAt: new Date(),
          status: input.approved ? 'approved' : 'review',
          updatedAt: new Date()
        })
        .where(eq(schema.creativeJobs.id, input.id))
        .returning()

      if (!updatedJob) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }

      return updatedJob
    }),

  // Client request revision
  clientRequestRevision: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      comments: z.string().min(1, 'Please provide feedback for the revision'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Get user's internal ID from auth ID
      const [user] = await ctx.db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, ctx.userId))
        .limit(1)

      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' })
      }

      // Get the creative job
      const [creativeJob] = await ctx.db
        .select({
          clientId: schema.creativeJobs.clientId,
          clientVisible: schema.creativeJobs.clientVisible,
          revisionCount: schema.creativeJobs.revisionCount
        })
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.id, input.id))
        .limit(1)

      if (!creativeJob || !creativeJob.clientVisible) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Verify user has access to this client
      const [clientAccess] = await ctx.db
        .select({ id: schema.clientUsers.id })
        .from(schema.clientUsers)
        .where(and(
          eq(schema.clientUsers.clientId, creativeJob.clientId),
          eq(schema.clientUsers.userId, user.id)
        ))
        .limit(1)

      if (!clientAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this client' })
      }

      // Update with revision request
      const [updatedJob] = await ctx.db
        .update(schema.creativeJobs)
        .set({
          approvalStatus: 'revision_requested',
          approvalComments: input.comments,
          approvedBy: user.id,
          approvedAt: new Date(),
          status: 'in_progress',
          revisionCount: (creativeJob.revisionCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(schema.creativeJobs.id, input.id))
        .returning()

      if (!updatedJob) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }

      return updatedJob
    }),
})
