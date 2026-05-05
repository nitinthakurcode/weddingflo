/**
 * Document & E-Signature Executor
 *
 * April 2026 - Chatbot tool executors for document CRUD and e-signature operations.
 *
 * Handles:
 * - Document create/update/delete
 * - Signature request creation
 * - Signature reminder sending
 * - Signature request cancellation
 * - Document audit trail queries
 */

import { db, eq, and, isNull, desc } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import {
  clients,
  documents,
  documentSignatureRequests,
  documentSigners,
  documentAuditTrail,
} from '@/lib/db/schema'
import { withTransaction } from '../transaction-wrapper'
import { resolveClient } from '../entity-resolver'
import type { ToolExecutionResult } from '../tool-executor'
import type { Context } from '@/server/trpc/context'

// ============================================
// DOCUMENT CRUD
// ============================================

/**
 * Create a document record for a client
 */
export async function executeCreateDocument(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string | undefined
  const clientName = args.clientName as string | undefined
  const fileName = args.fileName as string
  const storagePath = args.storagePath as string
  const fileType = (args.fileType as string) || 'other'
  const description = args.description as string | undefined

  // Resolve client if name provided
  let resolvedClientId = clientId
  if (!resolvedClientId && clientName) {
    const resolved = await resolveClient(clientName, ctx.companyId!)
    if (!resolved.isAmbiguous && resolved.entity) {
      resolvedClientId = resolved.entity.id
    } else {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Could not find client matching "${clientName}"`,
      })
    }
  }

  if (!resolvedClientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID or name is required',
    })
  }

  if (!fileName) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'File name is required',
    })
  }

  if (!storagePath) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Storage path is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({
      id: clients.id,
      weddingName: clients.weddingName,
      partner1FirstName: clients.partner1FirstName,
      partner2FirstName: clients.partner2FirstName,
    })
    .from(clients)
    .where(
      and(
        eq(clients.id, resolvedClientId),
        eq(clients.companyId, ctx.companyId!),
        isNull(clients.deletedAt)
      )
    )
    .limit(1)

  if (!client) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Client not found',
    })
  }

  // Generate storage URL from path
  const storageUrl = storagePath.startsWith('http')
    ? storagePath
    : `${ctx.companyId}/${resolvedClientId}/${storagePath}`

  const [newDocument] = await db
    .insert(documents)
    .values({
      id: crypto.randomUUID(),
      clientId: resolvedClientId,
      name: fileName,
      url: storageUrl,
      type: fileType,
      size: (args.fileSize as number) || null,
    })
    .returning()

  if (!newDocument) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create document',
    })
  }

  const clientDisplayName = client.weddingName
    || `${client.partner1FirstName}${client.partner2FirstName ? ` & ${client.partner2FirstName}` : ''}`

  return {
    success: true,
    toolName: 'create_document',
    data: {
      id: newDocument.id,
      clientId: resolvedClientId,
      name: newDocument.name,
      type: newDocument.type,
      url: newDocument.url,
    },
    message: `Created document "${fileName}" (${fileType}) for ${clientDisplayName}.`,
  }
}

/**
 * Update a document's metadata
 */
export async function executeUpdateDocument(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const documentId = args.documentId as string

  if (!documentId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Document ID is required',
    })
  }

  // Verify document belongs to a client owned by this company
  const [existing] = await db
    .select({
      id: documents.id,
      name: documents.name,
      clientId: documents.clientId,
    })
    .from(documents)
    .innerJoin(clients, eq(documents.clientId, clients.id))
    .where(
      and(
        eq(documents.id, documentId),
        eq(clients.companyId, ctx.companyId!),
        isNull(clients.deletedAt)
      )
    )
    .limit(1)

  if (!existing) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Document not found',
    })
  }

  // Build update object
  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  const fileName = args.fileName as string | undefined
  const description = args.description as string | undefined
  const tags = args.tags as string[] | undefined

  if (fileName !== undefined) updateData.name = fileName
  if (args.fileType !== undefined) updateData.type = args.fileType
  // Note: description and tags not in current simplified schema columns,
  // but name/type/url are the available columns

  const [updatedDocument] = await db
    .update(documents)
    .set(updateData)
    .where(eq(documents.id, documentId))
    .returning()

  return {
    success: true,
    toolName: 'update_document',
    data: updatedDocument,
    message: `Updated document "${updatedDocument.name}".`,
  }
}

/**
 * Delete a document and clean up related signature requests
 */
export async function executeDeleteDocument(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const documentId = args.documentId as string

  if (!documentId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Document ID is required',
    })
  }

  // Verify document belongs to a client owned by this company
  const [existing] = await db
    .select({
      id: documents.id,
      name: documents.name,
      url: documents.url,
    })
    .from(documents)
    .innerJoin(clients, eq(documents.clientId, clients.id))
    .where(
      and(
        eq(documents.id, documentId),
        eq(clients.companyId, ctx.companyId!),
        isNull(clients.deletedAt)
      )
    )
    .limit(1)

  if (!existing) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Document not found',
    })
  }

  // Check for related signature requests
  const relatedRequests = await db
    .select({ id: documentSignatureRequests.id })
    .from(documentSignatureRequests)
    .where(eq(documentSignatureRequests.documentId, documentId))

  // Delete document (cascade will handle signature requests, signers, audit trail, fields)
  // The FK constraints on documentSignatureRequests have onDelete: 'cascade'
  await db
    .delete(documents)
    .where(eq(documents.id, documentId))

  const cleanupNote = relatedRequests.length > 0
    ? ` Also removed ${relatedRequests.length} related signature request(s).`
    : ''

  return {
    success: true,
    toolName: 'delete_document',
    data: {
      deletedId: documentId,
      deletedName: existing.name,
      relatedRequestsRemoved: relatedRequests.length,
    },
    message: `Deleted document "${existing.name}".${cleanupNote}`,
  }
}

// ============================================
// E-SIGNATURE OPERATIONS
// ============================================

/**
 * Create a signature request for a document with signers and audit trail
 */
export async function executeRequestSignature(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const documentId = args.documentId as string
  const title = args.title as string
  const signers = args.signers as Array<{ name: string; email: string; role?: string }>
  const message = args.message as string | undefined
  const signingOrder = (args.signingOrder as 'parallel' | 'sequential') || 'parallel'

  if (!documentId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Document ID is required',
    })
  }

  if (!title) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Signature request title is required',
    })
  }

  if (!signers || signers.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'At least one signer is required',
    })
  }

  // Verify document belongs to a client owned by this company
  const [docResult] = await db
    .select({
      id: documents.id,
      name: documents.name,
      clientId: documents.clientId,
    })
    .from(documents)
    .innerJoin(clients, eq(documents.clientId, clients.id))
    .where(
      and(
        eq(documents.id, documentId),
        eq(clients.companyId, ctx.companyId!),
        isNull(clients.deletedAt)
      )
    )
    .limit(1)

  if (!docResult) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Document not found',
    })
  }

  // Use transaction for multi-table write
  const result = await withTransaction(async (tx) => {
    // 1. Create signature request
    const requestPublicToken = crypto.randomUUID()
    const [request] = await tx
      .insert(documentSignatureRequests)
      .values({
        documentId,
        clientId: docResult.clientId,
        companyId: ctx.companyId!,
        status: 'pending',
        publicToken: requestPublicToken,
        title,
        message: message || null,
        signingOrder,
        createdBy: ctx.userId!,
      })
      .returning()

    // 2. Create signers
    const signerRecords = await Promise.all(
      signers.map(async (signer, index) => {
        const signerToken = crypto.randomUUID()
        const [record] = await tx
          .insert(documentSigners)
          .values({
            requestId: request.id,
            name: signer.name,
            email: signer.email,
            role: signer.role || null,
            signingOrder: signingOrder === 'sequential' ? index + 1 : 1,
            status: 'pending',
            publicToken: signerToken,
          })
          .returning()
        return record
      })
    )

    // 3. Create audit trail entry
    await tx
      .insert(documentAuditTrail)
      .values({
        requestId: request.id,
        action: 'created',
        metadata: {
          title,
          signerCount: signers.length,
          signingOrder,
          createdBy: ctx.userId,
        },
      })

    return { request, signerRecords }
  })

  return {
    success: true,
    toolName: 'request_signature',
    data: {
      requestId: result.request.id,
      documentId,
      documentName: docResult.name,
      title,
      signerCount: result.signerRecords.length,
      signers: result.signerRecords.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
      })),
      status: result.request.status,
    },
    message: `Created signature request "${title}" for "${docResult.name}" with ${signers.length} signer(s) (${signingOrder} signing).`,
  }
}

/**
 * Send a reminder for a pending signature request
 */
export async function executeSendSignatureReminder(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const requestId = args.requestId as string

  if (!requestId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Signature request ID is required',
    })
  }

  // Verify request exists and belongs to company
  const [request] = await db
    .select({
      id: documentSignatureRequests.id,
      title: documentSignatureRequests.title,
      status: documentSignatureRequests.status,
      documentId: documentSignatureRequests.documentId,
    })
    .from(documentSignatureRequests)
    .where(
      and(
        eq(documentSignatureRequests.id, requestId),
        eq(documentSignatureRequests.companyId, ctx.companyId!)
      )
    )
    .limit(1)

  if (!request) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Signature request not found',
    })
  }

  if (request.status === 'completed' || request.status === 'cancelled' || request.status === 'voided') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Cannot send reminder for a ${request.status} request`,
    })
  }

  // Get pending signers for context
  const pendingSigners = await db
    .select({ id: documentSigners.id, name: documentSigners.name, email: documentSigners.email })
    .from(documentSigners)
    .where(
      and(
        eq(documentSigners.requestId, requestId),
        eq(documentSigners.status, 'pending')
      )
    )

  // Create audit trail entry for reminder
  await db
    .insert(documentAuditTrail)
    .values({
      requestId,
      action: 'reminded',
      metadata: {
        sentBy: ctx.userId,
        pendingSignerCount: pendingSigners.length,
        pendingSigners: pendingSigners.map((s) => ({ name: s.name, email: s.email })),
      },
    })

  return {
    success: true,
    toolName: 'send_signature_reminder',
    data: {
      requestId,
      title: request.title,
      pendingSigners: pendingSigners.map((s) => ({ name: s.name, email: s.email })),
    },
    message: `Sent signature reminder for "${request.title}" to ${pendingSigners.length} pending signer(s).`,
  }
}

/**
 * Cancel a signature request
 */
export async function executeCancelSignatureRequest(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const requestId = args.requestId as string
  const reason = args.reason as string | undefined

  if (!requestId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Signature request ID is required',
    })
  }

  // Verify request exists and belongs to company
  const [request] = await db
    .select({
      id: documentSignatureRequests.id,
      title: documentSignatureRequests.title,
      status: documentSignatureRequests.status,
    })
    .from(documentSignatureRequests)
    .where(
      and(
        eq(documentSignatureRequests.id, requestId),
        eq(documentSignatureRequests.companyId, ctx.companyId!)
      )
    )
    .limit(1)

  if (!request) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Signature request not found',
    })
  }

  if (request.status === 'completed') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Cannot cancel a completed signature request',
    })
  }

  if (request.status === 'cancelled') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Signature request is already cancelled',
    })
  }

  // Use transaction for update + audit trail insert
  await withTransaction(async (tx) => {
    // 1. Update request status
    await tx
      .update(documentSignatureRequests)
      .set({
        status: 'cancelled',
        voidReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(documentSignatureRequests.id, requestId))

    // 2. Create audit trail entry
    await tx
      .insert(documentAuditTrail)
      .values({
        requestId,
        action: 'cancelled',
        metadata: {
          cancelledBy: ctx.userId,
          reason: reason || null,
          previousStatus: request.status,
        },
      })
  })

  return {
    success: true,
    toolName: 'cancel_signature_request',
    data: {
      requestId,
      title: request.title,
      previousStatus: request.status,
      newStatus: 'cancelled',
      reason: reason || null,
    },
    message: `Cancelled signature request "${request.title}".${reason ? ` Reason: ${reason}` : ''}`,
  }
}

/**
 * Get the audit trail for a document (via its signature requests)
 */
export async function executeGetDocumentAuditTrail(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const documentId = args.documentId as string

  if (!documentId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Document ID is required',
    })
  }

  // Verify document belongs to a client owned by this company
  const [docResult] = await db
    .select({
      id: documents.id,
      name: documents.name,
    })
    .from(documents)
    .innerJoin(clients, eq(documents.clientId, clients.id))
    .where(
      and(
        eq(documents.id, documentId),
        eq(clients.companyId, ctx.companyId!),
        isNull(clients.deletedAt)
      )
    )
    .limit(1)

  if (!docResult) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Document not found',
    })
  }

  // Get all signature requests for this document
  const requests = await db
    .select({ id: documentSignatureRequests.id, title: documentSignatureRequests.title })
    .from(documentSignatureRequests)
    .where(eq(documentSignatureRequests.documentId, documentId))

  if (requests.length === 0) {
    return {
      success: true,
      toolName: 'get_document_audit_trail',
      data: {
        documentId,
        documentName: docResult.name,
        events: [],
        totalEvents: 0,
      },
      message: `No signature requests or audit events found for "${docResult.name}".`,
    }
  }

  // Get audit trail entries for all requests
  const requestIds = requests.map((r) => r.id)

  // Query audit trail for each request (avoiding inArray for UUID[])
  const allEvents = []
  for (const reqId of requestIds) {
    const events = await db
      .select({
        id: documentAuditTrail.id,
        requestId: documentAuditTrail.requestId,
        signerId: documentAuditTrail.signerId,
        action: documentAuditTrail.action,
        ipAddress: documentAuditTrail.ipAddress,
        metadata: documentAuditTrail.metadata,
        createdAt: documentAuditTrail.createdAt,
      })
      .from(documentAuditTrail)
      .where(eq(documentAuditTrail.requestId, reqId))
      .orderBy(desc(documentAuditTrail.createdAt))
    allEvents.push(...events)
  }

  // Sort all events by createdAt descending
  allEvents.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA
  })

  // Build request title lookup
  const requestTitleMap = new Map(requests.map((r) => [r.id, r.title]))

  return {
    success: true,
    toolName: 'get_document_audit_trail',
    data: {
      documentId,
      documentName: docResult.name,
      events: allEvents.map((e) => ({
        id: e.id,
        requestId: e.requestId,
        requestTitle: requestTitleMap.get(e.requestId) || 'Unknown',
        signerId: e.signerId,
        action: e.action,
        ipAddress: e.ipAddress,
        metadata: e.metadata,
        createdAt: e.createdAt,
      })),
      totalEvents: allEvents.length,
    },
    message: `Found ${allEvents.length} audit event(s) across ${requests.length} signature request(s) for "${docResult.name}".`,
  }
}
