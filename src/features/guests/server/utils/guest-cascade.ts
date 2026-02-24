/**
 * Guest Cascade Side Effects
 *
 * Shared utility for creating hotel and transport records
 * when a guest is created with hotelRequired or transportRequired.
 *
 * Used by:
 * - guests.router.ts (create procedure)
 * - tool-executor.ts (chatbot executeAddGuest)
 */

import { eq } from 'drizzle-orm'
import { hotels, guestTransport } from '@/lib/db/schema'
import { recalcPerGuestBudgetItems } from '@/features/budget/server/utils/per-guest-recalc'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransactionClient = any

interface CascadeAction {
  module: string
  action: string
  count: number
}

interface CascadeGuestParams {
  guest: {
    id: string
    clientId: string
    firstName: string
    lastName: string | null
    hotelRequired: boolean | null
    hotelName: string | null
    hotelCheckIn: string | null
    hotelCheckOut: string | null
    hotelRoomType: string | null
    transportRequired: boolean | null
    transportType: string | null
    transportPickupLocation: string | null
    transportPickupTime: string | null
    transportNotes: string | null
    arrivalDatetime: Date | null
    arrivalMode: string | null
    rsvpStatus: string | null
  }
  /** Full display name for the guest (e.g. "John Smith") */
  fullName: string
  /** Company ID for multi-tenant isolation */
  companyId: string
  tx: TransactionClient
}

/**
 * Create hotel and transport records for a newly created guest.
 * Mirrors the cascade logic from guests.router.ts create procedure.
 *
 * Must be called within a transaction (pass `tx` from withTransaction).
 */
export async function cascadeGuestSideEffects(
  params: CascadeGuestParams
): Promise<CascadeAction[]> {
  const { guest, fullName, companyId, tx } = params
  const cascadeActions: CascadeAction[] = []

  // 1. Auto-create hotel entry if hotel is required
  if (guest.hotelRequired) {
    // Check if hotel record already exists (idempotent)
    const [existingHotel] = await tx
      .select({ id: hotels.id })
      .from(hotels)
      .where(eq(hotels.guestId, guest.id))
      .limit(1)

    if (!existingHotel) {
      await tx
        .insert(hotels)
        .values({
          clientId: guest.clientId,
          companyId,
          guestId: guest.id,
          guestName: fullName,
          hotelName: guest.hotelName || null,
          roomType: guest.hotelRoomType || null,
          checkInDate: guest.hotelCheckIn || null,
          checkOutDate: guest.hotelCheckOut || null,
          accommodationNeeded: true,
        })
      cascadeActions.push({ module: 'hotels', action: 'created', count: 1 })
      console.log(`[Guest Cascade] Auto-created hotel record for guest: ${fullName}`)
    }
  }

  // 2. Auto-create transport entry if transport is required
  if (guest.transportRequired) {
    // Check if transport record already exists (idempotent)
    const [existingTransport] = await tx
      .select({ id: guestTransport.id })
      .from(guestTransport)
      .where(eq(guestTransport.guestId, guest.id))
      .limit(1)

    if (!existingTransport) {
      // Extract date and time from arrivalDatetime if available
      let pickupDate: string | null = null
      let pickupTime: string | null = guest.transportPickupTime || null

      if (guest.arrivalDatetime) {
        const arrivalDate = new Date(guest.arrivalDatetime)
        pickupDate = arrivalDate.toISOString().split('T')[0] // YYYY-MM-DD
        if (!pickupTime) {
          pickupTime = arrivalDate.toTimeString().slice(0, 5) // HH:MM
        }
      }

      // Build vehicle/transport info
      const vehicleParts: string[] = []
      if (guest.transportType) vehicleParts.push(guest.transportType)
      if (guest.arrivalMode) vehicleParts.push(`(${guest.arrivalMode})`)
      const vehicleInfo = vehicleParts.length > 0 ? vehicleParts.join(' ') : null

      await tx
        .insert(guestTransport)
        .values({
          clientId: guest.clientId,
          companyId,
          guestId: guest.id,
          guestName: fullName,
          legType: 'arrival',
          legSequence: 1,
          pickupDate,
          pickupTime,
          pickupFrom: guest.transportPickupLocation || null,
          dropTo: guest.hotelName || null, // Default drop to hotel if available
          vehicleInfo,
          transportStatus: 'scheduled',
          notes: guest.transportNotes || null,
        })
      cascadeActions.push({ module: 'transport', action: 'created', count: 1 })
      console.log(`[Guest Cascade] Auto-created transport record for guest: ${fullName}`)
    }
  }

  // 3. Recalculate per-guest budget items if guest is confirmed
  if (guest.rsvpStatus === 'confirmed') {
    const { updatedItems } = await recalcPerGuestBudgetItems(tx, guest.clientId)
    if (updatedItems > 0) {
      cascadeActions.push({ module: 'budget', action: 'recalculated', count: updatedItems })
    }
  }

  return cascadeActions
}
