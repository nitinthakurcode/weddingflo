/**
 * Guest Transport Router
 *
 * Manages guest travel and transport logistics with cross-module sync.
 * December 2025 - Full implementation with Drizzle ORM
 */

import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { guestTransport, guests, clients } from '@/lib/db/schema'

export const guestTransportRouter = router({
  // Get all transport entries for a client
  getAll: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
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

      const transportList = await ctx.db
        .select()
        .from(guestTransport)
        .where(eq(guestTransport.clientId, input.clientId))
        .orderBy(asc(guestTransport.pickupDate))

      return transportList
    }),

  // Get transport stats
  getStats: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const transportList = await ctx.db
        .select()
        .from(guestTransport)
        .where(eq(guestTransport.clientId, input.clientId))

      const total = transportList.length
      const scheduled = transportList.filter(t => t.transportStatus === 'scheduled').length
      const inProgress = transportList.filter(t => t.transportStatus === 'in_progress').length
      const completed = transportList.filter(t => t.transportStatus === 'completed').length
      const cancelled = transportList.filter(t => t.transportStatus === 'cancelled').length

      return { total, scheduled, inProgress, completed, cancelled }
    }),

  // Create transport entry
  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      guestId: z.string().uuid().optional(),
      guestName: z.string().min(1),
      pickupDate: z.string().optional(),
      pickupTime: z.string().optional(),
      pickupFrom: z.string().optional(),
      dropTo: z.string().optional(),
      vehicleInfo: z.string().optional(),
      legType: z.enum(['arrival', 'departure', 'inter_event']).default('arrival'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const [transport] = await ctx.db
        .insert(guestTransport)
        .values({
          clientId: input.clientId,
          guestId: input.guestId || null,
          guestName: input.guestName,
          pickupDate: input.pickupDate || null,
          pickupFrom: input.pickupFrom || null,
          dropTo: input.dropTo || null,
          vehicleInfo: input.vehicleInfo || null,
          legType: input.legType,
          legSequence: 1,
          transportStatus: 'scheduled',
          notes: input.notes || null,
        })
        .returning()

      return transport
    }),

  // Update transport entry
  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        guestName: z.string().optional(),
        pickupDate: z.string().optional().nullable(),
        pickupTime: z.string().optional().nullable(),
        pickupFrom: z.string().optional().nullable(),
        dropTo: z.string().optional().nullable(),
        vehicleInfo: z.string().optional().nullable(),
        transportStatus: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
        legType: z.enum(['arrival', 'departure', 'inter_event']).optional(),
        notes: z.string().optional().nullable(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const [transport] = await ctx.db
        .update(guestTransport)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(guestTransport.id, input.id))
        .returning()

      return transport
    }),

  // Delete transport entry
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      await ctx.db
        .delete(guestTransport)
        .where(eq(guestTransport.id, input.id))

      return { success: true }
    }),

  // Sync transport with guests who have transport_required = true
  syncWithGuests: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
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

      // Get all guests with transport_required = true
      const guestsNeedingTransport = await ctx.db
        .select({
          id: guests.id,
          firstName: guests.firstName,
          lastName: guests.lastName,
          arrivalDatetime: guests.arrivalDatetime,
          arrivalMode: guests.arrivalMode,
          transportType: guests.transportType,
          transportPickupLocation: guests.transportPickupLocation,
          transportNotes: guests.transportNotes,
          hotelName: guests.hotelName,
        })
        .from(guests)
        .where(
          and(
            eq(guests.clientId, input.clientId),
            eq(guests.transportRequired, true)
          )
        )

      if (!guestsNeedingTransport || guestsNeedingTransport.length === 0) {
        return { synced: 0, message: 'No guests require transport' }
      }

      // Get existing transport records for this client
      const existingTransport = await ctx.db
        .select({ guestId: guestTransport.guestId })
        .from(guestTransport)
        .where(eq(guestTransport.clientId, input.clientId))

      const existingGuestIds = new Set(existingTransport.map(t => t.guestId).filter(Boolean))

      // Create transport records for guests who don't have one
      const newTransportRecords = guestsNeedingTransport
        .filter(guest => !existingGuestIds.has(guest.id))
        .map(guest => {
          // Parse pickup date/time from arrival datetime
          let pickupDate: string | null = null
          if (guest.arrivalDatetime) {
            pickupDate = new Date(guest.arrivalDatetime).toISOString().split('T')[0]
          }

          // Build vehicle info
          const vehicleParts: string[] = []
          if (guest.transportType) vehicleParts.push(guest.transportType)
          if (guest.arrivalMode) vehicleParts.push(`(${guest.arrivalMode})`)
          const vehicleInfo = vehicleParts.length > 0 ? vehicleParts.join(' ') : null

          return {
            clientId: input.clientId,
            guestId: guest.id,
            guestName: `${guest.firstName} ${guest.lastName || ''}`.trim(),
            pickupDate,
            pickupFrom: guest.transportPickupLocation || null,
            dropTo: guest.hotelName || null,
            vehicleInfo,
            legType: 'arrival' as const,
            legSequence: 1,
            transportStatus: 'scheduled',
            notes: guest.transportNotes || null,
          }
        })

      if (newTransportRecords.length > 0) {
        await ctx.db.insert(guestTransport).values(newTransportRecords)
      }

      return {
        synced: newTransportRecords.length,
        message: newTransportRecords.length > 0
          ? `Created ${newTransportRecords.length} transport record(s) from guest list`
          : 'All guests with transport requirements already have transport records'
      }
    }),

  // Legacy compatibility - list endpoint
  list: adminProcedure
    .input(z.object({ eventId: z.string().optional() }))
    .query(async () => {
      return []
    }),

  // Get all transport entries with guest information (party details)
  getAllWithGuests: adminProcedure
    .input(z.object({ clientId: z.string().uuid() }))
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

      const transportList = await ctx.db
        .select()
        .from(guestTransport)
        .where(eq(guestTransport.clientId, input.clientId))
        .orderBy(asc(guestTransport.pickupDate))

      // Get guest info for transport entries that have guestId
      const guestIds = transportList.map(t => t.guestId).filter(Boolean) as string[]

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
            relationshipToFamily: guests.relationshipToFamily,
          })
          .from(guests)
          .where(eq(guests.clientId, input.clientId))

        guestMap = guestList.reduce((acc, g) => {
          acc[g.id] = g
          return acc
        }, {} as Record<string, any>)
      }

      // Combine transport with guest info
      const transportWithGuests = transportList.map(transport => ({
        ...transport,
        guest: transport.guestId && guestMap[transport.guestId] ? guestMap[transport.guestId] : null,
      }))

      return transportWithGuests
    }),
})
