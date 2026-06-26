/**
 * Google Sheets Sync
 *
 * Handles bi-directional sync between WeddingFlo database and Google Sheets.
 * Supports all modules: Guests, Budget, Timeline, Hotels, Transport, Vendors, Gifts
 *
 * February 2026 - Full implementation
 */

import { randomUUID, createHash } from 'crypto';
import { sheets_v4 } from 'googleapis';
import { db } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';
import {
  guests,
  budget,
  timeline,
  hotels,
  guestTransport,
  vendors,
  clientVendors,
  gifts,
  clients,
  advancePayments,
  events,
} from '@/lib/db/schema';
import { syncVendorBudgetItem, cascadeVendorLinkDelete } from '@/lib/sync/vendor-budget-sync';
import { inArray } from 'drizzle-orm';
import { writeSheetData, readSheetData, formatSheetHeaders } from './sheets-client';
import { normalizeRsvpStatus, normalizeGuestSide } from '@/lib/constants/enums';
import { recalcClientStats } from '@/lib/sync/client-stats-sync';
import { runImportRecalcCascade } from '@/lib/import/import-cascade';
import { storeSyncAction, type SyncAction } from '@/lib/realtime/redis-pubsub';
import { getQueryPathsForModule } from '@/lib/realtime/query-paths';
import {
  syncGuestsToHotelsAndTransportTx,
  syncHotelsToTimelineTx,
  syncTransportToTimelineTx,
  type SyncResult,
} from '@/lib/backup/auto-sync-trigger';
import { syncEventsToTimelineTx } from '@/lib/sync/event-timeline-sync';

export interface SyncStats {
  exported: number;
  imported: number;
  deleted?: number;
  errors: string[];
  conflicts?: SyncConflict[];
}

export interface SyncConflict {
  id: string;
  module: string;
  rowId: string;
  sheetValues: Record<string, string>;
  dbUpdatedAt: string;
  exportTimestamp: string;
}

// ── Sync Metadata Helpers ──
// Writes export hashes to a _SyncMetadata sheet so imports can detect conflicts

const SYNC_METADATA_SHEET = '_SyncMetadata';
const SYNC_METADATA_HEADERS = ['Module', 'RowID', 'ExportHash', 'ExportTimestamp'];

function computeRowHash(values: (string | number | boolean)[]): string {
  const normalized = values.map(v => String(v ?? '')).join('|');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

interface SyncMetadataEntry {
  module: string;
  rowId: string;
  exportHash: string;
  exportTimestamp: string;
}

async function writeSyncMetadata(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  entries: SyncMetadataEntry[]
): Promise<void> {
  try {
    const data = [
      SYNC_METADATA_HEADERS,
      ...entries.map(e => [e.module, e.rowId, e.exportHash, e.exportTimestamp]),
    ];
    await writeSheetData(sheetsClient, spreadsheetId, SYNC_METADATA_SHEET, data);
  } catch (error) {
    // Don't fail the export if metadata write fails
    console.error('[Sheets Sync] Failed to write sync metadata:', error);
  }
}

async function readSyncMetadata(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<Map<string, SyncMetadataEntry>> {
  const map = new Map<string, SyncMetadataEntry>();
  try {
    const data = await readSheetData(sheetsClient, spreadsheetId, SYNC_METADATA_SHEET);
    if (data.length <= 1) return map;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] && row[1]) {
        const key = `${row[0]}:${row[1]}`;
        map.set(key, {
          module: row[0],
          rowId: row[1],
          exportHash: row[2] || '',
          exportTimestamp: row[3] || '',
        });
      }
    }
  } catch {
    // _SyncMetadata sheet may not exist yet — that's fine
  }
  return map;
}

function detectConflict(
  module: string,
  rowId: string,
  currentSheetRow: (string | number | boolean)[],
  dbUpdatedAt: Date | string | null | undefined,
  metadata: Map<string, SyncMetadataEntry>
): SyncConflict | null {
  const key = `${module}:${rowId}`;
  const meta = metadata.get(key);

  if (!meta) {
    // No metadata — first sync or metadata missing. No conflict detection possible.
    return null;
  }

  const currentHash = computeRowHash(currentSheetRow);
  const sheetWasEdited = currentHash !== meta.exportHash;

  if (!sheetWasEdited) {
    // Sheet row unchanged since export — no conflict even if DB changed
    return null;
  }

  // Sheet was edited. Check if DB was also edited after the export.
  if (dbUpdatedAt) {
    const dbTime = new Date(dbUpdatedAt).getTime();
    const exportTime = new Date(meta.exportTimestamp).getTime();

    if (dbTime > exportTime) {
      // BOTH Sheet and DB changed since last export — true conflict
      return {
        id: randomUUID(),
        module,
        rowId,
        sheetValues: {},
        dbUpdatedAt: new Date(dbUpdatedAt).toISOString(),
        exportTimestamp: meta.exportTimestamp,
      };
    }
  }

  // Only Sheet was edited, DB unchanged — safe to import (no conflict)
  return null;
}

// Sheet column definitions for each module.
// The trailing 'Action' column lets users mark a row DELETE/REMOVE in the Sheet;
// the bi-directional importers honour it via applySheetRowDelete(). It is always
// written blank on export. Column order is irrelevant — every read/write resolves
// columns by header name (headers.indexOf(...)), and export hashes are recomputed
// from the re-read sheet, so the blank Action column hashes identically on import.
const GUEST_HEADERS = [
  'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Group', 'Side',
  'RSVP Status', 'Party Size', 'Relationship', 'Arrival Date',
  'Arrival Mode', 'Departure Date', 'Departure Mode',
  'Hotel Required', 'Transport Required', 'Meal Preference',
  'Dietary Restrictions', 'Additional Guests', 'Events',
  'Gift To Give', 'Checked In', 'Notes', 'Last Updated', 'Action'
];

const BUDGET_HEADERS = [
  'ID', 'Item', 'Category', 'Segment', 'Estimated Cost',
  'Actual Cost', 'Paid Amount', 'Payment Status', 'Vendor',
  'Notes', 'Last Updated', 'Action'
];

const TIMELINE_HEADERS = [
  'ID', 'Title', 'Description', 'Start Time', 'End Time',
  'Location', 'Phase', 'Completed', 'Responsible Person',
  'Source Module', 'Notes', 'Last Updated', 'Action'
];

const HOTEL_HEADERS = [
  'ID', 'Guest Name', 'Hotel Name', 'Room Type', 'Room Number',
  'Check-In Date', 'Check-Out Date', 'Party Size',
  'Accommodation Needed', 'Booking Confirmed', 'Checked In',
  'Cost', 'Payment Status', 'Notes', 'Last Updated', 'Action'
];

const TRANSPORT_HEADERS = [
  'ID', 'Guest Name', 'Leg Type', 'Pickup Date', 'Pickup Time',
  'Pickup From', 'Drop To', 'Vehicle Info', 'Vehicle Number',
  'Driver Phone', 'Transport Status', 'Notes', 'Last Updated', 'Action'
];

const VENDOR_HEADERS = [
  'ID', 'Vendor Name', 'Category', 'Contact Name', 'Phone',
  'Email', 'Contract Amount', 'Total Paid', 'Payment Status',
  'Service Date', 'Event', 'Location', 'Rating', 'Notes', 'Last Updated', 'Action'
];

const GIFT_HEADERS = [
  'ID', 'Gift Name', 'Guest ID', 'Guest Name',
  'Value', 'Status', 'Last Updated', 'Action'
];

const EVENT_HEADERS = [
  'ID', 'Title', 'Event Type', 'Event Date', 'Start Time', 'End Time',
  'Location', 'Venue Name', 'Address', 'Guest Count', 'Status',
  'Description', 'Notes', 'Last Updated', 'Action'
];

/**
 * Broadcast a sync action to Redis for real-time updates
 */
export async function broadcastSheetSync(params: {
  module: string;
  companyId: string;
  clientId: string;
  userId: string;
  count: number;
}): Promise<void> {
  if (params.count === 0) return;

  const syncAction: SyncAction = {
    id: crypto.randomUUID(),
    type: 'update',
    module: params.module as SyncAction['module'],
    entityId: 'sheets-import',
    companyId: params.companyId,
    clientId: params.clientId,
    userId: params.userId,
    timestamp: Date.now(),
    queryPaths: getQueryPathsForModule(params.module),
  };
  await storeSyncAction(syncAction).catch(err => console.error('[Sheets Sync] Broadcast failed:', err));
}

/**
 * Export guests to Google Sheet
 */
export async function syncGuestsToSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const guestList = await db
      .select()
      .from(guests)
      .where(eq(guests.clientId, clientId));

    const data = [
      GUEST_HEADERS,
      ...guestList.map(g => [
        g.id,
        g.firstName,
        g.lastName || '',
        g.email || '',
        g.phone || '',
        g.groupName || '',
        g.guestSide || '',
        g.rsvpStatus || 'pending',
        g.partySize || 1,
        g.relationshipToFamily || '',
        g.arrivalDatetime ? new Date(g.arrivalDatetime).toISOString().slice(0, 16).replace('T', ' ') : '',
        g.arrivalMode || '',
        g.departureDatetime ? new Date(g.departureDatetime).toISOString().slice(0, 16).replace('T', ' ') : '',
        g.departureMode || '',
        g.hotelRequired ? 'Yes' : 'No',
        g.transportRequired ? 'Yes' : 'No',
        g.mealPreference || '',
        g.dietaryRestrictions || '',
        Array.isArray(g.additionalGuestNames) ? g.additionalGuestNames.join(', ') : '',
        Array.isArray(g.attendingEvents) ? g.attendingEvents.join(', ') : '',
        g.giftToGive || '',
        g.checkedIn ? 'Yes' : 'No',
        g.notes || '',
        g.updatedAt ? new Date(g.updatedAt).toISOString() : '',
        '', // Action (blank; set DELETE in the sheet to remove on import)
      ])
    ];

    await writeSheetData(sheetsClient, spreadsheetId, 'Guests', data);
    await formatSheetHeaders(sheetsClient, spreadsheetId, 0);
    stats.exported = guestList.length;
    console.log(`[Sheets Sync] Exported ${stats.exported} guests`);
  } catch (error: any) {
    stats.errors.push(`Guests: ${error.message}`);
    console.error('[Sheets Sync] Error exporting guests:', error);
  }

  return stats;
}

/**
 * Export budget items to Google Sheet
 */
export async function syncBudgetToSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const budgetList = await db
      .select({
        id: budget.id,
        item: budget.item,
        category: budget.category,
        segment: budget.segment,
        estimatedCost: budget.estimatedCost,
        actualCost: budget.actualCost,
        paidAmount: budget.paidAmount,
        paymentStatus: budget.paymentStatus,
        notes: budget.notes,
        updatedAt: budget.updatedAt,
        vendorName: vendors.name,
      })
      .from(budget)
      .leftJoin(vendors, eq(budget.vendorId, vendors.id))
      .where(eq(budget.clientId, clientId));

    const data = [
      BUDGET_HEADERS,
      ...budgetList.map(b => [
        b.id,
        b.item,
        b.category,
        b.segment || '',
        b.estimatedCost || '0',
        b.actualCost || '',
        b.paidAmount || '0',
        b.paymentStatus || 'pending',
        b.vendorName || '',
        b.notes || '',
        b.updatedAt ? new Date(b.updatedAt).toISOString() : '',
        '', // Action (blank; set DELETE in the sheet to remove on import)
      ])
    ];

    await writeSheetData(sheetsClient, spreadsheetId, 'Budget', data);
    await formatSheetHeaders(sheetsClient, spreadsheetId, 1);
    stats.exported = budgetList.length;
    console.log(`[Sheets Sync] Exported ${stats.exported} budget items`);
  } catch (error: any) {
    stats.errors.push(`Budget: ${error.message}`);
    console.error('[Sheets Sync] Error exporting budget:', error);
  }

  return stats;
}

/**
 * Export timeline to Google Sheet
 */
export async function syncTimelineToSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const timelineList = await db
      .select()
      .from(timeline)
      .where(eq(timeline.clientId, clientId));

    const data = [
      TIMELINE_HEADERS,
      ...timelineList.map(t => [
        t.id,
        t.title,
        t.description || '',
        t.startTime ? new Date(t.startTime).toISOString().slice(0, 16).replace('T', ' ') : '',
        t.endTime ? new Date(t.endTime).toISOString().slice(0, 16).replace('T', ' ') : '',
        t.location || '',
        t.phase || 'showtime',
        t.completed ? 'Yes' : 'No',
        t.responsiblePerson || '',
        t.sourceModule || '',
        t.notes || '',
        t.updatedAt ? new Date(t.updatedAt).toISOString() : '',
        '', // Action (blank; set DELETE in the sheet to remove on import)
      ])
    ];

    await writeSheetData(sheetsClient, spreadsheetId, 'Timeline', data);
    await formatSheetHeaders(sheetsClient, spreadsheetId, 2);
    stats.exported = timelineList.length;
    console.log(`[Sheets Sync] Exported ${stats.exported} timeline entries`);
  } catch (error: any) {
    stats.errors.push(`Timeline: ${error.message}`);
    console.error('[Sheets Sync] Error exporting timeline:', error);
  }

  return stats;
}

/**
 * Export hotels to Google Sheet
 */
export async function syncHotelsToSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const hotelList = await db
      .select()
      .from(hotels)
      .where(eq(hotels.clientId, clientId));

    const data = [
      HOTEL_HEADERS,
      ...hotelList.map(h => [
        h.id,
        h.guestName || '',
        h.hotelName || '',
        h.roomType || '',
        h.roomNumber || '',
        h.checkInDate || '',
        h.checkOutDate || '',
        h.partySize || 1,
        h.accommodationNeeded ? 'Yes' : 'No',
        h.bookingConfirmed ? 'Yes' : 'No',
        h.checkedIn ? 'Yes' : 'No',
        h.cost || '',
        h.paymentStatus || 'pending',
        h.notes || '',
        h.updatedAt ? new Date(h.updatedAt).toISOString() : '',
        '', // Action (blank; set DELETE in the sheet to remove on import)
      ])
    ];

    await writeSheetData(sheetsClient, spreadsheetId, 'Hotels', data);
    await formatSheetHeaders(sheetsClient, spreadsheetId, 3);
    stats.exported = hotelList.length;
    console.log(`[Sheets Sync] Exported ${stats.exported} hotel records`);
  } catch (error: any) {
    stats.errors.push(`Hotels: ${error.message}`);
    console.error('[Sheets Sync] Error exporting hotels:', error);
  }

  return stats;
}

/**
 * Export transport to Google Sheet
 */
export async function syncTransportToSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const transportList = await db
      .select()
      .from(guestTransport)
      .where(eq(guestTransport.clientId, clientId));

    const data = [
      TRANSPORT_HEADERS,
      ...transportList.map(t => [
        t.id,
        t.guestName || '',
        t.legType || 'arrival',
        t.pickupDate || '',
        t.pickupTime || '',
        t.pickupFrom || '',
        t.dropTo || '',
        t.vehicleInfo || '',
        t.vehicleNumber || '',
        t.driverPhone || '',
        t.transportStatus || 'scheduled',
        t.notes || '',
        t.updatedAt ? new Date(t.updatedAt).toISOString() : '',
        '', // Action (blank; set DELETE in the sheet to remove on import)
      ])
    ];

    await writeSheetData(sheetsClient, spreadsheetId, 'Transport', data);
    await formatSheetHeaders(sheetsClient, spreadsheetId, 4);
    stats.exported = transportList.length;
    console.log(`[Sheets Sync] Exported ${stats.exported} transport records`);
  } catch (error: any) {
    stats.errors.push(`Transport: ${error.message}`);
    console.error('[Sheets Sync] Error exporting transport:', error);
  }

  return stats;
}

/**
 * Export vendors to Google Sheet
 */
export async function syncVendorsToSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string,
  companyId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    // Get vendors linked to this client
    const vendorLinks = await db
      .select()
      .from(clientVendors)
      .where(eq(clientVendors.clientId, clientId));

    const vendorIds = vendorLinks.map(v => v.vendorId);

    const vendorList = await db
      .select()
      .from(vendors)
      .where(eq(vendors.companyId, companyId));

    // Filter to only vendors linked to this client
    const filteredVendors = vendorList.filter(v => vendorIds.includes(v.id));

    // Create a map of vendor links for additional data
    const linkMap = new Map(vendorLinks.map(l => [l.vendorId, l]));

    // Event title map (for the per-event "Event" column round-trip)
    const eventRows = await db
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(eq(events.clientId, clientId));
    const eventTitleById = new Map(eventRows.map(e => [e.id, e.title || '']));

    // Calculate total paid per vendor from advance payments
    const totalPaidMap = new Map<string, number>();
    if (vendorIds.length > 0) {
      const payments = await db
        .select({ vendorId: advancePayments.vendorId, amount: advancePayments.amount })
        .from(advancePayments)
        .where(inArray(advancePayments.vendorId, vendorIds));
      for (const p of payments) {
        if (p.vendorId) {
          const current = totalPaidMap.get(p.vendorId) || 0;
          totalPaidMap.set(p.vendorId, current + (parseFloat(p.amount) || 0));
        }
      }
    }

    const data = [
      VENDOR_HEADERS,
      ...filteredVendors.map(v => {
        const link = linkMap.get(v.id);
        const totalPaid = totalPaidMap.get(v.id);
        return [
          v.id,
          v.name,
          v.category || '',
          v.contactName || '',
          v.phone || '',
          v.email || '',
          link?.contractAmount || '',
          totalPaid != null ? totalPaid.toString() : '',
          link?.paymentStatus || 'pending',
          link?.serviceDate || '',
          (link?.eventId && eventTitleById.get(link.eventId)) || '',
          link?.venueAddress || '',
          v.rating || '',
          v.notes || '',
          v.updatedAt ? new Date(v.updatedAt).toISOString() : '',
          '', // Action (blank; set DELETE in the sheet to remove on import)
        ];
      })
    ];

    await writeSheetData(sheetsClient, spreadsheetId, 'Vendors', data);
    await formatSheetHeaders(sheetsClient, spreadsheetId, 5);
    stats.exported = filteredVendors.length;
    console.log(`[Sheets Sync] Exported ${stats.exported} vendors`);
  } catch (error: any) {
    stats.errors.push(`Vendors: ${error.message}`);
    console.error('[Sheets Sync] Error exporting vendors:', error);
  }

  return stats;
}

/**
 * Export gifts to Google Sheet
 */
export async function syncGiftsToSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const giftList = await db
      .select({
        id: gifts.id,
        name: gifts.name,
        guestId: gifts.guestId,
        guestFirstName: guests.firstName,
        guestLastName: guests.lastName,
        value: gifts.value,
        status: gifts.status,
        updatedAt: gifts.updatedAt,
      })
      .from(gifts)
      .leftJoin(guests, eq(gifts.guestId, guests.id))
      .where(eq(gifts.clientId, clientId));

    const data = [
      GIFT_HEADERS,
      ...giftList.map(g => {
        const guestName = [g.guestFirstName, g.guestLastName].filter(Boolean).join(' ').trim();
        return [
          g.id,
          g.name || '',
          g.guestId || '',
          guestName || '',
          g.value?.toString() || '',
          g.status || 'received',
          g.updatedAt ? new Date(g.updatedAt).toISOString() : '',
          '', // Action (blank; set DELETE in the sheet to remove on import)
        ];
      })
    ];

    await writeSheetData(sheetsClient, spreadsheetId, 'Gifts', data);
    await formatSheetHeaders(sheetsClient, spreadsheetId, 6);
    stats.exported = giftList.length;
    console.log(`[Sheets Sync] Exported ${stats.exported} gifts`);
  } catch (error: any) {
    stats.errors.push(`Gifts: ${error.message}`);
    console.error('[Sheets Sync] Error exporting gifts:', error);
  }

  return stats;
}

/**
 * Export events to Google Sheet (excludes soft-deleted events)
 */
export async function syncEventsToSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const eventList = await db
      .select({
        id: events.id,
        title: events.title,
        eventType: events.eventType,
        eventDate: events.eventDate,
        startTime: events.startTime,
        endTime: events.endTime,
        location: events.location,
        venueName: events.venueName,
        address: events.address,
        guestCount: events.guestCount,
        status: events.status,
        description: events.description,
        notes: events.notes,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .where(and(eq(events.clientId, clientId), isNull(events.deletedAt)));

    const data = [
      EVENT_HEADERS,
      ...eventList.map(e => [
        e.id,
        e.title || '',
        e.eventType || '',
        e.eventDate || '',
        e.startTime || '',
        e.endTime || '',
        e.location || '',
        e.venueName || '',
        e.address || '',
        e.guestCount?.toString() || '',
        e.status || 'planned',
        e.description || '',
        e.notes || '',
        e.updatedAt ? new Date(e.updatedAt).toISOString() : '',
        '', // Action (blank; set DELETE in the sheet to remove on import)
      ])
    ];

    await writeSheetData(sheetsClient, spreadsheetId, 'Events', data);
    await formatSheetHeaders(sheetsClient, spreadsheetId, 7);
    stats.exported = eventList.length;
    console.log(`[Sheets Sync] Exported ${stats.exported} events`);
  } catch (error: any) {
    stats.errors.push(`Events: ${error.message}`);
    console.error('[Sheets Sync] Error exporting events:', error);
  }

  return stats;
}

/**
 * Sync all modules to Google Sheets
 */
export async function syncAllToSheets(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string,
  companyId: string
): Promise<{
  success: boolean;
  totalExported: number;
  errors: string[];
}> {
  let totalExported = 0;
  const allErrors: string[] = [];

  // Sync each module
  const guestStats = await syncGuestsToSheet(sheetsClient, spreadsheetId, clientId);
  totalExported += guestStats.exported;
  allErrors.push(...guestStats.errors);

  const budgetStats = await syncBudgetToSheet(sheetsClient, spreadsheetId, clientId);
  totalExported += budgetStats.exported;
  allErrors.push(...budgetStats.errors);

  const timelineStats = await syncTimelineToSheet(sheetsClient, spreadsheetId, clientId);
  totalExported += timelineStats.exported;
  allErrors.push(...timelineStats.errors);

  const hotelStats = await syncHotelsToSheet(sheetsClient, spreadsheetId, clientId);
  totalExported += hotelStats.exported;
  allErrors.push(...hotelStats.errors);

  const transportStats = await syncTransportToSheet(sheetsClient, spreadsheetId, clientId);
  totalExported += transportStats.exported;
  allErrors.push(...transportStats.errors);

  const vendorStats = await syncVendorsToSheet(sheetsClient, spreadsheetId, clientId, companyId);
  totalExported += vendorStats.exported;
  allErrors.push(...vendorStats.errors);

  const giftStats = await syncGiftsToSheet(sheetsClient, spreadsheetId, clientId);
  totalExported += giftStats.exported;
  allErrors.push(...giftStats.errors);

  const eventStats = await syncEventsToSheet(sheetsClient, spreadsheetId, clientId);
  totalExported += eventStats.exported;
  allErrors.push(...eventStats.errors);

  console.log(`[Sheets Sync] Complete: ${totalExported} records exported, ${allErrors.length} errors`);

  // Write sync metadata for conflict detection on next import
  // Read all exported sheets and compute row hashes
  try {
    const metadataEntries: SyncMetadataEntry[] = [];
    const exportTimestamp = new Date().toISOString();
    const moduleSheets = ['Guests', 'Budget', 'Timeline', 'Hotels', 'Transport', 'Vendors', 'Gifts', 'Events'];

    for (const sheetName of moduleSheets) {
      try {
        const sheetData = await readSheetData(sheetsClient, spreadsheetId, sheetName);
        if (sheetData.length <= 1) continue;

        const headers = sheetData[0];
        const idIndex = headers.indexOf('ID');
        if (idIndex === -1) continue;

        for (let i = 1; i < sheetData.length; i++) {
          const row = sheetData[i];
          const rowId = row[idIndex];
          if (!rowId) continue;

          metadataEntries.push({
            module: sheetName.toLowerCase(),
            rowId,
            exportHash: computeRowHash(row),
            exportTimestamp,
          });
        }
      } catch {
        // Skip sheets that don't exist
      }
    }

    if (metadataEntries.length > 0) {
      await writeSyncMetadata(sheetsClient, spreadsheetId, metadataEntries);
      console.log(`[Sheets Sync] Wrote ${metadataEntries.length} sync metadata entries`);
    }
  } catch (error) {
    console.error('[Sheets Sync] Failed to write sync metadata (non-fatal):', error);
  }

  return {
    success: allErrors.length === 0,
    totalExported,
    errors: allErrors,
  };
}

/**
 * Import guests from Google Sheet (bi-directional sync)
 * Compares timestamps and imports newer records from Sheet
 */
/**
 * Shared delete-marker handler for bi-directional sheet imports. If the row's
 * "Action" column says DELETE/REMOVE and the row references an existing record
 * (had an ID in the sheet), the record is deleted (scoped to id + clientId).
 * Returns true when the row was a delete row, signalling the caller to `continue`.
 */
async function applySheetRowDelete(
  tx: any,
  table: any,
  headers: string[],
  row: any[],
  rawId: string | undefined,
  id: string,
  clientId: string,
  stats: SyncStats,
): Promise<boolean> {
  const actionIndex = headers.indexOf('Action');
  if (actionIndex === -1) return false;
  const action = String(row[actionIndex] ?? '').trim().toLowerCase();
  if (action !== 'delete' && action !== 'remove') return false;

  if (rawId && rawId.trim()) {
    const removed = await tx
      .delete(table)
      .where(and(eq(table.id, id), eq(table.clientId, clientId)))
      .returning({ id: table.id });
    stats.deleted = (stats.deleted || 0) + removed.length;
  }
  return true;
}

export async function importGuestsFromSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string,
  companyId?: string | null
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [], conflicts: [] };

  try {
    const sheetData = await readSheetData(sheetsClient, spreadsheetId, 'Guests');

    if (sheetData.length <= 1) {
      return stats;
    }

    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const updatedAtIndex = headers.indexOf('Last Updated');

    if (idIndex === -1) {
      stats.errors.push('Missing ID column in Guests sheet');
      return stats;
    }

    // Read sync metadata for conflict detection
    const metadata = await readSyncMetadata(sheetsClient, spreadsheetId);

    const existingGuests = await db
      .select({ id: guests.id, updatedAt: guests.updatedAt })
      .from(guests)
      .where(eq(guests.clientId, clientId));

    const existingMap = new Map(existingGuests.map(g => [g.id, g.updatedAt]));

    const dataRows = sheetData.slice(1);
    await db.transaction(async (tx) => {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rawId = row[idIndex];
        const id = rawId && rawId.trim() ? rawId.trim() : randomUUID();
        const dbUpdatedAt = existingMap.get(id);

        if (await applySheetRowDelete(tx, guests, headers, row, rawId, id, clientId, stats)) continue;

        // Conflict detection: check if both Sheet and DB changed since last export
        const conflict = detectConflict('guests', id, row, dbUpdatedAt, metadata);
        if (conflict) {
          stats.conflicts!.push(conflict);
          continue; // Skip conflicting rows — user must resolve
        }

        // Fallback: skip if DB record is newer (timestamp-based)
        const sheetUpdatedAt = row[updatedAtIndex] ? new Date(row[updatedAtIndex]) : null;
        if (dbUpdatedAt && sheetUpdatedAt && new Date(dbUpdatedAt) >= sheetUpdatedAt) {
          continue;
        }

        // Parse row data based on headers
        const getValue = (header: string) => {
          const idx = headers.indexOf(header);
          return idx !== -1 ? row[idx] : null;
        };

        const parseBoolean = (val: string | null) => {
          if (!val) return false;
          return val.toLowerCase() === 'yes' || val.toLowerCase() === 'true';
        };

        try {
          const guestData = {
            firstName: getValue('First Name') || '',
            lastName: getValue('Last Name') || null,
            email: getValue('Email') || null,
            phone: getValue('Phone') || null,
            groupName: getValue('Group') || null,
            guestSide: normalizeGuestSide(getValue('Side') || 'mutual'),
            rsvpStatus: normalizeRsvpStatus(getValue('RSVP Status') || 'pending'),
            partySize: parseInt(getValue('Party Size') || '1') || 1,
            relationshipToFamily: getValue('Relationship') || null,
            arrivalDatetime: getValue('Arrival Date') ? new Date(getValue('Arrival Date')!) : null,
            arrivalMode: getValue('Arrival Mode') || null,
            departureDatetime: getValue('Departure Date') ? new Date(getValue('Departure Date')!) : null,
            departureMode: getValue('Departure Mode') || null,
            hotelRequired: parseBoolean(getValue('Hotel Required')),
            transportRequired: parseBoolean(getValue('Transport Required')),
            mealPreference: getValue('Meal Preference') || null,
            dietaryRestrictions: getValue('Dietary Restrictions') || null,
            additionalGuestNames: getValue('Additional Guests')
              ? getValue('Additional Guests')!.split(',').map((s: string) => s.trim()).filter(Boolean)
              : null,
            attendingEvents: getValue('Events')
              ? getValue('Events')!.split(',').map((s: string) => s.trim()).filter(Boolean)
              : null,
            giftToGive: getValue('Gift To Give') || null,
            checkedIn: parseBoolean(getValue('Checked In')),
            notes: getValue('Notes') || null,
            updatedAt: new Date(),
          };

          // Skip rows with no name (e.g., merged cells in Sheets)
          if (!guestData.firstName || !guestData.firstName.trim()) {
            continue;
          }

          if (existingMap.has(id)) {
            // Update existing
            await tx.update(guests).set(guestData).where(eq(guests.id, id));
          } else {
            // Insert new
            await tx.insert(guests).values({
              id,
              clientId,
              companyId: companyId || undefined,
              ...guestData,
            });
          }

          stats.imported++;
        } catch (rowError: any) {
          stats.errors.push(`Row ${i + 2}: ${rowError.message}`);
        }
      }
    });

    // [P1] Centralized recalc cascade (SSOT) — guests → client stats AND per-guest budget
    // items. Previously only recalcClientStats ran here, so a Sheets guest confirm left
    // per-guest (e.g. per-plate) budget items stale vs the Excel/chatbot/UI paths.
    if (stats.imported > 0) {
      await runImportRecalcCascade(db, 'guests', clientId);
    }

    console.log(`[Sheets Sync] Imported ${stats.imported} guests from sheet`);
  } catch (error: any) {
    stats.errors.push(`Import error: ${error.message}`);
    console.error('[Sheets Sync] Error importing guests:', error);
  }

  return stats;
}

/**
 * Import budget items from Google Sheet (bi-directional sync)
 * Compares timestamps and imports newer records from Sheet
 */
export async function importBudgetFromSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string,
  companyId?: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [], conflicts: [] };

  try {
    const sheetData = await readSheetData(sheetsClient, spreadsheetId, 'Budget');

    if (sheetData.length <= 1) {
      return stats;
    }

    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const updatedAtIndex = headers.indexOf('Last Updated');

    if (idIndex === -1) {
      stats.errors.push('Missing ID column in Budget sheet');
      return stats;
    }

    // Read sync metadata for conflict detection
    const metadata = await readSyncMetadata(sheetsClient, spreadsheetId);

    const existingBudget = await db
      .select({ id: budget.id, updatedAt: budget.updatedAt })
      .from(budget)
      .where(eq(budget.clientId, clientId));

    const existingMap = new Map(existingBudget.map(b => [b.id, b.updatedAt]));

    const dataRows = sheetData.slice(1);
    await db.transaction(async (tx) => {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rawId = row[idIndex];
        const id = rawId && rawId.trim() ? rawId.trim() : randomUUID();
        const dbUpdatedAt = existingMap.get(id);

        if (await applySheetRowDelete(tx, budget, headers, row, rawId, id, clientId, stats)) continue;

        // Conflict detection
        const conflict = detectConflict('budget', id, row, dbUpdatedAt, metadata);
        if (conflict) {
          stats.conflicts!.push(conflict);
          continue;
        }

        // Fallback: skip if DB record is newer
        const sheetUpdatedAt = row[updatedAtIndex] ? new Date(row[updatedAtIndex]) : null;
        if (dbUpdatedAt && sheetUpdatedAt && new Date(dbUpdatedAt) >= sheetUpdatedAt) {
          continue;
        }

        const getValue = (header: string) => {
          const idx = headers.indexOf(header);
          return idx !== -1 ? row[idx] : null;
        };

        try {
          const budgetData = {
            item: getValue('Item') || '',
            category: getValue('Category') || 'other',
            segment: getValue('Segment') || null,
            estimatedCost: getValue('Estimated Cost') || '0',
            actualCost: getValue('Actual Cost') || null,
            paidAmount: getValue('Paid Amount') || '0',
            paymentStatus: getValue('Payment Status') || 'pending',
            notes: getValue('Notes') || null,
            updatedAt: new Date(),
          };

          if (existingMap.has(id)) {
            await tx.update(budget).set(budgetData).where(eq(budget.id, id));
          } else if (budgetData.item) {
            await tx.insert(budget).values({
              id,
              clientId,
              companyId: companyId || undefined,
              ...budgetData,
            });
          }

          stats.imported++;
        } catch (rowError: any) {
          stats.errors.push(`Budget Row ${i + 2}: ${rowError.message}`);
        }
      }
    });

    // Centralized recalc cascade (SSOT) — budget → client stats AND per-guest budget items.
    // (Sibling of P1: a budget-sheet import previously skipped recalcPerGuestBudgetItems.)
    if (stats.imported > 0) {
      await runImportRecalcCascade(db, 'budget', clientId);
    }

    console.log(`[Sheets Sync] Imported ${stats.imported} budget items from sheet`);
  } catch (error: any) {
    stats.errors.push(`Budget import error: ${error.message}`);
    console.error('[Sheets Sync] Error importing budget:', error);
  }

  return stats;
}

/**
 * Import vendors from Google Sheet (bi-directional sync)
 * Handles both vendors and client_vendors tables
 */
export async function importVendorsFromSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string,
  companyId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const sheetData = await readSheetData(sheetsClient, spreadsheetId, 'Vendors');

    if (sheetData.length <= 1) {
      return stats;
    }

    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const updatedAtIndex = headers.indexOf('Last Updated');

    if (idIndex === -1) {
      stats.errors.push('Missing ID column in Vendors sheet');
      return stats;
    }

    // Get existing vendors
    const existingVendors = await db
      .select({ id: vendors.id, updatedAt: vendors.updatedAt })
      .from(vendors)
      .where(eq(vendors.companyId, companyId));

    const existingMap = new Map(existingVendors.map(v => [v.id, v.updatedAt]));

    // Get existing client_vendors links
    const existingLinks = await db
      .select({ vendorId: clientVendors.vendorId })
      .from(clientVendors)
      .where(eq(clientVendors.clientId, clientId));

    const linkedVendorIds = new Set(existingLinks.map(l => l.vendorId));

    // Event lookup for the "Event" column round-trip: title → eventId.
    const eventRows = await db
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(eq(events.clientId, clientId));
    const eventByTitle = new Map(
      eventRows.filter(e => !!e.title).map(e => [e.title!.toLowerCase().trim(), e.id]),
    );
    const hasEventCol = headers.indexOf('Event') !== -1;

    const dataRows = sheetData.slice(1);
    await db.transaction(async (tx) => {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rawId = row[idIndex];
        const id = rawId && rawId.trim() ? rawId.trim() : randomUUID();
        const sheetUpdatedAt = row[updatedAtIndex] ? new Date(row[updatedAtIndex]) : null;
        const dbUpdatedAt = existingMap.get(id);

        // Explicit delete: row marked DELETE removes the client↔vendor link
        {
          const actionIndex = headers.indexOf('Action');
          const action = actionIndex !== -1 ? String(row[actionIndex] ?? '').trim().toLowerCase() : '';
          if (action === 'delete' || action === 'remove') {
            if (rawId && rawId.trim()) {
              const removed = await tx
                .delete(clientVendors)
                .where(and(eq(clientVendors.vendorId, id), eq(clientVendors.clientId, clientId)))
                .returning({ id: clientVendors.id });
              stats.deleted = (stats.deleted || 0) + removed.length;
              if (removed.length > 0) {
                // Cascade: remove linked budget item + timeline entry (parity with
                // vendors.router.delete and the Excel importer).
                await cascadeVendorLinkDelete(tx, {
                  clientId,
                  vendorId: id,
                  clientVendorId: removed[0].id,
                });
                linkedVendorIds.delete(id);
              }
            }
            continue;
          }
        }

        // Skip if DB record is newer or same
        if (dbUpdatedAt && sheetUpdatedAt && new Date(dbUpdatedAt) >= sheetUpdatedAt) {
          continue;
        }

        const getValue = (header: string) => {
          const idx = headers.indexOf(header);
          return idx !== -1 ? row[idx] : null;
        };

        try {
          const vendorData = {
            name: getValue('Vendor Name') || '',
            category: getValue('Category') || 'other',
            contactName: getValue('Contact Name') || null,
            phone: getValue('Phone') || null,
            email: getValue('Email') || null,
            rating: getValue('Rating') || null,
            notes: getValue('Notes') || null,
            updatedAt: new Date(),
          };

          if (!vendorData.name) {
            continue;
          }

          if (existingMap.has(id)) {
            await tx.update(vendors).set(vendorData).where(eq(vendors.id, id));
          } else {
            await tx.insert(vendors).values({
              id,
              companyId,
              ...vendorData,
            });
            existingMap.set(id, new Date());
          }

          // Create or update client_vendor link
          const contractAmount = getValue('Contract Amount');
          const serviceDate = getValue('Service Date');
          const paymentStatus = getValue('Payment Status') || 'pending';
          const venueAddress = getValue('Location');

          // Resolve the "Event" column → eventId for per-event re-linking.
          //   undefined = column absent          → leave existing link untouched
          //   null      = column present + blank  → unassign
          //   <id>      = column present + match  → link to that event
          let resolvedEventId: string | null | undefined = undefined;
          if (hasEventCol) {
            const eventName = String(getValue('Event') ?? '').trim();
            if (!eventName) {
              resolvedEventId = null;
            } else {
              const match = eventByTitle.get(eventName.toLowerCase());
              if (match) {
                resolvedEventId = match;
              } else {
                stats.errors.push(`Vendor Row ${i + 2}: event "${eventName}" not found — vendor's event left unchanged`);
              }
            }
          }

          if (!linkedVendorIds.has(id)) {
            await tx.insert(clientVendors).values({
              id: randomUUID(),
              clientId,
              vendorId: id,
              companyId,
              contractAmount: contractAmount || null,
              serviceDate: serviceDate || null,
              paymentStatus: paymentStatus as any,
              venueAddress: venueAddress || null,
              ...(resolvedEventId !== undefined ? { eventId: resolvedEventId } : {}),
            });
            linkedVendorIds.add(id);
          } else {
            await tx.update(clientVendors).set({
              contractAmount: contractAmount || null,
              serviceDate: serviceDate || null,
              paymentStatus: paymentStatus as any,
              venueAddress: venueAddress || null,
              ...(resolvedEventId !== undefined ? { eventId: resolvedEventId } : {}),
              updatedAt: new Date(),
            }).where(
              and(eq(clientVendors.clientId, clientId), eq(clientVendors.vendorId, id))
            );
          }

          // Vendor → budget automation (parity with vendors.router + Excel import):
          // keep the linked budget item's cost / payment / event in sync.
          await syncVendorBudgetItem(tx, {
            clientId,
            companyId,
            vendorId: id,
            vendorName: vendorData.name,
            cost: contractAmount || null,
            paymentStatus: paymentStatus as string,
            ...(resolvedEventId !== undefined ? { eventId: resolvedEventId } : {}),
          });

          stats.imported++;
        } catch (rowError: any) {
          stats.errors.push(`Vendor Row ${i + 2}: ${rowError.message}`);
        }
      }
    });

    // [I1] Centralized recalc cascade (SSOT) — vendors → client stats. The single-module
    // vendor-sheet sync previously skipped recalcClientStats entirely, leaving client budget
    // totals stale (the 'all' path recalced; this one didn't).
    if (stats.imported > 0) {
      await runImportRecalcCascade(db, 'vendors', clientId);
    }

    console.log(`[Sheets Sync] Imported ${stats.imported} vendors from sheet`);
  } catch (error: any) {
    stats.errors.push(`Vendor import error: ${error.message}`);
    console.error('[Sheets Sync] Error importing vendors:', error);
  }

  return stats;
}

/**
 * Import hotels from Google Sheet (bi-directional sync)
 */
export async function importHotelsFromSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string,
  companyId?: string | null
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [], conflicts: [] };

  try {
    const sheetData = await readSheetData(sheetsClient, spreadsheetId, 'Hotels');

    if (sheetData.length <= 1) {
      return stats;
    }

    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const updatedAtIndex = headers.indexOf('Last Updated');

    if (idIndex === -1) {
      stats.errors.push('Missing ID column in Hotels sheet');
      return stats;
    }

    // Read sync metadata for conflict detection
    const metadata = await readSyncMetadata(sheetsClient, spreadsheetId);

    const existingHotels = await db
      .select({ id: hotels.id, updatedAt: hotels.updatedAt })
      .from(hotels)
      .where(eq(hotels.clientId, clientId));

    const existingMap = new Map(existingHotels.map(h => [h.id, h.updatedAt]));

    const dataRows = sheetData.slice(1);
    await db.transaction(async (tx) => {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rawId = row[idIndex];
        const id = rawId && rawId.trim() ? rawId.trim() : randomUUID();
        const dbUpdatedAt = existingMap.get(id);

        if (await applySheetRowDelete(tx, hotels, headers, row, rawId, id, clientId, stats)) continue;

        // Conflict detection
        const conflict = detectConflict('hotels', id, row, dbUpdatedAt, metadata);
        if (conflict) {
          stats.conflicts!.push(conflict);
          continue;
        }

        const sheetUpdatedAt = row[updatedAtIndex] ? new Date(row[updatedAtIndex]) : null;
        if (dbUpdatedAt && sheetUpdatedAt && new Date(dbUpdatedAt) >= sheetUpdatedAt) {
          continue;
        }

        const getValue = (header: string) => {
          const idx = headers.indexOf(header);
          return idx !== -1 ? row[idx] : null;
        };

        const parseBoolean = (val: string | null) => {
          if (!val) return false;
          return val.toLowerCase() === 'yes' || val.toLowerCase() === 'true';
        };

        try {
          const hotelData = {
            guestName: getValue('Guest Name') || '',
            hotelName: getValue('Hotel Name') || null,
            roomType: getValue('Room Type') || null,
            roomNumber: getValue('Room Number') || null,
            checkInDate: getValue('Check-In Date') || null,
            checkOutDate: getValue('Check-Out Date') || null,
            partySize: parseInt(getValue('Party Size') || '1') || 1,
            accommodationNeeded: parseBoolean(getValue('Accommodation Needed')),
            bookingConfirmed: parseBoolean(getValue('Booking Confirmed')),
            checkedIn: parseBoolean(getValue('Checked In')),
            cost: getValue('Cost') || null,
            paymentStatus: getValue('Payment Status') || 'pending',
            notes: getValue('Notes') || null,
            updatedAt: new Date(),
          };

          if (!hotelData.guestName) {
            continue;
          }

          if (existingMap.has(id)) {
            await tx.update(hotels).set(hotelData).where(eq(hotels.id, id));
          } else {
            await tx.insert(hotels).values({
              id,
              clientId,
              companyId: companyId || null,
              ...hotelData,
            });
          }

          stats.imported++;
        } catch (rowError: any) {
          stats.errors.push(`Hotel Row ${i + 2}: ${rowError.message}`);
        }
      }
    });

    console.log(`[Sheets Sync] Imported ${stats.imported} hotels from sheet`);
  } catch (error: any) {
    stats.errors.push(`Hotel import error: ${error.message}`);
    console.error('[Sheets Sync] Error importing hotels:', error);
  }

  return stats;
}

/**
 * Import transport from Google Sheet (bi-directional sync)
 */
export async function importTransportFromSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string,
  companyId?: string | null
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [], conflicts: [] };

  try {
    const sheetData = await readSheetData(sheetsClient, spreadsheetId, 'Transport');

    if (sheetData.length <= 1) {
      return stats;
    }

    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const updatedAtIndex = headers.indexOf('Last Updated');

    if (idIndex === -1) {
      stats.errors.push('Missing ID column in Transport sheet');
      return stats;
    }

    // Read sync metadata for conflict detection
    const metadata = await readSyncMetadata(sheetsClient, spreadsheetId);

    const existingTransport = await db
      .select({ id: guestTransport.id, updatedAt: guestTransport.updatedAt })
      .from(guestTransport)
      .where(eq(guestTransport.clientId, clientId));

    const existingMap = new Map(existingTransport.map(t => [t.id, t.updatedAt]));

    const dataRows = sheetData.slice(1);
    await db.transaction(async (tx) => {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rawId = row[idIndex];
        const id = rawId && rawId.trim() ? rawId.trim() : randomUUID();
        const dbUpdatedAt = existingMap.get(id);

        if (await applySheetRowDelete(tx, guestTransport, headers, row, rawId, id, clientId, stats)) continue;

        // Conflict detection
        const conflict = detectConflict('transport', id, row, dbUpdatedAt, metadata);
        if (conflict) {
          stats.conflicts!.push(conflict);
          continue;
        }

        const sheetUpdatedAt = row[updatedAtIndex] ? new Date(row[updatedAtIndex]) : null;
        if (dbUpdatedAt && sheetUpdatedAt && new Date(dbUpdatedAt) >= sheetUpdatedAt) {
          continue;
        }

        const getValue = (header: string) => {
          const idx = headers.indexOf(header);
          return idx !== -1 ? row[idx] : null;
        };

        try {
          const transportData = {
            guestName: getValue('Guest Name') || '',
            legType: getValue('Leg Type') || 'arrival',
            pickupDate: getValue('Pickup Date') || null,
            pickupTime: getValue('Pickup Time') || null,
            pickupFrom: getValue('Pickup From') || null,
            dropTo: getValue('Drop To') || null,
            vehicleInfo: getValue('Vehicle Info') || null,
            vehicleNumber: getValue('Vehicle Number') || null,
            driverPhone: getValue('Driver Phone') || null,
            transportStatus: getValue('Transport Status') || 'scheduled',
            notes: getValue('Notes') || null,
            updatedAt: new Date(),
          };

          if (!transportData.guestName) {
            continue;
          }

          if (existingMap.has(id)) {
            await tx.update(guestTransport).set(transportData).where(eq(guestTransport.id, id));
          } else {
            await tx.insert(guestTransport).values({
              id,
              clientId,
              companyId: companyId || null,
              ...transportData,
            });
          }

          stats.imported++;
        } catch (rowError: any) {
          stats.errors.push(`Transport Row ${i + 2}: ${rowError.message}`);
        }
      }
    });

    console.log(`[Sheets Sync] Imported ${stats.imported} transport records from sheet`);
  } catch (error: any) {
    stats.errors.push(`Transport import error: ${error.message}`);
    console.error('[Sheets Sync] Error importing transport:', error);
  }

  return stats;
}

/**
 * Import timeline from Google Sheet (bi-directional sync)
 * Preserves sourceModule/sourceId for linked items
 */
export async function importTimelineFromSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const sheetData = await readSheetData(sheetsClient, spreadsheetId, 'Timeline');

    if (sheetData.length <= 1) {
      return stats;
    }

    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const updatedAtIndex = headers.indexOf('Last Updated');

    if (idIndex === -1) {
      stats.errors.push('Missing ID column in Timeline sheet');
      return stats;
    }

    const existingTimeline = await db
      .select({ id: timeline.id, updatedAt: timeline.updatedAt, sourceModule: timeline.sourceModule })
      .from(timeline)
      .where(eq(timeline.clientId, clientId));

    const existingMap = new Map(existingTimeline.map(t => [t.id, { updatedAt: t.updatedAt, sourceModule: t.sourceModule }]));

    const dataRows = sheetData.slice(1);
    await db.transaction(async (tx) => {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rawId = row[idIndex];
        const id = rawId && rawId.trim() ? rawId.trim() : randomUUID();
        const sheetUpdatedAt = row[updatedAtIndex] ? new Date(row[updatedAtIndex]) : null;
        const existing = existingMap.get(id);

        if (await applySheetRowDelete(tx, timeline, headers, row, rawId, id, clientId, stats)) continue;

        // Skip if DB record is newer
        if (existing?.updatedAt && sheetUpdatedAt && new Date(existing.updatedAt) >= sheetUpdatedAt) {
          continue;
        }

        // Skip auto-generated items (hotels, transport, events sync)
        if (existing?.sourceModule && ['hotels', 'transport', 'events'].includes(existing.sourceModule)) {
          continue;
        }

        const getValue = (header: string) => {
          const idx = headers.indexOf(header);
          return idx !== -1 ? row[idx] : null;
        };

        const parseBoolean = (val: string | null) => {
          if (!val) return false;
          return val.toLowerCase() === 'yes' || val.toLowerCase() === 'true';
        };

        try {
          const startTimeStr = getValue('Start Time');
          const endTimeStr = getValue('End Time');

          const title = getValue('Title') || '';

          // Skip rows without title or startTime (required for insert)
          if (!title || !startTimeStr) {
            if (!title) continue;
            // For existing entries, we can update without startTime
            if (!existingMap.has(id)) continue;
          }

          const startTime = startTimeStr ? new Date(startTimeStr) : undefined;
          const endTime = endTimeStr ? new Date(endTimeStr) : undefined;

          if (existingMap.has(id)) {
            // Update existing - can handle partial updates
            const updateData: Partial<typeof timeline.$inferInsert> = {
              title,
              description: getValue('Description') || null,
              location: getValue('Location') || null,
              phase: getValue('Phase') || 'showtime',
              completed: parseBoolean(getValue('Completed')),
              responsiblePerson: getValue('Responsible Person') || null,
              notes: getValue('Notes') || null,
              updatedAt: new Date(),
            };
            if (startTime) updateData.startTime = startTime;
            if (endTime) updateData.endTime = endTime;
            await tx.update(timeline).set(updateData).where(eq(timeline.id, id));
          } else {
            // Insert requires startTime
            await tx.insert(timeline).values({
              id,
              clientId,
              title,
              description: getValue('Description') || null,
              startTime: startTime!,
              endTime: endTime || undefined,
              location: getValue('Location') || null,
              phase: getValue('Phase') || 'showtime',
              completed: parseBoolean(getValue('Completed')),
              responsiblePerson: getValue('Responsible Person') || null,
              notes: getValue('Notes') || null,
            });
          }

          stats.imported++;
        } catch (rowError: any) {
          stats.errors.push(`Timeline Row ${i + 2}: ${rowError.message}`);
        }
      }
    });

    console.log(`[Sheets Sync] Imported ${stats.imported} timeline entries from sheet`);
  } catch (error: any) {
    stats.errors.push(`Timeline import error: ${error.message}`);
    console.error('[Sheets Sync] Error importing timeline:', error);
  }

  return stats;
}

/**
 * Import gifts from Google Sheet (bi-directional sync)
 */
export async function importGiftsFromSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const sheetData = await readSheetData(sheetsClient, spreadsheetId, 'Gifts');

    if (sheetData.length <= 1) {
      return stats;
    }

    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const updatedAtIndex = headers.indexOf('Last Updated');

    if (idIndex === -1) {
      stats.errors.push('Missing ID column in Gifts sheet');
      return stats;
    }

    const existingGifts = await db
      .select({ id: gifts.id, updatedAt: gifts.updatedAt })
      .from(gifts)
      .where(eq(gifts.clientId, clientId));

    const existingMap = new Map(existingGifts.map(g => [g.id, g.updatedAt]));

    // Build guest name→id lookup for resolving Guest Name to Guest ID
    const clientGuests = await db
      .select({ id: guests.id, firstName: guests.firstName, lastName: guests.lastName })
      .from(guests)
      .where(eq(guests.clientId, clientId));
    const guestNameMap = new Map(clientGuests.map(g => [
      `${g.firstName || ''} ${g.lastName || ''}`.trim().toLowerCase(), g.id
    ]));

    const dataRows = sheetData.slice(1);
    await db.transaction(async (tx) => {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rawId = row[idIndex];
        const id = rawId && rawId.trim() ? rawId.trim() : randomUUID();
        const sheetUpdatedAt = row[updatedAtIndex] ? new Date(row[updatedAtIndex]) : null;
        const dbUpdatedAt = existingMap.get(id);

        if (await applySheetRowDelete(tx, gifts, headers, row, rawId, id, clientId, stats)) continue;

        if (dbUpdatedAt && sheetUpdatedAt && new Date(dbUpdatedAt) >= sheetUpdatedAt) {
          continue;
        }

        const getValue = (header: string) => {
          const idx = headers.indexOf(header);
          return idx !== -1 ? row[idx] : null;
        };

        try {
          // Resolve Guest ID: prefer explicit ID, fall back to name lookup
          let guestId = getValue('Guest ID') || null;
          if (!guestId) {
            const guestName = getValue('Guest Name');
            if (guestName) {
              guestId = guestNameMap.get(guestName.trim().toLowerCase()) || null;
            }
          }

          const giftData = {
            name: getValue('Gift Name') || '',
            guestId,
            value: getValue('Value') ? parseFloat(getValue('Value')!) : null,
            status: getValue('Status') || 'received',
            updatedAt: new Date(),
          };

          if (!giftData.name) {
            continue;
          }

          if (existingMap.has(id)) {
            await tx.update(gifts).set(giftData).where(eq(gifts.id, id));
          } else {
            await tx.insert(gifts).values({
              id,
              clientId,
              ...giftData,
            });
          }

          stats.imported++;
        } catch (rowError: any) {
          stats.errors.push(`Gift Row ${i + 2}: ${rowError.message}`);
        }
      }
    });

    console.log(`[Sheets Sync] Imported ${stats.imported} gifts from sheet`);
  } catch (error: any) {
    stats.errors.push(`Gift import error: ${error.message}`);
    console.error('[Sheets Sync] Error importing gifts:', error);
  }

  return stats;
}

/**
 * Import events from Google Sheet (bi-directional sync).
 * Upserts events by ID; DELETE in the Action column removes the event (the
 * caller regenerates event-linked timeline items afterward via syncEventsToTimelineTx).
 */
export async function importEventsFromSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string,
  companyId?: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [], conflicts: [] };

  try {
    const sheetData = await readSheetData(sheetsClient, spreadsheetId, 'Events');

    if (sheetData.length <= 1) {
      return stats;
    }

    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const updatedAtIndex = headers.indexOf('Last Updated');

    if (idIndex === -1) {
      stats.errors.push('Missing ID column in Events sheet');
      return stats;
    }

    const metadata = await readSyncMetadata(sheetsClient, spreadsheetId);

    const existingEvents = await db
      .select({ id: events.id, updatedAt: events.updatedAt })
      .from(events)
      .where(eq(events.clientId, clientId));

    const existingMap = new Map(existingEvents.map(e => [e.id, e.updatedAt]));

    const dataRows = sheetData.slice(1);
    await db.transaction(async (tx) => {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rawId = row[idIndex];
        const id = rawId && rawId.trim() ? rawId.trim() : randomUUID();
        const dbUpdatedAt = existingMap.get(id);

        // Delete-on-Action: also remove the event's auto-generated timeline items.
        const actionIndex = headers.indexOf('Action');
        const action = actionIndex !== -1 ? String(row[actionIndex] ?? '').trim().toLowerCase() : '';
        if ((action === 'delete' || action === 'remove') && rawId && rawId.trim()) {
          await tx.delete(timeline).where(
            and(
              eq(timeline.sourceModule, 'events'),
              eq(timeline.sourceId, id),
              eq(timeline.clientId, clientId),
            ),
          );
          const removed = await tx
            .delete(events)
            .where(and(eq(events.id, id), eq(events.clientId, clientId)))
            .returning({ id: events.id });
          stats.deleted = (stats.deleted || 0) + removed.length;
          continue;
        }

        // Conflict detection
        const conflict = detectConflict('events', id, row, dbUpdatedAt, metadata);
        if (conflict) {
          stats.conflicts!.push(conflict);
          continue;
        }

        // Fallback: skip if DB record is newer
        const sheetUpdatedAt = row[updatedAtIndex] ? new Date(row[updatedAtIndex]) : null;
        if (dbUpdatedAt && sheetUpdatedAt && new Date(dbUpdatedAt) >= sheetUpdatedAt) {
          continue;
        }

        const getValue = (header: string) => {
          const idx = headers.indexOf(header);
          return idx !== -1 ? row[idx] : null;
        };

        try {
          const guestCountRaw = getValue('Guest Count');
          const guestCount = guestCountRaw !== null && String(guestCountRaw).trim() !== ''
            ? parseInt(String(guestCountRaw).replace(/[^0-9-]/g, ''), 10)
            : null;

          const eventData = {
            title: getValue('Title') || '',
            eventType: getValue('Event Type') || null,
            eventDate: getValue('Event Date') || null,
            startTime: getValue('Start Time') || null,
            endTime: getValue('End Time') || null,
            location: getValue('Location') || null,
            venueName: getValue('Venue Name') || null,
            address: getValue('Address') || null,
            guestCount: Number.isNaN(guestCount as number) ? null : guestCount,
            status: getValue('Status') || 'planned',
            description: getValue('Description') || null,
            notes: getValue('Notes') || null,
            updatedAt: new Date(),
          };

          if (existingMap.has(id)) {
            await tx.update(events).set(eventData).where(eq(events.id, id));
            stats.imported++;
          } else if (eventData.title) {
            await tx.insert(events).values({
              id,
              clientId,
              companyId: companyId || undefined,
              ...eventData,
            });
            stats.imported++;
          }
        } catch (rowError: any) {
          stats.errors.push(`Events Row ${i + 2}: ${rowError.message}`);
        }
      }
    });

    console.log(`[Sheets Sync] Imported ${stats.imported} events from sheet`);
  } catch (error: any) {
    stats.errors.push(`Events import error: ${error.message}`);
    console.error('[Sheets Sync] Error importing events:', error);
  }

  return stats;
}

/**
 * Import all modules from Google Sheets (bi-directional sync)
 */
export async function importAllFromSheets(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string,
  companyId: string,
  userId: string
): Promise<{
  success: boolean;
  totalImported: number;
  byModule: Record<string, number>;
  errors: string[];
  conflicts: SyncConflict[];
}> {
  let totalImported = 0;
  const byModule: Record<string, number> = {};
  const allErrors: string[] = [];
  const allConflicts: SyncConflict[] = [];

  // Import each module (collect conflicts from all)
  const guestStats = await importGuestsFromSheet(sheetsClient, spreadsheetId, clientId, companyId);
  totalImported += guestStats.imported;
  byModule.guests = guestStats.imported;
  allErrors.push(...guestStats.errors);
  if (guestStats.conflicts) allConflicts.push(...guestStats.conflicts);

  // Cascade sync after guest import. importGuestsFromSheet already ran the centralized recalc
  // cascade (client stats + per-guest budget), so we don't recalc again here.
  if (guestStats.imported > 0) {
    try {
      const cascadeResult: SyncResult = { success: true, synced: 0, created: { hotels: 0, transport: 0, timeline: 0, budget: 0 }, errors: [] };
      // S7-M09: use transaction client instead of bare db
      await db.transaction(async (tx) => {
        await syncGuestsToHotelsAndTransportTx(tx, clientId, cascadeResult);
      });
    } catch (err) {
      console.error('[Sheets Sync] Guest cascade sync failed:', err);
    }
  }

  const budgetStats = await importBudgetFromSheet(sheetsClient, spreadsheetId, clientId, companyId);
  totalImported += budgetStats.imported;
  byModule.budget = budgetStats.imported;
  allErrors.push(...budgetStats.errors);
  if (budgetStats.conflicts) allConflicts.push(...budgetStats.conflicts);

  const vendorStats = await importVendorsFromSheet(sheetsClient, spreadsheetId, clientId, companyId);
  totalImported += vendorStats.imported;
  byModule.vendors = vendorStats.imported;
  allErrors.push(...vendorStats.errors);

  // (Vendor client-stat recalc now lives inside importVendorsFromSheet's centralized cascade.)

  const hotelStats = await importHotelsFromSheet(sheetsClient, spreadsheetId, clientId);
  totalImported += hotelStats.imported;
  byModule.hotels = hotelStats.imported;
  allErrors.push(...hotelStats.errors);
  if (hotelStats.conflicts) allConflicts.push(...hotelStats.conflicts);

  if (hotelStats.imported > 0) {
    try {
      const cascadeResult: SyncResult = { success: true, synced: 0, created: { hotels: 0, transport: 0, timeline: 0, budget: 0 }, errors: [] };
      // S7-M09: use transaction client instead of bare db
      await db.transaction(async (tx) => {
        await syncHotelsToTimelineTx(tx, clientId, cascadeResult);
      });
    } catch (err) {
      console.error('[Sheets Sync] Hotel cascade sync failed:', err);
    }
    await recalcClientStats(db, clientId);
  }

  const transportStats = await importTransportFromSheet(sheetsClient, spreadsheetId, clientId);
  totalImported += transportStats.imported;
  byModule.transport = transportStats.imported;
  allErrors.push(...transportStats.errors);
  if (transportStats.conflicts) allConflicts.push(...transportStats.conflicts);

  if (transportStats.imported > 0) {
    try {
      const cascadeResult: SyncResult = { success: true, synced: 0, created: { hotels: 0, transport: 0, timeline: 0, budget: 0 }, errors: [] };
      // S7-M09: use transaction client instead of bare db
      await db.transaction(async (tx) => {
        await syncTransportToTimelineTx(tx, clientId, cascadeResult);
      });
    } catch (err) {
      console.error('[Sheets Sync] Transport cascade sync failed:', err);
    }
    await recalcClientStats(db, clientId);
  }

  // Import events BEFORE timeline so the timeline import (which skips
  // sourceModule='events' rows) leaves the freshly synced event items alone.
  const eventStats = await importEventsFromSheet(sheetsClient, spreadsheetId, clientId, companyId);
  totalImported += eventStats.imported;
  byModule.events = eventStats.imported;
  allErrors.push(...eventStats.errors);
  if (eventStats.conflicts) allConflicts.push(...eventStats.conflicts);

  if (eventStats.imported > 0) {
    try {
      // Regenerate event-linked timeline items for newly imported events.
      await db.transaction(async (tx) => {
        await syncEventsToTimelineTx(tx, clientId);
      });
    } catch (err) {
      console.error('[Sheets Sync] Event timeline sync failed:', err);
    }
  }

  const timelineStats = await importTimelineFromSheet(sheetsClient, spreadsheetId, clientId);
  totalImported += timelineStats.imported;
  byModule.timeline = timelineStats.imported;
  allErrors.push(...timelineStats.errors);

  const giftStats = await importGiftsFromSheet(sheetsClient, spreadsheetId, clientId);
  totalImported += giftStats.imported;
  byModule.gifts = giftStats.imported;
  allErrors.push(...giftStats.errors);

  console.log(`[Sheets Sync] Import complete: ${totalImported} records imported, ${allErrors.length} errors`);

  // Broadcast sync actions for each module that had imports (S7-M10: userId now required)
  if (totalImported > 0) {
    const modules = ['guests', 'budget', 'vendors', 'hotels', 'transport', 'timeline', 'gifts', 'events'] as const;
    for (const mod of modules) {
      if (byModule[mod] && byModule[mod] > 0) {
        await broadcastSheetSync({
          module: mod,
          companyId,
          clientId,
          userId,
          count: byModule[mod],
        });
      }
    }
  }

  if (allConflicts.length > 0) {
    console.log(`[Sheets Sync] ${allConflicts.length} conflicts detected — these rows were skipped`);
  }

  return {
    success: allErrors.length === 0,
    totalImported,
    byModule,
    errors: allErrors,
    conflicts: allConflicts,
  };
}
