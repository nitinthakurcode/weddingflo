import { router, adminProcedure, publicProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, desc, count, sql, asc, inArray } from 'drizzle-orm'
import {
  clients, documents, user,
  documentSignatureRequests, documentSigners, documentSignatureFields,
  documentAuditTrail, documentSignatureTemplates,
} from '@/lib/db/schema'
import { deleteFile, validateStorageKey } from '@/lib/storage/r2-client'
import { broadcastSync } from '@/lib/realtime/broadcast-sync'
import { notifyTeamMembers } from '@/features/core/server/services/notification.service'
import { nanoid } from 'nanoid'

/**
 * Documents tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding documents with multi-tenant security.
 * Storage uses Cloudflare R2 (S3-compatible) - December 2025
 */
export const documentsRouter = router({
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch documents
      const documentList = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.clientId, input.clientId))
        .orderBy(desc(documents.createdAt))

      return documentList
    }),

  /**
   * SECURITY: Verifies document belongs to a client owned by the user's company
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Join with clients to verify company ownership
      const [result] = await ctx.db
        .select({ document: documents })
        .from(documents)
        .innerJoin(clients, eq(documents.clientId, clients.id))
        .where(
          and(
            eq(documents.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return result.document
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

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get current user for uploaded_by
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User ID not found in session' })
      }

      const [dbUser] = await ctx.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, ctx.userId))
        .limit(1)

      // Validate required fields
      if (!input.fileType && !input.mimeType) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'File type is required' })
      }
      if (!input.fileSize) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'File size is required' })
      }
      if (!input.storageUrl) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Storage URL is required' })
      }
      if (!dbUser) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found in database' })
      }

      // Create document record (matching simplified schema: id, clientId, name, url, type, size)
      const [document] = await ctx.db
        .insert(documents)
        .values({
          id: crypto.randomUUID(),
          clientId: input.clientId,
          name: input.fileName,
          url: input.storageUrl,
          type: input.fileType || input.mimeType || '',
          size: input.fileSize,
        })
        .returning()

      if (!document) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create document'
        })
      }

      return document
    }),

  /**
   * SECURITY: Verifies document belongs to a client owned by the user's company
   */
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

      // Verify document belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: documents.id })
        .from(documents)
        .innerJoin(clients, eq(documents.clientId, clients.id))
        .where(
          and(
            eq(documents.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      }

      // Build update object (matching simplified schema: id, clientId, name, url, type, size)
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (input.data.fileName !== undefined) updateData.name = input.data.fileName
      if (input.data.fileType !== undefined) updateData.type = input.data.fileType
      if (input.data.storageUrl !== undefined) updateData.url = input.data.storageUrl
      // Note: description and tags not in current schema

      // Update document
      const [document] = await ctx.db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, input.id))
        .returning()

      return document
    }),

  /**
   * SECURITY: Verifies document belongs to a client owned by the user's company
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify document belongs to a client owned by this company
      const [document] = await ctx.db
        .select({ id: documents.id, url: documents.url })
        .from(documents)
        .innerJoin(clients, eq(documents.clientId, clients.id))
        .where(
          and(
            eq(documents.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      }

      if (document.url) {
        // Delete file from R2 Storage
        try {
          // Extract key from URL (format: documents/{companyId}/{clientId}/{timestamp}-{filename})
          const urlParts = document.url.split('/')
          const key = urlParts.slice(-4).join('/') // documents/company/client/filename

          // Path traversal prevention
          const keyValidation = validateStorageKey(key)
          if (!keyValidation.valid) {
            console.error('Invalid storage key during deletion:', keyValidation.error)
          } else if (!key.startsWith(`documents/${ctx.companyId}/`)) {
            // Tenant isolation: only delete files belonging to this company
            console.error('Tenant isolation violation: key does not match company', { key, companyId: ctx.companyId })
          } else {
            await deleteFile(key)
          }
        } catch (storageError) {
          console.error('Storage deletion error:', storageError)
          // Continue anyway - delete database record even if storage fails
        }
      }

      // Delete document record
      await ctx.db
        .delete(documents)
        .where(eq(documents.id, input.id))

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

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Fetch documents by type
      const documentList = await ctx.db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.clientId, input.clientId),
            eq(documents.type, input.fileType)
          )
        )
        .orderBy(desc(documents.createdAt))

      return documentList
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

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

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

      // Verify client belongs to company and is not soft-deleted
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get documents
      const documentList = await ctx.db
        .select({
          type: documents.type,
          size: documents.size,
        })
        .from(documents)
        .where(eq(documents.clientId, input.clientId))

      const totalSize = documentList.reduce((sum, doc) => sum + (doc.size || 0), 0)

      // Count by type
      const typeCount: Record<string, number> = {}
      documentList.forEach(doc => {
        const docType = doc.type || 'other'
        typeCount[docType] = (typeCount[docType] || 0) + 1
      })

      const stats = {
        total: documentList.length,
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

  // ========================================
  // E-SIGNATURE — SELF-HOSTED (April 2026)
  // ========================================

  // Create a signature request with multiple signers
  requestSignature: adminProcedure
    .input(z.object({
      documentId: z.string(),
      title: z.string().min(1),
      message: z.string().optional(),
      signingOrder: z.enum(['parallel', 'sequential']).default('parallel'),
      expiresInDays: z.number().int().min(1).max(90).default(7),
      signers: z.array(z.object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.string().optional(),
        signingOrder: z.number().int().min(1).optional(),
      })).min(1),
      fields: z.array(z.object({
        signerIndex: z.number().int().min(0),
        type: z.enum(['signature', 'initial', 'date', 'text', 'checkbox']),
        page: z.number().int().min(1).default(1),
        x: z.number(), y: z.number(), width: z.number(), height: z.number(),
        required: z.boolean().default(true),
        label: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify document exists and belongs to this company's client
      const [doc] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1)
      if (!doc) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, doc.clientId), eq(clients.companyId, ctx.companyId), isNull(clients.deletedAt)))
        .limit(1)
      if (!client) throw new TRPCError({ code: 'FORBIDDEN' })

      const requestToken = nanoid(32)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays)

      // Create signature request
      const [request] = await ctx.db
        .insert(documentSignatureRequests)
        .values({
          documentId: input.documentId,
          clientId: doc.clientId,
          companyId: ctx.companyId,
          status: 'pending',
          publicToken: requestToken,
          title: input.title,
          message: input.message,
          signingOrder: input.signingOrder,
          expiresAt,
          createdBy: ctx.userId!,
        })
        .returning()

      // Create signers with individual tokens
      const signerValues = input.signers.map((s, idx) => ({
        requestId: request.id,
        name: s.name,
        email: s.email,
        role: s.role,
        signingOrder: s.signingOrder ?? idx + 1,
        status: 'sent' as const,
        publicToken: nanoid(32),
        sentAt: new Date(),
      }))
      const createdSigners = await ctx.db
        .insert(documentSigners)
        .values(signerValues)
        .returning()

      // Create fields if provided
      if (input.fields && input.fields.length > 0) {
        const fieldValues = input.fields.map((f) => ({
          requestId: request.id,
          signerId: createdSigners[f.signerIndex]?.id ?? createdSigners[0].id,
          type: f.type,
          page: f.page,
          x: f.x, y: f.y, width: f.width, height: f.height,
          required: f.required,
          label: f.label,
        }))
        await ctx.db.insert(documentSignatureFields).values(fieldValues)
      }

      // Audit trail
      await ctx.db.insert(documentAuditTrail).values({
        requestId: request.id,
        action: 'created',
        metadata: { createdBy: ctx.userId, signerCount: input.signers.length },
      })
      for (const signer of createdSigners) {
        await ctx.db.insert(documentAuditTrail).values({
          requestId: request.id,
          signerId: signer.id,
          action: 'sent',
          metadata: { email: signer.email },
        })
      }

      // broadcastSync outside transaction
      await broadcastSync({
        type: 'insert',
        module: 'documents',
        entityId: request.id,
        companyId: ctx.companyId,
        clientId: doc.clientId,
        userId: ctx.userId!,
        queryPaths: ['documents.getAll', 'documents.getSignatureStats', 'documents.getPendingSignatures'],
      })

      return { request, signers: createdSigners }
    }),

  // Get signature statistics for a client
  getSignatureStats: adminProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      const requests = await ctx.db
        .select({ status: documentSignatureRequests.status })
        .from(documentSignatureRequests)
        .where(and(
          eq(documentSignatureRequests.clientId, input.clientId),
          eq(documentSignatureRequests.companyId, ctx.companyId),
        ))
      const stats = { pending: 0, signed: 0, expired: 0, rejected: 0 }
      for (const r of requests) {
        if (r.status === 'pending' || r.status === 'partially_signed') stats.pending++
        else if (r.status === 'completed') stats.signed++
        else if (r.status === 'expired') stats.expired++
        else if (r.status === 'cancelled' || r.status === 'voided') stats.rejected++
      }
      return stats
    }),

  // Get pending/active signature requests for a client
  getPendingSignatures: adminProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      const requests = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(and(
          eq(documentSignatureRequests.clientId, input.clientId),
          eq(documentSignatureRequests.companyId, ctx.companyId),
          inArray(documentSignatureRequests.status, ['pending', 'partially_signed', 'draft']),
        ))
        .orderBy(desc(documentSignatureRequests.createdAt))

      // Get signers for each request
      const results = []
      for (const req of requests) {
        const signers = await ctx.db
          .select()
          .from(documentSigners)
          .where(eq(documentSigners.requestId, req.id))
          .orderBy(asc(documentSigners.signingOrder))
        results.push({ ...req, signers })
      }
      return results
    }),

  // Send reminder to unsigned signers
  sendSignatureReminder: adminProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      const [request] = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(and(
          eq(documentSignatureRequests.id, input.requestId),
          eq(documentSignatureRequests.companyId, ctx.companyId),
        ))
        .limit(1)
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })

      const pendingSigners = await ctx.db
        .select()
        .from(documentSigners)
        .where(and(
          eq(documentSigners.requestId, input.requestId),
          inArray(documentSigners.status, ['pending', 'sent', 'viewed']),
        ))

      for (const signer of pendingSigners) {
        await ctx.db.insert(documentAuditTrail).values({
          requestId: input.requestId,
          signerId: signer.id,
          action: 'reminded',
          metadata: { email: signer.email },
        })
      }

      return { reminded: pendingSigners.length }
    }),

  // Cancel a signature request
  cancelSignatureRequest: adminProcedure
    .input(z.object({ requestId: z.string().uuid(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      const [request] = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(and(
          eq(documentSignatureRequests.id, input.requestId),
          eq(documentSignatureRequests.companyId, ctx.companyId),
        ))
        .limit(1)
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })
      if (request.status === 'completed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel a completed request. Use void instead.' })
      }

      await ctx.db
        .update(documentSignatureRequests)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(documentSignatureRequests.id, input.requestId))

      // Update all pending signers
      await ctx.db
        .update(documentSigners)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(and(
          eq(documentSigners.requestId, input.requestId),
          inArray(documentSigners.status, ['pending', 'sent', 'viewed']),
        ))

      await ctx.db.insert(documentAuditTrail).values({
        requestId: input.requestId,
        action: 'cancelled',
        metadata: { reason: input.reason, cancelledBy: ctx.userId },
      })

      await broadcastSync({
        type: 'update',
        module: 'documents',
        entityId: input.requestId,
        companyId: ctx.companyId,
        clientId: request.clientId,
        userId: ctx.userId!,
        queryPaths: ['documents.getAll', 'documents.getSignatureStats', 'documents.getPendingSignatures'],
      })

      return { success: true }
    }),

  // Void a completed signature request
  voidSignatureRequest: adminProcedure
    .input(z.object({ requestId: z.string().uuid(), reason: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      const [request] = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(and(
          eq(documentSignatureRequests.id, input.requestId),
          eq(documentSignatureRequests.companyId, ctx.companyId),
        ))
        .limit(1)
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })

      await ctx.db
        .update(documentSignatureRequests)
        .set({ status: 'voided', voidedAt: new Date(), voidReason: input.reason, updatedAt: new Date() })
        .where(eq(documentSignatureRequests.id, input.requestId))

      await ctx.db.insert(documentAuditTrail).values({
        requestId: input.requestId,
        action: 'voided',
        metadata: { reason: input.reason, voidedBy: ctx.userId },
      })

      await broadcastSync({
        type: 'update',
        module: 'documents',
        entityId: input.requestId,
        companyId: ctx.companyId,
        clientId: request.clientId,
        userId: ctx.userId!,
        queryPaths: ['documents.getAll', 'documents.getSignatureStats', 'documents.getPendingSignatures'],
      })

      return { success: true }
    }),

  // ========================================
  // PUBLIC SIGNING ENDPOINTS (no auth)
  // ========================================

  // Get signing session by signer token (public — no auth required)
  getSigningSession: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const [signer] = await ctx.db
        .select()
        .from(documentSigners)
        .where(eq(documentSigners.publicToken, input.token))
        .limit(1)
      if (!signer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signing session not found' })

      const [request] = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(eq(documentSignatureRequests.id, signer.requestId))
        .limit(1)
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })

      // Check expiration
      if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This signing request has expired' })
      }
      if (request.status === 'cancelled' || request.status === 'voided') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This signing request is no longer active' })
      }

      // Mark as viewed
      if (!signer.viewedAt) {
        await ctx.db
          .update(documentSigners)
          .set({ viewedAt: new Date(), status: 'viewed', updatedAt: new Date() })
          .where(eq(documentSigners.id, signer.id))
        await ctx.db.insert(documentAuditTrail).values({
          requestId: request.id,
          signerId: signer.id,
          action: 'viewed',
        })
      }

      // Get document
      const [doc] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, request.documentId))
        .limit(1)

      // Get fields for this signer
      const fields = await ctx.db
        .select()
        .from(documentSignatureFields)
        .where(and(
          eq(documentSignatureFields.requestId, request.id),
          eq(documentSignatureFields.signerId, signer.id),
        ))

      // Get all signers for progress display
      const allSigners = await ctx.db
        .select({
          id: documentSigners.id,
          name: documentSigners.name,
          role: documentSigners.role,
          status: documentSigners.status,
          signingOrder: documentSigners.signingOrder,
        })
        .from(documentSigners)
        .where(eq(documentSigners.requestId, request.id))
        .orderBy(asc(documentSigners.signingOrder))

      return {
        request: { id: request.id, title: request.title, message: request.message, signingOrder: request.signingOrder, status: request.status },
        signer: { id: signer.id, name: signer.name, email: signer.email, role: signer.role, status: signer.status },
        document: doc ? { id: doc.id, name: doc.name, url: doc.url, type: doc.type } : null,
        fields,
        allSigners,
      }
    }),

  // Sign a document (public — no auth required, uses signer token)
  signDocument: publicProcedure
    .input(z.object({
      token: z.string(),
      signature: z.string().min(1), // Base64 signature data
      name: z.string().min(1),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
      fieldValues: z.array(z.object({
        fieldId: z.string().uuid(),
        value: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [signer] = await ctx.db
        .select()
        .from(documentSigners)
        .where(eq(documentSigners.publicToken, input.token))
        .limit(1)
      if (!signer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Signing session not found' })
      if (signer.signedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already signed' })

      const [request] = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(eq(documentSignatureRequests.id, signer.requestId))
        .limit(1)
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })

      if (request.expiresAt && new Date(request.expiresAt) < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This signing request has expired' })
      }
      if (request.status === 'cancelled' || request.status === 'voided') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This signing request is no longer active' })
      }

      // For sequential signing, check if it's this signer's turn
      if (request.signingOrder === 'sequential') {
        const earlierUnsigned = await ctx.db
          .select({ id: documentSigners.id })
          .from(documentSigners)
          .where(and(
            eq(documentSigners.requestId, request.id),
            sql`${documentSigners.signingOrder} < ${signer.signingOrder}`,
            inArray(documentSigners.status, ['pending', 'sent', 'viewed']),
          ))
          .limit(1)
        if (earlierUnsigned.length > 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Waiting for previous signers to complete' })
        }
      }

      const signatureData = {
        signature: input.signature,
        name: input.name,
        date: new Date().toISOString(),
        ipAddress: input.ipAddress,
      }

      // Update signer
      await ctx.db
        .update(documentSigners)
        .set({
          signatureData,
          signedAt: new Date(),
          status: 'signed',
          updatedAt: new Date(),
        })
        .where(eq(documentSigners.id, signer.id))

      // Update field values
      if (input.fieldValues) {
        for (const fv of input.fieldValues) {
          await ctx.db
            .update(documentSignatureFields)
            .set({ value: fv.value })
            .where(eq(documentSignatureFields.id, fv.fieldId))
        }
      }

      // Audit trail
      await ctx.db.insert(documentAuditTrail).values({
        requestId: request.id,
        signerId: signer.id,
        action: 'signed',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: { signerName: input.name, signerEmail: signer.email },
      })

      // Check if all signers have signed
      const remainingSigners = await ctx.db
        .select({ id: documentSigners.id })
        .from(documentSigners)
        .where(and(
          eq(documentSigners.requestId, request.id),
          inArray(documentSigners.status, ['pending', 'sent', 'viewed']),
        ))

      const isComplete = remainingSigners.length === 0
      if (isComplete) {
        await ctx.db
          .update(documentSignatureRequests)
          .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
          .where(eq(documentSignatureRequests.id, request.id))
        await ctx.db.insert(documentAuditTrail).values({
          requestId: request.id,
          action: 'completed',
        })
      } else {
        await ctx.db
          .update(documentSignatureRequests)
          .set({ status: 'partially_signed', updatedAt: new Date() })
          .where(eq(documentSignatureRequests.id, request.id))
      }

      // Notify team
      try {
        await notifyTeamMembers(ctx.db as any, {
          companyId: request.companyId,
          type: 'contract_signed' as any,
          title: `Document signed: ${request.title}`,
          message: `${input.name} has signed "${request.title}"${isComplete ? ' — all signatures complete!' : ''}`,
          metadata: {
            entityType: 'document',
            entityId: request.documentId,
            link: `/dashboard/clients/${request.clientId}/documents`,
          },
        })
      } catch { /* notification failure shouldn't block */ }

      // broadcastSync
      await broadcastSync({
        type: 'update',
        module: 'documents',
        entityId: request.id,
        companyId: request.companyId,
        clientId: request.clientId,
        userId: 'public-signer',
        queryPaths: ['documents.getAll', 'documents.getSignatureStats', 'documents.getPendingSignatures'],
      })

      return { success: true, isComplete }
    }),

  // Decline to sign (public)
  declineSignature: publicProcedure
    .input(z.object({
      token: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [signer] = await ctx.db
        .select()
        .from(documentSigners)
        .where(eq(documentSigners.publicToken, input.token))
        .limit(1)
      if (!signer) throw new TRPCError({ code: 'NOT_FOUND' })
      if (signer.signedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Already signed' })

      await ctx.db
        .update(documentSigners)
        .set({ status: 'declined', declineReason: input.reason, updatedAt: new Date() })
        .where(eq(documentSigners.id, signer.id))

      await ctx.db.insert(documentAuditTrail).values({
        requestId: signer.requestId,
        signerId: signer.id,
        action: 'declined',
        metadata: { reason: input.reason },
      })

      const [request] = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(eq(documentSignatureRequests.id, signer.requestId))
        .limit(1)

      if (request) {
        try {
          await notifyTeamMembers(ctx.db as any, {
            companyId: request.companyId,
            type: 'contract_signed' as any,
            title: `Signature declined: ${request.title}`,
            message: `${signer.name} declined to sign "${request.title}"${input.reason ? `: ${input.reason}` : ''}`,
            metadata: {
              entityType: 'document',
              entityId: request.documentId,
              link: `/dashboard/clients/${request.clientId}/documents`,
            },
          })
        } catch { /* notification failure shouldn't block */ }

        await broadcastSync({
          type: 'update',
          module: 'documents',
          entityId: request.id,
          companyId: request.companyId,
          clientId: request.clientId,
          userId: 'public-signer',
          queryPaths: ['documents.getAll', 'documents.getSignatureStats', 'documents.getPendingSignatures'],
        })
      }

      return { success: true }
    }),

  // ========================================
  // AUDIT TRAIL & VERIFICATION
  // ========================================

  getDocumentAuditTrail: adminProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      // Verify request belongs to this company
      const [request] = await ctx.db
        .select({ id: documentSignatureRequests.id })
        .from(documentSignatureRequests)
        .where(and(
          eq(documentSignatureRequests.id, input.requestId),
          eq(documentSignatureRequests.companyId, ctx.companyId),
        ))
        .limit(1)
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })

      return ctx.db
        .select()
        .from(documentAuditTrail)
        .where(eq(documentAuditTrail.requestId, input.requestId))
        .orderBy(asc(documentAuditTrail.createdAt))
    }),

  verifyDocumentIntegrity: adminProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      const [request] = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(and(
          eq(documentSignatureRequests.id, input.requestId),
          eq(documentSignatureRequests.companyId, ctx.companyId),
        ))
        .limit(1)
      if (!request) throw new TRPCError({ code: 'NOT_FOUND' })

      const signers = await ctx.db
        .select()
        .from(documentSigners)
        .where(eq(documentSigners.requestId, input.requestId))

      const allSigned = signers.every(s => s.status === 'signed')
      const auditEntries = await ctx.db
        .select()
        .from(documentAuditTrail)
        .where(eq(documentAuditTrail.requestId, input.requestId))
        .orderBy(asc(documentAuditTrail.createdAt))

      return {
        valid: request.status === 'completed' && allSigned,
        status: request.status,
        signers: signers.map(s => ({
          name: s.name, email: s.email, status: s.status,
          signedAt: s.signedAt,
        })),
        auditTrailCount: auditEntries.length,
        message: request.status === 'completed' && allSigned
          ? 'Document fully signed and verified'
          : 'Document signing is incomplete',
      }
    }),

  // ========================================
  // E-SIGNATURE STATUS (replaces DocuSign stubs)
  // ========================================

  getESignatureStatus: adminProcedure
    .query(() => {
      return { available: true, provider: 'self-hosted' }
    }),

  // ========================================
  // SIGNATURE TEMPLATES
  // ========================================

  getSignatureTemplates: adminProcedure
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      return ctx.db
        .select()
        .from(documentSignatureTemplates)
        .where(eq(documentSignatureTemplates.companyId, ctx.companyId))
        .orderBy(desc(documentSignatureTemplates.createdAt))
    }),

  saveSignatureTemplate: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      fields: z.array(z.object({
        type: z.enum(['signature', 'initial', 'date', 'text', 'checkbox']),
        page: z.number().int().min(1),
        x: z.number(), y: z.number(), width: z.number(), height: z.number(),
        required: z.boolean().default(true),
        label: z.string().optional(),
        signerRole: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      const [template] = await ctx.db
        .insert(documentSignatureTemplates)
        .values({
          companyId: ctx.companyId,
          name: input.name,
          description: input.description,
          fields: input.fields,
          createdBy: ctx.userId!,
        })
        .returning()
      return template
    }),

  deleteSignatureTemplate: adminProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      await ctx.db
        .delete(documentSignatureTemplates)
        .where(and(
          eq(documentSignatureTemplates.id, input.templateId),
          eq(documentSignatureTemplates.companyId, ctx.companyId),
        ))
      return { success: true }
    }),

  // Get all signature requests for a client (for SignatureTracker)
  getSignatureRequests: adminProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      const requests = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(and(
          eq(documentSignatureRequests.clientId, input.clientId),
          eq(documentSignatureRequests.companyId, ctx.companyId),
        ))
        .orderBy(desc(documentSignatureRequests.createdAt))

      const results = []
      for (const req of requests) {
        const signers = await ctx.db
          .select()
          .from(documentSigners)
          .where(eq(documentSigners.requestId, req.id))
          .orderBy(asc(documentSigners.signingOrder))

        const [doc] = await ctx.db
          .select({ id: documents.id, name: documents.name })
          .from(documents)
          .where(eq(documents.id, req.documentId))
          .limit(1)

        results.push({ ...req, signers, document: doc })
      }
      return results
    }),

  // Expire stale requests (called by cron/API route)
  expireStaleRequests: adminProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      const now = new Date()
      const staleRequests = await ctx.db
        .select()
        .from(documentSignatureRequests)
        .where(and(
          eq(documentSignatureRequests.companyId, ctx.companyId),
          inArray(documentSignatureRequests.status, ['pending', 'partially_signed']),
          sql`${documentSignatureRequests.expiresAt} < ${now}`,
        ))

      for (const req of staleRequests) {
        await ctx.db
          .update(documentSignatureRequests)
          .set({ status: 'expired', updatedAt: now })
          .where(eq(documentSignatureRequests.id, req.id))

        await ctx.db
          .update(documentSigners)
          .set({ status: 'expired', updatedAt: now })
          .where(and(
            eq(documentSigners.requestId, req.id),
            inArray(documentSigners.status, ['pending', 'sent', 'viewed']),
          ))

        await ctx.db.insert(documentAuditTrail).values({
          requestId: req.id,
          action: 'expired',
        })
      }
      return { expired: staleRequests.length }
    }),
})
