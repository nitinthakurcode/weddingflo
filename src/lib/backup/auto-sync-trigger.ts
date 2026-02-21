/**
 * Auto Sync Trigger
 *
 * Triggers cross-module sync operations when entities are updated.
 * Implements cascade sync logic for:
 * - Guest hotel/transport flags → create linked records
 * - Vendor cost changes → budget sync
 * - Timeline entry creation from hotels/transport
 *
 * February 2026 - Full implementation with transaction wrapping
 */

import { db } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';
import {
  guests,
  hotels,
  guestTransport,
  budget,
  timeline,
  clients,
} from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { withTransaction } from '@/features/chatbot/server/services/transaction-wrapper';

export type EntityType = 'guests' | 'vendors' | 'budget' | 'gifts' | 'hotels' | 'transport' | 'guestGifts';

/**
 * Sync result type for tracking what was synced
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  created: {
    hotels: number;
    transport: number;
    timeline: number;
    budget: number;
  };
  errors: string[];
}

/**
 * Trigger batch sync for a specific entity type.
 * This is called after import operations to ensure cross-module consistency.
 * Each client's sync is wrapped in a transaction for atomicity.
 */
export async function triggerBatchSync(entityType: EntityType, clientIds: string[]): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    created: {
      hotels: 0,
      transport: 0,
      timeline: 0,
      budget: 0,
    },
    errors: [],
  };

  console.log(`[AutoSync] Starting batch sync for ${entityType} with ${clientIds.length} client(s)`);

  for (const clientId of clientIds) {
    try {
      // Wrap each client's sync in a transaction for atomicity
      await withTransaction(async (tx) => {
        switch (entityType) {
          case 'guests':
            await syncGuestsToHotelsAndTransportTx(tx, clientId, result);
            break;
          case 'hotels':
            await syncHotelsToTimelineTx(tx, clientId, result);
            break;
          case 'transport':
            await syncTransportToTimelineTx(tx, clientId, result);
            break;
          case 'vendors':
            // Vendor sync handled in vendors router directly
            result.synced++;
            break;
          case 'budget':
          case 'gifts':
          case 'guestGifts':
            // These don't cascade to other modules
            result.synced++;
            break;
        }
      });
    } catch (error: any) {
      console.error(`[AutoSync] Error syncing ${entityType} for client ${clientId}:`, error);
      result.errors.push(`Client ${clientId}: ${error.message}`);
      result.success = false;
    }
  }

  console.log(`[AutoSync] Completed: synced=${result.synced}, hotels=${result.created.hotels}, transport=${result.created.transport}, timeline=${result.created.timeline}`);
  return result;
}

/**
 * Sync guests with hotelRequired/transportRequired flags to create linked records.
 * Called after guest import to ensure consistency.
 * @deprecated Use syncGuestsToHotelsAndTransportTx with transaction instead
 */
async function syncGuestsToHotelsAndTransport(clientId: string, result: SyncResult) {
  await withTransaction(async (tx) => {
    await syncGuestsToHotelsAndTransportTx(tx, clientId, result);
  });
}

/**
 * Sync guests with hotelRequired/transportRequired flags to create linked records.
 * Transaction-aware version for use within existing transactions.
 * Exported for use in import router for atomic import+sync operations.
 */
export async function syncGuestsToHotelsAndTransportTx(tx: any, clientId: string, result: SyncResult) {
  // Get client info for defaults
  const [client] = await tx
    .select({ weddingDate: clients.weddingDate })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  // Find guests with hotelRequired=true
  const guestsNeedingHotels = await tx
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
    })
    .from(guests)
    .where(
      and(
        eq(guests.clientId, clientId),
        eq(guests.hotelRequired, true)
      )
    );

  for (const guest of guestsNeedingHotels) {
    // DUPLICATE PREVENTION: Check if hotel record already exists for this guest
    const [existingHotel] = await tx
      .select({ id: hotels.id })
      .from(hotels)
      .where(eq(hotels.guestId, guest.id))
      .limit(1);

    if (!existingHotel) {
      // Calculate default dates from wedding date or arrival/departure
      let checkInDate: string | null = guest.hotelCheckIn || null;
      let checkOutDate: string | null = guest.hotelCheckOut || null;

      if (!checkInDate && guest.arrivalDatetime) {
        checkInDate = new Date(guest.arrivalDatetime).toISOString().split('T')[0];
      } else if (!checkInDate && client?.weddingDate) {
        const weddingDate = new Date(client.weddingDate);
        weddingDate.setDate(weddingDate.getDate() - 1);
        checkInDate = weddingDate.toISOString().split('T')[0];
      }

      if (!checkOutDate && guest.departureDatetime) {
        checkOutDate = new Date(guest.departureDatetime).toISOString().split('T')[0];
      } else if (!checkOutDate && client?.weddingDate) {
        const weddingDate = new Date(client.weddingDate);
        weddingDate.setDate(weddingDate.getDate() + 1);
        checkOutDate = weddingDate.toISOString().split('T')[0];
      }

      const guestName = `${guest.firstName} ${guest.lastName}`.trim();

      await tx.insert(hotels).values({
        clientId,
        guestId: guest.id,
        guestName,
        hotelName: guest.hotelName || null,
        roomType: guest.hotelRoomType || null,
        checkInDate,
        checkOutDate,
        accommodationNeeded: true,
      });

      result.created.hotels++;
      console.log(`[AutoSync] Created hotel record for guest: ${guestName}`);
    }
  }

  // Find guests with transportRequired=true
  const guestsNeedingTransport = await tx
    .select({
      id: guests.id,
      firstName: guests.firstName,
      lastName: guests.lastName,
      arrivalDatetime: guests.arrivalDatetime,
      arrivalMode: guests.arrivalMode,
      transportPickupLocation: guests.transportPickupLocation,
      transportPickupTime: guests.transportPickupTime,
      transportType: guests.transportType,
      transportNotes: guests.transportNotes,
      hotelName: guests.hotelName,
    })
    .from(guests)
    .where(
      and(
        eq(guests.clientId, clientId),
        eq(guests.transportRequired, true)
      )
    );

  for (const guest of guestsNeedingTransport) {
    // DUPLICATE PREVENTION: Check if transport record already exists for this guest
    const [existingTransport] = await tx
      .select({ id: guestTransport.id })
      .from(guestTransport)
      .where(eq(guestTransport.guestId, guest.id))
      .limit(1);

    if (!existingTransport) {
      // Calculate pickup date/time from arrival
      let pickupDate: string | null = null;
      let pickupTime: string | null = guest.transportPickupTime || null;

      if (guest.arrivalDatetime) {
        const arrivalDate = new Date(guest.arrivalDatetime);
        pickupDate = arrivalDate.toISOString().split('T')[0];
        if (!pickupTime) {
          pickupTime = arrivalDate.toTimeString().slice(0, 5);
        }
      }

      // Build vehicle info
      const vehicleParts: string[] = [];
      if (guest.transportType) vehicleParts.push(guest.transportType);
      if (guest.arrivalMode) vehicleParts.push(`(${guest.arrivalMode})`);
      const vehicleInfo = vehicleParts.length > 0 ? vehicleParts.join(' ') : null;

      const guestName = `${guest.firstName} ${guest.lastName}`.trim();

      await tx.insert(guestTransport).values({
        clientId,
        guestId: guest.id,
        guestName,
        legType: 'arrival',
        legSequence: 1,
        pickupDate,
        pickupTime,
        pickupFrom: guest.transportPickupLocation || null,
        dropTo: guest.hotelName || null,
        vehicleInfo,
        transportStatus: 'scheduled',
        notes: guest.transportNotes || null,
      });

      result.created.transport++;
      console.log(`[AutoSync] Created transport record for guest: ${guestName}`);
    }
  }

  result.synced++;
}

/**
 * Sync hotels to timeline entries.
 * Creates check-in/check-out timeline entries for hotel records.
 * @deprecated Use syncHotelsToTimelineTx with transaction instead
 */
async function syncHotelsToTimeline(clientId: string, result: SyncResult) {
  await withTransaction(async (tx) => {
    await syncHotelsToTimelineTx(tx, clientId, result);
  });
}

/**
 * Sync hotels to timeline entries.
 * Transaction-aware version for use within existing transactions.
 * Exported for use in import router for atomic import+sync operations.
 */
export async function syncHotelsToTimelineTx(tx: any, clientId: string, result: SyncResult) {
  // Get all hotels with check-in dates
  const hotelList = await tx
    .select()
    .from(hotels)
    .where(eq(hotels.clientId, clientId));

  for (const hotel of hotelList) {
    if (!hotel.checkInDate) continue;

    // DUPLICATE PREVENTION: Check if timeline entry already exists for this hotel
    const [existingEntry] = await tx
      .select({ id: timeline.id })
      .from(timeline)
      .where(
        and(
          eq(timeline.sourceModule, 'hotels'),
          eq(timeline.sourceId, hotel.id)
        )
      )
      .limit(1);

    if (!existingEntry) {
      const checkInDateTime = new Date(hotel.checkInDate);
      checkInDateTime.setHours(15, 0, 0, 0);

      await tx.insert(timeline).values({
        id: randomUUID(),
        clientId,
        title: `Hotel Check-in: ${hotel.guestName}`,
        description: hotel.hotelName ? `Check-in at ${hotel.hotelName}` : 'Guest hotel check-in',
        startTime: checkInDateTime,
        location: hotel.hotelName || null,
        notes: hotel.notes || null,
        sourceModule: 'hotels',
        sourceId: hotel.id,
        metadata: JSON.stringify({
          guestId: hotel.guestId,
          type: 'check-in',
        }),
      });

      result.created.timeline++;
      console.log(`[AutoSync] Created timeline entry for hotel: ${hotel.guestName}`);
    }
  }

  result.synced++;
}

/**
 * Sync transport to timeline entries.
 * Creates pickup timeline entries for transport records.
 * @deprecated Use syncTransportToTimelineTx with transaction instead
 */
async function syncTransportToTimeline(clientId: string, result: SyncResult) {
  await withTransaction(async (tx) => {
    await syncTransportToTimelineTx(tx, clientId, result);
  });
}

/**
 * Sync transport to timeline entries.
 * Transaction-aware version for use within existing transactions.
 * Exported for use in import router for atomic import+sync operations.
 */
export async function syncTransportToTimelineTx(tx: any, clientId: string, result: SyncResult) {
  // Get all transport records with pickup dates
  const transportList = await tx
    .select()
    .from(guestTransport)
    .where(eq(guestTransport.clientId, clientId));

  for (const transport of transportList) {
    if (!transport.pickupDate) continue;

    // DUPLICATE PREVENTION: Check if timeline entry already exists for this transport
    const [existingEntry] = await tx
      .select({ id: timeline.id })
      .from(timeline)
      .where(
        and(
          eq(timeline.sourceModule, 'transport'),
          eq(timeline.sourceId, transport.id)
        )
      )
      .limit(1);

    if (!existingEntry) {
      const pickupDateTime = new Date(transport.pickupDate);
      if (transport.pickupTime) {
        const [hours, minutes] = transport.pickupTime.split(':').map(Number);
        pickupDateTime.setHours(hours || 0, minutes || 0, 0, 0);
      }

      const legLabel = transport.legType === 'departure' ? 'Drop-off' : 'Pickup';

      await tx.insert(timeline).values({
        id: randomUUID(),
        clientId,
        title: `Transport ${legLabel}: ${transport.guestName}`,
        description: transport.pickupFrom ? `${legLabel} from ${transport.pickupFrom}` : `Guest ${legLabel.toLowerCase()}`,
        startTime: pickupDateTime,
        location: transport.pickupFrom || null,
        notes: transport.notes || null,
        sourceModule: 'transport',
        sourceId: transport.id,
        metadata: JSON.stringify({
          guestId: transport.guestId,
          type: legLabel.toLowerCase(),
          dropTo: transport.dropTo,
        }),
      });

      result.created.timeline++;
      console.log(`[AutoSync] Created timeline entry for transport: ${transport.guestName}`);
    }
  }

  result.synced++;
}

/**
 * Trigger a full sync for all modules in a client.
 * Used for manual sync or data recovery.
 * All sync operations are wrapped in a single transaction for atomicity.
 */
export async function triggerFullSync(clientId: string): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    created: {
      hotels: 0,
      transport: 0,
      timeline: 0,
      budget: 0,
    },
    errors: [],
  };

  console.log(`[AutoSync] Starting full sync for client: ${clientId}`);

  try {
    // Wrap entire full sync in a single transaction for atomicity
    await withTransaction(async (tx) => {
      await syncGuestsToHotelsAndTransportTx(tx, clientId, result);
      await syncHotelsToTimelineTx(tx, clientId, result);
      await syncTransportToTimelineTx(tx, clientId, result);
    });
  } catch (error: any) {
    console.error(`[AutoSync] Full sync error for client ${clientId}:`, error);
    result.errors.push(error.message);
    result.success = false;
  }

  console.log(`[AutoSync] Full sync completed: hotels=${result.created.hotels}, transport=${result.created.transport}, timeline=${result.created.timeline}`);
  return result;
}
