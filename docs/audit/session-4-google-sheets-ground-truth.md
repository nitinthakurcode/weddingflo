# Session 4 — Google Sheets Sync Ground Truth Reference

> **Generated**: 2026-02-23
> **Source**: Direct file reads from codebase — every value verified from actual source code
> **Purpose**: THE single source of truth for all Google Sheets sync AND Excel import/export behavior

---

## SECTION 1 — File Inventory

| # | File | Lines | Role |
|---|------|-------|------|
| 1 | `src/lib/google/sheets-sync.ts` | 1483 | All 7-module export/import logic, headers, broadcastSheetSync |
| 2 | `src/lib/google/sheets-client.ts` | 266 | OAuth client, spreadsheet CRUD, formatting |
| 3 | `src/features/backup/server/routers/googleSheets.router.ts` | 498 | tRPC router — 8 procedures for Google Sheets |
| 4 | `src/lib/crypto/token-encryption.ts` | 253 | AES-256-GCM token encryption/decryption |
| 5 | `src/lib/constants/enums.ts` | 78 | normalizeRsvpStatus, normalizeGuestSide |
| 6 | `src/lib/backup/auto-sync-trigger.ts` | 440 | Cross-module cascade sync (guests→hotels/transport→timeline) |
| 7 | `src/lib/realtime/redis-pubsub.ts` | 196 | SyncAction broadcast via Upstash Redis |
| 8 | `src/lib/db/schema-features.ts` | (partial) | googleSheetsSyncSettings table definition (line 1131) |
| 9 | `src/lib/export/excel-exporter.ts` | ~2365 | Standalone + master Excel exports |
| 10 | `src/lib/import/excel-parser.ts` | ~1607 | Excel import with EXPECTED header arrays |
| 11 | `src/lib/export/csv-exporter.ts` | 1116 | CSV exports for all modules |
| 12 | `src/lib/import/csv-parser.ts` | 368 | CSV parsing + importGuestListCSV |

---

## SECTION 2 — Google Sheets Header Arrays (Exact)

All arrays defined in `src/lib/google/sheets-sync.ts`.

### GUEST_HEADERS (24 columns) — line 45

```
'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Group', 'Side',
'RSVP Status', 'Party Size', 'Relationship', 'Arrival Date',
'Arrival Mode', 'Departure Date', 'Departure Mode',
'Hotel Required', 'Transport Required', 'Meal Preference',
'Dietary Restrictions', 'Additional Guests', 'Events',
'Gift To Give', 'Checked In', 'Notes', 'Last Updated'
```

### BUDGET_HEADERS (11 columns) — line 54

```
'ID', 'Item', 'Category', 'Segment', 'Estimated Cost',
'Actual Cost', 'Paid Amount', 'Payment Status', 'Vendor',
'Notes', 'Last Updated'
```

### TIMELINE_HEADERS (12 columns) — line 60

```
'ID', 'Title', 'Description', 'Start Time', 'End Time',
'Location', 'Phase', 'Completed', 'Responsible Person',
'Source Module', 'Notes', 'Last Updated'
```

### HOTEL_HEADERS (15 columns) — line 66

```
'ID', 'Guest Name', 'Hotel Name', 'Room Type', 'Room Number',
'Check-In Date', 'Check-Out Date', 'Party Size',
'Accommodation Needed', 'Booking Confirmed', 'Checked In',
'Cost', 'Payment Status', 'Notes', 'Last Updated'
```

### TRANSPORT_HEADERS (13 columns) — line 73

```
'ID', 'Guest Name', 'Leg Type', 'Pickup Date', 'Pickup Time',
'Pickup From', 'Drop To', 'Vehicle Info', 'Vehicle Number',
'Driver Phone', 'Transport Status', 'Notes', 'Last Updated'
```

### VENDOR_HEADERS (14 columns) — line 79

```
'ID', 'Vendor Name', 'Category', 'Contact Name', 'Phone',
'Email', 'Contract Amount', 'Total Paid', 'Payment Status',
'Service Date', 'Location', 'Rating', 'Notes', 'Last Updated'
```

### GIFT_HEADERS (7 columns) — line 85

```
'ID', 'Gift Name', 'Guest ID', 'Guest Name',
'Value', 'Status', 'Last Updated'
```

---

## SECTION 3 — Excel Import EXPECTED Headers (Exact)

All arrays defined in `src/lib/import/excel-parser.ts`.

### EXPECTED_GUEST_HEADERS (26 columns) — line 21

```
'ID', 'Guest Name', 'Email', 'Phone', 'Group', 'Side', 'RSVP',
'Party Size', 'Additional Guests', 'Relationship', 'Events',
'Arrival Date', 'Arrival Time', 'Arrival Mode',
'Departure Date', 'Departure Time', 'Departure Mode',
'Meal', 'Dietary', 'Hotel (Primary)', 'Transport (Primary)',
'Per-Member Hotel', 'Per-Member Transport',
'Gift Received', 'Notes', 'Checked In'
```
**Required**: `['Guest Name']` (line 30)

### EXPECTED_GIFT_HEADERS (10 columns) — line 32

```
'Guest Name', 'Gift Item', 'Gift Type', 'Quantity',
'Delivery Date', 'Delivery Time', 'Delivery Location',
'Delivery Status', 'Delivered By', 'Notes'
```
**Required**: `['Guest Name']` (line 37)

### EXPECTED_TIMELINE_HEADERS (16 columns) — line 39

```
'ID', 'Event ID', 'Event Name', 'Title', 'Description', 'Phase',
'Date', 'Start Time', 'End Time', 'Duration (Min)',
'Location', 'Participants', 'Responsible Person',
'Completed', 'Sort Order', 'Notes'
```
**Required**: `['Title']` (line 45)

### EXPECTED_BUDGET_HEADERS (11 columns) — line 47

```
'ID', 'Category', 'Item', 'Description', 'Estimated Cost',
'Actual Cost', 'Paid Amount', 'Payment Status', 'Transaction Date',
'Per Guest Cost', 'Notes'
```
**Required**: `['Item']` (line 52)

### EXPECTED_HOTEL_HEADERS (15 columns) — line 54

```
'ID', 'Guest Name', 'Hotel Name', 'Room Number', 'Room Type',
'Check In Date', 'Check Out Date', 'Accommodation Needed', 'Booking Confirmed',
'Checked In', 'Cost', 'Currency', 'Payment Status', 'Party Size', 'Notes'
```
**Required**: `['Guest Name']` (line 59)

### EXPECTED_TRANSPORT_HEADERS (13 columns) — line 61

```
'ID', 'Guest Name', 'Pickup Date', 'Pickup Time', 'Pickup From',
'Drop To', 'Transport Status', 'Vehicle Info', 'Vehicle Type',
'Driver Phone', 'Leg Type', 'Leg Sequence', 'Notes'
```
**Required**: `['Guest Name']` (line 66)

### EXPECTED_VENDOR_HEADERS (13 columns) — line 68

```
'ID', 'Name', 'Category', 'Contact Name', 'Email', 'Phone',
'Website', 'Address', 'Contract Signed', 'Contract Date',
'Rating', 'Is Preferred', 'Notes'
```
**Required**: `['Name']` (line 73)

---

## SECTION 4 — Excel Export Column Definitions (Exact)

All from `src/lib/export/excel-exporter.ts`.

### Guest Standalone Export — exportGuestListExcel (line 355, 26 columns)

```
'ID', 'Guest Name', 'Email', 'Phone', 'Group', 'Side', 'RSVP',
'Party Size', 'Additional Guests', 'Relationship', 'Events',
'Arrival Date', 'Arrival Time', 'Arrival Mode',
'Departure Date', 'Departure Time', 'Departure Mode',
'Meal', 'Dietary', 'Hotel (Primary)', 'Transport (Primary)',
'Per-Member Hotel', 'Per-Member Transport',
'Gift Received', 'Notes', 'Checked In'
```

### Budget Standalone Export — exportBudgetExcel (line 654, 11 columns)

```
'Expense Name', 'Expense Details', 'Category', 'Event',
'Budgeted Amount', 'Transaction Date', 'Total Paid',
'Balance Due', 'Payment History', 'Payment Status', 'Special Notes'
```

### Hotel Standalone Export — exportHotelListExcel (line 742, 20 columns)

```
'ID (Do not modify)', 'Guest ID (Do not modify)', 'Guest Name * (Required)',
'Relationship (from guest list)', 'Additional Guest Names (from guest list)',
'Guests in Room (Single: john, mary | Multi: 143: john, mary | 144: sue)',
'# Total Party Size', 'Email Address', 'Phone Number',
'Need Hotel? (Yes/No)', 'Hotel Name',
'Room Number (Single: 143 | Multi: 143, 144)',
'Room Type (Suite/Deluxe...)', 'Check-In (YYYY-MM-DD)',
'Check-Out (YYYY-MM-DD)', 'Booking Confirmed (Yes/No)',
'Checked In (Yes/No)', 'Room Cost (numbers only)',
'Payment (pending/paid/overdue)', 'Special Notes'
```

### Vendor Standalone Export — exportVendorListExcel (line 989, 17 columns)

```
'Vendor Name', 'Service Category', 'Contact Person',
'Phone Number', 'Email Address', 'Event', 'Service Location',
'On-Site Contact', 'Contact Phone', 'Contact Notes',
'Services Provided', 'Contract Amount', 'Deposit Paid',
'Service Date', 'Payment Status', 'Approval Status', 'Approval Notes'
```

---

## SECTION 5 — Header Drift Analysis: Google Sheets vs Excel Import vs Excel Export

The three systems (Google Sheets sync, Excel import, Excel export) use **independent header arrays**. Key differences:

### Guests

| Field | Sheets Header | Excel Import Header | Excel Export Header |
|-------|--------------|--------------------|--------------------|
| Name | `First Name` + `Last Name` (split) | `Guest Name` (combined) | `Guest Name` (combined) |
| RSVP | `RSVP Status` | `RSVP` | `RSVP` |
| Side | `Side` | `Side` | `Side` |
| Arrival | `Arrival Date` (combined datetime) | `Arrival Date` + `Arrival Time` (split) | `Arrival Date` + `Arrival Time` (split) |
| Departure | `Departure Date` (combined datetime) | `Departure Date` + `Departure Time` (split) | `Departure Date` + `Departure Time` (split) |
| Hotel flag | `Hotel Required` | `Hotel (Primary)` | `Hotel (Primary)` |
| Transport flag | `Transport Required` | `Transport (Primary)` | `Transport (Primary)` |
| Meal | `Meal Preference` | `Meal` | `Meal` |
| Dietary | `Dietary Restrictions` | `Dietary` | `Dietary` |
| Per-member | Not supported | `Per-Member Hotel` + `Per-Member Transport` | `Per-Member Hotel` + `Per-Member Transport` |
| Count | 24 columns | 26 columns | 26 columns |

### Budget

| Field | Sheets Header | Excel Import Header | Excel Export Header |
|-------|--------------|--------------------|--------------------|
| Name | `Item` | `Item` | `Expense Name` |
| Description | N/A | `Description` | `Expense Details` |
| Segment | `Segment` | N/A | N/A |
| Est Cost | `Estimated Cost` | `Estimated Cost` | `Budgeted Amount` |
| Vendor | `Vendor` (from JOIN) | N/A | N/A |
| Event | N/A | N/A | `Event` |
| Per Guest | N/A | `Per Guest Cost` | N/A |
| Count | 11 columns | 11 columns | 11 columns |

### Hotels

| Field | Sheets Header | Excel Import Header | Excel Export Header |
|-------|--------------|--------------------|--------------------|
| Check-in | `Check-In Date` | `Check In Date` | `Check-In (YYYY-MM-DD)` |
| Check-out | `Check-Out Date` | `Check Out Date` | `Check-Out (YYYY-MM-DD)` |
| Currency | N/A | `Currency` | N/A |
| Room assign | N/A | N/A | `Guests in Room (...)` |
| Count | 15 columns | 15 columns | 20 columns |

### Transport

| Field | Sheets Header | Excel Import Header |
|-------|--------------|---------------------|
| Vehicle # | `Vehicle Number` | N/A |
| Vehicle Type | N/A | `Vehicle Type` |
| Leg Seq | N/A | `Leg Sequence` |
| Count | 13 columns | 13 columns |

### Vendors

| Field | Sheets Header | Excel Import Header | Excel Export Header |
|-------|--------------|--------------------|--------------------|
| Name | `Vendor Name` | `Name` | `Vendor Name` |
| Count | 14 columns | 13 columns | 17 columns |

### Gifts

| Field | Sheets Header | Excel Import Header |
|-------|--------------|---------------------|
| Name | `Gift Name` | N/A (uses `Gift Item`) |
| Guest link | `Guest ID` + `Guest Name` | `Guest Name` only |
| Value | `Value` | N/A (uses `Quantity`) |
| Status | `Status` | `Delivery Status` |
| Count | 7 columns | 10 columns |

---

## SECTION 6 — Google Sheets Export Functions

All in `src/lib/google/sheets-sync.ts`.

| Function | Line | Sheet Tab | Sheet ID | DB Table | JOIN |
|----------|------|-----------|----------|----------|------|
| `syncGuestsToSheet` | 136 | Guests | 0 | `guests` | None |
| `syncBudgetToSheet` | 194 | Budget | 1 | `budget` | LEFT JOIN `vendors` on `budget.vendorId = vendors.id` |
| `syncTimelineToSheet` | 252 | Timeline | 2 | `timeline` | None |
| `syncHotelsToSheet` | 298 | Hotels | 3 | `hotels` | None |
| `syncTransportToSheet` | 347 | Transport | 4 | `guestTransport` | None |
| `syncVendorsToSheet` | 394 | Vendors | 5 | `vendors` + `clientVendors` | + `advancePayments` aggregation |
| `syncGiftsToSheet` | 476 | Gifts | 6 | `gifts` | LEFT JOIN `guests` on `gifts.guestId = guests.id` |
| `syncAllToSheets` | 530 | All 7 | — | All | Sequential, not parallel |

### Key Details

- **syncBudgetToSheet** (line 194): Performs `leftJoin(vendors, eq(budget.vendorId, vendors.id))` to resolve vendor name for the `Vendor` column.
- **syncVendorsToSheet** (line 394): Fetches `clientVendors` to filter vendors by client, queries `advancePayments` with `inArray(advancePayments.vendorId, vendorIds)` to sum `totalPaid` per vendor.
- **syncGiftsToSheet** (line 476): Performs `leftJoin(guests, eq(gifts.guestId, guests.id))` to resolve guest name from `firstName` + `lastName`.
- **syncAllToSheets** (line 530): Calls all 7 export functions **sequentially** (not `Promise.all`). Returns `{ success, totalExported, errors }`.

---

## SECTION 7 — Google Sheets Import Functions

All in `src/lib/google/sheets-sync.ts`.

| Function | Line | Sheet Tab | DB Table | Conflict Resolution | Required Col |
|----------|------|-----------|----------|---------------------|-------------|
| `importGuestsFromSheet` | 585 | Guests | `guests` | Timestamp (updatedAt) | ID, First Name |
| `importBudgetFromSheet` | 710 | Budget | `budget` | Timestamp (updatedAt) | ID, Item |
| `importVendorsFromSheet` | 803 | Vendors | `vendors` + `clientVendors` | Timestamp (updatedAt) | ID, Vendor Name |
| `importHotelsFromSheet` | 937 | Hotels | `hotels` | Timestamp (updatedAt) | ID, Guest Name |
| `importTransportFromSheet` | 1041 | Transport | `guestTransport` | Timestamp (updatedAt) | ID, Guest Name |
| `importTimelineFromSheet` | 1139 | Timeline | `timeline` | Timestamp (updatedAt) | ID, Title |
| `importGiftsFromSheet` | 1265 | Gifts | `gifts` | Timestamp (updatedAt) | ID, Gift Name |
| `importAllFromSheets` | 1373 | All 7 | All | — | — |

### Common Import Pattern (all 7 functions):

1. `readSheetData(sheetsClient, spreadsheetId, '<SheetName>')`
2. Check `sheetData.length <= 1` — return early if only headers
3. Find `ID` and `Last Updated` column indices via `headers.indexOf()`
4. Query existing records, build `existingMap<id, updatedAt>`
5. Loop `dataRows = sheetData.slice(1)`:
   - Parse ID: `rawId.trim()` or `randomUUID()` if blank
   - **Timestamp comparison**: Skip if `new Date(dbUpdatedAt) >= sheetUpdatedAt`
   - Build data object via `getValue(header)` helper
   - Upsert: `existingMap.has(id)` — `tx.update()`, else `tx.insert()`
6. All wrapped in `db.transaction()`

### Special Import Behaviors:

- **Guests** (line 585): Uses `normalizeGuestSide()` and `normalizeRsvpStatus()` on import. Splits `Additional Guests` and `Events` by comma. Skips rows with empty `firstName`.
- **Vendors** (line 803): Two-table upsert — `vendors` table AND `clientVendors` bridge table. Tracks `linkedVendorIds` Set to decide insert vs update on bridge.
- **Timeline** (line 1139): Skips auto-generated entries where `sourceModule` is `'hotels'`, `'transport'`, or `'events'` (line 1184). Requires `title` AND `startTime` for insert; update can omit `startTime`.
- **Gifts** (line 1265): Builds `guestNameMap` for name-to-ID resolution (line 1296-1302). Falls back to `Guest Name` lookup if `Guest ID` is empty.

---

## SECTION 8 — importAllFromSheets Orchestration

Defined at `src/lib/google/sheets-sync.ts:1373`.

### Execution Order:

```
1. importGuestsFromSheet
   -> if imported > 0:
       recalcPerGuestBudgetItems(db, clientId)        [line 1398]
       syncGuestsToHotelsAndTransportTx(db, clientId)  [line 1404]

2. importBudgetFromSheet                               [line 1410]

3. importVendorsFromSheet                              [line 1415]

4. importHotelsFromSheet
   -> if imported > 0:
       syncHotelsToTimelineTx(db, clientId)            [line 1428]

5. importTransportFromSheet
   -> if imported > 0:
       syncTransportToTimelineTx(db, clientId)         [line 1442]

6. importTimelineFromSheet                             [line 1448]

7. importGiftsFromSheet                                [line 1453]
```

### Post-Import Broadcasting (line 1461-1474):

If `userId` is provided and `totalImported > 0`, iterates all 7 modules. For each module with `byModule[mod] > 0`, calls `broadcastSheetSync()`.

---

## SECTION 9 — Cascade Sync Logic (auto-sync-trigger.ts)

All in `src/lib/backup/auto-sync-trigger.ts`.

### syncGuestsToHotelsAndTransportTx (line 116)

**Trigger**: Guest import with `hotelRequired=true` or `transportRequired=true`

**Hotel creation** (lines 145-190):
- Queries `guests` where `clientId` and `hotelRequired=true`
- Duplicate prevention: checks `hotels.guestId` for existing record
- Default check-in: guest's `hotelCheckIn` -> `arrivalDatetime` date -> `weddingDate - 1 day`
- Default check-out: guest's `hotelCheckOut` -> `departureDatetime` date -> `weddingDate + 1 day`
- Sets `accommodationNeeded: true`

**Transport creation** (lines 214-261):
- Queries `guests` where `clientId` and `transportRequired=true`
- Duplicate prevention: checks `guestTransport.guestId` for existing record
- Pickup date from `arrivalDatetime`; pickup time from `transportPickupTime` -> `arrivalDatetime` time
- Vehicle info: concatenates `transportType` + `(arrivalMode)`
- Sets `legType: 'arrival'`, `legSequence: 1`, `transportStatus: 'scheduled'`

### syncHotelsToTimelineTx (line 282)

**Trigger**: Hotel import with records having `checkInDate`

- Creates timeline entry: `Hotel Check-in: {guestName}`
- Default time: `15:00` (3pm)
- Duplicate prevention: checks `timeline.sourceModule='hotels'` AND `timeline.sourceId=hotel.id`
- Sets `sourceModule: 'hotels'`, `sourceId: hotel.id`
- Metadata JSON: `{ guestId, type: 'check-in' }`

### syncTransportToTimelineTx (line 348)

**Trigger**: Transport import with records having `pickupDate`

- Creates timeline entry: `Transport {Pickup|Drop-off}: {guestName}`
- Label: `legType === 'departure'` -> 'Drop-off', else 'Pickup'
- Time from `pickupTime` (HH:MM split)
- Duplicate prevention: checks `timeline.sourceModule='transport'` AND `timeline.sourceId=transport.id`
- Sets `sourceModule: 'transport'`, `sourceId: transport.id`
- Metadata JSON: `{ guestId, type: legLabel.toLowerCase(), dropTo }`

### triggerFullSync (line 409)

Wraps all three cascades in a single `withTransaction()` call.

---

## SECTION 10 — tRPC Router Procedures

All in `src/features/backup/server/routers/googleSheets.router.ts`.

| Procedure | Type | Line | Input | Description |
|-----------|------|------|-------|-------------|
| `getAuthUrl` | query | 43 | None | Returns OAuth authorization URL |
| `handleOAuthCallback` | mutation | 53 | `{ code: string }` | Exchanges code for tokens, encrypts, stores |
| `isConnected` | query | 104 | None | Returns `{ connected, hasTokens }` |
| `disconnect` | mutation | 119 | None | Clears tokens, sets `isConnected: false` |
| `syncNow` | mutation | 138 | `{ clientId: string }` | Full export to Google Sheets |
| `getSyncStatus` | query | 268 | `{ clientId: string }` | Returns `{ lastSynced, spreadsheetUrl, status, isConnected }` |
| `configure` | mutation | 299 | `{ spreadsheetId?, createNew? }` | Link existing spreadsheet |
| `importFromSheet` | mutation | 342 | `{ clientId, module }` | Import from sheet (single module or 'all') |

### Token Refresh Pattern (duplicated in syncNow line 177 and importFromSheet line 364):

```typescript
if (settings.tokenExpiresAt && new Date(settings.tokenExpiresAt) < new Date()) {
  try {
    const newTokens = await oauth.refreshAccessToken(refreshTokenPlain);
    // Update stored tokens (encrypted)
  } catch (error) {
    // Clear stale tokens -> isConnected: false
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'session expired' });
  }
}
```

### importFromSheet Cascade Chains (lines 446-479):

```
guests import (imported > 0) ->
  recalcPerGuestBudgetItems(db, clientId)
  syncGuestsToHotelsAndTransportTx(db, clientId, cascadeResult)

hotels import (imported > 0) ->
  syncHotelsToTimelineTx(db, clientId, cascadeResult)

transport import (imported > 0) ->
  syncTransportToTimelineTx(db, clientId, cascadeResult)
```

These cascades are duplicated from `importAllFromSheets` — the router handles individual module imports, while `importAllFromSheets` handles the 'all' case.

---

## SECTION 11 — OAuth & Token Encryption

### GoogleSheetsOAuth Class — sheets-client.ts:26

| Method | Line | Description |
|--------|------|-------------|
| `constructor()` | 29 | Creates OAuth2 client with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, callback URL |
| `getAuthUrl(userId)` | 40 | Generates auth URL with `access_type: 'offline'`, `prompt: 'consent'`, `state: userId` |
| `getTokensFromCode(code)` | 52 | Exchanges authorization code for tokens |
| `refreshAccessToken(refreshToken)` | 66 | Refreshes access token, preserves original refresh token as fallback |
| `getSheetsClient(accessToken, refreshToken)` | 81 | Returns `sheets_v4.Sheets` instance |
| `getDriveClient(accessToken, refreshToken)` | 92 | Returns `drive_v3.Drive` instance |

### OAuth Scopes (line 13):
```
'https://www.googleapis.com/auth/spreadsheets'
'https://www.googleapis.com/auth/drive.file'
```

### Callback URL:
```
${process.env.NEXT_PUBLIC_APP_URL}/api/google-sheets/callback
```

### Required Environment Variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `TOKEN_ENCRYPTION_KEY` (32-byte base64-encoded key)

### Token Encryption — token-encryption.ts

| Function | Line | Description |
|----------|------|-------------|
| `encryptToken(plaintext)` | 106 | AES-256-GCM encryption -> `enc:v1:iv:authTag:ciphertext` |
| `decryptToken(encryptedStr)` | 153 | Decrypts; returns plaintext as-is if not encrypted (legacy compat) |
| `isEncrypted(value)` | 212 | Checks for `enc:v1:` prefix |
| `reEncryptToken(encryptedStr, oldKeyBase64)` | 223 | Decrypt with old key, re-encrypt with current |

**Algorithm**: `aes-256-gcm`
**IV Length**: 12 bytes (96 bits)
**Auth Tag Length**: 16 bytes (128 bits)
**Format**: `enc:v1:<iv-base64>:<authTag-base64>:<ciphertext-base64>`
**Separator**: `:` (colon)
**Prefix**: `enc:v1:`

---

## SECTION 12 — Enum Normalization

All in `src/lib/constants/enums.ts`.

### RSVP Status (line 10)

Canonical values: `'pending'` | `'confirmed'` | `'declined'` | `'maybe'`

**normalizeRsvpStatus** (line 25) mapping:

| Input (case-insensitive) | Output |
|--------------------------|--------|
| `'attending'` | `'confirmed'` |
| `'accepted'` | `'confirmed'` |
| `'not_attending'` | `'declined'` |
| `'tentative'` | `'maybe'` |
| `'yes'` | `'confirmed'` |
| `'no'` | `'declined'` |
| Any canonical value | Pass-through |
| Anything else | `'pending'` (fallback) |

### Guest Side (line 52)

Canonical values: `'partner1'` | `'partner2'` | `'mutual'`

**normalizeGuestSide** (line 66) mapping:

| Input (case-insensitive) | Output |
|--------------------------|--------|
| `'bride'` | `'partner1'` |
| `'groom'` | `'partner2'` |
| `'bride_side'` | `'partner1'` |
| `'groom_side'` | `'partner2'` |
| `'both'` | `'mutual'` |
| `'common'` | `'mutual'` |
| Any canonical value | Pass-through |
| Anything else | `'mutual'` (fallback) |

---

## SECTION 13 — Spreadsheet Creation

### createSpreadsheet — sheets-client.ts:104

**Title format**: `WeddingFlo - ${clientName}`

**Sheets created** (7 tabs):

| Tab Name | Sheet ID | Synced by |
|----------|----------|-----------|
| Guests | 0 | syncGuestsToSheet / importGuestsFromSheet |
| Budget | 1 | syncBudgetToSheet / importBudgetFromSheet |
| Timeline | 2 | syncTimelineToSheet / importTimelineFromSheet |
| Hotels | 3 | syncHotelsToSheet / importHotelsFromSheet |
| Transport | 4 | syncTransportToSheet / importTransportFromSheet |
| Vendors | 5 | syncVendorsToSheet / importVendorsFromSheet |
| Gifts | 6 | syncGiftsToSheet / importGiftsFromSheet |

### formatSheetHeaders — sheets-client.ts:224

Applied after each module export via `formatSheetHeaders(sheetsClient, spreadsheetId, sheetId)`.

- **Bold**: Row 0 (header row) — `textFormat: { bold: true }`
- **Background**: `backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }` (light gray)
- **Frozen row**: `frozenRowCount: 1`

---

## SECTION 14 — writeSheetData / readSheetData Behavior

### readSheetData — sheets-client.ts:139

- Range: `${sheetName}!A:Z` (columns A through Z = 26 columns max)
- Returns `response.data.values || []`

### writeSheetData — sheets-client.ts:155

1. **Clear**: `values.clear({ range: '${sheetName}!A:Z' })`
2. **Write**: `values.update({ range: '${sheetName}!A1', valueInputOption: 'USER_ENTERED' })`
3. Only writes if `data.length > 0`

**WARNING** (documented in code comment, line 168-173):
> `USER_ENTERED` mode causes Google Sheets to interpret values:
> - Phone numbers with leading +/0 are converted to numbers (data loss)
> - Date-like strings are reformatted based on spreadsheet locale
> - Numeric strings lose leading zeros
>
> Accepted risk — documented in Session 4 audit, Section 17.5

### appendSheetData — sheets-client.ts:189

- `valueInputOption: 'USER_ENTERED'`
- `insertDataOption: 'INSERT_ROWS'`
- Not currently used by any export/import function

---

## SECTION 15 — Real-Time Broadcasting

All in `src/lib/realtime/redis-pubsub.ts`.

### SyncAction Interface (line 32)

```typescript
interface SyncAction {
  id: string;                    // UUID
  type: 'insert' | 'update' | 'delete';
  module: 'guests' | 'budget' | 'events' | 'vendors' | 'hotels' |
          'transport' | 'timeline' | 'gifts' | 'clients' | 'floorPlans';
  entityId: string;
  data?: Record<string, unknown>;
  companyId: string;
  clientId?: string;
  userId: string;
  timestamp: number;             // Unix ms
  queryPaths: string[];
  toolName?: string;
}
```

### broadcastSheetSync — sheets-sync.ts:107

Creates a SyncAction with:
- `type: 'update'`
- `entityId: 'sheets-import'`
- `queryPaths`: from `getQueryPathsForModule()`
- Calls `publishSyncAction()` AND `storeSyncAction()` in `Promise.all()`
- Wrapped in `.catch()` — broadcast failures don't break the import

### getQueryPathsForModule — sheets-sync.ts:91

```typescript
guests:    ['guests.getAll', 'guests.getStats', 'guests.getDietaryStats']
budget:    ['budget.getAll', 'budget.getStats']
timeline:  ['timeline.getAll']
hotels:    ['hotels.getAll']
transport: ['guestTransport.getAll']
vendors:   ['vendors.getAll']
gifts:     ['gifts.getAll']
```

### Redis Operations

| Function | Line | Channel/Key | Behavior |
|----------|------|-------------|----------|
| `publishSyncAction` | 73 | `company:{companyId}:sync` | Pub/sub broadcast |
| `storeSyncAction` | 91 | `sync:{companyId}:actions` | Sorted set (score=timestamp), max 1000, TTL 24h |
| `getMissedActions` | 121 | `sync:{companyId}:actions` | `zrange` with `byScore: true`, `since+1` to `+inf` |
| `subscribeToCompany` | 158 | `sync:{companyId}:actions` | AsyncGenerator, polls every 500ms |

---

## SECTION 16 — Database Schema: googleSheetsSyncSettings

From `src/lib/db/schema-features.ts:1131`.

```sql
CREATE TABLE google_sheets_sync_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  company_id   TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_connected BOOLEAN DEFAULT false,
  spreadsheet_id TEXT,
  spreadsheet_url TEXT,
  last_synced_at TIMESTAMP,
  sync_direction TEXT DEFAULT 'bidirectional',  -- 'export' | 'import' | 'bidirectional'
  auto_sync    BOOLEAN DEFAULT false,
  auto_sync_interval INTEGER DEFAULT 60,        -- minutes
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX google_sheets_sync_user_id_idx ON google_sheets_sync_settings (user_id);
CREATE INDEX google_sheets_sync_company_id_idx ON google_sheets_sync_settings (company_id);
```

**Note**: `sync_direction`, `auto_sync`, and `auto_sync_interval` columns exist in schema but are NOT currently used by any router procedure. They are reserved for future auto-sync feature.

---

## SECTION 17 — Data Transform Details per Module

### 17.1 Guests Export (sheets-sync.ts:149-176)

| DB Field | Sheet Column | Transform |
|----------|-------------|-----------|
| `id` | ID | Direct |
| `firstName` | First Name | Direct |
| `lastName` | Last Name | `|| ''` |
| `email` | Email | `|| ''` |
| `phone` | Phone | `|| ''` |
| `groupName` | Group | `|| ''` |
| `guestSide` | Side | `|| ''` |
| `rsvpStatus` | RSVP Status | `|| 'pending'` |
| `partySize` | Party Size | `|| 1` |
| `relationshipToFamily` | Relationship | `|| ''` |
| `arrivalDatetime` | Arrival Date | `new Date().toISOString().slice(0,16).replace('T',' ')` |
| `arrivalMode` | Arrival Mode | `|| ''` |
| `departureDatetime` | Departure Date | `new Date().toISOString().slice(0,16).replace('T',' ')` |
| `departureMode` | Departure Mode | `|| ''` |
| `hotelRequired` | Hotel Required | `? 'Yes' : 'No'` |
| `transportRequired` | Transport Required | `? 'Yes' : 'No'` |
| `mealPreference` | Meal Preference | `|| ''` |
| `dietaryRestrictions` | Dietary Restrictions | `|| ''` |
| `additionalGuestNames` | Additional Guests | `Array.isArray ? .join(', ') : ''` |
| `attendingEvents` | Events | `Array.isArray ? .join(', ') : ''` |
| `giftToGive` | Gift To Give | `|| ''` |
| `checkedIn` | Checked In | `? 'Yes' : 'No'` |
| `notes` | Notes | `|| ''` |
| `updatedAt` | Last Updated | `new Date().toISOString()` |

### 17.2 Guests Import (sheets-sync.ts:643-671)

| Sheet Column | DB Field | Transform |
|-------------|----------|-----------|
| First Name | `firstName` | `getValue() || ''` |
| Last Name | `lastName` | `getValue() || null` |
| Email | `email` | `getValue() || null` |
| Phone | `phone` | `getValue() || null` |
| Group | `groupName` | `getValue() || null` |
| Side | `guestSide` | `normalizeGuestSide(getValue() || 'mutual')` |
| RSVP Status | `rsvpStatus` | `normalizeRsvpStatus(getValue() || 'pending')` |
| Party Size | `partySize` | `parseInt(getValue() || '1') || 1` |
| Relationship | `relationshipToFamily` | `getValue() || null` |
| Arrival Date | `arrivalDatetime` | `getValue() ? new Date(getValue()!) : null` |
| Arrival Mode | `arrivalMode` | `getValue() || null` |
| Departure Date | `departureDatetime` | `getValue() ? new Date(getValue()!) : null` |
| Departure Mode | `departureMode` | `getValue() || null` |
| Hotel Required | `hotelRequired` | `parseBoolean()` — 'yes'/'true' -> true |
| Transport Required | `transportRequired` | `parseBoolean()` — 'yes'/'true' -> true |
| Meal Preference | `mealPreference` | `getValue() || null` |
| Dietary Restrictions | `dietaryRestrictions` | `getValue() || null` |
| Additional Guests | `additionalGuestNames` | `.split(',').map(trim).filter(Boolean)` |
| Events | `attendingEvents` | `.split(',').map(trim).filter(Boolean)` |
| Gift To Give | `giftToGive` | `getValue() || null` |
| Checked In | `checkedIn` | `parseBoolean()` |
| Notes | `notes` | `getValue() || null` |

### 17.3 Budget Export (sheets-sync.ts:220-234)

| DB Field | Sheet Column | Transform |
|----------|-------------|-----------|
| `id` | ID | Direct |
| `item` | Item | Direct |
| `category` | Category | Direct |
| `segment` | Segment | `|| ''` |
| `estimatedCost` | Estimated Cost | `|| '0'` |
| `actualCost` | Actual Cost | `|| ''` |
| `paidAmount` | Paid Amount | `|| '0'` |
| `paymentStatus` | Payment Status | `|| 'pending'` |
| `vendorName` (from JOIN) | Vendor | `|| ''` |
| `notes` | Notes | `|| ''` |
| `updatedAt` | Last Updated | `new Date().toISOString()` |

### 17.4 Vendors Export (sheets-sync.ts:437-458)

Unique: Uses `clientVendors` link table + `advancePayments` aggregation.

| DB Field | Sheet Column | Source |
|----------|-------------|--------|
| `v.id` | ID | `vendors` |
| `v.name` | Vendor Name | `vendors` |
| `v.category` | Category | `vendors` |
| `v.contactName` | Contact Name | `vendors` |
| `v.phone` | Phone | `vendors` |
| `v.email` | Email | `vendors` |
| `link.contractAmount` | Contract Amount | `clientVendors` |
| `totalPaid` (calculated) | Total Paid | `advancePayments` SUM |
| `link.paymentStatus` | Payment Status | `clientVendors` |
| `link.serviceDate` | Service Date | `clientVendors` |
| `link.venueAddress` | Location | `clientVendors` |
| `v.rating` | Rating | `vendors` |
| `v.notes` | Notes | `vendors` |
| `v.updatedAt` | Last Updated | `vendors` |

---

## SECTION 18 — Conflict Resolution Strategy

**Pattern**: Timestamp-based "last-write-wins" with DB-preferred skip.

Applied identically across all 7 import functions:

```typescript
// Line pattern (e.g., guests at line 627)
if (dbUpdatedAt && sheetUpdatedAt && new Date(dbUpdatedAt) >= sheetUpdatedAt) {
  continue; // Skip — DB record is newer or same
}
```

**Rules**:
1. If DB has `updatedAt` AND sheet has `Last Updated`: compare timestamps, skip if DB >= Sheet
2. If either timestamp is missing: import proceeds (sheet data wins)
3. All imported records get `updatedAt: new Date()` set to current time
4. New rows (no matching ID in DB): always imported with `randomUUID()` if ID is blank

**Edge cases**:
- Empty ID in sheet -> generates `randomUUID()` -> always inserts as new
- Timeline import skips rows where `sourceModule` is `'hotels'`, `'transport'`, or `'events'` (auto-generated items, line 1184)

---

## SECTION 19 — Transaction Wrapping

| Function | Transaction Scope |
|----------|------------------|
| `importGuestsFromSheet` | `db.transaction()` wraps all row upserts (line 618) |
| `importBudgetFromSheet` | `db.transaction()` wraps all row upserts (line 742) |
| `importVendorsFromSheet` | `db.transaction()` wraps all row upserts (line 844) |
| `importHotelsFromSheet` | `db.transaction()` wraps all row upserts (line 968) |
| `importTransportFromSheet` | `db.transaction()` wraps all row upserts (line 1072) |
| `importTimelineFromSheet` | `db.transaction()` wraps all row upserts (line 1170) |
| `importGiftsFromSheet` | `db.transaction()` wraps all row upserts (line 1305) |
| `syncGuestsToHotelsAndTransportTx` | Accepts `tx` parameter (caller wraps) |
| `syncHotelsToTimelineTx` | Accepts `tx` parameter (caller wraps) |
| `syncTransportToTimelineTx` | Accepts `tx` parameter (caller wraps) |
| `triggerFullSync` | Single `withTransaction()` wrapping all 3 cascades (line 426) |

**Note**: In the router's `importFromSheet` procedure, cascade sync calls use `db` (not `tx`) — they are NOT inside the import transaction. Each cascade creates its own connection. Same in `importAllFromSheets`.

---

## SECTION 20 — Error Handling Patterns

### Router-level (googleSheets.router.ts):

| Error | Code | When |
|-------|------|------|
| No tokens | `PRECONDITION_FAILED` | `!settings?.accessToken || !settings?.refreshToken` |
| Client not found | `NOT_FOUND` | `!client` |
| Token refresh fails | `UNAUTHORIZED` | Catch block clears tokens, sets `isConnected: false` |
| Spreadsheet creation fails | `INTERNAL_SERVER_ERROR` | `createSpreadsheet()` throws |
| Module not supported | `BAD_REQUEST` | Default case in switch |

### Sync-level (sheets-sync.ts):

- Each export function: `try/catch` with `stats.errors.push('${Module}: ${error.message}')`
- Each import function: outer `try/catch` + inner per-row `try/catch` with `stats.errors.push('Row ${i+2}: ${error.message}')`
- Cascade sync: each wrapped in `try/catch`, logs error, does NOT propagate to caller
- broadcastSheetSync: `Promise.all().catch()` — broadcast failure is swallowed

---

## SECTION 21 — Template Metadata (Excel)

### addTemplateMetadata — excel-exporter.ts:304

Hidden `_metadata` worksheet with:

| Cell | Key | Value |
|------|-----|-------|
| A1/B1 | `template_version` | `'3.0'` |
| A2/B2 | `exported_at` | `new Date().toISOString()` |
| A3/B3 | `app_version` | `'weddingflo-2026.02'` |

Called by standalone exports: `exportGuestListExcel` (line 78), `exportBudgetExcel` (line 195), `exportHotelListExcel` (line 294), and others.

### Master Export Metadata — excel-exporter.ts:2160

The `exportMasterPlanningExcel` function writes a SEPARATE `_Metadata` sheet with:

```
{ property: 'Version', value: '2.0 (December 2025)' }
{ property: 'IMPORTANT', value: 'Do not modify ID columns - they are used for data sync' }
```

**DISCREPANCY**: Standalone exports write `template_version: '3.0'` via `addTemplateMetadata()`, but the master export writes `Version: '2.0 (December 2025)'`. These are inconsistent.

### validateExcelFile — excel-parser.ts:134

Checks for `_metadata` sheet on import. Reads headers case-insensitively. Validates required headers are present.

---

## SECTION 22 — Excel Formatting Standards

### Standalone Exports (applyStandardSheetFormatting)

- **Header row**: Blue background (`FF4472C4`), white bold text
- **Hint row** (row 2): Yellow background (`FFFFF2CC`), italic gray text — contains format hints
- **Frozen rows**: 2 (header + hint)
- **Auto-filter**: Applied to header row
- **Column widths**: Per-column custom widths defined in column arrays

### Hotel Export Special Formatting

- Instruction rows at top (lines 911-918): Blue bold heading, format examples
- Data starts at row 10 (after 8 instruction rows + blank row)

### Google Sheets Formatting (formatSheetHeaders)

- **Header row**: Bold text, light gray background (`{red:0.9, green:0.9, blue:0.9}`)
- **Frozen row**: 1 (header only)
- No hint rows, no auto-filter, no colored backgrounds

---

## SECTION 23 — Known Risks & Accepted Trade-offs

### 23.1 USER_ENTERED Value Interpretation

**File**: `sheets-client.ts:168-173`
**Risk**: Google Sheets interprets `USER_ENTERED` values — phone numbers with `+`/`0` prefix lose formatting, date-like strings get locale-reformatted, leading zeros stripped.
**Status**: Accepted risk. Using `RAW` would prevent interpretation but makes spreadsheet less user-friendly for editing.

### 23.2 A:Z Range Limit

**File**: `sheets-client.ts:146`
**Risk**: `readSheetData` and `writeSheetData` both use range `A:Z` (26 columns max). Guest export has 24 columns (safe), but if any module exceeds 26 columns, data will be silently truncated.
**Status**: All current modules are within range. Largest is Guest at 24 columns.

### 23.3 Sequential Export (No Parallelism)

**File**: `sheets-sync.ts:530-578`
**Risk**: `syncAllToSheets` calls all 7 export functions sequentially. For large datasets, this can be slow. No `Promise.all()` parallelism.
**Status**: Acceptable for current scale. Google Sheets API rate limits may actually require sequential execution.

### 23.4 Cascade Sync Outside Transaction

**File**: `googleSheets.router.ts:446-479` and `sheets-sync.ts:1396-1446`
**Risk**: Cascade sync calls (`recalcPerGuestBudgetItems`, `syncGuestsToHotelsAndTransportTx`, etc.) run OUTSIDE the import transaction. If they fail, import data is committed but cascades are partial.
**Status**: Each cascade is wrapped in its own `try/catch` and logged. Failure doesn't rollback the import.

### 23.5 Duplicate Token Refresh Logic

**File**: `googleSheets.router.ts` — lines 177-206 (syncNow) and lines 364-392 (importFromSheet)
**Risk**: Token refresh + cleanup logic is duplicated in two procedures. A fix in one might not be applied to the other.
**Status**: Code duplication. Could be extracted to a shared helper, but not a runtime risk.

### 23.6 Header Drift Between Systems

**Risk**: Google Sheets, Excel import, and Excel export all use independent header arrays with different naming conventions (e.g., `'First Name'` + `'Last Name'` vs `'Guest Name'`; `'RSVP Status'` vs `'RSVP'`). This means data exported from one system cannot be directly imported by another without header mapping.
**Status**: By design — each system serves different use cases. Google Sheets is for live editing, Excel is for template-based import/export.

### 23.7 No Auto-Sync Implementation

**File**: `schema-features.ts:1147-1148`
**Risk**: `auto_sync` and `auto_sync_interval` columns exist in the database schema but no cron job, webhook, or polling mechanism implements automatic sync.
**Status**: Reserved for future feature. Currently manual-only via `syncNow` and `importFromSheet`.

---

*End of ground-truth document. All values sourced from direct file reads on 2026-02-23.*
