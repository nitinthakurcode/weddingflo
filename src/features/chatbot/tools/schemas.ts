/**
 * Chatbot Tool Schemas - Zod Validation
 *
 * February 2026 - AI Command Chatbot Feature
 *
 * Zod schemas for validating tool call arguments from LLM function calling.
 * These schemas ensure type safety and data integrity for all chatbot operations.
 */

import { z } from 'zod'

// ============================================
// CLIENT MANAGEMENT SCHEMAS
// ============================================

export const createClientSchema = z.object({
  partner1FirstName: z.string().min(1).max(100).describe('First name of partner 1 (bride)'),
  partner1LastName: z.string().max(100).optional().describe('Last name of partner 1'),
  partner1Email: z.string().email().describe('Email of partner 1'),
  partner1Phone: z.string().max(20).optional().describe('Phone number of partner 1'),
  partner2FirstName: z.string().max(100).optional().describe('First name of partner 2 (groom)'),
  partner2LastName: z.string().max(100).optional().describe('Last name of partner 2'),
  partner2Email: z.string().email().optional().describe('Email of partner 2'),
  weddingDate: z.string().optional().describe('Wedding date in ISO format (YYYY-MM-DD)'),
  venue: z.string().max(200).optional().describe('Wedding venue name'),
  budget: z.number().positive().optional().describe('Total wedding budget'),
  guestCount: z.number().int().positive().max(10000).optional().describe('Expected guest count'),
  weddingType: z.enum(['traditional', 'destination', 'intimate', 'elopement', 'multi_day', 'cultural', 'modern', 'rustic', 'bohemian', 'religious', 'luxury']).optional().describe('Type of wedding'),
  vendors: z.string().max(1000).optional().describe('Comma-separated vendor names to auto-create. Format: "Category: Name" or just "Name". E.g., "Venue: Grand Hotel, Photography: Studio One, DJ"'),
})

export const updateClientSchema = z.object({
  clientId: z.string().uuid().describe('Client UUID to update'),
  partner1FirstName: z.string().min(1).max(100).optional(),
  partner1LastName: z.string().max(100).optional(),
  partner1Email: z.string().email().optional(),
  partner2FirstName: z.string().max(100).optional(),
  partner2LastName: z.string().max(100).optional(),
  weddingDate: z.string().optional(),
  venue: z.string().max(200).optional(),
  budget: z.number().positive().optional(),
  guestCount: z.number().int().positive().max(10000).optional(),
  status: z.enum(['draft', 'planning', 'confirmed', 'in_progress', 'completed']).optional(),
})

export const getClientSummarySchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID. If not provided, uses current context'),
})

// ============================================
// GUEST MANAGEMENT SCHEMAS
// ============================================

export const addGuestSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID. Uses current context if not provided'),
  firstName: z.string().min(1).max(100).describe('Guest first name'),
  lastName: z.string().max(100).optional().describe('Guest last name'),
  email: z.string().email().optional().describe('Guest email'),
  phone: z.string().max(20).optional().describe('Guest phone'),
  rsvpStatus: z.enum(['pending', 'confirmed', 'declined', 'maybe']).optional().default('pending'),
  mealPreference: z.enum(['standard', 'vegetarian', 'vegan', 'gluten_free', 'kosher', 'halal', 'other']).optional(),
  dietaryRestrictions: z.string().max(500).optional().describe('Dietary restrictions or allergies'),
  groupName: z.string().max(100).optional().describe('Guest group (e.g., "Bride Family", "College Friends")'),
  plusOne: z.boolean().optional().default(false).describe('Whether guest has a plus one'),
  tableNumber: z.number().int().positive().optional().describe('Assigned table number'),
  needsHotel: z.boolean().optional().default(false).describe('Whether guest needs hotel accommodation'),
  needsTransport: z.boolean().optional().default(false).describe('Whether guest needs transportation'),
  side: z.enum(['partner1', 'partner2', 'mutual']).optional().describe('Which side the guest belongs to'),
  eventId: z.string().uuid().optional().describe('Specific event UUID to associate guest with'),
  // Hotel detail fields (used by cascade to pre-fill hotel record)
  hotelName: z.string().max(200).optional().describe('Hotel name if known'),
  hotelCheckIn: z.string().optional().describe('Hotel check-in date (YYYY-MM-DD)'),
  hotelCheckOut: z.string().optional().describe('Hotel check-out date (YYYY-MM-DD)'),
  hotelRoomType: z.string().max(100).optional().describe('Room type (e.g., "single", "double", "suite")'),
  // Transport detail fields (used by cascade to pre-fill transport record)
  transportType: z.string().max(100).optional().describe('Transport type (e.g., "car", "bus", "flight")'),
  pickupLocation: z.string().max(200).optional().describe('Pickup location'),
  pickupTime: z.string().optional().describe('Pickup time (HH:MM)'),
  transportNotes: z.string().max(500).optional().describe('Transport notes'),
})

export const updateGuestRsvpSchema = z.object({
  guestId: z.string().uuid().optional().describe('Guest UUID. Can also identify by name'),
  guestName: z.string().optional().describe('Guest name for fuzzy matching if guestId not provided'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
  rsvpStatus: z.enum(['pending', 'confirmed', 'declined', 'maybe']).describe('New RSVP status'),
})

export const getGuestStatsSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID. Uses current context if not provided'),
  eventId: z.string().uuid().optional().describe('Filter by specific event'),
})

export const bulkUpdateGuestsSchema = z.object({
  clientId: z.string().uuid().optional(),
  guestIds: z.array(z.string().uuid()).optional().describe('Specific guest UUIDs to update'),
  groupName: z.string().optional().describe('Update guests in this group'),
  updates: z.object({
    rsvpStatus: z.enum(['pending', 'confirmed', 'declined', 'maybe']).optional(),
    tableNumber: z.number().int().positive().optional(),
    needsHotel: z.boolean().optional(),
    needsTransport: z.boolean().optional(),
  }),
})

// ============================================
// EVENT MANAGEMENT SCHEMAS
// ============================================

export const createEventSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID. Uses current context if not provided'),
  title: z.string().min(1).max(200).describe('Event title'),
  eventType: z.enum(['Wedding', 'Mehendi', 'Sangeet', 'Haldi', 'Reception', 'Rehearsal Dinner', 'Engagement', 'Bachelor Party', 'Bridal Shower', 'Other']).describe('Type of event'),
  eventDate: z.string().describe('Event date in ISO format (YYYY-MM-DD)'),
  startTime: z.string().optional().describe('Start time (HH:MM)'),
  endTime: z.string().optional().describe('End time (HH:MM)'),
  venueName: z.string().max(200).optional().describe('Venue name'),
  venueAddress: z.string().max(500).optional().describe('Full venue address'),
  description: z.string().max(2000).optional().describe('Event description'),
  guestCount: z.number().int().positive().optional().describe('Expected guests for this event'),
})

export const updateEventSchema = z.object({
  eventId: z.string().uuid().describe('Event UUID to update'),
  title: z.string().min(1).max(200).optional(),
  eventDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venueName: z.string().max(200).optional(),
  venueAddress: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['planned', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
})

// ============================================
// TIMELINE MANAGEMENT SCHEMAS
// ============================================

export const addTimelineItemSchema = z.object({
  clientId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional().describe('Event to add timeline item to'),
  title: z.string().min(1).max(200).describe('Timeline item title'),
  description: z.string().max(1000).optional(),
  startTime: z.string().describe('Start time (HH:MM or full datetime)'),
  endTime: z.string().optional().describe('End time (HH:MM or full datetime)'),
  durationMinutes: z.number().int().positive().optional().describe('Duration in minutes'),
  location: z.string().max(200).optional(),
  vendorId: z.string().uuid().optional().describe('Associated vendor'),
  assignee: z.string().max(100).optional().describe('Person responsible'),
  phase: z.enum(['preparation', 'ceremony', 'reception', 'post_event']).optional(),
})

export const shiftTimelineSchema = z.object({
  clientId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  shiftMinutes: z.number().int().describe('Minutes to shift (positive = later, negative = earlier)'),
  startFromItemId: z.string().uuid().optional().describe('Only shift items after this item'),
  affectedPhase: z.enum(['preparation', 'ceremony', 'reception', 'post_event']).optional().describe('Only shift items in this phase'),
})

// ============================================
// VENDOR MANAGEMENT SCHEMAS
// ============================================

export const addVendorSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).describe('Vendor name'),
  category: z.enum(['venue', 'catering', 'photography', 'videography', 'florals', 'music', 'dj', 'decor', 'bakery', 'transportation', 'beauty', 'officiant', 'rentals', 'stationery', 'planner', 'entertainment', 'other']).describe('Vendor category'),
  contactName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional(),
  estimatedCost: z.number().positive().optional().describe('Estimated cost'),
  depositAmount: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
  serviceDate: z.string().optional().describe('Service date in ISO format (YYYY-MM-DD)'),
  eventId: z.string().uuid().optional().describe('Specific event to associate with'),
})

export const updateVendorSchema = z.object({
  vendorId: z.string().uuid().optional(),
  vendorName: z.string().optional().describe('Vendor name for fuzzy matching'),
  clientId: z.string().uuid().optional(),
  contactName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  estimatedCost: z.number().positive().optional(),
  depositAmount: z.number().positive().optional(),
  paymentStatus: z.enum(['pending', 'deposit_paid', 'partial', 'paid', 'refunded']).optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  notes: z.string().max(2000).optional(),
})

// ============================================
// HOTEL MANAGEMENT SCHEMAS
// ============================================

export const addHotelBookingSchema = z.object({
  clientId: z.string().uuid().optional(),
  guestId: z.string().uuid().optional().describe('Guest UUID'),
  guestName: z.string().optional().describe('Guest name for matching'),
  hotelName: z.string().min(1).max(200).describe('Hotel name'),
  roomType: z.string().max(100).optional().describe('Room type (e.g., "King Suite")'),
  checkInDate: z.string().describe('Check-in date (YYYY-MM-DD)'),
  checkOutDate: z.string().describe('Check-out date (YYYY-MM-DD)'),
  confirmationNumber: z.string().max(50).optional(),
  roomRate: z.number().positive().optional().describe('Nightly room rate'),
  notes: z.string().max(500).optional(),
})

export const syncHotelGuestsSchema = z.object({
  clientId: z.string().uuid().optional(),
  hotelName: z.string().optional().describe('Filter to specific hotel'),
})

// ============================================
// BUDGET SCHEMAS
// ============================================

export const getBudgetOverviewSchema = z.object({
  clientId: z.string().uuid().optional(),
  category: z.string().optional().describe('Filter by budget category'),
})

export const updateBudgetItemSchema = z.object({
  budgetItemId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  category: z.string().optional().describe('Category to find item'),
  segment: z.enum(['vendors', 'travel', 'creatives', 'artists', 'accommodation', 'other']).optional().describe('Budget segment grouping'),
  item: z.string().optional().describe('Item name to find'),
  estimatedCost: z.number().positive().optional(),
  actualCost: z.number().positive().optional(),
  paidAmount: z.number().positive().optional(),
  paymentStatus: z.enum(['pending', 'deposit_paid', 'partial', 'paid']).optional(),
  notes: z.string().max(500).optional(),
})

// ============================================
// SEARCH SCHEMA
// ============================================

export const searchEntitiesSchema = z.object({
  query: z.string().min(1).max(200).describe('Search query'),
  clientId: z.string().uuid().optional().describe('Limit search to specific client'),
  entityTypes: z.array(z.enum(['client', 'guest', 'event', 'vendor', 'hotel', 'budget', 'timeline'])).optional().describe('Filter to specific entity types'),
  limit: z.number().int().positive().max(50).optional().default(10),
})

// ============================================
// COMMUNICATION SCHEMAS
// ============================================

export const sendCommunicationSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  communicationType: z.enum(['rsvp_reminder', 'wedding_reminder', 'vendor_reminder', 'questionnaire_reminder', 'custom']).describe('Type of communication'),
  recipientType: z.enum(['all_guests', 'pending_rsvp', 'confirmed_guests', 'specific_guest', 'client', 'all_vendors', 'vendor_category', 'specific_vendor']).optional().describe('Who to send to'),
  channel: z.enum(['email', 'sms', 'whatsapp']).optional().default('email').describe('Communication channel (default: email). SMS/WhatsApp require valid phone numbers on recipients.'),
  guestId: z.string().uuid().optional().describe('Specific guest UUID'),
  guestName: z.string().optional().describe('Guest name for fuzzy matching'),
  vendorId: z.string().uuid().optional().describe('Specific vendor UUID'),
  vendorName: z.string().optional().describe('Vendor name for fuzzy matching'),
  vendorCategory: z.enum(['venue', 'catering', 'photography', 'videography', 'florals', 'music', 'dj', 'decor', 'bakery', 'transportation', 'beauty', 'officiant', 'rentals', 'stationery', 'planner', 'entertainment', 'other']).optional().describe('Vendor category filter'),
  subject: z.string().max(200).optional().describe('Email subject'),
  message: z.string().max(2000).optional().describe('Custom message content'),
  language: z.enum(['en', 'es', 'hi', 'fr', 'de', 'pt', 'zh']).optional().default('en').describe('Message language'),
})

// ============================================
// PIPELINE SCHEMAS
// ============================================

export const updatePipelineSchema = z.object({
  leadId: z.string().uuid().optional().describe('Lead UUID'),
  leadName: z.string().optional().describe('Lead name for fuzzy matching'),
  stageId: z.string().uuid().optional().describe('New stage UUID'),
  stageName: z.string().optional().describe('Stage name for matching'),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  notes: z.string().max(2000).optional().describe('Activity notes'),
})

// ============================================
// WEDDING SUMMARY SCHEMA
// ============================================

export const getWeddingSummarySchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  includeActionItems: z.boolean().optional().default(true).describe('Include action items'),
})

// ============================================
// DAY-OF ASSISTANT SCHEMAS
// ============================================

export const checkInGuestSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  guestId: z.string().uuid().optional().describe('Guest UUID'),
  guestName: z.string().optional().describe('Guest name for fuzzy matching'),
  guestNumber: z.number().int().positive().optional().describe('Guest list number'),
  eventId: z.string().uuid().optional().describe('Event UUID'),
})

// ============================================
// RECOMMENDATIONS SCHEMA
// ============================================

export const getRecommendationsSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  categories: z.array(z.enum(['payments', 'rsvp', 'seating', 'timeline', 'vendors', 'all'])).optional(),
})

// ============================================
// TRANSPORT ASSIGNMENT SCHEMAS
// ============================================

export const assignTransportSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  vehicleInfo: z.string().min(1).max(200).describe('Vehicle description'),
  vehicleType: z.enum(['sedan', 'suv', 'bus', 'van', 'tempo', 'shuttle', 'other']).optional(),
  hotelName: z.string().optional().describe('Filter guests by hotel'),
  groupName: z.string().optional().describe('Filter guests by group'),
  eventId: z.string().uuid().optional().describe('Event UUID'),
  eventName: z.string().optional().describe('Event name for matching'),
  guestIds: z.array(z.string().uuid()).optional().describe('Specific guest UUIDs'),
  pickupDate: z.string().optional().describe('Pickup date'),
  pickupTime: z.string().optional().describe('Pickup time'),
  pickupFrom: z.string().optional().describe('Pickup location'),
  dropTo: z.string().optional().describe('Drop-off location'),
  driverPhone: z.string().optional().describe('Driver phone'),
  notes: z.string().max(500).optional(),
})

// ============================================
// MULTI-EVENT GUEST ASSIGNMENT SCHEMAS
// ============================================

export const assignGuestsToEventsSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  eventIds: z.array(z.string().uuid()).optional().describe('Event UUIDs'),
  eventNames: z.array(z.string()).optional().describe('Event names for matching'),
  lastName: z.string().optional().describe('Filter by last name'),
  groupName: z.string().optional().describe('Filter by group'),
  guestIds: z.array(z.string().uuid()).optional().describe('Specific guest UUIDs'),
  side: z.enum(['partner1', 'partner2', 'mutual']).optional(),
  rsvpStatus: z.enum(['pending', 'confirmed', 'declined', 'maybe']).optional(),
  replaceExisting: z.boolean().optional().default(false),
})

// ============================================
// PHASE 1: QUERY ENHANCEMENT SCHEMAS
// ============================================

export const queryDataSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  entityType: z.enum(['guests', 'events', 'vendors', 'budget', 'timeline', 'hotels', 'gifts', 'tasks']).describe('Entity type to query'),
  operation: z.enum(['count', 'sum', 'avg', 'list', 'group_by']).describe('Operation to perform'),
  field: z.string().optional().describe('Field to aggregate'),
  groupByField: z.string().optional().describe('Field to group by'),
  filters: z.object({
    status: z.string().optional(),
    category: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    paymentStatus: z.enum(['pending', 'deposit_paid', 'partial', 'paid']).optional(),
    rsvpStatus: z.enum(['pending', 'confirmed', 'declined', 'maybe']).optional(),
    mealPreference: z.enum(['standard', 'vegetarian', 'vegan', 'gluten_free', 'kosher', 'halal', 'other']).optional(),
    eventId: z.string().uuid().optional(),
    side: z.enum(['partner1', 'partner2', 'mutual']).optional(),
  }).optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
})

export const queryCrossClientEventsSchema = z.object({
  dateFrom: z.string().optional().describe('Start date'),
  dateTo: z.string().optional().describe('End date'),
  eventType: z.enum(['Wedding', 'Mehendi', 'Sangeet', 'Haldi', 'Reception', 'Rehearsal Dinner', 'Engagement', 'Bachelor Party', 'Bridal Shower', 'Other']).optional(),
  status: z.enum(['planned', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
  limit: z.number().int().positive().max(50).optional().default(20),
})

export const budgetCurrencyConvertSchema = z.object({
  clientId: z.string().uuid().optional(),
  amount: z.number().positive().optional(),
  sourceCurrency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'MXN']).optional(),
  targetCurrency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'MXN']).describe('Target currency'),
  includeBreakdown: z.boolean().optional().default(false),
})

export const getWeatherSchema = z.object({
  clientId: z.string().uuid().optional(),
  date: z.string().optional().describe('Date to check'),
  location: z.string().optional().describe('Location'),
  eventId: z.string().uuid().optional(),
})

// ============================================
// PHASE 2: BULK & MANAGEMENT SCHEMAS
// ============================================

export const bulkAddHotelBookingsSchema = z.object({
  clientId: z.string().uuid().optional(),
  hotelName: z.string().min(1).max(200).describe('Hotel name'),
  roomType: z.string().max(100).optional(),
  checkInDate: z.string().describe('Check-in date'),
  checkOutDate: z.string().describe('Check-out date'),
  roomRate: z.number().positive().optional(),
  guestIds: z.array(z.string().uuid()).optional(),
  groupName: z.string().optional(),
  side: z.enum(['partner1', 'partner2', 'mutual']).optional(),
  needsHotelOnly: z.boolean().optional().default(true),
  roomCount: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
})

export const updateTableDietarySchema = z.object({
  clientId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  tableNumber: z.number().int().positive().describe('Table number'),
  mealPreference: z.enum(['standard', 'vegetarian', 'vegan', 'gluten_free', 'kosher', 'halal', 'other']).describe('Meal preference'),
  dietaryRestrictions: z.string().max(500).optional(),
})

export const addSeatingConstraintSchema = z.object({
  clientId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  constraintType: z.enum(['keep_together', 'keep_apart', 'same_table', 'different_table', 'near_head_table', 'away_from_speakers']).describe('Constraint type'),
  guestIds: z.array(z.string().uuid()).optional(),
  guestNames: z.array(z.string()).optional(),
  groupName: z.string().optional(),
  minimumDistance: z.number().int().positive().optional(),
  priority: z.enum(['low', 'medium', 'high', 'required']).optional().default('medium'),
  reason: z.string().max(500).optional(),
})

export const addGiftSchema = z.object({
  clientId: z.string().uuid().optional(),
  guestId: z.string().uuid().optional(),
  guestName: z.string().optional(),
  name: z.string().min(1).max(200).describe('Gift name'),
  type: z.enum(['physical', 'cash', 'check', 'registry', 'experience', 'other']).optional().default('physical'),
  value: z.number().positive().optional(),
  quantity: z.number().int().positive().optional().default(1),
  notes: z.string().max(500).optional(),
})

export const updateGiftSchema = z.object({
  giftId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  guestName: z.string().optional(),
  giftName: z.string().optional(),
  status: z.enum(['pending', 'received', 'acknowledged', 'returned']).optional(),
  thankYouSent: z.boolean().optional(),
  notes: z.string().max(500).optional(),
})

export const updateCreativeSchema = z.object({
  creativeId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  creativeName: z.string().optional(),
  creativeType: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'review', 'approved', 'rejected', 'completed']).optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected', 'needs_revision']).optional(),
  approvalComments: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
})

export const assignTeamMemberSchema = z.object({
  clientId: z.string().uuid().optional(),
  teamMemberId: z.string().uuid().optional(),
  teamMemberName: z.string().min(1).describe('Team member name'),
  role: z.enum(['lead_planner', 'coordinator', 'assistant', 'vendor_liaison', 'guest_coordinator', 'day_of_coordinator']).optional().default('coordinator'),
  responsibilities: z.array(z.string()).optional(),
})

// ============================================
// PHASE 3: BUSINESS OPERATIONS SCHEMAS
// ============================================

export const createProposalSchema = z.object({
  leadId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  leadName: z.string().optional(),
  title: z.string().min(1).max(200).describe('Proposal title'),
  templateId: z.string().uuid().optional(),
  packageAmount: z.number().positive().optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'MXN']).optional().default('USD'),
  services: z.array(z.string()).optional(),
  validDays: z.number().int().positive().optional().default(30),
  notes: z.string().max(2000).optional(),
})

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  clientName: z.string().optional(),
  amount: z.number().positive().describe('Invoice amount'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'AED', 'MXN']).optional().default('USD'),
  description: z.string().max(500).optional(),
  invoiceType: z.enum(['deposit', 'progress', 'final', 'custom']).optional().default('custom'),
  dueDate: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    amount: z.number(),
  })).optional(),
  notes: z.string().max(1000).optional(),
})

export const exportDataSchema = z.object({
  clientId: z.string().uuid().optional(),
  exportType: z.enum(['guest_list', 'budget', 'vendor_list', 'timeline', 'seating_chart', 'dietary_summary', 'hotel_manifest', 'transport_schedule']).describe('Export type'),
  format: z.enum(['excel', 'pdf', 'csv']).describe('Format'),
  filters: z.object({
    eventId: z.string().uuid().optional(),
    rsvpStatus: z.string().optional(),
    includeContactInfo: z.boolean().optional(),
    includeDietary: z.boolean().optional(),
  }).optional(),
  recipientEmail: z.string().email().optional(),
})

export const updateWebsiteSchema = z.object({
  clientId: z.string().uuid().optional(),
  websiteId: z.string().uuid().optional(),
  section: z.enum(['hero', 'our_story', 'event_details', 'travel', 'registry', 'gallery', 'rsvp', 'faq']).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  settings: z.object({
    theme: z.string().optional(),
    published: z.boolean().optional(),
    passwordProtected: z.boolean().optional(),
    rsvpDeadline: z.string().optional(),
  }).optional(),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  weddingDate: z.string().optional(),
})

export const queryAnalyticsSchema = z.object({
  metric: z.enum(['revenue', 'bookings', 'leads', 'conversions', 'average_deal_size', 'weddings_completed', 'upcoming_weddings']).describe('Metric'),
  period: z.enum(['today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'last_month', 'last_quarter', 'last_year', 'custom']).optional().default('this_month'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'source', 'planner']).optional(),
  compareWithPrevious: z.boolean().optional().default(false),
})

// ============================================
// PHASE 5: AUTOMATION SCHEMAS
// ============================================

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200).describe('Workflow name'),
  description: z.string().max(1000).optional(),
  triggerType: z.enum(['rsvp_received', 'rsvp_confirmed', 'rsvp_declined', 'payment_received', 'payment_overdue', 'event_approaching', 'lead_stage_change', 'client_created', 'proposal_accepted', 'contract_signed', 'scheduled', 'manual']).describe('Trigger type'),
  triggerConfig: z.object({
    daysBeforeEvent: z.number().int().optional(),
    stageId: z.string().uuid().optional(),
    stageName: z.string().optional(),
    scheduleTime: z.string().optional(),
  }).optional(),
  actionType: z.enum(['send_email', 'send_sms', 'create_task', 'update_status', 'notify_team', 'webhook']).describe('Action type'),
  actionConfig: z.object({
    emailTemplateId: z.string().uuid().optional(),
    emailSubject: z.string().optional(),
    emailBody: z.string().optional(),
    smsMessage: z.string().optional(),
    taskTitle: z.string().optional(),
    assignTo: z.string().optional(),
    webhookUrl: z.string().url().optional(),
  }).optional(),
  isActive: z.boolean().optional().default(true),
})

export const generateQrCodesSchema = z.object({
  clientId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  eventName: z.string().optional(),
  guestIds: z.array(z.string().uuid()).optional(),
  rsvpStatusFilter: z.enum(['confirmed', 'all']).optional().default('confirmed'),
  format: z.enum(['pdf', 'images', 'individual']).optional().default('pdf'),
  includeDetails: z.boolean().optional().default(true),
})

// ============================================
// CALENDAR SYNC SCHEMA
// ============================================

export const syncCalendarSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID to sync events for'),
  clientName: z.string().optional().describe('Client name for fuzzy matching'),
  calendarType: z.enum(['google', 'ical']).optional().describe('Calendar type to sync to'),
  eventIds: z.array(z.string().uuid()).optional().describe('Specific event UUIDs to sync'),
  includeTimeline: z.boolean().optional().default(false).describe('Include timeline items as sub-events'),
})

// ============================================
// DOCUMENT UPLOAD SCHEMA
// ============================================

export const getDocumentUploadUrlSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID to upload document for'),
  clientName: z.string().optional().describe('Client name for fuzzy matching'),
  fileName: z.string().min(1).max(255).describe('Name for the document file'),
  fileType: z.enum(['contract', 'invoice', 'photo', 'proposal', 'questionnaire', 'other']).optional().default('other').describe('Type of document'),
  description: z.string().max(500).optional().describe('Description of the document'),
})

// ============================================
// PHASE 6: FULL CRUD COMPLETION SCHEMAS
// ============================================

export const createBudgetItemSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID. Uses current context if not provided'),
  category: z.string().min(1).max(100).describe('Budget category (e.g., Venue, Catering, Photography)'),
  segment: z.enum(['vendors', 'travel', 'creatives', 'artists', 'accommodation', 'other']).optional().describe('Budget segment'),
  item: z.string().min(1).max(200).describe('Budget item name'),
  estimatedCost: z.number().positive().describe('Estimated cost'),
  actualCost: z.number().positive().optional().describe('Actual cost if known'),
  vendorId: z.string().uuid().optional().describe('Associated vendor UUID'),
  eventId: z.string().uuid().optional().describe('Associated event UUID'),
  notes: z.string().max(500).optional().describe('Notes about this budget item'),
  isPerGuestItem: z.boolean().optional().default(false).describe('Whether cost is per guest'),
  perGuestCost: z.number().positive().optional().describe('Cost per guest if isPerGuestItem'),
})

export const updateHotelBookingSchema = z.object({
  hotelBookingId: z.string().uuid().optional().describe('Hotel booking UUID to update'),
  guestName: z.string().optional().describe('Guest name for fuzzy matching'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
  hotelName: z.string().max(200).optional().describe('Hotel name'),
  roomType: z.string().max(100).optional().describe('Room type (e.g., single, double, suite)'),
  checkInDate: z.string().optional().describe('Check-in date (YYYY-MM-DD)'),
  checkOutDate: z.string().optional().describe('Check-out date (YYYY-MM-DD)'),
  roomRate: z.number().positive().optional().describe('Room rate per night'),
  notes: z.string().max(500).optional().describe('Booking notes'),
})

export const deleteHotelBookingSchema = z.object({
  hotelBookingId: z.string().uuid().optional().describe('Hotel booking UUID to delete'),
  guestName: z.string().optional().describe('Guest name for fuzzy matching'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
})

export const updateTransportSchema = z.object({
  transportId: z.string().uuid().optional().describe('Transport record UUID to update'),
  guestName: z.string().optional().describe('Guest name for fuzzy matching'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
  pickupDate: z.string().optional().describe('Pickup date (YYYY-MM-DD)'),
  pickupTime: z.string().optional().describe('Pickup time (HH:MM)'),
  pickupFrom: z.string().max(200).optional().describe('Pickup location'),
  dropTo: z.string().max(200).optional().describe('Drop-off location'),
  driverPhone: z.string().max(20).optional().describe('Driver phone number'),
  notes: z.string().max(500).optional().describe('Transport notes'),
})

export const deleteTransportSchema = z.object({
  transportId: z.string().uuid().optional().describe('Transport record UUID to delete'),
  guestName: z.string().optional().describe('Guest name for fuzzy matching'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
})

export const updateTimelineItemSchema = z.object({
  timelineItemId: z.string().uuid().describe('Timeline item UUID to update'),
  title: z.string().min(1).max(200).optional().describe('Timeline item title'),
  description: z.string().max(500).optional().describe('Description'),
  startTime: z.string().optional().describe('Start time (HH:MM or ISO datetime)'),
  endTime: z.string().optional().describe('End time (HH:MM or ISO datetime)'),
  durationMinutes: z.number().int().positive().optional().describe('Duration in minutes'),
  location: z.string().max(200).optional().describe('Location'),
  assignee: z.string().max(100).optional().describe('Responsible person'),
  phase: z.enum(['setup', 'showtime', 'wrapup']).optional().describe('Event phase'),
  completed: z.boolean().optional().describe('Whether item is completed'),
})

export const deleteSeatingConstraintSchema = z.object({
  constraintId: z.string().uuid().describe('Seating constraint UUID to remove'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
})

export const updateProposalSchema = z.object({
  proposalId: z.string().uuid().describe('Proposal UUID to update'),
  title: z.string().max(200).optional().describe('Proposal title'),
  content: z.string().optional().describe('Proposal content'),
  packageAmount: z.number().positive().optional().describe('Package total amount'),
  currency: z.string().max(3).optional().describe('Currency code (e.g., USD, INR)'),
  validDays: z.number().int().positive().optional().describe('Days until proposal expires'),
  notes: z.string().max(500).optional().describe('Internal notes'),
})

export const deleteProposalSchema = z.object({
  proposalId: z.string().uuid().describe('Proposal UUID to delete'),
})

export const createContractSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  title: z.string().min(1).max(200).describe('Contract title'),
  content: z.string().optional().describe('Contract content/body'),
  templateId: z.string().uuid().optional().describe('Template UUID to use'),
  totalAmount: z.number().positive().optional().describe('Total contract amount'),
  depositAmount: z.number().positive().optional().describe('Required deposit amount'),
  currency: z.string().max(3).optional().default('USD').describe('Currency code'),
  validDays: z.number().int().positive().optional().default(30).describe('Days until contract expires'),
})

export const updateContractSchema = z.object({
  contractId: z.string().uuid().describe('Contract UUID to update'),
  title: z.string().max(200).optional().describe('Contract title'),
  content: z.string().optional().describe('Contract content'),
  totalAmount: z.number().positive().optional().describe('Total amount'),
  depositAmount: z.number().positive().optional().describe('Deposit amount'),
  status: z.enum(['draft', 'sent', 'viewed', 'signed', 'countersigned', 'completed', 'expired', 'cancelled']).optional().describe('Contract status'),
})

export const deleteContractSchema = z.object({
  contractId: z.string().uuid().describe('Contract UUID to delete'),
})

export const updateInvoiceSchema = z.object({
  invoiceId: z.string().uuid().describe('Invoice UUID to update'),
  amount: z.number().positive().optional().describe('Invoice amount'),
  dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional().describe('Invoice status'),
})

export const deleteInvoiceSchema = z.object({
  invoiceId: z.string().uuid().describe('Invoice UUID to delete'),
})

export const createQuestionnaireSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  title: z.string().min(1).max(200).describe('Questionnaire title'),
  description: z.string().max(500).optional().describe('Description'),
  templateId: z.string().uuid().optional().describe('Template UUID to copy questions from'),
  category: z.string().max(100).optional().describe('Questionnaire category'),
})

export const updateQuestionnaireSchema = z.object({
  questionnaireId: z.string().uuid().describe('Questionnaire UUID to update'),
  title: z.string().max(200).optional().describe('Questionnaire title'),
  description: z.string().max(500).optional().describe('Description'),
  status: z.enum(['draft', 'sent', 'completed', 'expired']).optional().describe('Questionnaire status'),
})

export const deleteQuestionnaireSchema = z.object({
  questionnaireId: z.string().uuid().describe('Questionnaire UUID to delete'),
})

export const updateWorkflowSchema = z.object({
  workflowId: z.string().uuid().describe('Workflow UUID to update'),
  name: z.string().max(200).optional().describe('Workflow name'),
  description: z.string().max(500).optional().describe('Workflow description'),
  isActive: z.boolean().optional().describe('Whether workflow is active'),
})

export const deleteWorkflowSchema = z.object({
  workflowId: z.string().uuid().describe('Workflow UUID to delete'),
})

export const createWebsiteSchema = z.object({
  clientId: z.string().uuid().describe('Client UUID'),
  subdomain: z.string().min(3).max(50).optional().describe('Website subdomain (auto-generated if not provided)'),
  theme: z.enum(['classic', 'modern', 'elegant', 'rustic', 'minimalist']).optional().default('modern').describe('Website theme'),
})

export const deleteWebsiteSchema = z.object({
  websiteId: z.string().uuid().describe('Wedding website UUID to delete'),
})

export const createPipelineLeadSchema = z.object({
  firstName: z.string().min(1).max(100).describe('Lead first name'),
  lastName: z.string().max(100).optional().describe('Lead last name'),
  email: z.string().email().optional().describe('Lead email'),
  phone: z.string().max(20).optional().describe('Lead phone'),
  weddingDate: z.string().optional().describe('Expected wedding date (YYYY-MM-DD)'),
  estimatedBudget: z.number().positive().optional().describe('Estimated budget'),
  source: z.string().max(100).optional().describe('Lead source (e.g., referral, website, social)'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium').describe('Lead priority'),
  notes: z.string().max(500).optional().describe('Notes about the lead'),
  stageId: z.string().uuid().optional().describe('Pipeline stage UUID (uses default if not provided)'),
})

export const deletePipelineLeadSchema = z.object({
  leadId: z.string().uuid().describe('Pipeline lead UUID to delete'),
})

export const createCreativeSchema = z.object({
  clientId: z.string().uuid().describe('Client UUID'),
  title: z.string().min(1).max(200).describe('Creative job title'),
  jobType: z.enum(['video', 'photo', 'graphic', 'invitation', 'other']).describe('Type of creative job'),
  description: z.string().max(500).optional().describe('Job description'),
  dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium').describe('Job priority'),
  assignedTo: z.string().max(100).optional().describe('Assigned team member name'),
})

export const deleteCreativeSchema = z.object({
  creativeId: z.string().uuid().describe('Creative job UUID to delete'),
})

// ============================================
// DELETE SCHEMAS
// ============================================

export const deleteGuestSchema = z.object({
  guestId: z.string().uuid().optional().describe('Guest UUID to delete'),
  guestName: z.string().optional().describe('Guest name for fuzzy matching'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
})

export const deleteEventSchema = z.object({
  eventId: z.string().uuid().optional().describe('Event UUID to delete'),
  eventName: z.string().optional().describe('Event name for fuzzy matching'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
})

export const deleteVendorSchema = z.object({
  vendorId: z.string().uuid().optional().describe('Vendor UUID to delete'),
  vendorName: z.string().optional().describe('Vendor name for fuzzy matching'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
})

export const deleteBudgetItemSchema = z.object({
  budgetItemId: z.string().uuid().describe('Budget item UUID to delete'),
})

export const deleteTimelineItemSchema = z.object({
  timelineItemId: z.string().uuid().describe('Timeline item UUID to delete'),
})

export const deleteGiftSchema = z.object({
  giftId: z.string().uuid().describe('Gift UUID to delete'),
})

export const deleteClientSchema = z.object({
  clientId: z.string().uuid().describe('Client UUID to delete. This permanently removes all related data across 19 tables.'),
})

// ============================================
// DOCUMENT MANAGEMENT SCHEMAS
// ============================================

export const createDocumentSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  clientName: z.string().optional().describe('Client name for fuzzy matching'),
  fileName: z.string().min(1).max(255).describe('Document file name'),
  fileType: z.enum(['contract', 'invoice', 'photo', 'proposal', 'questionnaire', 'other']).optional().default('other').describe('Type of document'),
  description: z.string().max(500).optional().describe('Description of the document'),
  storagePath: z.string().min(1).describe('Storage path or URL for the document'),
})

export const updateDocumentSchema = z.object({
  documentId: z.string().uuid().describe('Document UUID to update'),
  fileName: z.string().min(1).max(255).optional().describe('New file name'),
  description: z.string().max(500).optional().describe('Updated description'),
})

export const deleteDocumentSchema = z.object({
  documentId: z.string().uuid().describe('Document UUID to delete'),
})

export const requestSignatureSchema = z.object({
  documentId: z.string().uuid().describe('Document UUID to request signatures for'),
  title: z.string().min(1).max(200).describe('Signature request title'),
  message: z.string().max(1000).optional().describe('Message to include with signature request'),
  signingOrder: z.enum(['parallel', 'sequential']).optional().default('parallel').describe('Order in which signers should sign'),
  signers: z.array(z.object({
    name: z.string().min(1).max(100).describe('Signer name'),
    email: z.string().email().describe('Signer email address'),
    role: z.string().max(100).optional().describe('Signer role (e.g., "Client", "Vendor")'),
  })).min(1).describe('List of signers'),
})

export const sendSignatureReminderSchema = z.object({
  requestId: z.string().uuid().describe('Signature request UUID to send reminder for'),
})

export const cancelSignatureRequestSchema = z.object({
  requestId: z.string().uuid().describe('Signature request UUID to cancel'),
  reason: z.string().max(500).optional().describe('Reason for cancellation'),
})

export const getDocumentAuditTrailSchema = z.object({
  documentId: z.string().uuid().describe('Document UUID to get audit trail for'),
})

// ============================================
// PAYMENT SCHEMAS
// ============================================

export const recordPaymentSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  clientName: z.string().optional().describe('Client name for fuzzy matching'),
  invoiceId: z.string().uuid().optional().describe('Invoice UUID to apply payment to'),
  amount: z.number().positive().describe('Payment amount'),
  currency: z.string().max(3).optional().default('USD').describe('Currency code (e.g., USD, INR)'),
  paymentMethod: z.enum(['card', 'bank_transfer', 'cash', 'check', 'other']).optional().describe('Payment method'),
  notes: z.string().max(500).optional().describe('Payment notes'),
})

export const getPaymentStatsSchema = z.object({
  clientId: z.string().uuid().optional().describe('Client UUID'),
  period: z.enum(['this_month', 'this_quarter', 'this_year', 'all']).optional().default('all').describe('Time period to filter'),
})

export const createRefundSchema = z.object({
  paymentId: z.string().uuid().describe('Payment UUID to refund'),
  amount: z.number().positive().optional().describe('Refund amount (defaults to full payment amount)'),
  reason: z.string().max(500).optional().describe('Reason for refund'),
})

// ============================================
// FLOOR PLAN SCHEMAS
// ============================================

export const createFloorPlanSchema = z.object({
  clientId: z.string().uuid().describe('Client UUID'),
  eventId: z.string().uuid().optional().describe('Event UUID to associate floor plan with'),
  eventName: z.string().optional().describe('Event name for fuzzy matching'),
  name: z.string().min(1).max(200).describe('Floor plan name'),
  width: z.number().positive().optional().default(800).describe('Floor plan width in pixels'),
  height: z.number().positive().optional().default(600).describe('Floor plan height in pixels'),
})

export const addTableToFloorPlanSchema = z.object({
  floorPlanId: z.string().uuid().describe('Floor plan UUID'),
  tableNumber: z.string().min(1).max(50).describe('Table number or label'),
  tableName: z.string().max(100).optional().describe('Display name for the table'),
  tableShape: z.enum(['round', 'rectangle', 'square', 'oval']).optional().default('round').describe('Table shape'),
  capacity: z.number().int().positive().optional().default(10).describe('Table seating capacity'),
  isVip: z.boolean().optional().default(false).describe('Whether this is a VIP table'),
})

export const removeTableFromFloorPlanSchema = z.object({
  floorPlanId: z.string().uuid().describe('Floor plan UUID'),
  tableId: z.string().uuid().describe('Table UUID to remove'),
})

export const assignGuestToTableSchema = z.object({
  floorPlanId: z.string().uuid().describe('Floor plan UUID'),
  tableId: z.string().uuid().optional().describe('Table UUID to assign guest to'),
  tableNumber: z.string().optional().describe('Table number for matching'),
  guestId: z.string().uuid().optional().describe('Guest UUID to assign'),
  guestName: z.string().optional().describe('Guest name for fuzzy matching'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
  seatNumber: z.number().int().positive().optional().describe('Specific seat number at the table'),
})

export const batchAssignGuestsSchema = z.object({
  floorPlanId: z.string().uuid().describe('Floor plan UUID'),
  assignments: z.array(z.object({
    guestId: z.string().uuid().optional().describe('Guest UUID'),
    guestName: z.string().optional().describe('Guest name for fuzzy matching'),
    tableId: z.string().uuid().optional().describe('Table UUID'),
    tableNumber: z.string().optional().describe('Table number for matching'),
  })).min(1).describe('List of guest-to-table assignments'),
})

// ============================================
// PIPELINE ENHANCEMENT SCHEMAS
// ============================================

export const createPipelineStageSchema = z.object({
  name: z.string().min(1).max(100).describe('Stage name'),
  description: z.string().max(500).optional().describe('Stage description'),
  color: z.string().max(20).optional().describe('Stage color (hex or CSS color name)'),
  isWon: z.boolean().optional().default(false).describe('Whether this stage represents a won deal'),
  isLost: z.boolean().optional().default(false).describe('Whether this stage represents a lost deal'),
})

export const convertLeadToClientSchema = z.object({
  leadId: z.string().uuid().describe('Pipeline lead UUID to convert'),
  weddingDate: z.string().optional().describe('Wedding date in ISO format (YYYY-MM-DD)'),
  venue: z.string().max(200).optional().describe('Wedding venue name'),
  budget: z.number().positive().optional().describe('Total wedding budget'),
  guestCount: z.number().int().positive().optional().describe('Expected guest count'),
  weddingType: z.string().max(50).optional().describe('Type of wedding'),
})

export const createPipelineActivitySchema = z.object({
  leadId: z.string().uuid().describe('Pipeline lead UUID'),
  type: z.enum(['note', 'call', 'email', 'meeting', 'task', 'follow_up']).describe('Activity type'),
  title: z.string().min(1).max(200).describe('Activity title'),
  description: z.string().max(2000).optional().describe('Activity description or notes'),
})

// ============================================
// FEATURE QUERY SCHEMAS
// ============================================

export const getQuestionnaireResponsesSchema = z.object({
  questionnaireId: z.string().uuid().describe('Questionnaire UUID to get responses for'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
})

export const getWebsiteAnalyticsSchema = z.object({
  websiteId: z.string().uuid().optional().describe('Website UUID'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
  period: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d').describe('Analytics period'),
})

export const getFloorPlanSummarySchema = z.object({
  floorPlanId: z.string().uuid().optional().describe('Floor plan UUID'),
  clientId: z.string().uuid().optional().describe('Client UUID for context'),
})

// ============================================
// TOOL TYPE DEFINITIONS
// ============================================

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type GetClientSummaryInput = z.infer<typeof getClientSummarySchema>
export type AddGuestInput = z.infer<typeof addGuestSchema>
export type UpdateGuestRsvpInput = z.infer<typeof updateGuestRsvpSchema>
export type GetGuestStatsInput = z.infer<typeof getGuestStatsSchema>
export type BulkUpdateGuestsInput = z.infer<typeof bulkUpdateGuestsSchema>
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type AddTimelineItemInput = z.infer<typeof addTimelineItemSchema>
export type ShiftTimelineInput = z.infer<typeof shiftTimelineSchema>
export type AddVendorInput = z.infer<typeof addVendorSchema>
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>
export type AddHotelBookingInput = z.infer<typeof addHotelBookingSchema>
export type SyncHotelGuestsInput = z.infer<typeof syncHotelGuestsSchema>
export type GetBudgetOverviewInput = z.infer<typeof getBudgetOverviewSchema>
export type UpdateBudgetItemInput = z.infer<typeof updateBudgetItemSchema>
export type SearchEntitiesInput = z.infer<typeof searchEntitiesSchema>
export type SendCommunicationInput = z.infer<typeof sendCommunicationSchema>
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>
export type GetWeddingSummaryInput = z.infer<typeof getWeddingSummarySchema>
export type CheckInGuestInput = z.infer<typeof checkInGuestSchema>
export type GetRecommendationsInput = z.infer<typeof getRecommendationsSchema>
export type AssignTransportInput = z.infer<typeof assignTransportSchema>
export type AssignGuestsToEventsInput = z.infer<typeof assignGuestsToEventsSchema>

// Phase 1: Query Enhancement Types
export type QueryDataInput = z.infer<typeof queryDataSchema>
export type QueryCrossClientEventsInput = z.infer<typeof queryCrossClientEventsSchema>
export type BudgetCurrencyConvertInput = z.infer<typeof budgetCurrencyConvertSchema>
export type GetWeatherInput = z.infer<typeof getWeatherSchema>

// Phase 2: Bulk & Management Types
export type BulkAddHotelBookingsInput = z.infer<typeof bulkAddHotelBookingsSchema>
export type UpdateTableDietaryInput = z.infer<typeof updateTableDietarySchema>
export type AddSeatingConstraintInput = z.infer<typeof addSeatingConstraintSchema>
export type AddGiftInput = z.infer<typeof addGiftSchema>
export type UpdateGiftInput = z.infer<typeof updateGiftSchema>
export type UpdateCreativeInput = z.infer<typeof updateCreativeSchema>
export type AssignTeamMemberInput = z.infer<typeof assignTeamMemberSchema>

// Phase 3: Business Operations Types
export type CreateProposalInput = z.infer<typeof createProposalSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type ExportDataInput = z.infer<typeof exportDataSchema>
export type UpdateWebsiteInput = z.infer<typeof updateWebsiteSchema>
export type QueryAnalyticsInput = z.infer<typeof queryAnalyticsSchema>

// Phase 5: Automation Types
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>
export type GenerateQrCodesInput = z.infer<typeof generateQrCodesSchema>

// Phase 6: Full CRUD Completion Types
export type CreateBudgetItemInput = z.infer<typeof createBudgetItemSchema>
export type UpdateHotelBookingInput = z.infer<typeof updateHotelBookingSchema>
export type DeleteHotelBookingInput = z.infer<typeof deleteHotelBookingSchema>
export type UpdateTransportInput = z.infer<typeof updateTransportSchema>
export type DeleteTransportInput = z.infer<typeof deleteTransportSchema>
export type UpdateTimelineItemInput = z.infer<typeof updateTimelineItemSchema>
export type DeleteSeatingConstraintInput = z.infer<typeof deleteSeatingConstraintSchema>
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>
export type DeleteProposalInput = z.infer<typeof deleteProposalSchema>
export type CreateContractInput = z.infer<typeof createContractSchema>
export type UpdateContractInput = z.infer<typeof updateContractSchema>
export type DeleteContractInput = z.infer<typeof deleteContractSchema>
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>
export type DeleteInvoiceInput = z.infer<typeof deleteInvoiceSchema>
export type CreateQuestionnaireInput = z.infer<typeof createQuestionnaireSchema>
export type UpdateQuestionnaireInput = z.infer<typeof updateQuestionnaireSchema>
export type DeleteQuestionnaireInput = z.infer<typeof deleteQuestionnaireSchema>
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>
export type DeleteWorkflowInput = z.infer<typeof deleteWorkflowSchema>
export type CreateWebsiteInput = z.infer<typeof createWebsiteSchema>
export type DeleteWebsiteInput = z.infer<typeof deleteWebsiteSchema>
export type CreatePipelineLeadInput = z.infer<typeof createPipelineLeadSchema>
export type DeletePipelineLeadInput = z.infer<typeof deletePipelineLeadSchema>
export type CreateCreativeInput = z.infer<typeof createCreativeSchema>
export type DeleteCreativeInput = z.infer<typeof deleteCreativeSchema>

// Calendar & Documents Types
export type SyncCalendarInput = z.infer<typeof syncCalendarSchema>
export type GetDocumentUploadUrlInput = z.infer<typeof getDocumentUploadUrlSchema>

// Delete Types
export type DeleteGuestInput = z.infer<typeof deleteGuestSchema>
export type DeleteEventInput = z.infer<typeof deleteEventSchema>
export type DeleteVendorInput = z.infer<typeof deleteVendorSchema>
export type DeleteBudgetItemInput = z.infer<typeof deleteBudgetItemSchema>
export type DeleteTimelineItemInput = z.infer<typeof deleteTimelineItemSchema>
export type DeleteGiftInput = z.infer<typeof deleteGiftSchema>
export type DeleteClientInput = z.infer<typeof deleteClientSchema>

// Document Management Types
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
export type DeleteDocumentInput = z.infer<typeof deleteDocumentSchema>
export type RequestSignatureInput = z.infer<typeof requestSignatureSchema>
export type SendSignatureReminderInput = z.infer<typeof sendSignatureReminderSchema>
export type CancelSignatureRequestInput = z.infer<typeof cancelSignatureRequestSchema>
export type GetDocumentAuditTrailInput = z.infer<typeof getDocumentAuditTrailSchema>

// Payment Types
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type GetPaymentStatsInput = z.infer<typeof getPaymentStatsSchema>
export type CreateRefundInput = z.infer<typeof createRefundSchema>

// Floor Plan Types
export type CreateFloorPlanInput = z.infer<typeof createFloorPlanSchema>
export type AddTableToFloorPlanInput = z.infer<typeof addTableToFloorPlanSchema>
export type RemoveTableFromFloorPlanInput = z.infer<typeof removeTableFromFloorPlanSchema>
export type AssignGuestToTableInput = z.infer<typeof assignGuestToTableSchema>
export type BatchAssignGuestsInput = z.infer<typeof batchAssignGuestsSchema>

// Pipeline Enhancement Types
export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>
export type ConvertLeadToClientInput = z.infer<typeof convertLeadToClientSchema>
export type CreatePipelineActivityInput = z.infer<typeof createPipelineActivitySchema>

// Feature Query Types
export type GetQuestionnaireResponsesInput = z.infer<typeof getQuestionnaireResponsesSchema>
export type GetWebsiteAnalyticsInput = z.infer<typeof getWebsiteAnalyticsSchema>
export type GetFloorPlanSummaryInput = z.infer<typeof getFloorPlanSummarySchema>
