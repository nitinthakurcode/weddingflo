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
  dressCode: z.string().max(200).optional().describe('Dress code'),
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

// Calendar & Documents Types
export type SyncCalendarInput = z.infer<typeof syncCalendarSchema>
export type GetDocumentUploadUrlInput = z.infer<typeof getDocumentUploadUrlSchema>
