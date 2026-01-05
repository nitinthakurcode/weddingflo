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

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [document] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.id))
        .limit(1)

      if (!document) {
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

      // Create document record
      const [document] = await ctx.db
        .insert(documents)
        .values({
          clientId: input.clientId,
          name: input.fileName,
          fileType: input.fileType || input.mimeType || '',
          fileSize: input.fileSize,
          fileUrl: input.storageUrl,
          uploadedBy: user.id,
          description: input.description || undefined,
          tags: input.tags || [],
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
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (input.data.fileName !== undefined) updateData.name = input.data.fileName
      if (input.data.fileType !== undefined) updateData.fileType = input.data.fileType
      if (input.data.description !== undefined) updateData.description = input.data.description
      if (input.data.tags !== undefined) updateData.tags = input.data.tags
      if (input.data.storageUrl !== undefined) updateData.fileUrl = input.data.storageUrl

      // Update document
      const [document] = await ctx.db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, input.id))
        .returning()

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND' })
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
      const [document] = await ctx.db
        .select({ fileUrl: documents.fileUrl })
        .from(documents)
        .where(eq(documents.id, input.id))
        .limit(1)

      if (document?.fileUrl) {
        // Delete file from R2 Storage
        try {
          // Extract key from URL
          const urlParts = document.fileUrl.split('/')
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
            eq(documents.fileType, input.fileType)
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
          fileType: documents.fileType,
          fileSize: documents.fileSize,
        })
        .from(documents)
        .where(eq(documents.clientId, input.clientId))

      const totalSize = documentList.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)

      // Count by type
      const typeCount: Record<string, number> = {}
      documentList.forEach(doc => {
        const type = doc.fileType || 'other'
        typeCount[type] = (typeCount[type] || 0) + 1
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

  // Request signature for a document
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

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays)

      const [document] = await ctx.db
        .update(documents)
        .set({
          signatureStatus: 'pending' as any,
          signerEmail: input.signerEmail,
          signerName: input.signerName,
          signatureRequestedAt: new Date(),
          expiresAt: expiresAt,
          signatureToken: crypto.randomUUID(),
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.documentId))
        .returning()

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return document
    }),

  // Get signature statistics
  getSignatureStats: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const documentList = await ctx.db
        .select({
          signatureStatus: documents.signatureStatus,
          signerName: documents.signerName,
          signerEmail: documents.signerEmail,
          expiresAt: documents.expiresAt,
        })
        .from(documents)
        .where(eq(documents.clientId, input.clientId))

      // Filter out drafts
      const signatureDocuments = documentList.filter(d => d.signatureStatus && d.signatureStatus !== 'draft')
      const now = new Date()

      const stats = {
        pending: signatureDocuments.filter(d => d.signatureStatus === 'pending').length,
        signed: signatureDocuments.filter(d => d.signatureStatus === 'signed').length,
        expired: signatureDocuments.filter(d =>
          d.signatureStatus === 'pending' &&
          d.expiresAt &&
          new Date(d.expiresAt) < now
        ).length,
        rejected: signatureDocuments.filter(d => d.signatureStatus === 'rejected').length,
      }

      return stats
    }),

  // Get pending signature documents
  getPendingSignatures: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const documentList = await ctx.db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.clientId, input.clientId),
            eq(documents.signatureStatus, 'pending' as any)
          )
        )
        .orderBy(desc(documents.signatureRequestedAt))

      return documentList
    }),

  // Send reminder for unsigned document
  sendSignatureReminder: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [document] = await ctx.db
        .update(documents)
        .set({
          reminderSentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documents.id, input.documentId),
            eq(documents.signatureStatus, 'pending' as any)
          )
        )
        .returning()

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // In production, integrate with email service to send reminder
      return { success: true, document }
    }),

  // Cancel signature request
  cancelSignatureRequest: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [document] = await ctx.db
        .update(documents)
        .set({
          signatureStatus: 'draft' as any,
          signerEmail: null,
          signerName: null,
          signatureRequestedAt: null,
          expiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.documentId))
        .returning()

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return document
    }),

  // Sign a document directly (in-app signing)
  signDocument: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      signatureDataUrl: z.string().min(1),
      signedAt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get current user info
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User ID not found in session' })
      }

      const [user] = await ctx.db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.authId, ctx.userId))
        .limit(1)

      const signerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown' : 'Unknown'
      const signerEmail = user?.email || ''

      // Upload signature image to R2 storage
      const signatureFileName = `signature_${input.documentId}_${Date.now()}.png`

      // Convert data URL to buffer for upload
      const base64Data = input.signatureDataUrl.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')

      let signatureUrl: string | null = null
      try {
        const result = await storage.uploadFile(buffer, {
          folder: `${ctx.companyId}/signatures`,
          filename: signatureFileName,
          contentType: 'image/png',
          isPublic: true,
        })
        signatureUrl = result.url
      } catch (uploadError) {
        console.error('Signature upload error:', uploadError)
        // Continue anyway - we still want to mark the document as signed
      }

      // Update document with signature info (in-app provider)
      const auditEvent = {
        eventType: 'document_signed',
        timestamp: new Date().toISOString(),
        actorEmail: signerEmail,
        actorName: signerName,
        details: { provider: 'in_app' },
      }

      const [document] = await ctx.db
        .update(documents)
        .set({
          signatureStatus: 'signed' as any,
          signedAt: new Date(input.signedAt),
          signerName: signerName,
          signerEmail: signerEmail,
          signatureUrl: signatureUrl,
          signingProvider: 'in_app',
          auditTrail: [auditEvent],
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.documentId))
        .returning()

      if (!document) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return document
    }),

  // ========================================
  // E-SIGNATURE INTEGRATION (DocuSign)
  // ========================================

  // Check if DocuSign is available
  getESignatureStatus: adminProcedure
    .query(() => {
      return isESignatureAvailable()
    }),

  // Request DocuSign signature for a document
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
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get the document
      const [doc] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1)

      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      }

      // Download document from storage
      let documentBuffer: Buffer
      try {
        // Extract key from URL and download
        const urlParts = doc.fileUrl.split('/')
        const key = urlParts.slice(-3).join('/')
        const response = await fetch(doc.fileUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch document')
        }
        const arrayBuffer = await response.arrayBuffer()
        documentBuffer = Buffer.from(arrayBuffer)
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve document for signing',
        })
      }

      // Request e-signature
      const result = await requestSignature({
        documentId: input.documentId,
        documentBuffer,
        documentName: doc.name,
        signers: input.signers,
        emailSubject: input.emailSubject,
        useEmbeddedSigning: input.useEmbeddedSigning,
        returnUrl: input.returnUrl,
      })

      if (result.status === 'error') {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: result.error || 'E-signature request failed',
        })
      }

      // Build signer sequence for multi-signer tracking
      const signerSequence = input.signers.map((signer, index) => ({
        email: signer.email,
        name: signer.name,
        order: index + 1,
        status: 'pending',
        signedAt: null,
      }))

      // Update document with envelope info
      const auditEvent = {
        eventType: 'signature_requested',
        timestamp: new Date().toISOString(),
        details: {
          provider: result.provider,
          envelopeId: result.envelopeId,
          signers: input.signers.map(s => s.email),
        },
      }

      const [updatedDoc] = await ctx.db
        .update(documents)
        .set({
          signatureStatus: 'pending' as any,
          signatureRequestedAt: new Date(),
          signerEmail: input.signers[0].email,
          signerName: input.signers[0].name,
          envelopeId: result.envelopeId || null,
          signingProvider: result.provider,
          signingUrl: result.signingUrl || null,
          multiSigner: input.signers.length > 1,
          signerSequence: signerSequence,
          auditTrail: [auditEvent],
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.documentId))
        .returning()

      return {
        document: updatedDoc,
        signingUrl: result.signingUrl,
        envelopeId: result.envelopeId,
        provider: result.provider,
      }
    }),

  // Get embedded signing URL for DocuSign
  getDocuSignSigningUrl: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      returnUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [doc] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1)

      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (!doc.envelopeId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Document does not have a DocuSign envelope',
        })
      }

      if (!doc.signerEmail || !doc.signerName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Document does not have signer information',
        })
      }

      const signingUrl = await getEmbeddedSigningUrl(
        doc.envelopeId,
        doc.signerEmail,
        doc.signerName,
        input.returnUrl
      )

      if (!signingUrl) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get signing URL',
        })
      }

      // Update signing URL in database
      await ctx.db
        .update(documents)
        .set({
          signingUrl,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.documentId))

      return { signingUrl }
    }),

  // Get DocuSign envelope status
  getDocuSignStatus: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [doc] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1)

      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (doc.signingProvider !== 'docusign' || !doc.envelopeId) {
        return {
          provider: doc.signingProvider || 'in_app',
          status: doc.signatureStatus,
          auditTrail: doc.auditTrail || [],
        }
      }

      const status = await getSignatureStatus('docusign', doc.envelopeId)

      if (status) {
        // Update local status if changed
        if (status.status !== doc.signatureStatus) {
          await ctx.db
            .update(documents)
            .set({
              signatureStatus: status.status as any,
              signedAt: status.completedAt ? new Date(status.completedAt) : null,
              auditTrail: status.auditTrail || doc.auditTrail,
              updatedAt: new Date(),
            })
            .where(eq(documents.id, input.documentId))
        }
      }

      return status || {
        provider: 'docusign',
        status: doc.signatureStatus,
        auditTrail: doc.auditTrail || [],
      }
    }),

  // Void/cancel DocuSign envelope
  voidDocuSignEnvelope: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [doc] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1)

      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (doc.signingProvider === 'docusign' && doc.envelopeId) {
        const success = await cancelESignature('docusign', doc.envelopeId, input.reason)
        if (!success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to void DocuSign envelope',
          })
        }
      }

      // Update document status
      const auditEvent = {
        eventType: 'signature_cancelled',
        timestamp: new Date().toISOString(),
        details: { reason: input.reason },
      }

      const currentAuditTrail = (doc.auditTrail as any[] || [])

      const [updatedDoc] = await ctx.db
        .update(documents)
        .set({
          signatureStatus: 'cancelled' as any,
          auditTrail: [...currentAuditTrail, auditEvent],
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.documentId))
        .returning()

      return updatedDoc
    }),

  // Resend DocuSign reminder
  resendDocuSignReminder: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [doc] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1)

      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      if (doc.signingProvider === 'docusign' && doc.envelopeId) {
        const success = await resendSignatureRequest('docusign', doc.envelopeId)
        if (!success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to resend DocuSign reminder',
          })
        }
      }

      // Update reminder sent timestamp
      const auditEvent = {
        eventType: 'reminder_sent',
        timestamp: new Date().toISOString(),
      }

      const currentAuditTrail = (doc.auditTrail as any[] || [])

      await ctx.db
        .update(documents)
        .set({
          reminderSentAt: new Date(),
          auditTrail: [...currentAuditTrail, auditEvent],
          updatedAt: new Date(),
        })
        .where(eq(documents.id, input.documentId))

      return { success: true }
    }),

  // ========================================
  // SELF-HOSTED E-SIGNATURE (No External API)
  // ========================================

  // Request self-hosted signature (recommended - no API costs)
  requestSelfHostedSignature: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      signerEmail: z.string().email(),
      signerName: z.string().min(1),
      expiresInDays: z.number().int().min(1).max(90).default(7),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify document exists and belongs to company
      const [doc] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.documentId))
        .limit(1)

      if (!doc) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      }

      // Create self-hosted signature request
      const result = await createSelfHostedSignature({
        documentId: input.documentId,
        signerEmail: input.signerEmail,
        signerName: input.signerName,
        expiresInDays: input.expiresInDays,
        message: input.message,
      })

      return {
        signingToken: result.signingToken,
        signingUrl: result.signingUrl,
        expiresAt: result.expiresAt,
        provider: 'self_hosted',
      }
    }),

  // Get document audit trail
  getDocumentAuditTrail: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const auditTrail = await getSelfHostedAuditTrail(input.documentId)
      return auditTrail
    }),

  // Verify document hasn't been tampered with since signing
  verifyDocumentIntegrity: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const result = await verifyDocumentIntegrity(input.documentId)
      return result
    }),

  // Send signature reminder (self-hosted)
  sendSelfHostedReminder: adminProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const success = await sendSelfHostedReminder(input.documentId)
      return { success }
    }),

  // Cancel self-hosted signature request
  cancelSelfHostedSignature: adminProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const success = await cancelSelfHostedSignature(input.documentId, input.reason)
      return { success }
    }),
})
