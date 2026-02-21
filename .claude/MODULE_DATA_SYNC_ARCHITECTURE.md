# WeddingFlo Module Data Sync Architecture
## February 2026 - Planning Module Interconnections

**Type:** Documentation (No implementation needed)

---

## Module Sync Map

```
                         ┌─────────────────────────────────────────────┐
                         │           TIMELINE (Master Schedule)        │
                         │  sourceModule: events|vendors|transport|    │
                         │  hotels|budget                              │
                         └──────────────────────┬──────────────────────┘
                                                │
      ┌────────────────┬────────────────────────┼────────────────────┬────────────────┐
      ▼                ▼                        ▼                    ▼                ▼
  ┌───────┐      ┌─────────┐              ┌─────────┐          ┌─────────┐      ┌────────┐
  │EVENTS │◄────►│TIMELINE │              │ VENDORS │◄────────►│ BUDGET  │      │ GUESTS │
  │       │      │  ITEMS  │              │         │          │  ITEMS  │      │        │
  └───┬───┘      └─────────┘              └────┬────┘          └────┬────┘      └───┬────┘
      │                                        │                    │               │
      │ templates                              │ vendorId FK        │               │ guestId FK
      ▼                                        ▼                    ▼               ▼
┌──────────────┐                         ┌──────────┐         ┌───────────┐   ┌───────────┐
│   TIMELINE   │                         │ CLIENT   │         │ ADVANCE   │   │  HOTELS   │
│   TEMPLATES  │                         │ VENDORS  │         │ PAYMENTS  │   │           │
└──────────────┘                         └──────────┘         └───────────┘   └─────┬─────┘
                                                                                    │
                                                                              ┌─────┴─────┐
                                                                              │ACCOMM.    │
                                                                              └───────────┘
```

---

## 1. VENDOR ↔ BUDGET (Bidirectional)

| Action | Direction | Auto-Sync Result |
|--------|-----------|------------------|
| Create Vendor | → Budget | Auto-creates budget item with `vendorId` FK |
| Update Vendor cost | → Budget | Syncs `estimatedCost` |
| Update Vendor event | → Budget | Updates budget `category` to event name |
| Add Advance Payment | Budget → | Syncs `depositAmount` + `depositPaid` to vendor |
| Delete Vendor | → Budget | Cascade deletes linked budget item |

**Link:** `budget.vendorId → vendors.id`

**Files:** `vendors.router.ts:352-387`, `budget.router.ts:568-584`

---

## 2. EVENT ↔ TIMELINE (One-to-Many)

| Action | Direction | Auto-Sync Result |
|--------|-----------|------------------|
| Create Event | → Timeline | Auto-generates items from templates (phase: setup/showtime/wrapup) |
| Update Event date | → Timeline | Recalculates all item timestamps |
| Update Event title | → Timeline | Syncs title to linked items |
| Delete Event | → Timeline | Cascade deletes all timeline items |

**Link:** `timeline.eventId → events.id` + `sourceModule='events'`

**Files:** `events.router.ts:151-235`

---

## 3. GUEST → HOTEL/TRANSPORT (Cascade)

| Action | Direction | Auto-Sync Result |
|--------|-----------|------------------|
| Create Guest (hotelRequired) | → Hotels | Auto-creates hotel entry |
| Create Guest (transportRequired) | → Transport | Auto-creates transport entry |
| Update Guest flags | → Both | Creates/deletes based on flags |
| Delete Guest | → Both | Cascade deletes hotel + transport |

**Link:** `hotels.guestId → guests.id`, `guestTransport.guestId → guests.id`

**Files:** `guests.router.ts:219-271, 686-694`

---

## 4. HOTEL → ACCOMMODATION (Auto-Link)

| Action | Direction | Auto-Sync Result |
|--------|-----------|------------------|
| Create Hotel with name | → Accomm. | Auto-creates/links accommodation record |

**Link:** `hotels.accommodationId → accommodations.id`

---

## 5. TRANSPORT → VEHICLES (Fleet)

| Action | Direction | Auto-Sync Result |
|--------|-----------|------------------|
| Create Transport with vehicle | → Vehicles | Auto-creates/assigns vehicle |
| Update Transport | → Vehicles | Updates status + `availableAt` |

**Calculation:** `availableAt = pickupDate + time + 2hr buffer`

---

## 6. VENDOR → TIMELINE (Service Dates)

| Action | Direction | Auto-Sync Result |
|--------|-----------|------------------|
| Set serviceDate | → Timeline | Creates timeline entry |
| Change serviceDate | → Timeline | Updates timeline entry |
| Clear serviceDate | → Timeline | Deletes timeline entry |

**Link:** `sourceModule='vendors'`, `sourceId=vendor.id`

---

## Master Timeline Unification

| Source Module | Entry Type |
|---------------|------------|
| `events` | Ceremony, reception, etc. |
| `vendors` | Vendor service dates |
| `transport` | Guest pickup/dropoff |
| `hotels` | Check-in/check-out |

---

## What's NOT Auto-Synced (Manual)

| Scenario | Manual Action |
|----------|---------------|
| Guest → Event | Update `guests.attendingEvents[]` array |
| Budget without vendor | No sync (standalone item) |
| Direct timeline edit | No back-sync to source |

---

## Cascade Delete Behavior

| Delete | Cascades To |
|--------|-------------|
| Event | Timeline items |
| Vendor | Budget item, Timeline entry |
| Guest | Hotels, Transport |
| Client | All child records |

---

## Key Files Reference

| Module | Router |
|--------|--------|
| Vendors | `src/features/events/server/routers/vendors.router.ts` |
| Budget | `src/features/analytics/server/routers/budget.router.ts` |
| Events | `src/features/events/server/routers/events.router.ts` |
| Timeline | `src/features/events/server/routers/timeline.router.ts` |
| Guests | `src/features/guests/server/routers/guests.router.ts` |
| Hotels | `src/features/events/server/routers/hotels.router.ts` |
| Transport | `src/features/events/server/routers/guest-transport.router.ts` |

---

# Industry Analysis & Improvement Recommendations

## Top 20 Wedding Planner Software Competitors

| Platform | Strengths | Missing in WeddingFlo? |
|----------|-----------|------------------------|
| **Aisle Planner** | Client portal, mood boards, design studio | ✅ Have portal |
| **HoneyBook** | CRM, invoicing, contracts, payments | ⚠️ Contracts/Proposals (partial) |
| **Planning Pod** | Floor plans, email hub, task automation | ✅ Have all |
| **Dubsado** | Forms, workflows, client portal | ✅ Have workflows |
| **That's The One** | RSVP, e-cards, vendor collaboration | ✅ Have RSVP |
| **Zola** | Registry, guest website, RSVPs | ✅ Have websites |
| **The Knot** | Guest list, checklists, vendor marketplace | ⚠️ No marketplace |
| **WeddingWire** | Vendor reviews, budgeting | ⚠️ No vendor reviews |
| **Joy** | Free websites, guest messaging | ✅ Have messaging |
| **Carats & Cake** | Inspiration, vendor discovery | ⚠️ No discovery |

---

## Industry Pain Points (2026 Research)

### 1. BUDGETING (45% of couples' #1 challenge)
**Problem:** Overspending, no visibility into remaining budget
**Industry Solution:** Auto-calculating budgets, real-time spend tracking
**WeddingFlo Status:** ✅ SOLVED
- Auto-sync vendor costs → budget items
- Advance payments tracked with balance remaining
- Budget variance charts

### 2. TOOL FRAGMENTATION (7-10 tools average)
**Problem:** Planners use separate tools for CRM, finance, guests, vendors
**Industry Solution:** All-in-one platforms
**WeddingFlo Status:** ✅ SOLVED
- Single platform: Clients, Guests, Vendors, Budget, Timeline, Hotels, Transport
- Unified dashboard with cross-module sync

### 3. VISUALIZATION GAP
**Problem:** Spreadsheets for budgets but nothing shows what investment looks like
**Industry Solution:** Mood boards, design studios, floor plan visualizations
**WeddingFlo Status:** ⚠️ PARTIAL
- Have floor plans for seating
- Missing: Mood boards, style guides, design studio

### 4. REAL-TIME SYNC
**Problem:** Changes in one place don't update everywhere
**Industry Solution:** "When you update one detail, everything else updates automatically"
**WeddingFlo Status:** ✅ EXCELLENT
- Vendor → Budget bidirectional sync
- Event → Timeline auto-generation
- Guest → Hotel/Transport cascade
- Timeline unified from all sources

### 5. OVERWHELM (59% of couples)
**Problem:** Too many features, steep learning curve
**Industry Solution:** AI-assisted planning, smart defaults
**WeddingFlo Status:** ✅ GOOD
- Template-based timeline auto-generation
- AI budget prediction
- Smart defaults for event types

### 6. VENDOR COORDINATION
**Problem:** Scattered contracts, no central communication
**Industry Solution:** Vendor hubs with contracts, messaging, approvals
**WeddingFlo Status:** ✅ EXCELLENT
- clientVendors with contract amounts, deposits
- Approval workflow (status, comments, approvedBy)
- Onsite POC tracking
- Auto-sync to timeline for service dates

### 7. GUEST MANAGEMENT COMPLEXITY
**Problem:** RSVPs, dietary needs, seating, hotel logistics scattered
**Industry Solution:** Unified guest profiles with all logistics
**WeddingFlo Status:** ✅ EXCELLENT
- RSVP tracking with meal choices
- Dietary matrix view
- Auto-create hotel/transport when flagged
- attendingEvents array for multi-event weddings

---

## What WeddingFlo Does BETTER Than Competitors

| Feature | WeddingFlo | Competitors |
|---------|------------|-------------|
| **Multi-Event Weddings** | Native support (Indian weddings: Mehendi, Sangeet, Wedding) | Limited or none |
| **Hotel/Transport Sync** | Auto-creates from guest flags | Manual entry |
| **Timeline Phases** | setup/showtime/wrapup segmentation | Flat timeline |
| **Vendor ↔ Budget Sync** | Bidirectional with payments | One-way or manual |
| **Multi-Source Timeline** | Events + Vendors + Transport + Hotels unified | Events only |
| **White-Label** | Company branding, subdomains | Not available |
| **Client Portal** | Full guest-facing portal with RSVP, chat | Limited or paid add-on |

---

## Improvement Recommendations

### Priority 1: HIGH VALUE, LOW EFFORT

| Feature | Industry Need | Implementation |
|---------|---------------|----------------|
| **RSVP → Budget Sync** | Guest count changes should update catering budget | Add listener: when RSVP confirmed count changes, update budget items with `segment='catering'` |
| **Vendor Rating System** | 92% of couples check reviews | Add `vendors.rating`, `vendors.reviewCount` fields |
| **Payment Due Reminders** | Automated payment tracking | Add `budget.dueDate`, trigger email/push when approaching |

### Priority 2: MEDIUM VALUE, MEDIUM EFFORT

| Feature | Industry Need | Implementation |
|---------|---------------|----------------|
| **Mood Board Module** | Address visualization gap | New table `moodBoards` with image gallery, link to events/vendors |
| **Contract Storage** | Centralized document management | Enhance `documents` module with `type='contract'`, link to vendors |
| **Vendor Calendar Sync** | Vendor availability checking | iCal export for vendors, block dates in timeline |

### Priority 3: HIGH VALUE, HIGH EFFORT

| Feature | Industry Need | Implementation |
|---------|---------------|----------------|
| **Vendor Marketplace** | Discovery and booking | New module with vendor profiles, reviews, availability |
| **AI Seating Optimizer** | Smart seating based on relationships | Already have `ai-seating`, enable by default |
| **Multi-Currency Support** | Destination weddings | Add `clients.currency`, convert in budget views |

---

## Missing Sync Opportunities (Quick Wins)

### 1. Guest Count → Budget Sync
```
WHEN guest RSVP confirmed count changes
THEN update budget items WHERE category IN ('catering', 'favors', 'rentals')
SET estimatedCost = perGuestCost * confirmedCount
```

### 2. Event Delete → Guest Cleanup
```
WHEN event is deleted
THEN remove event.id from guests.attendingEvents[] array
```

### 3. Accommodation → Guest Sync
```
WHEN accommodation reaches capacity
THEN flag all unassigned guests with hotelRequired=true
SHOW alert: "Hotel X is full - 15 guests need reassignment"
```

### 4. Vendor Service Date → Event Link
```
WHEN vendor.serviceDate is set
IF matches an event date
THEN auto-set vendor.eventId
```

---

## Current Score: 8.5/10

| Category | Score | Notes |
|----------|-------|-------|
| Core Sync Architecture | 10/10 | Bidirectional, comprehensive |
| Multi-Event Support | 10/10 | Best in class |
| Guest Logistics | 9/10 | Auto-create hotel/transport |
| Vendor Management | 9/10 | Full approval workflow |
| Budget Tracking | 8/10 | Missing RSVP count sync |
| Visualization | 6/10 | Missing mood boards |
| AI Features | 8/10 | Budget prediction, email gen |
| Marketplace | 0/10 | Not implemented |

**Target: 10/10** with Priority 1 quick wins

---

## Sources

- [Top Consumer Reviews - Best Wedding Planning Software 2026](https://www.topconsumerreviews.com/best-wedding-planning-software)
- [Planning Pod - Wedding Planning Firms](https://planningpod.com/solutions/industries/wedding-planning-firms)
- [That's The One - Best Wedding Software](https://www.thatstheone.com/planners/blog/best-wedding-software)
- [HoneyBook vs Aisle Planner Comparison](https://www.thatstheone.com/planners/blog/honeybook-vs-aisleplanner)
- [Catersource - Tech Shift in Wedding Planning 2026](https://www.catersource.com/tools-technology/the-tech-shift-in-wedding-planning-tools-you-ll-need-to-stay-competitive-in-2026)
- [Jotform - Top 10 Online Wedding RSVP Tools 2026](https://www.jotform.com/blog/online-wedding-rsvp/)
