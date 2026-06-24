/**
 * Round-trip contract tests for Excel export ↔ import.
 *
 * These guard the exact bug class this work fixed: a per-module Excel export
 * that drops the `ID` column (so re-import creates duplicates instead of
 * updating) or emits a header that no longer resolves to the importer's
 * canonical field key (so the value is silently lost on re-import).
 *
 * Strategy (pure, no DB / no browser): simulate a header row built from the
 * exact headers each exporter emits, run the real `resolveHeaderAliases`, then
 * assert every canonical key the importer reads is resolvable — and that the
 * `ID`/`Action` columns required for upsert + delete are present.
 */

import {
  resolveHeaderAliases,
  buildPresentUpdate,
} from '../excel-parser'

/** Build a headerMap exactly like validateExcelFile does for a row of headers. */
function headerMapFor(exportHeaders: string[]): Map<string, number> {
  const map = new Map<string, number>()
  exportHeaders.forEach((h, i) => {
    const name = String(h || '').toLowerCase().trim()
    if (name) map.set(name, i + 1)
  })
  resolveHeaderAliases(map)
  return map
}

// The headers each exporter actually emits (must mirror excel-exporter.ts).
const BUDGET_EXPORT_HEADERS = [
  'ID', 'Expense Name', 'Expense Details', 'Category', 'Segment', 'Event',
  'Budgeted Amount', 'Transaction Date', 'Total Paid', 'Balance Due',
  'Payment History', 'Payment Status', 'Special Notes', 'Action',
]
const TRANSPORT_EXPORT_HEADERS = [
  'ID', 'Guest Name', 'Guest Group', 'Email Address', 'Phone Number',
  'Journey Type', 'Trip #', 'Pickup Date', 'Pickup Time', 'Pickup Location',
  'Drop-off Location', 'Status', 'Vehicle/Shuttle', 'Vehicle Type',
  'Driver Phone', 'Completed On', 'Special Notes', 'Action',
]
const VENDOR_EXPORT_HEADERS = [
  'ID', 'Vendor Name', 'Service Category', 'Contact Person', 'Phone Number',
  'Email Address', 'Website', 'Address', 'Contract Signed', 'Contract Date',
  'Rating', 'Preferred', 'Event', 'Service Location', 'On-Site Contact',
  'Contact Phone', 'Contact Notes', 'Services Provided', 'Contract Amount',
  'Deposit Paid', 'Service Date', 'Payment Status', 'Approval Status',
  'Approval Notes', 'Notes', 'Action',
]

// Canonical keys each importer reads (must mirror excel-parser-server.ts).
const BUDGET_IMPORT_KEYS = [
  'id', 'item', 'category', 'segment', 'description', 'estimated cost',
  'paid amount', 'payment status', 'transaction date', 'notes', 'action',
]
const TRANSPORT_IMPORT_KEYS = [
  'id', 'guest name', 'pickup date', 'pickup time', 'pickup from', 'drop to',
  'transport status', 'vehicle info', 'vehicle type', 'driver phone',
  'leg type', 'leg sequence', 'notes', 'action',
]
const VENDOR_IMPORT_KEYS = [
  'id', 'name', 'category', 'contact name', 'phone', 'email', 'website',
  'address', 'contract signed', 'contract date', 'rating', 'is preferred',
  'notes', 'action',
  // per-client (client_vendors) fields — full fidelity round-trip
  'venue address', 'onsite poc name', 'onsite poc phone', 'onsite poc notes',
  'deliverables', 'contract amount', 'deposit amount', 'service date',
  'payment status', 'approval status', 'approval comments',
]

// Hotels go through the alias-based server importer (excel-parser-server.ts
// importHotelsExcel → validateExcelFile → resolveHeaderAliases).
const HOTEL_EXPORT_HEADERS = [
  'ID (Do not modify)', 'Guest ID (Do not modify)', 'Guest Name * (Required)',
  'Relationship (from guest list)', 'Additional Guest Names (from guest list)',
  'Guests in Room (Single: john, mary | Multi: 143: john, mary | 144: sue)',
  '# Total Party Size', 'Email Address', 'Phone Number', 'Need Hotel? (Yes/No)',
  'Hotel Name', 'Room Number (Single: 143 | Multi: 143, 144)',
  'Room Type (Suite/Deluxe...)', 'Check-In (YYYY-MM-DD)', 'Check-Out (YYYY-MM-DD)',
  'Booking Confirmed (Yes/No)', 'Checked In (Yes/No)', 'Room Cost (numbers only)',
  'Payment (pending/paid/overdue)', 'Special Notes', 'Action',
]
const HOTEL_IMPORT_KEYS = [
  'id', 'guest name', 'hotel name', 'room number', 'room type', 'notes',
  'payment status', 'action', 'accommodation needed', 'booking confirmed',
  'check in date', 'check out date', 'checked in', 'cost', 'party size',
]

// Timeline goes through the client parser importTimelineExcel (excel-parser.ts)
// → validateExcelFile → resolveHeaderAliases, then trpc.timeline.bulkImport.
// Delete is driven by the 'Action' column (Notes='DELETE' kept as legacy fallback).
const TIMELINE_EXPORT_HEADERS = [
  'ID', 'Event Name', 'Event ID', 'Title', 'Description', 'Phase', 'Date',
  'Start Time', 'End Time', 'Duration (min)', 'Location', 'Participants',
  'Responsible Person', 'Completed', 'Sort Order', 'Notes', 'Source', 'Action',
]
const TIMELINE_IMPORT_KEYS = [
  'id', 'title', 'event id', 'description', 'phase', 'date', 'start time',
  'end time', 'duration (min)', 'location', 'participants', 'responsible person',
  'completed', 'sort order', 'notes', 'action',
]

// Events go through the dedicated server importer (excel-parser-server.ts
// importEventsExcel → validateExcelFile → resolveHeaderAliases). The export
// headers are the annotated ones import.router.ts downloadTemplate emits.
const EVENT_EXPORT_HEADERS = [
  'ID (Do not modify)', 'Title *', 'Event Type', 'Event Date (YYYY-MM-DD)',
  'Start Time (HH:MM)', 'End Time (HH:MM)', 'Location', 'Venue Name', 'Address',
  'Guest Count (numbers only)', 'Status (draft/planned/confirmed/completed/cancelled)',
  'Description', 'Notes', 'Action (DELETE to remove)',
]
const EVENT_IMPORT_KEYS = [
  'id', 'title', 'event type', 'event date', 'start time', 'end time',
  'location', 'venue name', 'address', 'guest count', 'status',
  'description', 'notes', 'action',
]

describe('Excel round-trip header contract', () => {
  const cases: Array<[string, string[], string[]]> = [
    ['budget', BUDGET_EXPORT_HEADERS, BUDGET_IMPORT_KEYS],
    ['transport', TRANSPORT_EXPORT_HEADERS, TRANSPORT_IMPORT_KEYS],
    ['vendors', VENDOR_EXPORT_HEADERS, VENDOR_IMPORT_KEYS],
    ['hotels', HOTEL_EXPORT_HEADERS, HOTEL_IMPORT_KEYS],
    ['timeline', TIMELINE_EXPORT_HEADERS, TIMELINE_IMPORT_KEYS],
    ['events', EVENT_EXPORT_HEADERS, EVENT_IMPORT_KEYS],
  ]

  for (const [mod, exportHeaders, importKeys] of cases) {
    describe(mod, () => {
      const map = headerMapFor(exportHeaders)

      it('every importer field resolves from the export headers', () => {
        const unresolved = importKeys.filter((k) => !map.has(k))
        expect(unresolved).toEqual([])
      })

      it('carries an ID column so re-import updates instead of duplicating', () => {
        expect(map.has('id')).toBe(true)
      })

      it('carries an Action column so DELETE-on-re-import works', () => {
        expect(map.has('action')).toBe(true)
      })
    })
  }
})

/**
 * Guests and guestGifts are imported inline by import.router.ts using
 * `getRowValue(row, ...aliases)` (lowercase + strip `*`/spaces) rather than the
 * alias map. The round-trip contract there is: the export must emit an `ID`
 * column (so importGuest/importGuestGift match by id and update, not duplicate),
 * an `Action` column (so the inline DELETE path fires), and a header that the
 * importer's alias list resolves for each required field.
 */
describe('Inline-import modules (getRowValue path)', () => {
  // Mirror getRowValue's normalization in import.router.ts.
  const norm = (s: string) => s.toLowerCase().replace(/[*\s]/g, '')
  const resolvesAny = (headers: string[], aliases: string[]) => {
    const present = new Set(headers.map(norm))
    return aliases.some((a) => present.has(norm(a)))
  }

  const GUEST_EXPORT_HEADERS = [
    'ID', 'Guest Name', 'Email', 'Phone', 'Group', 'Side', 'RSVP', 'Party Size',
    'Additional Guests', 'Relationship', 'Events', 'Arrival Date', 'Arrival Time',
    'Arrival Mode', 'Departure Date', 'Departure Time', 'Departure Mode', 'Meal',
    'Dietary', 'Hotel (Primary)', 'Transport (Primary)', 'Per-Member Hotel',
    'Per-Member Transport', 'Gift Received', 'Notes', 'Checked In', 'Action',
  ]
  const GUEST_GIFT_EXPORT_HEADERS = [
    'ID', 'Guest Name', 'Guest Group', 'Email Address', 'Phone Number',
    'Gift Item', 'Gift Category', 'Quantity', 'Delivery Date', 'Delivery Time',
    'Delivery Location', 'Delivery Status', 'Delivered By', 'Special Notes', 'Action',
  ]

  it('guests export carries ID + Action and resolves required fields', () => {
    expect(resolvesAny(GUEST_EXPORT_HEADERS, ['ID (Do not modify)', 'ID', 'id'])).toBe(true)
    expect(GUEST_EXPORT_HEADERS.map(norm)).toContain(norm('Action'))
    // importGuest requires a name column
    expect(resolvesAny(GUEST_EXPORT_HEADERS, ['Name', 'Guest Name'])).toBe(true)
  })

  it('guestGifts export carries ID + Action and resolves Guest Name + Gift Item', () => {
    expect(resolvesAny(GUEST_GIFT_EXPORT_HEADERS, ['ID (Do not modify)', 'ID', 'id'])).toBe(true)
    expect(GUEST_GIFT_EXPORT_HEADERS.map(norm)).toContain(norm('Action'))
    // importGuestGift requires both Guest Name and a gift-name column
    expect(resolvesAny(GUEST_GIFT_EXPORT_HEADERS, ['Guest Name *', 'Guest Name'])).toBe(true)
    expect(resolvesAny(GUEST_GIFT_EXPORT_HEADERS, ['Gift Name *', 'Gift Name', 'Gift Item', 'Item'])).toBe(true)
  })
})

describe('buildPresentUpdate (non-destructive imports)', () => {
  const full = { name: 'Acme', website: 'https://acme.test', notes: 'hi', updatedAt: new Date(0) }
  const fields = { name: 'name', website: 'website', notes: 'notes' } as const

  it('updates only columns present in the uploaded file', () => {
    // File missing the "website" column entirely.
    const map = new Map<string, number>([['name', 1], ['notes', 2]])
    const out = buildPresentUpdate(map, full, fields)
    expect(out).toHaveProperty('name', 'Acme')
    expect(out).toHaveProperty('notes', 'hi')
    expect(out).not.toHaveProperty('website') // preserved — not nulled
  })

  it('includes a present-but-empty column (intentional clear)', () => {
    const map = new Map<string, number>([['name', 1], ['website', 2]])
    const cleared = { ...full, website: null }
    const out = buildPresentUpdate(map, cleared, fields)
    expect(out).toHaveProperty('website', null)
  })

  it('always stamps updatedAt', () => {
    const out = buildPresentUpdate(new Map(), full, fields)
    expect(out.updatedAt).toBeInstanceOf(Date)
    expect(Object.keys(out)).toEqual(['updatedAt'])
  })
})
