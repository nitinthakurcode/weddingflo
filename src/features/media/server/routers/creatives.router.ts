/**
 * Creative Jobs Router
 * Simplified to match actual schema:
 * - creativeJobs: id, clientId, name, type, status, data (JSONB), createdAt, updatedAt
 * All extra fields are stored in the data JSONB field
 */

import { router, adminProcedure, protectedProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, desc, isNull } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'

interface CreativeJobData {
  description?: string
  quantity?: number
  jobStartDate?: string
  dueDate?: string
  assignedTo?: string
  priority?: string
  notes?: string
  fileUrl?: string
  clientVisible?: boolean
  approvalStatus?: string
  estimatedCost?: number
  currency?: string
  approvalComments?: string
  approvedBy?: string
  approvedAt?: string
  revisionCount?: number
}

export const creativesRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found' })
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

      const creativeJobs = await ctx.db
        .select()
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.clientId, input.clientId))
        .orderBy(desc(schema.creativeJobs.createdAt))

      return creativeJobs.map(job => ({
        ...job,
        ...(job.data as CreativeJobData || {}),
      }))
    }),

  /**
   * SECURITY: Verifies creative job belongs to a client owned by the user's company
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Join with clients to verify company ownership
      const [result] = await ctx.db
        .select({ creativeJob: schema.creativeJobs })
        .from(schema.creativeJobs)
        .innerJoin(schema.clients, eq(schema.creativeJobs.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.creativeJobs.id, input.id),
            eq(schema.clients.companyId, ctx.companyId),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return {
        ...result.creativeJob,
        ...(result.creativeJob.data as CreativeJobData || {}),
      }
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
      estimatedCost: z.number().optional(),
      currency: z.string().length(3).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

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

      const data: CreativeJobData = {
        description: input.description,
        quantity: input.quantity,
        jobStartDate: input.jobStartDate,
        dueDate: input.dueDate,
        assignedTo: input.assignedTo,
        priority: input.priority || 'medium',
        notes: input.notes,
        fileUrl: input.fileUrl,
        clientVisible: input.clientVisible,
        approvalStatus: 'pending',
        estimatedCost: input.estimatedCost,
        currency: input.currency || 'USD',
      }

      const [creativeJob] = await ctx.db
        .insert(schema.creativeJobs)
        .values({
          id: crypto.randomUUID(),
          clientId: input.clientId,
          name: input.title,
          type: input.jobType,
          status: input.status || 'requested',
          data,
        })
        .returning()

      return {
        ...creativeJob,
        ...data,
      }
    }),

  /**
   * SECURITY: Verifies creative job belongs to a client owned by the user's company
   */
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
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify creative job belongs to a client owned by this company
      const [result] = await ctx.db
        .select({ creativeJob: schema.creativeJobs })
        .from(schema.creativeJobs)
        .innerJoin(schema.clients, eq(schema.creativeJobs.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.creativeJobs.id, input.id),
            eq(schema.clients.companyId, ctx.companyId),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const existing = result.creativeJob

      const existingData = (existing.data as CreativeJobData) || {}
      const newData: CreativeJobData = {
        ...existingData,
        ...(input.data.description !== undefined && { description: input.data.description }),
        ...(input.data.quantity !== undefined && { quantity: input.data.quantity }),
        ...(input.data.jobStartDate !== undefined && { jobStartDate: input.data.jobStartDate }),
        ...(input.data.dueDate !== undefined && { dueDate: input.data.dueDate }),
        ...(input.data.assignedTo !== undefined && { assignedTo: input.data.assignedTo }),
        ...(input.data.priority !== undefined && { priority: input.data.priority }),
        ...(input.data.notes !== undefined && { notes: input.data.notes }),
        ...(input.data.fileUrl !== undefined && { fileUrl: input.data.fileUrl }),
        ...(input.data.clientVisible !== undefined && { clientVisible: input.data.clientVisible }),
        ...(input.data.approvalStatus !== undefined && { approvalStatus: input.data.approvalStatus }),
        ...(input.data.estimatedCost !== undefined && { estimatedCost: input.data.estimatedCost }),
        ...(input.data.currency !== undefined && { currency: input.data.currency }),
      }

      const [creativeJob] = await ctx.db
        .update(schema.creativeJobs)
        .set({
          name: input.data.title || existing.name,
          type: input.data.jobType || existing.type,
          status: input.data.status || existing.status,
          data: newData,
          updatedAt: new Date(),
        })
        .where(eq(schema.creativeJobs.id, input.id))
        .returning()

      return {
        ...creativeJob,
        ...newData,
      }
    }),

  /**
   * SECURITY: Verifies creative job belongs to a client owned by the user's company
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify creative job belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: schema.creativeJobs.id })
        .from(schema.creativeJobs)
        .innerJoin(schema.clients, eq(schema.creativeJobs.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.creativeJobs.id, input.id),
            eq(schema.clients.companyId, ctx.companyId),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await ctx.db
        .delete(schema.creativeJobs)
        .where(eq(schema.creativeJobs.id, input.id))

      return { success: true }
    }),

  /**
   * SECURITY: Verifies creative job belongs to a client owned by the user's company
   */
  updateStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['requested', 'in_progress', 'review', 'approved', 'completed']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify creative job belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: schema.creativeJobs.id })
        .from(schema.creativeJobs)
        .innerJoin(schema.clients, eq(schema.creativeJobs.clientId, schema.clients.id))
        .where(
          and(
            eq(schema.creativeJobs.id, input.id),
            eq(schema.clients.companyId, ctx.companyId),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const [creativeJob] = await ctx.db
        .update(schema.creativeJobs)
        .set({
          status: input.status,
          updatedAt: new Date()
        })
        .where(eq(schema.creativeJobs.id, input.id))
        .returning()

      return creativeJob
    }),

  getStats: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

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

      const creativeJobs = await ctx.db
        .select()
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.clientId, input.clientId))

      const now = Date.now()
      const total = creativeJobs.length
      const requested = creativeJobs.filter(j => j.status === 'requested').length
      const inProgress = creativeJobs.filter(j => j.status === 'in_progress').length
      const inReview = creativeJobs.filter(j => j.status === 'review').length
      const completed = creativeJobs.filter(j => j.status === 'completed').length

      const overdue = creativeJobs.filter(j => {
        const data = j.data as CreativeJobData
        if (!data?.dueDate || j.status === 'completed') return false
        return new Date(data.dueDate).getTime() < now
      }).length

      const highPriority = creativeJobs.filter(j => {
        const data = j.data as CreativeJobData
        return data?.priority === 'high' && j.status !== 'completed'
      }).length

      return {
        total,
        requested,
        inProgress,
        inReview,
        completed,
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

      const [clientAccess] = await ctx.db
        .select({ id: schema.clientUsers.id })
        .from(schema.clientUsers)
        .where(and(
          eq(schema.clientUsers.clientId, input.clientId),
          eq(schema.clientUsers.userId, ctx.userId)
        ))
        .limit(1)

      if (!clientAccess) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const creativeJobs = await ctx.db
        .select()
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.clientId, input.clientId))
        .orderBy(desc(schema.creativeJobs.createdAt))

      // Filter for client-visible jobs
      return creativeJobs
        .filter(job => {
          const data = job.data as CreativeJobData
          return data?.clientVisible !== false
        })
        .map(job => ({
          ...job,
          ...(job.data as CreativeJobData || {}),
        }))
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

      const [creativeJob] = await ctx.db
        .select()
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.id, input.id))
        .limit(1)

      if (!creativeJob) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const [clientAccess] = await ctx.db
        .select({ id: schema.clientUsers.id })
        .from(schema.clientUsers)
        .where(and(
          eq(schema.clientUsers.clientId, creativeJob.clientId!),
          eq(schema.clientUsers.userId, ctx.userId)
        ))
        .limit(1)

      if (!clientAccess) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const existingData = (creativeJob.data as CreativeJobData) || {}
      const newData: CreativeJobData = {
        ...existingData,
        approvalStatus: input.approved ? 'approved' : 'rejected',
        approvalComments: input.comments,
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
      }

      const [updatedJob] = await ctx.db
        .update(schema.creativeJobs)
        .set({
          status: input.approved ? 'approved' : 'review',
          data: newData,
          updatedAt: new Date(),
        })
        .where(eq(schema.creativeJobs.id, input.id))
        .returning()

      return {
        ...updatedJob,
        ...newData,
      }
    }),

  // Client request revision
  clientRequestRevision: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      comments: z.string().min(1, 'Please provide feedback'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const [creativeJob] = await ctx.db
        .select()
        .from(schema.creativeJobs)
        .where(eq(schema.creativeJobs.id, input.id))
        .limit(1)

      if (!creativeJob) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const [clientAccess] = await ctx.db
        .select({ id: schema.clientUsers.id })
        .from(schema.clientUsers)
        .where(and(
          eq(schema.clientUsers.clientId, creativeJob.clientId!),
          eq(schema.clientUsers.userId, ctx.userId)
        ))
        .limit(1)

      if (!clientAccess) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const existingData = (creativeJob.data as CreativeJobData) || {}
      const newData: CreativeJobData = {
        ...existingData,
        approvalStatus: 'revision_requested',
        approvalComments: input.comments,
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
        revisionCount: (existingData.revisionCount || 0) + 1,
      }

      const [updatedJob] = await ctx.db
        .update(schema.creativeJobs)
        .set({
          status: 'in_progress',
          data: newData,
          updatedAt: new Date(),
        })
        .where(eq(schema.creativeJobs.id, input.id))
        .returning()

      return {
        ...updatedJob,
        ...newData,
      }
    }),
})
