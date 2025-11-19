import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'

export const documentsRouter = router({
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

      // Fetch documents
      const { data: documents, error } = await ctx.supabase
        .from('documents')
        .select('*')
        .eq('client_id', input.clientId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return documents || []
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const { data: document, error } = await ctx.supabase
        .from('documents')
        .select('*')
        .eq('id', input.id)
        .single()

      if (error || !document) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return document
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      fileName: z.string().min(1),
      fileType: z.string().optional(),
      mimeType: z.string().optional(),
      fileSize: z.number().int().optional(),
      storagePath: z.string().min(1),
      storageUrl: z.string().url().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
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

      // Get current user for uploaded_by
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User ID not found in session' })
      }
      const { data: user } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('clerk_id', ctx.userId)
        .single()

      // Create document record
      const { data: document, error } = await ctx.supabase
        .from('documents')
        .insert({
          client_id: input.clientId,
          name: input.fileName,
          file_type: input.fileType,
          file_size: input.fileSize,
          file_url: input.storageUrl,
          uploaded_by: user?.id || '',
          description: input.description,
          tags: input.tags,
        } as any)
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return document
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        fileName: z.string().optional(),
        fileType: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        storageUrl: z.string().url().optional(),
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

      if (input.data.fileName !== undefined) updateData.file_name = input.data.fileName
      if (input.data.fileType !== undefined) updateData.file_type = input.data.fileType
      if (input.data.description !== undefined) updateData.description = input.data.description
      if (input.data.tags !== undefined) updateData.tags = input.data.tags
      if (input.data.storageUrl !== undefined) updateData.storage_url = input.data.storageUrl

      // Update document
      const { data: document, error } = await ctx.supabase
        .from('documents')
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

      return document
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get document to find storage path
      const { data: document } = await ctx.supabase
        .from('documents')
        .select('file_url')
        .eq('id', input.id)
        .single()

      if (document?.file_url) {
        // Delete file from Supabase Storage
        // Extract path from URL if it's a full URL
        const path = document.file_url.includes('/') ? document.file_url.split('/').pop() : document.file_url
        const { error: storageError } = await ctx.supabase
          .storage
          .from('documents')
          .remove([path || document.file_url])

        if (storageError) {
          console.error('Storage deletion error:', storageError)
          // Continue anyway - delete database record even if storage fails
        }
      }

      // Delete document record
      const { error } = await ctx.supabase
        .from('documents')
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

  getByType: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      fileType: z.string(),
    }))
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

      // Fetch documents by type
      const { data: documents, error } = await ctx.supabase
        .from('documents')
        .select('*')
        .eq('client_id', input.clientId)
        .eq('file_type', input.fileType)
        .order('created_at', { ascending: false })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message
        })
      }

      return documents || []
    }),

  generateUploadUrl: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      fileName: z.string(),
      mimeType: z.string(),
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

      // Generate unique file path
      const timestamp = Date.now()
      const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${ctx.companyId}/${input.clientId}/${timestamp}_${sanitizedFileName}`

      return {
        storagePath,
        bucket: 'documents',
        fileName: input.fileName,
      }
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

      // Get documents
      const { data: documents } = await ctx.supabase
        .from('documents')
        .select('file_type, file_size')
        .eq('client_id', input.clientId)

      const totalSize = documents?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0

      // Count by type
      const typeCount: Record<string, number> = {}
      documents?.forEach(doc => {
        const type = doc.file_type || 'other'
        typeCount[type] = (typeCount[type] || 0) + 1
      })

      const stats = {
        total: documents?.length || 0,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        byType: typeCount,
        contracts: typeCount['contract'] || 0,
        invoices: typeCount['invoice'] || 0,
        photos: typeCount['photo'] || 0,
        other: typeCount['other'] || 0,
      }

      return stats
    }),
})
