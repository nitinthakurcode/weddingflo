/**
 * Per-module spreadsheet column SHAPE — single source of truth (Cluster E).
 *
 * The combined client export (`export-utils.ts`) and the import service
 * (`import-cascade.ts`) previously authored each module's column shape INDEPENDENTLY, so the
 * round-trip contract drifted: Events were missing from the combined export (E1), transport
 * names blanked (E2), the gift sheet used a `Serial #` view shape with no ID/round-trip (E3),
 * and inline import validation hard-coded sheet/required headers that could diverge from what
 * the exporter actually wrote (C3).
 *
 * This module owns, per export module, the ORDERED column spec: header label, exceljs key,
 * width, required flag, and the export formatter (row → cell). Both sides consume it:
 *   • `export-utils.ts` builds each worksheet from `MODULE_SHAPES[module]` (via `buildExportSheet`).
 *   • `import-cascade.ts` derives `MODULE_SHEET_NAME` + the inline validation specs from it
 *     (`sheetNameOf`, `inlineValidationSpec`), so the headers/required/sheet it validates are
 *     provably the same labels the exporter emits.
 *
 * The IMPORT-side parsing (header → DB column) still lives in the canonical parsers
 * (`excel-parser-server.ts`) + inline importers; this SSOT pins the shared CONTRACT (which
 * headers, in what order, which are required, under which sheet) that both must agree on.
 *
 * Pure module: no DB / server imports, so it is safe to import from both the export layer and
 * the (server-only) import service.
 */
import type ExcelJS from 'exceljs'

/** Modules that appear as editable/view sheets in the combined client export. */
export type ExportModule =
  | 'guests' | 'hotels' | 'guestGifts' | 'transport' | 'vendors' | 'budget' | 'events' | 'timeline'

type Row = Record<string, unknown>

export interface ExportColumnSpec {
  /** Display header label as written to row 1 (may carry ' *' / ' (hint)' annotations). */
  header: string
  /** ExcelJS column key used when adding rows. */
  key: string
  width?: number
  /** Required field → header carries '*' AND it is enforced on import (REQUIRED_* / validation). */
  required?: boolean
  /** Export formatter: source row → cell value. */
  toCell: (row: Row) => ExcelJS.CellValue
}

export interface ModuleShape {
  /** Canonical worksheet name (what the exporter writes and the importer looks up). */
  sheet: string
  columns: ExportColumnSpec[]
}

// ── small shared formatting helpers (export side) ─────────────────────────────
const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v))
const yesNo = (v: unknown): 'Yes' | 'No' => (v ? 'Yes' : 'No')
const trueFalse = (v: unknown): 'TRUE' | 'FALSE' => (v ? 'TRUE' : 'FALSE')
const joinList = (v: unknown): string => (Array.isArray(v) ? v.join(', ') : s(v))
/** First non-empty of the provided row keys. */
const pick = (row: Row, ...keys: string[]): unknown => {
  for (const k of keys) {
    const val = row[k]
    if (val !== undefined && val !== null && val !== '') return val
  }
  return undefined
}
/**
 * Pass the picked value through UNCHANGED (Date / number / string), defaulting to ''. Used for
 * columns the legacy export wrote raw — notably timestamp columns, where ExcelJS must receive a
 * Date object (not a stringified locale form) to emit a proper date cell that re-imports cleanly.
 */
const raw = (row: Row, ...keys: string[]): ExcelJS.CellValue => (pick(row, ...keys) as ExcelJS.CellValue) ?? ''

/** Combine a guest-ish row's name fields the way the legacy export did. */
const guestFullName = (row: Row): string => {
  const direct = pick(row, 'name')
  if (direct) return s(direct)
  const first = s(pick(row, 'firstName', 'first_name'))
  const last = s(pick(row, 'lastName', 'last_name'))
  return `${first} ${last}`.trim()
}

// ── per-module column shapes ──────────────────────────────────────────────────
export const MODULE_SHAPES: Record<ExportModule, ModuleShape> = {
  guests: {
    sheet: 'Guests',
    columns: [
      { header: 'ID (Do not modify)', key: 'id', width: 40, toCell: (g) => s(g.id) },
      { header: 'Name *', key: 'name', width: 25, required: true, toCell: guestFullName },
      { header: 'Email', key: 'email', width: 28, toCell: (g) => s(g.email) },
      { header: 'Phone', key: 'phone', width: 18, toCell: (g) => s(g.phone) },
      { header: 'Group', key: 'group', width: 18, toCell: (g) => s(pick(g, 'groupName', 'group_name', 'group')) },
      { header: 'Side', key: 'side', width: 15, toCell: (g) => s(pick(g, 'guestSide', 'guest_side')) },
      { header: 'RSVP Status', key: 'rsvp', width: 15, toCell: (g) => s(pick(g, 'rsvpStatus', 'rsvp_status') ?? 'pending') },
      { header: 'Party Size', key: 'partySize', width: 12, toCell: (g) => (pick(g, 'partySize', 'party_size') as number) || 1 },
      { header: 'Additional Guest Names', key: 'additionalGuests', width: 35, toCell: (g) => joinList(pick(g, 'additionalGuestNames', 'additional_guest_names') ?? []) },
      { header: 'Relationship to Family', key: 'relationship', width: 20, toCell: (g) => s(pick(g, 'relationshipToFamily', 'relationship_to_family')) },
      { header: 'Attending Events', key: 'eventsAttending', width: 30, toCell: (g) => joinList(pick(g, 'attendingEvents', 'attending_events') ?? []) },
      { header: 'Arrival Date/Time', key: 'arrivalDatetime', width: 20, toCell: (g) => raw(g, 'arrivalDatetime', 'arrival_datetime') },
      { header: 'Arrival Mode', key: 'arrivalMode', width: 18, toCell: (g) => s(pick(g, 'arrivalMode', 'arrival_mode')) },
      { header: 'Departure Date/Time', key: 'departureDatetime', width: 20, toCell: (g) => raw(g, 'departureDatetime', 'departure_datetime') },
      { header: 'Departure Mode', key: 'departureMode', width: 18, toCell: (g) => s(pick(g, 'departureMode', 'departure_mode')) },
      { header: 'Meal Preference', key: 'mealPreference', width: 15, toCell: (g) => s(pick(g, 'mealPreference', 'meal_preference')) },
      { header: 'Dietary Restrictions', key: 'dietary', width: 25, toCell: (g) => s(pick(g, 'dietaryRestrictions', 'dietary_restrictions')) },
      { header: 'Hotel Required (TRUE/FALSE)', key: 'hotelRequired', width: 15, toCell: (g) => trueFalse(pick(g, 'hotelRequired', 'hotel_required')) },
      { header: 'Transport Required (TRUE/FALSE)', key: 'transportRequired', width: 18, toCell: (g) => trueFalse(pick(g, 'transportRequired', 'transport_required')) },
      { header: 'Gift Required (TRUE/FALSE)', key: 'giftRequired', width: 15, toCell: (g) => trueFalse(pick(g, 'giftRequired', 'gift_required')) },
      { header: 'Gift to Give', key: 'giftToGive', width: 25, toCell: (g) => s(pick(g, 'giftToGive', 'gift_to_give')) },
      { header: 'Notes', key: 'notes', width: 40, toCell: (g) => s(g.notes) },
      { header: 'Checked In', key: 'checkedIn', width: 12, toCell: (g) => yesNo(pick(g, 'checkedIn', 'checked_in')) },
    ],
  },

  hotels: {
    sheet: 'Hotels',
    columns: [
      { header: 'ID (Do not modify)', key: 'id', width: 40, toCell: (h) => s(h.id) },
      { header: 'Guest ID (Do not modify)', key: 'guestId', width: 40, toCell: (h) => s(pick(h, 'guestId', 'guest_id')) },
      {
        header: 'Guest Name * (Required)', key: 'guestName', width: 25, required: true,
        toCell: (h) => {
          const direct = pick(h, 'guestName', 'guest_name')
          if (direct) return s(direct)
          const guest = h.__guest as Row | undefined
          return guest ? guestFullName(guest) : ''
        },
      },
      {
        header: 'Relationship (from guest list)', key: 'guestRelationship', width: 28,
        toCell: (h) => {
          const guest = h.__guest as Row | undefined
          return s(pick(h, 'guestRelationship') ?? (guest ? pick(guest, 'relationshipToFamily', 'relationship_to_family') : ''))
        },
      },
      {
        header: 'Additional Guest Names (from guest list)', key: 'additionalGuestNames', width: 35,
        toCell: (h) => {
          const guest = h.__guest as Row | undefined
          return joinList(guest ? (pick(guest, 'additionalGuestNames', 'additional_guest_names') ?? []) : [])
        },
      },
      { header: 'Guest Names in Room (e.g., john and mary, sue)', key: 'guestNamesInRoom', width: 40, toCell: () => '' },
      { header: '# in Room (auto or manual)', key: 'partySize', width: 22, toCell: (h) => (pick(h, 'partySize', 'party_size') as number) || 1 },
      {
        header: 'Email Address', key: 'guestEmail', width: 28,
        toCell: (h) => { const guest = h.__guest as Row | undefined; return s(pick(h, 'guestEmail') ?? (guest ? guest.email : '')) },
      },
      {
        header: 'Phone Number', key: 'guestPhone', width: 18,
        toCell: (h) => { const guest = h.__guest as Row | undefined; return s(pick(h, 'guestPhone') ?? (guest ? guest.phone : '')) },
      },
      { header: 'Need Hotel? (Yes/No)', key: 'accommodationNeeded', width: 18, toCell: (h) => yesNo(pick(h, 'accommodationNeeded', 'accommodation_needed')) },
      { header: 'Hotel Name', key: 'hotelName', width: 25, toCell: (h) => s(pick(h, 'hotelName', 'hotel_name')) },
      { header: 'Room Number', key: 'roomNumber', width: 15, toCell: (h) => s(pick(h, 'roomNumber', 'room_number')) },
      { header: 'Room Type (Suite/Deluxe...)', key: 'roomType', width: 23, toCell: (h) => s(pick(h, 'roomType', 'room_type')) },
      { header: 'Check-In (YYYY-MM-DD)', key: 'checkInDate', width: 20, toCell: (h) => s(pick(h, 'checkInDate', 'check_in_date')) },
      { header: 'Check-Out (YYYY-MM-DD)', key: 'checkOutDate', width: 20, toCell: (h) => s(pick(h, 'checkOutDate', 'check_out_date')) },
      { header: 'Booking Confirmed (Yes/No)', key: 'bookingConfirmed', width: 23, toCell: (h) => yesNo(pick(h, 'bookingConfirmed', 'booking_confirmed')) },
      { header: 'Checked In (Yes/No)', key: 'checkedIn', width: 18, toCell: (h) => yesNo(pick(h, 'checkedIn', 'checked_in')) },
      { header: 'Room Cost (numbers only)', key: 'cost', width: 22, toCell: (h) => s(h.cost) },
      { header: 'Payment (pending/paid/overdue)', key: 'paymentStatus', width: 28, toCell: (h) => s(pick(h, 'paymentStatus', 'payment_status') ?? 'pending') },
      { header: 'Special Notes', key: 'notes', width: 40, toCell: (h) => s(h.notes) },
    ],
  },

  // [E3 / gifts] Excel gift export targets the gift-DELIVERY model (`guest_gifts`) per handbook
  // §G.7 — NOT the `gifts` registry (that is the Google-Sheets target). The combined export now
  // emits this round-trippable shape (leading ID + module sheet 'GiftsGiven' + required Gift
  // Name) consumed by importData('guestGifts') → importGuestGift, instead of the old view-only
  // 'Serial #' sheet that could not round-trip.
  guestGifts: {
    sheet: 'GiftsGiven',
    columns: [
      { header: 'ID (Do not modify)', key: 'id', width: 40, toCell: (g) => s(g.id) },
      { header: 'Guest ID (Do not modify)', key: 'guestId', width: 40, toCell: (g) => s(pick(g, 'guestId', 'guest_id')) },
      { header: 'Guest Name *', key: 'guestName', width: 25, required: true, toCell: (g) => s(pick(g, 'guestName', 'guest_name')) },
      { header: 'Guest Email', key: 'guestEmail', width: 25, toCell: (g) => s(pick(g, 'guestEmail', 'guest_email')) },
      { header: 'Guest Phone', key: 'guestPhone', width: 15, toCell: (g) => s(pick(g, 'guestPhone', 'guest_phone')) },
      { header: 'Guest Group', key: 'guestGroup', width: 15, toCell: (g) => s(pick(g, 'guestGroup', 'guest_group')) },
      { header: 'Gift Name *', key: 'giftName', width: 25, required: true, toCell: (g) => s(pick(g, 'giftName', 'gift_item', 'giftItem', 'name')) },
      { header: 'Gift Type', key: 'giftType', width: 20, toCell: (g) => s(pick(g, 'giftType', 'gift_type', 'type')) },
      { header: 'Gift Category', key: 'giftCategory', width: 15, toCell: (g) => s(pick(g, 'giftCategory', 'gift_category')) },
      { header: 'Quantity', key: 'quantity', width: 10, toCell: (g) => (pick(g, 'quantity') as number) || 1 },
      { header: 'Delivery Date', key: 'deliveryDate', width: 15, toCell: (g) => s(pick(g, 'deliveryDate', 'delivery_date')) },
      { header: 'Delivery Time', key: 'deliveryTime', width: 12, toCell: (g) => s(pick(g, 'deliveryTime', 'delivery_time')) },
      { header: 'Delivery Status', key: 'deliveryStatus', width: 15, toCell: (g) => s(pick(g, 'deliveryStatus', 'delivery_status') ?? 'pending') },
      { header: 'Delivered By', key: 'deliveredBy', width: 20, toCell: (g) => s(pick(g, 'deliveredBy', 'delivered_by')) },
      { header: 'Notes', key: 'notes', width: 30, toCell: (g) => s(g.notes) },
    ],
  },

  transport: {
    sheet: 'Transport',
    columns: [
      { header: 'ID (Do not modify)', key: 'id', width: 40, toCell: (t) => s(t.id) },
      { header: 'Guest ID (Do not modify)', key: 'guestId', width: 40, toCell: (t) => s(pick(t, 'guestId', 'guest_id')) },
      { header: 'Guest Name *', key: 'guestName', width: 25, required: true, toCell: (t) => s(pick(t, 'guestName', 'guest_name')) },
      {
        header: 'Guest Email', key: 'guestEmail', width: 25,
        toCell: (t) => { const guest = t.guest as Row | undefined; return s(pick(t, 'guestEmail', 'guest_email') ?? (guest ? guest.email : '')) },
      },
      {
        header: 'Guest Phone', key: 'guestPhone', width: 15,
        toCell: (t) => { const guest = t.guest as Row | undefined; return s(pick(t, 'guestPhone', 'guest_phone') ?? (guest ? guest.phone : '')) },
      },
      {
        header: 'Guest Group', key: 'guestGroup', width: 15,
        toCell: (t) => { const guest = t.guest as Row | undefined; return s(pick(t, 'guestGroup', 'guest_group') ?? (guest ? pick(guest, 'groupName', 'group_name') : '')) },
      },
      { header: 'Pickup Date', key: 'pickupDate', width: 15, toCell: (t) => s(pick(t, 'pickupDate', 'pickup_date')) },
      { header: 'Pickup Time', key: 'pickupTime', width: 12, toCell: (t) => s(pick(t, 'pickupTime', 'pickup_time')) },
      { header: 'Pickup From', key: 'pickupFrom', width: 28, toCell: (t) => s(pick(t, 'pickupFrom', 'pickup_from')) },
      { header: 'Drop To', key: 'dropTo', width: 28, toCell: (t) => s(pick(t, 'dropTo', 'drop_to')) },
      { header: 'Vehicle Info', key: 'vehicleInfo', width: 25, toCell: (t) => s(pick(t, 'vehicleInfo', 'vehicle_info')) },
      { header: 'Transport Status', key: 'transportStatus', width: 15, toCell: (t) => s(pick(t, 'transportStatus', 'transport_status') ?? 'scheduled') },
      { header: 'Notes', key: 'notes', width: 40, toCell: (t) => s(t.notes) },
    ],
  },

  // [6A.1] Vendors export shape reconciled to the handbook §G.6 rich set (was a 10-col summary).
  // toCell uses pick() aliases so the SAME shape renders BOTH the global `vendors` keys AND the
  // per-client `clientVendors`-enriched keys (event / contract / approval).
  // [6A.2] BOTH the combined export AND downloadTemplate('vendors') now feed per-client
  // `clientVendors`-enriched rows (via the shared `fetchClientVendorExportRows` helper), so the
  // per-link columns (Event, Contract Amount, Service Date, Approval…) populate and round-trip
  // from the combined export too — the data-source drift in KNOWN_GAPS §5 is fixed.
  vendors: {
    sheet: 'Vendors',
    columns: [
      { header: 'ID (Do not modify)', key: 'id', width: 40, toCell: (v) => s(v.id) },
      { header: 'Vendor Name *', key: 'vendorName', width: 30, required: true, toCell: (v) => s(pick(v, 'name', 'vendor_name')) },
      { header: 'Category *', key: 'category', width: 20, required: true, toCell: (v) => s(v.category) },
      { header: 'Contact Name', key: 'contactName', width: 25, toCell: (v) => s(pick(v, 'contactName', 'contact_name')) },
      { header: 'Phone', key: 'phone', width: 18, toCell: (v) => s(v.phone) },
      { header: 'Email', key: 'email', width: 28, toCell: (v) => s(v.email) },
      { header: 'Event', key: 'event', width: 20, toCell: (v) => s(pick(v, 'eventName', 'event_name', 'event')) },
      { header: 'Contract Amount', key: 'contractAmount', width: 18, toCell: (v) => s(pick(v, 'contractAmount', 'contract_amount', 'cost')) },
      { header: 'Total Paid', key: 'totalPaid', width: 15, toCell: (v) => s(pick(v, 'totalPaid', 'total_paid')) },
      { header: 'Balance Remaining', key: 'balanceRemaining', width: 18, toCell: (v) => s(pick(v, 'balanceRemaining', 'balance_remaining')) },
      { header: 'Deposit Amount', key: 'depositAmount', width: 15, toCell: (v) => s(pick(v, 'depositAmount', 'deposit_amount')) },
      { header: 'Deposit Paid (Yes/No)', key: 'depositPaid', width: 18, toCell: (v) => yesNo(pick(v, 'depositPaid', 'deposit_paid')) },
      { header: 'Payment Status', key: 'paymentStatus', width: 18, toCell: (v) => s(pick(v, 'paymentStatus', 'payment_status') ?? 'pending') },
      { header: 'Service Date', key: 'serviceDate', width: 15, toCell: (v) => s(pick(v, 'serviceDate', 'service_date')) },
      { header: 'Service Location', key: 'serviceLocation', width: 25, toCell: (v) => s(pick(v, 'serviceLocation', 'service_location', 'venueAddress')) },
      { header: 'On-Site Contact', key: 'onSiteContact', width: 20, toCell: (v) => s(pick(v, 'onSiteContact', 'onsite_contact', 'onsitePocName')) },
      { header: 'On-Site Phone', key: 'onSitePhone', width: 15, toCell: (v) => s(pick(v, 'onSitePhone', 'onsite_phone', 'onsitePocPhone')) },
      { header: 'Services Provided', key: 'servicesProvided', width: 30, toCell: (v) => s(pick(v, 'servicesProvided', 'services_provided', 'deliverables')) },
      { header: 'Approval Status', key: 'approvalStatus', width: 15, toCell: (v) => s(pick(v, 'approvalStatus', 'approval_status') ?? 'pending') },
      { header: 'Approval Notes', key: 'approvalNotes', width: 25, toCell: (v) => s(pick(v, 'approvalNotes', 'approval_notes', 'approvalComments')) },
      { header: 'Rating', key: 'rating', width: 10, toCell: (v) => s(v.rating) },
      { header: 'Notes', key: 'notes', width: 30, toCell: (v) => s(v.notes) },
    ],
  },

  budget: {
    sheet: 'Budget',
    columns: [
      { header: 'ID (Do not modify)', key: 'id', width: 40, toCell: (b) => s(b.id) },
      { header: 'Item *', key: 'item', width: 25, required: true, toCell: (b) => s(b.item) },
      { header: 'Category *', key: 'category', width: 20, required: true, toCell: (b) => s(b.category) },
      { header: 'Segment', key: 'segment', width: 15, toCell: (b) => s(b.segment ?? 'other') },
      // Cost columns are TEXT in the schema — write the stored value RAW (matches the legacy
      // export); coercing to Number flipped the cell type and produced NaN for non-numeric text.
      { header: 'Estimated Cost *', key: 'estimatedCost', width: 18, required: true, toCell: (b) => (pick(b, 'estimatedCost', 'estimated_cost') as ExcelJS.CellValue) || 0 },
      { header: 'Paid Amount', key: 'paidAmount', width: 18, toCell: (b) => (pick(b, 'paidAmount', 'paid_amount') as ExcelJS.CellValue) || 0 },
      { header: 'Actual Cost', key: 'actualCost', width: 18, toCell: (b) => s(pick(b, 'actualCost', 'actual_cost')) },
      { header: 'Payment Status', key: 'paymentStatus', width: 18, toCell: (b) => s(pick(b, 'paymentStatus', 'payment_status') ?? 'pending') },
      { header: 'Notes', key: 'notes', width: 30, toCell: (b) => s(b.notes) },
    ],
  },

  // [E1] Events were absent from the combined export. Shape mirrors handbook §G.8b /
  // downloadTemplate('events') so importData('events') (importEventsExcel, reads 'Events')
  // round-trips from the combined file.
  events: {
    sheet: 'Events',
    columns: [
      { header: 'ID (Do not modify)', key: 'id', width: 40, toCell: (e) => s(e.id) },
      { header: 'Title *', key: 'title', width: 28, required: true, toCell: (e) => s(e.title) },
      { header: 'Event Type', key: 'eventType', width: 18, toCell: (e) => s(pick(e, 'eventType', 'event_type')) },
      { header: 'Event Date (YYYY-MM-DD)', key: 'eventDate', width: 22, toCell: (e) => s(pick(e, 'eventDate', 'event_date')) },
      { header: 'Start Time (HH:MM)', key: 'startTime', width: 18, toCell: (e) => s(pick(e, 'startTime', 'start_time')) },
      { header: 'End Time (HH:MM)', key: 'endTime', width: 18, toCell: (e) => s(pick(e, 'endTime', 'end_time')) },
      { header: 'Location', key: 'location', width: 25, toCell: (e) => s(e.location) },
      { header: 'Venue Name', key: 'venueName', width: 25, toCell: (e) => s(pick(e, 'venueName', 'venue_name')) },
      { header: 'Address', key: 'address', width: 30, toCell: (e) => s(e.address) },
      { header: 'Guest Count (numbers only)', key: 'guestCount', width: 22, toCell: (e) => s(pick(e, 'guestCount', 'guest_count')) },
      // Handbook §G.8b: verbose Status header (enumerates the allowed values) + trailing Action
      // delete marker. Both the combined export AND downloadTemplate('events') emit these.
      { header: 'Status (draft/planned/confirmed/completed/cancelled)', key: 'status', width: 30, toCell: (e) => s(e.status ?? 'planned') },
      { header: 'Description', key: 'description', width: 30, toCell: (e) => s(e.description) },
      { header: 'Notes', key: 'notes', width: 30, toCell: (e) => s(e.notes) },
      { header: 'Action (DELETE to remove)', key: 'action', width: 24, toCell: () => '' },
    ],
  },

  // Timeline is intentionally VIEW-ONLY in the combined/master export (handbook §G.8): the
  // round-trip path is the dedicated `exportTimelineExcel` → `timeline.bulkImport`. Kept here so
  // the combined export still single-sources its (read-only) column shape.
  timeline: {
    sheet: 'Timeline',
    columns: [
      { header: 'Activity', key: 'event', width: 35, toCell: (t) => s(t.title) },
      { header: 'Start Time', key: 'startTime', width: 15, toCell: (t) => (t.start_time as ExcelJS.CellValue) ?? '' },
      { header: 'Duration', key: 'duration', width: 15, toCell: (t) => `${s(t.duration_minutes)} min` },
      { header: 'Location', key: 'location', width: 30, toCell: (t) => s(t.location) },
      { header: 'Special Notes', key: 'notes', width: 40, toCell: (t) => s(t.notes) },
    ],
  },
}

/** Strip export-only annotations (' *', ' (hint)') to the display name the importer validates. */
export function cleanHeader(header: string): string {
  return header
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*\*/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Build a worksheet for `module` from its SSOT shape: styled header row + one row per source
 * record (values via each column's `toCell`). The single place the combined export materializes
 * a module sheet.
 */
export function buildExportSheet(
  workbook: ExcelJS.Workbook,
  module: ExportModule,
  rows: Row[],
): ExcelJS.Worksheet {
  const shape = MODULE_SHAPES[module]
  const ws = workbook.addWorksheet(shape.sheet)
  ws.columns = shape.columns.map((c) => ({ header: c.header, key: c.key, width: c.width }))

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

  for (const row of rows) {
    const out: Record<string, ExcelJS.CellValue> = {}
    for (const c of shape.columns) out[c.key] = c.toCell(row)
    ws.addRow(out)
  }
  return ws
}

/** Inline-import validation spec derived from the SSOT (sheet + display headers + required). */
export interface InlineValidationSpec {
  sheet: string
  expected: string[]
  required: string[]
}

export function inlineValidationSpec(module: ExportModule): InlineValidationSpec {
  const shape = MODULE_SHAPES[module]
  return {
    sheet: shape.sheet,
    expected: shape.columns.map((c) => cleanHeader(c.header)),
    required: shape.columns.filter((c) => c.required).map((c) => cleanHeader(c.header)),
  }
}
