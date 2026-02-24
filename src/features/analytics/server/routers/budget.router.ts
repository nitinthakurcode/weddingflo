import { router, adminProcedure, protectedProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc, inArray } from 'drizzle-orm'
import { budget, advancePayments, clients, events, clientUsers, user, clientVendors, vendors, timeline } from '@/lib/db/schema'
import { nanoid } from 'nanoid'
import { broadcastSync } from '@/lib/realtime/broadcast-sync'
import { recalcClientStats } from '@/lib/sync/client-stats-sync'

/**
 * Budget tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding budget management with multi-tenant security.
 * Migrated from Supabase to Drizzle - December 2025
 */
export const budgetRouter = router({
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

      // Fetch budget items
      const budgetItems = await ctx.db
        .select()
        .from(budget)
        .where(eq(budget.clientId, input.clientId))
        .orderBy(asc(budget.category))

      // Get event info for budget items with eventId
      const eventIds = budgetItems.map(item => item.eventId).filter(Boolean) as string[]
      let eventsMap: Record<string, { id: string; title: string }> = {}

      if (eventIds.length > 0) {
        const eventList = await ctx.db
          .select({ id: events.id, title: events.title })
          .from(events)
          .where(inArray(events.id, eventIds))

        eventsMap = eventList.reduce((acc, e) => {
          acc[e.id] = e
          return acc
        }, {} as Record<string, { id: string; title: string }>)
      }

      // Fetch advance payments for all budget items
      const budgetIds = budgetItems.map(item => item.id)
      let advancePaymentsList: typeof advancePayments.$inferSelect[] = []

      if (budgetIds.length > 0) {
        advancePaymentsList = await ctx.db
          .select()
          .from(advancePayments)
          .where(inArray(advancePayments.budgetItemId, budgetIds))
          .orderBy(asc(advancePayments.paymentDate))
      }

      // Attach events and advances to each budget item
      const itemsWithAdvances = budgetItems.map(item => {
        const itemAdvances = advancePaymentsList.filter(a => a.budgetItemId === item.id)
        const totalAdvance = itemAdvances.reduce((sum, a) => sum + Number(a.amount), 0)
        const balance = Number(item.estimatedCost || 0) - totalAdvance

        return {
          ...item,
          events: item.eventId && eventsMap[item.eventId] ? eventsMap[item.eventId] : null,
          advancePayments: itemAdvances,
          totalAdvance,
          balanceRemaining: balance
        }
      })

      return itemsWithAdvances
    }),

  /**
   * SECURITY: Verifies budget item belongs to a client owned by the user's company
   */
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Join with clients to verify company ownership
      const [result] = await ctx.db
        .select({ budgetItem: budget })
        .from(budget)
        .innerJoin(clients, eq(budget.clientId, clients.id))
        .where(
          and(
            eq(budget.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const budgetItem = result.budgetItem

      // Get event info if eventId exists
      let eventInfo = null
      if (budgetItem.eventId) {
        const [event] = await ctx.db
          .select({ id: events.id, title: events.title })
          .from(events)
          .where(eq(events.id, budgetItem.eventId))
          .limit(1)
        eventInfo = event || null
      }

      // Fetch advance payments
      const advances = await ctx.db
        .select()
        .from(advancePayments)
        .where(eq(advancePayments.budgetItemId, input.id))
        .orderBy(asc(advancePayments.paymentDate))

      const totalAdvance = advances.reduce((sum, a) => sum + Number(a.amount), 0)
      const balance = Number(budgetItem.estimatedCost || 0) - totalAdvance

      return {
        ...budgetItem,
        events: eventInfo,
        advancePayments: advances,
        totalAdvance,
        balanceRemaining: balance
      }
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      category: z.string().min(1),
      segment: z.enum(['vendors', 'travel', 'creatives', 'artists', 'accommodation', 'other']).default('vendors'),
      itemName: z.string().min(1),
      expenseDetails: z.string().optional(),
      estimatedCost: z.number().min(0),
      actualCost: z.number().optional(),
      eventId: z.string().uuid().optional(),
      vendorId: z.string().uuid().optional(),
      transactionDate: z.string().optional(),
      paymentStatus: z.enum(['pending', 'paid', 'overdue']).default('pending'),
      paymentDate: z.string().optional(),
      notes: z.string().optional(),
      clientVisible: z.boolean().default(true),
      isLumpSum: z.boolean().default(false),
      // Per-guest cost tracking for RSVP→Budget sync
      perGuestCost: z.number().optional(), // Cost per guest (e.g., catering per plate)
      isPerGuestItem: z.boolean().default(false), // If true, auto-calculate estimatedCost from confirmed guests
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

      // Create budget item + timeline entry atomically
      const budgetItem = await ctx.db.transaction(async (tx) => {
        const [newItem] = await tx
          .insert(budget)
          .values({
            id: nanoid(),
            clientId: input.clientId,
            category: input.category,
            segment: input.segment,
            item: input.itemName,
            expenseDetails: input.expenseDetails || null,
            estimatedCost: input.estimatedCost.toString(),
            actualCost: input.actualCost?.toString() || null,
            eventId: input.eventId || null,
            vendorId: input.vendorId || null,
            transactionDate: input.transactionDate || null,
            paymentStatus: input.paymentStatus,
            paymentDate: input.paymentDate ? new Date(input.paymentDate) : null,
            notes: input.notes || null,
            clientVisible: input.clientVisible,
            isLumpSum: input.isLumpSum,
            // Per-guest cost tracking
            perGuestCost: input.perGuestCost?.toString() || null,
            isPerGuestItem: input.isPerGuestItem,
          })
          .returning()

        if (!newItem) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create budget item'
          })
        }

        // TIMELINE SYNC: Create timeline entry for payment due date
        if (input.paymentDate) {
          const paymentDateTime = new Date(input.paymentDate)
          paymentDateTime.setHours(17, 0, 0, 0)

          await tx.insert(timeline).values({
            id: nanoid(),
            clientId: input.clientId,
            title: `Payment Due: ${input.itemName}`,
            description: `${input.category} - ₹${input.estimatedCost.toLocaleString()}`,
            startTime: paymentDateTime,
            notes: input.notes || null,
            sourceModule: 'budget',
            sourceId: newItem.id,
            metadata: JSON.stringify({
              vendorId: input.vendorId,
              type: 'payment-due',
              amount: input.estimatedCost,
            }),
          })
          console.log(`[Timeline] Created payment due entry: ${input.itemName}`)
        }

        // Recalculate client cached budget total
        await recalcClientStats(tx, input.clientId)

        return newItem
      })

      // Broadcast real-time sync (outside transaction)
      await broadcastSync({
        type: 'insert',
        module: 'budget',
        entityId: budgetItem.id,
        companyId: ctx.companyId!,
        clientId: input.clientId,
        userId: ctx.userId!,
        queryPaths: ['budget.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll'],
      })

      return budgetItem
    }),

  /**
   * SECURITY: Verifies budget item belongs to a client owned by the user's company
   */
  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        category: z.string().optional(),
        segment: z.enum(['vendors', 'travel', 'creatives', 'artists', 'accommodation', 'other']).optional(),
        itemName: z.string().optional(),
        expenseDetails: z.string().optional(),
        estimatedCost: z.number().optional(),
        actualCost: z.number().optional(),
        eventId: z.string().uuid().nullable().optional(),
        vendorId: z.string().uuid().nullable().optional(),
        transactionDate: z.string().nullable().optional(),
        paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
        paymentDate: z.string().nullable().optional(),
        notes: z.string().optional(),
        clientVisible: z.boolean().optional(),
        isLumpSum: z.boolean().optional(),
        // Per-guest cost tracking
        perGuestCost: z.number().nullable().optional(),
        isPerGuestItem: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify budget item belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: budget.id, clientId: budget.clientId })
        .from(budget)
        .innerJoin(clients, eq(budget.clientId, clients.id))
        .where(
          and(
            eq(budget.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget item not found' })
      }

      // Build update object
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (input.data.category !== undefined) updateData.category = input.data.category
      if (input.data.segment !== undefined) updateData.segment = input.data.segment
      if (input.data.itemName !== undefined) updateData.item = input.data.itemName
      if (input.data.expenseDetails !== undefined) updateData.expenseDetails = input.data.expenseDetails
      if (input.data.estimatedCost !== undefined) updateData.estimatedCost = input.data.estimatedCost.toString()
      if (input.data.actualCost !== undefined) updateData.actualCost = input.data.actualCost?.toString() || null
      if (input.data.eventId !== undefined) updateData.eventId = input.data.eventId
      if (input.data.vendorId !== undefined) updateData.vendorId = input.data.vendorId
      if (input.data.transactionDate !== undefined) updateData.transactionDate = input.data.transactionDate
      if (input.data.paymentStatus !== undefined) updateData.paymentStatus = input.data.paymentStatus
      if (input.data.paymentDate !== undefined) updateData.paymentDate = input.data.paymentDate ? new Date(input.data.paymentDate) : null
      if (input.data.notes !== undefined) updateData.notes = input.data.notes
      if (input.data.clientVisible !== undefined) updateData.clientVisible = input.data.clientVisible
      if (input.data.isLumpSum !== undefined) updateData.isLumpSum = input.data.isLumpSum
      // Per-guest cost tracking
      if (input.data.perGuestCost !== undefined) updateData.perGuestCost = input.data.perGuestCost?.toString() || null
      if (input.data.isPerGuestItem !== undefined) updateData.isPerGuestItem = input.data.isPerGuestItem

      // Update budget + vendor sync + timeline atomically
      const budgetItem = await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(budget)
          .set(updateData)
          .where(eq(budget.id, input.id))
          .returning()

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Budget item not found'
          })
        }

        // BIDIRECTIONAL SYNC: If this budget item is linked to a vendor, sync changes back
        if (updated.vendorId) {
          const syncData: Record<string, any> = {
            updatedAt: new Date(),
          }

          if (input.data.estimatedCost !== undefined) {
            syncData.contractAmount = input.data.estimatedCost.toString()
          }
          if (input.data.paymentStatus !== undefined) {
            syncData.paymentStatus = input.data.paymentStatus
            if (input.data.paymentStatus === 'paid') {
              syncData.depositPaid = true
            }
          }
          if (input.data.eventId !== undefined) {
            syncData.eventId = input.data.eventId
          }

          if (Object.keys(syncData).length > 1) {
            await tx
              .update(clientVendors)
              .set(syncData)
              .where(eq(clientVendors.vendorId, updated.vendorId))

            console.log(`[Budget] Synced budget changes to vendor ${updated.vendorId}:`, syncData)
          }
        }

        // TIMELINE SYNC: Update linked timeline entry
        const hasPaymentDate = input.data.paymentDate !== undefined ? input.data.paymentDate : updated.paymentDate

        if (hasPaymentDate) {
          const itemName = input.data.itemName || updated.item
          const category = input.data.category || updated.category
          const estimatedCost = input.data.estimatedCost !== undefined ? input.data.estimatedCost : Number(updated.estimatedCost)
          const notes = input.data.notes !== undefined ? input.data.notes : updated.notes

          const paymentDateTime = new Date(hasPaymentDate as string)
          paymentDateTime.setHours(17, 0, 0, 0)

          const timelineData = {
            title: `Payment Due: ${itemName}`,
            description: `${category} - ₹${estimatedCost.toLocaleString()}`,
            startTime: paymentDateTime,
            notes: notes || null,
            updatedAt: new Date(),
          }

          const result = await tx
            .update(timeline)
            .set(timelineData)
            .where(
              and(
                eq(timeline.sourceModule, 'budget'),
                eq(timeline.sourceId, input.id)
              )
            )
            .returning({ id: timeline.id })

          if (result.length === 0) {
            await tx.insert(timeline).values({
              id: nanoid(),
              clientId: updated.clientId,
              ...timelineData,
              sourceModule: 'budget',
              sourceId: updated.id,
              metadata: JSON.stringify({
                vendorId: updated.vendorId,
                type: 'payment-due',
                amount: estimatedCost,
              }),
            })
            console.log(`[Timeline] Created payment due entry: ${itemName}`)
          } else {
            console.log(`[Timeline] Updated payment due entry: ${itemName}`)
          }
        } else {
          await tx
            .delete(timeline)
            .where(
              and(
                eq(timeline.sourceModule, 'budget'),
                eq(timeline.sourceId, input.id)
              )
            )
          console.log(`[Timeline] Deleted payment due entry (date cleared)`)
        }

        // Recalculate client cached budget total
        await recalcClientStats(tx, updated.clientId)

        return updated
      })

      // Broadcast real-time sync (outside transaction)
      await broadcastSync({
        type: 'update',
        module: 'budget',
        entityId: budgetItem.id,
        companyId: ctx.companyId!,
        clientId: budgetItem.clientId,
        userId: ctx.userId!,
        queryPaths: ['budget.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll'],
      })

      return budgetItem
    }),

  /**
   * SECURITY: Verifies budget item belongs to a client owned by the user's company
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify budget item belongs to a client owned by this company
      const [existing] = await ctx.db
        .select({ id: budget.id, clientId: budget.clientId })
        .from(budget)
        .innerJoin(clients, eq(budget.clientId, clients.id))
        .where(
          and(
            eq(budget.id, input.id),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget item not found' })
      }

      // Delete budget item + linked timeline atomically
      await ctx.db.transaction(async (tx) => {
        await tx
          .delete(timeline)
          .where(
            and(
              eq(timeline.sourceModule, 'budget'),
              eq(timeline.sourceId, input.id)
            )
          )

        await tx
          .delete(budget)
          .where(eq(budget.id, input.id))

        // Recalculate client cached budget total
        await recalcClientStats(tx, existing.clientId)

        console.log(`[Timeline] Deleted payment due entry`)
      })

      // Broadcast real-time sync (outside transaction)
      await broadcastSync({
        type: 'delete',
        module: 'budget',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: existing.clientId,
        userId: ctx.userId!,
        queryPaths: ['budget.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll'],
      })

      return { success: true }
    }),

  // Advance Payment Operations
  /**
   * SECURITY: Verifies budget item belongs to a client owned by the user's company
   */
  addAdvancePayment: adminProcedure
    .input(z.object({
      budgetItemId: z.string().uuid(),
      amount: z.number().min(0),
      paymentDate: z.string(),
      paymentMode: z.enum(['Cash', 'Bank Transfer', 'UPI', 'Check', 'Credit Card', 'Other']).optional(),
      paidBy: z.string().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify budget item belongs to a client owned by this company
      const [budgetItem] = await ctx.db
        .select({ id: budget.id, clientId: budget.clientId })
        .from(budget)
        .innerJoin(clients, eq(budget.clientId, clients.id))
        .where(
          and(
            eq(budget.id, input.budgetItemId),
            eq(clients.companyId, ctx.companyId),
            isNull(clients.deletedAt)
          )
        )
        .limit(1)

      if (!budgetItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget item not found' })
      }

      // Create advance payment + update budget + sync vendor atomically
      const advance = await ctx.db.transaction(async (tx) => {
        const [newAdvance] = await tx
          .insert(advancePayments)
          .values({
            id: nanoid(),
            budgetItemId: input.budgetItemId,
            amount: input.amount.toString(),
            paymentDate: input.paymentDate,
            paymentMode: input.paymentMode || null,
            paidBy: input.paidBy,
            notes: input.notes || null,
          })
          .returning()

        if (!newAdvance) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create advance payment'
          })
        }

        // Update budget's paidAmount to reflect total advances
        const allAdvances = await tx
          .select({ amount: advancePayments.amount })
          .from(advancePayments)
          .where(eq(advancePayments.budgetItemId, input.budgetItemId))

        const totalPaid = allAdvances.reduce((sum, a) => sum + Number(a.amount), 0)

        const [updatedBudget] = await tx
          .update(budget)
          .set({
            paidAmount: totalPaid.toString(),
            updatedAt: new Date(),
          })
          .where(eq(budget.id, input.budgetItemId))
          .returning()

        // BIDIRECTIONAL SYNC: Update vendor's deposit amount if budget is linked to a vendor
        if (updatedBudget?.vendorId) {
          await tx
            .update(clientVendors)
            .set({
              depositAmount: totalPaid.toString(),
              depositPaid: totalPaid > 0,
              updatedAt: new Date(),
            })
            .where(eq(clientVendors.vendorId, updatedBudget.vendorId))

          console.log(`[Budget] Synced advance payment to vendor ${updatedBudget.vendorId}: total paid = ${totalPaid}`)
        }

        // Recalculate client cached budget total
        await recalcClientStats(tx, budgetItem.clientId)

        return newAdvance
      })

      await broadcastSync({
        type: 'insert',
        module: 'budget',
        entityId: advance.id,
        companyId: ctx.companyId!,
        clientId: budgetItem.clientId,
        userId: ctx.userId!,
        queryPaths: ['budget.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll'],
      })

      return advance
    }),

  updateAdvancePayment: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        amount: z.number().min(0).optional(),
        paymentDate: z.string().optional(),
        paymentMode: z.enum(['Cash', 'Bank Transfer', 'UPI', 'Check', 'Credit Card', 'Other']).optional(),
        paidBy: z.string().optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (input.data.amount !== undefined) updateData.amount = input.data.amount.toString()
      if (input.data.paymentDate !== undefined) updateData.paymentDate = input.data.paymentDate
      if (input.data.paymentMode !== undefined) updateData.paymentMode = input.data.paymentMode
      if (input.data.paidBy !== undefined) updateData.paidBy = input.data.paidBy
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update advance + recalc budget + sync vendor atomically
      const result = await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(advancePayments)
          .set(updateData)
          .where(eq(advancePayments.id, input.id))
          .returning()

        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Advance payment not found'
          })
        }

        let txClientId: string | undefined

        // Update budget's paidAmount to reflect total advances if budgetItemId exists
        if (updated.budgetItemId) {
          const allAdvances = await tx
            .select({ amount: advancePayments.amount })
            .from(advancePayments)
            .where(eq(advancePayments.budgetItemId, updated.budgetItemId))

          const totalPaid = allAdvances.reduce((sum, a) => sum + Number(a.amount), 0)

          const [updatedBudget] = await tx
            .update(budget)
            .set({
              paidAmount: totalPaid.toString(),
              updatedAt: new Date(),
            })
            .where(eq(budget.id, updated.budgetItemId))
            .returning()

          // BIDIRECTIONAL SYNC: Update vendor's deposit amount if budget is linked to a vendor
          if (updatedBudget?.vendorId) {
            await tx
              .update(clientVendors)
              .set({
                depositAmount: totalPaid.toString(),
                depositPaid: totalPaid > 0,
                updatedAt: new Date(),
              })
              .where(eq(clientVendors.vendorId, updatedBudget.vendorId))
          }

          // Recalculate client cached budget total
          if (updatedBudget?.clientId) {
            await recalcClientStats(tx, updatedBudget.clientId)
            txClientId = updatedBudget.clientId
          }
        }

        return { advance: updated, clientId: txClientId }
      })

      await broadcastSync({
        type: 'update',
        module: 'budget',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: result.clientId,
        userId: ctx.userId!,
        queryPaths: ['budget.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll'],
      })

      return result.advance
    }),

  deleteAdvancePayment: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get the advance payment first to know which budget item to update
      const [advance] = await ctx.db
        .select({ budgetItemId: advancePayments.budgetItemId })
        .from(advancePayments)
        .where(eq(advancePayments.id, input.id))
        .limit(1)

      if (!advance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Advance payment not found' })
      }

      // Delete advance + recalc budget + sync vendor atomically
      const deleteResult = await ctx.db.transaction(async (tx) => {
        await tx
          .delete(advancePayments)
          .where(eq(advancePayments.id, input.id))

        let txClientId: string | undefined

        // Update budget's paidAmount to reflect remaining advances if budgetItemId exists
        if (advance.budgetItemId) {
          const remainingAdvances = await tx
            .select({ amount: advancePayments.amount })
            .from(advancePayments)
            .where(eq(advancePayments.budgetItemId, advance.budgetItemId))

          const totalPaid = remainingAdvances.reduce((sum, a) => sum + Number(a.amount), 0)

          const [updatedBudget] = await tx
            .update(budget)
            .set({
              paidAmount: totalPaid.toString(),
              updatedAt: new Date(),
            })
            .where(eq(budget.id, advance.budgetItemId))
            .returning()

          // BIDIRECTIONAL SYNC: Update vendor's deposit amount if budget is linked to a vendor
          if (updatedBudget?.vendorId) {
            await tx
              .update(clientVendors)
              .set({
                depositAmount: totalPaid.toString(),
                depositPaid: totalPaid > 0,
                updatedAt: new Date(),
              })
              .where(eq(clientVendors.vendorId, updatedBudget.vendorId))
          }

          // Recalculate client cached budget total
          if (updatedBudget?.clientId) {
            await recalcClientStats(tx, updatedBudget.clientId)
            txClientId = updatedBudget.clientId
          }
        }

        return { clientId: txClientId }
      })

      await broadcastSync({
        type: 'delete',
        module: 'budget',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: deleteResult.clientId,
        userId: ctx.userId!,
        queryPaths: ['budget.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll'],
      })

      return { success: true }
    }),

  getAdvancePayments: adminProcedure
    .input(z.object({ budgetItemId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const advances = await ctx.db
        .select()
        .from(advancePayments)
        .where(eq(advancePayments.budgetItemId, input.budgetItemId))
        .orderBy(asc(advancePayments.paymentDate))

      return advances
    }),

  getSummary: adminProcedure
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

      // Get all budget items
      const budgetItems = await ctx.db
        .select({
          id: budget.id,
          estimatedCost: budget.estimatedCost,
          actualCost: budget.actualCost,
          paymentStatus: budget.paymentStatus,
        })
        .from(budget)
        .where(eq(budget.clientId, input.clientId))

      // Get all advance payments for these items
      const budgetIds = budgetItems.map(item => item.id)
      let totalAdvances = 0

      if (budgetIds.length > 0) {
        const advances = await ctx.db
          .select({ amount: advancePayments.amount })
          .from(advancePayments)
          .where(inArray(advancePayments.budgetItemId, budgetIds))

        totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount), 0)
      }

      const totalEstimated = budgetItems.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0)
      const totalActual = budgetItems.reduce((sum, item) => sum + Number(item.actualCost || 0), 0)
      const difference = totalActual - totalEstimated
      const percentageSpent = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0
      const balanceRemaining = totalEstimated - totalAdvances

      const summary = {
        totalEstimated,
        totalActual,
        totalAdvances,
        balanceRemaining,
        difference,
        percentageSpent,
        totalItems: budgetItems.length,
        itemsPaid: budgetItems.filter(item => item.paymentStatus === 'paid').length,
        itemsPending: budgetItems.filter(item => item.paymentStatus === 'pending').length,
        itemsOverdue: budgetItems.filter(item => item.paymentStatus === 'overdue').length,
      }

      return summary
    }),

  getByCategory: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      category: z.string(),
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

      // Fetch budget items by category
      const budgetItems = await ctx.db
        .select()
        .from(budget)
        .where(
          and(
            eq(budget.clientId, input.clientId),
            eq(budget.category, input.category)
          )
        )
        .orderBy(asc(budget.item))

      const totalEstimated = budgetItems.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0)
      const totalActual = budgetItems.reduce((sum, item) => sum + Number(item.actualCost || 0), 0)

      return {
        items: budgetItems,
        totalEstimated,
        totalActual,
        difference: totalActual - totalEstimated,
      }
    }),

  getCategorySummary: adminProcedure
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

      // Get all budget items
      const budgetItems = await ctx.db
        .select({
          category: budget.category,
          estimatedCost: budget.estimatedCost,
          actualCost: budget.actualCost,
        })
        .from(budget)
        .where(eq(budget.clientId, input.clientId))

      // Group by category
      const categoryMap = new Map<string, { estimated: number; actual: number; count: number }>()

      budgetItems.forEach(item => {
        const existing = categoryMap.get(item.category) || { estimated: 0, actual: 0, count: 0 }
        existing.estimated += Number(item.estimatedCost || 0)
        existing.actual += Number(item.actualCost || 0)
        existing.count += 1
        categoryMap.set(item.category, existing)
      })

      // Convert to array
      const categorySummary = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        totalEstimated: data.estimated,
        totalActual: data.actual,
        difference: data.actual - data.estimated,
        itemCount: data.count,
        percentageOfTotal: 0,
      }))

      // Calculate percentages
      const grandTotalEstimated = categorySummary.reduce((sum, cat) => sum + cat.totalEstimated, 0)
      categorySummary.forEach(cat => {
        cat.percentageOfTotal = grandTotalEstimated > 0 ? (cat.totalEstimated / grandTotalEstimated) * 100 : 0
      })

      return categorySummary.sort((a, b) => b.totalEstimated - a.totalEstimated)
    }),

  // Segment-based summary (vendors, travel, creatives, artists, accommodation, other)
  getSegmentSummary: adminProcedure
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

      // Get all budget items with segment info
      const budgetItems = await ctx.db
        .select({
          id: budget.id,
          segment: budget.segment,
          category: budget.category,
          estimatedCost: budget.estimatedCost,
          actualCost: budget.actualCost,
          isLumpSum: budget.isLumpSum,
        })
        .from(budget)
        .where(eq(budget.clientId, input.clientId))

      // Get all advance payments
      const budgetIds = budgetItems.map(item => item.id)
      let advancesMap: Record<string, number> = {}

      if (budgetIds.length > 0) {
        const advances = await ctx.db
          .select({
            budgetItemId: advancePayments.budgetItemId,
            amount: advancePayments.amount,
          })
          .from(advancePayments)
          .where(inArray(advancePayments.budgetItemId, budgetIds))

        advances.forEach(a => {
          if (a.budgetItemId) {
            advancesMap[a.budgetItemId] = (advancesMap[a.budgetItemId] || 0) + Number(a.amount)
          }
        })
      }

      // Define segment display config
      const segmentConfig: Record<string, { label: string; icon: string; order: number }> = {
        'vendors': { label: 'Vendors', icon: 'Users', order: 1 },
        'travel': { label: 'Travel & Logistics', icon: 'Plane', order: 2 },
        'creatives': { label: 'Creatives & Design', icon: 'Palette', order: 3 },
        'artists': { label: 'Artists & Entertainment', icon: 'Music', order: 4 },
        'accommodation': { label: 'Accommodation', icon: 'Hotel', order: 5 },
        'other': { label: 'Other Expenses', icon: 'MoreHorizontal', order: 6 },
      }

      // Group by segment
      const segmentMap = new Map<string, {
        estimated: number
        actual: number
        paid: number
        count: number
        categories: Set<string>
        lumpSumCount: number
      }>()

      budgetItems.forEach(item => {
        const seg = item.segment || 'vendors'
        const existing = segmentMap.get(seg) || {
          estimated: 0,
          actual: 0,
          paid: 0,
          count: 0,
          categories: new Set<string>(),
          lumpSumCount: 0,
        }
        existing.estimated += Number(item.estimatedCost || 0)
        existing.actual += Number(item.actualCost || 0)
        existing.paid += advancesMap[item.id] || 0
        existing.count += 1
        existing.categories.add(item.category)
        if (item.isLumpSum) existing.lumpSumCount += 1
        segmentMap.set(seg, existing)
      })

      // Convert to array with display info
      const segmentSummary = Array.from(segmentMap.entries()).map(([segment, data]) => ({
        segment,
        label: segmentConfig[segment]?.label || segment,
        icon: segmentConfig[segment]?.icon || 'Circle',
        order: segmentConfig[segment]?.order || 99,
        totalEstimated: data.estimated,
        totalActual: data.actual,
        totalPaid: data.paid,
        balance: data.estimated - data.paid,
        difference: data.actual - data.estimated,
        itemCount: data.count,
        categoryCount: data.categories.size,
        categories: Array.from(data.categories),
        lumpSumCount: data.lumpSumCount,
        percentageOfTotal: 0,
      }))

      // Calculate percentages
      const grandTotalEstimated = segmentSummary.reduce((sum, seg) => sum + seg.totalEstimated, 0)
      segmentSummary.forEach(seg => {
        seg.percentageOfTotal = grandTotalEstimated > 0 ? (seg.totalEstimated / grandTotalEstimated) * 100 : 0
      })

      return {
        segments: segmentSummary.sort((a, b) => a.order - b.order),
        grandTotal: {
          estimated: grandTotalEstimated,
          actual: segmentSummary.reduce((sum, seg) => sum + seg.totalActual, 0),
          paid: segmentSummary.reduce((sum, seg) => sum + seg.totalPaid, 0),
          balance: segmentSummary.reduce((sum, seg) => sum + seg.balance, 0),
          itemCount: segmentSummary.reduce((sum, seg) => sum + seg.itemCount, 0),
        },
      }
    }),

  // Get budget items by segment
  getBySegment: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      segment: z.enum(['vendors', 'travel', 'creatives', 'artists', 'accommodation', 'other']),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company
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

      // Fetch budget items by segment
      const budgetItems = await ctx.db
        .select()
        .from(budget)
        .where(
          and(
            eq(budget.clientId, input.clientId),
            eq(budget.segment, input.segment)
          )
        )
        .orderBy(asc(budget.category), asc(budget.item))

      // Get advance payments
      const budgetIds = budgetItems.map(item => item.id)
      let advancePaymentsList: typeof advancePayments.$inferSelect[] = []

      if (budgetIds.length > 0) {
        advancePaymentsList = await ctx.db
          .select()
          .from(advancePayments)
          .where(inArray(advancePayments.budgetItemId, budgetIds))
          .orderBy(asc(advancePayments.paymentDate))
      }

      // Get event info
      const eventIds = budgetItems.map(item => item.eventId).filter(Boolean) as string[]
      let eventsMap: Record<string, { id: string; title: string }> = {}

      if (eventIds.length > 0) {
        const eventList = await ctx.db
          .select({ id: events.id, title: events.title })
          .from(events)
          .where(inArray(events.id, eventIds))

        eventsMap = eventList.reduce((acc, e) => {
          acc[e.id] = e
          return acc
        }, {} as Record<string, { id: string; title: string }>)
      }

      // Attach events and advances
      const itemsWithAdvances = budgetItems.map(item => {
        const itemAdvances = advancePaymentsList.filter(a => a.budgetItemId === item.id)
        const totalAdvance = itemAdvances.reduce((sum, a) => sum + Number(a.amount), 0)
        const balance = Number(item.estimatedCost || 0) - totalAdvance

        return {
          ...item,
          events: item.eventId && eventsMap[item.eventId] ? eventsMap[item.eventId] : null,
          advancePayments: itemAdvances,
          totalAdvance,
          balanceRemaining: balance
        }
      })

      // Calculate totals
      const totalEstimated = budgetItems.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0)
      const totalActual = budgetItems.reduce((sum, item) => sum + Number(item.actualCost || 0), 0)
      const totalPaid = itemsWithAdvances.reduce((sum, item) => sum + item.totalAdvance, 0)

      return {
        items: itemsWithAdvances,
        summary: {
          totalEstimated,
          totalActual,
          totalPaid,
          balance: totalEstimated - totalPaid,
          difference: totalActual - totalEstimated,
          itemCount: budgetItems.length,
        },
      }
    }),

  // Portal view for clients
  getForPortal: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get the internal user UUID from auth ID
      const [portalUser] = await ctx.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, ctx.userId))
        .limit(1)

      if (!portalUser) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' })
      }

      // Verify user has access to this client
      const [clientUser] = await ctx.db
        .select({ clientId: clientUsers.clientId })
        .from(clientUsers)
        .where(
          and(
            eq(clientUsers.clientId, input.clientId),
            eq(clientUsers.userId, portalUser.id)
          )
        )
        .limit(1)

      if (!clientUser) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have access to this client' })
      }

      // Fetch only client-visible budget items
      const budgetItems = await ctx.db
        .select()
        .from(budget)
        .where(
          and(
            eq(budget.clientId, input.clientId),
            eq(budget.clientVisible, true)
          )
        )
        .orderBy(asc(budget.category))

      // Get event info
      const eventIds = budgetItems.map(item => item.eventId).filter(Boolean) as string[]
      let eventsMap: Record<string, { id: string; title: string }> = {}

      if (eventIds.length > 0) {
        const eventList = await ctx.db
          .select({ id: events.id, title: events.title })
          .from(events)
          .where(inArray(events.id, eventIds))

        eventsMap = eventList.reduce((acc, e) => {
          acc[e.id] = e
          return acc
        }, {} as Record<string, { id: string; title: string }>)
      }

      // Fetch advance payments
      const budgetIds = budgetItems.map(item => item.id)
      let advancePaymentsList: typeof advancePayments.$inferSelect[] = []

      if (budgetIds.length > 0) {
        advancePaymentsList = await ctx.db
          .select()
          .from(advancePayments)
          .where(inArray(advancePayments.budgetItemId, budgetIds))
          .orderBy(asc(advancePayments.paymentDate))
      }

      // Attach events and advances
      const itemsWithAdvances = budgetItems.map(item => {
        const itemAdvances = advancePaymentsList.filter(a => a.budgetItemId === item.id)
        const totalAdvance = itemAdvances.reduce((sum, a) => sum + Number(a.amount), 0)
        const balance = Number(item.estimatedCost || 0) - totalAdvance

        return {
          ...item,
          events: item.eventId && eventsMap[item.eventId] ? eventsMap[item.eventId] : null,
          advancePayments: itemAdvances,
          totalAdvance,
          balanceRemaining: balance
        }
      })

      return itemsWithAdvances
    }),
})
