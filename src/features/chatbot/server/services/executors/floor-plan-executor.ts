/**
 * Floor Plan Executor Service
 *
 * April 2026 - Chatbot tool executors for floor plan and seating management
 *
 * Handles:
 * - Floor plan creation
 * - Table management (add/remove)
 * - Guest-to-table assignment (single and batch)
 *
 * All mutations verify company ownership for tenant isolation.
 */

import { db, eq, and, sql, count } from '@/lib/db'
import { TRPCError } from '@trpc/server'
import {
  clients,
  guests,
  floorPlans,
  floorPlanTables,
  floorPlanGuests,
} from '@/lib/db/schema'
import { withTransaction } from '../transaction-wrapper'
import { resolveGuest, resolveEvent } from '../entity-resolver'
import type { ToolExecutionResult } from '../tool-executor'
import type { Context } from '@/server/trpc/context'

// ============================================
// HELPERS
// ============================================

/**
 * Verify that a floor plan belongs to the given company.
 * Returns the floor plan record or throws NOT_FOUND.
 */
async function verifyFloorPlanOwnership(
  floorPlanId: string,
  companyId: string
): Promise<{ id: string; clientId: string; name: string }> {
  const [fp] = await db
    .select({
      id: floorPlans.id,
      clientId: floorPlans.clientId,
      name: floorPlans.name,
    })
    .from(floorPlans)
    .innerJoin(clients, eq(floorPlans.clientId, clients.id))
    .where(
      and(
        eq(floorPlans.id, floorPlanId),
        eq(clients.companyId, companyId)
      )
    )
    .limit(1)

  if (!fp) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Floor plan not found or access denied',
    })
  }

  return fp
}

/**
 * Calculate grid position for a new table based on existing table count.
 * Returns { x, y } coordinates on a grid layout.
 */
function calculateTablePosition(existingCount: number): { x: number; y: number } {
  const COLS = 4
  const SPACING_X = 180
  const SPACING_Y = 180
  const OFFSET_X = 100
  const OFFSET_Y = 100

  const col = existingCount % COLS
  const row = Math.floor(existingCount / COLS)

  return {
    x: OFFSET_X + col * SPACING_X,
    y: OFFSET_Y + row * SPACING_Y,
  }
}

// ============================================
// EXECUTORS
// ============================================

/**
 * Create a new floor plan for a client.
 *
 * Requires: clientId, name
 * Optional: eventId, eventName, width, height
 */
export async function executeCreateFloorPlan(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const clientId = args.clientId as string
  const name = args.name as string

  if (!clientId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Client ID is required' })
  if (!name) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Floor plan name is required' })

  // Verify client belongs to company
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.companyId, ctx.companyId!)))
    .limit(1)

  if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' })

  // Resolve eventId from eventName if provided
  let eventId = args.eventId as string | undefined
  const eventName = args.eventName as string | undefined

  if (!eventId && eventName) {
    const eventResult = await resolveEvent(eventName, clientId, ctx.companyId!)
    if (!eventResult.isAmbiguous) {
      eventId = eventResult.entity.id
    } else {
      // If ambiguous, include options in warning but proceed without eventId
      return {
        success: false,
        toolName: 'create_floor_plan',
        data: null,
        message: eventResult.message,
        warning: eventResult.options.length > 0
          ? `Options: ${eventResult.options.map(o => `${o.displayName} (${o.id})`).join(', ')}`
          : undefined,
      }
    }
  }

  const width = (args.width as number) || 800
  const height = (args.height as number) || 600

  const [inserted] = await db
    .insert(floorPlans)
    .values({
      id: crypto.randomUUID(),
      clientId,
      companyId: ctx.companyId!,
      eventId: eventId || null,
      name,
      width,
      height,
    })
    .returning()

  return {
    success: true,
    toolName: 'create_floor_plan',
    data: { id: inserted.id, clientId, name, width, height, eventId: eventId || null },
    message: `Created floor plan "${name}" (${width}x${height}).`,
  }
}

/**
 * Add a table to an existing floor plan.
 *
 * Requires: floorPlanId, tableNumber
 * Optional: tableName, tableShape, capacity, isVip
 */
export async function executeAddTable(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const floorPlanId = args.floorPlanId as string
  const tableNumber = args.tableNumber as number

  if (!floorPlanId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Floor plan ID is required' })
  if (tableNumber === undefined || tableNumber === null) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Table number is required' })
  }

  // Verify ownership
  const fp = await verifyFloorPlanOwnership(floorPlanId, ctx.companyId!)

  // Count existing tables for auto-positioning
  const [tableCount] = await db
    .select({ count: count() })
    .from(floorPlanTables)
    .where(eq(floorPlanTables.floorPlanId, floorPlanId))

  const existingCount = Number(tableCount?.count || 0)
  const { x, y } = calculateTablePosition(existingCount)

  const tableName = (args.tableName as string) || null
  const tableShape = (args.tableShape as string) || 'round'
  const capacity = (args.capacity as number) || 10
  const isVip = (args.isVip as boolean) || false

  const displayName = tableName || `Table ${tableNumber}`

  const [inserted] = await db
    .insert(floorPlanTables)
    .values({
      id: crypto.randomUUID(),
      floorPlanId,
      name: displayName,
      tableNumber,
      tableName,
      shape: tableShape,
      capacity,
      x,
      y,
      metadata: { isVip },
    })
    .returning()

  return {
    success: true,
    toolName: 'add_table',
    data: { id: inserted.id, floorPlanId, tableNumber, name: displayName, capacity, x, y },
    message: `Added "${displayName}" (capacity ${capacity}, ${tableShape}) to floor plan "${fp.name}".`,
  }
}

/**
 * Remove a table from a floor plan, cascade-deleting its guest assignments.
 *
 * Requires: floorPlanId, tableId
 * MUST use withTransaction (multi-table delete).
 */
export async function executeRemoveTable(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const floorPlanId = args.floorPlanId as string
  const tableId = args.tableId as string

  if (!floorPlanId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Floor plan ID is required' })
  if (!tableId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Table ID is required' })

  // Verify ownership
  const fp = await verifyFloorPlanOwnership(floorPlanId, ctx.companyId!)

  // Verify table belongs to this floor plan
  const [table] = await db
    .select({ id: floorPlanTables.id, name: floorPlanTables.name, tableNumber: floorPlanTables.tableNumber })
    .from(floorPlanTables)
    .where(and(eq(floorPlanTables.id, tableId), eq(floorPlanTables.floorPlanId, floorPlanId)))
    .limit(1)

  if (!table) throw new TRPCError({ code: 'NOT_FOUND', message: 'Table not found in this floor plan' })

  // Count guests that will be unassigned
  const [guestCount] = await db
    .select({ count: count() })
    .from(floorPlanGuests)
    .where(eq(floorPlanGuests.tableId, tableId))

  const removedGuestCount = Number(guestCount?.count || 0)

  // Transaction: delete guest assignments first, then the table
  await withTransaction(async (tx) => {
    await tx.delete(floorPlanGuests).where(eq(floorPlanGuests.tableId, tableId))
    await tx.delete(floorPlanTables).where(eq(floorPlanTables.id, tableId))
  })

  const displayName = table.name || `Table ${table.tableNumber}`

  return {
    success: true,
    toolName: 'remove_table',
    data: { removedTableId: tableId, removedGuestAssignments: removedGuestCount },
    message: `Removed "${displayName}" from floor plan "${fp.name}".${removedGuestCount > 0 ? ` ${removedGuestCount} guest assignment(s) were also removed.` : ''}`,
    cascadeResults: removedGuestCount > 0
      ? [{ action: `Removed ${removedGuestCount} guest assignment(s)`, entityType: 'floorPlanGuest', entityId: tableId }]
      : undefined,
  }
}

/**
 * Assign a single guest to a table on a floor plan.
 *
 * Requires: floorPlanId
 * Optional: tableId, tableNumber (resolve to tableId), guestId, guestName (resolve to guestId), seatNumber
 */
export async function executeAssignGuestToTable(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const floorPlanId = args.floorPlanId as string

  if (!floorPlanId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Floor plan ID is required' })

  // Verify ownership
  const fp = await verifyFloorPlanOwnership(floorPlanId, ctx.companyId!)

  // Resolve tableId from tableNumber if needed
  let tableId = args.tableId as string | undefined
  const tableNumber = args.tableNumber as number | undefined

  if (!tableId && tableNumber !== undefined) {
    const [foundTable] = await db
      .select({ id: floorPlanTables.id })
      .from(floorPlanTables)
      .where(and(eq(floorPlanTables.floorPlanId, floorPlanId), eq(floorPlanTables.tableNumber, tableNumber)))
      .limit(1)

    if (!foundTable) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Table number ${tableNumber} not found in this floor plan` })
    }
    tableId = foundTable.id
  }

  if (!tableId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either tableId or tableNumber is required' })

  // Resolve guestId from guestName if needed
  let guestId = args.guestId as string | undefined
  const guestName = args.guestName as string | undefined

  if (!guestId && guestName) {
    const guestResult = await resolveGuest(guestName, fp.clientId, ctx.companyId!)
    if (!guestResult.isAmbiguous) {
      guestId = guestResult.entity.id
    } else {
      return {
        success: false,
        toolName: 'assign_guest_to_table',
        data: null,
        message: guestResult.message,
        warning: guestResult.options.length > 0
          ? `Options: ${guestResult.options.map(o => `${o.displayName} (${o.id})`).join(', ')}`
          : undefined,
      }
    }
  }

  if (!guestId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Either guestId or guestName is required' })

  // Verify table belongs to floor plan and check capacity
  const [table] = await db
    .select({
      id: floorPlanTables.id,
      name: floorPlanTables.name,
      tableNumber: floorPlanTables.tableNumber,
      capacity: floorPlanTables.capacity,
      metadata: floorPlanTables.metadata,
    })
    .from(floorPlanTables)
    .where(and(eq(floorPlanTables.id, tableId), eq(floorPlanTables.floorPlanId, floorPlanId)))
    .limit(1)

  if (!table) throw new TRPCError({ code: 'NOT_FOUND', message: 'Table not found in this floor plan' })

  // Check capacity
  const [assignmentCount] = await db
    .select({ count: count() })
    .from(floorPlanGuests)
    .where(eq(floorPlanGuests.tableId, tableId))

  const currentCount = Number(assignmentCount?.count || 0)
  const tableMetadata = (table.metadata as { maxCapacity?: number }) || {}
  const maxCapacity = tableMetadata.maxCapacity || table.capacity || 8

  if (currentCount >= maxCapacity) {
    return {
      success: false,
      toolName: 'assign_guest_to_table',
      data: null,
      message: `Table "${table.name || `Table ${table.tableNumber}`}" is at full capacity (${currentCount}/${maxCapacity}). Remove a guest or increase capacity first.`,
    }
  }

  const seatNumber = (args.seatNumber as number) || null

  const [inserted] = await db
    .insert(floorPlanGuests)
    .values({
      id: crypto.randomUUID(),
      floorPlanId,
      tableId,
      guestId,
      seatNumber,
    })
    .returning()

  // Get guest name for message
  const [guest] = await db
    .select({ firstName: guests.firstName, lastName: guests.lastName })
    .from(guests)
    .where(eq(guests.id, guestId))
    .limit(1)

  const guestDisplayName = guest ? `${guest.firstName} ${guest.lastName || ''}`.trim() : guestId
  const tableDisplayName = table.name || `Table ${table.tableNumber}`

  return {
    success: true,
    toolName: 'assign_guest_to_table',
    data: { id: inserted.id, floorPlanId, tableId, guestId, seatNumber },
    message: `Assigned "${guestDisplayName}" to "${tableDisplayName}" (${currentCount + 1}/${maxCapacity}).`,
  }
}

/**
 * Batch assign multiple guests to tables on a floor plan.
 *
 * Requires: floorPlanId, assignments array
 * MUST use withTransaction (batch operation).
 */
export async function executeBatchAssignGuests(
  args: Record<string, unknown>,
  ctx: Context
): Promise<ToolExecutionResult> {
  const floorPlanId = args.floorPlanId as string
  const assignments = args.assignments as Array<{
    guestId?: string
    guestName?: string
    tableId?: string
    tableNumber?: number
  }>

  if (!floorPlanId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Floor plan ID is required' })
  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Assignments array is required and must not be empty' })
  }

  // Verify ownership
  const fp = await verifyFloorPlanOwnership(floorPlanId, ctx.companyId!)

  // Pre-resolve all tables for this floor plan (cache for lookups)
  const allTables = await db
    .select({
      id: floorPlanTables.id,
      tableNumber: floorPlanTables.tableNumber,
      name: floorPlanTables.name,
      capacity: floorPlanTables.capacity,
      metadata: floorPlanTables.metadata,
    })
    .from(floorPlanTables)
    .where(eq(floorPlanTables.floorPlanId, floorPlanId))

  const tableByNumber = new Map(allTables.map(t => [t.tableNumber, t]))
  const tableById = new Map(allTables.map(t => [t.id, t]))

  // Pre-count existing assignments per table
  const existingCounts = new Map<string, number>()
  for (const table of allTables) {
    const [result] = await db
      .select({ count: count() })
      .from(floorPlanGuests)
      .where(eq(floorPlanGuests.tableId, table.id))
    existingCounts.set(table.id, Number(result?.count || 0))
  }

  // Resolve all assignments
  const resolvedAssignments: Array<{ guestId: string; tableId: string; guestName: string; tableName: string }> = []
  const errors: string[] = []

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i]

    // Resolve tableId
    let tableId = a.tableId
    if (!tableId && a.tableNumber !== undefined) {
      const found = tableByNumber.get(a.tableNumber)
      if (!found) {
        errors.push(`Assignment ${i + 1}: Table number ${a.tableNumber} not found`)
        continue
      }
      tableId = found.id
    }
    if (!tableId) {
      errors.push(`Assignment ${i + 1}: Either tableId or tableNumber is required`)
      continue
    }

    const table = tableById.get(tableId)
    if (!table) {
      errors.push(`Assignment ${i + 1}: Table not found in this floor plan`)
      continue
    }

    // Resolve guestId
    let guestId = a.guestId
    let guestDisplayName = a.guestName || guestId || 'Unknown'

    if (!guestId && a.guestName) {
      const guestResult = await resolveGuest(a.guestName, fp.clientId, ctx.companyId!)
      if (!guestResult.isAmbiguous) {
        guestId = guestResult.entity.id
        guestDisplayName = guestResult.entity.displayName
      } else {
        errors.push(`Assignment ${i + 1}: ${guestResult.message}`)
        continue
      }
    }

    if (!guestId) {
      errors.push(`Assignment ${i + 1}: Either guestId or guestName is required`)
      continue
    }

    // Check capacity (accounting for other assignments in this batch)
    const tableMetadata = (table.metadata as { maxCapacity?: number }) || {}
    const maxCapacity = tableMetadata.maxCapacity || table.capacity || 8
    const currentCount = existingCounts.get(tableId) || 0

    if (currentCount >= maxCapacity) {
      errors.push(`Assignment ${i + 1}: Table "${table.name || `Table ${table.tableNumber}`}" is full (${currentCount}/${maxCapacity})`)
      continue
    }

    // Increment count for subsequent checks in this batch
    existingCounts.set(tableId, currentCount + 1)

    resolvedAssignments.push({
      guestId,
      tableId,
      guestName: guestDisplayName,
      tableName: table.name || `Table ${table.tableNumber}`,
    })
  }

  if (resolvedAssignments.length === 0) {
    return {
      success: false,
      toolName: 'batch_assign_guests',
      data: { errors },
      message: `No guests could be assigned. ${errors.length} error(s): ${errors.join('; ')}`,
    }
  }

  // Insert all valid assignments in a transaction
  await withTransaction(async (tx) => {
    for (const a of resolvedAssignments) {
      await tx.insert(floorPlanGuests).values({
        id: crypto.randomUUID(),
        floorPlanId,
        tableId: a.tableId,
        guestId: a.guestId,
      })
    }
  })

  const successCount = resolvedAssignments.length
  const errorCount = errors.length

  let message = `Successfully assigned ${successCount} guest(s) to tables on floor plan "${fp.name}".`
  if (errorCount > 0) {
    message += ` ${errorCount} assignment(s) failed: ${errors.join('; ')}`
  }

  return {
    success: true,
    toolName: 'batch_assign_guests',
    data: {
      assigned: resolvedAssignments.map(a => ({ guestId: a.guestId, tableId: a.tableId, guestName: a.guestName, tableName: a.tableName })),
      successCount,
      errorCount,
      errors: errorCount > 0 ? errors : undefined,
    },
    message,
    warning: errorCount > 0 ? `${errorCount} assignment(s) could not be completed` : undefined,
  }
}
