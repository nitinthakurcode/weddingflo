import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc/trpc'
import { db, eq, and, sql } from '@/lib/db'
import { clients, guests, clientVendors, timeline, weddingWebsites } from '@/lib/db/schema'
import { TRPCError } from '@trpc/server'

export const portalRouter = router({
  /**
   * Get wedding planning progress for the client portal
   * Returns completion status for various milestones
   */
  getWeddingProgress: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { companyId } = ctx
      const { clientId } = input

      if (!companyId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Company context required',
        })
      }

      // Verify client belongs to company (or user is client)
      const clientResult = await db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.companyId, companyId)
          )
        )
        .limit(1)

      if (!clientResult[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        })
      }

      // Get guest count and RSVP stats
      const guestStats = await db
        .select({
          total: sql<number>`count(*)::int`,
          attending: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'confirmed')::int`,
          notAttending: sql<number>`count(*) filter (where ${guests.rsvpStatus} = 'declined')::int`,
          responded: sql<number>`count(*) filter (where ${guests.rsvpStatus} != 'pending' and ${guests.rsvpStatus} is not null)::int`,
        })
        .from(guests)
        .where(eq(guests.clientId, clientId))

      const guestData = guestStats[0] || { total: 0, attending: 0, notAttending: 0, responded: 0 }
      const rsvpPercentage = guestData.total > 0
        ? Math.round((guestData.responded / guestData.total) * 100)
        : 0

      // Get vendor stats
      const vendorStats = await db
        .select({
          total: sql<number>`count(*)::int`,
          confirmed: sql<number>`count(*) filter (where ${clientVendors.status} = 'confirmed')::int`,
        })
        .from(clientVendors)
        .where(eq(clientVendors.clientId, clientId))

      const vendorData = vendorStats[0] || { total: 0, confirmed: 0 }

      // Get timeline item count
      const timelineStats = await db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(timeline)
        .where(eq(timeline.clientId, clientId))

      const timelineItemCount = timelineStats[0]?.count || 0

      // Check if website is published
      const websiteResult = await db
        .select({
          isPublished: weddingWebsites.published,
        })
        .from(weddingWebsites)
        .where(eq(weddingWebsites.clientId, clientId))
        .limit(1)

      const websitePublished = websiteResult[0]?.isPublished ?? false

      return {
        // Guest stats
        hasGuests: guestData.total > 0,
        guestCount: guestData.total,
        attendingCount: guestData.attending,
        notAttendingCount: guestData.notAttending,
        rsvpPercentage,

        // Vendor stats
        hasVendors: vendorData.total > 0,
        vendorCount: vendorData.total,
        confirmedVendors: vendorData.confirmed,

        // Timeline stats
        hasTimeline: timelineItemCount > 0,
        timelineItemCount,

        // Website
        websitePublished,
      }
    }),
})
