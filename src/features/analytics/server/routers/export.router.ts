import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { exportToExcel, exportToPDF } from '@/lib/export/export-utils'
import { eq, and, isNull } from 'drizzle-orm'
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

      // Verify client belongs to company
      const client = await ctx.db.query.clients.findFirst({
        where: and(
          eq(schema.clients.id, input.clientId),
          eq(schema.clients.companyId, ctx.companyId)
        ),
      })

      if (!client) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // Get company info
      const company = await ctx.db.query.companies.findFirst({
        where: eq(schema.companies.id, ctx.companyId),
      })

      // Fetch all data in parallel - use guestGifts for gift data (December 2025 schema)
      const [guests, hotels, guestGiftsRaw, giftItemsRaw, giftTypesRaw, budget, events, timeline, documents, guestTransportRaw] = await Promise.all([
        ctx.db.query.guests?.findMany({
          where: and(eq(schema.guests.clientId, input.clientId), isNull(schema.guests.deletedAt))
        }) || Promise.resolve([]),
        ctx.db.query.hotels?.findMany({
          where: and(eq(schema.hotels.clientId, input.clientId), isNull(schema.hotels.deletedAt))
        }) || Promise.resolve([]),
        // Fetch guestGifts without relations (relations not defined in schema)
        ctx.db.query.guestGifts?.findMany({
          where: and(eq(schema.guestGifts.clientId, input.clientId), eq(schema.guestGifts.isEnabled, true)),
        }) || Promise.resolve([]),
        // Fetch gift items separately for manual join
        ctx.db.query.giftItems?.findMany({
          where: eq(schema.giftItems.clientId, input.clientId),
        }) || Promise.resolve([]),
        // Fetch gift types separately for manual join
        ctx.db.query.giftTypes?.findMany({
          where: eq(schema.giftTypes.clientId, input.clientId),
        }) || Promise.resolve([]),
        ctx.db.query.budget?.findMany({
          where: and(eq(schema.budget.clientId, input.clientId), isNull(schema.budget.deletedAt))
        }) || Promise.resolve([]),
        ctx.db.query.events?.findMany({
          where: and(eq(schema.events.clientId, input.clientId), isNull(schema.events.deletedAt))
        }) || Promise.resolve([]),
        ctx.db.query.timeline?.findMany({
          where: and(eq(schema.timeline.clientId, input.clientId), isNull(schema.timeline.deletedAt))
        }) || Promise.resolve([]),
        ctx.db.query.documents?.findMany({
          where: and(eq(schema.documents.clientId, input.clientId), isNull(schema.documents.deletedAt))
        }) || Promise.resolve([]),
        ctx.db.query.guestTransport?.findMany({
          where: eq(schema.guestTransport.clientId, input.clientId)
        }) || Promise.resolve([]),
      ])

      // Create lookup maps for manual joining
      const guestsMap = new Map((guests || []).map((g: any) => [g.id, g]))
      const giftItemsMap = new Map((giftItemsRaw || []).map((gi: any) => [gi.id, gi]))
      const giftTypesMap = new Map((giftTypesRaw || []).map((gt: any) => [gt.id, gt]))

      // Enrich guestGifts with related data
      const guestGifts = (guestGiftsRaw || []).map((gg: any) => {
        const guest = guestsMap.get(gg.guestId)
        const giftItem = giftItemsMap.get(gg.giftItemId)
        const giftType = giftItem ? giftTypesMap.get(giftItem.giftTypeId) : null
        return {
          ...gg,
          guest,
          giftItem: giftItem ? { ...giftItem, giftType } : null,
        }
      })

      // Transform guestGifts to match expected export format
      const gifts = (guestGifts || []).map((gg: any) => ({
        id: gg.id,
        guest_name: gg.guest ? `${gg.guest.firstName || ''} ${gg.guest.lastName || ''}`.trim() : '',
        guestName: gg.guest ? `${gg.guest.firstName || ''} ${gg.guest.lastName || ''}`.trim() : '',
        guest_group: gg.guest?.groupName || '',
        guestGroup: gg.guest?.groupName || '',
        gift_item: gg.giftItem?.name || gg.giftName || '',
        giftItem: gg.giftItem?.name || gg.giftName || '',
        gift_type: gg.giftItem?.giftType?.name || '',
        giftType: gg.giftItem?.giftType?.name || '',
        quantity: gg.quantity || 1,
        delivery_date: gg.deliveryDate,
        deliveryDate: gg.deliveryDate,
        delivery_time: gg.deliveryTime,
        deliveryTime: gg.deliveryTime,
        delivery_location: gg.deliveryLocation,
        deliveryLocation: gg.deliveryLocation,
        delivery_status: gg.deliveryStatus,
        deliveryStatus: gg.deliveryStatus,
        delivered_by: gg.deliveredBy,
        deliveredBy: gg.deliveredBy,
        delivered_at: gg.deliveredAt,
        deliveredAt: gg.deliveredAt,
        notes: gg.notes || gg.deliveryNotes,
        deliveryNotes: gg.deliveryNotes,
      }))

      // Enrich guestTransport with guest data
      const guestTransport = (guestTransportRaw || []).map((gt: any) => {
        const guest = guestsMap.get(gt.guestId)
        return {
          ...gt,
          guest,
          guestName: guest ? `${guest.firstName || ''} ${guest.lastName || ''}`.trim() : '',
        }
      })

      // Vendors are company-level, not client-level
      const vendors = await ctx.db.query.vendors?.findMany({ where: eq(schema.vendors.companyId, ctx.companyId) }) || []

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
        budget: budget || [],
        events: events || [],
        timeline: timeline || [],
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
