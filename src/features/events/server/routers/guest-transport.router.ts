/**
 * Guest Transport Router
 *
 * Manages guest travel and transport logistics with cross-module sync.
 * December 2025 - Full implementation with Drizzle ORM
 * January 2026 - Added fleet vehicle tracking with auto-availability
 */

import { router, adminProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, isNull, asc, or, lte } from 'drizzle-orm'
import { guestTransport, guests, clients, timeline, vehicles } from '@/lib/db/schema'
import { nanoid } from 'nanoid'
import { withTransaction } from '@/features/chatbot/server/services/transaction-wrapper'

// Vehicle types available for selection
const VEHICLE_TYPES = ['sedan', 'suv', 'bus', 'van', 'tempo', 'minibus', 'luxury', 'other'] as const

/**
 * Calculate estimated available time based on pickup date/time
 * Adds 1 hour buffer after the scheduled pickup for drop completion
 */
function calculateAvailableAt(pickupDate: string | null, pickupTime: string | null): Date | null {
  if (!pickupDate) return null

  const dateTime = new Date(pickupDate)
  if (pickupTime) {
    const [hours, minutes] = pickupTime.split(':').map(Number)
    dateTime.setHours(hours || 0, minutes || 0, 0, 0)
  }
  // Add 2 hours buffer for drop completion
  dateTime.setHours(dateTime.getHours() + 2)
  return dateTime
}

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
      vehicleType: z.string().optional(),
      vehicleNumber: z.string().optional(),
      driverPhone: z.string().optional(),
      coordinatorPhone: z.string().optional(),
      legType: z.enum(['arrival', 'departure', 'inter_event']).default('arrival'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Execute all transport creation operations atomically within a transaction
      const result = await withTransaction(async (tx) => {
        // Track cascade actions for frontend notification
        const cascadeActions: { module: string; action: string; count: number }[] = []
        let vehicleId: string | null = null

        // 1. VEHICLE TRACKING: Auto-create or update vehicle record if vehicle number is provided (within transaction)
        if (input.vehicleNumber) {
          const [existingVehicle] = await tx
            .select()
            .from(vehicles)
            .where(
              and(
                eq(vehicles.clientId, input.clientId),
                eq(vehicles.vehicleNumber, input.vehicleNumber)
              )
            )
            .limit(1)

          const availableAt = calculateAvailableAt(input.pickupDate || null, input.pickupTime || null)

          if (existingVehicle) {
            // Update existing vehicle
            vehicleId = existingVehicle.id
            await tx
              .update(vehicles)
              .set({
                vehicleType: input.vehicleType || existingVehicle.vehicleType,
                driverPhone: input.driverPhone || existingVehicle.driverPhone,
                coordinatorPhone: input.coordinatorPhone || existingVehicle.coordinatorPhone,
                status: 'in_use',
                availableAt,
                updatedAt: new Date(),
              })
              .where(eq(vehicles.id, existingVehicle.id))
          } else {
            // Create new vehicle record
            const [newVehicle] = await tx
              .insert(vehicles)
              .values({
                clientId: input.clientId,
                vehicleNumber: input.vehicleNumber,
                vehicleType: input.vehicleType || null,
                driverPhone: input.driverPhone || null,
                coordinatorPhone: input.coordinatorPhone || null,
                status: 'in_use',
                availableAt,
              })
              .returning()
            vehicleId = newVehicle.id
            cascadeActions.push({ module: 'vehicle', action: 'created', count: 1 })
          }
        }

        // 2. Create transport record (within transaction)
        const [transport] = await tx
          .insert(guestTransport)
          .values({
            clientId: input.clientId,
            guestId: input.guestId || null,
            guestName: input.guestName,
            pickupDate: input.pickupDate || null,
            pickupFrom: input.pickupFrom || null,
            dropTo: input.dropTo || null,
            vehicleInfo: input.vehicleInfo || null,
            vehicleType: input.vehicleType || null,
            vehicleNumber: input.vehicleNumber || null,
            vehicleId,
            driverPhone: input.driverPhone || null,
            coordinatorPhone: input.coordinatorPhone || null,
            legType: input.legType,
            legSequence: 1,
            transportStatus: 'scheduled',
            notes: input.notes || null,
          })
          .returning()

        // 3. Update vehicle with current transport ID (within transaction)
        if (vehicleId && transport) {
          await tx
            .update(vehicles)
            .set({ currentTransportId: transport.id })
            .where(eq(vehicles.id, vehicleId))
        }

        // 4. TIMELINE SYNC: Create timeline entry if pickupDate is provided (within transaction)
        if (input.pickupDate && transport) {
          const legTypeLabels: Record<string, string> = {
            arrival: 'Arrival',
            departure: 'Departure',
            inter_event: 'Transfer',
          }
          const legLabel = legTypeLabels[input.legType] || 'Transport'

          // Parse pickup date/time
          let startDateTime = new Date(input.pickupDate)
          if (input.pickupTime) {
            const [hours, minutes] = input.pickupTime.split(':').map(Number)
            startDateTime.setHours(hours || 0, minutes || 0, 0, 0)
          }

          // Build location string
          const locationParts: string[] = []
          if (input.pickupFrom) locationParts.push(`From: ${input.pickupFrom}`)
          if (input.dropTo) locationParts.push(`To: ${input.dropTo}`)
          const location = locationParts.join(' → ') || null

          await tx.insert(timeline).values({
            id: nanoid(),
            clientId: input.clientId,
            title: `${legLabel}: ${input.guestName}`,
            description: input.vehicleInfo || `Guest transport - ${legLabel.toLowerCase()}`,
            startTime: startDateTime,
            location,
            notes: input.notes || null,
            sourceModule: 'transport',
            sourceId: transport.id,
            metadata: JSON.stringify({ guestId: input.guestId, legType: input.legType }),
          })
          cascadeActions.push({ module: 'timeline', action: 'created', count: 1 })
          console.log(`[Timeline] Created transport entry: ${legLabel} - ${input.guestName}`)
        }

        return { transport, cascadeActions }
      })

      console.log(`[Transport Create] Created transport ${result.transport.id} with cascade:`, result.cascadeActions)

      return {
        ...result.transport,
        cascadeActions: result.cascadeActions,
      }
    }),

  // Update transport entry
  // TRANSACTION: All update operations including vehicle and timeline sync are atomic
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
        vehicleType: z.string().optional().nullable(),
        vehicleNumber: z.string().optional().nullable(),
        driverPhone: z.string().optional().nullable(),
        coordinatorPhone: z.string().optional().nullable(),
        transportStatus: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
        legType: z.enum(['arrival', 'departure', 'inter_event']).optional(),
        notes: z.string().optional().nullable(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Get existing transport to check for vehicle changes (outside transaction for validation)
      const [existingTransport] = await ctx.db
        .select()
        .from(guestTransport)
        .where(eq(guestTransport.id, input.id))
        .limit(1)

      if (!existingTransport) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Transport not found' })
      }

      // Execute all transport update operations atomically within a transaction
      const result = await withTransaction(async (tx) => {
        // Track cascade actions for frontend notification
        const cascadeActions: { module: string; action: string; count: number }[] = []

        let vehicleId = existingTransport.vehicleId
        const newVehicleNumber = input.data.vehicleNumber !== undefined ? input.data.vehicleNumber : existingTransport.vehicleNumber
        const newStatus = input.data.transportStatus || existingTransport.transportStatus

        // 1. VEHICLE TRACKING: Handle vehicle assignment changes (within transaction)
        if (newVehicleNumber) {
          // Check if vehicle changed
          if (newVehicleNumber !== existingTransport.vehicleNumber) {
            // Release old vehicle if any
            if (existingTransport.vehicleId) {
              await tx
                .update(vehicles)
                .set({
                  status: 'available',
                  currentTransportId: null,
                  availableAt: null,
                  updatedAt: new Date(),
                })
                .where(eq(vehicles.id, existingTransport.vehicleId))
              cascadeActions.push({ module: 'vehicle', action: 'released', count: 1 })
            }

            // Find or create new vehicle
            const [existingVehicle] = await tx
              .select()
              .from(vehicles)
              .where(
                and(
                  eq(vehicles.clientId, existingTransport.clientId),
                  eq(vehicles.vehicleNumber, newVehicleNumber)
                )
              )
              .limit(1)

            const pickupDate = input.data.pickupDate !== undefined ? input.data.pickupDate : existingTransport.pickupDate
            const pickupTime = input.data.pickupTime !== undefined ? input.data.pickupTime : null
            const availableAt = calculateAvailableAt(pickupDate, pickupTime)

            if (existingVehicle) {
              vehicleId = existingVehicle.id
              cascadeActions.push({ module: 'vehicle', action: 'assigned', count: 1 })
            } else {
              // Create new vehicle record
              const [newVehicle] = await tx
                .insert(vehicles)
                .values({
                  clientId: existingTransport.clientId,
                  vehicleNumber: newVehicleNumber,
                  vehicleType: input.data.vehicleType || null,
                  driverPhone: input.data.driverPhone || null,
                  coordinatorPhone: input.data.coordinatorPhone || null,
                  status: newStatus === 'completed' || newStatus === 'cancelled' ? 'available' : 'in_use',
                  availableAt: newStatus === 'completed' || newStatus === 'cancelled' ? null : availableAt,
                  currentTransportId: newStatus === 'completed' || newStatus === 'cancelled' ? null : input.id,
                })
                .returning()
              vehicleId = newVehicle.id
              cascadeActions.push({ module: 'vehicle', action: 'created', count: 1 })
            }
          }

          // Update vehicle status based on transport status
          if (vehicleId) {
            const pickupDate = input.data.pickupDate !== undefined ? input.data.pickupDate : existingTransport.pickupDate
            const pickupTime = input.data.pickupTime !== undefined ? input.data.pickupTime : null
            const availableAt = calculateAvailableAt(pickupDate, pickupTime)

            if (newStatus === 'completed' || newStatus === 'cancelled') {
              // Transport done - mark vehicle as available
              await tx
                .update(vehicles)
                .set({
                  status: 'available',
                  currentTransportId: null,
                  availableAt: null,
                  vehicleType: input.data.vehicleType || undefined,
                  driverPhone: input.data.driverPhone || undefined,
                  coordinatorPhone: input.data.coordinatorPhone || undefined,
                  updatedAt: new Date(),
                })
                .where(eq(vehicles.id, vehicleId))
            } else {
              // Transport active - mark vehicle as in_use with estimated availability
              await tx
                .update(vehicles)
                .set({
                  status: 'in_use',
                  currentTransportId: input.id,
                  availableAt,
                  vehicleType: input.data.vehicleType || undefined,
                  driverPhone: input.data.driverPhone || undefined,
                  coordinatorPhone: input.data.coordinatorPhone || undefined,
                  updatedAt: new Date(),
                })
                .where(eq(vehicles.id, vehicleId))
            }
          }
        } else if (existingTransport.vehicleId && !newVehicleNumber) {
          // Vehicle number cleared - release the vehicle
          await tx
            .update(vehicles)
            .set({
              status: 'available',
              currentTransportId: null,
              availableAt: null,
              updatedAt: new Date(),
            })
            .where(eq(vehicles.id, existingTransport.vehicleId))
          vehicleId = null
          cascadeActions.push({ module: 'vehicle', action: 'released', count: 1 })
        }

        // 2. Update transport record (within transaction)
        const [transport] = await tx
          .update(guestTransport)
          .set({
            ...input.data,
            vehicleId,
            updatedAt: new Date(),
          })
          .where(eq(guestTransport.id, input.id))
          .returning()

        if (!transport) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update transport'
          })
        }

        // 3. TIMELINE SYNC: Update linked timeline entry (within transaction)
        const hasPickupDate = input.data.pickupDate !== undefined ? input.data.pickupDate : transport.pickupDate

        if (hasPickupDate) {
          const legTypeLabels: Record<string, string> = {
            arrival: 'Arrival',
            departure: 'Departure',
            inter_event: 'Transfer',
          }
          const legType = input.data.legType || transport.legType || 'arrival'
          const legLabel = legTypeLabels[legType] || 'Transport'
          const guestName = input.data.guestName || transport.guestName

          // Parse pickup date/time
          const pickupDate = input.data.pickupDate !== undefined ? input.data.pickupDate : transport.pickupDate
          const pickupTime = input.data.pickupTime !== undefined ? input.data.pickupTime : null
          let startDateTime = new Date(pickupDate!)
          if (pickupTime) {
            const [hours, minutes] = pickupTime.split(':').map(Number)
            startDateTime.setHours(hours || 0, minutes || 0, 0, 0)
          }

          // Build location string
          const pickupFrom = input.data.pickupFrom !== undefined ? input.data.pickupFrom : transport.pickupFrom
          const dropTo = input.data.dropTo !== undefined ? input.data.dropTo : transport.dropTo
          const locationParts: string[] = []
          if (pickupFrom) locationParts.push(`From: ${pickupFrom}`)
          if (dropTo) locationParts.push(`To: ${dropTo}`)
          const location = locationParts.join(' → ') || null

          const timelineData = {
            title: `${legLabel}: ${guestName}`,
            description: input.data.vehicleInfo || transport.vehicleInfo || `Guest transport - ${legLabel.toLowerCase()}`,
            startTime: startDateTime,
            location,
            notes: input.data.notes !== undefined ? input.data.notes : transport.notes,
            updatedAt: new Date(),
          }

          // Try to update existing entry first
          const updateResult = await tx
            .update(timeline)
            .set(timelineData)
            .where(
              and(
                eq(timeline.sourceModule, 'transport'),
                eq(timeline.sourceId, input.id)
              )
            )
            .returning({ id: timeline.id })

          if (updateResult.length === 0) {
            // No existing entry - create new one
            await tx.insert(timeline).values({
              id: nanoid(),
              clientId: transport.clientId,
              ...timelineData,
              sourceModule: 'transport',
              sourceId: transport.id,
              metadata: JSON.stringify({ guestId: transport.guestId, legType }),
            })
            cascadeActions.push({ module: 'timeline', action: 'created', count: 1 })
            console.log(`[Timeline] Created transport entry: ${legLabel} - ${guestName}`)
          } else {
            cascadeActions.push({ module: 'timeline', action: 'updated', count: 1 })
            console.log(`[Timeline] Updated transport entry: ${legLabel} - ${guestName}`)
          }
        } else {
          // Pickup date cleared - delete timeline entry
          const deleted = await tx
            .delete(timeline)
            .where(
              and(
                eq(timeline.sourceModule, 'transport'),
                eq(timeline.sourceId, input.id)
              )
            )
            .returning({ id: timeline.id })

          if (deleted.length > 0) {
            cascadeActions.push({ module: 'timeline', action: 'deleted', count: deleted.length })
            console.log(`[Timeline] Deleted transport entry (date cleared)`)
          }
        }

        return { transport, cascadeActions }
      })

      console.log(`[Transport Update] Updated transport ${result.transport.id} with cascade:`, result.cascadeActions)

      return {
        ...result.transport,
        cascadeActions: result.cascadeActions,
      }
    }),

  // Delete transport entry
  // TRANSACTION: Transport deletion and timeline cleanup are atomic
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Get transport to release vehicle if assigned
      const [existingTransport] = await ctx.db
        .select({ vehicleId: guestTransport.vehicleId })
        .from(guestTransport)
        .where(eq(guestTransport.id, input.id))
        .limit(1)

      // Execute transport deletion and cleanup atomically
      const result = await withTransaction(async (tx) => {
        const cascadeActions: { module: string; action: string; count: number }[] = []

        // 1. Release vehicle if assigned
        if (existingTransport?.vehicleId) {
          await tx
            .update(vehicles)
            .set({
              status: 'available',
              currentTransportId: null,
              availableAt: null,
              updatedAt: new Date(),
            })
            .where(eq(vehicles.id, existingTransport.vehicleId))
          cascadeActions.push({ module: 'vehicle', action: 'released', count: 1 })
        }

        // 2. Delete linked timeline entries
        const deletedTimeline = await tx
          .delete(timeline)
          .where(
            and(
              eq(timeline.sourceModule, 'transport'),
              eq(timeline.sourceId, input.id)
            )
          )
          .returning({ id: timeline.id })

        if (deletedTimeline.length > 0) {
          cascadeActions.push({ module: 'timeline', action: 'deleted', count: deletedTimeline.length })
          console.log(`[Timeline] Deleted ${deletedTimeline.length} transport timeline entry`)
        }

        // 3. Delete transport record
        await tx
          .delete(guestTransport)
          .where(eq(guestTransport.id, input.id))

        return { cascadeActions }
      })

      console.log(`[Transport Delete] Deleted transport ${input.id} with cascade:`, result.cascadeActions)

      return { success: true, cascadeActions: result.cascadeActions }
    }),

  // Sync transport with guests who have transport_required = true
  // Creates both arrival and departure transport entries
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
          departureDatetime: guests.departureDatetime,
          departureMode: guests.departureMode,
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
        return { synced: 0, arrivals: 0, departures: 0, message: 'No guests require transport' }
      }

      // Get existing transport records for this client with guestId and legType
      const existingTransport = await ctx.db
        .select({
          guestId: guestTransport.guestId,
          legType: guestTransport.legType
        })
        .from(guestTransport)
        .where(eq(guestTransport.clientId, input.clientId))

      // Create a Set of "guestId-legType" combinations for quick lookup
      const existingCombinations = new Set(
        existingTransport
          .filter(t => t.guestId)
          .map(t => `${t.guestId}-${t.legType}`)
      )

      const newTransportRecords: any[] = []

      for (const guest of guestsNeedingTransport) {
        const guestName = `${guest.firstName} ${guest.lastName || ''}`.trim()

        // Create ARRIVAL transport if not exists and guest has arrival data
        const arrivalKey = `${guest.id}-arrival`
        if (!existingCombinations.has(arrivalKey)) {
          let arrivalDate: string | null = null
          let arrivalTime: string | null = null
          if (guest.arrivalDatetime) {
            const dt = new Date(guest.arrivalDatetime)
            arrivalDate = dt.toISOString().split('T')[0]
            arrivalTime = dt.toTimeString().slice(0, 5) // HH:MM format
          }

          // Build transport info for arrival
          const arrivalInfo = guest.arrivalMode ? `(${guest.arrivalMode})` : null

          newTransportRecords.push({
            clientId: input.clientId,
            guestId: guest.id,
            guestName,
            pickupDate: arrivalDate,
            pickupTime: arrivalTime,
            pickupFrom: guest.transportPickupLocation || null,
            dropTo: guest.hotelName || null,
            vehicleInfo: arrivalInfo,
            legType: 'arrival' as const,
            legSequence: 1,
            transportStatus: 'scheduled',
            notes: guest.transportNotes || null,
          })
        }

        // Create DEPARTURE transport if not exists and guest has departure data
        const departureKey = `${guest.id}-departure`
        if (!existingCombinations.has(departureKey)) {
          let departureDate: string | null = null
          let departureTime: string | null = null
          if (guest.departureDatetime) {
            const dt = new Date(guest.departureDatetime)
            departureDate = dt.toISOString().split('T')[0]
            departureTime = dt.toTimeString().slice(0, 5) // HH:MM format
          }

          // Build transport info for departure
          const departureInfo = guest.departureMode ? `(${guest.departureMode})` : null

          // For departure: pickup from hotel, drop to departure point
          newTransportRecords.push({
            clientId: input.clientId,
            guestId: guest.id,
            guestName,
            pickupDate: departureDate,
            pickupTime: departureTime,
            pickupFrom: guest.hotelName || null, // Pickup from hotel
            dropTo: guest.transportPickupLocation || null, // Drop to airport/station
            vehicleInfo: departureInfo,
            legType: 'departure' as const,
            legSequence: 2,
            transportStatus: 'scheduled',
            notes: guest.transportNotes || null,
          })
        }
      }

      const arrivals = newTransportRecords.filter(r => r.legType === 'arrival').length
      const departures = newTransportRecords.filter(r => r.legType === 'departure').length

      if (newTransportRecords.length > 0) {
        await ctx.db.insert(guestTransport).values(newTransportRecords)
      }

      return {
        synced: newTransportRecords.length,
        arrivals,
        departures,
        message: newTransportRecords.length > 0
          ? `Created ${arrivals} arrival(s) and ${departures} departure(s) from guest list`
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
            arrivalMode: guests.arrivalMode,
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

  // Get all vehicles for a client with availability status
  getVehicles: adminProcedure
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

      const vehicleList = await ctx.db
        .select()
        .from(vehicles)
        .where(eq(vehicles.clientId, input.clientId))
        .orderBy(asc(vehicles.vehicleNumber))

      // Enrich with current transport info if in use
      const enrichedVehicles = await Promise.all(
        vehicleList.map(async (vehicle) => {
          let currentTransport = null
          if (vehicle.currentTransportId) {
            const [transport] = await ctx.db
              .select({
                id: guestTransport.id,
                guestName: guestTransport.guestName,
                pickupDate: guestTransport.pickupDate,
                pickupTime: guestTransport.pickupTime,
                pickupFrom: guestTransport.pickupFrom,
                dropTo: guestTransport.dropTo,
                legType: guestTransport.legType,
              })
              .from(guestTransport)
              .where(eq(guestTransport.id, vehicle.currentTransportId))
              .limit(1)
            currentTransport = transport || null
          }

          // Calculate availability message
          let availabilityMessage = 'Available'
          if (vehicle.status === 'in_use') {
            if (vehicle.availableAt) {
              const now = new Date()
              const availAt = new Date(vehicle.availableAt)
              if (availAt > now) {
                const diffMs = availAt.getTime() - now.getTime()
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                if (diffHours > 0) {
                  availabilityMessage = `Available in ~${diffHours}h ${diffMins}m`
                } else {
                  availabilityMessage = `Available in ~${diffMins}m`
                }
              } else {
                availabilityMessage = 'Available soon (trip overdue)'
              }
            } else {
              availabilityMessage = 'In use'
            }
          } else if (vehicle.status === 'maintenance') {
            availabilityMessage = 'Under maintenance'
          }

          return {
            ...vehicle,
            currentTransport,
            availabilityMessage,
          }
        })
      )

      return enrichedVehicles
    }),
})
