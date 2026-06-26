import { router, staffProcedure } from '@/server/trpc/trpc'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import ExcelJS from 'exceljs'
import { eq, and, isNull } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import {
  syncGuestsToHotelsAndTransportTx,
  syncHotelsToTimelineTx,
  syncTransportToTimelineTx,
  type EntityType,
  type SyncResult,
} from '@/lib/backup/auto-sync-trigger'
import { withTransaction } from '@/features/chatbot/server/services/transaction-wrapper'
import { normalizeRsvpStatus, normalizeGuestSide } from '@/lib/constants/enums'
import { broadcastSync } from '@/lib/realtime/broadcast-sync'
import {
  GUEST_MUTATION_PATHS,
  VENDOR_MUTATION_PATHS,
  BUDGET_MUTATION_PATHS,
  HOTEL_MUTATION_PATHS,
  TRANSPORT_MUTATION_PATHS,
  EVENT_MUTATION_PATHS,
} from '@/lib/sync/cascade-query-paths'
import {
  importBudgetExcel,
  importHotelsExcel,
  importTransportExcel,
  importVendorsExcel,
  importEventsExcel,
} from '@/lib/import/excel-parser-server'
import { syncEventsToTimelineTx } from '@/lib/sync/event-timeline-sync'
import { validateExcelFile } from '@/lib/import/excel-parser'
import {
  selectModuleWorksheet,
  runImportRecalcCascade,
  INLINE_IMPORT_VALIDATION,
} from '@/lib/import/import-cascade'

// All exportable/importable module types
const moduleTypes = z.enum(['guests', 'vendors', 'budget', 'gifts', 'hotels', 'transport', 'guestGifts', 'events'])

export const importRouter = router({
  // Download template with existing data
  downloadTemplate: staffProcedure
    .input(z.object({
      module: moduleTypes,
      clientId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify client access
      const client = await ctx.db.query.clients.findFirst({
        where: and(
          eq(schema.clients.id, input.clientId),
          eq(schema.clients.companyId, ctx.companyId)
        ),
      })

      if (!client) throw new TRPCError({ code: 'FORBIDDEN' })

      // Fetch existing data based on module
      let existingData: any[] = []

      switch (input.module) {
        case 'guests':
          // Guests table doesn't have deletedAt column
          existingData = await ctx.db.query.guests.findMany({
            where: eq(schema.guests.clientId, input.clientId),
          })
          break
        case 'vendors':
          // Vendors with client-vendor relationship data
          const vendorsList = await ctx.db.query.vendors.findMany({
            where: eq(schema.vendors.companyId, ctx.companyId),
          })
          // Get client_vendors for this client
          const clientVendorsList = await ctx.db.query.clientVendors.findMany({
            where: eq(schema.clientVendors.clientId, input.clientId),
          })
          // Get events for this client (for event name lookup)
          const clientEvents = await ctx.db.query.events.findMany({
            where: eq(schema.events.clientId, input.clientId),
          })
          const eventMap = new Map(clientEvents.map(e => [e.id, e.title]))

          // Get budget items linked to vendors (for total paid from advances)
          const vendorBudgetItems = await ctx.db.query.budget.findMany({
            where: eq(schema.budget.clientId, input.clientId),
          })
          const budgetByVendor = new Map(vendorBudgetItems.filter(b => b.vendorId).map(b => [b.vendorId, b]))

          // Get advance payments for all budget items
          const budgetIds = vendorBudgetItems.map(b => b.id)
          let advancesByBudget = new Map<string, number>()
          if (budgetIds.length > 0) {
            const allAdvances = await ctx.db.query.advancePayments.findMany({})
            // Group advances by budget item and sum amounts
            for (const adv of allAdvances) {
              // Skip if budgetItemId is null
              if (adv.budgetItemId && budgetIds.includes(adv.budgetItemId)) {
                const current = advancesByBudget.get(adv.budgetItemId) || 0
                advancesByBudget.set(adv.budgetItemId, current + parseFloat(adv.amount || '0'))
              }
            }
          }

          // Merge vendor data with client_vendor relationship data
          const clientVendorMap = new Map(clientVendorsList.map(cv => [cv.vendorId, cv]))
          existingData = vendorsList.map(v => {
            const cv = clientVendorMap.get(v.id)
            const budgetItem = budgetByVendor.get(v.id)
            const totalAdvances = budgetItem ? (advancesByBudget.get(budgetItem.id) || 0) : 0
            const totalPaid = totalAdvances + parseFloat(budgetItem?.paidAmount || '0')
            const contractAmt = parseFloat(cv?.contractAmount || '0')
            const balance = contractAmt - totalPaid

            return {
              ...v,
              clientVendorId: cv?.id || null,
              eventId: cv?.eventId || null,
              eventName: cv?.eventId ? eventMap.get(cv.eventId) : null,
              contractAmount: cv?.contractAmount || null,
              totalPaid: totalPaid > 0 ? String(totalPaid) : null,
              balanceRemaining: balance > 0 ? String(balance) : '0',
              depositAmount: cv?.depositAmount || null,
              depositPaid: cv?.depositPaid || false,
              paymentStatus: cv?.paymentStatus || 'pending',
              serviceDate: cv?.serviceDate || null,
              approvalStatus: cv?.approvalStatus || 'pending',
              approvalNotes: cv?.approvalComments || null,
              serviceLocation: cv?.venueAddress || null,
              onSiteContact: cv?.onsitePocName || null,
              onSitePhone: cv?.onsitePocPhone || null,
              servicesProvided: cv?.deliverables || null,
            }
          })
          break
        case 'budget':
          existingData = await ctx.db.query.budget.findMany({
            where: eq(schema.budget.clientId, input.clientId),
          })
          break
        case 'gifts':
          existingData = await ctx.db.query.gifts.findMany({
            where: eq(schema.gifts.clientId, input.clientId),
          })
          break
        case 'hotels':
          // Hotels with guest information
          existingData = await ctx.db.query.hotels.findMany({
            where: eq(schema.hotels.clientId, input.clientId),
            with: {
              guest: {
                columns: {
                  email: true,
                  phone: true,
                  groupName: true,
                  additionalGuestNames: true,
                  partySize: true,
                  arrivalDatetime: true,
                  departureDatetime: true,
                  relationshipToFamily: true,
                }
              }
            }
          })
          // Flatten the structure for template
          existingData = existingData.map((h: any) => {
            // Auto-populate check-in/check-out from guest arrival/departure if not already set
            const checkInDate = h.checkInDate || (h.guests?.arrivalDatetime
              ? new Date(h.guests.arrivalDatetime).toISOString().split('T')[0]
              : null)
            const checkOutDate = h.checkOutDate || (h.guests?.departureDatetime
              ? new Date(h.guests.departureDatetime).toISOString().split('T')[0]
              : null)

            return {
              id: h.id,
              guestId: h.guestId,
              guestName: h.guestName,
              partySize: h.partySize,
              hotelName: h.hotelName,
              roomType: h.roomType,
              roomNumber: h.roomNumber,
              checkInDate,
              checkOutDate,
              accommodationNeeded: h.accommodationNeeded,
              bookingConfirmed: h.bookingConfirmed,
              checkedIn: h.checkedIn,
              cost: h.cost,
              paymentStatus: h.paymentStatus,
              notes: h.notes,
              guestEmail: h.guests?.email || null,
              guestPhone: h.guests?.phone || null,
              guestGroup: h.guests?.groupName || null,
              guestRelationship: h.guests?.relationshipToFamily || null,
              additionalGuestNames: h.guests?.additionalGuestNames || null,
              totalPartySize: h.guests?.partySize || null,
            }
          })
          break
        case 'transport':
          // Transport with guest information
          existingData = await ctx.db
            .select({
              id: schema.guestTransport.id,
              guestId: schema.guestTransport.guestId,
              guestName: schema.guestTransport.guestName,
              pickupDate: schema.guestTransport.pickupDate,
              pickupTime: schema.guestTransport.pickupTime,
              pickupFrom: schema.guestTransport.pickupFrom,
              dropTo: schema.guestTransport.dropTo,
              transportStatus: schema.guestTransport.transportStatus,
              vehicleInfo: schema.guestTransport.vehicleInfo,
              notes: schema.guestTransport.notes,
              // Guest details
              guestEmail: schema.guests.email,
              guestPhone: schema.guests.phone,
              guestGroup: schema.guests.groupName,
            })
            .from(schema.guestTransport)
            .leftJoin(schema.guests, eq(schema.guestTransport.guestId, schema.guests.id))
            .where(eq(schema.guestTransport.clientId, input.clientId))
          break
        case 'guestGifts':
          // Guest gifts with guest details
          // Schema has: id, clientId, guestId, name, type, quantity, createdAt, updatedAt
          existingData = await ctx.db
            .select({
              id: schema.guestGifts.id,
              guestId: schema.guestGifts.guestId,
              giftName: schema.guestGifts.name,
              giftType: schema.guestGifts.type,
              quantity: schema.guestGifts.quantity,
              // Guest details
              guestFirstName: schema.guests.firstName,
              guestLastName: schema.guests.lastName,
              guestEmail: schema.guests.email,
              guestPhone: schema.guests.phone,
              guestGroup: schema.guests.groupName,
            })
            .from(schema.guestGifts)
            .leftJoin(schema.guests, eq(schema.guestGifts.guestId, schema.guests.id))
            .where(eq(schema.guestGifts.clientId, input.clientId))
          break
        case 'events':
          // Events for this client (exclude soft-deleted)
          existingData = await ctx.db.query.events.findMany({
            where: and(
              eq(schema.events.clientId, input.clientId),
              isNull(schema.events.deletedAt),
            ),
          })
          break
      }

      // Create Excel template using ExcelJS
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'WeddingFlo'
      workbook.created = new Date()

      let templateData: any[] = []
      let sheetName = ''
      let columns: { header: string; key: string; width: number }[] = []

      switch (input.module) {
        case 'guests':
          sheetName = 'Guests'
          columns = [
            { header: 'ID (Do not modify)', key: 'id', width: 40 },
            { header: 'Name *', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Group', key: 'group', width: 15 },
            { header: 'RSVP Status', key: 'rsvp_status', width: 12 },
            { header: 'Party Size', key: 'party_size', width: 10 },
            { header: 'Additional Guest Names', key: 'additional_guests', width: 30 },
            { header: 'Relationship to Family', key: 'relationship', width: 20 },
            { header: 'Attending Events', key: 'attending_events', width: 30 },
            { header: 'Arrival Date/Time', key: 'arrival_datetime', width: 20 },
            { header: 'Arrival Mode', key: 'arrival_mode', width: 15 },
            { header: 'Departure Date/Time', key: 'departure_datetime', width: 20 },
            { header: 'Departure Mode', key: 'departure_mode', width: 15 },
            { header: 'Meal Preference', key: 'meal_preference', width: 15 },
            { header: 'Dietary Restrictions', key: 'dietary', width: 25 },
            { header: 'Hotel Required (TRUE/FALSE)', key: 'hotel', width: 15 },
            { header: 'Transport Required (TRUE/FALSE)', key: 'transport', width: 18 },
            { header: 'Gift Required (TRUE/FALSE)', key: 'gift_required', width: 15 },
            { header: 'Gift to Give', key: 'gift', width: 20 },
            { header: 'Notes', key: 'notes', width: 30 },
          ]
          templateData = existingData.map((g) => {
            const additionalNames = g.additionalGuestNames || []
            const attendingEvents = g.attendingEvents || []
            // Combine firstName and lastName into single Name field
            const fullName = [g.firstName, g.lastName].filter(Boolean).join(' ')
            return {
              id: g.id,
              name: fullName || '',
              email: g.email || '',
              phone: g.phone || '',
              group: g.groupName || '',
              rsvp_status: g.rsvpStatus || 'pending',
              party_size: g.partySize || 1,
              additional_guests: Array.isArray(additionalNames) ? additionalNames.join(', ') : '',
              relationship: g.relationshipToFamily || '',
              attending_events: Array.isArray(attendingEvents) ? attendingEvents.join(', ') : '',
              arrival_datetime: g.arrivalDatetime || '',
              arrival_mode: g.arrivalMode || '',
              departure_datetime: g.departureDatetime || '',
              departure_mode: g.departureMode || '',
              meal_preference: g.mealPreference || '',
              dietary: g.dietaryRestrictions || '',
              hotel: g.hotelRequired ? 'TRUE' : 'FALSE',
              transport: g.transportRequired ? 'TRUE' : 'FALSE',
              gift_required: g.giftRequired ? 'TRUE' : 'FALSE',
              gift: g.giftToGive || '',
              notes: g.notes || '',
            }
          })
          break

        case 'vendors':
          sheetName = 'Vendors'
          columns = [
            { header: 'ID (Do not modify)', key: 'id', width: 40 },
            { header: 'Vendor Name *', key: 'vendor_name', width: 25 },
            { header: 'Category *', key: 'category', width: 15 },
            { header: 'Contact Name', key: 'contact_name', width: 20 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Event', key: 'event_name', width: 20 },
            { header: 'Contract Amount', key: 'contract_amount', width: 15 },
            { header: 'Total Paid', key: 'total_paid', width: 15 },
            { header: 'Balance Remaining', key: 'balance_remaining', width: 18 },
            { header: 'Deposit Amount', key: 'deposit_amount', width: 15 },
            { header: 'Deposit Paid (Yes/No)', key: 'deposit_paid', width: 18 },
            { header: 'Payment Status', key: 'payment_status', width: 15 },
            { header: 'Service Date', key: 'service_date', width: 15 },
            { header: 'Service Location', key: 'service_location', width: 25 },
            { header: 'On-Site Contact', key: 'onsite_contact', width: 20 },
            { header: 'On-Site Phone', key: 'onsite_phone', width: 15 },
            { header: 'Services Provided', key: 'services_provided', width: 30 },
            { header: 'Approval Status', key: 'approval_status', width: 15 },
            { header: 'Approval Notes', key: 'approval_notes', width: 25 },
            { header: 'Rating', key: 'rating', width: 10 },
            { header: 'Notes', key: 'notes', width: 30 },
          ]
          templateData = existingData.map((v) => ({
            id: v.id,
            vendor_name: v.name,
            category: v.category,
            contact_name: v.contactName || '',
            phone: v.phone || '',
            email: v.email || '',
            event_name: v.eventName || '',
            contract_amount: v.contractAmount || '',
            total_paid: v.totalPaid || '',
            balance_remaining: v.balanceRemaining || '',
            deposit_amount: v.depositAmount || '',
            deposit_paid: v.depositPaid ? 'Yes' : 'No',
            payment_status: v.paymentStatus || 'pending',
            service_date: v.serviceDate || '',
            service_location: v.serviceLocation || '',
            onsite_contact: v.onSiteContact || '',
            onsite_phone: v.onSitePhone || '',
            services_provided: v.servicesProvided || '',
            approval_status: v.approvalStatus || 'pending',
            approval_notes: v.approvalNotes || '',
            rating: v.rating || '',
            notes: v.notes || '',
          }))
          break

        case 'budget':
          sheetName = 'Budget'
          columns = [
            { header: 'ID (Do not modify)', key: 'id', width: 40 },
            { header: 'Item *', key: 'item', width: 25 },
            { header: 'Category *', key: 'category', width: 15 },
            { header: 'Segment', key: 'segment', width: 15 },
            { header: 'Estimated Cost *', key: 'estimated_cost', width: 15 },
            { header: 'Paid Amount', key: 'paid_amount', width: 15 },
            { header: 'Actual Cost', key: 'actual_cost', width: 15 },
            { header: 'Payment Status', key: 'payment_status', width: 15 },
            { header: 'Notes', key: 'notes', width: 30 },
          ]
          templateData = existingData.map((b) => ({
            id: b.id,
            item: b.item,
            category: b.category,
            segment: b.segment || 'other',
            estimated_cost: b.estimatedCost || 0,
            paid_amount: b.paidAmount || 0,
            actual_cost: b.actualCost || '',
            payment_status: b.paymentStatus || 'pending',
            notes: b.notes || '',
          }))
          break

        case 'gifts':
          // [Cluster E] The gift-REGISTRY template targets the real `gifts` table columns
          // (name / value / status / guestId) that importGift writes — was reading dead
          // g.giftName / g.fromName / g.deliveryStatus / g.thankYouSent (non-existent columns
          // → every data field exported blank).
          sheetName = 'Gifts'
          columns = [
            { header: 'ID (Do not modify)', key: 'id', width: 40 },
            { header: 'Gift Name *', key: 'gift_name', width: 25 },
            { header: 'Value', key: 'value', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Guest ID (Do not modify)', key: 'guest_id', width: 40 },
          ]
          templateData = existingData.map((g) => ({
            id: g.id,
            gift_name: g.name || '',
            value: g.value ?? '',
            status: g.status || 'received',
            guest_id: g.guestId || '',
          }))
          break

        case 'hotels':
          sheetName = 'Hotels'
          columns = [
            { header: 'ID (Do not modify)', key: 'id', width: 40 },
            { header: 'Guest ID (Do not modify)', key: 'guest_id', width: 40 },
            { header: 'Guest Name * (Required)', key: 'guest_name', width: 25 },
            { header: 'Relationship (from guest list)', key: 'guest_relationship', width: 28 },
            { header: 'Additional Guest Names (from guest list)', key: 'additional_guest_names', width: 35 },
            { header: 'Guest Names in Room (e.g., john and mary, sue)', key: 'guest_names_in_room', width: 40 },
            { header: '# in Room (auto or manual)', key: 'party_size', width: 22 },
            { header: 'Email Address', key: 'guest_email', width: 28 },
            { header: 'Phone Number', key: 'guest_phone', width: 18 },
            { header: 'Need Hotel? (Yes/No)', key: 'accommodation_needed', width: 18 },
            { header: 'Hotel Name', key: 'hotel_name', width: 25 },
            { header: 'Room Number', key: 'room_number', width: 15 },
            { header: 'Room Type (Suite/Deluxe...)', key: 'room_type', width: 23 },
            { header: 'Check-In (YYYY-MM-DD)', key: 'check_in_date', width: 20 },
            { header: 'Check-Out (YYYY-MM-DD)', key: 'check_out_date', width: 20 },
            { header: 'Booking Confirmed (Yes/No)', key: 'booking_confirmed', width: 23 },
            { header: 'Checked In (Yes/No)', key: 'checked_in', width: 18 },
            { header: 'Room Cost (numbers only)', key: 'cost', width: 22 },
            { header: 'Payment (pending/paid/overdue)', key: 'payment_status', width: 28 },
            { header: 'Special Notes', key: 'notes', width: 40 },
          ]
          templateData = existingData.map((h) => {
            // Format additional guest names - join array with commas
            const additionalNames = h.additionalGuestNames
              ? (Array.isArray(h.additionalGuestNames) ? h.additionalGuestNames.join(', ') : h.additionalGuestNames)
              : ''

            return {
              id: h.id,
              guest_id: h.guestId || '',
              guest_name: h.guestName || '',
              guest_relationship: h.guestRelationship || '',
              additional_guest_names: additionalNames,
              guest_names_in_room: '', // User fills this to assign rooms
              party_size: h.partySize || 1,
              guest_email: h.guestEmail || '',
              guest_phone: h.guestPhone || '',
              accommodation_needed: h.accommodationNeeded ? 'Yes' : 'No',
              hotel_name: h.hotelName || '',
              room_number: h.roomNumber || '',
              room_type: h.roomType || '',
              check_in_date: h.checkInDate || '',
              check_out_date: h.checkOutDate || '',
              booking_confirmed: h.bookingConfirmed ? 'Yes' : 'No',
              checked_in: h.checkedIn ? 'Yes' : 'No',
              cost: h.cost || '',
              payment_status: h.paymentStatus || 'pending',
              notes: h.notes || '',
            }
          })
          break

        case 'transport':
          sheetName = 'Transport'
          columns = [
            { header: 'ID (Do not modify)', key: 'id', width: 40 },
            { header: 'Guest ID (Do not modify)', key: 'guest_id', width: 40 },
            { header: 'Guest Name *', key: 'guest_name', width: 25 },
            { header: 'Guest Email', key: 'guest_email', width: 25 },
            { header: 'Guest Phone', key: 'guest_phone', width: 15 },
            { header: 'Guest Group', key: 'guest_group', width: 15 },
            { header: 'Pickup Date', key: 'pickup_date', width: 15 },
            { header: 'Pickup Time', key: 'pickup_time', width: 12 },
            { header: 'Pickup From', key: 'pickup_from', width: 25 },
            { header: 'Drop To', key: 'drop_to', width: 25 },
            { header: 'Vehicle Info', key: 'vehicle_info', width: 20 },
            { header: 'Transport Status', key: 'transport_status', width: 15 },
            { header: 'Notes', key: 'notes', width: 30 },
          ]
          templateData = existingData.map((t) => ({
            id: t.id,
            guest_id: t.guestId || '',
            guest_name: t.guestName || '',
            guest_email: t.guestEmail || '',
            guest_phone: t.guestPhone || '',
            guest_group: t.guestGroup || '',
            pickup_date: t.pickupDate || '',
            pickup_time: t.pickupTime || '',
            pickup_from: t.pickupFrom || '',
            drop_to: t.dropTo || '',
            vehicle_info: t.vehicleInfo || '',
            transport_status: t.transportStatus || 'scheduled',
            notes: t.notes || '',
          }))
          break

        case 'guestGifts':
          sheetName = 'GiftsGiven'
          columns = [
            { header: 'ID (Do not modify)', key: 'id', width: 40 },
            { header: 'Guest ID (Do not modify)', key: 'guest_id', width: 40 },
            { header: 'Guest Name *', key: 'guest_name', width: 25 },
            { header: 'Guest Email', key: 'guest_email', width: 25 },
            { header: 'Guest Phone', key: 'guest_phone', width: 15 },
            { header: 'Guest Group', key: 'guest_group', width: 15 },
            { header: 'Gift Name *', key: 'gift_name', width: 25 },
            { header: 'Gift Type', key: 'gift_type', width: 20 },
            { header: 'Gift Category', key: 'gift_category', width: 15 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Delivery Date', key: 'delivery_date', width: 15 },
            { header: 'Delivery Time', key: 'delivery_time', width: 12 },
            { header: 'Delivery Status', key: 'delivery_status', width: 15 },
            { header: 'Delivered By', key: 'delivered_by', width: 20 },
            { header: 'Notes', key: 'notes', width: 30 },
          ]
          templateData = existingData.map((gg) => ({
            id: gg.id,
            guest_id: gg.guestId || '',
            guest_name: [gg.guestFirstName, gg.guestLastName].filter(Boolean).join(' ') || '',
            guest_email: gg.guestEmail || '',
            guest_phone: gg.guestPhone || '',
            guest_group: gg.guestGroup || '',
            gift_name: gg.giftName || '',
            gift_type: gg.giftTypeName || '',
            gift_category: gg.giftTypeCategory || '',
            quantity: gg.quantity || 1,
            delivery_date: gg.deliveryDate || '',
            delivery_time: gg.deliveryTime || '',
            delivery_status: gg.deliveryStatus || 'pending',
            delivered_by: gg.deliveredBy || '',
            notes: gg.notes || '',
          }))
          break

        case 'events':
          sheetName = 'Events'
          columns = [
            { header: 'ID (Do not modify)', key: 'id', width: 40 },
            { header: 'Title *', key: 'title', width: 28 },
            { header: 'Event Type', key: 'event_type', width: 18 },
            { header: 'Event Date (YYYY-MM-DD)', key: 'event_date', width: 22 },
            { header: 'Start Time (HH:MM)', key: 'start_time', width: 18 },
            { header: 'End Time (HH:MM)', key: 'end_time', width: 18 },
            { header: 'Location', key: 'location', width: 25 },
            { header: 'Venue Name', key: 'venue_name', width: 25 },
            { header: 'Address', key: 'address', width: 30 },
            { header: 'Guest Count (numbers only)', key: 'guest_count', width: 22 },
            { header: 'Status (draft/planned/confirmed/completed/cancelled)', key: 'status', width: 30 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Notes', key: 'notes', width: 30 },
            { header: 'Action (DELETE to remove)', key: 'action', width: 24 },
          ]
          templateData = existingData.map((e) => ({
            id: e.id,
            title: e.title,
            event_type: e.eventType || '',
            event_date: e.eventDate || '',
            start_time: e.startTime || '',
            end_time: e.endTime || '',
            location: e.location || '',
            venue_name: e.venueName || '',
            address: e.address || '',
            guest_count: e.guestCount ?? '',
            status: e.status || 'planned',
            description: e.description || '',
            notes: e.notes || '',
            action: '',
          }))
          break
      }

      // Add Instructions Sheet FIRST for Hotels (so it appears as the first tab)
      if (input.module === 'hotels') {
        const instructionsSheet = workbook.addWorksheet('INSTRUCTIONS - READ FIRST')
        instructionsSheet.columns = [
          { header: 'Topic', key: 'topic', width: 30 },
          { header: 'Instructions', key: 'instructions', width: 80 },
        ]

        // Style instructions header
        instructionsSheet.getRow(1).font = { bold: true, size: 12 }
        instructionsSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        }
        instructionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

        const instructions = [
          { topic: 'ROOM ASSIGNMENT - 3 WAYS', instructions: 'You have 3 methods: (1) Separate rows for each room, (2) Comma-separated room numbers, (3) SMART: Assign specific guests to specific rooms using "Guest Names in Room" column.' },
          { topic: 'SMART ASSIGNMENT (NEW!)', instructions: 'Use "Guest Names in Room" column to assign different people to different rooms. Example: Guest "first" has party of 3 (additional guests: ape, monk). Enter "first and ape, monk" in Guest Names column and "22, 23" in Room Numbers -> Creates: Room 22 with "first and ape" (2 people), Room 23 with "monk" (1 person).' },
          { topic: 'Additional Guest Names', instructions: 'This column auto-fills from guest list showing all additional guests. Use these names in "Guest Names in Room" for smart assignment.' },
          { topic: 'Auto Party Size Calculation', instructions: 'When using "Guest Names in Room", party size is AUTO-CALCULATED by counting names. "john and mary" = 2 people. "sue" = 1 person. Manual entry in "# in Room" is ignored in smart mode.' },
          { topic: 'Required Fields', instructions: 'Guest Name is REQUIRED. All other fields are optional.' },
          { topic: 'Dates Format', instructions: 'Use YYYY-MM-DD format for dates (e.g., 2025-12-25)' },
          { topic: 'Yes/No Fields', instructions: 'Enter "Yes" or "No" for: Need Hotel?, Booking Confirmed, Checked In' },
          { topic: 'Payment Status', instructions: 'Use one of: pending, paid, or overdue' },
          { topic: 'Room Cost', instructions: 'Enter numbers only (no currency symbols). Example: 12000. Cost applies to EACH room created.' },
          { topic: 'Adding New Rows', instructions: 'Leave ID and Guest ID columns BLANK for new entries. System will auto-generate them.' },
          { topic: 'Editing Existing Rows', instructions: 'DO NOT modify the ID column. Change any other field and re-import to update. Smart assignment only works for NEW entries, not updates.' },
          { topic: 'Deleting Rows', instructions: 'To delete: Simply remove the entire row from Excel before importing.' },
          { topic: 'Email & Phone', instructions: 'These are auto-filled from guest records. You can leave them blank when adding new rooms.' },
          { topic: 'METHOD 1 (Separate Rows)', instructions: 'Guest "Sarah" brings 4 people, needs 2 rooms:\nRow 1: Guest Name: Sarah | Room: 101 | # in Room: 2\nRow 2: Guest Name: Sarah | Room: 102 | # in Room: 2\nResult: 2 separate room records' },
          { topic: 'METHOD 2 (Comma-Separated Rooms)', instructions: 'Guest "John" brings 6 people, needs 3 identical rooms:\nRow 1: Guest Name: John | Room: 101, 102, 103 | # in Room: 2\nResult: 3 rooms created automatically, each with 2 people. Fast!' },
          { topic: 'METHOD 3 (Smart Assignment)', instructions: 'Guest "first" brings "ape" and "monk" (3 total), needs 2 rooms with SPECIFIC assignments:\nRow 1: Guest Name: first | Additional Names: ape, monk | Guest Names in Room: first and ape, monk | Rooms: 22, 23\nResult: Room 22 = "first and ape" (2 people), Room 23 = "monk" (1 person). Perfect control!' },
        ]

        instructions.forEach((instruction) => {
          const row = instructionsSheet.addRow(instruction)
          row.alignment = { vertical: 'top', wrapText: true }
          row.getCell(1).font = { bold: true }
        })
      }

      // Add the data worksheet (second tab for hotels, first tab for other modules)
      const worksheet = workbook.addWorksheet(sheetName)
      worksheet.columns = columns

      // Style header row
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      }

      // Add data rows
      templateData.forEach((row) => {
        worksheet.addRow(row)
      })

      const arrayBuffer = await workbook.xlsx.writeBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      const clientName = `${client.partner1FirstName}_${client.partner1LastName}`;
      return {
        filename: `${clientName}_${sheetName}_Template.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        data: base64,
      }
    }),

  // Pre-import validation - validate file structure before import
  validateImport: staffProcedure
    .input(z.object({
      module: moduleTypes,
      clientId: z.string().uuid(),
      fileData: z.string(), // base64 encoded Excel/CSV
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verify client access
      const client = await ctx.db.query.clients.findFirst({
        where: and(
          eq(schema.clients.id, input.clientId),
          eq(schema.clients.companyId, ctx.companyId)
        ),
      })

      if (!client) throw new TRPCError({ code: 'FORBIDDEN' })

      // Parse uploaded file
      const buffer = Buffer.from(input.fileData, 'base64')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))

      // [B1] Select the module's worksheet by name (same helper the import uses) so the
      // PREVIEW reflects what will actually be imported — not the combined export's Cover sheet.
      const worksheet = selectModuleWorksheet(workbook, input.module)

      if (!worksheet) {
        return {
          valid: false,
          error: 'No worksheet found in the uploaded file',
          rowCount: 0,
          columns: [],
        }
      }

      // Get headers from first row
      const headers: string[] = []
      const headerRow = worksheet.getRow(1)
      headerRow.eachCell((cell) => {
        const value = cell.value
        if (value !== null && value !== undefined) {
          headers.push(String(value).toLowerCase().replace(/[*\s()]/g, ''))
        }
      })

      // Required columns per module (normalized - lowercase, no special chars)
      const requiredColumns: Record<string, string[]> = {
        guests: ['name', 'guestname', 'firstname'],
        vendors: ['vendorname', 'name', 'category'],
        budget: ['item', 'category', 'estimatedcost'],
        gifts: ['giftname', 'name'],
        hotels: ['guestname', 'name'],
        transport: ['guestname', 'name'],
        guestGifts: ['guestname', 'giftname'],
        events: ['title', 'eventname', 'activity'],
      }

      const required = requiredColumns[input.module] || []
      const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

      // Check if at least one required column pattern is present
      const hasRequiredColumn = required.some(req =>
        normalizedHeaders.some(h => h.includes(req))
      )

      if (!hasRequiredColumn && required.length > 0) {
        return {
          valid: false,
          error: `Missing required column. Expected one of: ${required.join(', ')}. Found columns: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`,
          rowCount: 0,
          columns: headers,
        }
      }

      // Count data rows (excluding header and optional hints row)
      let dataRowCount = 0
      let hintsRowDetected = false

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // Skip header

        if (rowNumber === 2) {
          // Check if row 2 is a hints row
          const firstCellValue = String(row.getCell(1).value || '').toLowerCase()
          const hintsPatterns = ['do not modify', 'required', 'yyyy-mm-dd', 'hh:mm', 'true/false', 'numbers only', 'example']
          hintsRowDetected = hintsPatterns.some(pattern => firstCellValue.includes(pattern))
          if (!hintsRowDetected) {
            dataRowCount++
          }
        } else {
          // Check if row has any data
          let hasData = false
          row.eachCell((cell) => {
            if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== '') {
              hasData = true
            }
          })
          if (hasData) {
            dataRowCount++
          }
        }
      })

      return {
        valid: true,
        rowCount: dataRowCount,
        columns: headers,
        hintsRowDetected,
        message: `Ready to import ${dataRowCount} ${input.module} record${dataRowCount !== 1 ? 's' : ''}`,
      }
    }),

  // Upload and import data
  importData: staffProcedure
    .input(z.object({
      module: moduleTypes,
      clientId: z.string().uuid(),
      fileData: z.string(), // base64 encoded Excel/CSV
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Store companyId as non-null for use in transaction scope
      const companyId = ctx.companyId

      // Verify client access
      const client = await ctx.db.query.clients.findFirst({
        where: and(
          eq(schema.clients.id, input.clientId),
          eq(schema.clients.companyId, companyId)
        ),
      })

      if (!client) throw new TRPCError({ code: 'FORBIDDEN' })

      // Parse uploaded file
      const buffer = Buffer.from(input.fileData, 'base64')

      // ── Buffer-based import for modules with dedicated excel-parser functions ──
      // These handle their own Excel parsing, header validation, and DB upsert.
      if (input.module === 'budget') {
        const result = await importBudgetExcel(buffer, input.clientId, companyId)
        if (result.inserted > 0 || result.updated > 0 || result.deleted > 0) {
          // Centralized recalc cascade (SSOT) — budget → client stats + per-guest budget.
          await runImportRecalcCascade(ctx.db, 'budget', input.clientId)
          await broadcastSync({
            type: 'insert',
            module: 'budget',
            entityId: 'bulk-import',
            companyId,
            clientId: input.clientId,
            userId: ctx.userId!,
            queryPaths: [...BUDGET_MUTATION_PATHS],
          })
        }
        return { created: result.inserted, updated: result.updated, deleted: result.deleted, skipped: result.skipped, errors: result.errors, cascadeActions: [] }
      }

      if (input.module === 'hotels') {
        const result = await importHotelsExcel(buffer, input.clientId, companyId)
        const cascadeActions: { module: string; action: string; count: number }[] = []
        // Cross-module: sync hotels to timeline
        if (result.inserted > 0 || result.updated > 0 || result.deleted > 0) {
          const syncRes: SyncResult = { success: true, synced: 0, created: { hotels: 0, transport: 0, timeline: 0, budget: 0 }, errors: [] }
          await withTransaction(async (tx) => {
            await syncHotelsToTimelineTx(tx, input.clientId, syncRes)
          })
          if (syncRes.created.timeline > 0) {
            cascadeActions.push({ module: 'timeline', action: 'hotel_checkins_created', count: syncRes.created.timeline })
          }
          // Hotels have no client-stat coupling (recalcClientStats reads only
          // budget+guests, which a hotel import never touches), so we use the
          // canonical HOTEL_MUTATION_PATHS (which deliberately omit clients.*)
          // and skip the redundant recalc — matches hotels.router.ts behavior.
          await broadcastSync({
            type: 'insert',
            module: 'hotels',
            entityId: 'bulk-import',
            companyId,
            clientId: input.clientId,
            userId: ctx.userId!,
            queryPaths: [...HOTEL_MUTATION_PATHS],
          })
        }
        return { created: result.inserted, updated: result.updated, deleted: result.deleted, skipped: result.skipped, errors: result.errors, cascadeActions }
      }

      if (input.module === 'transport') {
        const result = await importTransportExcel(buffer, input.clientId, companyId)
        const cascadeActions: { module: string; action: string; count: number }[] = []
        // Cross-module: sync transport to timeline
        if (result.inserted > 0 || result.updated > 0 || result.deleted > 0) {
          const syncRes: SyncResult = { success: true, synced: 0, created: { hotels: 0, transport: 0, timeline: 0, budget: 0 }, errors: [] }
          await withTransaction(async (tx) => {
            await syncTransportToTimelineTx(tx, input.clientId, syncRes)
          })
          if (syncRes.created.timeline > 0) {
            cascadeActions.push({ module: 'timeline', action: 'transport_entries_created', count: syncRes.created.timeline })
          }
          // Transport has no client-stat coupling (recalcClientStats reads only
          // budget+guests, which a transport import never touches), so we use the
          // canonical TRANSPORT_MUTATION_PATHS (which deliberately omit clients.*)
          // and skip the redundant recalc — matches guestTransport.router.ts.
          await broadcastSync({
            type: 'insert',
            module: 'transport',
            entityId: 'bulk-import',
            companyId,
            clientId: input.clientId,
            userId: ctx.userId!,
            queryPaths: [...TRANSPORT_MUTATION_PATHS],
          })
        }
        return { created: result.inserted, updated: result.updated, deleted: result.deleted, skipped: result.skipped, errors: result.errors, cascadeActions }
      }

      if (input.module === 'vendors') {
        const result = await importVendorsExcel(buffer, input.clientId, companyId)
        if (result.inserted > 0 || result.updated > 0 || result.deleted > 0) {
          // Vendor cost edits feed client budget totals — recalc client stats so
          // the dashboard cards refresh (parity with budget/guest imports).
          // Centralized recalc cascade (SSOT) — vendors → client stats.
          await runImportRecalcCascade(ctx.db, 'vendors', input.clientId)
          await broadcastSync({
            type: 'insert',
            module: 'vendors',
            entityId: 'bulk-import',
            companyId,
            clientId: input.clientId,
            userId: ctx.userId!,
            queryPaths: [...VENDOR_MUTATION_PATHS],
          })
        }
        return { created: result.inserted, updated: result.updated, deleted: result.deleted, skipped: result.skipped, errors: result.errors, cascadeActions: [] }
      }

      if (input.module === 'events') {
        const result = await importEventsExcel(buffer, input.clientId, companyId)
        const cascadeActions: { module: string; action: string; count: number }[] = []
        if (result.inserted > 0 || result.updated > 0 || result.deleted > 0) {
          // Cross-module: regenerate event-linked timeline items (date/time anchors).
          const synced = await withTransaction(async (tx) =>
            syncEventsToTimelineTx(tx, input.clientId),
          )
          if (synced > 0) {
            cascadeActions.push({ module: 'timeline', action: 'event_items_synced', count: synced })
          }
          // Events have no client-stat coupling (recalcClientStats reads only
          // budget+guests), so use the canonical EVENT_MUTATION_PATHS (events.getAll
          // + timeline.getAll, no clients.*) and skip recalc — matches events.router.ts.
          await broadcastSync({
            type: 'insert',
            module: 'events',
            entityId: 'bulk-import',
            companyId,
            clientId: input.clientId,
            userId: ctx.userId!,
            queryPaths: [...EVENT_MUTATION_PATHS],
          })
        }
        return { created: result.inserted, updated: result.updated, deleted: result.deleted, skipped: result.skipped, errors: result.errors, cascadeActions }
      }

      // ── Inline import for guests, gifts, guestGifts (row-by-row within transaction) ──
      // [D1] Validate up front (CLAUDE rule 28), mirroring the canonical buffer parsers:
      // rejects a non-xlsx/malformed upload, a wrong/missing module sheet, or a sheet missing
      // the module's required name column — BEFORE any parsing. Wrap as BAD_REQUEST.
      const validation = INLINE_IMPORT_VALIDATION[input.module as 'guests' | 'gifts' | 'guestGifts']
      try {
        await validateExcelFile(buffer, validation.expected, validation.required, validation.sheet)
      } catch (e) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: e instanceof Error ? e.message : 'Invalid import file',
        })
      }

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))

      // [B1] Select the module's worksheet by its canonical NAME (was: first non-INSTRUCTIONS
      // sheet, which matched the combined export's 'Cover' → silent no-op).
      const worksheet = selectModuleWorksheet(workbook, input.module)

      if (!worksheet) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No worksheet found' })
      }
      console.log('[Import] Selected worksheet:', worksheet.name, 'with', worksheet.rowCount, 'rows')

      // Debug: Log first row (headers)
      const debugHeaderRow = worksheet.getRow(1)
      const debugHeaders: string[] = []
      debugHeaderRow.eachCell((cell, colNumber) => {
        debugHeaders.push(String(cell.value || ''))
      })
      console.log('[Import] Headers found:', debugHeaders)

      // Helper to sanitize ExcelJS cell values to simple types
      const sanitizeCellValue = (value: any): any => {
        if (value === null || value === undefined) return ''
        // Handle ExcelJS rich text { richText: [...] }
        if (value && typeof value === 'object' && value.richText) {
          return value.richText.map((r: any) => r.text || '').join('')
        }
        // Handle ExcelJS hyperlink { text: '...', hyperlink: '...' }
        if (value && typeof value === 'object' && value.text !== undefined) {
          return String(value.text)
        }
        // Handle ExcelJS formula { formula: '...', result: ... }
        if (value && typeof value === 'object' && value.formula !== undefined) {
          return value.result ?? ''
        }
        // Handle ExcelJS error { error: ... }
        if (value && typeof value === 'object' && value.error !== undefined) {
          return ''
        }
        // Handle Date objects - convert to string
        if (value instanceof Date) {
          return value.toISOString().slice(0, 16).replace('T', ' ')
        }
        // Handle Date-like objects with getTime method
        if (value && typeof value === 'object' && typeof value.getTime === 'function') {
          try {
            const date = new Date(value.getTime())
            return date.toISOString().slice(0, 16).replace('T', ' ')
          } catch {
            return String(value)
          }
        }
        // For any other object, convert to string
        if (typeof value === 'object') {
          return JSON.stringify(value)
        }
        return value
      }

      // Convert worksheet to JSON array
      const jsonData: any[] = []
      const headers: string[] = []
      let hintsRowSkipped = false

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // First row is headers
          row.eachCell((cell, colNumber) => {
            headers[colNumber - 1] = String(sanitizeCellValue(cell.value) || `Column${colNumber}`)
          })
        } else if (rowNumber === 2) {
          // Check if row 2 is a hints row (January 2026 enhanced format)
          // Hints row typically contains text like "Do not modify", "Required", "YYYY-MM-DD", etc.
          const firstCellValue = String(sanitizeCellValue(row.getCell(1).value) || '').toLowerCase()
          const secondCellValue = String(sanitizeCellValue(row.getCell(2).value) || '').toLowerCase()

          // Detect hints row by checking for common hint patterns
          const hintsPatterns = ['do not modify', 'required', 'yyyy-mm-dd', 'hh:mm', 'true/false', 'numbers only', 'email@', 'pending/', 'example']
          const isHintsRow = hintsPatterns.some(pattern =>
            firstCellValue.includes(pattern) || secondCellValue.includes(pattern)
          )

          if (isHintsRow) {
            hintsRowSkipped = true
            console.log('[Import] Detected and skipping format hints row (row 2)')
          } else {
            // Row 2 is actual data, process it
            const rowData: any = {}
            row.eachCell((cell, colNumber) => {
              const key = headers[colNumber - 1] || `Column${colNumber}`
              rowData[key] = sanitizeCellValue(cell.value)
            })
            jsonData.push(rowData)
          }
        } else {
          const rowData: any = {}
          row.eachCell((cell, colNumber) => {
            const key = headers[colNumber - 1] || `Column${colNumber}`
            rowData[key] = sanitizeCellValue(cell.value)
          })
          jsonData.push(rowData)
        }
      })

      console.log('[Import] Processed', jsonData.length, 'data rows', hintsRowSkipped ? '(hints row skipped)' : '')

      // Import results - will be populated inside transaction
      const results = {
        updated: 0,
        created: 0,
        deleted: 0,
        skipped: 0,
        errors: [] as string[],
        cascadeActions: [] as { module: string; action: string; count: number }[]
      }

      // Sync result tracking - populated within transaction for atomic import+sync
      const syncResult: SyncResult = {
        success: true,
        synced: 0,
        created: { hotels: 0, transport: 0, timeline: 0, budget: 0 },
        errors: [],
      }

      // Execute entire import AND sync within a transaction for atomicity
      // If import or sync fails, entire operation is rolled back
      await withTransaction(async (tx) => {
        // Process each row within transaction
        for (const [index, row] of jsonData.entries()) {
          const rowNum = index + 2 // Excel row (1-indexed + header)

          try {
            // Explicit delete: row marked DELETE in the Action column with a matching ID
            const rowAction = String(row['Action'] ?? row['action'] ?? '').trim().toLowerCase()
            if (rowAction === 'delete' || rowAction === 'remove') {
              const rowId = String(row['ID (Do not modify)'] ?? row['ID'] ?? row['id'] ?? '').trim()
              if (rowId && input.module === 'guests') {
                await tx.delete(schema.guests).where(and(eq(schema.guests.id, rowId), eq(schema.guests.clientId, input.clientId)))
                results.deleted++
              } else if (rowId && input.module === 'gifts') {
                await tx.delete(schema.gifts).where(and(eq(schema.gifts.id, rowId), eq(schema.gifts.clientId, input.clientId)))
                results.deleted++
              } else if (rowId && input.module === 'guestGifts') {
                await tx.delete(schema.guestGifts).where(and(eq(schema.guestGifts.id, rowId), eq(schema.guestGifts.clientId, input.clientId)))
                results.deleted++
              } else {
                results.skipped++
              }
              continue
            }

            // Only guests / gifts / guestGifts reach the inline path — budget, hotels,
            // transport, vendors, events all return early via the buffer-parser block above.
            switch (input.module) {
              case 'guests':
                await importGuest(tx, companyId, input.clientId, row, results)
                break
              case 'gifts':
                await importGift(tx, companyId, input.clientId, row, results)
                break
              case 'guestGifts':
                await importGuestGift(tx, companyId, input.clientId, row, results)
                break
            }
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error)
            results.errors.push(`Row ${rowNum}: ${msg}`)

            // If more than 50% of rows have errors, abort the transaction
            const errorThreshold = Math.ceil(jsonData.length * 0.5)
            if (results.errors.length > errorThreshold) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Import aborted: Too many errors (${results.errors.length} errors in ${jsonData.length} rows). First error: ${results.errors[0]}. All changes have been rolled back.`
              })
            }
          }
        }

        console.log(`[Import] Rows processed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`)

        // ===== ATOMIC CASCADE SYNC =====
        // Run cascade sync operations WITHIN the same transaction for atomicity
        // If sync fails, the entire import is rolled back
        if (results.updated > 0 || results.created > 0) {
          console.log(`[Import] Running atomic cascade sync for ${input.module}...`)

          // Sync guests to hotels/transport if guest module was imported
          if (input.module === 'guests') {
            await syncGuestsToHotelsAndTransportTx(tx, input.clientId, syncResult, companyId)
            if (syncResult.created.hotels > 0) {
              results.cascadeActions.push({ module: 'hotels', action: 'created', count: syncResult.created.hotels })
            }
            if (syncResult.created.transport > 0) {
              results.cascadeActions.push({ module: 'transport', action: 'created', count: syncResult.created.transport })
            }
          }

          // Sync hotels to timeline if hotels module was imported
          if (input.module === 'hotels' || input.module === 'guests') {
            await syncHotelsToTimelineTx(tx, input.clientId, syncResult)
            if (syncResult.created.timeline > 0) {
              results.cascadeActions.push({ module: 'timeline', action: 'hotel_checkins_created', count: syncResult.created.timeline })
            }
          }

          // Sync transport to timeline if transport module was imported
          if (input.module === 'transport' || input.module === 'guests') {
            const timelineBeforeTransport = syncResult.created.timeline
            await syncTransportToTimelineTx(tx, input.clientId, syncResult)
            const transportTimelineCreated = syncResult.created.timeline - timelineBeforeTransport
            if (transportTimelineCreated > 0) {
              results.cascadeActions.push({ module: 'timeline', action: 'transport_entries_created', count: transportTimelineCreated })
            }
          }

          console.log(`[Import] Cascade sync completed: hotels=${syncResult.created.hotels}, transport=${syncResult.created.transport}, timeline=${syncResult.created.timeline}, budget=${syncResult.created.budget}`)
        }

        // Centralized per-module recalc cascade (SSOT). For the inline path this is guests
        // (client stats + per-guest budget); gifts/guestGifts are no-ops. Routing through the
        // shared helper keeps the Excel and Sheets import cascades from drifting (P1/I1 class).
        const { perGuestBudgetUpdated } = await runImportRecalcCascade(tx, input.module, input.clientId)
        if (perGuestBudgetUpdated > 0) {
          results.cascadeActions.push({ module: 'budget', action: 'recalculated', count: perGuestBudgetUpdated })
          syncResult.created.budget = perGuestBudgetUpdated
        }

        console.log(`[Import] Transaction complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.cascadeActions.length} cascade actions`)
      })

      // Broadcast real-time sync after successful import (outside transaction)
      if (results.created > 0 || results.updated > 0 || results.deleted > 0) {
        // Module-specific queryPaths for targeted cache invalidation
        // Sourced from the shared per-module constants so the import path can't
        // drift from the UI routers / chatbot. Guests add budget.getAll because a
        // bulk guest import recalcs the per-guest budget *items* (not just the
        // summary). timeline added for guests since hotel/transport check-ins sync.
        const queryPathsMap: Record<string, string[]> = {
          guests: [...GUEST_MUTATION_PATHS, 'budget.getAll'],
          vendors: [...VENDOR_MUTATION_PATHS],
          budget: [...BUDGET_MUTATION_PATHS],
          gifts: ['gifts.getAll', 'gifts.getStats'],
          hotels: [...HOTEL_MUTATION_PATHS],
          transport: [...TRANSPORT_MUTATION_PATHS],
          guestGifts: ['gifts.getAll', 'gifts.getStats'],
        }

        await broadcastSync({
          type: 'insert',
          module: input.module === 'guestGifts' ? 'gifts' : input.module,
          entityId: 'bulk-import',
          companyId,
          clientId: input.clientId,
          userId: ctx.userId!,
          queryPaths: queryPathsMap[input.module] || ['guests.getAll'],
        })
      }

      return results
    }),
})

// Helper: Import Guest
async function importGuest(
  db: any,
  companyId: string,
  clientId: string,
  row: any,
  results: { updated: number; created: number; skipped: number; errors: string[] }
) {
  const id = getRowValue(row, 'ID (Do not modify)', 'ID', 'id')

  // Support multiple name column formats:
  // 1. Single "Name" or "Guest Name" column (from guest registration form)
  // 2. Separate "First Name *" and "Last Name *" columns (from template)
  let firstName = row['First Name *'] || row['First Name'] || ''
  let lastName = row['Last Name *'] || row['Last Name'] || ''

  // If no separate first/last name, check for combined name field
  const fullName = row['Name *'] || row['Name'] || row['Guest Name'] || ''
  if (!firstName && fullName) {
    // Split full name into first and last (last name is everything after first space)
    const nameParts = fullName.trim().split(/\s+/)
    firstName = nameParts[0] || ''
    lastName = nameParts.slice(1).join(' ') || '' // Last name is optional
  }

  // Parse email early for empty-row detection and email-based matching
  const email = getRowValue(row, 'Email', 'email', 'E-mail', 'Email Address') || null

  // Skip empty rows (no name and no email — likely blank Excel row)
  if (!firstName && !lastName && !email) {
    results.skipped++
    return
  }

  if (!firstName) throw new Error('Name is required')

  // Parse comma-separated values into arrays
  const parseCommaSeparated = (val: string | undefined): string[] | null => {
    if (!val || typeof val !== 'string') return null
    const items = val.split(',').map(s => s.trim()).filter(Boolean)
    return items.length > 0 ? items : null
  }

  // Parse party size
  const parsePartySize = (val: any): number => {
    if (!val) return 1
    const num = parseInt(String(val), 10)
    return isNaN(num) || num < 1 ? 1 : num
  }

  // Parse datetime values from Excel - returns Date object for Drizzle timestamp columns
  const parseDatetime = (val: any): Date | null => {
    if (!val) return null
    // If it's already a Date, return it
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val
    }
    // If it's a string, try to parse it
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (!trimmed) return null
      const parsed = new Date(trimmed)
      return isNaN(parsed.getTime()) ? null : parsed
    }
    // If it's a number (Excel serial date), convert it
    if (typeof val === 'number') {
      // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
      const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
      const date = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000)
      return isNaN(date.getTime()) ? null : date
    }
    // If it has getTime method (Date or Date-like object from ExcelJS)
    if (val && typeof val.getTime === 'function') {
      try {
        const date = new Date(val.getTime())
        return isNaN(date.getTime()) ? null : date
      } catch {
        return null
      }
    }
    // If it's an object with text property (ExcelJS rich text)
    if (val && typeof val === 'object' && val.text) {
      const parsed = new Date(String(val.text).trim())
      return isNaN(parsed.getTime()) ? null : parsed
    }
    // For any other type, try to parse
    try {
      const parsed = new Date(String(val).trim())
      return isNaN(parsed.getTime()) ? null : parsed
    } catch {
      return null
    }
  }

  // Parse boolean values
  const parseBoolean = (val: any): boolean => {
    if (typeof val === 'boolean') return val
    if (typeof val === 'string') {
      const normalized = val.trim().toLowerCase()
      return normalized === 'true' || normalized === 'yes' || normalized === '1'
    }
    return false
  }

  // Parse per-member requirements (format: "name1:TRUE, name2:FALSE")
  const parsePerMemberReqs = (val: any): Record<string, boolean> | null => {
    if (!val || typeof val !== 'string') return null
    const result: Record<string, boolean> = {}
    const parts = val.split(',')
    for (const part of parts) {
      const [name, boolStr] = part.split(':').map(s => s.trim())
      if (name && boolStr) {
        const normalized = boolStr.toLowerCase()
        result[name] = normalized === 'true' || normalized === 'yes' || normalized === '1'
      }
    }
    return Object.keys(result).length > 0 ? result : null
  }

  // Parse per-member hotel/transport data
  const perMemberHotel = parsePerMemberReqs(getRowValue(row, 'Per-Member Hotel', 'per_member_hotel'))
  const perMemberTransport = parsePerMemberReqs(getRowValue(row, 'Per-Member Transport', 'per_member_transport'))

  // Build metadata with partyMemberRequirements if per-member data exists
  let metadata: Record<string, any> = {}
  if (perMemberHotel || perMemberTransport) {
    const partyMemberRequirements: Record<string, { hotelRequired?: boolean; transportRequired?: boolean }> = {}

    // Merge hotel requirements
    if (perMemberHotel) {
      for (const [name, value] of Object.entries(perMemberHotel)) {
        if (!partyMemberRequirements[name]) partyMemberRequirements[name] = {}
        partyMemberRequirements[name].hotelRequired = value
      }
    }

    // Merge transport requirements
    if (perMemberTransport) {
      for (const [name, value] of Object.entries(perMemberTransport)) {
        if (!partyMemberRequirements[name]) partyMemberRequirements[name] = {}
        partyMemberRequirements[name].transportRequired = value
      }
    }

    metadata = { partyMemberRequirements }
  }

  const guestData = {
    firstName,
    lastName,
    email,
    phone: getRowValue(row, 'Phone', 'phone', 'Phone Number', 'Mobile', 'Contact') || null,
    groupName: getRowValue(row, 'Group', 'group', 'Group Name', 'Category') || null,
    rsvpStatus: normalizeRsvpStatus(getRowValue(row, 'RSVP Status', 'rsvp_status', 'RSVP', 'Status') || 'pending'),
    guestSide: normalizeGuestSide(getRowValue(row, 'Side', 'guest_side', 'Guest Side', 'Party Side') || 'mutual'),
    partySize: parsePartySize(getRowValue(row, 'Party Size', 'party_size', '# of Guests', 'Number of Guests')),
    additionalGuestNames: parseCommaSeparated(getRowValue(row, 'Additional Guest Names', 'additional_guests', 'Plus Ones', 'Additional Guests')),
    relationshipToFamily: getRowValue(row, 'Relationship to Family', 'relationship', 'Relationship', 'Relation') || null,
    attendingEvents: parseCommaSeparated(getRowValue(row, 'Attending Events', 'attending_events', 'Events')),
    arrivalDatetime: parseDatetime(getRowValue(row, 'Arrival Date/Time', 'arrival_datetime', 'Arrival', 'Arrival Date')),
    arrivalMode: getRowValue(row, 'Arrival Mode', 'arrival_mode', 'Arrival Transport') || null,
    departureDatetime: parseDatetime(getRowValue(row, 'Departure Date/Time', 'departure_datetime', 'Departure', 'Departure Date')),
    departureMode: getRowValue(row, 'Departure Mode', 'departure_mode', 'Departure Transport') || null,
    mealPreference: getRowValue(row, 'Meal Preference', 'meal_preference', 'Meal', 'Food Preference') || null,
    dietaryRestrictions: getRowValue(row, 'Dietary Restrictions', 'dietary', 'Diet', 'Allergies') || null,
    hotelRequired: parseBoolean(getRowValue(row, 'Hotel (Primary)', 'Hotel Required (TRUE/FALSE)', 'Hotel Required', 'hotel_required', 'Hotel', 'Hotel Needed')),
    transportRequired: parseBoolean(getRowValue(row, 'Transport (Primary)', 'Transport Required (TRUE/FALSE)', 'Transport Required', 'transport_required', 'Transport', 'Shuttle Needed')),
    giftRequired: parseBoolean(getRowValue(row, 'Gift Required (TRUE/FALSE)', 'Gift Required', 'gift_required')) || !!getRowValue(row, 'Gift to Give', 'gift'),
    giftToGive: getRowValue(row, 'Gift to Give', 'gift', 'Gift') || null,
    notes: getRowValue(row, 'Notes', 'notes', 'Comments', 'Special Notes') || null,
    // Include metadata with per-member requirements if present
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    updatedAt: new Date(),
  }

  let existingGuest = null

  if (id) {
    // Try to find by ID first
    existingGuest = await db.query.guests.findFirst({
      where: and(
        eq(schema.guests.id, id),
        eq(schema.guests.clientId, clientId)
      ),
    })
  }

  // If no ID match, try to match by email
  if (!existingGuest && email) {
    const allGuestsForEmail = await db.query.guests.findMany({
      where: and(
        eq(schema.guests.clientId, clientId),
        eq(schema.guests.email, email)
      ),
    })
    existingGuest = allGuestsForEmail[0] || null
  }

  // If no ID or email match, try to match by name (case-insensitive)
  // Require BOTH firstName AND lastName to match to prevent false positives.
  // firstName-only matching is too loose (e.g., "John" could match "John Smith" or "John Doe").
  if (!existingGuest && firstName && lastName) {
    const allGuests = await db.query.guests.findMany({
      where: eq(schema.guests.clientId, clientId),
    })
    existingGuest = allGuests.find((g: any) => {
      const matchFirstName = g.firstName.toLowerCase().trim() === firstName.toLowerCase().trim()
      const matchLastName = (g.lastName || '').toLowerCase().trim() === lastName.toLowerCase().trim()
      return matchFirstName && matchLastName
    })
  }

  let guestId: string
  const guestFullName = `${firstName} ${lastName}`.trim()

  if (existingGuest) {
    // Update existing guest - merge metadata if both old and new have data
    const updateData = { ...guestData }
    if (Object.keys(metadata).length > 0) {
      const existingMetadata = (existingGuest as any).metadata || {}
      updateData.metadata = {
        ...existingMetadata,
        ...metadata,
        // Deep merge partyMemberRequirements
        partyMemberRequirements: {
          ...existingMetadata.partyMemberRequirements,
          ...metadata.partyMemberRequirements,
        }
      }
    }

    await db
      .update(schema.guests)
      .set(updateData)
      .where(eq(schema.guests.id, existingGuest.id))

    guestId = existingGuest.id
    results.updated++
  } else {
    // Create new guest with returning to get ID
    const [newGuest] = await db.insert(schema.guests).values({
      ...guestData,
      clientId,
    }).returning({ id: schema.guests.id })

    guestId = newGuest.id
    results.created++
  }

  // Hotel/transport cascade is handled by syncGuestsToHotelsAndTransportTx()
  // after all guest rows are processed (see ATOMIC CASCADE SYNC block).
}

// Helper: Find a value from row with multiple possible header names (case-insensitive)
function getRowValue(row: any, ...possibleHeaders: string[]): any {
  // First try exact matches
  for (const header of possibleHeaders) {
    if (row[header] !== undefined && row[header] !== '') return row[header]
  }
  // Then try case-insensitive matches
  const rowKeys = Object.keys(row)
  for (const header of possibleHeaders) {
    const lowerHeader = header.toLowerCase().replace(/[*\s]/g, '')
    const matchingKey = rowKeys.find(k =>
      k.toLowerCase().replace(/[*\s]/g, '') === lowerHeader
    )
    if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== '') {
      return row[matchingKey]
    }
  }
  return undefined
}

// Helper: Import Gift
async function importGift(
  db: any,
  companyId: string,
  clientId: string,
  row: any,
  results: { updated: number; created: number; errors: string[] }
) {
  const id = getRowValue(row, 'ID (Do not modify)', 'ID', 'id')
  const giftName = getRowValue(row, 'Gift Name *', 'Gift Name', 'gift_name', 'Gift Item', 'Gift', 'Name')

  if (!giftName) throw new Error('Gift Name is required')

  // [C1] Map to the ACTUAL `gifts` table columns (name / value / status / guestId), NOT the
  // non-existent giftName/fromName/deliveryStatus/thankYouSent the old code wrote. Typed via
  // $inferInsert so a wrong column name is a COMPILE error. Mirrors the correct Sheets path
  // (importGiftsFromSheet, GIFT_HEADERS Gift Name/Value/Status).
  //
  // Non-destructive: only overwrite columns actually PRESENT in the uploaded sheet — the
  // official gifts template carries no 'Value'/'Guest ID' columns, so an unconditional .set()
  // would null out stored gift values and guest links on every re-import.
  const normHeader = (s: string) => s.toLowerCase().replace(/[*\s]/g, '')
  const rowCols = new Set(Object.keys(row).map(normHeader))
  const hasCol = (...headers: string[]) => headers.some((h) => rowCols.has(normHeader(h)))

  const giftData: Partial<typeof schema.gifts.$inferInsert> = {
    name: giftName,
    updatedAt: new Date(),
  }
  if (hasCol('Value', 'Gift Value', 'Amount')) {
    const raw = getRowValue(row, 'Value', 'value', 'Gift Value', 'Amount')
    const n = raw === undefined ? NaN : Number.parseFloat(String(raw))
    giftData.value = Number.isFinite(n) ? n : null
  }
  if (hasCol('Status', 'Delivery Status')) {
    giftData.status = getRowValue(row, 'Status', 'status', 'Delivery Status') || 'received'
  }
  if (hasCol('Guest ID (Do not modify)', 'Guest ID', 'guest_id')) {
    giftData.guestId = getRowValue(row, 'Guest ID (Do not modify)', 'Guest ID', 'guest_id') || null
  }

  let existingGift = null

  if (id) {
    // Try to find by ID first
    existingGift = await db.query.gifts.findFirst({
      where: and(
        eq(schema.gifts.id, id),
        eq(schema.gifts.clientId, clientId)
      ),
    })
  }

  // [C1] If no ID match, match by the real `name` column (was g.giftName → a non-existent
  // column → undefined.toLowerCase() crash on ADD whenever a gift already existed).
  if (!existingGift && giftName) {
    const allGifts = await db.query.gifts.findMany({
      where: eq(schema.gifts.clientId, clientId),
    })
    existingGift = allGifts.find(
      (g: any) => (g.name || '').toLowerCase().trim() === giftName.toLowerCase().trim()
    )
  }

  if (existingGift) {
    // Update existing gift (non-destructive — only the columns present above)
    await db
      .update(schema.gifts)
      .set(giftData)
      .where(eq(schema.gifts.id, existingGift.id))

    results.updated++
  } else {
    // Create new gift — include companyId (tenant-scoped table, CLAUDE rule 1).
    const { nanoid } = await import('nanoid')
    await db.insert(schema.gifts).values({
      id: nanoid(),
      ...giftData,
      name: giftName,
      status: giftData.status ?? 'received',
      clientId,
      companyId,
    })

    results.created++
  }
}

// Helper: Import Guest Gift (gifts given TO guests)
async function importGuestGift(
  db: any,
  companyId: string,
  clientId: string,
  row: any,
  results: { updated: number; created: number; errors: string[] }
) {
  const id = getRowValue(row, 'ID (Do not modify)', 'ID', 'id')
  const guestId = getRowValue(row, 'Guest ID (Do not modify)', 'Guest ID', 'guest_id', 'GuestId')
  // Support all header variations
  const guestName = getRowValue(row, 'Guest Name *', 'Guest Name', 'guest_name', 'GuestName', 'Recipient', 'To')
  const giftName = getRowValue(row, 'Gift Name *', 'Gift Name', 'gift_name', 'GiftName', 'Gift Item', 'Gift', 'Item')

  if (!guestName || !giftName) throw new Error('Guest Name and Gift Name are required')

  // Parse date values
  const parseDate = (val: any): string | null => {
    if (!val) return null
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toISOString().split('T')[0]
    }
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (!trimmed) return null
      const parsed = new Date(trimmed)
      return isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().split('T')[0]
    }
    if (typeof val === 'number') {
      const excelEpoch = new Date(1899, 11, 30)
      const date = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000)
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
    }
    return null
  }

  // Parse time value
  const parseTime = (val: any): string | null => {
    if (!val) return null
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (!trimmed) return null
      if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed
      const timeMatch = trimmed.match(/(\d{1,2}:\d{2})/)
      return timeMatch ? timeMatch[1] : trimmed
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toTimeString().slice(0, 5)
    }
    if (typeof val === 'number' && val < 1) {
      const totalMinutes = Math.round(val * 24 * 60)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
    return null
  }

  // Parse quantity
  const parseQuantity = (val: any): number => {
    if (!val) return 1
    const num = parseInt(String(val), 10)
    return isNaN(num) || num < 1 ? 1 : num
  }

  // Get gift type name
  const giftTypeName = getRowValue(row, 'Gift Type', 'gift_type', 'GiftType', 'Gift Category', 'Type', 'Category') || null

  // Build guestGiftData matching actual schema: id, clientId, guestId, name, type, quantity
  const guestGiftData = {
    guestId: guestId || null,
    name: giftName,
    type: giftTypeName,
    quantity: parseQuantity(getRowValue(row, 'Quantity', 'quantity', 'Qty', 'Count', 'Amount')),
    updatedAt: new Date(),
  }

  let existingGuestGift = null

  if (id) {
    // Try to find by ID first
    existingGuestGift = await db.query.guestGifts.findFirst({
      where: and(
        eq(schema.guestGifts.id, id),
        eq(schema.guestGifts.clientId, clientId)
      ),
    })
  }

  // If no ID or ID not found, try to match by gift name (case-insensitive)
  // For guest gifts, we match by name since the same gift could go to multiple guests
  if (!existingGuestGift && giftName) {
    const allGuestGifts = await db.query.guestGifts.findMany({
      where: eq(schema.guestGifts.clientId, clientId),
    })
    existingGuestGift = allGuestGifts.find(
      (g: any) => g.name?.toLowerCase().trim() === giftName.toLowerCase().trim()
    )
  }

  if (existingGuestGift) {
    // Update existing guest gift
    await db
      .update(schema.guestGifts)
      .set(guestGiftData)
      .where(eq(schema.guestGifts.id, existingGuestGift.id))

    results.updated++
  } else {
    // Create new guest gift
    const { nanoid } = await import('nanoid')
    await db.insert(schema.guestGifts).values({
      id: nanoid(),
      ...guestGiftData,
      clientId,
    })

    results.created++
  }
}
