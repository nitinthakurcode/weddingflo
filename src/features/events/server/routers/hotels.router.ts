import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { hotels, clients, guests, timeline } from '@/lib/db/schema'
import { nanoid } from 'nanoid'

/**
 * Hotels tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for hotel accommodations with multi-tenant security.
 * Migrated from Supabase to Drizzle - December 2025
 */
export const hotelsRouter = router({
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

      // Fetch hotels
      const hotelList = await ctx.db
        .select()
        .from(hotels)
        .where(eq(hotels.clientId, input.clientId))
        .orderBy(asc(hotels.guestName))

      return hotelList
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [hotel] = await ctx.db
        .select()
        .from(hotels)
        .where(eq(hotels.id, input.id))
        .limit(1)

      if (!hotel) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return hotel
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      guestId: z.string().uuid().optional(),
      guestName: z.string().min(1),
      partySize: z.number().int().positive().optional(),
      guestNamesInRoom: z.string().optional(),
      roomAssignments: z.record(z.string(), z.object({
        guests: z.array(z.string()),
        roomType: z.string().optional(),
      })).optional(),
      hotelName: z.string().optional(),
      roomNumber: z.string().optional(),
      roomType: z.string().optional(),
      checkInDate: z.string().optional(),
      checkOutDate: z.string().optional(),
      accommodationNeeded: z.boolean().default(true),
      cost: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      // Also fetch wedding date for default check-in/out dates
      const [client] = await ctx.db
        .select({
          id: clients.id,
          weddingDate: clients.weddingDate,
        })
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

      // Calculate default check-in/out dates from wedding date if not provided
      let effectiveCheckIn = input.checkInDate || null
      let effectiveCheckOut = input.checkOutDate || null

      if (client.weddingDate) {
        const weddingDate = new Date(client.weddingDate)

        // Default check-in: day before wedding
        if (!effectiveCheckIn) {
          const checkIn = new Date(weddingDate)
          checkIn.setDate(checkIn.getDate() - 1)
          effectiveCheckIn = checkIn.toISOString().split('T')[0]
        }

        // Default check-out: day after wedding
        if (!effectiveCheckOut) {
          const checkOut = new Date(weddingDate)
          checkOut.setDate(checkOut.getDate() + 1)
          effectiveCheckOut = checkOut.toISOString().split('T')[0]
        }
      }

      // Create hotel record
      const [hotel] = await ctx.db
        .insert(hotels)
        .values({
          clientId: input.clientId,
          guestId: input.guestId || null,
          guestName: input.guestName,
          partySize: input.partySize || 1,
          guestNamesInRoom: input.guestNamesInRoom || null,
          roomAssignments: input.roomAssignments || {},
          hotelName: input.hotelName || null,
          roomNumber: input.roomNumber || null,
          roomType: input.roomType || null,
          checkInDate: effectiveCheckIn,
          checkOutDate: effectiveCheckOut,
          accommodationNeeded: input.accommodationNeeded,
          cost: input.cost?.toString() || null,
          notes: input.notes || null,
        })
        .returning()

      if (!hotel) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create hotel record'
        })
      }

      // TIMELINE SYNC: Create timeline entry for check-in if date is provided
      if (effectiveCheckIn && hotel) {
        try {
          const checkInDateTime = new Date(effectiveCheckIn)
          // Default check-in time is 3 PM
          checkInDateTime.setHours(15, 0, 0, 0)

          await ctx.db.insert(timeline).values({
            id: nanoid(),
            clientId: input.clientId,
            title: `Hotel Check-in: ${input.guestName}`,
            description: input.hotelName ? `Check-in at ${input.hotelName}` : 'Guest hotel check-in',
            startTime: checkInDateTime,
            location: input.hotelName || null,
            notes: input.notes || null,
            sourceModule: 'hotels',
            sourceId: hotel.id,
            metadata: JSON.stringify({
              guestId: input.guestId,
              type: 'check-in',
            }),
          })
          console.log(`[Timeline] Created hotel check-in entry: ${input.guestName}`)
        } catch (timelineError) {
          console.warn('[Timeline] Failed to create timeline entry for hotel:', timelineError)
        }
      }

      return hotel
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        guestName: z.string().optional(),
        partySize: z.number().int().positive().optional(),
        guestNamesInRoom: z.string().optional(),
        roomAssignments: z.record(z.string(), z.object({
          guests: z.array(z.string()),
          roomType: z.string().optional(),
        })).optional(),
        hotelName: z.string().optional(),
        roomNumber: z.string().optional(),
        roomType: z.string().optional(),
        checkInDate: z.string().optional(),
        checkOutDate: z.string().optional(),
        accommodationNeeded: z.boolean().optional(),
        bookingConfirmed: z.boolean().optional(),
        checkedIn: z.boolean().optional(),
        cost: z.number().optional(),
        paymentStatus: z.enum(['pending', 'paid', 'overdue']).optional(),
        notes: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Build update object
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (input.data.guestName !== undefined) updateData.guestName = input.data.guestName
      if (input.data.partySize !== undefined) updateData.partySize = input.data.partySize
      if (input.data.guestNamesInRoom !== undefined) updateData.guestNamesInRoom = input.data.guestNamesInRoom
      if (input.data.roomAssignments !== undefined) updateData.roomAssignments = input.data.roomAssignments
      if (input.data.hotelName !== undefined) updateData.hotelName = input.data.hotelName
      if (input.data.roomNumber !== undefined) updateData.roomNumber = input.data.roomNumber
      if (input.data.roomType !== undefined) updateData.roomType = input.data.roomType
      if (input.data.checkInDate !== undefined) updateData.checkInDate = input.data.checkInDate
      if (input.data.checkOutDate !== undefined) updateData.checkOutDate = input.data.checkOutDate
      if (input.data.accommodationNeeded !== undefined) updateData.accommodationNeeded = input.data.accommodationNeeded
      if (input.data.bookingConfirmed !== undefined) updateData.bookingConfirmed = input.data.bookingConfirmed
      if (input.data.checkedIn !== undefined) updateData.checkedIn = input.data.checkedIn
      if (input.data.cost !== undefined) updateData.cost = input.data.cost.toString()
      if (input.data.paymentStatus !== undefined) updateData.paymentStatus = input.data.paymentStatus
      if (input.data.notes !== undefined) updateData.notes = input.data.notes

      // Update hotel
      const [hotel] = await ctx.db
        .update(hotels)
        .set(updateData)
        .where(eq(hotels.id, input.id))
        .returning()

      if (!hotel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hotel record not found'
        })
      }

      // TIMELINE SYNC: Update linked timeline entry using efficient DB query
      try {
        const hasCheckInDate = input.data.checkInDate !== undefined ? input.data.checkInDate : hotel.checkInDate

        if (hasCheckInDate) {
          const guestName = input.data.guestName || hotel.guestName
          const hotelName = input.data.hotelName !== undefined ? input.data.hotelName : hotel.hotelName
          const notes = input.data.notes !== undefined ? input.data.notes : hotel.notes

          const checkInDateTime = new Date(hasCheckInDate)
          checkInDateTime.setHours(15, 0, 0, 0)

          const timelineData = {
            title: `Hotel Check-in: ${guestName}`,
            description: hotelName ? `Check-in at ${hotelName}` : 'Guest hotel check-in',
            startTime: checkInDateTime,
            location: hotelName || null,
            notes: notes || null,
            updatedAt: new Date(),
          }

          // Try to update existing entry first
          const result = await ctx.db
            .update(timeline)
            .set(timelineData)
            .where(
              and(
                eq(timeline.sourceModule, 'hotels'),
                eq(timeline.sourceId, input.id)
              )
            )
            .returning({ id: timeline.id })

          if (result.length === 0) {
            // No existing entry - create new one
            await ctx.db.insert(timeline).values({
              id: nanoid(),
              clientId: hotel.clientId,
              ...timelineData,
              sourceModule: 'hotels',
              sourceId: hotel.id,
              metadata: JSON.stringify({
                guestId: hotel.guestId,
                type: 'check-in',
              }),
            })
            console.log(`[Timeline] Created hotel check-in entry: ${guestName}`)
          } else {
            console.log(`[Timeline] Updated hotel check-in entry: ${guestName}`)
          }
        } else {
          // Check-in date cleared - delete timeline entry
          await ctx.db
            .delete(timeline)
            .where(
              and(
                eq(timeline.sourceModule, 'hotels'),
                eq(timeline.sourceId, input.id)
              )
            )
          console.log(`[Timeline] Deleted hotel check-in entry (date cleared)`)
        }
      } catch (timelineError) {
        console.warn('[Timeline] Failed to sync timeline with hotel update:', timelineError)
      }

      return hotel
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      await ctx.db
        .delete(hotels)
        .where(eq(hotels.id, input.id))

      // TIMELINE SYNC: Delete linked timeline entry using efficient DB query
      try {
        await ctx.db
          .delete(timeline)
          .where(
            and(
              eq(timeline.sourceModule, 'hotels'),
              eq(timeline.sourceId, input.id)
            )
          )
        console.log(`[Timeline] Deleted hotel check-in entry`)
      } catch (timelineError) {
        console.warn('[Timeline] Failed to delete timeline entry for hotel:', timelineError)
      }

      return { success: true }
    }),

  checkIn: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      const [hotel] = await ctx.db
        .update(hotels)
        .set({
          checkedIn: true,
          updatedAt: new Date(),
        })
        .where(eq(hotels.id, input.id))
        .returning()

      if (!hotel) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hotel record not found'
        })
      }

      return hotel
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

      // Get hotels
      const hotelList = await ctx.db
        .select({
          bookingConfirmed: hotels.bookingConfirmed,
          checkedIn: hotels.checkedIn,
          accommodationNeeded: hotels.accommodationNeeded,
        })
        .from(hotels)
        .where(eq(hotels.clientId, input.clientId))

      const stats = {
        total: hotelList.length,
        needingAccommodation: hotelList.filter(h => h.accommodationNeeded).length,
        bookingConfirmed: hotelList.filter(h => h.bookingConfirmed).length,
        checkedIn: hotelList.filter(h => h.checkedIn).length,
        pending: hotelList.filter(h => h.accommodationNeeded && !h.bookingConfirmed).length,
      }

      return stats
    }),

  // Sync hotels with guests who have hotel_required = true
  syncWithGuests: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
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

      // Get all guests with hotel_required = true
      const guestsNeedingHotel = await ctx.db
        .select({
          id: guests.id,
          firstName: guests.firstName,
          lastName: guests.lastName,
          hotelName: guests.hotelName,
          hotelCheckIn: guests.hotelCheckIn,
          hotelCheckOut: guests.hotelCheckOut,
          hotelRoomType: guests.hotelRoomType,
          arrivalDatetime: guests.arrivalDatetime,
          departureDatetime: guests.departureDatetime,
          additionalGuestNames: guests.additionalGuestNames,
          partySize: guests.partySize,
        })
        .from(guests)
        .where(
          and(
            eq(guests.clientId, input.clientId),
            eq(guests.hotelRequired, true)
          )
        )

      if (!guestsNeedingHotel || guestsNeedingHotel.length === 0) {
        return { synced: 0, message: 'No guests require hotel accommodation' }
      }

      // Get existing hotel records for this client
      const existingHotels = await ctx.db
        .select({ guestId: hotels.guestId })
        .from(hotels)
        .where(eq(hotels.clientId, input.clientId))

      const existingGuestIds = new Set(existingHotels.map(h => h.guestId).filter(Boolean))

      // Create hotel records for guests who don't have one
      const newHotelRecords = guestsNeedingHotel
        .filter(guest => !existingGuestIds.has(guest.id))
        .map(guest => {
          // Use hotel-specific dates if available, otherwise fall back to arrival/departure
          const checkInDate = guest.hotelCheckIn ||
            (guest.arrivalDatetime ? new Date(guest.arrivalDatetime).toISOString().split('T')[0] : null)
          const checkOutDate = guest.hotelCheckOut ||
            (guest.departureDatetime ? new Date(guest.departureDatetime).toISOString().split('T')[0] : null)

          return {
            clientId: input.clientId,
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName || ''}`.trim(),
            partySize: guest.partySize || 1,
            hotelName: guest.hotelName || null,
            checkInDate,
            checkOutDate,
            roomType: guest.hotelRoomType || null,
            accommodationNeeded: true,
          }
        })

      if (newHotelRecords.length > 0) {
        await ctx.db
          .insert(hotels)
          .values(newHotelRecords)
      }

      return {
        synced: newHotelRecords.length,
        total: guestsNeedingHotel.length,
        message: `Synced ${newHotelRecords.length} new hotel records`
      }
    }),

  // Get hotels with guest information
  getAllWithGuests: adminProcedure
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

      // Fetch hotels - Drizzle doesn't have automatic joins like Supabase
      // So we fetch hotels first, then guests separately if needed
      const hotelList = await ctx.db
        .select()
        .from(hotels)
        .where(eq(hotels.clientId, input.clientId))
        .orderBy(asc(hotels.guestName))

      // Get guest info for hotels that have guestId
      const guestIds = hotelList.map(h => h.guestId).filter(Boolean) as string[]

      let guestMap: Record<string, any> = {}
      if (guestIds.length > 0) {
        const guestList = await ctx.db
          .select({
            id: guests.id,
            firstName: guests.firstName,
            lastName: guests.lastName,
            email: guests.email,
            phone: guests.phone,
            partySize: guests.partySize,
            additionalGuestNames: guests.additionalGuestNames,
            arrivalDatetime: guests.arrivalDatetime,
            departureDatetime: guests.departureDatetime,
            relationshipToFamily: guests.relationshipToFamily,
          })
          .from(guests)
          .where(eq(guests.clientId, input.clientId))

        guestMap = guestList.reduce((acc, g) => {
          acc[g.id] = g
          return acc
        }, {} as Record<string, any>)
      }

      // Combine hotels with guest info
      const hotelsWithGuests = hotelList.map(hotel => ({
        ...hotel,
        guests: hotel.guestId && guestMap[hotel.guestId] ? guestMap[hotel.guestId] : null,
      }))

      return hotelsWithGuests
    }),
})
