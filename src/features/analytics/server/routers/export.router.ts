import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { exportToExcel, exportToPDF } from '@/lib/export/export-utils'
import { eq, and } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'

export const exportRouter = router({
  exportClientData: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      format: z.enum(['excel', 'pdf']),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify client belongs to company using standard select
      const [client] = await ctx.db
        .select()
        .from(schema.clients)
        .where(and(
          eq(schema.clients.id, input.clientId),
          eq(schema.clients.companyId, ctx.companyId)
        ))
        .limit(1)

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get company info using standard select
      const [company] = await ctx.db
        .select()
        .from(schema.companies)
        .where(eq(schema.companies.id, ctx.companyId))
        .limit(1)

      // Fetch all data in parallel using standard selects
      // Note: Some tables don't have deletedAt column, so we only filter where applicable
      const [guests, hotels, guestGiftsRaw, giftItemsRaw, giftTypesRaw, budgetItems, events, timelineItems, documents, guestTransportRaw, vendors] = await Promise.all([
        ctx.db.select().from(schema.guests)
          .where(eq(schema.guests.clientId, input.clientId)),
        ctx.db.select().from(schema.hotels)
          .where(eq(schema.hotels.clientId, input.clientId)),
        ctx.db.select().from(schema.guestGifts)
          .where(eq(schema.guestGifts.clientId, input.clientId)),
        ctx.db.select().from(schema.giftItems),
        ctx.db.select().from(schema.giftTypes)
          .where(eq(schema.giftTypes.companyId, ctx.companyId)),
        ctx.db.select().from(schema.budget)
          .where(eq(schema.budget.clientId, input.clientId)),
        ctx.db.select().from(schema.events)
          .where(eq(schema.events.clientId, input.clientId)),
        ctx.db.select().from(schema.timeline)
          .where(eq(schema.timeline.clientId, input.clientId)),
        ctx.db.select().from(schema.documents)
          .where(eq(schema.documents.clientId, input.clientId)),
        ctx.db.select().from(schema.guestTransport)
          .where(eq(schema.guestTransport.clientId, input.clientId)),
        ctx.db.select().from(schema.vendors)
          .where(eq(schema.vendors.companyId, ctx.companyId)),
      ])

      // Create lookup map for guests
      const guestsMap = new Map(guests.map((g) => [g.id, g]))

      // Transform guestGifts to match expected export format
      const gifts = guestGiftsRaw.map((gg) => {
        const guest = guestsMap.get(gg.guestId || '')
        return {
          id: gg.id,
          guest_name: guest ? `${guest.firstName || ''} ${guest.lastName || ''}`.trim() : '',
          guestName: guest ? `${guest.firstName || ''} ${guest.lastName || ''}`.trim() : '',
          guest_group: guest?.groupName || '',
          guestGroup: guest?.groupName || '',
          gift_item: gg.name || '',
          giftItem: gg.name || '',
          gift_type: gg.type || '',
          giftType: gg.type || '',
          quantity: gg.quantity || 1,
        }
      })

      // Enrich guestTransport with guest data
      const guestTransport = guestTransportRaw.map((gt) => {
        const guest = guestsMap.get(gt.guestId || '')
        return {
          ...gt,
          guest,
          guestName: guest ? `${guest.firstName || ''} ${guest.lastName || ''}`.trim() : '',
        }
      })

      const exportData = {
        company: {
          name: company?.name || 'Unknown Company',
          logo_url: company?.logoUrl || undefined,
        },
        client: {
          name: `${client.partner1FirstName} ${client.partner1LastName}${client.partner2FirstName ? ` & ${client.partner2FirstName} ${client.partner2LastName}` : ''}`,
          wedding_date: client.weddingDate || 'TBD',
        },
        guests: guests || [],
        hotels: hotels || [],
        gifts: gifts || [],
        transport: guestTransport || [],
        vendors: vendors || [],
        budget: budgetItems || [],
        events: events || [],
        timeline: timelineItems || [],
        documents: documents || [],
      }

      // Generate export
      let buffer: ArrayBuffer
      let filename: string
      let mimeType: string

      if (input.format === 'excel') {
        buffer = await exportToExcel(exportData)
        filename = `${exportData.client.name.replace(/\s/g, '_')}_Wedding_Data.xlsx`
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } else {
        buffer = await exportToPDF(exportData)
        filename = `${exportData.client.name.replace(/\s/g, '_')}_Wedding_Data.pdf`
        mimeType = 'application/pdf'
      }

      // Convert to base64
      const base64 = Buffer.from(buffer).toString('base64')

      return {
        filename,
        mimeType,
        data: base64,
      }
    }),
})
