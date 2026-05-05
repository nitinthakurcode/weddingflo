/**
 * Pipeline Executor Service
 *
 * April 2026 - Chatbot tool executors for pipeline CRM operations
 *
 * Handles:
 * - Pipeline stage creation
 * - Lead-to-client conversion (with transaction)
 * - Pipeline activity logging
 *
 * All mutations verify company ownership for tenant isolation.
 */

import { db, eq, and, isNull, sql, asc } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import {
  clients,
  user as userTable,
} from '@/lib/db/schema'
import {
  pipelineStages,
  pipelineLeads,
  pipelineActivities,
} from '@/lib/db/schema-pipeline'
import type { WeddingType } from '@/lib/db/schema/enums'
import { withTransaction } from '../transaction-wrapper'
import { recalcClientStats } from '@/lib/sync/client-stats-sync'
import type { ToolExecutionResult } from '../tool-executor'
import type { Context } from '@/server/trpc/context'

// ============================================
// EXECUTORS
// ============================================

/**
 * Create a new pipeline stage for the company.
 *
 * Requires: name
 * Optional: description, color, isWon, isLost
 */
export async function executeCreatePipelineStage(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const name = args.name as string

  if (!name) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Stage name is required' })

  // Get max sortOrder for positioning at end
  const [maxOrder] = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${pipelineStages.sortOrder}), 0)` })
    .from(pipelineStages)
    .where(eq(pipelineStages.companyId, ctx.companyId!))

  const description = (args.description as string) || null
  const color = (args.color as string) || '#6B7280'
  const isWon = (args.isWon as boolean) || false
  const isLost = (args.isLost as boolean) || false

  const [inserted] = await db
    .insert(pipelineStages)
    .values({
      companyId: ctx.companyId!,
      name,
      description,
      color,
      sortOrder: (maxOrder?.maxOrder || 0) + 1,
      isWon,
      isLost,
      isActive: true,
    })
    .returning()

  return {
    success: true,
    toolName: 'create_pipeline_stage',
    data: { id: inserted.id, name, color, isWon, isLost, sortOrder: inserted.sortOrder },
    message: `Created pipeline stage "${name}"${isWon ? ' (won stage)' : ''}${isLost ? ' (lost stage)' : ''}.`,
  }
}

/**
 * Convert a pipeline lead to a client.
 *
 * Requires: leadId
 * Optional: weddingDate, venue, budget, guestCount, weddingType
 *
 * MUST use withTransaction:
 * 1. Get lead data
 * 2. Create client from lead info
 * 3. Update lead status to 'won' and set stageId to the won stage
 * 4. Create pipeline activity for 'converted'
 * 5. Call recalcClientStats for new client
 */
export async function executeConvertLeadToClient(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const leadId = args.leadId as string

  if (!leadId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lead ID is required' })

  // Verify lead exists and belongs to company (outside transaction for fast-fail)
  const [lead] = await db
    .select()
    .from(pipelineLeads)
    .where(
      and(
        eq(pipelineLeads.id, leadId),
        eq(pipelineLeads.companyId, ctx.companyId!),
        isNull(pipelineLeads.deletedAt)
      )
    )
    .limit(1)

  if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pipeline lead not found' })

  if (lead.convertedToClientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Lead has already been converted to a client',
    })
  }

  const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ')

  // Get current user for createdBy
  const [currentUser] = ctx.userId ? await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, ctx.userId))
    .limit(1) : [undefined]

  // Find the "won" stage for this company
  const [wonStage] = await db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.companyId, ctx.companyId!),
        eq(pipelineStages.isWon, true),
        eq(pipelineStages.isActive, true)
      )
    )
    .limit(1)

  // Merge optional overrides with lead data
  const weddingDate = (args.weddingDate as string) || lead.weddingDate || null
  const venue = (args.venue as string) || lead.venue || null
  const budgetArg = args.budget as number | undefined
  const budget = budgetArg
    ? budgetArg.toString()
    : lead.estimatedBudget || null
  const guestCount = (args.guestCount as number) || lead.estimatedGuestCount || null
  const weddingType = (args.weddingType as string) || lead.weddingType || 'traditional'

  // Transaction: create client, update lead, log activity
  const result = await withTransaction(async (tx) => {
    // 1. Create client from lead info
    const clientId = crypto.randomUUID()
    const [newClient] = await tx
      .insert(clients)
      .values({
        id: clientId,
        companyId: ctx.companyId!,
        partner1FirstName: lead.firstName,
        partner1LastName: lead.lastName || null,
        partner1Email: lead.email || null,
        partner1Phone: lead.phone || null,
        partner2FirstName: lead.partnerFirstName || null,
        partner2LastName: lead.partnerLastName || null,
        partner2Email: lead.partnerEmail || null,
        partner2Phone: lead.partnerPhone || null,
        weddingDate,
        venue,
        budget,
        guestCount,
        weddingType: weddingType as WeddingType,
        status: 'planning',
        notes: lead.notes || null,
        createdBy: currentUser?.id || null,
        metadata: {
          convertedFromLeadId: lead.id,
          leadSource: lead.source,
          leadTags: lead.tags,
        },
      })
      .returning()

    if (!newClient) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create client from lead' })
    }

    // 2. Update lead status to 'won' and mark conversion
    await tx
      .update(pipelineLeads)
      .set({
        convertedToClientId: newClient.id,
        convertedAt: new Date(),
        status: 'won',
        stageId: wonStage?.id || lead.stageId,
        updatedAt: new Date(),
      })
      .where(eq(pipelineLeads.id, leadId))

    // 3. Create activity entry for conversion
    if (currentUser) {
      await tx.insert(pipelineActivities).values({
        leadId,
        companyId: ctx.companyId!,
        userId: currentUser.id,
        type: 'note',
        title: 'Converted to client',
        description: `Lead "${leadName}" was successfully converted to client #${newClient.id}`,
        metadata: { clientId: newClient.id },
      })
    }

    return newClient
  })

  // 4. Recalc client stats OUTSIDE the transaction (rule 10: broadcastSync outside tx)
  try {
    await recalcClientStats(db, result.id)
  } catch (error) {
    // recalcClientStats failure must not block (new client with no budget/guests is fine)
    console.warn('[convertLeadToClient] recalcClientStats warning:', error instanceof Error ? error.message : String(error))
  }

  return {
    success: true,
    toolName: 'convert_lead_to_client',
    data: {
      clientId: result.id,
      leadId,
      leadName,
      weddingDate,
      venue,
    },
    message: `Converted lead "${leadName}" to client. New client ID: ${result.id}.`,
    cascadeResults: [
      { action: 'Created client from lead data', entityType: 'client', entityId: result.id },
      { action: 'Updated lead status to won', entityType: 'pipelineLead', entityId: leadId },
      { action: 'Logged conversion activity', entityType: 'pipelineActivity', entityId: leadId },
    ],
  }
}

/**
 * Create a pipeline activity entry for a lead.
 *
 * Requires: leadId, type, title
 * Optional: description
 */
export async function executeCreatePipelineActivity(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const leadId = args.leadId as string
  const type = args.type as string
  const title = args.title as string

  if (!leadId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Lead ID is required' })
  if (!type) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Activity type is required' })
  if (!title) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Activity title is required' })

  // Validate activity type
  const validTypes = ['note', 'call', 'email', 'meeting', 'task', 'follow_up']
  if (!validTypes.includes(type)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid activity type "${type}". Valid types: ${validTypes.join(', ')}`,
    })
  }

  // Verify lead belongs to company
  const [lead] = await db
    .select({ id: pipelineLeads.id, firstName: pipelineLeads.firstName, lastName: pipelineLeads.lastName })
    .from(pipelineLeads)
    .where(
      and(
        eq(pipelineLeads.id, leadId),
        eq(pipelineLeads.companyId, ctx.companyId!),
        isNull(pipelineLeads.deletedAt)
      )
    )
    .limit(1)

  if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pipeline lead not found' })

  const description = (args.description as string) || null
  const leadName = [lead.firstName, lead.lastName].filter(Boolean).join(' ')

  const [inserted] = await db
    .insert(pipelineActivities)
    .values({
      leadId,
      companyId: ctx.companyId!,
      userId: ctx.userId!,
      type: type as 'note' | 'call' | 'email' | 'meeting' | 'task' | 'follow_up',
      title,
      description,
    })
    .returning()

  return {
    success: true,
    toolName: 'create_pipeline_activity',
    data: { id: inserted.id, leadId, type, title },
    message: `Created ${type} activity "${title}" for lead "${leadName}".`,
  }
}
