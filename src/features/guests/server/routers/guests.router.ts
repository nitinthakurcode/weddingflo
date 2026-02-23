import { router, adminProcedure, protectedProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, or, isNull, asc, inArray } from 'drizzle-orm'
import { guests, hotels, clients, guestTransport, floorPlanGuests, guestGifts, gifts } from '@/lib/db/schema'
import { withTransaction } from '@/features/chatbot/server/services/transaction-wrapper'
import { RSVP_STATUS, RSVP_STATUS_VALUES, GUEST_SIDE, GUEST_SIDE_VALUES, normalizeGuestSide } from '@/lib/constants/enums'
import { cascadeGuestSideEffects } from '../utils/guest-cascade'
import { recalcPerGuestBudgetItems } from '@/features/budget/server/utils/per-guest-recalc'
import { broadcastSync } from '@/lib/realtime/broadcast-sync'

/**
 * Guests tRPC Router - Drizzle ORM Version
 *
 * Provides CRUD operations for wedding guests with multi-tenant security.
 * Migrated from Supabase to Drizzle - December 2025
 */
export const guestsRouter = router({
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
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Client not found or access denied'
        })
      }

      // Fetch all guests
      const guestList = await ctx.db
        .select()
        .from(guests)
        .where(eq(guests.clientId, input.clientId))
        .orderBy(asc(guests.firstName))

      return guestList
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // SECURITY: Verify guest belongs to company via client join
      const [result] = await ctx.db
        .select({ guest: guests })
        .from(guests)
        .innerJoin(clients, eq(guests.clientId, clients.id))
        .where(
          and(
            eq(guests.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1)

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Guest not found'
        })
      }

      return result.guest
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email().optional().nullable().transform(val => val || undefined),
      phone: z.string().optional().nullable().transform(val => val || undefined),
      groupName: z.string().optional().nullable().transform(val => val || undefined),
      guestSide: z.enum(GUEST_SIDE_VALUES).default('mutual'),
      plusOne: z.boolean().default(false),
      dietaryRestrictions: z.string().optional(),
      notes: z.string().optional(),
      // Party info
      partySize: z.number().min(1).default(1),
      additionalGuestNames: z.array(z.string()).default([]),
      // Travel info
      arrivalDatetime: z.string().optional(),
      arrivalMode: z.string().optional(),
      departureDatetime: z.string().optional(),
      departureMode: z.string().optional(),
      // Relationship
      relationshipToFamily: z.string().optional(),
      attendingEvents: z.array(z.string()).default([]),
      // RSVP
      rsvpStatus: z.enum(RSVP_STATUS_VALUES).default('pending'),
      mealPreference: z.string().optional(),
      // Hotel requirements
      hotelRequired: z.boolean().default(false),
      hotelName: z.string().optional(),
      hotelCheckIn: z.string().optional(),
      hotelCheckOut: z.string().optional(),
      hotelRoomType: z.string().optional(),
      // Transport requirements
      transportRequired: z.boolean().default(false),
      transportType: z.string().optional(),
      transportPickupLocation: z.string().optional(),
      transportPickupTime: z.string().optional(),
      transportNotes: z.string().optional(),
      // Planner fields - Gift requirements
      giftRequired: z.boolean().default(false),
      giftToGive: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Verify client belongs to company and is not soft-deleted
      // Also fetch planningSide and weddingDate for guest defaults
      const [client] = await ctx.db
        .select({
          id: clients.id,
          planningSide: clients.planningSide,
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

      // Determine default guestSide based on client's planningSide
      // If planner is working for one side, default new guests to that side
      let effectiveGuestSide = input.guestSide
      if (input.guestSide === GUEST_SIDE.MUTUAL && client.planningSide) {
        // Map planningSide to canonical guestSide
        effectiveGuestSide = normalizeGuestSide(client.planningSide)
      }

      // Create guest - split name into first/last
      const nameParts = input.name.trim().split(' ')
      const firstName = nameParts[0] || input.name
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
      const fullName = input.name.trim()

      // Execute all guest creation operations atomically within a transaction
      const result = await withTransaction(async (tx) => {
        // Track cascade actions for frontend notification
        const cascadeActions: { module: string; action: string; count: number }[] = []

        // 1. Create guest record
        const [guest] = await tx
          .insert(guests)
          .values({
            clientId: input.clientId,
            firstName,
            lastName,
            email: input.email || null,
            phone: input.phone || null,
            groupName: input.groupName || null,
            guestSide: effectiveGuestSide,
            plusOneAllowed: input.plusOne,
            dietaryRestrictions: input.dietaryRestrictions || null,
            notes: input.notes || null,
            // Party info
            partySize: input.partySize,
            additionalGuestNames: input.additionalGuestNames,
            // Travel info
            arrivalDatetime: input.arrivalDatetime ? new Date(input.arrivalDatetime) : null,
            arrivalMode: input.arrivalMode || null,
            departureDatetime: input.departureDatetime ? new Date(input.departureDatetime) : null,
            departureMode: input.departureMode || null,
            // Relationship
            relationshipToFamily: input.relationshipToFamily || null,
            attendingEvents: input.attendingEvents,
            // RSVP
            rsvpStatus: input.rsvpStatus,
            mealPreference: input.mealPreference as any || null,
            // Hotel requirements
            hotelRequired: input.hotelRequired,
            hotelName: input.hotelName || null,
            hotelCheckIn: input.hotelCheckIn || null,
            hotelCheckOut: input.hotelCheckOut || null,
            hotelRoomType: input.hotelRoomType || null,
            // Transport requirements
            transportRequired: input.transportRequired,
            transportType: input.transportType || null,
            transportPickupLocation: input.transportPickupLocation || null,
            transportPickupTime: input.transportPickupTime || null,
            transportNotes: input.transportNotes || null,
            // Planner fields - Gift info
            giftToGive: input.giftToGive || null,
          })
          .returning()

        if (!guest) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create guest'
          })
        }

        // 2. Auto-create hotel and transport entries via shared cascade utility
        const sideEffects = await cascadeGuestSideEffects({
          guest: {
            ...guest,
            hotelName: input.hotelName || null,
            hotelCheckIn: input.hotelCheckIn || null,
            hotelCheckOut: input.hotelCheckOut || null,
            hotelRoomType: input.hotelRoomType || null,
            transportType: input.transportType || null,
            transportPickupLocation: input.transportPickupLocation || null,
            transportPickupTime: input.transportPickupTime || null,
            transportNotes: input.transportNotes || null,
            arrivalDatetime: input.arrivalDatetime ? new Date(input.arrivalDatetime) : null,
            arrivalMode: input.arrivalMode || null,
          },
          fullName,
          tx,
        })
        cascadeActions.push(...sideEffects)

        return { guest, cascadeActions }
      })

      console.log(`[Guest Create] Created guest ${result.guest.id} with cascade:`, result.cascadeActions)

      // Broadcast real-time sync
      await broadcastSync({
        type: 'insert',
        module: 'guests',
        entityId: result.guest.id,
        companyId: ctx.companyId!,
        clientId: input.clientId,
        userId: ctx.userId!,
        queryPaths: ['guests.list', 'guests.getStats', 'hotels.list', 'guestTransport.list', 'budget.overview'],
      })

      return {
        ...result.guest,
        cascadeActions: result.cascadeActions,
      }
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: z.object({
        name: z.string().optional().nullable().transform(val => val || undefined),
        email: z.string().email().optional().nullable().transform(val => val || undefined),
        phone: z.string().optional().nullable().transform(val => val || undefined),
        groupName: z.string().optional().nullable().transform(val => val || undefined),
        guestSide: z.enum(GUEST_SIDE_VALUES).optional(),
        rsvpStatus: z.enum(RSVP_STATUS_VALUES).optional(),
        dietaryRestrictions: z.string().optional(),
        mealPreference: z.string().optional(),
        plusOne: z.boolean().optional(),
        checkedIn: z.boolean().optional(),
        notes: z.string().optional(),
        // Party info
        partySize: z.number().min(1).optional(),
        additionalGuestNames: z.array(z.string()).optional(),
        // Travel info
        arrivalDatetime: z.string().optional().nullable(),
        arrivalMode: z.string().optional().nullable(),
        departureDatetime: z.string().optional().nullable(),
        departureMode: z.string().optional().nullable(),
        // Relationship
        relationshipToFamily: z.string().optional(),
        attendingEvents: z.array(z.string()).optional(),
        // Hotel requirements
        hotelRequired: z.boolean().optional(),
        hotelName: z.string().optional(),
        hotelCheckIn: z.string().optional(),
        hotelCheckOut: z.string().optional(),
        hotelRoomType: z.string().optional(),
        // Transport requirements
        transportRequired: z.boolean().optional(),
        transportType: z.string().optional(),
        transportPickupLocation: z.string().optional(),
        transportPickupTime: z.string().optional(),
        transportNotes: z.string().optional(),
        // Planner fields - Gift requirements
        giftRequired: z.boolean().optional(),
        giftToGive: z.string().optional(),
        // Metadata for party member requirements
        metadata: z.any().optional(),
        // Party member hotel/transport - for individual party members
        partyMemberHotel: z.any().optional(),
        partyMemberTransport: z.any().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // SECURITY: Verify guest belongs to company via client join before update
      const [existingGuest] = await ctx.db
        .select({ guest: guests })
        .from(guests)
        .innerJoin(clients, eq(guests.clientId, clients.id))
        .where(
          and(
            eq(guests.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1)

      if (!existingGuest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Guest not found'
        })
      }

      // Build update object
      const updateData: Record<string, any> = {
        updatedAt: new Date(),
      }

      let guestName = ''
      if (input.data.name !== undefined) {
        const nameParts = input.data.name.trim().split(' ')
        updateData.firstName = nameParts[0] || input.data.name
        updateData.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
        guestName = input.data.name.trim()
      }
      if (input.data.email !== undefined) updateData.email = input.data.email
      if (input.data.phone !== undefined) updateData.phone = input.data.phone
      if (input.data.groupName !== undefined) updateData.groupName = input.data.groupName
      if (input.data.guestSide !== undefined) updateData.guestSide = input.data.guestSide
      if (input.data.rsvpStatus !== undefined) updateData.rsvpStatus = input.data.rsvpStatus
      if (input.data.mealPreference !== undefined) updateData.mealPreference = input.data.mealPreference
      if (input.data.dietaryRestrictions !== undefined) updateData.dietaryRestrictions = input.data.dietaryRestrictions
      if (input.data.plusOne !== undefined) updateData.plusOneAllowed = input.data.plusOne
      if (input.data.checkedIn !== undefined) updateData.checkedIn = input.data.checkedIn
      if (input.data.notes !== undefined) updateData.notes = input.data.notes
      // Party info
      if (input.data.partySize !== undefined) updateData.partySize = input.data.partySize
      if (input.data.additionalGuestNames !== undefined) updateData.additionalGuestNames = input.data.additionalGuestNames
      // Travel info
      if (input.data.arrivalDatetime !== undefined) updateData.arrivalDatetime = input.data.arrivalDatetime ? new Date(input.data.arrivalDatetime) : null
      if (input.data.arrivalMode !== undefined) updateData.arrivalMode = input.data.arrivalMode
      if (input.data.departureDatetime !== undefined) updateData.departureDatetime = input.data.departureDatetime ? new Date(input.data.departureDatetime) : null
      if (input.data.departureMode !== undefined) updateData.departureMode = input.data.departureMode
      // Relationship
      if (input.data.relationshipToFamily !== undefined) updateData.relationshipToFamily = input.data.relationshipToFamily
      if (input.data.attendingEvents !== undefined) updateData.attendingEvents = input.data.attendingEvents
      // Hotel requirements
      if (input.data.hotelRequired !== undefined) updateData.hotelRequired = input.data.hotelRequired
      if (input.data.hotelName !== undefined) updateData.hotelName = input.data.hotelName
      if (input.data.hotelCheckIn !== undefined) updateData.hotelCheckIn = input.data.hotelCheckIn
      if (input.data.hotelCheckOut !== undefined) updateData.hotelCheckOut = input.data.hotelCheckOut
      if (input.data.hotelRoomType !== undefined) updateData.hotelRoomType = input.data.hotelRoomType
      // Transport requirements
      if (input.data.transportRequired !== undefined) updateData.transportRequired = input.data.transportRequired
      if (input.data.transportType !== undefined) updateData.transportType = input.data.transportType
      if (input.data.transportPickupLocation !== undefined) updateData.transportPickupLocation = input.data.transportPickupLocation
      if (input.data.transportPickupTime !== undefined) updateData.transportPickupTime = input.data.transportPickupTime
      if (input.data.transportNotes !== undefined) updateData.transportNotes = input.data.transportNotes
      // Planner fields - Gift requirements
      if (input.data.giftRequired !== undefined) updateData.giftRequired = input.data.giftRequired
      if (input.data.giftToGive !== undefined) updateData.giftToGive = input.data.giftToGive
      // Metadata for party member requirements
      if (input.data.metadata !== undefined) updateData.metadata = input.data.metadata

      // Execute all guest update operations atomically within a transaction
      const result = await withTransaction(async (tx) => {
        // Track cascade actions for frontend notification
        const cascadeActions: { module: string; action: string; count: number }[] = []

        // 1. Update guest (already verified ownership)
        const [guest] = await tx
          .update(guests)
          .set(updateData)
          .where(eq(guests.id, input.id))
          .returning()

        if (!guest) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update guest'
          })
        }

        // Get guest name for cascade operations
        if (!guestName) {
          guestName = `${guest.firstName} ${guest.lastName}`.trim()
        }

        // 2. Handle hotel synchronization (within transaction)
        if (input.data.hotelRequired === true) {
          // Check if hotel entry already exists for this guest
          const [existingHotel] = await tx
            .select({ id: hotels.id })
            .from(hotels)
            .where(eq(hotels.guestId, input.id))
            .limit(1)

          if (existingHotel) {
            // Update existing hotel entry
            await tx
              .update(hotels)
              .set({
                guestName: guestName,
                hotelName: input.data.hotelName,
                roomType: input.data.hotelRoomType,
                checkInDate: input.data.hotelCheckIn,
                checkOutDate: input.data.hotelCheckOut,
                updatedAt: new Date(),
              })
              .where(eq(hotels.id, existingHotel.id))
            cascadeActions.push({ module: 'hotels', action: 'updated', count: 1 })
          } else {
            // Create new hotel entry
            await tx
              .insert(hotels)
              .values({
                clientId: guest.clientId,
                guestId: guest.id,
                guestName: guestName,
                hotelName: input.data.hotelName || null,
                roomType: input.data.hotelRoomType || null,
                checkInDate: input.data.hotelCheckIn || null,
                checkOutDate: input.data.hotelCheckOut || null,
                accommodationNeeded: true,
              })
            cascadeActions.push({ module: 'hotels', action: 'created', count: 1 })
          }
        } else if (input.data.hotelRequired === false) {
          // Remove hotel entry if hotel is no longer required
          const deleted = await tx
            .delete(hotels)
            .where(eq(hotels.guestId, input.id))
            .returning({ id: hotels.id })
          if (deleted.length > 0) {
            cascadeActions.push({ module: 'hotels', action: 'deleted', count: deleted.length })
          }
        }

        // 3. Handle transport synchronization (within transaction)
        if (input.data.transportRequired === true) {
          // Check if transport entry already exists for this guest
          const [existingTransport] = await tx
            .select({ id: guestTransport.id })
            .from(guestTransport)
            .where(eq(guestTransport.guestId, input.id))
            .limit(1)

          // Extract date and time from arrivalDatetime if available
          let pickupDate: string | null = null
          let pickupTime: string | null = input.data.transportPickupTime || null

          if (input.data.arrivalDatetime) {
            const arrivalDate = new Date(input.data.arrivalDatetime)
            pickupDate = arrivalDate.toISOString().split('T')[0]
            if (!pickupTime) {
              pickupTime = arrivalDate.toTimeString().slice(0, 5)
            }
          }

          // Build vehicle/transport info
          const vehicleParts: string[] = []
          if (input.data.transportType) vehicleParts.push(input.data.transportType)
          if (input.data.arrivalMode) vehicleParts.push(`(${input.data.arrivalMode})`)
          const vehicleInfo = vehicleParts.length > 0 ? vehicleParts.join(' ') : null

          if (existingTransport) {
            // Update existing transport entry
            await tx
              .update(guestTransport)
              .set({
                guestName: guestName,
                pickupDate,
                pickupTime,
                pickupFrom: input.data.transportPickupLocation,
                dropTo: input.data.hotelName || null,
                vehicleInfo,
                notes: input.data.transportNotes,
                updatedAt: new Date(),
              })
              .where(eq(guestTransport.id, existingTransport.id))
            cascadeActions.push({ module: 'transport', action: 'updated', count: 1 })
          } else {
            // Create new transport entry
            await tx
              .insert(guestTransport)
              .values({
                clientId: guest.clientId,
                guestId: guest.id,
                guestName: guestName,
                legType: 'arrival',
                legSequence: 1,
                pickupDate,
                pickupTime,
                pickupFrom: input.data.transportPickupLocation || null,
                dropTo: input.data.hotelName || null,
                vehicleInfo,
                transportStatus: 'scheduled',
                notes: input.data.transportNotes || null,
              })
            cascadeActions.push({ module: 'transport', action: 'created', count: 1 })
          }
        } else if (input.data.transportRequired === false) {
          // Remove transport entries if transport is no longer required
          const deleted = await tx
            .delete(guestTransport)
            .where(eq(guestTransport.guestId, input.id))
            .returning({ id: guestTransport.id })
          if (deleted.length > 0) {
            cascadeActions.push({ module: 'transport', action: 'deleted', count: deleted.length })
          }
        }

        // 4. Handle party member hotel (for additional guests in party) (within transaction)
        if (input.data.partyMemberHotel) {
          const { memberName, checkIn, checkOut, remove } = input.data.partyMemberHotel

          if (remove) {
            // Remove hotel entry for this party member
            const deleted = await tx
              .delete(hotels)
              .where(
                and(
                  eq(hotels.clientId, guest.clientId),
                  eq(hotels.guestName, memberName)
                )
              )
              .returning({ id: hotels.id })
            if (deleted.length > 0) {
              cascadeActions.push({ module: 'hotels', action: 'deleted_party_member', count: 1 })
            }
          } else {
            // Check if hotel entry exists for this party member
            const [existingHotel] = await tx
              .select({ id: hotels.id })
              .from(hotels)
              .where(
                and(
                  eq(hotels.clientId, guest.clientId),
                  eq(hotels.guestName, memberName)
                )
              )
              .limit(1)

            if (existingHotel) {
              // Update existing
              await tx
                .update(hotels)
                .set({
                  checkInDate: checkIn || null,
                  checkOutDate: checkOut || null,
                  updatedAt: new Date(),
                })
                .where(eq(hotels.id, existingHotel.id))
              cascadeActions.push({ module: 'hotels', action: 'updated_party_member', count: 1 })
            } else {
              // Create new hotel entry for party member
              await tx
                .insert(hotels)
                .values({
                  clientId: guest.clientId,
                  guestId: guest.id, // Link to primary guest
                  guestName: memberName,
                  partySize: 1,
                  checkInDate: checkIn || null,
                  checkOutDate: checkOut || null,
                  accommodationNeeded: true,
                })
              cascadeActions.push({ module: 'hotels', action: 'created_party_member', count: 1 })
            }
          }
        }

        // 5. Handle party member transport (for additional guests in party) (within transaction)
        if (input.data.partyMemberTransport) {
          const { memberName, arrivalDatetime, arrivalMode, remove } = input.data.partyMemberTransport

          if (remove) {
            // Remove transport entry for this party member
            const deleted = await tx
              .delete(guestTransport)
              .where(
                and(
                  eq(guestTransport.clientId, guest.clientId),
                  eq(guestTransport.guestName, memberName)
                )
              )
              .returning({ id: guestTransport.id })
            if (deleted.length > 0) {
              cascadeActions.push({ module: 'transport', action: 'deleted_party_member', count: 1 })
            }
          } else {
            // Check if transport entry exists for this party member
            const [existingTransport] = await tx
              .select({ id: guestTransport.id })
              .from(guestTransport)
              .where(
                and(
                  eq(guestTransport.clientId, guest.clientId),
                  eq(guestTransport.guestName, memberName)
                )
              )
              .limit(1)

            // Parse arrival datetime
            let pickupDate: string | null = null
            let pickupTime: string | null = null
            if (arrivalDatetime) {
              const arrivalDate = new Date(arrivalDatetime)
              pickupDate = arrivalDate.toISOString().split('T')[0]
              pickupTime = arrivalDate.toTimeString().slice(0, 5)
            }

            if (existingTransport) {
              // Update existing
              await tx
                .update(guestTransport)
                .set({
                  pickupDate,
                  pickupTime,
                  vehicleInfo: arrivalMode ? `(${arrivalMode})` : null,
                  updatedAt: new Date(),
                })
                .where(eq(guestTransport.id, existingTransport.id))
              cascadeActions.push({ module: 'transport', action: 'updated_party_member', count: 1 })
            } else {
              // Create new transport entry for party member
              await tx
                .insert(guestTransport)
                .values({
                  clientId: guest.clientId,
                  guestId: guest.id, // Link to primary guest
                  guestName: memberName,
                  legType: 'arrival',
                  legSequence: 1,
                  pickupDate,
                  pickupTime,
                  vehicleInfo: arrivalMode ? `(${arrivalMode})` : null,
                  transportStatus: 'scheduled',
                })
              cascadeActions.push({ module: 'transport', action: 'created_party_member', count: 1 })
            }
          }
        }

        // 5. BUDGET SYNC: Update per-guest budget items when RSVP or partySize changes
        const rsvpStatusChanged = input.data.rsvpStatus !== undefined;
        const partySizeChanged = input.data.partySize !== undefined;
        const isConfirmedStatus = (status: string | null) => status === RSVP_STATUS.CONFIRMED;

        const shouldSyncBudget =
          (rsvpStatusChanged && (input.data.rsvpStatus === RSVP_STATUS.CONFIRMED || input.data.rsvpStatus === RSVP_STATUS.DECLINED)) ||
          (partySizeChanged && isConfirmedStatus(guest.rsvpStatus));

        if (shouldSyncBudget) {
          const { updatedItems } = await recalcPerGuestBudgetItems(tx, guest.clientId)
          if (updatedItems > 0) {
            cascadeActions.push({ module: 'budget', action: 'recalculated', count: updatedItems })
          }
        }

        return { guest, cascadeActions }
      })

      console.log(`[Guest Update] Updated guest ${result.guest.id} with cascade:`, result.cascadeActions)

      // Broadcast real-time sync
      await broadcastSync({
        type: 'update',
        module: 'guests',
        entityId: result.guest.id,
        companyId: ctx.companyId!,
        clientId: existingGuest.guest.clientId,
        userId: ctx.userId!,
        queryPaths: ['guests.list', 'guests.getStats', 'hotels.list', 'guestTransport.list', 'budget.overview'],
      })

      return {
        ...result.guest,
        cascadeActions: result.cascadeActions,
      }
    }),

  /**
   * Delete a guest with comprehensive cascade cleanup.
   * Runs in a transaction to ensure atomic deletion of:
   * - Floor plan guest assignments
   * - Hotel records
   * - Transport records
   * - Guest gifts (gifts received)
   * - Gifts (gifts given)
   * - Timeline entries linked to guest
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // SECURITY: Verify guest belongs to company via client join before delete
      const [existingGuest] = await ctx.db
        .select({ guest: guests })
        .from(guests)
        .innerJoin(clients, eq(guests.clientId, clients.id))
        .where(
          and(
            eq(guests.id, input.id),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1)

      if (!existingGuest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Guest not found'
        })
      }

      // Execute cascade deletion in a transaction for atomicity
      const result = await withTransaction(async (tx) => {
        const deletionCounts = {
          floorPlanGuests: 0,
          hotels: 0,
          transport: 0,
          guestGifts: 0,
          gifts: 0,
          timeline: 0,
        }

        // 1. Delete floor plan guest assignments
        const floorPlanResult = await tx
          .delete(floorPlanGuests)
          .where(eq(floorPlanGuests.guestId, input.id))
          .returning({ id: floorPlanGuests.id })
        deletionCounts.floorPlanGuests = floorPlanResult.length

        // 2. Delete associated hotel entries
        const hotelsResult = await tx
          .delete(hotels)
          .where(eq(hotels.guestId, input.id))
          .returning({ id: hotels.id })
        deletionCounts.hotels = hotelsResult.length

        // 3. Delete associated transport entries
        const transportResult = await tx
          .delete(guestTransport)
          .where(eq(guestTransport.guestId, input.id))
          .returning({ id: guestTransport.id })
        deletionCounts.transport = transportResult.length

        // 4. Delete guest gifts (gifts received by this guest)
        const guestGiftsResult = await tx
          .delete(guestGifts)
          .where(eq(guestGifts.guestId, input.id))
          .returning({ id: guestGifts.id })
        deletionCounts.guestGifts = guestGiftsResult.length

        // 5. Delete gifts linked to this guest
        const giftsResult = await tx
          .delete(gifts)
          .where(eq(gifts.guestId, input.id))
          .returning({ id: gifts.id })
        deletionCounts.gifts = giftsResult.length

        // 6. Delete timeline entries linked to this guest (via metadata)
        // Note: Timeline entries may reference guest in sourceId when sourceModule is 'hotels' or 'transport'
        // These are already deleted via hotels/transport cascade, but explicit cleanup is safer
        try {
          // Delete any direct guest references in timeline (if implemented)
          // Currently hotels/transport timeline entries have guestId in metadata, not as sourceId
        } catch {
          // Ignore timeline cleanup errors - not critical
        }

        // 7. Finally delete the guest
        await tx
          .delete(guests)
          .where(eq(guests.id, input.id))

        // 8. Recalculate per-guest budget items (confirmed count changed)
        if (existingGuest.guest.rsvpStatus === RSVP_STATUS.CONFIRMED) {
          await recalcPerGuestBudgetItems(tx, existingGuest.guest.clientId)
        }

        console.log(`[Guest Delete] Guest ${input.id} deleted with cascade:`, deletionCounts)
        return deletionCounts
      })

      // Broadcast real-time sync
      await broadcastSync({
        type: 'delete',
        module: 'guests',
        entityId: input.id,
        companyId: ctx.companyId!,
        clientId: existingGuest.guest.clientId,
        userId: ctx.userId!,
        queryPaths: ['guests.list', 'guests.getStats', 'hotels.list', 'guestTransport.list', 'budget.overview'],
      })

      return { success: true, deleted: result }
    }),

  bulkImport: adminProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      guests: z.array(z.object({
        name: z.string(),
        email: z.string().email().optional().nullable().transform(val => val || undefined),
        phone: z.string().optional().nullable().transform(val => val || undefined),
        groupName: z.string().optional().nullable().transform(val => val || undefined),
        // Extended fields
        partySize: z.number().optional(),
        additionalGuestNames: z.array(z.string()).optional(),
        arrivalDatetime: z.string().optional(),
        arrivalMode: z.string().optional(),
        departureDatetime: z.string().optional(),
        departureMode: z.string().optional(),
        relationshipToFamily: z.string().optional(),
        attendingEvents: z.array(z.string()).optional(),
        rsvpStatus: z.string().optional(),
        mealPreference: z.string().optional(),
        dietaryRestrictions: z.string().optional(),
        hotelRequired: z.boolean().optional(),
        transportRequired: z.boolean().optional(),
        giftRequired: z.boolean().optional(),
        giftToGive: z.string().optional(),
        notes: z.string().optional(),
      })),
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

      // Prepare guest records
      const guestRecords = input.guests.map(g => {
        const nameParts = g.name.trim().split(' ')
        return {
          clientId: input.clientId,
          firstName: nameParts[0] || g.name,
          lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
          email: g.email || null,
          phone: g.phone || null,
          groupName: g.groupName || null,
          // Extended fields
          partySize: g.partySize || 1,
          additionalGuestNames: g.additionalGuestNames || [],
          arrivalDatetime: g.arrivalDatetime ? new Date(g.arrivalDatetime) : null,
          arrivalMode: g.arrivalMode || null,
          departureDatetime: g.departureDatetime ? new Date(g.departureDatetime) : null,
          departureMode: g.departureMode || null,
          relationshipToFamily: g.relationshipToFamily || null,
          attendingEvents: g.attendingEvents || [],
          rsvpStatus: (g.rsvpStatus || 'pending') as any,
          mealPreference: g.mealPreference as any || null,
          dietaryRestrictions: g.dietaryRestrictions || null,
          hotelRequired: g.hotelRequired || false,
          transportRequired: g.transportRequired || false,
          giftRequired: g.giftRequired || false,
          giftToGive: g.giftToGive || null,
          notes: g.notes || null,
        }
      })

      // Bulk insert + cascade within a transaction
      const result = await withTransaction(async (tx) => {
        const data = await tx
          .insert(guests)
          .values(guestRecords)
          .returning()

        if (!data || data.length === 0) {
          return { data: [], cascadeActions: [] as { module: string; action: string; count: number }[] }
        }

        const cascadeActions: { module: string; action: string; count: number }[] = []
        const insertedIds = data.map((g: { id: string }) => g.id)

        // Cascade hotel/transport for guests that need it (subset of all inserted)
        const guestsNeedingCascade = await tx
          .select()
          .from(guests)
          .where(
            and(
              eq(guests.clientId, input.clientId),
              inArray(guests.id, insertedIds),
              or(
                eq(guests.hotelRequired, true),
                eq(guests.transportRequired, true)
              )
            )
          )

        for (const guest of guestsNeedingCascade) {
          const fullName = `${guest.firstName} ${guest.lastName || ''}`.trim()
          const actions = await cascadeGuestSideEffects({
            guest: {
              ...guest,
              hotelName: guest.hotelName || null,
              hotelCheckIn: guest.hotelCheckIn || null,
              hotelCheckOut: guest.hotelCheckOut || null,
              hotelRoomType: guest.hotelRoomType || null,
              transportType: guest.transportType || null,
              transportPickupLocation: guest.transportPickupLocation || null,
              transportPickupTime: guest.transportPickupTime || null,
              transportNotes: guest.transportNotes || null,
              arrivalDatetime: guest.arrivalDatetime ? new Date(guest.arrivalDatetime) : null,
              arrivalMode: guest.arrivalMode || null,
            },
            fullName,
            tx,
          })
          cascadeActions.push(...actions)
        }

        // Budget recalc once for all guests
        const { updatedItems } = await recalcPerGuestBudgetItems(tx, input.clientId)
        if (updatedItems > 0) {
          cascadeActions.push({ module: 'budget', action: 'recalculated', count: updatedItems })
        }

        if (cascadeActions.length > 0) {
          console.log(`[Bulk Import] Cascade for ${data.length} guests:`, cascadeActions)
        }

        return { data, cascadeActions }
      })

      // Broadcast real-time sync for bulk import
      if (result.data.length > 0) {
        await broadcastSync({
          type: 'insert',
          module: 'guests',
          entityId: 'bulk',
          companyId: ctx.companyId!,
          clientId: input.clientId,
          userId: ctx.userId!,
          queryPaths: ['guests.list', 'guests.getStats', 'hotels.list', 'guestTransport.list', 'budget.overview'],
        })
      }

      return {
        count: result.data.length,
        guests: result.data,
        cascadeActions: result.cascadeActions,
      }
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

      // Get all guests for stats calculation
      const guestList = await ctx.db
        .select({
          rsvpStatus: guests.rsvpStatus,
          checkedIn: guests.checkedIn,
        })
        .from(guests)
        .where(eq(guests.clientId, input.clientId))

      const stats = {
        total: guestList.length,
        attending: guestList.filter(g => g.rsvpStatus === RSVP_STATUS.CONFIRMED).length,
        declined: guestList.filter(g => g.rsvpStatus === RSVP_STATUS.DECLINED).length,
        pending: guestList.filter(g => !g.rsvpStatus || g.rsvpStatus === RSVP_STATUS.PENDING).length,
        checkedIn: guestList.filter(g => g.checkedIn === true).length,
      }

      return stats
    }),

  getDietaryStats: adminProcedure
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

      // Get all guests with dietary info
      const guestList = await ctx.db
        .select({
          id: guests.id,
          firstName: guests.firstName,
          lastName: guests.lastName,
          mealPreference: guests.mealPreference,
          dietaryRestrictions: guests.dietaryRestrictions,
          groupName: guests.groupName,
          rsvpStatus: guests.rsvpStatus,
          plusOneAllowed: guests.plusOneAllowed,
          plusOneMealPreference: guests.plusOneMealPreference,
        })
        .from(guests)
        .where(
          and(
            eq(guests.clientId, input.clientId),
            eq(guests.rsvpStatus, RSVP_STATUS.CONFIRMED)
          )
        )

      const mealCounts = {
        veg: 0,
        non_veg: 0,
        vegan: 0,
        jain: 0,
        custom: 0,
        unspecified: 0,
      }

      const restrictions: { id: string; name: string; restriction: string; group: string | null }[] = []
      const byGroup: Record<string, typeof mealCounts> = {}

      guestList.forEach(guest => {
        // Count main guest meal preference
        const pref = guest.mealPreference || 'unspecified'
        if (pref in mealCounts) {
          mealCounts[pref as keyof typeof mealCounts]++
        } else {
          mealCounts.unspecified++
        }

        // Count plus-one if applicable
        if (guest.plusOneAllowed && guest.plusOneMealPreference) {
          const plusOnePref = guest.plusOneMealPreference
          if (plusOnePref in mealCounts) {
            mealCounts[plusOnePref as keyof typeof mealCounts]++
          }
        }

        // Track dietary restrictions
        if (guest.dietaryRestrictions) {
          restrictions.push({
            id: guest.id,
            name: `${guest.firstName} ${guest.lastName}`,
            restriction: guest.dietaryRestrictions,
            group: guest.groupName,
          })
        }

        // Group-wise breakdown
        const groupName = guest.groupName || 'Unassigned'
        if (!byGroup[groupName]) {
          byGroup[groupName] = { veg: 0, non_veg: 0, vegan: 0, jain: 0, custom: 0, unspecified: 0 }
        }
        const groupPref = guest.mealPreference || 'unspecified'
        if (groupPref in byGroup[groupName]) {
          byGroup[groupName][groupPref as keyof typeof mealCounts]++
        }
      })

      return {
        totalMeals: Object.values(mealCounts).reduce((a, b) => a + b, 0),
        mealCounts,
        restrictions,
        byGroup,
      }
    }),

  updateRSVP: protectedProcedure
    .input(z.object({
      guestId: z.string().uuid(),
      rsvpStatus: z.enum(RSVP_STATUS_VALUES),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // SECURITY: Verify guest belongs to company via client join
      const [ownershipCheck] = await ctx.db
        .select({ guestId: guests.id })
        .from(guests)
        .innerJoin(clients, eq(guests.clientId, clients.id))
        .where(
          and(
            eq(guests.id, input.guestId),
            eq(clients.companyId, ctx.companyId)
          )
        )
        .limit(1)

      if (!ownershipCheck) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Guest not found or access denied',
        })
      }

      // Execute RSVP update and budget sync atomically within a transaction
      const result = await withTransaction(async (tx) => {
        // Track cascade actions for frontend notification
        const cascadeActions: { module: string; action: string; count: number }[] = []

        // 1. Update RSVP
        const [guest] = await tx
          .update(guests)
          .set({
            rsvpStatus: input.rsvpStatus,
            updatedAt: new Date(),
          })
          .where(eq(guests.id, input.guestId))
          .returning()

        if (!guest) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Guest not found'
          })
        }

        // 2. RSVP→BUDGET SYNC: Recalculate per-guest budget items (atomic with RSVP update)
        if (input.rsvpStatus === RSVP_STATUS.CONFIRMED || input.rsvpStatus === RSVP_STATUS.DECLINED) {
          const { updatedItems } = await recalcPerGuestBudgetItems(tx, guest.clientId)
          if (updatedItems > 0) {
            cascadeActions.push({ module: 'budget', action: 'updated_per_guest_items', count: updatedItems })
          }
        }

        return { guest, cascadeActions }
      })

      console.log(`[RSVP Update] Updated guest ${result.guest.id} RSVP to ${input.rsvpStatus} with cascade:`, result.cascadeActions)

      // Broadcast real-time sync
      await broadcastSync({
        type: 'update',
        module: 'guests',
        entityId: result.guest.id,
        companyId: ctx.companyId!,
        clientId: result.guest.clientId,
        userId: ctx.userId!,
        queryPaths: ['guests.list', 'guests.getStats', 'budget.overview'],
      })

      return {
        ...result.guest,
        cascadeActions: result.cascadeActions,
      }
    }),

  checkIn: adminProcedure
    .input(z.object({
      guestId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Company ID not found in session' })
      }

      // Update checkedIn status
      const [guest] = await ctx.db
        .update(guests)
        .set({
          checkedIn: true,
          checkedInAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(guests.id, input.guestId))
        .returning()

      if (!guest) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Guest not found'
        })
      }

      return guest
    }),
})
