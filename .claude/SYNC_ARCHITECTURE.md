# WeddingFlo Cross-Module Sync Architecture

**Last Updated:** February 2026
**Version:** 2.0

## Overview

WeddingFlo uses a cascading sync architecture to maintain data consistency across modules. When data changes in one module, related modules are automatically updated to reflect those changes.

## Sync Patterns

### 1. Guest → Hotels/Transport Sync

When a guest is created or updated with `hotelRequired=true` or `transportRequired=true`, the system automatically creates corresponding records in the Hotels and Transport modules.

**Trigger Points:**
- UI: `guests.router.ts` - `create` and `update` mutations
- Import: `import.router.ts` - `importGuest` function
- Auto-Sync: `auto-sync-trigger.ts` - `triggerBatchSync('guests', clientIds)`

**Flow:**
```
Guest Created/Updated
       ↓
Check hotelRequired flag
       ↓ (if true)
Check if hotel record exists for guestId
       ↓ (if not)
Create hotels record with guest info
       ↓
Create timeline entry for check-in
```

### 2. Hotels → Timeline Sync

Hotel records with check-in dates automatically create/update timeline entries.

**Trigger Points:**
- `hotels.router.ts` - `create` and `update` mutations
- `auto-sync-trigger.ts` - `syncHotelsToTimeline()`

**Timeline Entry Format:**
```json
{
  "title": "Hotel Check-in: {guestName}",
  "description": "Check-in at {hotelName}",
  "sourceModule": "hotels",
  "sourceId": "{hotelId}",
  "metadata": { "guestId": "...", "type": "check-in" }
}
```

### 3. Transport → Timeline Sync

Transport records with pickup dates automatically create/update timeline entries.

**Trigger Points:**
- `guest-transport.router.ts` - `create`, `update`, and `delete` mutations
- `auto-sync-trigger.ts` - `syncTransportToTimeline()`

**Timeline Entry Format:**
```json
{
  "title": "{Arrival|Departure|Transfer}: {guestName}",
  "description": "{vehicleInfo}",
  "sourceModule": "transport",
  "sourceId": "{transportId}",
  "metadata": { "guestId": "...", "legType": "arrival" }
}
```

### 4. Vendor → Budget Sync

When vendor pricing or status changes, linked budget items are updated.

**Trigger Points:**
- `vendors.router.ts` - `update` mutation
- `client-vendors.router.ts` - when cost is modified

**Sync Logic:**
- Budget items with matching `vendorId` are updated
- `estimatedCost` reflects vendor pricing
- Status changes propagate to budget payment status

### 5. RSVP → Budget Sync (Per-Guest Items)

When guest RSVP status changes, per-guest budget items recalculate.

**Trigger Points:**
- `guests.router.ts` - `syncBudgetWithRsvpCount()` function

**Flow:**
```
Guest RSVP changes to 'accepted' or 'declined'
       ↓
Count all accepted guests (sum of party sizes)
       ↓
Find budget items with isPerGuestItem=true
       ↓
Update: estimatedCost = perGuestCost × confirmedCount
```

## Deletion Cascades

### Client Deletion

When a client is deleted (soft delete), all related records are cleaned up atomically:

```
Client Delete (soft)
       ↓ (transaction)
├── Floor plan guests
├── Floor plan tables
├── Floor plans
├── Timeline entries
├── Hotel records
├── Transport records
├── Guest gifts
├── Guests
├── Client-vendor relationships
├── Budget items
├── Events
├── Documents
├── Gifts
├── Messages
├── Payments
├── Wedding websites
├── Activity logs
└── Client-user relationships
```

### Guest Deletion

When a guest is deleted, related records are cleaned up:

```
Guest Delete
       ↓ (transaction)
├── Floor plan guest assignments
├── Hotel records
├── Transport records
├── Guest gifts
└── Gifts linked to guest
```

### Vendor Deletion

When a vendor is deleted, timeline entries are cleaned:

```
Vendor Delete
       ↓
Delete timeline entries where sourceModule='vendors' AND sourceId=vendorId
```

## Import Sync Flow

When data is imported via Excel:

```
Excel Import
       ↓
Parse worksheet data
       ↓
For each row:
├── Check if ID exists (update) or not (create)
├── Process row data
├── Create/update record
└── Trigger cross-module sync
       ↓
triggerBatchSync(moduleType, [clientId])
       ↓
├── If 'guests': syncGuestsToHotelsAndTransport()
├── If 'hotels': syncHotelsToTimeline()
└── If 'transport': syncTransportToTimeline()
```

## Transaction Safety

All cascade operations use the `withTransaction()` wrapper:

```typescript
import { withTransaction } from '@/features/chatbot/server/services/transaction-wrapper'

const result = await withTransaction(async (tx) => {
  // All operations here are atomic
  // If any fails, everything rolls back
  await tx.delete(childRecords).where(...)
  await tx.delete(parentRecord).where(...)
  return { success: true }
})
```

**Transaction Features:**
- Automatic rollback on error
- Deadlock detection and retry (3 attempts)
- Isolation level: `read committed` (default)

## Error Handling

### Sync Errors

Sync operations are non-blocking. If a sync fails:
1. Error is logged to console
2. Main operation completes successfully
3. User is not blocked
4. Manual retry available via `triggerFullSync(clientId)`

### Import Errors

Import operations report per-row errors:
```typescript
{
  updated: 45,
  created: 5,
  errors: [
    "Row 12: Name is required",
    "Row 23: Invalid date format"
  ]
}
```

## Performance Considerations

### Indexes

Critical indexes for sync operations:
- `timeline(source_module, source_id)` - for upsert lookups
- `hotels(guest_id)` - for guest→hotel lookups
- `guest_transport(guest_id)` - for guest→transport lookups
- `budget(vendor_id)` - for vendor→budget sync

### Batch Operations

For bulk imports:
- Sync is triggered once per client, not per row
- Timeline entries are upserted (no duplicates)
- Transaction wraps entire import operation

## Chatbot Integration

The chatbot uses the same sync patterns. When a chatbot tool modifies data:

1. Tool executes via `tool-executor.ts`
2. Router mutation is called (same as UI)
3. Sync triggers automatically
4. Chatbot confirms with cascade summary:
   ```
   "Guest John Smith created.
    - Hotel record auto-created
    - Timeline entry added for check-in"
   ```

## Testing Sync

### Unit Tests

Test sync trigger functions:
```typescript
import { triggerBatchSync, triggerFullSync } from '@/lib/backup/auto-sync-trigger'

// Test guest → hotel/transport sync
const result = await triggerBatchSync('guests', [clientId])
expect(result.created.hotels).toBeGreaterThan(0)
```

### Integration Tests

Test full import → sync flow:
```typescript
// 1. Import guests with hotelRequired=true
// 2. Verify hotel records created
// 3. Verify timeline entries created
// 4. Delete guest
// 5. Verify cascade cleanup
```

## Monitoring

Log messages for sync operations:
- `[AutoSync] Starting batch sync for {module}`
- `[AutoSync] Created hotel record for guest: {name}`
- `[AutoSync] Created timeline entry for hotel: {name}`
- `[Timeline] Updated transport entry: {name}`
- `[Guest Delete] Guest {id} deleted with cascade: {...}`
- `[Client Delete] Client {id} deleted with cascade: {...}`

## Future Improvements

1. **Real-time sync notifications** - WebSocket/SSE for live updates
2. **Undo capability** - Store action history for rollback
3. **Conflict resolution** - Handle concurrent edits gracefully
4. **Sync health dashboard** - Monitor sync failures and retries
