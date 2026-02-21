/**
 * Google Sheets Sync
 *
 * Handles bi-directional sync between WeddingFlo database and Google Sheets.
 * Supports all modules: Guests, Budget, Timeline, Hotels, Transport, Vendors, Gifts
 *
 * February 2026 - Full implementation
 */

import { sheets_v4 } from 'googleapis';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
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
} from '@/lib/db/schema';
import { writeSheetData, readSheetData, formatSheetHeaders } from './sheets-client';

export interface SyncStats {
  exported: number;
  imported: number;
  errors: string[];
}

// Sheet column definitions for each module
const GUEST_HEADERS = [
  'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Group',
  'RSVP Status', 'Party Size', 'Relationship', 'Arrival Date',
  'Arrival Mode', 'Departure Date', 'Departure Mode',
  'Hotel Required', 'Transport Required', 'Meal Preference',
  'Dietary Restrictions', 'Notes', 'Last Updated'
];

const BUDGET_HEADERS = [
  'ID', 'Item', 'Category', 'Segment', 'Estimated Cost',
  'Actual Cost', 'Paid Amount', 'Payment Status', 'Vendor',
  'Notes', 'Last Updated'
];

const TIMELINE_HEADERS = [
  'ID', 'Title', 'Description', 'Start Time', 'End Time',
  'Location', 'Phase', 'Completed', 'Responsible Person',
  'Source Module', 'Notes', 'Last Updated'
];

const HOTEL_HEADERS = [
  'ID', 'Guest Name', 'Hotel Name', 'Room Type', 'Room Number',
  'Check-In Date', 'Check-Out Date', 'Party Size',
  'Accommodation Needed', 'Booking Confirmed', 'Checked In',
  'Cost', 'Payment Status', 'Notes', 'Last Updated'
];

const TRANSPORT_HEADERS = [
  'ID', 'Guest Name', 'Leg Type', 'Pickup Date', 'Pickup Time',
  'Pickup From', 'Drop To', 'Vehicle Info', 'Vehicle Number',
  'Driver Phone', 'Transport Status', 'Notes', 'Last Updated'
];

const VENDOR_HEADERS = [
  'ID', 'Vendor Name', 'Category', 'Contact Name', 'Phone',
  'Email', 'Contract Amount', 'Total Paid', 'Payment Status',
  'Service Date', 'Location', 'Rating', 'Notes', 'Last Updated'
];

const GIFT_HEADERS = [
  'ID', 'Gift Name', 'Guest ID', 'Value', 'Status',
  'Last Updated'
];

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
        g.notes || '',
        g.updatedAt ? new Date(g.updatedAt).toISOString() : '',
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
      .select()
      .from(budget)
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
        '', // Vendor - would need join
        b.notes || '',
        b.updatedAt ? new Date(b.updatedAt).toISOString() : '',
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

    const data = [
      VENDOR_HEADERS,
      ...filteredVendors.map(v => {
        const link = linkMap.get(v.id);
        return [
          v.id,
          v.name,
          v.category || '',
          v.contactName || '',
          v.phone || '',
          v.email || '',
          link?.contractAmount || '',
          '', // Total paid - would need calculation
          link?.paymentStatus || 'pending',
          link?.serviceDate || '',
          link?.venueAddress || '',
          v.rating || '',
          v.notes || '',
          v.updatedAt ? new Date(v.updatedAt).toISOString() : '',
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
      .select()
      .from(gifts)
      .where(eq(gifts.clientId, clientId));

    const data = [
      GIFT_HEADERS,
      ...giftList.map(g => [
        g.id,
        g.name || '',
        g.guestId || '',
        g.value?.toString() || '',
        g.status || 'received',
        g.updatedAt ? new Date(g.updatedAt).toISOString() : '',
      ])
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

  console.log(`[Sheets Sync] Complete: ${totalExported} records exported, ${allErrors.length} errors`);

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
export async function importGuestsFromSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  clientId: string
): Promise<SyncStats> {
  const stats: SyncStats = { exported: 0, imported: 0, errors: [] };

  try {
    const sheetData = await readSheetData(sheetsClient, spreadsheetId, 'Guests');

    if (sheetData.length <= 1) {
      // Only headers or empty
      return stats;
    }

    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const updatedAtIndex = headers.indexOf('Last Updated');

    if (idIndex === -1) {
      stats.errors.push('Missing ID column in Guests sheet');
      return stats;
    }

    // Get existing guests for timestamp comparison
    const existingGuests = await db
      .select({ id: guests.id, updatedAt: guests.updatedAt })
      .from(guests)
      .where(eq(guests.clientId, clientId));

    const existingMap = new Map(existingGuests.map(g => [g.id, g.updatedAt]));

    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      const id = row[idIndex];
      const sheetUpdatedAt = row[updatedAtIndex] ? new Date(row[updatedAtIndex]) : null;
      const dbUpdatedAt = existingMap.get(id);

      // Skip if DB record is newer or same
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
          rsvpStatus: getValue('RSVP Status') || 'pending',
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
          notes: getValue('Notes') || null,
          updatedAt: new Date(),
        };

        if (existingMap.has(id)) {
          // Update existing
          await db.update(guests).set(guestData).where(eq(guests.id, id));
        } else {
          // Insert new
          await db.insert(guests).values({
            id,
            clientId,
            ...guestData,
          });
        }

        stats.imported++;
      } catch (rowError: any) {
        stats.errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    console.log(`[Sheets Sync] Imported ${stats.imported} guests from sheet`);
  } catch (error: any) {
    stats.errors.push(`Import error: ${error.message}`);
    console.error('[Sheets Sync] Error importing guests:', error);
  }

  return stats;
}
