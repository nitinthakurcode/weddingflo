import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { clients, documents, users } from '@/lib/db/schema'
import * as storage from '@/lib/storage'
import {
  requestSignature,
  getSignatureStatus,
  cancelSignatureRequest as cancelESignature,
  resendSignatureRequest,
  getEmbeddedSigningUrl,
  isESignatureAvailable,
  // Self-hosted e-signature (no external API needed)
  createSignatureRequest as createSelfHostedSignature,
  verifyDocumentIntegrity,
  getAuditTrail as getSelfHostedAuditTrail,
  sendReminder as sendSelfHostedReminder,
  cancelSelfHostedSignature,
} from '@/lib/esignature'

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

      const [user] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.authId, ctx.userId))
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
      if (!user) {
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
          // Extract key from URL
          const urlParts = document.url.split('/')
          const key = urlParts.slice(-3).join('/') // company/client/filename
          await storage.deleteDocument(key)
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

  // Request signature for a document (stub - signature fields not in current schema)
  requestSignature: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      signerEmail: z.string().email(),
      signerName: z.string().min(1),
      expiresInDays: z.number().int().min(1).max(90).default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      // Note: E-signature features require schema migration to add signature fields
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // Get signature statistics (stub - signature fields not in current schema)
  getSignatureStats: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      // Return empty stats - signature fields not in current schema
      return { pending: 0, signed: 0, expired: 0, rejected: 0 }
    }),

  // Get pending signature documents (stub - signature fields not in current schema)
  getPendingSignatures: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      // Return empty array - signature fields not in current schema
      return []
    }),

  // Send reminder for unsigned document (stub - signature fields not in current schema)
  sendSignatureReminder: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // Cancel signature request (stub - signature fields not in current schema)
  cancelSignatureRequest: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // Sign a document directly (stub - signature fields not in current schema)
  signDocument: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      signatureDataUrl: z.string().min(1),
      signedAt: z.string(),
    }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // ========================================
  // E-SIGNATURE INTEGRATION (DocuSign)
  // Note: These features require schema migration to add signature fields
  // ========================================

  // Check if DocuSign is available
  getESignatureStatus: adminProcedure
    .query(() => {
      return isESignatureAvailable()
    }),

  // Request DocuSign signature for a document (stub - requires schema migration)
  requestDocuSignSignature: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      signers: z.array(z.object({
        email: z.string().email(),
        name: z.string().min(1),
      })).min(1),
      emailSubject: z.string().optional(),
      useEmbeddedSigning: z.boolean().optional(),
      returnUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // Get embedded signing URL for DocuSign (stub - requires schema migration)
  getDocuSignSigningUrl: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      returnUrl: z.string().url(),
    }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // Get DocuSign envelope status (stub - requires schema migration)
  getDocuSignStatus: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      return { provider: 'none', status: 'not_configured', auditTrail: [] }
    }),

  // Void/cancel DocuSign envelope (stub - requires schema migration)
  voidDocuSignEnvelope: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // Resend DocuSign reminder (stub - requires schema migration)
  resendDocuSignReminder: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // ========================================
  // SELF-HOSTED E-SIGNATURE (No External API)
  // Note: These features require schema migration
  // ========================================

  // Request self-hosted signature (stub - requires schema migration)
  requestSelfHostedSignature: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      signerEmail: z.string().email(),
      signerName: z.string().min(1),
      expiresInDays: z.number().int().min(1).max(90).default(7),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // Get document audit trail (stub - requires schema migration)
  getDocumentAuditTrail: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      return []
    }),

  // Verify document integrity (stub - requires schema migration)
  verifyDocumentIntegrity: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      return { valid: true, message: 'Verification not available - requires schema migration' }
    }),

  // Send signature reminder (stub - requires schema migration)
  sendSelfHostedReminder: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),

  // Cancel self-hosted signature request (stub - requires schema migration)
  cancelSelfHostedSignature: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'E-signature features require schema migration' })
    }),
})
