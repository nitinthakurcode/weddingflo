import { pgTable, text, timestamp, boolean, integer, jsonb, real, uuid, numeric, varchar, time, pgEnum, index } from 'drizzle-orm/pg-core';

/**
 * Feature Schema
 *
 * December 2025 - Additional tables for WeddingFlo features
 */

// Custom Users table (extends BetterAuth user table)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  authId: text('auth_id').unique(), // BetterAuth user ID reference
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('company_admin'),
  companyId: text('company_id'),
  isActive: boolean('is_active').default(true),
  preferredLanguage: text('preferred_language').default('en'),
  preferredCurrency: text('preferred_currency').default('USD'),
  timezone: text('timezone').default('UTC'),
  autoDetectLocale: boolean('auto_detect_locale').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Companies table - synced with database schema
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  subdomain: text('subdomain').unique(),
  logoUrl: text('logo_url'),
  branding: jsonb('branding'),
  settings: jsonb('settings'),
  subscriptionTier: text('subscription_tier').default('free'),
  subscriptionStatus: text('subscription_status').default('trialing'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  trialEndsAt: timestamp('trial_ends_at'),
  subscriptionEndsAt: timestamp('subscription_ends_at'),
  aiQueriesThisMonth: integer('ai_queries_this_month').default(0),
  aiLastResetAt: timestamp('ai_last_reset_at'),
  defaultCurrency: varchar('default_currency', { length: 10 }).default('INR'),
  supportedCurrencies: text('supported_currencies').array(),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingStep: integer('onboarding_step').default(1),
  onboardingStartedAt: timestamp('onboarding_started_at'),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
  onboardingData: jsonb('onboarding_data'),
  businessType: text('business_type').default('wedding_planner'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Clients (weddings/events)
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  // Partner 1 (Bride) details
  partner1FirstName: text('partner1_first_name').notNull(),
  partner1LastName: text('partner1_last_name'),
  partner1Email: text('partner1_email'),
  partner1Phone: text('partner1_phone'),
  partner1FatherName: text('partner1_father_name'),
  partner1MotherName: text('partner1_mother_name'),
  // Partner 2 (Groom) details
  partner2FirstName: text('partner2_first_name'),
  partner2LastName: text('partner2_last_name'),
  partner2Email: text('partner2_email'),
  partner2Phone: text('partner2_phone'),
  partner2FatherName: text('partner2_father_name'),
  partner2MotherName: text('partner2_mother_name'),
  // Wedding details
  weddingName: text('wedding_name'),
  weddingDate: text('wedding_date'),
  venue: text('venue'),
  budget: text('budget'),
  guestCount: integer('guest_count'),
  status: text('status').default('planning'),
  notes: text('notes'),
  // Planning context
  planningSide: text('planning_side').default('both'),
  weddingType: text('wedding_type').default('traditional'),
  // Metadata
  createdBy: text('created_by'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('clients_company_id_idx').on(table.companyId),
]);

// Client Users (relationship between clients and users)
export const clientUsers = pgTable('client_users', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').default('viewer'),
  relationship: text('relationship'),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Guests
export const guests = pgTable('guests', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull().default(''),
  email: text('email'),
  phone: text('phone'),
  groupName: text('group_name'),
  tableNumber: integer('table_number'),
  serialNumber: integer('serial_number'),
  dietaryRestrictions: text('dietary_restrictions'),
  mealPreference: text('meal_preference').default('standard'),
  rsvpStatus: text('rsvp_status').notNull().default('pending'),
  plusOneAllowed: boolean('plus_one_allowed').notNull().default(false),
  plusOneName: text('plus_one_name'),
  plusOneRsvp: text('plus_one_rsvp'),
  plusOneMealPreference: text('plus_one_meal_preference'),
  partySize: integer('party_size').default(1),
  additionalGuestNames: text('additional_guest_names').array(),
  arrivalDatetime: timestamp('arrival_datetime', { withTimezone: true }),
  arrivalMode: text('arrival_mode'),
  departureDatetime: timestamp('departure_datetime', { withTimezone: true }),
  departureMode: text('departure_mode'),
  hotelRequired: boolean('hotel_required').default(false),
  hotelName: text('hotel_name'),
  hotelCheckIn: text('hotel_check_in'),
  hotelCheckOut: text('hotel_check_out'),
  hotelRoomType: text('hotel_room_type'),
  transportRequired: boolean('transport_required').default(false),
  transportType: text('transport_type'),
  transportPickupLocation: text('transport_pickup_location'),
  transportPickupTime: text('transport_pickup_time'),
  transportNotes: text('transport_notes'),
  relationshipToFamily: text('relationship_to_family'),
  attendingEvents: text('attending_events').array(),
  giftToGive: text('gift_to_give'),
  checkedIn: boolean('checked_in').default(false),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  guestSide: text('guest_side').default('mutual'),
}, (table) => [
  index('guests_client_id_idx').on(table.clientId),
  index('guests_rsvp_status_idx').on(table.rsvpStatus),
]);

// Hotels (guest accommodation tracking)
export const hotels = pgTable('hotels', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull(),
  guestId: uuid('guest_id'),
  guestName: text('guest_name').notNull(),
  accommodationId: uuid('accommodation_id'), // Links to accommodations table
  hotelName: text('hotel_name'),
  roomNumber: text('room_number'),
  roomType: text('room_type'),
  checkInDate: text('check_in_date'),
  checkOutDate: text('check_out_date'),
  accommodationNeeded: boolean('accommodation_needed').default(true),
  bookingConfirmed: boolean('booking_confirmed').default(false),
  checkedIn: boolean('checked_in').default(false),
  cost: numeric('cost', { precision: 15, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  paymentStatus: text('payment_status').default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
  partySize: integer('party_size').default(1),
  guestNamesInRoom: text('guest_names_in_room'),
  roomAssignments: jsonb('room_assignments').default('{}'),
}, (table) => [
  index('hotels_client_id_idx').on(table.clientId),
  index('hotels_guest_id_idx').on(table.guestId),
]);

// Transport leg type enum
export const transportLegTypeEnum = pgEnum('transport_leg_type', ['arrival', 'departure', 'inter_event']);

// Guest Transport
export const guestTransport = pgTable('guest_transport', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull(),
  guestId: uuid('guest_id').notNull(),
  guestName: text('guest_name').notNull(),
  pickupDate: text('pickup_date'),
  pickupTime: time('pickup_time'),
  pickupFrom: text('pickup_from'),
  dropTo: text('drop_to'),
  transportStatus: text('transport_status').default('scheduled'),
  vehicleInfo: text('vehicle_info'),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  legType: transportLegTypeEnum('leg_type').default('arrival'),
  legSequence: integer('leg_sequence').default(1),
  eventId: uuid('event_id'),
}, (table) => [
  index('guest_transport_client_id_idx').on(table.clientId),
  index('guest_transport_guest_id_idx').on(table.guestId),
]);

// Events
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  title: text('title').notNull(),
  eventType: text('event_type'),
  eventDate: text('event_date'),
  venueName: text('venue_name'),
  guestCount: integer('guest_count'),
  status: text('status').default('planned'),
  description: text('description'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Timeline - Cross-module synced entries for wedding day schedule
export const timeline = pgTable('timeline', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  durationMinutes: integer('duration_minutes'),
  location: text('location'),
  participants: text('participants').array(), // Array of participant names
  responsiblePerson: text('responsible_person'),
  completed: boolean('completed').default(false),
  sortOrder: integer('sort_order').default(0),
  notes: text('notes'),
  // Cross-module sync columns - allows efficient DB queries for linked records
  sourceModule: text('source_module'), // 'events', 'vendors', 'transport', 'hotels', 'budget'
  sourceId: text('source_id'), // UUID of the source record
  metadata: text('metadata'), // JSON string for additional source module info
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'), // Soft delete support
});

// Vendors
export const vendors = pgTable('vendors', {
  id: text('id').primaryKey(),
  companyId: text('company_id'),
  name: text('name').notNull(),
  category: text('category'),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  website: text('website'),
  address: text('address'),
  contractSigned: boolean('contract_signed').default(false),
  contractDate: text('contract_date'),
  notes: text('notes'),
  rating: integer('rating'),
  isPreferred: boolean('is_preferred').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Client Vendors (relationship) - Links vendors to clients with contract/payment details
export const clientVendors = pgTable('client_vendors', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  vendorId: text('vendor_id').notNull(),
  eventId: uuid('event_id'), // Links vendor to specific event
  status: text('status').default('active'),
  // Contract & Payment Details
  contractAmount: text('contract_amount'), // Total contract value
  depositAmount: text('deposit_amount'),
  depositPaid: boolean('deposit_paid').default(false),
  paymentStatus: text('payment_status').default('pending'), // pending, paid, overdue
  serviceDate: text('service_date'),
  contractSignedAt: timestamp('contract_signed_at'),
  // Venue/On-site Details
  venueAddress: text('venue_address'),
  onsitePocName: text('onsite_poc_name'),
  onsitePocPhone: text('onsite_poc_phone'),
  onsitePocNotes: text('onsite_poc_notes'),
  // Deliverables & Approval
  deliverables: text('deliverables'),
  approvalStatus: text('approval_status').default('pending'), // pending, approved, rejected
  approvalComments: text('approval_comments'),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Vendor Comments
export const vendorComments = pgTable('vendor_comments', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id').notNull(),
  userId: text('user_id').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Budget - Linked to vendors for seamless bidirectional sync
export const budget = pgTable('budget', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  vendorId: text('vendor_id'), // Links to vendors table for sync
  eventId: uuid('event_id'), // Links to events table
  category: text('category').notNull(),
  segment: text('segment'), // vendors, travel, creatives, artists, accommodation, other
  item: text('item'),
  description: text('description'),
  expenseDetails: text('expense_details'),
  estimatedCost: text('estimated_cost'),
  actualCost: text('actual_cost'),
  paidAmount: text('paid_amount').default('0'),
  paymentStatus: text('payment_status').default('pending'), // pending, paid, overdue
  transactionDate: text('transaction_date'),
  paymentDate: timestamp('payment_date'),
  clientVisible: boolean('client_visible').default(true),
  isLumpSum: boolean('is_lump_sum').default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Advance Payments - Linked to budget items for payment tracking
export const advancePayments = pgTable('advance_payments', {
  id: text('id').primaryKey(),
  budgetItemId: text('budget_item_id'), // Links to budget.id
  budgetId: text('budget_id'), // Legacy field
  vendorId: text('vendor_id'),
  amount: text('amount').notNull(), // Store as text for precision
  paymentDate: text('payment_date'),
  paymentMode: text('payment_mode'), // Cash, Bank Transfer, UPI, Check, Credit Card, Other
  paidBy: text('paid_by'),
  notes: text('notes'),
  date: timestamp('date'), // Legacy field
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Documents
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  name: text('name').notNull(),
  url: text('url'),
  type: text('type'),
  size: integer('size'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Calendar Sync Settings
export const calendarSyncSettings = pgTable('calendar_sync_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  provider: text('provider').default('google'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  enabled: boolean('enabled').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Calendar Synced Events
export const calendarSyncedEvents = pgTable('calendar_synced_events', {
  id: text('id').primaryKey(),
  settingsId: text('settings_id').notNull(),
  eventId: text('event_id').notNull(),
  externalId: text('external_id'),
  syncedAt: timestamp('synced_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Generated Reports
export const generatedReports = pgTable('generated_reports', {
  id: text('id').primaryKey(),
  clientId: text('client_id'),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Scheduled Reports
export const scheduledReports = pgTable('scheduled_reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  schedule: text('schedule'),
  enabled: boolean('enabled').default(true),
  lastRun: timestamp('last_run'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Communication Tables

// Email Logs
export const emailLogs = pgTable('email_logs', {
  id: text('id').primaryKey(),
  clientId: text('client_id'),
  userId: text('user_id'),
  to: text('to').notNull(),
  subject: text('subject'),
  body: text('body'),
  status: text('status').default('sent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Email Preferences
export const emailPreferences = pgTable('email_preferences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  marketing: boolean('marketing').default(true),
  updates: boolean('updates').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// SMS Logs
export const smsLogs = pgTable('sms_logs', {
  id: text('id').primaryKey(),
  clientId: text('client_id'),
  to: text('to').notNull(),
  message: text('message'),
  status: text('status').default('sent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// SMS Templates
export const smsTemplates = pgTable('sms_templates', {
  id: text('id').primaryKey(),
  companyId: text('company_id'),
  name: text('name').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// WhatsApp Logs
export const whatsappLogs = pgTable('whatsapp_logs', {
  id: text('id').primaryKey(),
  clientId: text('client_id'),
  to: text('to').notNull(),
  message: text('message'),
  status: text('status').default('sent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// WhatsApp Templates
export const whatsappTemplates = pgTable('whatsapp_templates', {
  id: text('id').primaryKey(),
  companyId: text('company_id'),
  name: text('name').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Push Logs
export const pushLogs = pgTable('push_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  title: text('title'),
  body: text('body'),
  status: text('status').default('sent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Push Subscriptions
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  endpoint: text('endpoint').notNull(),
  keys: jsonb('keys'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Floor Plans
export const floorPlans = pgTable('floor_plans', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  eventId: text('event_id'),
  name: text('name').notNull(),
  layout: jsonb('layout'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Floor Plan Tables
export const floorPlanTables = pgTable('floor_plan_tables', {
  id: text('id').primaryKey(),
  floorPlanId: text('floor_plan_id').notNull(),
  name: text('name').notNull(),
  shape: text('shape').default('round'),
  capacity: integer('capacity').default(8),
  x: real('x'),
  y: real('y'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Floor Plan Guests
export const floorPlanGuests = pgTable('floor_plan_guests', {
  id: text('id').primaryKey(),
  tableId: text('table_id').notNull(),
  guestId: text('guest_id').notNull(),
  seatNumber: integer('seat_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Gifts (basic)
export const gifts = pgTable('gifts', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  guestId: text('guest_id'),
  name: text('name').notNull(),
  value: real('value'),
  status: text('status').default('received'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Gifts Enhanced
export const giftsEnhanced = pgTable('gifts_enhanced', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  guestId: text('guest_id'),
  name: text('name').notNull(),
  type: text('type').default('physical'),
  value: real('value'),
  thankYouSent: boolean('thank_you_sent').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Gift Categories
export const giftCategories = pgTable('gift_categories', {
  id: text('id').primaryKey(),
  companyId: text('company_id'),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Gift Items
export const giftItems = pgTable('gift_items', {
  id: text('id').primaryKey(),
  giftId: text('gift_id').notNull(),
  name: text('name').notNull(),
  quantity: integer('quantity').default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Gift Types
export const giftTypes = pgTable('gift_types', {
  id: text('id').primaryKey(),
  companyId: text('company_id'),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Thank You Note Templates
export const thankYouNoteTemplates = pgTable('thank_you_note_templates', {
  id: text('id').primaryKey(),
  companyId: text('company_id'),
  name: text('name').notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Creative Jobs
export const creativeJobs = pgTable('creative_jobs', {
  id: text('id').primaryKey(),
  clientId: text('client_id'),
  name: text('name').notNull(),
  type: text('type'),
  status: text('status').default('pending'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Website Builder
export const websiteBuilderLayouts = pgTable('website_builder_layouts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  template: jsonb('template'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const websiteBuilderPages = pgTable('website_builder_pages', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  layoutId: text('layout_id'),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const websiteBuilderContent = pgTable('website_builder_content', {
  id: text('id').primaryKey(),
  pageId: text('page_id').notNull(),
  content: jsonb('content'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// QR Codes
export const qrCodes = pgTable('qr_codes', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  guestId: text('guest_id'),
  code: text('code').notNull().unique(),
  scannedAt: timestamp('scanned_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Messages
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  guestId: text('guest_id'),
  senderId: text('sender_id'),
  receiverId: text('receiver_id'),
  content: text('content'),
  type: text('type').default('text'),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Payments
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  amount: real('amount').notNull(),
  status: text('status').default('pending'),
  stripeId: text('stripe_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stripe Connect Accounts
export const stripeConnectAccounts = pgTable('stripe_connect_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  stripeAccountId: text('stripe_account_id').notNull(),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Hotel Bookings
export const hotelBookings = pgTable('hotel_bookings', {
  id: text('id').primaryKey(),
  hotelId: text('hotel_id').notNull(),
  guestId: text('guest_id').notNull(),
  checkIn: timestamp('check_in'),
  checkOut: timestamp('check_out'),
  roomType: text('room_type'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Google Calendar Tokens
export const googleCalendarTokens = pgTable('google_calendar_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Guest Gifts (gifts given to guests)
export const guestGifts = pgTable('guest_gifts', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  guestId: text('guest_id'),
  name: text('name').notNull(),
  type: text('type'),
  quantity: integer('quantity').default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Guest Preferences
export const guestPreferences = pgTable('guest_preferences', {
  id: text('id').primaryKey(),
  guestId: text('guest_id').notNull(),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Guest Conflicts
export const guestConflicts = pgTable('guest_conflicts', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  guest1Id: text('guest1_id').notNull(),
  guest2Id: text('guest2_id').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Activity (for activity feed)
export const activity = pgTable('activity', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  clientId: text('client_id'),
  type: text('type').notNull(),
  data: jsonb('data'),
  read: boolean('read').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// iCal Feed Tokens
export const icalFeedTokens = pgTable('ical_feed_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  clientId: text('client_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),
});

// Invoices
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  amount: real('amount').notNull(),
  status: text('status').default('pending'),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  stripeInvoiceId: text('stripe_invoice_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Push Notification Logs
export const pushNotificationLogs = pgTable('push_notification_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  subscriptionId: text('subscription_id'),
  title: text('title'),
  body: text('body'),
  status: text('status').default('sent'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Push Notification Preferences
export const pushNotificationPreferences = pgTable('push_notification_preferences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  enabled: boolean('enabled').default(true),
  rsvpUpdates: boolean('rsvp_updates').default(true),
  messages: boolean('messages').default(true),
  reminders: boolean('reminders').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Refunds
export const refunds = pgTable('refunds', {
  id: text('id').primaryKey(),
  paymentId: text('payment_id').notNull(),
  amount: real('amount').notNull(),
  reason: text('reason'),
  status: text('status').default('pending'),
  stripeRefundId: text('stripe_refund_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Seating Change Log
export const seatingChangeLog = pgTable('seating_change_log', {
  id: text('id').primaryKey(),
  floorPlanId: text('floor_plan_id').notNull(),
  userId: text('user_id'),
  changeType: text('change_type').notNull(),
  previousData: jsonb('previous_data'),
  newData: jsonb('new_data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Seating Versions
export const seatingVersions = pgTable('seating_versions', {
  id: text('id').primaryKey(),
  floorPlanId: text('floor_plan_id').notNull(),
  name: text('name').notNull(),
  layout: jsonb('layout'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// SMS Preferences
export const smsPreferences = pgTable('sms_preferences', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  enabled: boolean('enabled').default(true),
  rsvpUpdates: boolean('rsvp_updates').default(true),
  reminders: boolean('reminders').default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Stripe Accounts (alias for stripeConnectAccounts for compatibility)
export const stripeAccounts = pgTable('stripe_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  stripeAccountId: text('stripe_account_id').notNull(),
  type: text('type').default('express'),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Team Client Assignments
export const teamClientAssignments = pgTable('team_client_assignments', {
  id: text('id').primaryKey(),
  teamMemberId: text('team_member_id').notNull(),
  clientId: text('client_id').notNull(),
  role: text('role').default('assigned'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Wedding Websites
export const weddingWebsites = pgTable('wedding_websites', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  subdomain: text('subdomain').unique(),
  customDomain: text('custom_domain'),
  theme: text('theme').default('classic'),
  settings: jsonb('settings'),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Accommodations (Hotel Properties) - Stores hotel definitions for room allotment
export const accommodations = pgTable('accommodations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  checkInTime: text('check_in_time'),
  checkOutTime: text('check_out_time'),
  amenities: text('amenities').array(),
  roomTypes: jsonb('room_types'), // Array of { type: string, capacity: number, ratePerNight: number, totalRooms: number }
  notes: text('notes'),
  isDefault: boolean('is_default').default(false), // Mark as default hotel for auto-assignment
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('accommodations_client_id_idx').on(table.clientId),
]);
