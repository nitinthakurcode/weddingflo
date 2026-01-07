import { pgTable, text, timestamp, boolean, integer, jsonb, real, uuid } from 'drizzle-orm/pg-core';

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

// Companies table
export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  subdomain: text('subdomain').unique(),
  ownerId: text('owner_id'),
  subscriptionTier: text('subscription_tier').default('free'),
  subscriptionStatus: text('subscription_status').default('trialing'),
  trialEndsAt: timestamp('trial_ends_at'),
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
});

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
});

// Hotels
export const hotels = pgTable('hotels', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Guest Transport
export const guestTransport = pgTable('guest_transport', {
  id: text('id').primaryKey(),
  guestId: text('guest_id').notNull(),
  pickupLocation: text('pickup_location'),
  dropoffLocation: text('dropoff_location'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

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

// Timeline
export const timeline = pgTable('timeline', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  eventId: text('event_id'),
  title: text('title').notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  durationMinutes: integer('duration_minutes'),
  location: text('location'),
  description: text('description'),
  completed: boolean('completed').default(false),
  sortOrder: integer('sort_order'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Vendors
export const vendors = pgTable('vendors', {
  id: text('id').primaryKey(),
  companyId: text('company_id'),
  name: text('name').notNull(),
  category: text('category'),
  email: text('email'),
  phone: text('phone'),
  website: text('website'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Client Vendors (relationship)
export const clientVendors = pgTable('client_vendors', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  vendorId: text('vendor_id').notNull(),
  status: text('status').default('active'),
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

// Budget
export const budget = pgTable('budget', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  category: text('category').notNull(),
  segment: text('segment'),
  item: text('item'),
  description: text('description'),
  estimatedCost: text('estimated_cost'),
  paidAmount: text('paid_amount').default('0'),
  paymentStatus: text('payment_status').default('pending'),
  clientVisible: boolean('client_visible').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Advance Payments
export const advancePayments = pgTable('advance_payments', {
  id: text('id').primaryKey(),
  budgetId: text('budget_id'),
  vendorId: text('vendor_id'),
  amount: real('amount').notNull(),
  date: timestamp('date'),
  notes: text('notes'),
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
