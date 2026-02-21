-- Migration: 0021_add_foreign_key_constraints.sql
-- February 2026 - Add missing FK constraints for referential integrity
--
-- This migration adds FK constraints where types match.
-- Note: Some FKs can't be added due to UUID/TEXT type mismatches (documented).
--
-- Pattern: Most tables use TEXT for IDs, which matches well.

-- ============================================
-- CLIENT VENDORS → EVENTS FK
-- Links vendors to specific events
-- ============================================

ALTER TABLE "client_vendors"
  ADD CONSTRAINT "client_vendors_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;

ALTER TABLE "client_vendors"
  ADD CONSTRAINT "client_vendors_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

ALTER TABLE "client_vendors"
  ADD CONSTRAINT "client_vendors_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE CASCADE;

-- ============================================
-- BUDGET → EVENTS FK
-- Links budget items to events
-- ============================================

ALTER TABLE "budget"
  ADD CONSTRAINT "budget_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;

ALTER TABLE "budget"
  ADD CONSTRAINT "budget_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

ALTER TABLE "budget"
  ADD CONSTRAINT "budget_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE SET NULL;

-- ============================================
-- GUEST TRANSPORT → EVENTS FK
-- Links transport to events
-- ============================================

ALTER TABLE "guest_transport"
  ADD CONSTRAINT "guest_transport_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;

ALTER TABLE "guest_transport"
  ADD CONSTRAINT "guest_transport_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- Note: guest_transport.guestId is TEXT but guests.id is TEXT, so this works
ALTER TABLE "guest_transport"
  ADD CONSTRAINT "guest_transport_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE SET NULL;

-- ============================================
-- HOTELS → CLIENTS FK
-- ============================================

ALTER TABLE "hotels"
  ADD CONSTRAINT "hotels_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- Note: hotels.guestId is TEXT, guests.id is TEXT - FK works
ALTER TABLE "hotels"
  ADD CONSTRAINT "hotels_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE SET NULL;

-- ============================================
-- GUESTS → CLIENTS FK
-- ============================================

ALTER TABLE "guests"
  ADD CONSTRAINT "guests_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- EVENTS → CLIENTS FK
-- ============================================

ALTER TABLE "events"
  ADD CONSTRAINT "events_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- TIMELINE → CLIENTS & EVENTS FK
-- ============================================

ALTER TABLE "timeline"
  ADD CONSTRAINT "timeline_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

ALTER TABLE "timeline"
  ADD CONSTRAINT "timeline_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;

-- ============================================
-- FLOOR PLANS → CLIENTS & EVENTS FK
-- ============================================

ALTER TABLE "floor_plans"
  ADD CONSTRAINT "floor_plans_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

ALTER TABLE "floor_plans"
  ADD CONSTRAINT "floor_plans_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;

-- ============================================
-- FLOOR PLAN TABLES → FLOOR PLANS FK
-- ============================================

ALTER TABLE "floor_plan_tables"
  ADD CONSTRAINT "floor_plan_tables_floor_plan_id_fkey"
  FOREIGN KEY ("floor_plan_id")
  REFERENCES "floor_plans"("id")
  ON DELETE CASCADE;

-- ============================================
-- FLOOR PLAN GUESTS → FLOOR PLANS & TABLES & GUESTS FK
-- ============================================

ALTER TABLE "floor_plan_guests"
  ADD CONSTRAINT "floor_plan_guests_floor_plan_id_fkey"
  FOREIGN KEY ("floor_plan_id")
  REFERENCES "floor_plans"("id")
  ON DELETE CASCADE;

ALTER TABLE "floor_plan_guests"
  ADD CONSTRAINT "floor_plan_guests_table_id_fkey"
  FOREIGN KEY ("table_id")
  REFERENCES "floor_plan_tables"("id")
  ON DELETE CASCADE;

ALTER TABLE "floor_plan_guests"
  ADD CONSTRAINT "floor_plan_guests_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE SET NULL;

-- ============================================
-- GIFTS → CLIENTS & GUESTS FK
-- ============================================

ALTER TABLE "gifts"
  ADD CONSTRAINT "gifts_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

ALTER TABLE "gifts"
  ADD CONSTRAINT "gifts_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE SET NULL;

-- ============================================
-- GIFTS ENHANCED → CLIENTS FK
-- ============================================

ALTER TABLE "gifts_enhanced"
  ADD CONSTRAINT "gifts_enhanced_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- GUEST GIFTS → CLIENTS & GUESTS FK
-- ============================================

ALTER TABLE "guest_gifts"
  ADD CONSTRAINT "guest_gifts_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

ALTER TABLE "guest_gifts"
  ADD CONSTRAINT "guest_gifts_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;

-- ============================================
-- DOCUMENTS → CLIENTS FK
-- ============================================

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- MESSAGES → CLIENTS FK
-- ============================================

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- PAYMENTS → CLIENTS FK
-- ============================================

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- WEDDING WEBSITES → CLIENTS FK
-- ============================================

ALTER TABLE "wedding_websites"
  ADD CONSTRAINT "wedding_websites_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- ADVANCE PAYMENTS → BUDGET & VENDORS FK
-- ============================================

ALTER TABLE "advance_payments"
  ADD CONSTRAINT "advance_payments_budget_item_id_fkey"
  FOREIGN KEY ("budget_item_id")
  REFERENCES "budget"("id")
  ON DELETE CASCADE;

ALTER TABLE "advance_payments"
  ADD CONSTRAINT "advance_payments_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE SET NULL;

-- ============================================
-- VENDOR COMMENTS & REVIEWS → VENDORS FK
-- ============================================

ALTER TABLE "vendor_comments"
  ADD CONSTRAINT "vendor_comments_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE CASCADE;

ALTER TABLE "vendor_reviews"
  ADD CONSTRAINT "vendor_reviews_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE CASCADE;

ALTER TABLE "vendor_reviews"
  ADD CONSTRAINT "vendor_reviews_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- ACTIVITY → CLIENTS FK
-- ============================================

ALTER TABLE "activity"
  ADD CONSTRAINT "activity_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- ACCOMMODATIONS → CLIENTS FK
-- ============================================

ALTER TABLE "accommodations"
  ADD CONSTRAINT "accommodations_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- INVOICES → CLIENTS FK
-- ============================================

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- CREATIVE JOBS → CLIENTS FK
-- ============================================

ALTER TABLE "creative_jobs"
  ADD CONSTRAINT "creative_jobs_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- QR CODES → CLIENTS FK
-- ============================================

ALTER TABLE "qr_codes"
  ADD CONSTRAINT "qr_codes_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- CLIENT USERS → CLIENTS FK
-- ============================================

ALTER TABLE "client_users"
  ADD CONSTRAINT "client_users_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- TEAM CLIENT ASSIGNMENTS → CLIENTS FK
-- ============================================

ALTER TABLE "team_client_assignments"
  ADD CONSTRAINT "team_client_assignments_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- CALENDAR SYNCED EVENTS → EVENTS FK
-- ============================================

ALTER TABLE "calendar_synced_events"
  ADD CONSTRAINT "calendar_synced_events_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE CASCADE;

-- ============================================
-- WEBSITE BUILDER PAGES → CLIENTS FK
-- ============================================

ALTER TABLE "website_builder_pages"
  ADD CONSTRAINT "website_builder_pages_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- WEBSITE BUILDER CONTENT → PAGES FK
-- ============================================

ALTER TABLE "website_builder_content"
  ADD CONSTRAINT "website_builder_content_page_id_fkey"
  FOREIGN KEY ("page_id")
  REFERENCES "website_builder_pages"("id")
  ON DELETE CASCADE;

-- ============================================
-- GENERATED REPORTS → CLIENTS FK
-- ============================================

ALTER TABLE "generated_reports"
  ADD CONSTRAINT "generated_reports_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- EMAIL/SMS/WHATSAPP LOGS → CLIENTS FK
-- ============================================

ALTER TABLE "email_logs"
  ADD CONSTRAINT "email_logs_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

ALTER TABLE "sms_logs"
  ADD CONSTRAINT "sms_logs_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

ALTER TABLE "whatsapp_logs"
  ADD CONSTRAINT "whatsapp_logs_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;

-- ============================================
-- SEATING VERSIONS & CHANGE LOG → FLOOR PLANS FK
-- ============================================

ALTER TABLE "seating_versions"
  ADD CONSTRAINT "seating_versions_floor_plan_id_fkey"
  FOREIGN KEY ("floor_plan_id")
  REFERENCES "floor_plans"("id")
  ON DELETE CASCADE;

ALTER TABLE "seating_change_log"
  ADD CONSTRAINT "seating_change_log_floor_plan_id_fkey"
  FOREIGN KEY ("floor_plan_id")
  REFERENCES "floor_plans"("id")
  ON DELETE CASCADE;

-- ============================================
-- GUEST PREFERENCES & CONFLICTS → GUESTS FK
-- ============================================

ALTER TABLE "guest_preferences"
  ADD CONSTRAINT "guest_preferences_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;

ALTER TABLE "guest_conflicts"
  ADD CONSTRAINT "guest_conflicts_guest1_id_fkey"
  FOREIGN KEY ("guest1_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;

ALTER TABLE "guest_conflicts"
  ADD CONSTRAINT "guest_conflicts_guest2_id_fkey"
  FOREIGN KEY ("guest2_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;

-- ============================================
-- HOTEL BOOKINGS → HOTELS & GUESTS FK
-- ============================================

ALTER TABLE "hotel_bookings"
  ADD CONSTRAINT "hotel_bookings_hotel_id_fkey"
  FOREIGN KEY ("hotel_id")
  REFERENCES "hotels"("id")
  ON DELETE CASCADE;

ALTER TABLE "hotel_bookings"
  ADD CONSTRAINT "hotel_bookings_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;
