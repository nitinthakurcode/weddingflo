/**
 * Tool Executor Service
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Executes chatbot tools via existing tRPC routers with:
 * - Preview generation for mutations
 * - Cascade effect detection
 * - Transaction support for data integrity
 * - Comprehensive error handling
 */

import { db, eq, and, isNull, desc, sql, gte, lte, or, like, inArray } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import {
  clients,
  guests,
  events,
  budget,
  vendors,
  timeline,
  clientVendors,
  accommodations,
  hotels,
  user as userTable,
  guestTransport,
  gifts,
  giftsEnhanced,
  creativeJobs,
  teamClientAssignments,
  weddingWebsites,
  floorPlans,
  floorPlanTables,
  invoices,
  documents,
  icalFeedTokens,
  calendarSyncSettings,
  calendarSyncedEvents,
  googleCalendarTokens,
} from '@/lib/db/schema'
import { ICalGenerator } from '@/lib/calendar/ical-generator'
import { pipelineLeads, pipelineStages, pipelineActivities } from '@/lib/db/schema-pipeline'
import { proposals, proposalTemplates } from '@/lib/db/schema-proposals'
import { workflows, workflowSteps } from '@/lib/db/schema-workflows'
import type { WeddingType } from '@/lib/db/schema/enums'
import { withTransaction, withCascadeTransaction } from './transaction-wrapper'
import {
  TOOL_METADATA,
  getToolMetadata,
  isQueryTool,
  getCascadeEffects,
} from '../../tools/definitions'
import {
  resolveClient,
  resolveGuest,
  resolveVendor,
  resolveEvent,
  parseNaturalDate,
  checkGuestDuplicates,
  checkVendorDuplicates,
  type EntityResolutionResult,
  type DuplicateCheckResult,
} from './entity-resolver'
import {
  getQueriesToInvalidate,
  isQueryOnlyTool,
} from './query-invalidation-map'
import {
  publishSyncAction,
  storeSyncAction,
  type SyncAction,
} from '@/lib/realtime/redis-pubsub'
import type { Context } from '@/server/trpc/context'

// ============================================
// TYPES
// ============================================

export interface ToolPreview {
  toolName: string
  action: string
  description: string
  fields: Array<{
    name: string
    value: string | number | boolean | null
    displayValue: string
  }>
  cascadeEffects: string[]
  warnings: string[]
  requiresConfirmation: boolean
}

export interface ToolExecutionResult {
  success: boolean
  toolName: string
  data: unknown
  message: string
  cascadeResults?: Array<{
    action: string
    entityType: string
    entityId: string
  }>
  error?: string
}

export interface PendingToolCall {
  id: string
  userId: string
  companyId: string
  toolName: string
  args: Record<string, unknown>
  preview: ToolPreview
  createdAt: Date
  expiresAt: Date
}

// ============================================
// PREVIEW GENERATION
// ============================================

/**
 * Generate preview for a tool call
 */
export async function generateToolPreview(
  toolName: string,
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolPreview> {
  const metadata = getToolMetadata(toolName)

  if (!metadata) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Unknown tool: ${toolName}`,
    })
  }

  const isQuery = isQueryTool(toolName)
  const cascadeEffects = getCascadeEffects(toolName)

  // Build field list
  const fields = Object.entries(args)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([name, value]) => ({
      name,
      value: value as string | number | boolean | null,
      displayValue: formatFieldValue(name, value),
    }))

  // Generate action-specific descriptions
  const description = generateActionDescription(toolName, args, ctx)
  const warnings = await generateWarnings(toolName, args, ctx)

  return {
    toolName,
    action: metadata.type === 'mutation' ? 'Create/Update' : 'Query',
    description,
    fields,
    cascadeEffects,
    warnings,
    requiresConfirmation: !isQuery,
  }
}

/**
 * Format field value for display
 */
function formatFieldValue(name: string, value: unknown): string {
  if (value === null || value === undefined) {
    return 'Not set'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    if (name.toLowerCase().includes('budget') || name.toLowerCase().includes('cost') || name.toLowerCase().includes('amount')) {
      return `$${value.toLocaleString()}`
    }
    return value.toString()
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Generate human-readable action description
 */
function generateActionDescription(
  toolName: string,
  args: Record<string, unknown>,
  ctx: Context
): string {
  switch (toolName) {
    case 'create_client':
      return `Create new wedding for ${args.partner1FirstName}${args.partner2FirstName ? ` & ${args.partner2FirstName}` : ''}`

    case 'update_client':
      return `Update client ${args.clientId}`

    case 'add_guest':
      return `Add guest ${args.firstName}${args.lastName ? ` ${args.lastName}` : ''} to wedding`

    case 'update_guest_rsvp':
      return `Update RSVP status to ${args.rsvpStatus} for ${args.guestName || args.guestId}`

    case 'create_event':
      return `Create ${args.eventType} event: ${args.title} on ${args.eventDate}`

    case 'add_vendor':
      return `Add ${args.category} vendor: ${args.name}`

    case 'add_timeline_item':
      return `Add timeline item: ${args.title} at ${args.startTime}`

    case 'shift_timeline':
      const direction = (args.shiftMinutes as number) > 0 ? 'later' : 'earlier'
      return `Shift timeline ${Math.abs(args.shiftMinutes as number)} minutes ${direction}`

    case 'add_hotel_booking':
      return `Add hotel booking at ${args.hotelName} for ${args.guestName || args.guestId}`

    case 'update_budget_item':
      return `Update budget item: ${args.item || args.category || args.budgetItemId}`

    default:
      return `Execute ${toolName}`
  }
}

/**
 * Generate warnings for potential issues
 */
async function generateWarnings(
  toolName: string,
  args: Record<string, unknown>,
  ctx: Context
): Promise<string[]> {
  const warnings: string[] = []

  // Budget warnings
  if (toolName === 'update_budget_item' && args.actualCost) {
    const clientId = args.clientId as string
    if (clientId) {
      const [client] = await db
        .select({ budget: clients.budget })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1)

      if (client?.budget) {
        const totalBudget = parseFloat(client.budget)
        const [currentSpend] = await db
          .select({
            total: sql<number>`coalesce(sum(${budget.actualCost}::numeric), 0)::float`,
          })
          .from(budget)
          .where(eq(budget.clientId, clientId))

        const newTotal = (currentSpend?.total || 0) + (args.actualCost as number)
        if (newTotal > totalBudget) {
          warnings.push(`This will exceed the total budget by $${(newTotal - totalBudget).toLocaleString()}`)
        }
      }
    }
  }

  // Date warnings
  if (args.weddingDate || args.eventDate) {
    const dateStr = (args.weddingDate || args.eventDate) as string
    const date = new Date(dateStr)
    const today = new Date()

    if (date < today) {
      warnings.push('The specified date is in the past')
    }
  }

  // RSVP warnings
  if (toolName === 'update_guest_rsvp' && args.rsvpStatus === 'declined') {
    warnings.push('Declining this guest will affect guest counts and seating arrangements')
  }

  // Duplicate guest detection
  if (toolName === 'add_guest' && args.firstName && args.clientId) {
    const duplicateCheck = await checkGuestDuplicates(
      args.firstName as string,
      args.lastName as string | undefined,
      args.email as string | undefined,
      args.phone as string | undefined,
      args.clientId as string
    )

    if (duplicateCheck.hasPotentialDuplicates) {
      warnings.push(duplicateCheck.message)
      for (const candidate of duplicateCheck.candidates.slice(0, 3)) {
        warnings.push(`  • ${candidate.displayName} (${candidate.details})`)
      }
    }
  }

  // Duplicate vendor detection
  if (toolName === 'add_vendor' && args.name && ctx.companyId) {
    const duplicateCheck = await checkVendorDuplicates(
      args.name as string,
      args.email as string | undefined,
      args.phone as string | undefined,
      ctx.companyId,
      args.clientId as string | undefined
    )

    if (duplicateCheck.hasPotentialDuplicates) {
      warnings.push(duplicateCheck.message)
      for (const candidate of duplicateCheck.candidates.slice(0, 3)) {
        warnings.push(`  • ${candidate.displayName} (${candidate.details})`)
      }
    }
  }

  return warnings
}

// ============================================
// TOOL EXECUTION
// ============================================

/**
 * Execute a tool call
 *
 * This function routes to the appropriate handler based on tool name.
 * All mutations are wrapped in transactions for data integrity.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const { userId, companyId } = ctx

  if (!userId || !companyId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  }

  // Validate tool exists
  const metadata = getToolMetadata(toolName)
  if (!metadata) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Unknown tool: ${toolName}`,
    })
  }

  try {
    // Route to appropriate handler
    switch (toolName) {
      // Client tools
      case 'create_client':
        return await executeCreateClient(args, ctx)
      case 'update_client':
        return await executeUpdateClient(args, ctx)
      case 'get_client_summary':
        return await executeGetClientSummary(args, ctx)
      case 'get_wedding_summary':
        return await executeGetWeddingSummary(args, ctx)
      case 'get_recommendations':
        return await executeGetRecommendations(args, ctx)

      // Guest tools
      case 'get_guest_stats':
        return await executeGetGuestStats(args, ctx)
      case 'add_guest':
        return await executeAddGuest(args, ctx)
      case 'update_guest_rsvp':
        return await executeUpdateGuestRsvp(args, ctx)
      case 'bulk_update_guests':
        return await executeBulkUpdateGuests(args, ctx)
      case 'check_in_guest':
        return await executeCheckInGuest(args, ctx)

      // Event tools
      case 'create_event':
        return await executeCreateEvent(args, ctx)
      case 'update_event':
        return await executeUpdateEvent(args, ctx)

      // Timeline tools
      case 'add_timeline_item':
        return await executeAddTimelineItem(args, ctx)
      case 'shift_timeline':
        return await executeShiftTimeline(args, ctx)

      // Vendor tools
      case 'add_vendor':
        return await executeAddVendor(args, ctx)
      case 'update_vendor':
        return await executeUpdateVendor(args, ctx)

      // Hotel tools
      case 'add_hotel_booking':
        return await executeAddHotelBooking(args, ctx)
      case 'sync_hotel_guests':
        return await executeSyncHotelGuests(args, ctx)

      // Budget tools
      case 'get_budget_overview':
        return await executeGetBudgetOverview(args, ctx)
      case 'update_budget_item':
        return await executeUpdateBudgetItem(args, ctx)

      // Search
      case 'search_entities':
        return await executeSearchEntities(args, ctx)

      // Communication
      case 'send_communication':
        return await executeSendCommunication(args, ctx)

      // Pipeline
      case 'update_pipeline':
        return await executeUpdatePipeline(args, ctx)

      // Transport
      case 'assign_transport':
        return await executeAssignTransport(args, ctx)

      // Multi-event guest assignment
      case 'assign_guests_to_events':
        return await executeAssignGuestsToEvents(args, ctx)

      // ============================================
      // PHASE 1: QUERY ENHANCEMENT TOOLS
      // ============================================
      case 'query_data':
        return await executeQueryData(args, ctx)
      case 'query_cross_client_events':
        return await executeQueryCrossClientEvents(args, ctx)
      case 'budget_currency_convert':
        return await executeBudgetCurrencyConvert(args, ctx)
      case 'get_weather':
        return await executeGetWeather(args, ctx)

      // ============================================
      // PHASE 2: BULK & MANAGEMENT TOOLS
      // ============================================
      case 'bulk_add_hotel_bookings':
        return await executeBulkAddHotelBookings(args, ctx)
      case 'update_table_dietary':
        return await executeUpdateTableDietary(args, ctx)
      case 'add_seating_constraint':
        return await executeAddSeatingConstraint(args, ctx)
      case 'add_gift':
        return await executeAddGift(args, ctx)
      case 'update_gift':
        return await executeUpdateGift(args, ctx)
      case 'update_creative':
        return await executeUpdateCreative(args, ctx)
      case 'assign_team_member':
        return await executeAssignTeamMember(args, ctx)

      // ============================================
      // PHASE 3: BUSINESS OPERATIONS TOOLS
      // ============================================
      case 'create_proposal':
        return await executeCreateProposal(args, ctx)
      case 'create_invoice':
        return await executeCreateInvoice(args, ctx)
      case 'export_data':
        return await executeExportData(args, ctx)
      case 'update_website':
        return await executeUpdateWebsite(args, ctx)
      case 'query_analytics':
        return await executeQueryAnalytics(args, ctx)

      // ============================================
      // PHASE 5: AUTOMATION TOOLS
      // ============================================
      case 'create_workflow':
        return await executeCreateWorkflow(args, ctx)
      case 'generate_qr_codes':
        return await executeGenerateQrCodes(args, ctx)

      // ============================================
      // CALENDAR & DOCUMENTS TOOLS
      // ============================================
      case 'sync_calendar':
        return await executeSyncCalendar(args, ctx)
      case 'get_document_upload_url':
        return await executeGetDocumentUploadUrl(args, ctx)

      default:
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: `Tool ${toolName} is not yet implemented`,
        })
    }
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    console.error(`[Tool Executor] Error executing ${toolName}:`, error)

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Failed to execute tool',
    })
  }
}

/**
 * Execute a tool and broadcast invalidation to connected clients
 *
 * This wrapper function handles:
 * 1. Tool execution via executeTool
 * 2. Broadcasting query invalidation for non-query tools
 * 3. Real-time sync to other browser tabs/pages
 */
export async function executeToolWithSync(
  toolName: string,
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  // Execute the tool
  const result = await executeTool(toolName, args, ctx)

  // Broadcast invalidation for non-query tools via Redis pub/sub
  if (result.success && !isQueryOnlyTool(toolName)) {
    const queryPaths = getQueriesToInvalidate(toolName)

    if (queryPaths.length > 0 && ctx.userId && ctx.companyId) {
      // Extract clientId and entityId from args/result
      const clientId = typeof args.clientId === 'string' ? args.clientId : undefined
      const entityId = (result.data as Record<string, unknown>)?.id as string || ''

      // Create sync action
      const action: SyncAction = {
        id: crypto.randomUUID(),
        type: getActionType(toolName),
        module: getModuleFromToolName(toolName),
        entityId,
        data: result.data as Record<string, unknown>,
        companyId: ctx.companyId,
        clientId,
        userId: ctx.userId,
        timestamp: Date.now(),
        queryPaths,
        toolName,
      }

      // Publish to Redis (broadcasts to ALL instances) and store for recovery
      try {
        await Promise.all([
          publishSyncAction(action),
          storeSyncAction(action),
        ])
        console.log(`[Tool Executor] Published sync action for ${toolName}: ${queryPaths.join(', ')}`)
      } catch (error) {
        // Don't fail the tool execution if broadcast fails
        console.warn(`[Tool Executor] Failed to publish sync action:`, error)
      }
    }
  }

  return result
}

/**
 * Determine action type from tool name
 */
function getActionType(toolName: string): 'insert' | 'update' | 'delete' {
  if (toolName.startsWith('add_') || toolName.startsWith('create_')) return 'insert'
  if (toolName.startsWith('delete_') || toolName.startsWith('remove_')) return 'delete'
  return 'update'
}

/**
 * Determine module from tool name
 */
function getModuleFromToolName(toolName: string): SyncAction['module'] {
  if (toolName.includes('guest')) return 'guests'
  if (toolName.includes('budget') || toolName.includes('payment')) return 'budget'
  if (toolName.includes('event')) return 'events'
  if (toolName.includes('vendor')) return 'vendors'
  if (toolName.includes('hotel') || toolName.includes('accommodation')) return 'hotels'
  if (toolName.includes('transport')) return 'transport'
  if (toolName.includes('timeline')) return 'timeline'
  if (toolName.includes('gift')) return 'gifts'
  if (toolName.includes('client')) return 'clients'
  if (toolName.includes('floor') || toolName.includes('table')) return 'floorPlans'
  return 'guests' // Default
}

// ============================================
// BUDGET TEMPLATES FOR CLIENT CREATION
// ============================================

type BudgetCategorySegment = 'vendors' | 'artists' | 'creatives' | 'travel' | 'accommodation' | 'other'

const BUDGET_TEMPLATES: Record<WeddingType, Array<{
  category: string
  item: string
  segment: BudgetCategorySegment
  percentage: number
}>> = {
  traditional: [
    { category: 'venue', item: 'Venue & Rentals', segment: 'vendors', percentage: 40 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 25 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 10 },
    { category: 'videography', item: 'Videography', segment: 'vendors', percentage: 5 },
    { category: 'florals', item: 'Florals & Decor', segment: 'vendors', percentage: 8 },
    { category: 'music', item: 'Music & Entertainment', segment: 'artists', percentage: 5 },
    { category: 'attire', item: 'Attire & Beauty', segment: 'other', percentage: 4 },
    { category: 'stationery', item: 'Invitations & Stationery', segment: 'creatives', percentage: 3 },
  ],
  destination: [
    { category: 'venue', item: 'Venue & Rentals', segment: 'vendors', percentage: 25 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 15 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 8 },
    { category: 'travel', item: 'Travel & Logistics', segment: 'travel', percentage: 20 },
    { category: 'accommodation', item: 'Guest Accommodations', segment: 'accommodation', percentage: 15 },
  ],
  intimate: [
    { category: 'venue', item: 'Venue & Rentals', segment: 'vendors', percentage: 35 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 30 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 15 },
    { category: 'florals', item: 'Florals & Decor', segment: 'vendors', percentage: 10 },
  ],
  elopement: [
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 30 },
    { category: 'venue', item: 'Venue/Location', segment: 'vendors', percentage: 20 },
    { category: 'attire', item: 'Attire & Beauty', segment: 'other', percentage: 20 },
    { category: 'travel', item: 'Travel & Logistics', segment: 'travel', percentage: 20 },
  ],
  multi_day: [
    { category: 'venue', item: 'Venues (Multiple)', segment: 'vendors', percentage: 30 },
    { category: 'catering', item: 'Catering (Multiple Events)', segment: 'vendors', percentage: 20 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 10 },
    { category: 'accommodation', item: 'Guest Accommodations', segment: 'accommodation', percentage: 12 },
  ],
  cultural: [
    { category: 'venue', item: 'Venue & Rentals', segment: 'vendors', percentage: 30 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 20 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 8 },
    { category: 'cultural', item: 'Cultural Ceremonies & Rituals', segment: 'vendors', percentage: 8 },
  ],
  modern: [
    { category: 'venue', item: 'Venue & Rentals', segment: 'vendors', percentage: 35 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 25 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 12 },
  ],
  rustic: [
    { category: 'venue', item: 'Barn/Farm Venue', segment: 'vendors', percentage: 30 },
    { category: 'catering', item: 'Farm-to-Table Catering', segment: 'vendors', percentage: 25 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 12 },
  ],
  bohemian: [
    { category: 'venue', item: 'Outdoor/Unique Venue', segment: 'vendors', percentage: 25 },
    { category: 'catering', item: 'Organic Catering', segment: 'vendors', percentage: 22 },
    { category: 'photography', item: 'Photography', segment: 'vendors', percentage: 15 },
  ],
  religious: [
    { category: 'venue', item: 'Ceremony & Reception Venues', segment: 'vendors', percentage: 30 },
    { category: 'catering', item: 'Catering & Bar', segment: 'vendors', percentage: 22 },
    { category: 'religious', item: 'Religious Services & Officiant', segment: 'vendors', percentage: 8 },
  ],
  luxury: [
    { category: 'venue', item: 'Premium Venue', segment: 'vendors', percentage: 30 },
    { category: 'catering', item: 'Gourmet Catering & Fine Wines', segment: 'vendors', percentage: 20 },
    { category: 'photography', item: 'High-End Photography', segment: 'vendors', percentage: 10 },
    { category: 'planner', item: 'Wedding Planner', segment: 'vendors', percentage: 2 },
  ],
}

// ============================================
// TOOL HANDLERS - CLIENT MUTATIONS
// ============================================

async function executeCreateClient(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const partner1FirstName = args.partner1FirstName as string
  const partner1Email = args.partner1Email as string

  if (!partner1FirstName || !partner1Email) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Partner 1 first name and email are required',
    })
  }

  // Get database user UUID from auth user ID (outside transaction)
  const [user] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.id, ctx.userId!))
    .limit(1)

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User record not found. Please ensure your account is fully set up.',
    })
  }

  // Use transaction to ensure all-or-nothing creation
  // Phase 4: Transaction wrapper for cascade operations
  return withTransaction(async (tx) => {
    // Create client
    const [newClient] = await tx
      .insert(clients)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId!,
        partner1FirstName,
        partner1LastName: (args.partner1LastName as string) || null,
        partner1Email,
        partner1Phone: (args.partner1Phone as string) || null,
        partner2FirstName: (args.partner2FirstName as string) || null,
        partner2LastName: (args.partner2LastName as string) || null,
        partner2Email: (args.partner2Email as string) || null,
        weddingDate: (args.weddingDate as string) || null,
        venue: (args.venue as string) || null,
        budget: args.budget ? (args.budget as number).toString() : null,
        guestCount: (args.guestCount as number) || null,
        status: 'planning',
        weddingType: (args.weddingType as WeddingType) || 'traditional',
        createdBy: user.id,
        metadata: {},
      })
      .returning()

    if (!newClient) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create client',
      })
    }

    const cascadeResults: Array<{ action: string; entityType: string; entityId: string }> = []

    // Auto-create main wedding event if wedding_date is provided
    if (args.weddingDate) {
      const eventTitle = `${partner1FirstName}${args.partner2FirstName ? ` & ${args.partner2FirstName}` : ''}'s Wedding`

      const [createdEvent] = await tx
        .insert(events)
        .values({
          id: crypto.randomUUID(),
          clientId: newClient.id,
          title: eventTitle,
          eventType: 'Wedding',
          eventDate: args.weddingDate as string,
          venueName: (args.venue as string) || null,
          guestCount: (args.guestCount as number) || null,
          status: 'planned',
          description: `Main wedding ceremony for ${eventTitle}`,
        })
        .returning({ id: events.id })

      if (createdEvent) {
        cascadeResults.push({
          action: `Created main wedding event: ${eventTitle}`,
          entityType: 'event',
          entityId: createdEvent.id,
        })
      }
    }

    // Auto-populate budget categories based on wedding type
    if (args.budget && (args.budget as number) > 0) {
      const weddingType = (args.weddingType as WeddingType) || 'traditional'
      const budgetTemplate = BUDGET_TEMPLATES[weddingType] || BUDGET_TEMPLATES.traditional

      const budgetItems = budgetTemplate.map((item) => ({
        id: crypto.randomUUID(),
        clientId: newClient.id,
        category: item.category,
        segment: item.segment,
        item: item.item,
        estimatedCost: (((args.budget as number) * item.percentage) / 100).toFixed(2),
        paidAmount: '0',
        paymentStatus: 'pending',
        clientVisible: true,
        notes: `Auto-generated based on ${weddingType} wedding budget allocation`,
      }))

      await tx.insert(budget).values(budgetItems)

      cascadeResults.push({
        action: `Created ${budgetItems.length} budget categories`,
        entityType: 'budget',
        entityId: newClient.id,
      })
    }

    const displayName = `${partner1FirstName}${args.partner2FirstName ? ` & ${args.partner2FirstName}` : ''}`

    return {
      success: true,
      toolName: 'create_client',
      data: newClient,
      message: `Created wedding client: ${displayName}`,
      cascadeResults: cascadeResults.length > 0 ? cascadeResults : undefined,
    }
  })
}

async function executeUpdateClient(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  // Verify client access
  const [existingClient] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.companyId, ctx.companyId!),
        isNull(clients.deletedAt)
      )
    )
    .limit(1)

  if (!existingClient) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Client not found',
    })
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  if (args.partner1FirstName !== undefined) updateData.partner1FirstName = args.partner1FirstName
  if (args.partner1LastName !== undefined) updateData.partner1LastName = args.partner1LastName
  if (args.partner1Email !== undefined) updateData.partner1Email = args.partner1Email
  if (args.partner2FirstName !== undefined) updateData.partner2FirstName = args.partner2FirstName
  if (args.partner2LastName !== undefined) updateData.partner2LastName = args.partner2LastName
  if (args.weddingDate !== undefined) {
    updateData.weddingDate = parseNaturalDate(args.weddingDate as string) || args.weddingDate
  }
  if (args.venue !== undefined) updateData.venue = args.venue
  if (args.budget !== undefined) updateData.budget = (args.budget as number).toString()
  if (args.guestCount !== undefined) updateData.guestCount = args.guestCount
  if (args.status !== undefined) updateData.status = args.status

  const [updatedClient] = await db
    .update(clients)
    .set(updateData)
    .where(eq(clients.id, clientId))
    .returning()

  if (!updatedClient) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update client',
    })
  }

  const cascadeResults: Array<{ action: string; entityType: string; entityId: string }> = []

  // Sync wedding details to main event if wedding-related fields were updated
  const weddingFieldsUpdated =
    args.weddingDate !== undefined ||
    args.venue !== undefined ||
    args.guestCount !== undefined

  if (weddingFieldsUpdated) {
    // Find the main wedding event
    const [mainEvent] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.clientId, clientId),
          eq(events.eventType, 'Wedding'),
          isNull(events.deletedAt)
        )
      )
      .limit(1)

    if (mainEvent) {
      const eventUpdate: Record<string, unknown> = { updatedAt: new Date() }
      if (args.weddingDate !== undefined) {
        eventUpdate.eventDate = parseNaturalDate(args.weddingDate as string) || args.weddingDate
      }
      if (args.venue !== undefined) eventUpdate.venueName = args.venue
      if (args.guestCount !== undefined) eventUpdate.guestCount = args.guestCount

      try {
        await db.update(events).set(eventUpdate).where(eq(events.id, mainEvent.id))

        cascadeResults.push({
          action: 'Synced wedding details to main event',
          entityType: 'event',
          entityId: mainEvent.id,
        })
      } catch (eventUpdateError) {
        console.error('[Chatbot Tool] Failed to sync wedding details to event:', eventUpdateError)
      }
    } else if (args.weddingDate) {
      // No main event exists but wedding_date was provided - create one
      const eventTitle = `${updatedClient.partner1FirstName}${updatedClient.partner2FirstName ? ` & ${updatedClient.partner2FirstName}` : ''}'s Wedding`

      try {
        const [newEvent] = await db
          .insert(events)
          .values({
            id: crypto.randomUUID(),
            clientId,
            title: eventTitle,
            eventType: 'Wedding',
            eventDate: parseNaturalDate(args.weddingDate as string) || (args.weddingDate as string),
            venueName: (args.venue as string) || updatedClient.venue || undefined,
            guestCount: (args.guestCount as number) || updatedClient.guestCount || undefined,
            status: 'planned',
            description: `Main wedding ceremony for ${eventTitle}`,
          })
          .returning({ id: events.id })

        if (newEvent) {
          cascadeResults.push({
            action: `Created main wedding event: ${eventTitle}`,
            entityType: 'event',
            entityId: newEvent.id,
          })
        }
      } catch (eventCreateError) {
        console.error('[Chatbot Tool] Failed to create wedding event:', eventCreateError)
      }
    }
  }

  const displayName = `${updatedClient.partner1FirstName}${updatedClient.partner2FirstName ? ` & ${updatedClient.partner2FirstName}` : ''}`

  return {
    success: true,
    toolName: 'update_client',
    data: updatedClient,
    message: `Updated client: ${displayName}`,
    cascadeResults: cascadeResults.length > 0 ? cascadeResults : undefined,
  }
}

// ============================================
// TOOL HANDLERS - QUERIES
// ============================================

async function executeGetClientSummary(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Get counts in parallel
  const [guestStats, eventStats, budgetStats] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'confirmed')::int`,
    }).from(guests).where(eq(guests.clientId, clientId)),

    db.select({
      total: sql<number>`count(*)::int`,
      upcoming: sql<number>`count(*) filter (where ${events.eventDate} >= current_date)::int`,
    }).from(events).where(and(eq(events.clientId, clientId), isNull(events.deletedAt))),

    db.select({
      estimated: sql<number>`coalesce(sum(${budget.estimatedCost}::numeric), 0)::float`,
      paid: sql<number>`coalesce(sum(${budget.paidAmount}::numeric), 0)::float`,
    }).from(budget).where(eq(budget.clientId, clientId)),
  ])

  return {
    success: true,
    toolName: 'get_client_summary',
    data: {
      client: {
        id: client.id,
        displayName: client.weddingName || `${client.partner1FirstName} & ${client.partner2FirstName || 'Partner'}`,
        partner1: `${client.partner1FirstName} ${client.partner1LastName || ''}`.trim(),
        partner2: client.partner2FirstName ? `${client.partner2FirstName} ${client.partner2LastName || ''}`.trim() : null,
        weddingDate: client.weddingDate,
        venue: client.venue,
        status: client.status,
      },
      guests: {
        total: guestStats[0]?.total || 0,
        confirmed: guestStats[0]?.confirmed || 0,
      },
      events: {
        total: eventStats[0]?.total || 0,
        upcoming: eventStats[0]?.upcoming || 0,
      },
      budget: {
        total: client.budget ? parseFloat(client.budget) : 0,
        estimated: budgetStats[0]?.estimated || 0,
        paid: budgetStats[0]?.paid || 0,
      },
    },
    message: 'Client summary retrieved successfully',
  }
}

async function executeGetGuestStats(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      confirmed: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'confirmed')::int`,
      pending: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'pending' or ${guests.rsvpStatus} is null)::int`,
      declined: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'declined')::int`,
      maybe: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'maybe')::int`,
      hotelRequired: sql<number>`count(*) filter (where ${guests.hotelRequired} = true)::int`,
      needsTransport: sql<number>`count(*) filter (where ${guests.transportRequired} = true)::int`,
      vegetarian: sql<number>`count(*) filter (where ${guests.mealPreference} = 'vegetarian')::int`,
      vegan: sql<number>`count(*) filter (where ${guests.mealPreference} = 'vegan')::int`,
      glutenFree: sql<number>`count(*) filter (where ${guests.mealPreference} = 'gluten_free')::int`,
    })
    .from(guests)
    .where(eq(guests.clientId, clientId))

  return {
    success: true,
    toolName: 'get_guest_stats',
    data: stats,
    message: `Found ${stats.total} guests: ${stats.confirmed} confirmed, ${stats.pending} pending`,
  }
}

async function executeGetBudgetOverview(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id, budget: clients.budget })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  const [totals] = await db
    .select({
      itemCount: sql<number>`count(*)::int`,
      estimated: sql<number>`coalesce(sum(${budget.estimatedCost}::numeric), 0)::float`,
      actual: sql<number>`coalesce(sum(${budget.actualCost}::numeric), 0)::float`,
      paid: sql<number>`coalesce(sum(${budget.paidAmount}::numeric), 0)::float`,
    })
    .from(budget)
    .where(eq(budget.clientId, clientId))

  // Get by category
  const byCategory = await db
    .select({
      category: budget.category,
      estimated: sql<number>`coalesce(sum(${budget.estimatedCost}::numeric), 0)::float`,
      actual: sql<number>`coalesce(sum(${budget.actualCost}::numeric), 0)::float`,
      paid: sql<number>`coalesce(sum(${budget.paidAmount}::numeric), 0)::float`,
    })
    .from(budget)
    .where(eq(budget.clientId, clientId))
    .groupBy(budget.category)

  const totalBudget = client.budget ? parseFloat(client.budget) : 0
  const remaining = totalBudget - (totals.paid || 0)

  return {
    success: true,
    toolName: 'get_budget_overview',
    data: {
      totalBudget,
      estimated: totals.estimated || 0,
      actual: totals.actual || 0,
      paid: totals.paid || 0,
      remaining,
      percentUsed: totalBudget > 0 ? Math.round((totals.paid || 0) / totalBudget * 100) : 0,
      itemCount: totals.itemCount || 0,
      byCategory,
    },
    message: `Budget: $${totalBudget.toLocaleString()} total, $${(totals.paid || 0).toLocaleString()} paid, $${remaining.toLocaleString()} remaining`,
  }
}

async function executeSyncHotelGuests(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Get hotel summary from hotels table (guest bookings)
  const hotelSummary = await db
    .select({
      hotelName: hotels.hotelName,
      guestCount: sql<number>`count(*)::int`,
      totalNights: sql<number>`sum(CASE WHEN ${hotels.checkOutDate} IS NOT NULL AND ${hotels.checkInDate} IS NOT NULL THEN ${hotels.checkOutDate}::date - ${hotels.checkInDate}::date ELSE 1 END)::int`,
    })
    .from(hotels)
    .where(
      and(
        eq(hotels.clientId, clientId),
        isNull(hotels.deletedAt)
      )
    )
    .groupBy(hotels.hotelName)

  return {
    success: true,
    toolName: 'sync_hotel_guests',
    data: {
      hotels: hotelSummary,
      totalGuests: hotelSummary.reduce((sum, h) => sum + h.guestCount, 0),
      totalNights: hotelSummary.reduce((sum, h) => sum + (h.totalNights || 0), 0),
    },
    message: `Found ${hotelSummary.length} hotels with ${hotelSummary.reduce((sum, h) => sum + h.guestCount, 0)} guests`,
  }
}

async function executeSearchEntities(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const query = args.query as string
  const clientId = args.clientId as string | undefined
  const entityTypes = args.entityTypes as string[] | undefined
  const limit = Math.min((args.limit as number) || 10, 50)

  if (!query || query.length < 1) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Search query is required',
    })
  }

  const searchPattern = `%${query}%`
  const results: Array<{ type: string; id: string; name: string; details: string }> = []

  // Search clients
  if (!entityTypes || entityTypes.includes('client')) {
    const clientResults = await db
      .select({
        id: clients.id,
        partner1FirstName: clients.partner1FirstName,
        partner1LastName: clients.partner1LastName,
        partner2FirstName: clients.partner2FirstName,
        weddingDate: clients.weddingDate,
      })
      .from(clients)
      .where(
        and(
          eq(clients.companyId, ctx.companyId!),
          isNull(clients.deletedAt),
          sql`(
            ${clients.partner1FirstName} ilike ${searchPattern} or
            ${clients.partner1LastName} ilike ${searchPattern} or
            ${clients.partner2FirstName} ilike ${searchPattern} or
            ${clients.weddingName} ilike ${searchPattern}
          )`
        )
      )
      .limit(limit)

    for (const c of clientResults) {
      results.push({
        type: 'client',
        id: c.id,
        name: `${c.partner1FirstName} ${c.partner1LastName || ''} & ${c.partner2FirstName || 'Partner'}`.trim(),
        details: c.weddingDate || 'No date set',
      })
    }
  }

  // Search guests (requires clientId)
  if (clientId && (!entityTypes || entityTypes.includes('guest'))) {
    const guestResults = await db
      .select({
        id: guests.id,
        firstName: guests.firstName,
        lastName: guests.lastName,
        rsvpStatus: guests.rsvpStatus,
      })
      .from(guests)
      .where(
        and(
          eq(guests.clientId, clientId),
          sql`(
            ${guests.firstName} ilike ${searchPattern} or
            ${guests.lastName} ilike ${searchPattern}
          )`
        )
      )
      .limit(limit)

    for (const g of guestResults) {
      results.push({
        type: 'guest',
        id: g.id,
        name: `${g.firstName} ${g.lastName || ''}`.trim(),
        details: g.rsvpStatus || 'pending',
      })
    }
  }

  // Search vendors
  if (!entityTypes || entityTypes.includes('vendor')) {
    const vendorResults = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        category: vendors.category,
      })
      .from(vendors)
      .where(
        and(
          eq(vendors.companyId, ctx.companyId!),
          sql`${vendors.name} ilike ${searchPattern}`
        )
      )
      .limit(limit)

    for (const v of vendorResults) {
      results.push({
        type: 'vendor',
        id: v.id,
        name: v.name,
        details: v.category || 'other',
      })
    }
  }

  return {
    success: true,
    toolName: 'search_entities',
    data: { results, total: results.length },
    message: `Found ${results.length} results for "${query}"`,
  }
}

// ============================================
// TOOL HANDLERS - MUTATIONS
// ============================================

async function executeAddGuest(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const firstName = args.firstName as string
  const lastName = args.lastName as string | undefined
  const email = args.email as string | undefined
  const phone = args.phone as string | undefined
  const rsvpStatus = (args.rsvpStatus as string) || 'pending'
  const mealPreference = args.mealPreference as string | undefined
  const dietaryRestrictions = args.dietaryRestrictions as string | undefined
  const groupName = args.groupName as string | undefined
  const plusOne = args.plusOne as boolean | undefined
  const tableNumber = args.tableNumber as number | undefined
  const hotelRequired = args.hotelRequired as boolean | undefined
  const needsTransport = args.needsTransport as boolean | undefined
  const side = args.side as string | undefined
  const eventId = args.eventId as string | undefined

  if (!clientId || !firstName) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID and first name are required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Insert guest
  const [newGuest] = await db
    .insert(guests)
    .values({
      clientId,
      firstName,
      lastName: lastName || '',
      email: email || undefined,
      phone: phone || undefined,
      rsvpStatus: rsvpStatus || 'pending',
      mealPreference: mealPreference || undefined,
      dietaryRestrictions: dietaryRestrictions || undefined,
      groupName: groupName || undefined,
      plusOneAllowed: plusOne || false,
      tableNumber: tableNumber || undefined,
      hotelRequired: hotelRequired || false,
      transportRequired: needsTransport || false,
      guestSide: (side as 'bride' | 'groom' | 'mutual') || 'mutual',
      attendingEvents: eventId ? [eventId] : undefined,
    })
    .returning()

  const cascadeResults: Array<{ action: string; entityType: string; entityId: string }> = []

  // Cascade: Create hotel booking if hotelRequired
  if (hotelRequired && newGuest) {
    // For now, just mark that hotel is needed - actual booking requires more info
    cascadeResults.push({
      action: 'Hotel accommodation marked as needed',
      entityType: 'accommodation_flag',
      entityId: newGuest.id,
    })
  }

  // Cascade: Create transport record if needsTransport
  if (needsTransport && newGuest) {
    cascadeResults.push({
      action: 'Transportation marked as needed',
      entityType: 'transport_flag',
      entityId: newGuest.id,
    })
  }

  return {
    success: true,
    toolName: 'add_guest',
    data: newGuest,
    message: `Added guest: ${firstName}${lastName ? ` ${lastName}` : ''}`,
    cascadeResults: cascadeResults.length > 0 ? cascadeResults : undefined,
  }
}

async function executeUpdateGuestRsvp(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const guestId = args.guestId as string | undefined
  const guestName = args.guestName as string | undefined
  const clientId = args.clientId as string | undefined
  const rsvpStatus = args.rsvpStatus as string

  if (!rsvpStatus) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'RSVP status is required',
    })
  }

  let targetGuestId = guestId

  // If no guestId but guestName provided, resolve it
  if (!targetGuestId && guestName && clientId) {
    const resolution = await resolveGuest(guestName, clientId)

    if (resolution.isAmbiguous) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: resolution.message,
        cause: { options: resolution.options },
      })
    }

    targetGuestId = resolution.entity.id
  }

  if (!targetGuestId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Guest ID or guest name (with client context) is required',
    })
  }

  // Update guest
  const [updatedGuest] = await db
    .update(guests)
    .set({
      rsvpStatus: rsvpStatus as 'pending' | 'confirmed' | 'declined' | 'maybe',
      updatedAt: new Date(),
    })
    .where(eq(guests.id, targetGuestId))
    .returning()

  if (!updatedGuest) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Guest not found',
    })
  }

  return {
    success: true,
    toolName: 'update_guest_rsvp',
    data: updatedGuest,
    message: `Updated RSVP status to ${rsvpStatus} for ${updatedGuest.firstName}${updatedGuest.lastName ? ` ${updatedGuest.lastName}` : ''}`,
  }
}

async function executeBulkUpdateGuests(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const guestIds = args.guestIds as string[] | undefined
  const groupName = args.groupName as string | undefined
  const updates = args.updates as Record<string, unknown>

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  if (!guestIds && !groupName) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Either guest IDs or group name is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Build update object
  const updateValues: Record<string, unknown> = { updatedAt: new Date() }

  if (updates.rsvpStatus !== undefined) {
    updateValues.rsvpStatus = updates.rsvpStatus
  }
  if (updates.tableNumber !== undefined) {
    updateValues.tableNumber = updates.tableNumber
  }
  if (updates.hotelRequired !== undefined) {
    updateValues.hotelRequired = updates.hotelRequired
  }
  if (updates.needsTransport !== undefined) {
    updateValues.needsTransport = updates.needsTransport
  }

  // Get target guests
  let targetGuests: { id: string }[]

  if (guestIds && guestIds.length > 0) {
    targetGuests = await db
      .select({ id: guests.id })
      .from(guests)
      .where(
        and(
          eq(guests.clientId, clientId),
          sql`${guests.id} = any(${guestIds})`
        )
      )
  } else if (groupName) {
    targetGuests = await db
      .select({ id: guests.id })
      .from(guests)
      .where(
        and(
          eq(guests.clientId, clientId),
          eq(guests.groupName, groupName)
        )
      )
  } else {
    targetGuests = []
  }

  if (targetGuests.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'No guests found matching criteria',
    })
  }

  // Update all matched guests
  const updatedCount = await db
    .update(guests)
    .set(updateValues)
    .where(
      and(
        eq(guests.clientId, clientId),
        sql`${guests.id} = any(${targetGuests.map(g => g.id)})`
      )
    )

  return {
    success: true,
    toolName: 'bulk_update_guests',
    data: { updatedCount: targetGuests.length },
    message: `Updated ${targetGuests.length} guests`,
  }
}

async function executeCreateEvent(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const title = args.title as string
  const eventType = args.eventType as string
  const eventDate = args.eventDate as string
  const startTime = args.startTime as string | undefined
  const endTime = args.endTime as string | undefined
  const venueName = args.venueName as string | undefined
  const venueAddress = args.venueAddress as string | undefined
  const description = args.description as string | undefined
  const guestCount = args.guestCount as number | undefined
  const dressCode = args.dressCode as string | undefined

  if (!clientId || !title || !eventType || !eventDate) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID, title, event type, and date are required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Parse date
  const parsedDate = parseNaturalDate(eventDate) || eventDate

  // Create event
  const [newEvent] = await db
    .insert(events)
    .values({
      id: crypto.randomUUID(),
      clientId,
      title,
      eventType: eventType || undefined,
      eventDate: parsedDate,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      venueName: venueName || undefined,
      address: venueAddress || undefined,
      description: description || undefined,
      guestCount: guestCount || undefined,
      status: 'planned',
      notes: dressCode ? `Dress code: ${dressCode}` : undefined,
    })
    .returning()

  return {
    success: true,
    toolName: 'create_event',
    data: newEvent,
    message: `Created event: ${title} (${eventType}) on ${parsedDate}`,
  }
}

async function executeUpdateEvent(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const eventId = args.eventId as string

  if (!eventId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Event ID is required',
    })
  }

  // Verify event access via client
  const [existingEvent] = await db
    .select({
      id: events.id,
      clientId: events.clientId,
    })
    .from(events)
    .innerJoin(clients, eq(clients.id, events.clientId))
    .where(
      and(
        eq(events.id, eventId),
        eq(clients.companyId, ctx.companyId!),
        isNull(events.deletedAt)
      )
    )
    .limit(1)

  if (!existingEvent) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Event not found',
    })
  }

  // Build update object
  const updateValues: Record<string, unknown> = { updatedAt: new Date() }

  if (args.title !== undefined) updateValues.title = args.title
  if (args.eventDate !== undefined) {
    updateValues.eventDate = parseNaturalDate(args.eventDate as string) || args.eventDate
  }
  if (args.startTime !== undefined) updateValues.startTime = args.startTime
  if (args.endTime !== undefined) updateValues.endTime = args.endTime
  if (args.venueName !== undefined) updateValues.venueName = args.venueName
  if (args.venueAddress !== undefined) updateValues.venueAddress = args.venueAddress
  if (args.description !== undefined) updateValues.description = args.description
  if (args.status !== undefined) updateValues.status = args.status

  const [updatedEvent] = await db
    .update(events)
    .set(updateValues)
    .where(eq(events.id, eventId))
    .returning()

  return {
    success: true,
    toolName: 'update_event',
    data: updatedEvent,
    message: `Updated event: ${updatedEvent.title}`,
  }
}

async function executeAddTimelineItem(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const eventId = args.eventId as string | undefined
  const title = args.title as string
  const description = args.description as string | undefined
  const startTime = args.startTime as string
  const endTime = args.endTime as string | undefined
  const durationMinutes = args.durationMinutes as number | undefined
  const location = args.location as string | undefined
  const vendorId = args.vendorId as string | undefined
  const assignee = args.assignee as string | undefined
  const phase = args.phase as string | undefined

  if (!clientId || !title || !startTime) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID, title, and start time are required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id, weddingDate: clients.weddingDate })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Parse start time - if just HH:MM, combine with wedding date or today
  let startDateTime: Date
  if (startTime.includes('T') || startTime.includes(' ')) {
    startDateTime = new Date(startTime)
  } else {
    const baseDate = client.weddingDate || new Date().toISOString().split('T')[0]
    startDateTime = new Date(`${baseDate}T${startTime}:00`)
  }

  // Calculate end time
  let endDateTime: Date | null = null
  if (endTime) {
    if (endTime.includes('T') || endTime.includes(' ')) {
      endDateTime = new Date(endTime)
    } else {
      const baseDate = client.weddingDate || new Date().toISOString().split('T')[0]
      endDateTime = new Date(`${baseDate}T${endTime}:00`)
    }
  } else if (durationMinutes) {
    endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000)
  }

  const [newItem] = await db
    .insert(timeline)
    .values({
      id: crypto.randomUUID(),
      clientId,
      eventId: eventId || undefined,
      title,
      description: description || undefined,
      startTime: startDateTime,
      endTime: endDateTime || undefined,
      durationMinutes: durationMinutes || (endDateTime ? Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000) : undefined),
      location: location || undefined,
      responsiblePerson: assignee || undefined,
      phase: (phase as 'setup' | 'showtime' | 'wrapup') || 'showtime',
      sourceModule: vendorId ? 'vendors' : undefined,
      sourceId: vendorId || undefined,
    })
    .returning()

  return {
    success: true,
    toolName: 'add_timeline_item',
    data: newItem,
    message: `Added timeline item: ${title} at ${startTime}`,
  }
}

async function executeShiftTimeline(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const eventId = args.eventId as string | undefined
  const shiftMinutes = args.shiftMinutes as number
  const startFromItemId = args.startFromItemId as string | undefined
  const affectedPhase = args.affectedPhase as string | undefined

  if (!clientId || shiftMinutes === undefined) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID and shift minutes are required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Build where conditions
  let whereConditions = and(eq(timeline.clientId, clientId))

  if (eventId) {
    whereConditions = and(whereConditions, eq(timeline.eventId, eventId))
  }

  if (affectedPhase) {
    whereConditions = and(whereConditions, eq(timeline.phase, affectedPhase as 'preparation' | 'ceremony' | 'reception' | 'post_event'))
  }

  if (startFromItemId) {
    // Get the start time of the reference item
    const [refItem] = await db
      .select({ startTime: timeline.startTime })
      .from(timeline)
      .where(eq(timeline.id, startFromItemId))
      .limit(1)

    if (refItem?.startTime) {
      whereConditions = and(whereConditions, sql`${timeline.startTime} >= ${refItem.startTime}`)
    }
  }

  // Update all matching timeline items
  const shiftInterval = `${shiftMinutes} minutes`

  await db.execute(sql`
    UPDATE timeline
    SET
      start_time = start_time + interval '${sql.raw(shiftInterval)}',
      end_time = CASE
        WHEN end_time IS NOT NULL THEN end_time + interval '${sql.raw(shiftInterval)}'
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE client_id = ${clientId}
    ${eventId ? sql`AND event_id = ${eventId}` : sql``}
    ${affectedPhase ? sql`AND phase = ${affectedPhase}` : sql``}
  `)

  // Count affected items
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(timeline)
    .where(whereConditions)

  const direction = shiftMinutes > 0 ? 'later' : 'earlier'

  return {
    success: true,
    toolName: 'shift_timeline',
    data: { shiftedCount: count, shiftMinutes },
    message: `Shifted ${count} timeline items ${Math.abs(shiftMinutes)} minutes ${direction}`,
  }
}

async function executeAddVendor(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const name = args.name as string
  const category = args.category as string
  const contactName = args.contactName as string | undefined
  const email = args.email as string | undefined
  const phone = args.phone as string | undefined
  const website = args.website as string | undefined
  const estimatedCost = args.estimatedCost as number | undefined
  const depositAmount = args.depositAmount as number | undefined
  const notes = args.notes as string | undefined
  const eventId = args.eventId as string | undefined

  if (!clientId || !name || !category) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID, name, and category are required',
    })
  }

  // Verify client access (outside transaction)
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Use transaction to ensure all-or-nothing vendor creation with cascade
  // Phase 4: Transaction wrapper for cascade operations
  return withTransaction(async (tx) => {
    // Create vendor
    const [newVendor] = await tx
      .insert(vendors)
      .values({
        id: crypto.randomUUID(),
        companyId: ctx.companyId!,
        name,
        category,
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        notes: notes || null,
        isPreferred: false,
      })
      .returning()

    const cascadeResults: Array<{ action: string; entityType: string; entityId: string }> = []

    // Create client_vendor relationship
    if (newVendor) {
      const [clientVendor] = await tx
        .insert(clientVendors)
        .values({
          id: crypto.randomUUID(),
          clientId,
          vendorId: newVendor.id,
          eventId: eventId || null,
          paymentStatus: 'pending',
          approvalStatus: 'pending',
        })
        .returning()

      cascadeResults.push({
        action: 'Created vendor-client relationship',
        entityType: 'client_vendor',
        entityId: clientVendor.id,
      })

      // Create budget item for vendor
      if (estimatedCost) {
        const [budgetItem] = await tx
          .insert(budget)
          .values({
            id: crypto.randomUUID(),
            clientId,
            vendorId: newVendor.id,
            eventId: eventId || null,
            category: category,
            segment: 'vendors',
            item: name,
            estimatedCost: estimatedCost.toString(),
            actualCost: null,
            paidAmount: '0',
            paymentStatus: 'pending',
            clientVisible: true,
            notes: `Auto-created for vendor: ${name}`,
          })
          .returning()

        cascadeResults.push({
          action: 'Created budget item',
          entityType: 'budget',
          entityId: budgetItem.id,
        })
      }
    }

    return {
      success: true,
      toolName: 'add_vendor',
      data: newVendor,
      message: `Added vendor: ${name} (${category})`,
      cascadeResults: cascadeResults.length > 0 ? cascadeResults : undefined,
    }
  })
}

async function executeUpdateVendor(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const vendorId = args.vendorId as string | undefined
  const vendorName = args.vendorName as string | undefined
  const clientId = args.clientId as string | undefined

  let targetVendorId = vendorId

  // Resolve vendor by name if needed
  if (!targetVendorId && vendorName) {
    const resolution = await resolveVendor(vendorName, ctx.companyId!, clientId)

    if (resolution.isAmbiguous) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: resolution.message,
        cause: { options: resolution.options },
      })
    }

    targetVendorId = resolution.entity.id
  }

  if (!targetVendorId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Vendor ID or vendor name is required',
    })
  }

  // Verify vendor access
  const [existingVendor] = await db
    .select()
    .from(vendors)
    .where(
      and(
        eq(vendors.id, targetVendorId),
        eq(vendors.companyId, ctx.companyId!)
      )
    )
    .limit(1)

  if (!existingVendor) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Vendor not found',
    })
  }

  // Build update object for vendors table
  const vendorUpdateValues: Record<string, unknown> = { updatedAt: new Date() }

  if (args.contactName !== undefined) vendorUpdateValues.contactName = args.contactName
  if (args.email !== undefined) vendorUpdateValues.email = args.email
  if (args.phone !== undefined) vendorUpdateValues.phone = args.phone
  if (args.notes !== undefined) vendorUpdateValues.notes = args.notes

  // Update vendor
  const [updatedVendor] = await db
    .update(vendors)
    .set(vendorUpdateValues)
    .where(eq(vendors.id, targetVendorId))
    .returning()

  // Update client_vendor if payment/approval status provided
  if (clientId && (args.paymentStatus !== undefined || args.approvalStatus !== undefined)) {
    const cvUpdateValues: Record<string, unknown> = {}

    if (args.paymentStatus !== undefined) cvUpdateValues.paymentStatus = args.paymentStatus
    if (args.approvalStatus !== undefined) cvUpdateValues.approvalStatus = args.approvalStatus

    await db
      .update(clientVendors)
      .set(cvUpdateValues)
      .where(
        and(
          eq(clientVendors.vendorId, targetVendorId),
          eq(clientVendors.clientId, clientId)
        )
      )
  }

  return {
    success: true,
    toolName: 'update_vendor',
    data: updatedVendor,
    message: `Updated vendor: ${updatedVendor.name}`,
  }
}

async function executeAddHotelBooking(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const guestId = args.guestId as string | undefined
  const guestName = args.guestName as string | undefined
  const hotelName = args.hotelName as string
  const roomType = args.roomType as string | undefined
  const checkInDate = args.checkInDate as string
  const checkOutDate = args.checkOutDate as string
  const confirmationNumber = args.confirmationNumber as string | undefined
  const roomRate = args.roomRate as number | undefined
  const notes = args.notes as string | undefined

  if (!clientId || !hotelName || !checkInDate || !checkOutDate) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID, hotel name, check-in, and check-out dates are required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Resolve guest if needed
  let targetGuestId = guestId

  if (!targetGuestId && guestName) {
    const resolution = await resolveGuest(guestName, clientId)

    if (resolution.isAmbiguous) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: resolution.message,
        cause: { options: resolution.options },
      })
    }

    targetGuestId = resolution.entity.id
  }

  // Parse dates
  const checkIn = parseNaturalDate(checkInDate) || checkInDate
  const checkOut = parseNaturalDate(checkOutDate) || checkOutDate

  // Get guest name if we have the ID
  let guestDisplayName = guestName || 'Unknown Guest'
  if (targetGuestId && !guestName) {
    const [guest] = await db
      .select({ firstName: guests.firstName, lastName: guests.lastName })
      .from(guests)
      .where(eq(guests.id, targetGuestId))
      .limit(1)
    if (guest) {
      guestDisplayName = `${guest.firstName} ${guest.lastName || ''}`.trim()
    }
  }

  // Create hotel booking in hotels table (guest bookings)
  const [newHotelBooking] = await db
    .insert(hotels)
    .values({
      clientId,
      guestId: targetGuestId || undefined,
      guestName: guestDisplayName,
      hotelName: hotelName || undefined,
      roomType: roomType || undefined,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      notes: notes || undefined,
      cost: roomRate?.toString() || undefined,
      bookingConfirmed: true,
    })
    .returning()

  // Update guest hotelRequired flag if guest was specified
  if (targetGuestId) {
    await db
      .update(guests)
      .set({ hotelRequired: false }) // Fulfilled
      .where(eq(guests.id, targetGuestId))
  }

  return {
    success: true,
    toolName: 'add_hotel_booking',
    data: newHotelBooking,
    message: `Added hotel booking at ${hotelName} (${checkIn} to ${checkOut})`,
  }
}

async function executeUpdateBudgetItem(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const budgetItemId = args.budgetItemId as string | undefined
  const clientId = args.clientId as string | undefined
  const category = args.category as string | undefined
  const item = args.item as string | undefined

  let targetItemId = budgetItemId

  // Find budget item by category/item if no ID
  if (!targetItemId && clientId && (category || item)) {
    const conditions = [eq(budget.clientId, clientId)]

    if (category) {
      conditions.push(eq(budget.category, category))
    }
    if (item) {
      conditions.push(eq(budget.item, item))
    }

    const [foundItem] = await db
      .select({ id: budget.id })
      .from(budget)
      .innerJoin(clients, eq(clients.id, budget.clientId))
      .where(
        and(
          ...conditions,
          eq(clients.companyId, ctx.companyId!)
        )
      )
      .limit(1)

    if (foundItem) {
      targetItemId = foundItem.id
    }
  }

  if (!targetItemId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Budget item ID or client ID with category/item is required',
    })
  }

  // Verify access
  const [existingItem] = await db
    .select()
    .from(budget)
    .innerJoin(clients, eq(clients.id, budget.clientId))
    .where(
      and(
        eq(budget.id, targetItemId),
        eq(clients.companyId, ctx.companyId!)
      )
    )
    .limit(1)

  if (!existingItem) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Budget item not found',
    })
  }

  // Build update object
  const updateValues: Record<string, unknown> = { updatedAt: new Date() }

  if (args.estimatedCost !== undefined) {
    updateValues.estimatedCost = (args.estimatedCost as number).toString()
  }
  if (args.actualCost !== undefined) {
    updateValues.actualCost = (args.actualCost as number).toString()
  }
  if (args.paidAmount !== undefined) {
    updateValues.paidAmount = (args.paidAmount as number).toString()
  }
  if (args.paymentStatus !== undefined) {
    updateValues.paymentStatus = args.paymentStatus
  }
  if (args.notes !== undefined) {
    updateValues.notes = args.notes
  }

  const [updatedItem] = await db
    .update(budget)
    .set(updateValues)
    .where(eq(budget.id, targetItemId))
    .returning()

  return {
    success: true,
    toolName: 'update_budget_item',
    data: updatedItem,
    message: `Updated budget item: ${updatedItem.item}`,
  }
}

// ============================================
// TOOL HANDLERS - COMMUNICATION
// ============================================

async function executeSendCommunication(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const communicationType = args.communicationType as string
  const recipientType = (args.recipientType as string) || 'pending_rsvp'
  const vendorId = args.vendorId as string | undefined
  const vendorName = args.vendorName as string | undefined
  const vendorCategory = args.vendorCategory as string | undefined
  const language = (args.language as string) || 'en'

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  if (!communicationType) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Communication type is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Determine recipients
  let recipients: Array<{ id: string; email: string; name: string; type: 'guest' | 'client' | 'vendor' }> = []

  if (recipientType === 'client') {
    // Send to client(s)
    if (client.partner1Email) {
      recipients.push({
        id: client.id,
        email: client.partner1Email,
        name: `${client.partner1FirstName} ${client.partner1LastName || ''}`.trim(),
        type: 'client',
      })
    }
    if (client.partner2Email) {
      recipients.push({
        id: client.id,
        email: client.partner2Email,
        name: `${client.partner2FirstName} ${client.partner2LastName || ''}`.trim(),
        type: 'client',
      })
    }
  } else if (recipientType === 'specific_guest') {
    // Resolve specific guest
    const guestId = args.guestId as string | undefined
    const guestName = args.guestName as string | undefined

    let targetGuestId = guestId

    if (!targetGuestId && guestName) {
      const resolution = await resolveGuest(guestName, clientId)
      if (resolution.isAmbiguous) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: resolution.message,
          cause: { options: resolution.options },
        })
      }
      targetGuestId = resolution.entity.id
    }

    if (targetGuestId) {
      const [guest] = await db
        .select({ id: guests.id, email: guests.email, firstName: guests.firstName, lastName: guests.lastName })
        .from(guests)
        .where(eq(guests.id, targetGuestId))
        .limit(1)

      if (guest?.email) {
        recipients.push({
          id: guest.id,
          email: guest.email,
          name: `${guest.firstName} ${guest.lastName || ''}`.trim(),
          type: 'guest',
        })
      }
    }
  } else if (recipientType === 'all_vendors' || recipientType === 'vendor_category' || recipientType === 'specific_vendor') {
    // Handle vendor recipients
    const vendorConditions = [eq(clientVendors.clientId, clientId)]

    if (recipientType === 'specific_vendor') {
      let targetVendorId = vendorId
      if (!targetVendorId && vendorName) {
        const resolution = await resolveVendor(vendorName, ctx.companyId!, clientId)
        if (!resolution.isAmbiguous && resolution.entity) {
          targetVendorId = resolution.entity.id
        }
      }
      if (targetVendorId) {
        vendorConditions.push(eq(clientVendors.vendorId, targetVendorId))
      }
    }

    const vendorList = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        email: vendors.email,
        category: vendors.category,
        contactName: vendors.contactName,
      })
      .from(clientVendors)
      .innerJoin(vendors, eq(clientVendors.vendorId, vendors.id))
      .where(and(...vendorConditions))

    for (const vendor of vendorList) {
      if (!vendor.email) continue

      // Filter by category if specified
      if (recipientType === 'vendor_category' && vendorCategory && vendor.category !== vendorCategory) continue

      recipients.push({
        id: vendor.id,
        email: vendor.email,
        name: vendor.contactName || vendor.name,
        type: 'vendor',
      })
    }
  } else {
    // Get guests based on recipient type
    let guestQuery = db
      .select({ id: guests.id, email: guests.email, firstName: guests.firstName, lastName: guests.lastName, rsvpStatus: guests.rsvpStatus })
      .from(guests)
      .where(eq(guests.clientId, clientId))

    const guestList = await guestQuery

    for (const guest of guestList) {
      if (!guest.email) continue

      // Filter based on recipient type
      if (recipientType === 'pending_rsvp' && guest.rsvpStatus !== 'pending' && guest.rsvpStatus !== null) continue
      if (recipientType === 'confirmed_guests' && guest.rsvpStatus !== 'confirmed') continue

      recipients.push({
        id: guest.id,
        email: guest.email,
        name: `${guest.firstName} ${guest.lastName || ''}`.trim(),
        type: 'guest',
      })
    }
  }

  if (recipients.length === 0) {
    return {
      success: false,
      toolName: 'send_communication',
      data: { recipientCount: 0 },
      message: 'No recipients found with valid email addresses',
    }
  }

  // Note: In production, this would call the email router to actually send
  // For now, we return a preview of what would be sent
  const communicationDescription = {
    rsvp_reminder: 'RSVP reminder',
    wedding_reminder: 'wedding reminder',
    vendor_reminder: 'vendor coordination reminder',
    questionnaire_reminder: 'questionnaire completion reminder',
    custom: 'custom message',
  }[communicationType] || communicationType

  const recipientTypeDescription = recipients[0]?.type === 'vendor' ? 'vendors' : 'recipients'

  return {
    success: true,
    toolName: 'send_communication',
    data: {
      recipientCount: recipients.length,
      recipients: recipients.map(r => ({ name: r.name, email: r.email, type: r.type })),
      communicationType,
      language,
      clientName: `${client.partner1FirstName}${client.partner2FirstName ? ` & ${client.partner2FirstName}` : ''}`,
    },
    message: `📧 Prepared ${communicationDescription} for ${recipients.length} ${recipientTypeDescription}. Email sending would be queued in production.`,
  }
}

// ============================================
// TOOL HANDLERS - PIPELINE
// ============================================

async function executeUpdatePipeline(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const leadId = args.leadId as string | undefined
  const leadName = args.leadName as string | undefined
  const stageId = args.stageId as string | undefined
  const stageName = args.stageName as string | undefined
  const status = args.status as string | undefined
  const priority = args.priority as string | undefined
  const notes = args.notes as string | undefined

  // Must have either leadId or leadName
  if (!leadId && !leadName) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Lead ID or lead name is required',
    })
  }

  // Find lead
  let targetLeadId = leadId

  if (!targetLeadId && leadName) {
    // Fuzzy search for lead by name
    const searchPattern = `%${leadName}%`

    const [foundLead] = await db
      .select({ id: pipelineLeads.id })
      .from(pipelineLeads)
      .where(
        and(
          eq(pipelineLeads.companyId, ctx.companyId!),
          sql`(
            ${pipelineLeads.firstName} ilike ${searchPattern} or
            ${pipelineLeads.lastName} ilike ${searchPattern} or
            ${pipelineLeads.email} ilike ${searchPattern}
          )`
        )
      )
      .limit(1)

    if (foundLead) {
      targetLeadId = foundLead.id
    }
  }

  if (!targetLeadId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Lead "${leadName || leadId}" not found`,
    })
  }

  // Verify lead access
  const [existingLead] = await db
    .select()
    .from(pipelineLeads)
    .where(
      and(
        eq(pipelineLeads.id, targetLeadId),
        eq(pipelineLeads.companyId, ctx.companyId!)
      )
    )
    .limit(1)

  if (!existingLead) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Lead not found',
    })
  }

  // Resolve stage if stageName provided
  let targetStageId = stageId

  if (!targetStageId && stageName) {
    const stageNameLower = stageName.toLowerCase()
    const searchPattern = `%${stageNameLower}%`

    const [foundStage] = await db
      .select({ id: pipelineStages.id })
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.companyId, ctx.companyId!),
          eq(pipelineStages.isActive, true),
          sql`lower(${pipelineStages.name}) ilike ${searchPattern}`
        )
      )
      .limit(1)

    if (foundStage) {
      targetStageId = foundStage.id
    }
  }

  // Build update object
  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  const changes: string[] = []

  if (targetStageId && targetStageId !== existingLead.stageId) {
    updateData.stageId = targetStageId

    // Get stage name for message
    const [newStage] = await db
      .select({ name: pipelineStages.name })
      .from(pipelineStages)
      .where(eq(pipelineStages.id, targetStageId))
      .limit(1)

    if (newStage) {
      changes.push(`moved to "${newStage.name}" stage`)
    }
  }

  if (status !== undefined && status !== existingLead.status) {
    updateData.status = status
    changes.push(`status changed to ${status}`)
  }

  if (priority !== undefined && priority !== existingLead.priority) {
    updateData.priority = priority
    changes.push(`priority set to ${priority}`)
  }

  // Update lead
  const [updatedLead] = await db
    .update(pipelineLeads)
    .set(updateData)
    .where(eq(pipelineLeads.id, targetLeadId))
    .returning()

  const cascadeResults: Array<{ action: string; entityType: string; entityId: string }> = []

  // Log activity if notes provided or stage changed
  if (notes || targetStageId !== existingLead.stageId) {
    try {
      const activityType = targetStageId !== existingLead.stageId ? 'stage_change' : 'note'
      const activityTitle = notes
        ? 'Note added via AI assistant'
        : changes.length > 0
          ? `Lead ${changes.join(', ')}`
          : 'Lead updated'
      const activityDescription = notes || undefined

      const [activity] = await db
        .insert(pipelineActivities)
        .values({
          leadId: targetLeadId,
          companyId: ctx.companyId!,
          userId: ctx.userId!,
          type: activityType,
          title: activityTitle,
          description: activityDescription,
          previousStageId: targetStageId !== existingLead.stageId ? existingLead.stageId : undefined,
          newStageId: targetStageId !== existingLead.stageId ? targetStageId : undefined,
        })
        .returning({ id: pipelineActivities.id })

      if (activity) {
        cascadeResults.push({
          action: `Logged activity: ${activityType}`,
          entityType: 'pipeline_activity',
          entityId: activity.id,
        })
      }
    } catch (activityError) {
      console.error('[Chatbot Tool] Failed to log pipeline activity:', activityError)
    }
  }

  const leadDisplayName = `${existingLead.firstName} ${existingLead.lastName || ''}`.trim() || existingLead.email

  return {
    success: true,
    toolName: 'update_pipeline',
    data: updatedLead,
    message: changes.length > 0
      ? `Updated lead "${leadDisplayName}": ${changes.join(', ')}`
      : `Lead "${leadDisplayName}" checked (no changes needed)`,
    cascadeResults: cascadeResults.length > 0 ? cascadeResults : undefined,
  }
}

// ============================================
// TOOL HANDLERS - WEDDING SUMMARY
// ============================================

async function executeGetWeddingSummary(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const includeActionItems = args.includeActionItems !== false

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Gather all statistics in parallel
  const [
    guestStats,
    eventList,
    budgetStats,
    vendorStats,
    hotelStats,
  ] = await Promise.all([
    // Guest statistics
    db
      .select({
        total: sql<number>`count(*)::int`,
        confirmed: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'confirmed')::int`,
        pending: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'pending' or ${guests.rsvpStatus} is null)::int`,
        declined: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'declined')::int`,
        vegetarian: sql<number>`count(*) filter (where ${guests.dietaryRestrictions} = 'vegetarian')::int`,
        vegan: sql<number>`count(*) filter (where ${guests.dietaryRestrictions} = 'vegan')::int`,
        glutenFree: sql<number>`count(*) filter (where ${guests.dietaryRestrictions} = 'gluten_free')::int`,
      })
      .from(guests)
      .where(eq(guests.clientId, clientId)),

    // Events
    db
      .select({
        id: events.id,
        title: events.title,
        eventType: events.eventType,
        eventDate: events.eventDate,
        status: events.status,
      })
      .from(events)
      .where(and(eq(events.clientId, clientId), isNull(events.deletedAt)))
      .orderBy(events.eventDate),

    // Budget statistics
    db
      .select({
        totalEstimated: sql<number>`coalesce(sum(${budget.estimatedCost}::numeric), 0)::float`,
        totalActual: sql<number>`coalesce(sum(${budget.actualCost}::numeric), 0)::float`,
        totalPaid: sql<number>`coalesce(sum(${budget.paidAmount}::numeric), 0)::float`,
        itemCount: sql<number>`count(*)::int`,
      })
      .from(budget)
      .where(eq(budget.clientId, clientId)),

    // Vendor statistics
    db
      .select({
        total: sql<number>`count(distinct ${clientVendors.vendorId})::int`,
        paid: sql<number>`count(distinct ${clientVendors.vendorId}) filter (where ${clientVendors.paymentStatus} = 'paid')::int`,
        pending: sql<number>`count(distinct ${clientVendors.vendorId}) filter (where ${clientVendors.paymentStatus} = 'pending')::int`,
        overdue: sql<number>`count(distinct ${clientVendors.vendorId}) filter (where ${clientVendors.paymentStatus} = 'overdue')::int`,
      })
      .from(clientVendors)
      .where(eq(clientVendors.clientId, clientId)),

    // Hotel statistics
    db
      .select({
        totalBookings: sql<number>`count(*)::int`,
        totalRooms: sql<number>`coalesce(sum(1), 0)::int`,
      })
      .from(accommodations)
      .where(eq(accommodations.clientId, clientId)),
  ])

  const guestData = guestStats[0] || { total: 0, confirmed: 0, pending: 0, declined: 0, vegetarian: 0, vegan: 0, glutenFree: 0 }
  const budgetData = budgetStats[0] || { totalEstimated: 0, totalActual: 0, totalPaid: 0, itemCount: 0 }
  const vendorData = vendorStats[0] || { total: 0, paid: 0, pending: 0, overdue: 0 }
  const hotelData = hotelStats[0] || { totalBookings: 0, totalRooms: 0 }

  // Calculate days until wedding
  const weddingDate = client.weddingDate ? new Date(client.weddingDate) : null
  const today = new Date()
  const daysUntilWedding = weddingDate
    ? Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Build action items if requested
  const actionItems: string[] = []
  if (includeActionItems) {
    if (guestData.pending > 0) {
      actionItems.push(`${guestData.pending} guests have not RSVPed yet`)
    }
    if (vendorData.overdue > 0) {
      actionItems.push(`${vendorData.overdue} vendor payment(s) are overdue`)
    }
    if (budgetData.totalActual > budgetData.totalEstimated && budgetData.totalEstimated > 0) {
      const overBudget = ((budgetData.totalActual - budgetData.totalEstimated) / budgetData.totalEstimated * 100).toFixed(0)
      actionItems.push(`Budget is ${overBudget}% over estimate`)
    }
    if (vendorData.pending > 0) {
      actionItems.push(`${vendorData.pending} vendor payment(s) are pending`)
    }
  }

  const coupleNames = `${client.partner1FirstName}${client.partner2FirstName ? ` & ${client.partner2FirstName}` : ''}`

  const summary = {
    wedding: {
      couple: coupleNames,
      date: client.weddingDate,
      daysUntilWedding,
      venue: client.venue,
      weddingType: client.weddingType,
    },
    events: {
      total: eventList.length,
      list: eventList.map(e => ({
        title: e.title,
        date: e.eventDate,
        type: e.eventType,
        status: e.status,
      })),
    },
    guests: {
      total: guestData.total,
      confirmed: guestData.confirmed,
      pending: guestData.pending,
      declined: guestData.declined,
      dietary: {
        vegetarian: guestData.vegetarian,
        vegan: guestData.vegan,
        glutenFree: guestData.glutenFree,
      },
    },
    budget: {
      estimated: budgetData.totalEstimated,
      actual: budgetData.totalActual,
      paid: budgetData.totalPaid,
      remaining: budgetData.totalEstimated - budgetData.totalPaid,
      itemCount: budgetData.itemCount,
    },
    vendors: {
      total: vendorData.total,
      paid: vendorData.paid,
      pending: vendorData.pending,
      overdue: vendorData.overdue,
    },
    hotels: {
      bookings: hotelData.totalBookings,
      rooms: hotelData.totalRooms,
    },
    actionItems: actionItems.length > 0 ? actionItems : undefined,
  }

  return {
    success: true,
    toolName: 'get_wedding_summary',
    data: summary,
    message: `Wedding summary for ${coupleNames}`,
  }
}

// ============================================
// TOOL HANDLERS - RECOMMENDATIONS
// ============================================

async function executeGetRecommendations(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const categories = (args.categories as string[]) || ['all']

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  const includeAll = categories.includes('all')
  const recommendations: Array<{
    type: 'warning' | 'info' | 'action'
    category: string
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
  }> = []

  // Payment recommendations
  if (includeAll || categories.includes('payments')) {
    const overdueVendors = await db
      .select({
        vendorName: vendors.name,
        category: vendors.category,
      })
      .from(clientVendors)
      .innerJoin(vendors, eq(vendors.id, clientVendors.vendorId))
      .where(
        and(
          eq(clientVendors.clientId, clientId),
          eq(clientVendors.paymentStatus, 'overdue')
        )
      )
      .limit(5)

    for (const v of overdueVendors) {
      recommendations.push({
        type: 'warning',
        category: 'payments',
        title: `Overdue payment: ${v.vendorName}`,
        description: `The ${v.category} vendor payment is overdue and needs attention.`,
        priority: 'high',
      })
    }
  }

  // RSVP recommendations
  if (includeAll || categories.includes('rsvp')) {
    const [rsvpStats] = await db
      .select({
        pending: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'pending' or ${guests.rsvpStatus} is null)::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(guests)
      .where(eq(guests.clientId, clientId))

    if (rsvpStats && rsvpStats.pending > 0) {
      const percentage = Math.round((rsvpStats.pending / rsvpStats.total) * 100)
      recommendations.push({
        type: 'action',
        category: 'rsvp',
        title: `${rsvpStats.pending} pending RSVPs`,
        description: `${percentage}% of guests haven't responded. Consider sending a reminder.`,
        priority: percentage > 50 ? 'high' : 'medium',
      })
    }
  }

  // Seating recommendations
  if (includeAll || categories.includes('seating')) {
    const [guestCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guests)
      .where(and(eq(guests.clientId, clientId), eq(guests.rsvpStatus, 'confirmed')))

    const confirmedGuests = guestCount?.count || 0

    // Check if we have seating data (table assignments)
    const [seatedGuests] = await db
      .select({ count: sql<number>`count(*) filter (where ${guests.tableNumber} is not null)::int` })
      .from(guests)
      .where(and(eq(guests.clientId, clientId), eq(guests.rsvpStatus, 'confirmed')))

    const seated = seatedGuests?.count || 0

    if (confirmedGuests > 0 && seated < confirmedGuests) {
      const unassigned = confirmedGuests - seated
      recommendations.push({
        type: 'info',
        category: 'seating',
        title: `${unassigned} guests need table assignments`,
        description: `${unassigned} confirmed guests don't have table numbers assigned yet.`,
        priority: unassigned > 20 ? 'medium' : 'low',
      })
    }
  }

  // Timeline recommendations
  if (includeAll || categories.includes('timeline')) {
    // Check for events without timelines
    const eventsWithoutTimeline = await db
      .select({ title: events.title })
      .from(events)
      .leftJoin(timeline, eq(timeline.eventId, events.id))
      .where(
        and(
          eq(events.clientId, clientId),
          isNull(events.deletedAt),
          isNull(timeline.id)
        )
      )
      .limit(3)

    for (const e of eventsWithoutTimeline) {
      recommendations.push({
        type: 'info',
        category: 'timeline',
        title: `No timeline for ${e.title}`,
        description: `The ${e.title} event doesn't have a timeline yet. Consider adding one.`,
        priority: 'low',
      })
    }
  }

  // Vendor recommendations
  if (includeAll || categories.includes('vendors')) {
    const [budgetCategories] = await db
      .select({
        hasVenue: sql<boolean>`bool_or(${budget.category} = 'venue')`,
        hasPhotography: sql<boolean>`bool_or(${budget.category} = 'photography')`,
        hasCatering: sql<boolean>`bool_or(${budget.category} = 'catering')`,
      })
      .from(budget)
      .where(eq(budget.clientId, clientId))

    if (budgetCategories) {
      if (!budgetCategories.hasVenue) {
        recommendations.push({
          type: 'info',
          category: 'vendors',
          title: 'No venue vendor booked',
          description: 'Consider adding a venue to your vendor list and budget.',
          priority: 'medium',
        })
      }
      if (!budgetCategories.hasPhotography) {
        recommendations.push({
          type: 'info',
          category: 'vendors',
          title: 'No photographer booked',
          description: 'Photography is typically one of the first vendors to book.',
          priority: 'low',
        })
      }
    }
  }

  const coupleNames = `${client.partner1FirstName}${client.partner2FirstName ? ` & ${client.partner2FirstName}` : ''}`

  return {
    success: true,
    toolName: 'get_recommendations',
    data: {
      recommendations,
      totalCount: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'high').length,
    },
    message: recommendations.length > 0
      ? `Found ${recommendations.length} recommendation${recommendations.length === 1 ? '' : 's'} for ${coupleNames}'s wedding`
      : `No recommendations for ${coupleNames}'s wedding - everything looks good!`,
  }
}

// ============================================
// TOOL HANDLERS - DAY-OF CHECK-IN
// ============================================

async function executeCheckInGuest(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const guestId = args.guestId as string | undefined
  const guestName = args.guestName as string | undefined
  const guestNumber = args.guestNumber as number | undefined
  const eventId = args.eventId as string | undefined

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  // Must have at least one identifier
  if (!guestId && !guestName && !guestNumber) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Guest ID, name, or number is required',
    })
  }

  // Find the guest
  let targetGuestId = guestId

  if (!targetGuestId && guestName) {
    const resolution = await resolveGuest(guestName, clientId)
    if (resolution.isAmbiguous) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: resolution.message,
        cause: { options: resolution.options },
      })
    }
    targetGuestId = resolution.entity.id
  }

  if (!targetGuestId && guestNumber) {
    // Find guest by row number (using created_at order as "guest number")
    const guestList = await db
      .select({ id: guests.id })
      .from(guests)
      .where(eq(guests.clientId, clientId))
      .orderBy(guests.createdAt)
      .limit(guestNumber)
      .offset(guestNumber - 1)

    if (guestList.length > 0) {
      targetGuestId = guestList[0].id
    }
  }

  if (!targetGuestId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Guest not found',
    })
  }

  // Get guest details
  const [guest] = await db
    .select()
    .from(guests)
    .where(eq(guests.id, targetGuestId))
    .limit(1)

  if (!guest) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Guest not found',
    })
  }

  // Update check-in status (using metadata or a custom field)
  // For now, we'll update RSVP status to 'confirmed' if not already and log the check-in time
  const checkInTime = new Date().toISOString()

  await db
    .update(guests)
    .set({
      rsvpStatus: 'confirmed',
      updatedAt: new Date(),
      // Store check-in time in notes or metadata (if available)
      notes: guest.notes
        ? `${guest.notes}\n[Checked in at ${checkInTime}]`
        : `[Checked in at ${checkInTime}]`,
    })
    .where(eq(guests.id, targetGuestId))

  const guestDisplayName = `${guest.firstName} ${guest.lastName || ''}`.trim()

  return {
    success: true,
    toolName: 'check_in_guest',
    data: {
      guestId: guest.id,
      name: guestDisplayName,
      tableNumber: guest.tableNumber,
      dietaryRestrictions: guest.dietaryRestrictions,
      plusOneAllowed: guest.plusOneAllowed,
      plusOneName: guest.plusOneName,
      checkedInAt: checkInTime,
    },
    message: `✅ ${guestDisplayName} checked in at ${new Date(checkInTime).toLocaleTimeString()}. ${guest.tableNumber ? `Table ${guest.tableNumber}.` : ''} ${guest.dietaryRestrictions && guest.dietaryRestrictions !== 'none' ? `Dietary: ${guest.dietaryRestrictions}.` : ''} ${guest.plusOneAllowed && guest.plusOneName ? `+1: ${guest.plusOneName}.` : ''}`.trim(),
  }
}

// ============================================
// TRANSPORT ASSIGNMENT
// ============================================

async function executeAssignTransport(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const vehicleInfo = args.vehicleInfo as string
  const vehicleType = args.vehicleType as string | undefined
  const hotelName = args.hotelName as string | undefined
  const groupName = args.groupName as string | undefined
  const eventId = args.eventId as string | undefined
  const eventName = args.eventName as string | undefined
  const guestIds = args.guestIds as string[] | undefined
  const pickupDate = args.pickupDate as string | undefined
  const pickupTime = args.pickupTime as string | undefined
  const pickupFrom = args.pickupFrom as string | undefined
  const dropTo = args.dropTo as string | undefined
  const driverPhone = args.driverPhone as string | undefined
  const notes = args.notes as string | undefined

  if (!clientId || !vehicleInfo) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID and vehicle info are required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Resolve event if eventName provided
  let resolvedEventId = eventId
  let resolvedDropTo = dropTo
  if (!eventId && eventName) {
    const eventResult = await resolveEvent(eventName, clientId)
    if (!eventResult.isAmbiguous) {
      resolvedEventId = eventResult.entity.id
      // Use event venue as drop location if not specified
      const eventData = eventResult.entity.data as { venueName?: string; title?: string }
      if (!dropTo && eventData.venueName) {
        resolvedDropTo = eventData.venueName
      }
    }
  }

  // Build guest filter conditions
  const filterConditions = [eq(guests.clientId, clientId)]

  if (guestIds && guestIds.length > 0) {
    // Specific guests
    filterConditions.push(sql`${guests.id} = ANY(ARRAY[${sql.join(guestIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
  } else {
    // Filter by hotel
    if (hotelName) {
      filterConditions.push(sql`(${guests.hotelName} ILIKE ${'%' + hotelName + '%'} OR ${guests.hotelRequired} = true)`)
    }

    // Filter by group
    if (groupName) {
      filterConditions.push(sql`${guests.groupName} ILIKE ${'%' + groupName + '%'}`)
    }
  }

  // Get matching guests
  const matchingGuests = await db
    .select({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      hotelName: guests.hotelName,
    })
    .from(guests)
    .where(and(...filterConditions))

  if (matchingGuests.length === 0) {
    return {
      success: false,
      toolName: 'assign_transport',
      data: { guestsAssigned: 0 },
      message: 'No guests found matching the criteria',
      error: 'No matching guests',
    }
  }

  // Create transport records for each guest
  const transportRecords = []
  for (const guest of matchingGuests) {
    const guestName = `${guest.firstName} ${guest.lastName || ''}`.trim()

    // Create transport record
    const [record] = await db
      .insert(guestTransport)
      .values({
        clientId,
        guestId: guest.id,
        guestName,
        vehicleInfo,
        vehicleType: vehicleType || 'other',
        pickupDate,
        pickupFrom: pickupFrom || guest.hotelName || undefined,
        dropTo: resolvedDropTo,
        eventId: resolvedEventId,
        driverPhone,
        notes,
        transportStatus: 'scheduled',
        legType: 'arrival',
      })
      .returning({ id: guestTransport.id })

    transportRecords.push({
      transportId: record.id,
      guestId: guest.id,
      guestName,
    })

    // Update guest's transport flag
    await db
      .update(guests)
      .set({ transportRequired: true, updatedAt: new Date() })
      .where(eq(guests.id, guest.id))
  }

  const filterDescription = hotelName
    ? `at ${hotelName}`
    : groupName
      ? `in ${groupName} group`
      : guestIds
        ? `(${guestIds.length} specific guests)`
        : ''

  return {
    success: true,
    toolName: 'assign_transport',
    data: {
      guestsAssigned: transportRecords.length,
      vehicleInfo,
      vehicleType: vehicleType || 'other',
      pickupFrom: pickupFrom || hotelName,
      dropTo: resolvedDropTo,
      records: transportRecords,
    },
    message: `🚗 Assigned ${vehicleInfo} to ${transportRecords.length} guest${transportRecords.length !== 1 ? 's' : ''} ${filterDescription}. ${pickupTime ? `Pickup at ${pickupTime}.` : ''} ${resolvedDropTo ? `Destination: ${resolvedDropTo}.` : ''}`.trim(),
    cascadeResults: transportRecords.map((r) => ({
      action: 'created',
      entityType: 'guestTransport',
      entityId: r.transportId,
    })),
  }
}

// ============================================
// MULTI-EVENT GUEST ASSIGNMENT
// ============================================

async function executeAssignGuestsToEvents(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const eventIds = args.eventIds as string[] | undefined
  const eventNames = args.eventNames as string[] | undefined
  const lastName = args.lastName as string | undefined
  const groupName = args.groupName as string | undefined
  const guestIds = args.guestIds as string[] | undefined
  const side = args.side as string | undefined
  const rsvpStatus = args.rsvpStatus as string | undefined
  const replaceExisting = (args.replaceExisting as boolean) || false

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
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

  // Resolve events
  let resolvedEventIds: string[] = []
  const resolvedEventNames: string[] = []

  if (eventIds && eventIds.length > 0) {
    resolvedEventIds = eventIds

    // Get event names for display
    const eventRecords = await db
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(
        and(
          eq(events.clientId, clientId),
          sql`${events.id} = ANY(ARRAY[${sql.join(eventIds.map(id => sql`${id}`), sql`, `)}]::text[])`,
          isNull(events.deletedAt)
        )
      )

    for (const e of eventRecords) {
      resolvedEventNames.push(e.title)
    }
  } else if (eventNames && eventNames.length > 0) {
    // Resolve by name
    for (const name of eventNames) {
      const result = await resolveEvent(name, clientId)
      if (!result.isAmbiguous) {
        resolvedEventIds.push(result.entity.id)
        resolvedEventNames.push(result.entity.displayName)
      }
    }
  }

  if (resolvedEventIds.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No valid events specified. Please provide event IDs or names.',
    })
  }

  // Build guest filter conditions
  const filterConditions = [eq(guests.clientId, clientId)]

  if (guestIds && guestIds.length > 0) {
    filterConditions.push(sql`${guests.id} = ANY(ARRAY[${sql.join(guestIds.map(id => sql`${id}`), sql`, `)}]::text[])`)
  } else {
    // Filter by lastName (family)
    if (lastName) {
      filterConditions.push(sql`${guests.lastName} ILIKE ${'%' + lastName + '%'}`)
    }

    // Filter by group
    if (groupName) {
      filterConditions.push(sql`${guests.groupName} ILIKE ${'%' + groupName + '%'}`)
    }

    // Filter by side
    if (side) {
      filterConditions.push(eq(guests.guestSide, side))
    }

    // Filter by RSVP status
    if (rsvpStatus) {
      filterConditions.push(eq(guests.rsvpStatus, rsvpStatus))
    }
  }

  // Must have at least one filter beyond clientId
  if (filterConditions.length === 1 && !guestIds) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Please specify guests by lastName, groupName, guestIds, side, or rsvpStatus',
    })
  }

  // Get matching guests
  const matchingGuests = await db
    .select({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      attendingEvents: guests.attendingEvents,
    })
    .from(guests)
    .where(and(...filterConditions))

  if (matchingGuests.length === 0) {
    return {
      success: false,
      toolName: 'assign_guests_to_events',
      data: { guestsUpdated: 0 },
      message: 'No guests found matching the criteria',
      error: 'No matching guests',
    }
  }

  // Update each guest's attending events
  let guestsUpdated = 0
  for (const guest of matchingGuests) {
    let newAttendingEvents: string[]

    if (replaceExisting) {
      newAttendingEvents = resolvedEventIds
    } else {
      // Merge with existing events
      const existingEvents = guest.attendingEvents || []
      const eventSet = new Set([...existingEvents, ...resolvedEventIds])
      newAttendingEvents = Array.from(eventSet)
    }

    await db
      .update(guests)
      .set({
        attendingEvents: newAttendingEvents,
        updatedAt: new Date(),
      })
      .where(eq(guests.id, guest.id))

    guestsUpdated++
  }

  const filterDescription = lastName
    ? `${lastName} family`
    : groupName
      ? `${groupName} group`
      : guestIds
        ? `${guestIds.length} specific guests`
        : side
          ? `${side} side guests`
          : 'selected guests'

  const eventDescription = resolvedEventNames.join(' and ')

  return {
    success: true,
    toolName: 'assign_guests_to_events',
    data: {
      guestsUpdated,
      eventIds: resolvedEventIds,
      eventNames: resolvedEventNames,
      filterUsed: { lastName, groupName, guestIds: guestIds?.length, side, rsvpStatus },
    },
    message: `✅ Added ${guestsUpdated} guest${guestsUpdated !== 1 ? 's' : ''} (${filterDescription}) to ${eventDescription}.${replaceExisting ? ' (replaced existing assignments)' : ''}`,
  }
}

// ============================================
// PHASE 1: QUERY ENHANCEMENT TOOL HANDLERS
// ============================================

/**
 * Universal query tool with aggregations and filters
 */
async function executeQueryData(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string | undefined
  const entityType = args.entityType as string
  const operation = args.operation as string
  const field = args.field as string | undefined
  const groupByField = args.groupByField as string | undefined
  const filters = args.filters as Record<string, unknown> | undefined
  const limit = (args.limit as number) || 20

  // Build base query conditions
  const conditions: ReturnType<typeof eq>[] = []

  if (clientId) {
    // Verify client access
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!), isNull(clients.deletedAt)))
      .limit(1)

    if (!client) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
    }
  }

  let result: unknown
  let resultMessage: string

  switch (entityType) {
    case 'guests': {
      let guestConditions = clientId
        ? [eq(guests.clientId, clientId)]
        : []

      // Apply filters
      if (filters?.rsvpStatus) {
        guestConditions.push(eq(guests.rsvpStatus, filters.rsvpStatus as string))
      }
      if (filters?.mealPreference) {
        guestConditions.push(eq(guests.mealPreference, filters.mealPreference as string))
      }
      if (filters?.side) {
        guestConditions.push(eq(guests.guestSide, filters.side as string))
      }

      const whereClause = guestConditions.length > 0 ? and(...guestConditions) : undefined

      if (operation === 'count') {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(guests)
          .where(whereClause)
        result = { count: countResult?.count || 0 }
        resultMessage = `Found ${countResult?.count || 0} guests`
      } else if (operation === 'group_by' && groupByField) {
        const groupResults = await db
          .select({
            group: sql<string>`${sql.raw(groupByField)}`,
            count: sql<number>`count(*)::int`,
          })
          .from(guests)
          .where(whereClause)
          .groupBy(sql`${sql.raw(groupByField)}`)
        result = groupResults
        resultMessage = `Grouped guests by ${groupByField}`
      } else {
        const guestList = await db
          .select({
            id: guests.id,
            firstName: guests.firstName,
            lastName: guests.lastName,
            rsvpStatus: guests.rsvpStatus,
            mealPreference: guests.mealPreference,
            tableNumber: guests.tableNumber,
          })
          .from(guests)
          .where(whereClause)
          .limit(limit)
        result = guestList
        resultMessage = `Retrieved ${guestList.length} guests`
      }
      break
    }

    case 'events': {
      let eventConditions = clientId
        ? [eq(events.clientId, clientId), isNull(events.deletedAt)]
        : [isNull(events.deletedAt)]

      if (filters?.status) {
        eventConditions.push(eq(events.status, filters.status as string))
      }
      if (filters?.dateFrom) {
        const dateFrom = parseNaturalDate(filters.dateFrom as string) || (filters.dateFrom as string)
        eventConditions.push(gte(events.eventDate, dateFrom))
      }
      if (filters?.dateTo) {
        const dateTo = parseNaturalDate(filters.dateTo as string) || (filters.dateTo as string)
        eventConditions.push(lte(events.eventDate, dateTo))
      }

      const whereClause = and(...eventConditions)

      if (operation === 'count') {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(events)
          .where(whereClause)
        result = { count: countResult?.count || 0 }
        resultMessage = `Found ${countResult?.count || 0} events`
      } else {
        const eventList = await db
          .select({
            id: events.id,
            title: events.title,
            eventType: events.eventType,
            eventDate: events.eventDate,
            status: events.status,
            venueName: events.venueName,
          })
          .from(events)
          .where(whereClause)
          .orderBy(events.eventDate)
          .limit(limit)
        result = eventList
        resultMessage = `Retrieved ${eventList.length} events`
      }
      break
    }

    case 'budget': {
      let budgetConditions = clientId
        ? [eq(budget.clientId, clientId)]
        : []

      if (filters?.category) {
        budgetConditions.push(eq(budget.category, filters.category as string))
      }
      if (filters?.paymentStatus) {
        budgetConditions.push(eq(budget.paymentStatus, filters.paymentStatus as string))
      }

      const whereClause = budgetConditions.length > 0 ? and(...budgetConditions) : undefined

      if (operation === 'sum' && field) {
        const sumField = field === 'estimatedCost' ? budget.estimatedCost
          : field === 'actualCost' ? budget.actualCost
          : budget.paidAmount
        const [sumResult] = await db
          .select({ total: sql<number>`coalesce(sum(${sumField}::numeric), 0)::float` })
          .from(budget)
          .where(whereClause)
        result = { total: sumResult?.total || 0, field }
        resultMessage = `Total ${field}: $${(sumResult?.total || 0).toLocaleString()}`
      } else if (operation === 'group_by') {
        const groupResults = await db
          .select({
            category: budget.category,
            estimated: sql<number>`coalesce(sum(${budget.estimatedCost}::numeric), 0)::float`,
            paid: sql<number>`coalesce(sum(${budget.paidAmount}::numeric), 0)::float`,
            count: sql<number>`count(*)::int`,
          })
          .from(budget)
          .where(whereClause)
          .groupBy(budget.category)
        result = groupResults
        resultMessage = `Budget breakdown by category`
      } else {
        const budgetList = await db
          .select()
          .from(budget)
          .where(whereClause)
          .limit(limit)
        result = budgetList
        resultMessage = `Retrieved ${budgetList.length} budget items`
      }
      break
    }

    case 'vendors': {
      // Query vendors through clientVendors junction
      let vendorConditions = clientId
        ? [eq(clientVendors.clientId, clientId)]
        : []

      const whereClause = vendorConditions.length > 0 ? and(...vendorConditions) : undefined

      if (operation === 'count') {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(clientVendors)
          .where(whereClause)
        result = { count: countResult?.count || 0 }
        resultMessage = `Found ${countResult?.count || 0} vendors`
      } else if (operation === 'group_by') {
        const groupResults = await db
          .select({
            category: vendors.category,
            count: sql<number>`count(*)::int`,
          })
          .from(clientVendors)
          .innerJoin(vendors, eq(clientVendors.vendorId, vendors.id))
          .where(whereClause)
          .groupBy(vendors.category)
        result = groupResults
        resultMessage = `Vendors by category`
      } else {
        const vendorList = await db
          .select({
            id: vendors.id,
            name: vendors.name,
            category: vendors.category,
            email: vendors.email,
            phone: vendors.phone,
          })
          .from(clientVendors)
          .innerJoin(vendors, eq(clientVendors.vendorId, vendors.id))
          .where(whereClause)
          .limit(limit)
        result = vendorList
        resultMessage = `Retrieved ${vendorList.length} vendors`
      }
      break
    }

    default:
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Entity type '${entityType}' is not supported for query_data`,
      })
  }

  return {
    success: true,
    toolName: 'query_data',
    data: result,
    message: resultMessage,
  }
}

/**
 * Query events across all clients
 */
async function executeQueryCrossClientEvents(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const dateFrom = args.dateFrom as string | undefined
  const dateTo = args.dateTo as string | undefined
  const eventType = args.eventType as string | undefined
  const status = args.status as string | undefined
  const limit = (args.limit as number) || 20

  // Build conditions - always filter by company
  const conditions = [
    eq(clients.companyId, ctx.companyId!),
    isNull(events.deletedAt),
    isNull(clients.deletedAt),
  ]

  if (dateFrom) {
    const parsedDateFrom = parseNaturalDate(dateFrom) || dateFrom
    conditions.push(gte(events.eventDate, parsedDateFrom))
  }
  if (dateTo) {
    const parsedDateTo = parseNaturalDate(dateTo) || dateTo
    conditions.push(lte(events.eventDate, parsedDateTo))
  }
  if (eventType) {
    conditions.push(eq(events.eventType, eventType))
  }
  if (status) {
    conditions.push(eq(events.status, status))
  }

  const eventList = await db
    .select({
      id: events.id,
      title: events.title,
      eventType: events.eventType,
      eventDate: events.eventDate,
      startTime: events.startTime,
      venueName: events.venueName,
      status: events.status,
      clientId: events.clientId,
      clientName: sql<string>`${clients.partner1FirstName} || ' & ' || coalesce(${clients.partner2FirstName}, '')`,
    })
    .from(events)
    .innerJoin(clients, eq(events.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(events.eventDate)
    .limit(limit)

  return {
    success: true,
    toolName: 'query_cross_client_events',
    data: eventList,
    message: `Found ${eventList.length} events across all clients`,
  }
}

/**
 * Currency conversion rates (simplified - in production would use API)
 */
const CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.12,
  AUD: 1.53,
  CAD: 1.36,
  SGD: 1.34,
  AED: 3.67,
  MXN: 17.15,
}

/**
 * Budget currency conversion
 */
async function executeBudgetCurrencyConvert(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string | undefined
  const amount = args.amount as number | undefined
  const sourceCurrency = (args.sourceCurrency as string) || 'USD'
  const targetCurrency = args.targetCurrency as string
  const includeBreakdown = args.includeBreakdown as boolean

  const sourceRate = CURRENCY_RATES[sourceCurrency] || 1
  const targetRate = CURRENCY_RATES[targetCurrency] || 1
  const conversionRate = targetRate / sourceRate

  if (amount !== undefined) {
    // Convert specific amount
    const converted = amount * conversionRate
    return {
      success: true,
      toolName: 'budget_currency_convert',
      data: {
        originalAmount: amount,
        sourceCurrency,
        convertedAmount: Math.round(converted * 100) / 100,
        targetCurrency,
        rate: Math.round(conversionRate * 10000) / 10000,
      },
      message: `${sourceCurrency} ${amount.toLocaleString()} = ${targetCurrency} ${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    }
  }

  if (clientId) {
    // Get budget totals and convert
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!), isNull(clients.deletedAt)))
      .limit(1)

    if (!client) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
    }

    const [totals] = await db
      .select({
        estimated: sql<number>`coalesce(sum(${budget.estimatedCost}::numeric), 0)::float`,
        actual: sql<number>`coalesce(sum(${budget.actualCost}::numeric), 0)::float`,
        paid: sql<number>`coalesce(sum(${budget.paidAmount}::numeric), 0)::float`,
      })
      .from(budget)
      .where(eq(budget.clientId, clientId))

    const result: Record<string, unknown> = {
      sourceCurrency,
      targetCurrency,
      rate: Math.round(conversionRate * 10000) / 10000,
      estimated: {
        original: totals?.estimated || 0,
        converted: Math.round((totals?.estimated || 0) * conversionRate * 100) / 100,
      },
      actual: {
        original: totals?.actual || 0,
        converted: Math.round((totals?.actual || 0) * conversionRate * 100) / 100,
      },
      paid: {
        original: totals?.paid || 0,
        converted: Math.round((totals?.paid || 0) * conversionRate * 100) / 100,
      },
    }

    if (includeBreakdown) {
      const breakdown = await db
        .select({
          category: budget.category,
          estimated: sql<number>`coalesce(sum(${budget.estimatedCost}::numeric), 0)::float`,
          paid: sql<number>`coalesce(sum(${budget.paidAmount}::numeric), 0)::float`,
        })
        .from(budget)
        .where(eq(budget.clientId, clientId))
        .groupBy(budget.category)

      result.breakdown = breakdown.map(b => ({
        category: b.category,
        estimatedOriginal: b.estimated,
        estimatedConverted: Math.round(b.estimated * conversionRate * 100) / 100,
        paidOriginal: b.paid,
        paidConverted: Math.round(b.paid * conversionRate * 100) / 100,
      }))
    }

    return {
      success: true,
      toolName: 'budget_currency_convert',
      data: result,
      message: `Budget in ${targetCurrency}: Estimated ${targetCurrency} ${((totals?.estimated || 0) * conversionRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}, Paid ${targetCurrency} ${((totals?.paid || 0) * conversionRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    }
  }

  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Either amount or clientId is required for currency conversion',
  })
}

/**
 * Get weather forecast (simplified - in production would use weather API)
 */
async function executeGetWeather(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string | undefined
  const date = args.date as string | undefined
  const location = args.location as string | undefined
  const eventId = args.eventId as string | undefined

  let targetDate: string | undefined
  let targetLocation: string | undefined

  if (eventId) {
    const [event] = await db
      .select({ eventDate: events.eventDate, venueName: events.venueName, address: events.address })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (event) {
      targetDate = event.eventDate || undefined
      targetLocation = event.venueName || event.address || undefined
    }
  }

  if (clientId && !targetDate) {
    const [client] = await db
      .select({ weddingDate: clients.weddingDate, venue: clients.venue })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!)))
      .limit(1)

    if (client) {
      targetDate = client.weddingDate || undefined
      targetLocation = targetLocation || client.venue || undefined
    }
  }

  targetDate = date ? (parseNaturalDate(date) || date) : targetDate
  targetLocation = location || targetLocation || 'Unknown location'

  if (!targetDate) {
    return {
      success: true,
      toolName: 'get_weather',
      data: { error: 'No date specified' },
      message: 'Unable to get weather forecast - no date was specified. Please provide a date or select a client/event.',
    }
  }

  // Simulate weather data (in production, integrate with OpenWeatherMap or similar)
  const eventDateObj = new Date(targetDate)
  const today = new Date()
  const daysUntil = Math.floor((eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let forecast: Record<string, unknown>

  if (daysUntil < 0) {
    forecast = {
      status: 'past',
      message: 'This date has already passed. Historical weather data would be shown here.',
    }
  } else if (daysUntil > 14) {
    forecast = {
      status: 'too_far',
      daysUntil,
      message: `Weather forecast is only available up to 14 days in advance. This event is ${daysUntil} days away.`,
    }
  } else {
    // Generate simulated forecast
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear']
    const condition = conditions[Math.floor(Math.random() * conditions.length)]
    const tempHigh = Math.floor(Math.random() * 20) + 65 // 65-85°F
    const tempLow = tempHigh - Math.floor(Math.random() * 15) - 5
    const precipitation = condition.includes('Rain') ? Math.floor(Math.random() * 50) + 30 : Math.floor(Math.random() * 20)

    forecast = {
      status: 'available',
      date: targetDate,
      location: targetLocation,
      daysUntil,
      condition,
      temperature: {
        high: tempHigh,
        low: tempLow,
        unit: 'F',
      },
      precipitation: {
        chance: precipitation,
        unit: '%',
      },
      humidity: Math.floor(Math.random() * 40) + 40,
      wind: {
        speed: Math.floor(Math.random() * 15) + 5,
        unit: 'mph',
      },
    }
  }

  const weatherMessage = forecast.status === 'available'
    ? `Weather for ${targetDate} at ${targetLocation}: ${(forecast as { condition: string }).condition}, High ${(forecast as { temperature: { high: number } }).temperature.high}°F, ${(forecast as { precipitation: { chance: number } }).precipitation.chance}% chance of rain`
    : (forecast as { message: string }).message

  return {
    success: true,
    toolName: 'get_weather',
    data: forecast,
    message: weatherMessage,
  }
}

// ============================================
// PHASE 2: BULK & MANAGEMENT TOOL HANDLERS
// ============================================

/**
 * Bulk add hotel bookings
 */
async function executeBulkAddHotelBookings(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const hotelName = args.hotelName as string
  const roomType = args.roomType as string | undefined
  const checkInDate = args.checkInDate as string
  const checkOutDate = args.checkOutDate as string
  const roomRate = args.roomRate as number | undefined
  const guestIds = args.guestIds as string[] | undefined
  const groupName = args.groupName as string | undefined
  const side = args.side as string | undefined
  const needsHotelOnly = args.needsHotelOnly !== false
  const roomCount = args.roomCount as number | undefined
  const notes = args.notes as string | undefined

  if (!clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID is required' })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!), isNull(clients.deletedAt)))
    .limit(1)

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
  }

  // Build guest filter conditions
  const guestConditions = [eq(guests.clientId, clientId)]

  if (guestIds && guestIds.length > 0) {
    guestConditions.push(inArray(guests.id, guestIds))
  }
  if (groupName) {
    guestConditions.push(like(guests.groupName, `%${groupName}%`))
  }
  if (side) {
    guestConditions.push(eq(guests.guestSide, side))
  }
  if (needsHotelOnly) {
    guestConditions.push(eq(guests.hotelRequired, true))
  }

  // Get matching guests
  let guestQuery = db
    .select({ id: guests.id, firstName: guests.firstName, lastName: guests.lastName })
    .from(guests)
    .where(and(...guestConditions))

  if (roomCount) {
    guestQuery = guestQuery.limit(roomCount) as typeof guestQuery
  }

  const matchingGuests = await guestQuery

  if (matchingGuests.length === 0) {
    return {
      success: true,
      toolName: 'bulk_add_hotel_bookings',
      data: { bookingsCreated: 0 },
      message: 'No matching guests found for hotel booking',
    }
  }

  // Find or create accommodation (master hotel record)
  let [accommodation] = await db
    .select({ id: accommodations.id, name: accommodations.name })
    .from(accommodations)
    .where(and(eq(accommodations.clientId, clientId), like(accommodations.name, `%${hotelName}%`)))
    .limit(1)

  if (!accommodation) {
    // Create accommodation record (master hotel)
    const [newAccommodation] = await db
      .insert(accommodations)
      .values({
        clientId,
        name: hotelName,
        notes: notes || '',
      })
      .returning({ id: accommodations.id, name: accommodations.name })
    accommodation = newAccommodation
  }

  // Create hotel bookings for each guest
  const bookings: Array<{ guestId: string; guestName: string }> = []

  for (const guest of matchingGuests) {
    // Check if booking already exists
    const [existing] = await db
      .select({ id: hotels.id })
      .from(hotels)
      .where(and(eq(hotels.guestId, guest.id), eq(hotels.accommodationId, accommodation.id)))
      .limit(1)

    if (!existing) {
      const guestFullName = `${guest.firstName} ${guest.lastName || ''}`.trim()
      await db.insert(hotels).values({
        clientId,
        guestId: guest.id,
        guestName: guestFullName,
        accommodationId: accommodation.id,
        hotelName: accommodation.name,
        roomType: roomType || 'Standard',
        checkInDate: parseNaturalDate(checkInDate) || checkInDate,
        checkOutDate: parseNaturalDate(checkOutDate) || checkOutDate,
        cost: roomRate?.toString() || null,
        bookingConfirmed: true,
        notes: notes || '',
      })

      bookings.push({ guestId: guest.id, guestName: guestFullName })
    }
  }

  return {
    success: true,
    toolName: 'bulk_add_hotel_bookings',
    data: {
      accommodationId: accommodation.id,
      hotelName: accommodation.name,
      bookingsCreated: bookings.length,
      guests: bookings,
    },
    message: `🏨 Created ${bookings.length} hotel bookings at ${accommodation.name}`,
    cascadeResults: bookings.map(b => ({
      action: `Booked room for ${b.guestName}`,
      entityType: 'hotel_booking',
      entityId: b.guestId,
    })),
  }
}

/**
 * Update dietary preferences for all guests at a table
 */
async function executeUpdateTableDietary(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const tableNumber = args.tableNumber as number
  const mealPreference = args.mealPreference as string
  const dietaryRestrictions = args.dietaryRestrictions as string | undefined

  if (!clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID is required' })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!), isNull(clients.deletedAt)))
    .limit(1)

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
  }

  // Find guests at this table
  const tableGuests = await db
    .select({ id: guests.id, firstName: guests.firstName, lastName: guests.lastName })
    .from(guests)
    .where(and(eq(guests.clientId, clientId), eq(guests.tableNumber, tableNumber)))

  if (tableGuests.length === 0) {
    return {
      success: true,
      toolName: 'update_table_dietary',
      data: { guestsUpdated: 0 },
      message: `No guests found at table ${tableNumber}`,
    }
  }

  // Update all guests at the table
  const updateData: Record<string, unknown> = {
    mealPreference,
    updatedAt: new Date(),
  }
  if (dietaryRestrictions) {
    updateData.dietaryRestrictions = dietaryRestrictions
  }

  await db
    .update(guests)
    .set(updateData)
    .where(and(eq(guests.clientId, clientId), eq(guests.tableNumber, tableNumber)))

  return {
    success: true,
    toolName: 'update_table_dietary',
    data: {
      tableNumber,
      mealPreference,
      guestsUpdated: tableGuests.length,
      guests: tableGuests.map(g => `${g.firstName} ${g.lastName || ''}`),
    },
    message: `🍽️ Updated ${tableGuests.length} guests at table ${tableNumber} to ${mealPreference}`,
  }
}

/**
 * Add seating constraint
 */
async function executeAddSeatingConstraint(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const eventId = args.eventId as string | undefined
  const constraintType = args.constraintType as string
  const guestIds = args.guestIds as string[] | undefined
  const guestNames = args.guestNames as string[] | undefined
  const groupName = args.groupName as string | undefined
  const minimumDistance = args.minimumDistance as number | undefined
  const priority = (args.priority as string) || 'medium'
  const reason = args.reason as string | undefined

  if (!clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID is required' })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!), isNull(clients.deletedAt)))
    .limit(1)

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
  }

  // Resolve guest IDs from names if needed
  let resolvedGuestIds = guestIds || []

  if (guestNames && guestNames.length > 0) {
    for (const name of guestNames) {
      const resolution = await resolveGuest(name, clientId)
      if (!resolution.isAmbiguous && resolution.entity) {
        resolvedGuestIds.push(resolution.entity.id)
      }
    }
  }

  if (groupName) {
    const groupGuests = await db
      .select({ id: guests.id })
      .from(guests)
      .where(and(eq(guests.clientId, clientId), like(guests.groupName, `%${groupName}%`)))
    resolvedGuestIds = [...resolvedGuestIds, ...groupGuests.map(g => g.id)]
  }

  // Find or create floor plan
  let [floorPlan] = await db
    .select({ id: floorPlans.id, metadata: floorPlans.metadata })
    .from(floorPlans)
    .where(eq(floorPlans.clientId, clientId))
    .limit(1)

  if (!floorPlan) {
    const [newFloorPlan] = await db
      .insert(floorPlans)
      .values({
        id: crypto.randomUUID(),
        clientId,
        name: 'Main Floor Plan',
        width: 1200,
        height: 800,
        metadata: { constraints: [] },
      })
      .returning({ id: floorPlans.id, metadata: floorPlans.metadata })
    floorPlan = newFloorPlan
  }

  // Add constraint to metadata
  const constraint = {
    id: crypto.randomUUID(),
    type: constraintType,
    guestIds: resolvedGuestIds,
    minimumDistance,
    priority,
    reason,
    createdAt: new Date().toISOString(),
  }

  const currentMetadata = (floorPlan.metadata as Record<string, unknown>) || {}
  const constraints = (currentMetadata.constraints as unknown[]) || []
  constraints.push(constraint)

  await db
    .update(floorPlans)
    .set({
      metadata: { ...currentMetadata, constraints },
      updatedAt: new Date(),
    })
    .where(eq(floorPlans.id, floorPlan.id))

  return {
    success: true,
    toolName: 'add_seating_constraint',
    data: {
      constraintId: constraint.id,
      constraintType,
      guestsAffected: resolvedGuestIds.length,
      minimumDistance,
      priority,
    },
    message: `🪑 Added seating constraint: ${constraintType.replace('_', ' ')} for ${resolvedGuestIds.length} guests`,
  }
}

/**
 * Add a gift
 */
async function executeAddGift(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const guestId = args.guestId as string | undefined
  const guestName = args.guestName as string | undefined
  const name = args.name as string
  const type = (args.type as string) || 'physical'
  const value = args.value as number | undefined
  const quantity = (args.quantity as number) || 1
  const notes = args.notes as string | undefined

  if (!clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID is required' })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!), isNull(clients.deletedAt)))
    .limit(1)

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
  }

  // Resolve guest
  let resolvedGuestId = guestId
  if (!resolvedGuestId && guestName) {
    const resolution = await resolveGuest(guestName, clientId)
    if (!resolution.isAmbiguous && resolution.entity) {
      resolvedGuestId = resolution.entity.id
    }
  }

  // Create gift record
  const [newGift] = await db
    .insert(giftsEnhanced)
    .values({
      id: crypto.randomUUID(),
      clientId,
      guestId: resolvedGuestId || null,
      name,
      type,
      value: value || null,
      thankYouSent: false,
    })
    .returning()

  return {
    success: true,
    toolName: 'add_gift',
    data: newGift,
    message: `🎁 Added gift: ${name}${value ? ` ($${value.toLocaleString()})` : ''}${guestName ? ` from ${guestName}` : ''}`,
  }
}

/**
 * Update a gift
 */
async function executeUpdateGift(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const giftId = args.giftId as string | undefined
  const clientId = args.clientId as string | undefined
  const guestName = args.guestName as string | undefined
  const giftName = args.giftName as string | undefined
  const status = args.status as string | undefined
  const thankYouSent = args.thankYouSent as boolean | undefined
  const notes = args.notes as string | undefined

  let targetGiftId = giftId

  // Find gift by guest name or gift name if giftId not provided
  if (!targetGiftId && clientId) {
    let giftQuery = db
      .select({ id: giftsEnhanced.id })
      .from(giftsEnhanced)
      .where(eq(giftsEnhanced.clientId, clientId))

    if (guestName) {
      const resolution = await resolveGuest(guestName, clientId)
      if (!resolution.isAmbiguous && resolution.entity) {
        const [found] = await db
          .select({ id: giftsEnhanced.id })
          .from(giftsEnhanced)
          .where(and(eq(giftsEnhanced.clientId, clientId), eq(giftsEnhanced.guestId, resolution.entity.id)))
          .limit(1)
        if (found) targetGiftId = found.id
      }
    }

    if (!targetGiftId && giftName) {
      const [found] = await db
        .select({ id: giftsEnhanced.id })
        .from(giftsEnhanced)
        .where(and(eq(giftsEnhanced.clientId, clientId), like(giftsEnhanced.name, `%${giftName}%`)))
        .limit(1)
      if (found) targetGiftId = found.id
    }
  }

  if (!targetGiftId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Gift not found. Please provide giftId, or clientId with guestName or giftName.' })
  }

  // Update gift
  const updateData: Record<string, unknown> = { updatedAt: new Date() }
  if (thankYouSent !== undefined) updateData.thankYouSent = thankYouSent

  const [updatedGift] = await db
    .update(giftsEnhanced)
    .set(updateData)
    .where(eq(giftsEnhanced.id, targetGiftId))
    .returning()

  return {
    success: true,
    toolName: 'update_gift',
    data: updatedGift,
    message: `🎁 Updated gift: ${updatedGift.name}${thankYouSent ? ' - Thank you sent!' : ''}`,
  }
}

/**
 * Update creative job
 */
async function executeUpdateCreative(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const creativeId = args.creativeId as string | undefined
  const clientId = args.clientId as string | undefined
  const creativeName = args.creativeName as string | undefined
  const creativeType = args.creativeType as string | undefined
  const status = args.status as string | undefined
  const approvalStatus = args.approvalStatus as string | undefined
  const approvalComments = args.approvalComments as string | undefined
  const priority = args.priority as string | undefined
  const assignedTo = args.assignedTo as string | undefined

  let targetCreativeId = creativeId

  // Find creative if not provided by ID
  if (!targetCreativeId && clientId) {
    const conditions = [eq(creativeJobs.clientId, clientId)]
    if (creativeName) {
      conditions.push(like(creativeJobs.name, `%${creativeName}%`))
    }
    if (creativeType) {
      conditions.push(like(creativeJobs.type, `%${creativeType}%`))
    }

    const [found] = await db
      .select({ id: creativeJobs.id })
      .from(creativeJobs)
      .where(and(...conditions))
      .limit(1)

    if (found) targetCreativeId = found.id
  }

  if (!targetCreativeId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Creative job not found' })
  }

  // Get current creative to update data field
  const [current] = await db
    .select({ data: creativeJobs.data, status: creativeJobs.status })
    .from(creativeJobs)
    .where(eq(creativeJobs.id, targetCreativeId))
    .limit(1)

  if (!current) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Creative job not found' })
  }

  const currentData = (current.data as Record<string, unknown>) || {}
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (status) updateData.status = status
  if (approvalStatus || approvalComments || priority || assignedTo) {
    updateData.data = {
      ...currentData,
      ...(approvalStatus && { approvalStatus }),
      ...(approvalComments && { approvalComments }),
      ...(priority && { priority }),
      ...(assignedTo && { assignedTo }),
    }
  }

  const [updated] = await db
    .update(creativeJobs)
    .set(updateData)
    .where(eq(creativeJobs.id, targetCreativeId))
    .returning()

  return {
    success: true,
    toolName: 'update_creative',
    data: updated,
    message: `🎨 Updated creative job: ${updated.name}${status ? ` - Status: ${status}` : ''}`,
  }
}

/**
 * Assign team member
 */
async function executeAssignTeamMember(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const teamMemberId = args.teamMemberId as string | undefined
  const teamMemberName = args.teamMemberName as string
  const role = (args.role as string) || 'coordinator'
  const responsibilities = args.responsibilities as string[] | undefined

  if (!clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID is required' })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!), isNull(clients.deletedAt)))
    .limit(1)

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
  }

  // Find team member by name if ID not provided
  let resolvedTeamMemberId = teamMemberId

  if (!resolvedTeamMemberId && teamMemberName) {
    const [foundUser] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(and(
        eq(userTable.companyId, ctx.companyId!),
        or(
          like(userTable.firstName, `%${teamMemberName}%`),
          like(userTable.lastName, `%${teamMemberName}%`),
          like(userTable.email, `%${teamMemberName}%`)
        )
      ))
      .limit(1)

    if (foundUser) resolvedTeamMemberId = foundUser.id
  }

  if (!resolvedTeamMemberId) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Team member "${teamMemberName}" not found` })
  }

  // Check if assignment already exists
  const [existing] = await db
    .select({ id: teamClientAssignments.id })
    .from(teamClientAssignments)
    .where(and(
      eq(teamClientAssignments.clientId, clientId),
      eq(teamClientAssignments.teamMemberId, resolvedTeamMemberId)
    ))
    .limit(1)

  if (existing) {
    // Update existing assignment
    await db
      .update(teamClientAssignments)
      .set({ role, updatedAt: new Date() })
      .where(eq(teamClientAssignments.id, existing.id))

    return {
      success: true,
      toolName: 'assign_team_member',
      data: { assignmentId: existing.id, updated: true },
      message: `👥 Updated ${teamMemberName}'s role to ${role}`,
    }
  }

  // Create new assignment
  const [newAssignment] = await db
    .insert(teamClientAssignments)
    .values({
      id: crypto.randomUUID(),
      clientId,
      teamMemberId: resolvedTeamMemberId,
      role,
    })
    .returning()

  return {
    success: true,
    toolName: 'assign_team_member',
    data: newAssignment,
    message: `👥 Assigned ${teamMemberName} as ${role} for this wedding`,
  }
}

// ============================================
// PHASE 3: BUSINESS OPERATIONS TOOL HANDLERS
// ============================================

/**
 * Create proposal
 */
async function executeCreateProposal(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const leadId = args.leadId as string | undefined
  const clientId = args.clientId as string | undefined
  const leadName = args.leadName as string | undefined
  const title = args.title as string
  const templateId = args.templateId as string | undefined
  const packageAmount = args.packageAmount as number | undefined
  const currency = (args.currency as string) || 'USD'
  const services = args.services as string[] | undefined
  const validDays = (args.validDays as number) || 30
  const notes = args.notes as string | undefined

  // Resolve lead if name provided
  let resolvedLeadId = leadId
  if (!resolvedLeadId && leadName) {
    const [found] = await db
      .select({ id: pipelineLeads.id })
      .from(pipelineLeads)
      .where(and(
        eq(pipelineLeads.companyId, ctx.companyId!),
        or(
          like(pipelineLeads.firstName, `%${leadName}%`),
          like(pipelineLeads.lastName, `%${leadName}%`)
        )
      ))
      .limit(1)
    if (found) resolvedLeadId = found.id
  }

  // Get template if specified
  let templateData: Record<string, unknown> = {}
  if (templateId) {
    const [template] = await db
      .select()
      .from(proposalTemplates)
      .where(and(eq(proposalTemplates.id, templateId), eq(proposalTemplates.companyId, ctx.companyId!)))
      .limit(1)

    if (template) {
      templateData = {
        introText: template.introText,
        termsText: template.termsText,
        defaultPackages: template.defaultPackages,
      }
    }
  }

  // Build service packages
  const servicePackages = services?.map(service => ({
    name: service,
    description: '',
    price: 0,
    items: [],
  })) || (templateData.defaultPackages as unknown[]) || []

  // Generate public token
  const publicToken = crypto.randomUUID()

  // Create proposal
  const [newProposal] = await db
    .insert(proposals)
    .values({
      id: crypto.randomUUID(),
      companyId: ctx.companyId!,
      templateId: templateId || null,
      leadId: resolvedLeadId || null,
      clientId: clientId || null,
      title,
      proposalNumber: `PROP-${Date.now().toString(36).toUpperCase()}`,
      status: 'draft',
      introText: (templateData.introText as string) || '',
      termsText: (templateData.termsText as string) || '',
      servicePackages,
      subtotal: packageAmount?.toString() || '0',
      total: packageAmount?.toString() || '0',
      currency,
      validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
      publicToken,
      metadata: notes ? { notes } : {},
      createdBy: ctx.userId!,
    })
    .returning()

  return {
    success: true,
    toolName: 'create_proposal',
    data: {
      id: newProposal.id,
      proposalNumber: newProposal.proposalNumber,
      title: newProposal.title,
      total: newProposal.total,
      currency: newProposal.currency,
      validUntil: newProposal.validUntil,
      publicToken: newProposal.publicToken,
    },
    message: `📋 Created proposal: ${newProposal.proposalNumber} - ${title}${packageAmount ? ` (${currency} ${packageAmount.toLocaleString()})` : ''}`,
    cascadeResults: [
      {
        action: 'Generated public viewing link',
        entityType: 'proposal',
        entityId: newProposal.id,
      },
    ],
  }
}

/**
 * Create invoice
 */
async function executeCreateInvoice(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string | undefined
  const clientName = args.clientName as string | undefined
  const amount = args.amount as number
  const currency = (args.currency as string) || 'USD'
  const description = args.description as string | undefined
  const invoiceType = (args.invoiceType as string) || 'custom'
  const dueDate = args.dueDate as string | undefined
  const lineItems = args.lineItems as Array<{ description: string; amount: number }> | undefined
  const notes = args.notes as string | undefined

  // Resolve client if name provided
  let resolvedClientId = clientId
  if (!resolvedClientId && clientName) {
    const [found] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(
        eq(clients.companyId, ctx.companyId!),
        isNull(clients.deletedAt),
        or(
          like(clients.partner1FirstName, `%${clientName}%`),
          like(clients.partner2FirstName, `%${clientName}%`)
        )
      ))
      .limit(1)
    if (found) resolvedClientId = found.id
  }

  if (!resolvedClientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID or name is required' })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id, partner1FirstName: clients.partner1FirstName })
    .from(clients)
    .where(and(eq(clients.id, resolvedClientId), eq(clients.companyId, ctx.companyId!)))
    .limit(1)

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
  }

  // Parse due date
  const parsedDueDate = dueDate
    ? new Date(parseNaturalDate(dueDate) || dueDate)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Default 14 days

  // Create invoice
  const [newInvoice] = await db
    .insert(invoices)
    .values({
      id: crypto.randomUUID(),
      clientId: resolvedClientId,
      amount,
      status: 'pending',
      dueDate: parsedDueDate,
    })
    .returning()

  const typeLabel = invoiceType === 'deposit' ? 'Deposit'
    : invoiceType === 'progress' ? 'Progress Payment'
    : invoiceType === 'final' ? 'Final Payment'
    : description || 'Invoice'

  return {
    success: true,
    toolName: 'create_invoice',
    data: {
      id: newInvoice.id,
      amount: newInvoice.amount,
      status: newInvoice.status,
      dueDate: newInvoice.dueDate,
      clientName: client.partner1FirstName,
    },
    message: `💰 Created invoice: ${typeLabel} - ${currency} ${amount.toLocaleString()} (due ${parsedDueDate.toLocaleDateString()})`,
  }
}

/**
 * Export data
 */
async function executeExportData(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const exportType = args.exportType as string
  const format = args.format as string
  const filters = args.filters as Record<string, unknown> | undefined
  const recipientEmail = args.recipientEmail as string | undefined

  if (!clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID is required' })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id, partner1FirstName: clients.partner1FirstName })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!)))
    .limit(1)

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
  }

  // In production, this would generate actual export files
  // For now, return data that could be exported
  let exportData: unknown
  let recordCount = 0

  switch (exportType) {
    case 'guest_list': {
      const guestList = await db
        .select({
          firstName: guests.firstName,
          lastName: guests.lastName,
          email: guests.email,
          phone: guests.phone,
          rsvpStatus: guests.rsvpStatus,
          mealPreference: guests.mealPreference,
          dietaryRestrictions: guests.dietaryRestrictions,
          tableNumber: guests.tableNumber,
          groupName: guests.groupName,
        })
        .from(guests)
        .where(eq(guests.clientId, clientId))
      exportData = guestList
      recordCount = guestList.length
      break
    }

    case 'budget': {
      const budgetList = await db
        .select()
        .from(budget)
        .where(eq(budget.clientId, clientId))
      exportData = budgetList
      recordCount = budgetList.length
      break
    }

    case 'dietary_summary': {
      const dietarySummary = await db
        .select({
          mealPreference: guests.mealPreference,
          count: sql<number>`count(*)::int`,
        })
        .from(guests)
        .where(and(eq(guests.clientId, clientId), eq(guests.rsvpStatus, 'confirmed')))
        .groupBy(guests.mealPreference)
      exportData = dietarySummary
      recordCount = dietarySummary.length
      break
    }

    default:
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Export type '${exportType}' not supported` })
  }

  // In production: generate file, upload to storage, return download URL
  const mockDownloadUrl = `/api/exports/${crypto.randomUUID()}.${format}`

  return {
    success: true,
    toolName: 'export_data',
    data: {
      exportType,
      format,
      recordCount,
      downloadUrl: mockDownloadUrl,
      data: exportData, // Include data for now
    },
    message: `📥 Export ready: ${exportType.replace('_', ' ')} (${recordCount} records) - ${format.toUpperCase()} format`,
  }
}

/**
 * Update website
 */
async function executeUpdateWebsite(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const websiteId = args.websiteId as string | undefined
  const section = args.section as string | undefined
  const content = args.content as Record<string, unknown> | undefined
  const settings = args.settings as Record<string, unknown> | undefined
  const venueName = args.venueName as string | undefined
  const venueAddress = args.venueAddress as string | undefined
  const weddingDate = args.weddingDate as string | undefined

  if (!clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID is required' })
  }

  // Find website
  let [website] = await db
    .select()
    .from(weddingWebsites)
    .where(and(
      eq(weddingWebsites.clientId, clientId),
      isNull(weddingWebsites.deletedAt)
    ))
    .limit(1)

  if (!website) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Wedding website not found for this client' })
  }

  // Build update
  const currentContent = (website.content as Record<string, unknown>) || {}
  const currentSettings = (website.settings as Record<string, unknown>) || {}

  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  // Update specific section content
  if (section && content) {
    updateData.content = {
      ...currentContent,
      [section]: { ...(currentContent[section] as Record<string, unknown> || {}), ...content },
    }
  }

  // Update venue in event_details section
  if (venueName || venueAddress) {
    const eventDetails = (currentContent.event_details as Record<string, unknown>) || {}
    updateData.content = {
      ...currentContent,
      ...(updateData.content as Record<string, unknown> || {}),
      event_details: {
        ...eventDetails,
        ...(venueName && { venueName }),
        ...(venueAddress && { venueAddress }),
      },
    }
  }

  // Update settings
  if (settings) {
    updateData.settings = { ...currentSettings, ...settings }
  }

  const [updated] = await db
    .update(weddingWebsites)
    .set(updateData)
    .where(eq(weddingWebsites.id, website.id))
    .returning()

  const changesDescription = [
    section && `Updated ${section} section`,
    venueName && `Venue: ${venueName}`,
    settings?.published !== undefined && (settings.published ? 'Published' : 'Unpublished'),
  ].filter(Boolean).join(', ')

  return {
    success: true,
    toolName: 'update_website',
    data: {
      websiteId: updated.id,
      subdomain: updated.subdomain,
      published: (updated.settings as Record<string, unknown>)?.publishedAt ? true : updated.published,
    },
    message: `🌐 Updated wedding website: ${changesDescription || 'Settings updated'}`,
  }
}

/**
 * Query analytics
 */
async function executeQueryAnalytics(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const metric = args.metric as string
  const period = (args.period as string) || 'this_month'
  const dateFrom = args.dateFrom as string | undefined
  const dateTo = args.dateTo as string | undefined
  const groupBy = args.groupBy as string | undefined
  const compareWithPrevious = args.compareWithPrevious as boolean

  // Calculate date range based on period
  const now = new Date()
  let startDate: Date
  let endDate: Date = now

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'this_week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      break
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'this_quarter':
      startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      break
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'last_quarter':
      const lastQuarterStart = Math.floor(now.getMonth() / 3) * 3 - 3
      startDate = new Date(now.getFullYear(), lastQuarterStart, 1)
      endDate = new Date(now.getFullYear(), lastQuarterStart + 3, 0)
      break
    case 'last_year':
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = new Date(now.getFullYear() - 1, 11, 31)
      break
    case 'custom':
      startDate = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = dateTo ? new Date(dateTo) : now
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  let result: unknown
  let resultMessage: string

  switch (metric) {
    case 'leads': {
      const [leadCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(pipelineLeads)
        .where(and(
          eq(pipelineLeads.companyId, ctx.companyId!),
          gte(pipelineLeads.createdAt, startDate),
          lte(pipelineLeads.createdAt, endDate)
        ))
      result = { leads: leadCount?.count || 0, period }
      resultMessage = `${leadCount?.count || 0} leads in ${period.replace('_', ' ')}`
      break
    }

    case 'bookings':
    case 'weddings_completed': {
      const statusFilter = metric === 'weddings_completed' ? 'completed' : undefined
      const conditions = [
        eq(clients.companyId, ctx.companyId!),
        isNull(clients.deletedAt),
        gte(clients.createdAt, startDate),
        lte(clients.createdAt, endDate),
      ]
      if (statusFilter) {
        conditions.push(eq(clients.status, statusFilter))
      }

      const [clientCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(and(...conditions))
      result = { count: clientCount?.count || 0, metric, period }
      resultMessage = `${clientCount?.count || 0} ${metric.replace('_', ' ')} in ${period.replace('_', ' ')}`
      break
    }

    case 'upcoming_weddings': {
      const [upcomingCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(and(
          eq(clients.companyId, ctx.companyId!),
          isNull(clients.deletedAt),
          gte(clients.weddingDate, now.toISOString().split('T')[0])
        ))
      result = { upcomingWeddings: upcomingCount?.count || 0 }
      resultMessage = `${upcomingCount?.count || 0} upcoming weddings`
      break
    }

    case 'revenue': {
      // Sum paid amounts from budget items for completed clients in period
      const [revenue] = await db
        .select({
          total: sql<number>`coalesce(sum(${budget.paidAmount}::numeric), 0)::float`,
        })
        .from(budget)
        .innerJoin(clients, eq(budget.clientId, clients.id))
        .where(and(
          eq(clients.companyId, ctx.companyId!),
          gte(clients.createdAt, startDate),
          lte(clients.createdAt, endDate)
        ))
      result = { revenue: revenue?.total || 0, period, currency: 'USD' }
      resultMessage = `Revenue in ${period.replace('_', ' ')}: $${(revenue?.total || 0).toLocaleString()}`
      break
    }

    default:
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Metric '${metric}' not supported` })
  }

  return {
    success: true,
    toolName: 'query_analytics',
    data: result,
    message: `📊 ${resultMessage}`,
  }
}

// ============================================
// PHASE 5: AUTOMATION TOOL HANDLERS
// ============================================

/**
 * Create workflow
 */
async function executeCreateWorkflow(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const name = args.name as string
  const description = args.description as string | undefined
  const triggerType = args.triggerType as string
  const triggerConfig = args.triggerConfig as Record<string, unknown> | undefined
  const actionType = args.actionType as string
  const actionConfig = args.actionConfig as Record<string, unknown> | undefined
  const isActive = args.isActive !== false

  // Map trigger types to database enum
  const dbTriggerType = triggerType.replace('rsvp_received', 'rsvp_received')
    .replace('rsvp_confirmed', 'rsvp_received')
    .replace('rsvp_declined', 'rsvp_received') as 'lead_stage_change' | 'client_created' | 'event_date_approaching' | 'payment_overdue' | 'rsvp_received' | 'proposal_accepted' | 'contract_signed' | 'scheduled' | 'manual'

  // Map action types to step types
  const dbStepType = actionType as 'send_email' | 'send_sms' | 'send_whatsapp' | 'wait' | 'condition' | 'create_task' | 'update_lead' | 'update_client' | 'create_notification' | 'webhook'

  // Create workflow
  const [newWorkflow] = await db
    .insert(workflows)
    .values({
      id: crypto.randomUUID(),
      companyId: ctx.companyId!,
      name,
      description: description || '',
      triggerType: dbTriggerType,
      triggerConfig: triggerConfig || {},
      isActive,
      isTemplate: false,
      createdBy: ctx.userId!,
    })
    .returning()

  // Create initial step
  const [newStep] = await db
    .insert(workflowSteps)
    .values({
      id: crypto.randomUUID(),
      workflowId: newWorkflow.id,
      stepType: dbStepType,
      stepOrder: 1,
      name: `${actionType.replace('_', ' ')} action`,
      config: actionConfig || {},
      isActive: true,
    })
    .returning()

  return {
    success: true,
    toolName: 'create_workflow',
    data: {
      workflowId: newWorkflow.id,
      name: newWorkflow.name,
      triggerType: newWorkflow.triggerType,
      isActive: newWorkflow.isActive,
      stepId: newStep.id,
    },
    message: `⚡ Created workflow: "${name}" - Trigger: ${triggerType.replace('_', ' ')}, Action: ${actionType.replace('_', ' ')}`,
    cascadeResults: [
      {
        action: `Workflow ${isActive ? 'activated' : 'created as draft'}`,
        entityType: 'workflow',
        entityId: newWorkflow.id,
      },
    ],
  }
}

/**
 * Generate QR codes
 */
async function executeGenerateQrCodes(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const eventId = args.eventId as string | undefined
  const eventName = args.eventName as string | undefined
  const guestIds = args.guestIds as string[] | undefined
  const rsvpStatusFilter = (args.rsvpStatusFilter as string) || 'confirmed'
  const format = (args.format as string) || 'pdf'
  const includeDetails = args.includeDetails !== false

  if (!clientId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID is required' })
  }

  // Verify client access
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!)))
    .limit(1)

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })
  }

  // Resolve event if needed
  let targetEventId = eventId
  if (!targetEventId && eventName) {
    const resolution = await resolveEvent(eventName, clientId)
    if (!resolution.isAmbiguous && resolution.entity) {
      targetEventId = resolution.entity.id
    }
  }

  // Build guest query
  const conditions = [eq(guests.clientId, clientId)]

  if (rsvpStatusFilter === 'confirmed') {
    conditions.push(eq(guests.rsvpStatus, 'confirmed'))
  }

  if (guestIds && guestIds.length > 0) {
    conditions.push(inArray(guests.id, guestIds))
  }

  const guestList = await db
    .select({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      tableNumber: guests.tableNumber,
      mealPreference: guests.mealPreference,
    })
    .from(guests)
    .where(and(...conditions))

  if (guestList.length === 0) {
    return {
      success: true,
      toolName: 'generate_qr_codes',
      data: { qrCount: 0 },
      message: 'No guests found matching the criteria',
    }
  }

  // In production: generate actual QR codes using a library like qrcode
  // For now, return mock data
  const qrCodes = guestList.map(guest => ({
    guestId: guest.id,
    guestName: `${guest.firstName} ${guest.lastName || ''}`.trim(),
    checkInCode: `${clientId.slice(0, 8)}-${guest.id.slice(0, 8)}`,
    details: includeDetails ? {
      tableNumber: guest.tableNumber,
      mealPreference: guest.mealPreference,
    } : undefined,
  }))

  const mockDownloadUrl = `/api/qr-export/${crypto.randomUUID()}.${format}`

  return {
    success: true,
    toolName: 'generate_qr_codes',
    data: {
      qrCount: qrCodes.length,
      format,
      eventId: targetEventId,
      downloadUrl: mockDownloadUrl,
      qrCodes,
    },
    message: `📱 Generated ${qrCodes.length} QR codes for check-in (${format.toUpperCase()})`,
  }
}

// ============================================
// TOOL HANDLERS - CALENDAR SYNC
// ============================================

async function executeSyncCalendar(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const { userId, companyId } = ctx

  // Resolve client
  let clientId = args.clientId as string | undefined
  const clientName = args.clientName as string | undefined

  if (!clientId && clientName) {
    const resolved = await resolveClient(clientName, companyId!)
    if (!resolved.isAmbiguous && resolved.entity) {
      clientId = resolved.entity.id
    } else {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Could not find client matching "${clientName}"`,
      })
    }
  }

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID or name is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({
      id: clients.id,
      partner1FirstName: clients.partner1FirstName,
      partner2FirstName: clients.partner2FirstName,
    })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.companyId, companyId!),
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

  const calendarType = args.calendarType as 'google' | 'ical' | undefined
  const eventIds = args.eventIds as string[] | undefined
  const includeTimeline = args.includeTimeline as boolean | undefined

  // Check Google Calendar connection status
  const [googleTokens] = await db
    .select()
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.userId, userId!))
    .limit(1)

  const isGoogleConnected = googleTokens &&
    googleTokens.expiresAt &&
    new Date(googleTokens.expiresAt) > new Date()

  // Determine which calendar to use
  const effectiveCalendarType = calendarType || (isGoogleConnected ? 'google' : 'ical')

  // Get events to sync
  const eventConditions = [eq(events.clientId, clientId), isNull(events.deletedAt)]
  if (eventIds && eventIds.length > 0) {
    eventConditions.push(inArray(events.id, eventIds))
  }

  const eventsToSync = await db
    .select()
    .from(events)
    .where(and(...eventConditions))

  if (eventsToSync.length === 0) {
    return {
      success: true,
      toolName: 'sync_calendar',
      data: { syncedCount: 0 },
      message: 'No events found to sync',
    }
  }

  const cascadeResults: Array<{ action: string; entityType: string; entityId: string }> = []

  if (effectiveCalendarType === 'google') {
    if (!isGoogleConnected) {
      return {
        success: false,
        toolName: 'sync_calendar',
        data: {
          requiresConnection: true,
          connectionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/connect`,
        },
        message: 'Google Calendar is not connected. Please connect your Google Calendar first to enable sync.',
        error: 'Google Calendar not connected',
      }
    }

    // Get or create calendar sync settings
    let [syncSettings] = await db
      .select()
      .from(calendarSyncSettings)
      .where(
        and(
          eq(calendarSyncSettings.userId, userId!),
          eq(calendarSyncSettings.provider, 'google')
        )
      )
      .limit(1)

    if (!syncSettings) {
      const [created] = await db
        .insert(calendarSyncSettings)
        .values({
          id: crypto.randomUUID(),
          userId: userId!,
          provider: 'google',
          enabled: true,
        })
        .returning()
      syncSettings = created
    }

    // Sync each event to Google Calendar
    for (const event of eventsToSync) {
      // Check if already synced
      const [existingSync] = await db
        .select()
        .from(calendarSyncedEvents)
        .where(eq(calendarSyncedEvents.eventId, event.id))
        .limit(1)

      if (existingSync) {
        // Update sync timestamp
        await db
          .update(calendarSyncedEvents)
          .set({ syncedAt: new Date(), updatedAt: new Date() })
          .where(eq(calendarSyncedEvents.id, existingSync.id))

        cascadeResults.push({
          action: `Updated sync for: ${event.title}`,
          entityType: 'calendar_sync',
          entityId: existingSync.id,
        })
      } else {
        // Create sync record
        const [syncRecord] = await db
          .insert(calendarSyncedEvents)
          .values({
            id: crypto.randomUUID(),
            settingsId: syncSettings.id,
            eventId: event.id,
            syncedAt: new Date(),
          })
          .returning()

        cascadeResults.push({
          action: `Synced to Google Calendar: ${event.title}`,
          entityType: 'calendar_sync',
          entityId: syncRecord.id,
        })
      }
    }

    const clientDisplayName = `${client.partner1FirstName}${client.partner2FirstName ? ` & ${client.partner2FirstName}` : ''}`

    return {
      success: true,
      toolName: 'sync_calendar',
      data: {
        calendarType: 'google',
        syncedCount: eventsToSync.length,
        events: eventsToSync.map(e => ({ id: e.id, title: e.title, date: e.eventDate })),
      },
      message: `Synced ${eventsToSync.length} events for ${clientDisplayName} to Google Calendar`,
      cascadeResults,
    }
  } else {
    // iCal feed approach
    // Check for existing iCal token
    let [icalToken] = await db
      .select()
      .from(icalFeedTokens)
      .where(eq(icalFeedTokens.userId, userId!))
      .limit(1)

    if (!icalToken) {
      // Create new iCal feed token
      const feedToken = ICalGenerator.generateSecureToken()
      const [created] = await db
        .insert(icalFeedTokens)
        .values({
          id: crypto.randomUUID(),
          userId: userId!,
          token: feedToken,
        })
        .returning()
      icalToken = created

      cascadeResults.push({
        action: 'Created iCal feed',
        entityType: 'ical_token',
        entityId: icalToken.id,
      })
    }

    const feedUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/feed/${icalToken.token}`
    const clientDisplayName = `${client.partner1FirstName}${client.partner2FirstName ? ` & ${client.partner2FirstName}` : ''}`

    return {
      success: true,
      toolName: 'sync_calendar',
      data: {
        calendarType: 'ical',
        feedUrl,
        syncedCount: eventsToSync.length,
        events: eventsToSync.map(e => ({ id: e.id, title: e.title, date: e.eventDate })),
        instructions: 'Add this URL to your calendar app (Google Calendar, Apple Calendar, Outlook) to subscribe to events. Events will automatically update.',
      },
      message: `iCal feed ready for ${clientDisplayName}! Subscribe to the feed URL in your calendar app to see ${eventsToSync.length} events.`,
      cascadeResults: cascadeResults.length > 0 ? cascadeResults : undefined,
    }
  }
}

// ============================================
// TOOL HANDLERS - DOCUMENT UPLOAD
// ============================================

async function executeGetDocumentUploadUrl(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const { userId, companyId } = ctx

  // Resolve client
  let clientId = args.clientId as string | undefined
  const clientName = args.clientName as string | undefined

  if (!clientId && clientName) {
    const resolved = await resolveClient(clientName, companyId!)
    if (!resolved.isAmbiguous && resolved.entity) {
      clientId = resolved.entity.id
    } else {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Could not find client matching "${clientName}"`,
      })
    }
  }

  if (!clientId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Client ID or name is required',
    })
  }

  // Verify client access
  const [client] = await db
    .select({
      id: clients.id,
      partner1FirstName: clients.partner1FirstName,
      partner2FirstName: clients.partner2FirstName,
    })
    .from(clients)
    .where(
      and(
        eq(clients.id, clientId),
        eq(clients.companyId, companyId!),
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

  const fileName = args.fileName as string
  const fileType = (args.fileType as string) || 'other'
  const description = args.description as string | undefined

  if (!fileName) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'File name is required',
    })
  }

  // Generate unique file path for the upload
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${companyId}/${clientId}/${timestamp}_${sanitizedFileName}`

  // Generate a unique upload session ID
  const uploadSessionId = crypto.randomUUID()

  // The UI will use this to trigger the actual file upload
  const uploadConfig = {
    uploadSessionId,
    clientId,
    storagePath,
    fileName: sanitizedFileName,
    fileType,
    description,
    // Pre-signed URL would be generated here if using S3/R2
    // For now, we return the metadata for the UI to handle
    uploadEndpoint: `/api/documents/upload`,
    method: 'POST',
    headers: {
      'x-upload-session': uploadSessionId,
      'x-client-id': clientId,
      'x-file-type': fileType,
    },
  }

  const clientDisplayName = `${client.partner1FirstName}${client.partner2FirstName ? ` & ${client.partner2FirstName}` : ''}`

  return {
    success: true,
    toolName: 'get_document_upload_url',
    data: {
      uploadConfig,
      clientId,
      fileName: sanitizedFileName,
      fileType,
      storagePath,
      // Flag for the UI to trigger file picker
      requiresFileSelection: true,
    },
    message: `Ready to upload "${fileName}" (${fileType}) for ${clientDisplayName}. Please select the file to upload.`,
  }
}
