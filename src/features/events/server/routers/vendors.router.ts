import { router, adminProcedure, protectedProcedure, publicProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, desc, asc, inArray } from 'drizzle-orm'
import { clients, vendors, clientVendors, events, vendorComments, vendorReviews, budget, advancePayments, timeline } from '@/lib/db/schema'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { withTransaction } from '@/features/chatbot/server/services/transaction-wrapper'
import { broadcastSync } from '@/lib/realtime/broadcast-sync'
import { recalcClientStats } from '@/lib/sync/client-stats-sync'

/**
 * Auto-link vendor to event by matching service date with event date.
 * Called when vendor is created/updated with a serviceDate but no explicit eventId.
 */
async function autoLinkVendorToEvent(
  db: PostgresJsDatabase<Record<string, unknown>>,
  clientVendorId: string,
  clientId: string,
  serviceDate: string,
  vendorId: string
) {
  // Extract just the date part (YYYY-MM-DD) from serviceDate
  const serviceDateStr = serviceDate.split('T')[0];

  // Find event on the same date
  const [matchingEvent] = await db
    .select({ id: events.id, title: events.title })
    .from(events)
    .where(and(eq(events.clientId, clientId), eq(events.eventDate, serviceDateStr)))
    .limit(1);

  if (matchingEvent) {
    // Link vendor to the matching event
    await db.update(clientVendors)
      .set({ eventId: matchingEvent.id, updatedAt: new Date() })
      .where(eq(clientVendors.id, clientVendorId));

    // Also update linked budget item to match the event
    await db.update(budget)
      .set({ eventId: matchingEvent.id, category: matchingEvent.title, updatedAt: new Date() })
      .where(eq(budget.vendorId, vendorId));

    console.log(`[Vendor Auto-Link] Linked vendor ${vendorId} to event "${matchingEvent.title}" based on service date ${serviceDateStr}`);
    return matchingEvent;
  }

  return null;
}

/**
 * Vendors tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding vendors with multi-tenant security.
 * Migrated from Supabase to Drizzle - December 2025
 */
export const vendorsRouter = router({
  // Changed from adminProcedure to protectedProcedure - staff should be able to view vendors
  getAll: protectedProcedure
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

      // Fetch client_vendors with vendor details and event info using joins
      const clientVendorData = await ctx.db
        .select({
          // Client vendor fields
          id: clientVendors.id,
          vendorId: clientVendors.vendorId,
          clientId: clientVendors.clientId,
          contractAmount: clientVendors.contractAmount,
          depositAmount: clientVendors.depositAmount,
          depositPaid: clientVendors.depositPaid,
          paymentStatus: clientVendors.paymentStatus,
          serviceDate: clientVendors.serviceDate,
          contractSignedAt: clientVendors.contractSignedAt,
          notes: clientVendors.notes,
          eventId: clientVendors.eventId,
          venueAddress: clientVendors.venueAddress,
          onsitePocName: clientVendors.onsitePocName,
          onsitePocPhone: clientVendors.onsitePocPhone,
          onsitePocNotes: clientVendors.onsitePocNotes,
          deliverables: clientVendors.deliverables,
          approvalStatus: clientVendors.approvalStatus,
          approvalComments: clientVendors.approvalComments,
          approvedBy: clientVendors.approvedBy,
          approvedAt: clientVendors.approvedAt,
          createdAt: clientVendors.createdAt,
          // Vendor fields
          vendorName: vendors.name,
          category: vendors.category,
          contactName: vendors.contactName,
          email: vendors.email,
          phone: vendors.phone,
          website: vendors.website,
          vendorAddress: vendors.address,
          contractSigned: vendors.contractSigned,
          contractDate: vendors.contractDate,
          vendorNotes: vendors.notes,
          isPreferred: vendors.isPreferred,
          // Event fields
          eventTitle: events.title,
          eventDate: events.eventDate,
        })
        .from(clientVendors)
        .leftJoin(vendors, eq(clientVendors.vendorId, vendors.id))
        .leftJoin(events, eq(clientVendors.eventId, events.id))
        .where(eq(clientVendors.clientId, input.clientId))
        .orderBy(desc(clientVendors.createdAt))

      // Get vendor IDs to fetch their budget advance data
      const vendorIds = clientVendorData.map(cv => cv.vendorId).filter(Boolean) as string[]

      // Fetch budget items linked to these vendors
      let budgetByVendor: Record<string, { budgetId: string; estimatedCost: string | null }> = {}
      let advancesByBudget: Record<string, number> = {}

      if (vendorIds.length > 0) {
        const budgetItems = await ctx.db
          .select({
            id: budget.id,
            vendorId: budget.vendorId,
            estimatedCost: budget.estimatedCost
          })
          .from(budget)
          .where(inArray(budget.vendorId, vendorIds))

        // Map vendor to budget
        budgetItems.forEach(b => {
          if (b.vendorId) {
            budgetByVendor[b.vendorId] = { budgetId: b.id, estimatedCost: b.estimatedCost }
          }
        })

        // Fetch advance payments for these budget items
        const budgetIds = budgetItems.map(b => b.id)
        if (budgetIds.length > 0) {
          const advances = await ctx.db
            .select({
              budgetItemId: advancePayments.budgetItemId,
              amount: advancePayments.amount
            })
            .from(advancePayments)
            .where(inArray(advancePayments.budgetItemId, budgetIds))

          // Sum advances per budget item
          advances.forEach(a => {
            if (a.budgetItemId) {
              advancesByBudget[a.budgetItemId] = (advancesByBudget[a.budgetItemId] || 0) + Number(a.amount)
            }
          })
        }
      }

      // Flatten and format the response
      const vendorsList = clientVendorData.map(cv => {
        const budgetInfo = cv.vendorId ? budgetByVendor[cv.vendorId] : null
        const totalAdvances = budgetInfo ? (advancesByBudget[budgetInfo.budgetId] || 0) : 0
        const contractAmount = Number(cv.contractAmount || 0)
        const balanceRemaining = contractAmount - totalAdvances

        return {
          id: cv.id,
          vendor_id: cv.vendorId,
          client_id: cv.clientId,
          // From vendors table
          name: cv.vendorName,
          category: cv.category,
          contact_name: cv.contactName,
          email: cv.email,
          phone: cv.phone,
          website: cv.website,
          vendor_address: cv.vendorAddress,
          contract_signed: cv.contractSigned,
          contract_date: cv.contractDate,
          deposit_paid: cv.depositPaid,
          payment_status: cv.paymentStatus,
          vendor_notes: cv.vendorNotes,
          is_preferred: cv.isPreferred,
          // From client_vendors table
          contract_amount: cv.contractAmount,
          deposit_amount: cv.depositAmount,
          service_date: cv.serviceDate,
          contract_signed_at: cv.contractSignedAt,
          notes: cv.notes,
          // Enhanced fields
          event_id: cv.eventId,
          event_title: cv.eventTitle,
          event_date: cv.eventDate,
          venue_address: cv.venueAddress,
          onsite_poc_name: cv.onsitePocName,
          onsite_poc_phone: cv.onsitePocPhone,
          onsite_poc_notes: cv.onsitePocNotes,
          deliverables: cv.deliverables,
          approval_status: cv.approvalStatus,
          approval_comments: cv.approvalComments,
          approved_by: cv.approvedBy,
          approved_at: cv.approvedAt,
          // Advance payment info (calculated from linked budget)
          total_advances: totalAdvances,
          balance_remaining: balanceRemaining,
        }
      })

      return vendorsList
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [clientVendor] = await ctx.db
        .select({
          // All client_vendor fields
          id: clientVendors.id,
          vendorId: clientVendors.vendorId,
          clientId: clientVendors.clientId,
          contractAmount: clientVendors.contractAmount,
          depositAmount: clientVendors.depositAmount,
          depositPaid: clientVendors.depositPaid,
          paymentStatus: clientVendors.paymentStatus,
          serviceDate: clientVendors.serviceDate,
          contractSignedAt: clientVendors.contractSignedAt,
          notes: clientVendors.notes,
          eventId: clientVendors.eventId,
          venueAddress: clientVendors.venueAddress,
          onsitePocName: clientVendors.onsitePocName,
          onsitePocPhone: clientVendors.onsitePocPhone,
          onsitePocNotes: clientVendors.onsitePocNotes,
          deliverables: clientVendors.deliverables,
          approvalStatus: clientVendors.approvalStatus,
          approvalComments: clientVendors.approvalComments,
          approvedBy: clientVendors.approvedBy,
          approvedAt: clientVendors.approvedAt,
          // All vendor fields
          vendorName: vendors.name,
          category: vendors.category,
          contactName: vendors.contactName,
          email: vendors.email,
          phone: vendors.phone,
          website: vendors.website,
          vendorAddress: vendors.address,
          contractSigned: vendors.contractSigned,
          contractDate: vendors.contractDate,
          vendorNotes: vendors.notes,
          vendorRating: vendors.rating,
          isPreferred: vendors.isPreferred,
          // Event fields
          eventTitle: events.title,
          eventDate: events.eventDate,
        })
        .from(clientVendors)
        .leftJoin(vendors, eq(clientVendors.vendorId, vendors.id))
        .leftJoin(events, eq(clientVendors.eventId, events.id))
        .where(eq(clientVendors.id, input.id))
        .limit(1)

      if (!clientVendor) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return {
        ...clientVendor,
        name: clientVendor.vendorName,
        event_title: clientVendor.eventTitle,
        event_date: clientVendor.eventDate,
      }
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      vendorName: z.string().min(1),
      category: z.string().min(1),
      contactName: z.string().optional(),
      email: z.preprocess((val) => val === '' ? undefined : val, z.string().email().optional()),
      phone: z.string().optional(),
      website: z.preprocess((val) => val === '' ? undefined : val, z.string().url().optional()),
      contractSigned: z.boolean().optional(),
      contractDate: z.string().optional(),
      cost: z.number().optional(),
      depositAmount: z.number().optional(),
      depositPaid: z.boolean().optional(),
      paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
      serviceDate: z.string().optional(),
      notes: z.string().optional(),
      isPreferred: z.boolean().optional(), // Mark as company preferred/suggested vendor
      // Enhanced fields
      eventId: z.string().uuid().optional(),
      venueAddress: z.string().optional(),
      onsitePocName: z.string().optional(),
      onsitePocPhone: z.string().optional(),
      onsitePocNotes: z.string().optional(),
      deliverables: z.string().optional(),
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

      // Execute all vendor creation operations atomically within a transaction
      const result = await withTransaction(async (tx) => {
        // Track cascade actions for frontend notification
        const cascadeActions: { module: string; action: string; count: number }[] = []

        // 1. Create vendor in vendors table
        const [vendor] = await tx
          .insert(vendors)
          .values({
            id: crypto.randomUUID(),
            companyId: ctx.companyId,
            name: input.vendorName,
            category: input.category as any,
            contactName: input.contactName || null,
            email: input.email || null,
            phone: input.phone || null,
            website: input.website || null,
            contractSigned: input.contractSigned || false,
            contractDate: input.contractDate || null,
            notes: input.notes || null,
            isPreferred: input.isPreferred || false,
          })
          .returning()

        if (!vendor) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create vendor'
          })
        }

        // 2. Create client_vendor relationship with enhanced fields
        const [clientVendor] = await tx
          .insert(clientVendors)
          .values({
            id: crypto.randomUUID(),
            clientId: input.clientId,
            vendorId: vendor.id,
            companyId: ctx.companyId,
            contractAmount: input.cost ? String(input.cost) : null,
            depositAmount: input.depositAmount ? String(input.depositAmount) : null,
            serviceDate: input.serviceDate || null,
            depositPaid: input.depositPaid || false,
            paymentStatus: (input.paymentStatus || 'pending') as any,
            notes: input.notes || null,
            // Enhanced fields
            eventId: input.eventId || null,
            venueAddress: input.venueAddress || null,
            onsitePocName: input.onsitePocName || null,
            onsitePocPhone: input.onsitePocPhone || null,
            onsitePocNotes: input.onsitePocNotes || null,
            deliverables: input.deliverables || null,
            approvalStatus: 'pending' as any,
          })
          .returning()

        if (!clientVendor) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create client vendor relationship'
          })
        }

        // 3. Auto-create budget item (within transaction - atomic)
        let budgetCategory = 'Unassigned'
        if (input.eventId) {
          const [event] = await tx
            .select({ title: events.title })
            .from(events)
            .where(eq(events.id, input.eventId))
            .limit(1)
          if (event?.title) {
            budgetCategory = event.title
          }
        }

        await tx.insert(budget).values({
          id: crypto.randomUUID(),
          clientId: input.clientId,
          vendorId: vendor.id,
          eventId: input.eventId || null,
          category: budgetCategory,
          segment: 'vendors',
          item: input.vendorName,
          estimatedCost: input.cost ? String(input.cost) : '0',
          actualCost: null,
          paidAmount: input.depositAmount ? String(input.depositAmount) : '0',
          paymentStatus: input.paymentStatus || 'pending',
          clientVisible: true,
          isLumpSum: false,
          notes: `Auto-created from vendor: ${input.vendorName}`,
        })
        cascadeActions.push({ module: 'budget', action: 'created', count: 1 })

        // 4. TIMELINE SYNC: Create timeline entry if service date is set (within transaction)
        if (input.serviceDate) {
          const serviceDateTime = new Date(input.serviceDate)
          await tx.insert(timeline).values({
            id: crypto.randomUUID(),
            clientId: input.clientId,
            title: `${input.vendorName} - ${input.category || 'Vendor Service'}`,
            description: `Vendor service: ${input.vendorName}`,
            startTime: serviceDateTime,
            location: input.venueAddress || null,
            responsiblePerson: input.contactName || input.onsitePocName || null,
            notes: input.notes || null,
            sourceModule: 'vendors',
            sourceId: clientVendor.id,
            metadata: JSON.stringify({ category: input.category, vendorId: vendor.id }),
          })
          cascadeActions.push({ module: 'timeline', action: 'created', count: 1 })
          console.log(`[Timeline] Auto-created entry for vendor service: ${input.vendorName}`)
        }

        // 5. AUTO-LINK: If serviceDate is set but no eventId, try to auto-link (within transaction)
        let linkedEvent = null
        if (input.serviceDate && !input.eventId) {
          // Extract just the date part (YYYY-MM-DD) from serviceDate
          const serviceDateStr = input.serviceDate.split('T')[0]

          // Find event on the same date
          const [matchingEvent] = await tx
            .select({ id: events.id, title: events.title })
            .from(events)
            .where(and(eq(events.clientId, input.clientId), eq(events.eventDate, serviceDateStr)))
            .limit(1)

          if (matchingEvent) {
            // Link vendor to the matching event
            await tx.update(clientVendors)
              .set({ eventId: matchingEvent.id, updatedAt: new Date() })
              .where(eq(clientVendors.id, clientVendor.id))

            // Also update linked budget item to match the event
            await tx.update(budget)
              .set({ eventId: matchingEvent.id, category: matchingEvent.title, updatedAt: new Date() })
              .where(eq(budget.vendorId, vendor.id))

            linkedEvent = matchingEvent
            console.log(`[Vendor Auto-Link] Linked vendor ${vendor.id} to event "${matchingEvent.title}" based on service date ${serviceDateStr}`)
          }
        }

        // Recalculate client stats after budget insert
        await recalcClientStats(tx, input.clientId)

        return {
          vendor,
          clientVendor,
          linkedEvent,
          cascadeActions,
        }
      })

      console.log(`[Vendor Create] Created vendor ${result.vendor.id} with cascade:`, result.cascadeActions)

      await broadcastSync({
        type: 'insert',
        module: 'vendors',
        entityId: result.clientVendor.id,
        companyId: ctx.companyId!,
        clientId: input.clientId,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary', 'timeline.getAll'],
      })

      return {
        ...result.clientVendor,
        ...result.vendor,
        cascadeActions: result.cascadeActions,
      }
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        vendorName: z.string().optional(),
        category: z.string().optional(),
        contactName: z.string().optional(),
        email: z.preprocess((val) => val === '' ? undefined : val, z.string().email().optional()),
        phone: z.string().optional(),
        website: z.preprocess((val) => val === '' ? undefined : val, z.string().url().optional()),
        contractSigned: z.boolean().optional(),
        contractDate: z.string().optional(),
        cost: z.number().optional(),
        depositAmount: z.number().optional(),
        depositPaid: z.boolean().optional(),
        paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
        serviceDate: z.string().optional(),
        notes: z.string().optional(),
        isPreferred: z.boolean().optional(), // Mark as company preferred/suggested vendor
        // Enhanced fields
        eventId: z.string().uuid().optional().nullable(),
        venueAddress: z.string().optional(),
        onsitePocName: z.string().optional(),
        onsitePocPhone: z.string().optional(),
        onsitePocNotes: z.string().optional(),
        deliverables: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Get the client_vendor record to find the vendor_id
      const [clientVendorRecord] = await ctx.db
        .select({ vendorId: clientVendors.vendorId, clientId: clientVendors.clientId })
        .from(clientVendors)
        .where(eq(clientVendors.id, input.id))
        .limit(1)

      if (!clientVendorRecord) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      // Helper to convert empty strings to null for database
      const emptyToNull = (val: string | undefined | null) => val === '' ? null : val

      // Update vendor table fields
      const vendorUpdateData: Record<string, any> = { updatedAt: new Date() }
      if (input.data.vendorName !== undefined) vendorUpdateData.name = input.data.vendorName
      if (input.data.category !== undefined) vendorUpdateData.category = input.data.category
      if (input.data.contactName !== undefined) vendorUpdateData.contactName = emptyToNull(input.data.contactName)
      if (input.data.email !== undefined) vendorUpdateData.email = emptyToNull(input.data.email)
      if (input.data.phone !== undefined) vendorUpdateData.phone = emptyToNull(input.data.phone)
      if (input.data.website !== undefined) vendorUpdateData.website = emptyToNull(input.data.website)
      if (input.data.contractSigned !== undefined) vendorUpdateData.contractSigned = input.data.contractSigned
      if (input.data.contractDate !== undefined) vendorUpdateData.contractDate = emptyToNull(input.data.contractDate)
      if (input.data.isPreferred !== undefined) vendorUpdateData.isPreferred = input.data.isPreferred

      // Build client_vendors update data
      const cvUpdateData: Record<string, any> = { updatedAt: new Date() }
      if (input.data.cost !== undefined && input.data.cost !== null) cvUpdateData.contractAmount = String(input.data.cost)
      if (input.data.depositAmount !== undefined && input.data.depositAmount !== null) cvUpdateData.depositAmount = String(input.data.depositAmount)
      if (input.data.depositPaid !== undefined) cvUpdateData.depositPaid = input.data.depositPaid
      if (input.data.paymentStatus !== undefined) cvUpdateData.paymentStatus = input.data.paymentStatus
      if (input.data.serviceDate !== undefined) cvUpdateData.serviceDate = emptyToNull(input.data.serviceDate)
      if (input.data.notes !== undefined) cvUpdateData.notes = emptyToNull(input.data.notes)
      // Enhanced fields
      if (input.data.eventId !== undefined) cvUpdateData.eventId = emptyToNull(input.data.eventId)
      if (input.data.venueAddress !== undefined) cvUpdateData.venueAddress = emptyToNull(input.data.venueAddress)
      if (input.data.onsitePocName !== undefined) cvUpdateData.onsitePocName = emptyToNull(input.data.onsitePocName)
      if (input.data.onsitePocPhone !== undefined) cvUpdateData.onsitePocPhone = emptyToNull(input.data.onsitePocPhone)
      if (input.data.onsitePocNotes !== undefined) cvUpdateData.onsitePocNotes = emptyToNull(input.data.onsitePocNotes)
      if (input.data.deliverables !== undefined) cvUpdateData.deliverables = emptyToNull(input.data.deliverables)

      // Wrap all writes in a transaction for atomicity
      await withTransaction(async (tx) => {
        // 1. Update vendor table fields
        if (Object.keys(vendorUpdateData).length > 1) {
          await tx
            .update(vendors)
            .set(vendorUpdateData)
            .where(eq(vendors.id, clientVendorRecord.vendorId))
        }

        // 2. Update client_vendors table fields
        if (Object.keys(cvUpdateData).length > 1) {
          await tx
            .update(clientVendors)
            .set(cvUpdateData)
            .where(eq(clientVendors.id, input.id))
        }

        // 3. Sync budget entry with vendor updates
        try {
          const budgetUpdateData: Record<string, any> = { updatedAt: new Date() }
          if (input.data.vendorName !== undefined) budgetUpdateData.item = input.data.vendorName
          if (input.data.cost !== undefined) budgetUpdateData.estimatedCost = input.data.cost ? String(input.data.cost) : '0'
          if (input.data.depositAmount !== undefined) budgetUpdateData.paidAmount = input.data.depositAmount ? String(input.data.depositAmount) : '0'
          if (input.data.paymentStatus !== undefined) budgetUpdateData.paymentStatus = input.data.paymentStatus

          // When event changes, update budget category to event name
          if (input.data.eventId !== undefined) {
            const eventIdValue = emptyToNull(input.data.eventId)
            budgetUpdateData.eventId = eventIdValue

            if (eventIdValue) {
              const [eventData] = await tx
                .select({ title: events.title })
                .from(events)
                .where(eq(events.id, eventIdValue))
                .limit(1)
              budgetUpdateData.category = eventData?.title || 'Unassigned'
            } else {
              budgetUpdateData.category = 'Unassigned'
            }
          }

          if (Object.keys(budgetUpdateData).length > 1) {
            await tx
              .update(budget)
              .set(budgetUpdateData)
              .where(eq(budget.vendorId, clientVendorRecord.vendorId))
          }
        } catch (budgetError) {
          console.warn('Failed to sync budget item with vendor update:', budgetError)
        }

        // 4. TIMELINE SYNC: Update or create timeline entry if service date changes
        if (input.data.serviceDate !== undefined) {
          try {
            if (input.data.serviceDate) {
              // Fetch the actual vendor name if not provided in update
              let vendorName = input.data.vendorName
              let category = ''
              if (!vendorName) {
                const [vendorInfo] = await tx
                  .select({ name: vendors.name, category: vendors.category })
                  .from(vendors)
                  .where(eq(vendors.id, clientVendorRecord.vendorId))
                  .limit(1)
                vendorName = vendorInfo?.name || 'Vendor'
                category = vendorInfo?.category || ''
              }

              const serviceDateTime = new Date(input.data.serviceDate)
              const timelineData = {
                title: `${vendorName}${category ? ` (${category})` : ''}`,
                description: `Vendor service date`,
                startTime: serviceDateTime,
                location: input.data.venueAddress || null,
                responsiblePerson: input.data.contactName || input.data.onsitePocName || null,
                notes: input.data.notes || null,
                updatedAt: new Date(),
              }

              // Try to update existing entry first
              const timelineResult = await tx
                .update(timeline)
                .set(timelineData)
                .where(
                  and(
                    eq(timeline.sourceModule, 'vendors'),
                    eq(timeline.sourceId, input.id)
                  )
                )
                .returning({ id: timeline.id })

              if (timelineResult.length === 0) {
                // No existing entry - create new one
                await tx.insert(timeline).values({
                  id: crypto.randomUUID(),
                  clientId: clientVendorRecord.clientId,
                  ...timelineData,
                  sourceModule: 'vendors',
                  sourceId: input.id,
                  metadata: JSON.stringify({ vendorId: clientVendorRecord.vendorId, category }),
                })
                console.log(`[Timeline] Created vendor service entry: ${vendorName}`)
              } else {
                console.log(`[Timeline] Updated vendor service entry: ${vendorName}`)
              }

              // AUTO-LINK: If serviceDate changed and no eventId set, try to auto-link
              if (!input.data.eventId) {
                try {
                  await autoLinkVendorToEvent(
                    tx as any,
                    input.id,
                    clientVendorRecord.clientId,
                    input.data.serviceDate,
                    clientVendorRecord.vendorId
                  );
                } catch (linkError) {
                  console.warn('[Vendor Auto-Link] Failed to auto-link vendor to event:', linkError);
                }
              }
            } else {
              // Service date cleared - delete timeline entry
              await tx
                .delete(timeline)
                .where(
                  and(
                    eq(timeline.sourceModule, 'vendors'),
                    eq(timeline.sourceId, input.id)
                  )
                )
              console.log(`[Timeline] Deleted vendor service entry (date cleared)`)
            }
          } catch (timelineError) {
            console.warn('[Timeline] Failed to sync timeline with vendor update:', timelineError)
          }
        }

        // Recalculate client stats after budget update
        await recalcClientStats(tx, clientVendorRecord.clientId)
      })

      // Broadcast real-time sync after successful transaction
      await broadcastSync({
        type: 'update',
        module: 'vendors',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: clientVendorRecord.clientId,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary', 'timeline.getAll'],
      })

      return { success: true }
    }),

  /**
   * Delete vendor with cascade cleanup (transaction-wrapped).
   * Deletes: client-vendor relationship, budget item, timeline entry
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Execute cascade deletion in a transaction for atomicity
      const result = await withTransaction(async (tx) => {
        const deletionCounts = {
          clientVendors: 0,
          budget: 0,
          timeline: 0,
        }

        // Get vendor ID before deleting client_vendor relationship
        const [clientVendorRecord] = await tx
          .select({ vendorId: clientVendors.vendorId, clientId: clientVendors.clientId })
          .from(clientVendors)
          .where(eq(clientVendors.id, input.id))
          .limit(1)

        // 1. Delete from client_vendors (vendor remains in vendors table for reuse)
        const cvResult = await tx
          .delete(clientVendors)
          .where(eq(clientVendors.id, input.id))
          .returning({ id: clientVendors.id })
        deletionCounts.clientVendors = cvResult.length

        // 2. Delete the corresponding budget entry
        if (clientVendorRecord?.vendorId) {
          const budgetResult = await tx
            .delete(budget)
            .where(eq(budget.vendorId, clientVendorRecord.vendorId))
            .returning({ id: budget.id })
          deletionCounts.budget = budgetResult.length
        }

        // 3. Delete linked timeline entry
        const timelineResult = await tx
          .delete(timeline)
          .where(
            and(
              eq(timeline.sourceModule, 'vendors'),
              eq(timeline.sourceId, input.id)
            )
          )
          .returning({ id: timeline.id })
        deletionCounts.timeline = timelineResult.length

        // Recalculate client stats after budget delete
        if (clientVendorRecord?.clientId) {
          await recalcClientStats(tx, clientVendorRecord.clientId)
        }

        console.log(`[Vendor Delete] Vendor ${input.id} deleted with cascade:`, deletionCounts)
        return { ...deletionCounts, clientId: clientVendorRecord?.clientId }
      })

      if (result.clientId) {
        await broadcastSync({
          type: 'delete',
          module: 'vendors',
          entityId: input.id,
          companyId: ctx.companyId!,
          clientId: result.clientId,
          userId: ctx.userId!,
          queryPaths: ['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary', 'timeline.getAll'],
        })
      }

      return { success: true, deleted: result }
    }),

  // Approval workflow
  updateApprovalStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending', 'approved', 'rejected']),
      comments: z.string().optional(),
      approvedBy: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const updateData: Record<string, any> = {
        approvalStatus: input.status as any,
        updatedAt: new Date(),
      }

      if (input.comments !== undefined) {
        updateData.approvalComments = input.comments
      }

      if (input.status === 'approved' || input.status === 'rejected') {
        updateData.approvedBy = input.approvedBy || ctx.userId
        updateData.approvedAt = new Date()
      }

      const [clientVendor] = await ctx.db
        .update(clientVendors)
        .set(updateData)
        .where(eq(clientVendors.id, input.id))
        .returning()

      if (!clientVendor) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await broadcastSync({
        type: 'update',
        module: 'vendors',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: clientVendor.clientId,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll', 'vendors.getStats'],
      })

      return clientVendor
    }),

  // Add comment to vendor
  addComment: adminProcedure
    .input(z.object({
      clientVendorId: z.string().uuid(),
      comment: z.string().min(1),
      userName: z.string().optional(),
      userType: z.enum(['client', 'planner']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId || !ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Get vendorId and clientId from clientVendor record
      const [clientVendor] = await ctx.db
        .select({ vendorId: clientVendors.vendorId, clientId: clientVendors.clientId })
        .from(clientVendors)
        .where(eq(clientVendors.id, input.clientVendorId))
        .limit(1)

      if (!clientVendor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Client vendor not found' })
      }

      const [comment] = await ctx.db
        .insert(vendorComments)
        .values({
          id: crypto.randomUUID(),
          vendorId: clientVendor.vendorId,
          userId: ctx.userId,
          content: input.comment,
        })
        .returning()

      if (!comment) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create comment'
        })
      }

      await broadcastSync({
        type: 'insert',
        module: 'vendors',
        entityId: comment.id,
        companyId: ctx.companyId!,
        clientId: clientVendor.clientId,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll'],
      })

      return comment
    }),

  // Get comments for vendor
  getComments: adminProcedure
    .input(z.object({ clientVendorId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Get vendorId from clientVendor record
      const [clientVendor] = await ctx.db
        .select({ vendorId: clientVendors.vendorId })
        .from(clientVendors)
        .where(eq(clientVendors.id, input.clientVendorId))
        .limit(1)

      if (!clientVendor) {
        return []
      }

      const comments = await ctx.db
        .select()
        .from(vendorComments)
        .where(eq(vendorComments.vendorId, clientVendor.vendorId))
        .orderBy(desc(vendorComments.createdAt))

      return comments
    }),

  // Delete comment
  deleteComment: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      await ctx.db
        .delete(vendorComments)
        .where(eq(vendorComments.id, input.id))

      await broadcastSync({
        type: 'delete',
        module: 'vendors',
        entityId: input.id,
        companyId: ctx.companyId!,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll'],
      })

      return { success: true }
    }),

  updatePaymentStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      paymentStatus: z.enum(['pending', 'paid', 'overdue']),
      depositPaid: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const updateData: Record<string, any> = {
        paymentStatus: input.paymentStatus as any,
        updatedAt: new Date(),
      }

      if (input.depositPaid !== undefined) {
        updateData.depositPaid = input.depositPaid
      }

      const [clientVendor] = await ctx.db
        .update(clientVendors)
        .set(updateData)
        .where(eq(clientVendors.id, input.id))
        .returning()

      if (!clientVendor) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      await broadcastSync({
        type: 'update',
        module: 'vendors',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: clientVendor.clientId,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll', 'vendors.getStats'],
      })

      return clientVendor
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

      // Fetch vendors by category using join
      const clientVendorData = await ctx.db
        .select()
        .from(clientVendors)
        .innerJoin(vendors, eq(clientVendors.vendorId, vendors.id))
        .where(
          and(
            eq(clientVendors.clientId, input.clientId),
            eq(vendors.category, input.category as any)
          )
        )

      return clientVendorData
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

      // Get client_vendors with vendor data
      const clientVendorData = await ctx.db
        .select({
          vendorId: clientVendors.vendorId,
          contractAmount: clientVendors.contractAmount,
          paymentStatus: clientVendors.paymentStatus,
          depositPaid: clientVendors.depositPaid,
          approvalStatus: clientVendors.approvalStatus,
          contractSigned: vendors.contractSigned,
        })
        .from(clientVendors)
        .leftJoin(vendors, eq(clientVendors.vendorId, vendors.id))
        .where(eq(clientVendors.clientId, input.clientId))

      // Calculate total cost from contract amounts
      const totalCost = clientVendorData.reduce((sum, v) => sum + (parseFloat(v.contractAmount || '0') || 0), 0)

      // Get actual paid amount from budget advance payments (2-way sync with budget)
      const vendorIds = clientVendorData.map(v => v.vendorId).filter(Boolean) as string[]
      let totalAdvances = 0

      if (vendorIds.length > 0) {
        // Get budget items for these vendors
        const budgetItems = await ctx.db
          .select({ id: budget.id })
          .from(budget)
          .where(inArray(budget.vendorId, vendorIds))

        const budgetIds = budgetItems.map(b => b.id)
        if (budgetIds.length > 0) {
          // Sum all advance payments
          const advances = await ctx.db
            .select({ amount: advancePayments.amount })
            .from(advancePayments)
            .where(inArray(advancePayments.budgetItemId, budgetIds))

          totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount), 0)
        }
      }

      const pendingAmount = totalCost - totalAdvances

      const stats = {
        total: clientVendorData.length,
        totalCost,
        paidAmount: totalAdvances, // Use actual advance payments, not payment status
        pendingAmount,
        contractsSigned: clientVendorData.filter(v => v.contractSigned).length,
        contractsPending: clientVendorData.filter(v => !v.contractSigned).length,
        paymentPending: clientVendorData.filter(v => v.paymentStatus === 'pending').length,
        paymentOverdue: clientVendorData.filter(v => v.paymentStatus === 'overdue').length,
        // Approval stats
        approvalPending: clientVendorData.filter(v => v.approvalStatus === 'pending').length,
        approved: clientVendorData.filter(v => v.approvalStatus === 'approved').length,
        rejected: clientVendorData.filter(v => v.approvalStatus === 'rejected').length,
      }

      return stats
    }),

  // Get events for dropdown (to assign vendors to events)
  getClientEvents: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const eventList = await ctx.db
        .select({
          id: events.id,
          title: events.title,
          eventDate: events.eventDate,
        })
        .from(events)
        .where(eq(events.clientId, input.clientId))
        .orderBy(asc(events.eventDate))

      // Return with snake_case for backward compatibility
      return eventList.map(e => ({
        id: e.id,
        title: e.title,
        event_date: e.eventDate,
      }))
    }),

  /**
   * Bulk create vendors from comma-separated list.
   * Used when creating a client with vendors listed in event briefs.
   *
   * @param clientId - The client to link vendors to
   * @param eventId - Optional event to link vendors to
   * @param vendorNames - Comma-separated list of vendor names
   * @returns Array of created vendors
   */
  bulkCreateFromCommaList: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      eventId: z.string().uuid().optional(),
      vendorNames: z.string().min(1), // Comma-separated vendor names
      defaultCategory: z.enum([
        'venue', 'catering', 'photography', 'videography', 'florals',
        'music', 'dj', 'transportation', 'accommodation', 'beauty',
        'bakery', 'decor', 'entertainment', 'stationery', 'rentals', 'other'
      ]).default('other'),
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
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Client not found or access denied' })
      }

      // Parse comma-separated vendor names
      const vendorNamesList = input.vendorNames
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0)

      if (vendorNamesList.length === 0) {
        return { created: 0, vendors: [] }
      }

      // Get event name for budget category (shows which event the vendor cost is for)
      let budgetCategory = 'Unassigned'
      if (input.eventId) {
        const [event] = await ctx.db
          .select({ title: events.title })
          .from(events)
          .where(eq(events.id, input.eventId))
          .limit(1)
        if (event?.title) {
          budgetCategory = event.title
        }
      }

      const createdVendors: any[] = []

      // Create each vendor atomically (S7-M06: per-iteration transaction)
      for (const vendorName of vendorNamesList) {
        try {
          await ctx.db.transaction(async (tx) => {
            // Create vendor in vendors table
            const [vendor] = await tx
              .insert(vendors)
              .values({
                id: crypto.randomUUID(),
                companyId: ctx.companyId!,
                name: vendorName,
                category: input.defaultCategory,
                isPreferred: false,
              })
              .returning()

            if (vendor) {
              // Create client_vendor relationship
              const [clientVendor] = await tx
                .insert(clientVendors)
                .values({
                  id: crypto.randomUUID(),
                  clientId: input.clientId,
                  vendorId: vendor.id,
                  companyId: ctx.companyId,
                  eventId: input.eventId || null,
                  paymentStatus: 'pending' as any,
                  approvalStatus: 'pending' as any,
                })
                .returning()

              // Auto-create budget item for this vendor
              await tx.insert(budget).values({
                id: crypto.randomUUID(),
                clientId: input.clientId,
                vendorId: vendor.id,
                eventId: input.eventId || null,
                category: budgetCategory,
                segment: 'vendors',
                item: vendorName,
                estimatedCost: '0',
                actualCost: null,
                paidAmount: '0',
                paymentStatus: 'pending',
                clientVisible: true,
                isLumpSum: false,
                notes: `Auto-created from vendor: ${vendorName}`,
              })

              createdVendors.push({
                id: clientVendor?.id,
                vendorId: vendor.id,
                name: vendorName,
                category: input.defaultCategory,
                eventId: input.eventId,
              })
            }
          })
        } catch (err) {
          // Log error but continue with other vendors (transaction rolls back this vendor only)
          console.warn(`Failed to create vendor "${vendorName}":`, err)
        }
      }

      console.log(`[Vendors] Bulk created ${createdVendors.length} vendors from comma list for client ${input.clientId}`)

      // Recalculate client stats after bulk budget inserts
      if (createdVendors.length > 0) {
        await recalcClientStats(ctx.db, input.clientId)

        await broadcastSync({
          type: 'insert',
          module: 'vendors',
          entityId: 'bulk',
          companyId: ctx.companyId!,
          clientId: input.clientId,
          userId: ctx.userId!,
          queryPaths: ['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary'],
        })
      }

      return {
        created: createdVendors.length,
        vendors: createdVendors,
      }
    }),

  // ============================================
  // VENDOR ADVANCE PAYMENTS
  // These operate on the budget's advance_payments table via the vendor's linked budget entry
  // ============================================

  /**
   * Get advance payments for a vendor.
   * Fetches from the linked budget entry's advance_payments.
   */
  getVendorAdvances: adminProcedure
    .input(z.object({ vendorId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Find the budget entry linked to this vendor
      const [budgetItem] = await ctx.db
        .select({ id: budget.id, estimatedCost: budget.estimatedCost })
        .from(budget)
        .where(eq(budget.vendorId, input.vendorId))
        .limit(1)

      if (!budgetItem) {
        // No budget entry = no advances
        return { advances: [], total: 0, balance: 0, estimatedCost: 0 }
      }

      // Fetch advance payments for this budget item
      const advances = await ctx.db
        .select()
        .from(advancePayments)
        .where(eq(advancePayments.budgetItemId, budgetItem.id))
        .orderBy(asc(advancePayments.paymentDate))

      const total = advances.reduce((sum, a) => sum + Number(a.amount), 0)
      const estimatedCost = Number(budgetItem.estimatedCost || 0)

      return {
        advances,
        total,
        balance: estimatedCost - total,
        estimatedCost,
        budgetItemId: budgetItem.id,
      }
    }),

  /**
   * Add an advance payment for a vendor.
   * Creates the advance in the linked budget entry.
   */
  addVendorAdvance: adminProcedure
    .input(z.object({
      vendorId: z.string().uuid(),
      amount: z.number().min(0),
      paymentDate: z.string(),
      paymentMode: z.enum(['Cash', 'Bank Transfer', 'UPI', 'Check', 'Credit Card', 'Other']).optional(),
      paidBy: z.string().min(1),
      notes: z.string().optional(),
      receiptUrl: z.string().optional(),
      receiptFileName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Find the budget entry linked to this vendor
      const [budgetItem] = await ctx.db
        .select({ id: budget.id, clientId: budget.clientId })
        .from(budget)
        .where(eq(budget.vendorId, input.vendorId))
        .limit(1)

      if (!budgetItem) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No budget entry found for this vendor. Please set a contract amount first.'
        })
      }

      // Create advance payment
      const [advance] = await ctx.db
        .insert(advancePayments)
        .values({
          id: crypto.randomUUID(),
          budgetItemId: budgetItem.id,
          amount: input.amount.toString(),
          paymentDate: input.paymentDate,
          paymentMode: input.paymentMode || null,
          paidBy: input.paidBy,
          notes: input.notes || null,
        })
        .returning()

      if (!advance) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create advance payment'
        })
      }

      // Update budget's paidAmount to reflect total advances
      const allAdvances = await ctx.db
        .select({ amount: advancePayments.amount })
        .from(advancePayments)
        .where(eq(advancePayments.budgetItemId, budgetItem.id))

      const totalPaid = allAdvances.reduce((sum, a) => sum + Number(a.amount), 0)

      await ctx.db
        .update(budget)
        .set({
          paidAmount: totalPaid.toString(),
          updatedAt: new Date(),
        })
        .where(eq(budget.id, budgetItem.id))

      await broadcastSync({
        type: 'insert',
        module: 'vendors',
        entityId: advance.id,
        companyId: ctx.companyId!,
        clientId: budgetItem.clientId,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary'],
      })

      return advance
    }),

  /**
   * Update an advance payment for a vendor.
   */
  updateVendorAdvance: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        amount: z.number().min(0).optional(),
        paymentDate: z.string().optional(),
        paymentMode: z.enum(['Cash', 'Bank Transfer', 'UPI', 'Check', 'Credit Card', 'Other']).optional(),
        paidBy: z.string().optional(),
        notes: z.string().optional(),
        receiptUrl: z.string().optional().nullable(),
        receiptFileName: z.string().optional().nullable(),
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
      if (input.data.receiptUrl !== undefined) updateData.receiptUrl = input.data.receiptUrl
      if (input.data.receiptFileName !== undefined) updateData.receiptFileName = input.data.receiptFileName

      const [advance] = await ctx.db
        .update(advancePayments)
        .set(updateData)
        .where(eq(advancePayments.id, input.id))
        .returning()

      if (!advance) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Advance payment not found'
        })
      }

      // Update budget's paidAmount to reflect total advances
      let advanceClientId: string | undefined
      if (advance.budgetItemId) {
        const allAdvances = await ctx.db
          .select({ amount: advancePayments.amount })
          .from(advancePayments)
          .where(eq(advancePayments.budgetItemId, advance.budgetItemId))

        const totalPaid = allAdvances.reduce((sum, a) => sum + Number(a.amount), 0)

        const [updatedBudgetItem] = await ctx.db
          .update(budget)
          .set({
            paidAmount: totalPaid.toString(),
            updatedAt: new Date(),
          })
          .where(eq(budget.id, advance.budgetItemId))
          .returning({ clientId: budget.clientId })

        advanceClientId = updatedBudgetItem?.clientId
      }

      await broadcastSync({
        type: 'update',
        module: 'vendors',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: advanceClientId,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary'],
      })

      return advance
    }),

  /**
   * Delete an advance payment for a vendor.
   */
  deleteVendorAdvance: adminProcedure
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

      // Delete the advance payment
      await ctx.db
        .delete(advancePayments)
        .where(eq(advancePayments.id, input.id))

      // Update budget's paidAmount to reflect remaining advances
      let deleteClientId: string | undefined
      if (advance.budgetItemId) {
        const remainingAdvances = await ctx.db
          .select({ amount: advancePayments.amount })
          .from(advancePayments)
          .where(eq(advancePayments.budgetItemId, advance.budgetItemId))

        const totalPaid = remainingAdvances.reduce((sum, a) => sum + Number(a.amount), 0)

        const [updatedBudgetItem] = await ctx.db
          .update(budget)
          .set({
            paidAmount: totalPaid.toString(),
            updatedAt: new Date(),
          })
          .where(eq(budget.id, advance.budgetItemId))
          .returning({ clientId: budget.clientId })

        deleteClientId = updatedBudgetItem?.clientId
      }

      await broadcastSync({
        type: 'delete',
        module: 'vendors',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: deleteClientId,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary'],
      })

      return { success: true }
    }),

  // ============================================
  // VENDOR RATING SYSTEM
  // Add reviews and aggregate ratings
  // ============================================

  /**
   * Add a review for a vendor (from company admin perspective)
   * Automatically recalculates vendor rating and review count
   */
  addReview: adminProcedure
    .input(z.object({
      vendorId: z.string().uuid(),
      clientId: z.string().uuid(),
      rating: z.number().min(1).max(5),
      reviewText: z.string().optional(),
      serviceQuality: z.number().min(1).max(5).optional(),
      communication: z.number().min(1).max(5).optional(),
      valueForMoney: z.number().min(1).max(5).optional(),
      wouldRecommend: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId || !ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
      }

      // Verify vendor belongs to this company
      const [vendor] = await ctx.db
        .select({ id: vendors.id })
        .from(vendors)
        .where(and(eq(vendors.id, input.vendorId), eq(vendors.companyId, ctx.companyId)))
        .limit(1)

      if (!vendor) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found' })
      }

      // Create the review
      const [review] = await ctx.db
        .insert(vendorReviews)
        .values({
          id: crypto.randomUUID(),
          vendorId: input.vendorId,
          clientId: input.clientId,
          userId: ctx.userId,
          rating: input.rating,
          reviewText: input.reviewText || null,
          serviceQuality: input.serviceQuality || null,
          communication: input.communication || null,
          valueForMoney: input.valueForMoney || null,
          wouldRecommend: input.wouldRecommend,
        })
        .returning()

      if (!review) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create review'
        })
      }

      // Recalculate average rating and update vendor
      const allReviews = await ctx.db
        .select({ rating: vendorReviews.rating })
        .from(vendorReviews)
        .where(eq(vendorReviews.vendorId, input.vendorId))

      const avgRating = Math.round(
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      )

      await ctx.db
        .update(vendors)
        .set({
          rating: avgRating,
          reviewCount: allReviews.length,
          updatedAt: new Date(),
        })
        .where(eq(vendors.id, input.vendorId))

      console.log(`[Vendor Reviews] Added review for vendor ${input.vendorId}: rating=${input.rating}, avgRating=${avgRating}, totalReviews=${allReviews.length}`)

      await broadcastSync({
        type: 'insert',
        module: 'vendors',
        entityId: review.id,
        companyId: ctx.companyId!,
        clientId: input.clientId,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll', 'vendors.getStats'],
      })

      return review
    }),

  /**
   * Get all reviews for a vendor
   */
  getReviews: adminProcedure
    .input(z.object({ vendorId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
      }

      const reviews = await ctx.db
        .select()
        .from(vendorReviews)
        .where(eq(vendorReviews.vendorId, input.vendorId))
        .orderBy(desc(vendorReviews.createdAt))

      return reviews
    }),

  /**
   * Delete a review and recalculate vendor rating
   */
  deleteReview: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
      }

      // Get the review to know which vendor to update
      const [review] = await ctx.db
        .select({ vendorId: vendorReviews.vendorId })
        .from(vendorReviews)
        .where(eq(vendorReviews.id, input.id))
        .limit(1)

      if (!review) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Review not found' })
      }

      // Delete the review
      await ctx.db
        .delete(vendorReviews)
        .where(eq(vendorReviews.id, input.id))

      // Recalculate average rating and update vendor
      const remainingReviews = await ctx.db
        .select({ rating: vendorReviews.rating })
        .from(vendorReviews)
        .where(eq(vendorReviews.vendorId, review.vendorId))

      const avgRating = remainingReviews.length > 0
        ? Math.round(remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length)
        : null

      await ctx.db
        .update(vendors)
        .set({
          rating: avgRating,
          reviewCount: remainingReviews.length,
          updatedAt: new Date(),
        })
        .where(eq(vendors.id, review.vendorId))

      await broadcastSync({
        type: 'delete',
        module: 'vendors',
        entityId: input.id,
        companyId: ctx.companyId!,
        userId: ctx.userId!,
        queryPaths: ['vendors.getAll', 'vendors.getStats'],
      })

      return { success: true }
    }),
})
