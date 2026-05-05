/**
 * Query Executor Service
 *
 * April 2026 - Chatbot tool executors for read-only queries
 *
 * Handles:
 * - Questionnaire response retrieval
 * - Wedding website analytics summary
 * - Floor plan summary with table and guest counts
 *
 * All queries verify company ownership for tenant isolation.
 * These are query-only tools (no mutations).
 */

import { db, eq, and, isNull, sql, count } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import {
  clients,
  guests,
  floorPlans,
  floorPlanTables,
  floorPlanGuests,
  weddingWebsites,
} from '@/lib/db/schema'
import {
  questionnaires,
  questionnaireResponses,
} from '@/lib/db/schema-questionnaires'
import type { ToolExecutionResult } from '../tool-executor'
import type { Context } from '@/server/trpc/context'

// ============================================
// EXECUTORS
// ============================================

/**
 * Get questionnaire responses for a given questionnaire.
 *
 * Requires: questionnaireId
 * Optional: clientId (for additional context)
 */
export async function executeGetQuestionnaireResponses(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const questionnaireId = args.questionnaireId as string
  const clientId = args.clientId as string | undefined

  if (!questionnaireId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Questionnaire ID is required' })

  // Verify questionnaire belongs to company
  const [questionnaire] = await db
    .select({
      id: questionnaires.id,
      name: questionnaires.name,
      status: questionnaires.status,
      clientId: questionnaires.clientId,
      questions: questionnaires.questions,
      completedAt: questionnaires.completedAt,
    })
    .from(questionnaires)
    .where(
      and(
        eq(questionnaires.id, questionnaireId),
        eq(questionnaires.companyId, ctx.companyId!)
      )
    )
    .limit(1)

  if (!questionnaire) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Questionnaire not found' })
  }

  // If clientId provided, verify it matches
  if (clientId && questionnaire.clientId && questionnaire.clientId !== clientId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Questionnaire does not belong to the specified client' })
  }

  // Get all responses
  const responses = await db
    .select({
      id: questionnaireResponses.id,
      questionId: questionnaireResponses.questionId,
      answer: questionnaireResponses.answer,
      answeredAt: questionnaireResponses.answeredAt,
      updatedAt: questionnaireResponses.updatedAt,
    })
    .from(questionnaireResponses)
    .where(eq(questionnaireResponses.questionnaireId, questionnaireId))

  // Build a question map for enriched output
  const questions = (questionnaire.questions || []) as Array<{
    id: string
    question: string
    type: string
    section?: string
  }>
  const questionMap = new Map(questions.map(q => [q.id, q]))

  // Enrich responses with question text
  const enrichedResponses = responses.map(r => {
    const question = questionMap.get(r.questionId)
    return {
      questionId: r.questionId,
      questionText: question?.question || 'Unknown question',
      questionType: question?.type || 'unknown',
      section: question?.section || null,
      answer: r.answer,
      answeredAt: r.answeredAt,
    }
  })

  const totalQuestions = questions.length
  const answeredQuestions = responses.length
  const completionRate = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0

  return {
    success: true,
    toolName: 'get_questionnaire_responses',
    data: {
      questionnaireId,
      name: questionnaire.name,
      status: questionnaire.status,
      clientId: questionnaire.clientId,
      totalQuestions,
      answeredQuestions,
      completionRate,
      completedAt: questionnaire.completedAt,
      responses: enrichedResponses,
    },
    message: `Questionnaire "${questionnaire.name}": ${answeredQuestions}/${totalQuestions} questions answered (${completionRate}% complete). Status: ${questionnaire.status}.`,
  }
}

/**
 * Get wedding website analytics summary.
 *
 * Optional: websiteId, clientId, period
 *
 * Note: There is no dedicated analytics/visits table in the schema.
 * This returns the website configuration and published status.
 * Visit tracking would require external analytics integration.
 */
export async function executeGetWebsiteAnalytics(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const websiteId = args.websiteId as string | undefined
  const clientId = args.clientId as string | undefined

  if (!websiteId && !clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either websiteId or clientId is required' })
  }

  // Build query conditions
  const conditions = []

  if (websiteId) {
    conditions.push(eq(weddingWebsites.id, websiteId))
  }
  if (clientId) {
    // Verify client belongs to company
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!), isNull(clients.deletedAt)))
      .limit(1)

    if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
    conditions.push(eq(weddingWebsites.clientId, clientId))
  }
  conditions.push(isNull(weddingWebsites.deletedAt))

  const websites = await db
    .select({
      id: weddingWebsites.id,
      clientId: weddingWebsites.clientId,
      subdomain: weddingWebsites.subdomain,
      customDomain: weddingWebsites.customDomain,
      theme: weddingWebsites.theme,
      published: weddingWebsites.published,
      isPasswordProtected: weddingWebsites.isPasswordProtected,
      settings: weddingWebsites.settings,
      createdAt: weddingWebsites.createdAt,
      updatedAt: weddingWebsites.updatedAt,
    })
    .from(weddingWebsites)
    .where(and(...conditions))

  if (websites.length === 0) {
    return {
      success: true,
      toolName: 'get_website_analytics',
      data: { websites: [], totalWebsites: 0 },
      message: 'No wedding websites found for the specified criteria.',
    }
  }

  // Build summary for each website
  const websiteSummaries = websites.map(w => {
    const settings = (w.settings || {}) as Record<string, unknown>
    return {
      id: w.id,
      clientId: w.clientId,
      subdomain: w.subdomain,
      customDomain: w.customDomain,
      theme: w.theme,
      published: w.published,
      isPasswordProtected: w.isPasswordProtected,
      url: w.customDomain
        ? `https://${w.customDomain}`
        : w.subdomain
          ? `https://${w.subdomain}.weddingflo.com`
          : null,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      // Analytics note: visit tracking requires external integration
      analytics: {
        note: 'Visit tracking is handled by external analytics. Check your analytics dashboard for detailed visitor data.',
        visits: settings.totalVisits || null,
        uniqueVisitors: settings.uniqueVisitors || null,
        pageViews: settings.pageViews || null,
      },
    }
  })

  const publishedCount = websites.filter(w => w.published).length

  return {
    success: true,
    toolName: 'get_website_analytics',
    data: {
      websites: websiteSummaries,
      totalWebsites: websites.length,
      publishedCount,
    },
    message: `Found ${websites.length} wedding website(s) (${publishedCount} published).${websiteSummaries[0]?.url ? ` Primary URL: ${websiteSummaries[0].url}` : ''}`,
  }
}

/**
 * Get a summary of a floor plan including table and guest assignment stats.
 *
 * Optional: floorPlanId, clientId
 * Returns: table count, assigned guest count, unassigned guest count, tables with capacity info
 */
export async function executeGetFloorPlanSummary(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const floorPlanId = args.floorPlanId as string | undefined
  const clientId = args.clientId as string | undefined

  if (!floorPlanId && !clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either floorPlanId or clientId is required' })
  }

  // If clientId provided, verify it belongs to company
  if (clientId) {
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!), isNull(clients.deletedAt)))
      .limit(1)

    if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
  }

  // Get floor plans
  const fpConditions = []
  if (floorPlanId) {
    fpConditions.push(eq(floorPlans.id, floorPlanId))
  }
  if (clientId) {
    fpConditions.push(eq(floorPlans.clientId, clientId))
  }

  const plans = await db
    .select({
      id: floorPlans.id,
      clientId: floorPlans.clientId,
      name: floorPlans.name,
      width: floorPlans.width,
      height: floorPlans.height,
      eventId: floorPlans.eventId,
      createdAt: floorPlans.createdAt,
    })
    .from(floorPlans)
    .innerJoin(clients, eq(floorPlans.clientId, clients.id))
    .where(and(eq(clients.companyId, ctx.companyId!), ...fpConditions))

  if (plans.length === 0) {
    return {
      success: true,
      toolName: 'get_floor_plan_summary',
      data: { floorPlans: [], totalPlans: 0 },
      message: 'No floor plans found for the specified criteria.',
    }
  }

  // Build summary for each floor plan
  const planSummaries = []

  for (const plan of plans) {
    // Get tables with assignment counts
    const tables = await db
      .select({
        id: floorPlanTables.id,
        name: floorPlanTables.name,
        tableNumber: floorPlanTables.tableNumber,
        shape: floorPlanTables.shape,
        capacity: floorPlanTables.capacity,
        metadata: floorPlanTables.metadata,
      })
      .from(floorPlanTables)
      .where(eq(floorPlanTables.floorPlanId, plan.id))

    // Get total assigned guests for this floor plan
    const [assignedResult] = await db
      .select({ count: count() })
      .from(floorPlanGuests)
      .where(eq(floorPlanGuests.floorPlanId, plan.id))

    const totalAssigned = Number(assignedResult?.count || 0)

    // Get per-table assignment counts
    const tableAssignments = await db
      .select({
        tableId: floorPlanGuests.tableId,
        count: count(),
      })
      .from(floorPlanGuests)
      .where(eq(floorPlanGuests.floorPlanId, plan.id))
      .groupBy(floorPlanGuests.tableId)

    const assignmentsByTable = new Map(tableAssignments.map(ta => [ta.tableId, Number(ta.count)]))

    // Build table details
    const tableDetails = tables.map(t => {
      const assigned = assignmentsByTable.get(t.id) || 0
      const tableMetadata = (t.metadata as { maxCapacity?: number; isVip?: boolean }) || {}
      const maxCap = tableMetadata.maxCapacity || t.capacity || 8

      return {
        id: t.id,
        name: t.name,
        tableNumber: t.tableNumber,
        shape: t.shape,
        capacity: maxCap,
        assignedGuests: assigned,
        availableSeats: Math.max(0, maxCap - assigned),
        isFull: assigned >= maxCap,
        isVip: tableMetadata.isVip || false,
      }
    })

    // Get total guest count for the client to calculate unassigned
    const [totalGuestResult] = await db
      .select({ count: count() })
      .from(guests)
      .where(eq(guests.clientId, plan.clientId))

    const totalGuests = Number(totalGuestResult?.count || 0)
    const totalCapacity = tableDetails.reduce((sum, t) => sum + t.capacity, 0)

    planSummaries.push({
      id: plan.id,
      name: plan.name,
      clientId: plan.clientId,
      eventId: plan.eventId,
      dimensions: { width: plan.width, height: plan.height },
      tableCount: tables.length,
      totalCapacity,
      assignedGuestCount: totalAssigned,
      unassignedGuestCount: Math.max(0, totalGuests - totalAssigned),
      totalClientGuests: totalGuests,
      utilizationPercent: totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0,
      tables: tableDetails,
    })
  }

  // Build message
  if (planSummaries.length === 1) {
    const s = planSummaries[0]
    return {
      success: true,
      toolName: 'get_floor_plan_summary',
      data: { floorPlans: planSummaries, totalPlans: 1 },
      message: `Floor plan "${s.name}": ${s.tableCount} table(s), ${s.assignedGuestCount}/${s.totalClientGuests} guests assigned (${s.utilizationPercent}% capacity used). ${s.unassignedGuestCount} guest(s) still need seating.`,
    }
  }

  const totalTables = planSummaries.reduce((sum, s) => sum + s.tableCount, 0)
  const totalAssignedAll = planSummaries.reduce((sum, s) => sum + s.assignedGuestCount, 0)

  return {
    success: true,
    toolName: 'get_floor_plan_summary',
    data: { floorPlans: planSummaries, totalPlans: planSummaries.length },
    message: `Found ${planSummaries.length} floor plan(s) with ${totalTables} total table(s) and ${totalAssignedAll} guest(s) assigned.`,
  }
}
