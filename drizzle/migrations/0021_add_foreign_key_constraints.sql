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

DO $$ BEGIN
ALTER TABLE "client_vendors"
  ADD CONSTRAINT "client_vendors_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "client_vendors"
  ADD CONSTRAINT "client_vendors_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "client_vendors"
  ADD CONSTRAINT "client_vendors_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- BUDGET → EVENTS FK
-- Links budget items to events
-- ============================================

DO $$ BEGIN
ALTER TABLE "budget"
  ADD CONSTRAINT "budget_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "budget"
  ADD CONSTRAINT "budget_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "budget"
  ADD CONSTRAINT "budget_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- GUEST TRANSPORT → EVENTS FK
-- Links transport to events
-- ============================================

DO $$ BEGIN
ALTER TABLE "guest_transport"
  ADD CONSTRAINT "guest_transport_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "guest_transport"
  ADD CONSTRAINT "guest_transport_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Note: guest_transport.guestId is TEXT but guests.id is TEXT, so this works
DO $$ BEGIN
ALTER TABLE "guest_transport"
  ADD CONSTRAINT "guest_transport_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- HOTELS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "hotels"
  ADD CONSTRAINT "hotels_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Note: hotels.guestId is TEXT, guests.id is TEXT - FK works
DO $$ BEGIN
ALTER TABLE "hotels"
  ADD CONSTRAINT "hotels_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- GUESTS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "guests"
  ADD CONSTRAINT "guests_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- EVENTS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "events"
  ADD CONSTRAINT "events_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TIMELINE → CLIENTS & EVENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "timeline"
  ADD CONSTRAINT "timeline_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "timeline"
  ADD CONSTRAINT "timeline_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- FLOOR PLANS → CLIENTS & EVENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "floor_plans"
  ADD CONSTRAINT "floor_plans_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "floor_plans"
  ADD CONSTRAINT "floor_plans_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- FLOOR PLAN TABLES → FLOOR PLANS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "floor_plan_tables"
  ADD CONSTRAINT "floor_plan_tables_floor_plan_id_fkey"
  FOREIGN KEY ("floor_plan_id")
  REFERENCES "floor_plans"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- FLOOR PLAN GUESTS → FLOOR PLANS & TABLES & GUESTS FK
-- ============================================

-- NOTE: floor_plan_guests.floor_plan_id column added in migration 0026. FK moved there.

DO $$ BEGIN
ALTER TABLE "floor_plan_guests"
  ADD CONSTRAINT "floor_plan_guests_table_id_fkey"
  FOREIGN KEY ("table_id")
  REFERENCES "floor_plan_tables"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "floor_plan_guests"
  ADD CONSTRAINT "floor_plan_guests_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- GIFTS → CLIENTS & GUESTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "gifts"
  ADD CONSTRAINT "gifts_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "gifts"
  ADD CONSTRAINT "gifts_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- GIFTS ENHANCED → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "gifts_enhanced"
  ADD CONSTRAINT "gifts_enhanced_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- GUEST GIFTS → CLIENTS & GUESTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "guest_gifts"
  ADD CONSTRAINT "guest_gifts_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "guest_gifts"
  ADD CONSTRAINT "guest_gifts_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- DOCUMENTS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- MESSAGES → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- PAYMENTS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- WEDDING WEBSITES → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "wedding_websites"
  ADD CONSTRAINT "wedding_websites_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ADVANCE PAYMENTS → BUDGET & VENDORS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "advance_payments"
  ADD CONSTRAINT "advance_payments_budget_item_id_fkey"
  FOREIGN KEY ("budget_item_id")
  REFERENCES "budget"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "advance_payments"
  ADD CONSTRAINT "advance_payments_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- VENDOR COMMENTS & REVIEWS → VENDORS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "vendor_comments"
  ADD CONSTRAINT "vendor_comments_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "vendor_reviews"
  ADD CONSTRAINT "vendor_reviews_vendor_id_fkey"
  FOREIGN KEY ("vendor_id")
  REFERENCES "vendors"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "vendor_reviews"
  ADD CONSTRAINT "vendor_reviews_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ACTIVITY → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "activity"
  ADD CONSTRAINT "activity_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ACCOMMODATIONS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "accommodations"
  ADD CONSTRAINT "accommodations_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- INVOICES → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- CREATIVE JOBS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "creative_jobs"
  ADD CONSTRAINT "creative_jobs_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- QR CODES → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "qr_codes"
  ADD CONSTRAINT "qr_codes_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- CLIENT USERS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "client_users"
  ADD CONSTRAINT "client_users_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TEAM CLIENT ASSIGNMENTS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "team_client_assignments"
  ADD CONSTRAINT "team_client_assignments_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- CALENDAR SYNCED EVENTS → EVENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "calendar_synced_events"
  ADD CONSTRAINT "calendar_synced_events_event_id_fkey"
  FOREIGN KEY ("event_id")
  REFERENCES "events"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- WEBSITE BUILDER PAGES → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "website_builder_pages"
  ADD CONSTRAINT "website_builder_pages_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- WEBSITE BUILDER CONTENT → PAGES FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "website_builder_content"
  ADD CONSTRAINT "website_builder_content_page_id_fkey"
  FOREIGN KEY ("page_id")
  REFERENCES "website_builder_pages"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- GENERATED REPORTS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "generated_reports"
  ADD CONSTRAINT "generated_reports_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- EMAIL/SMS/WHATSAPP LOGS → CLIENTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "email_logs"
  ADD CONSTRAINT "email_logs_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "sms_logs"
  ADD CONSTRAINT "sms_logs_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "whatsapp_logs"
  ADD CONSTRAINT "whatsapp_logs_client_id_fkey"
  FOREIGN KEY ("client_id")
  REFERENCES "clients"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- SEATING VERSIONS & CHANGE LOG → FLOOR PLANS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "seating_versions"
  ADD CONSTRAINT "seating_versions_floor_plan_id_fkey"
  FOREIGN KEY ("floor_plan_id")
  REFERENCES "floor_plans"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "seating_change_log"
  ADD CONSTRAINT "seating_change_log_floor_plan_id_fkey"
  FOREIGN KEY ("floor_plan_id")
  REFERENCES "floor_plans"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- GUEST PREFERENCES & CONFLICTS → GUESTS FK
-- ============================================

DO $$ BEGIN
ALTER TABLE "guest_preferences"
  ADD CONSTRAINT "guest_preferences_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "guest_conflicts"
  ADD CONSTRAINT "guest_conflicts_guest1_id_fkey"
  FOREIGN KEY ("guest1_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
ALTER TABLE "guest_conflicts"
  ADD CONSTRAINT "guest_conflicts_guest2_id_fkey"
  FOREIGN KEY ("guest2_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- HOTEL BOOKINGS → HOTELS & GUESTS FK
-- ============================================

-- NOTE: hotel_bookings.hotel_id is TEXT but hotels.id is UUID - type mismatch.
-- FK skipped; enforced at application level.

DO $$ BEGIN
ALTER TABLE "hotel_bookings"
  ADD CONSTRAINT "hotel_bookings_guest_id_fkey"
  FOREIGN KEY ("guest_id")
  REFERENCES "guests"("id")
  ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
