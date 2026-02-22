-- Migration: Add performance indexes
-- February 2026 - Query optimization for production scale
--
-- This migration adds missing indexes for common query patterns.
-- All indexes use CONCURRENTLY where possible to avoid table locks.

-- ============================================
-- GUESTS TABLE - Search & Filter Indexes
-- ============================================

-- Email search for guest lookup
CREATE INDEX IF NOT EXISTS "guests_email_idx" ON "guests" ("email");

-- Combined client + RSVP status for filtered queries
CREATE INDEX IF NOT EXISTS "guests_client_rsvp_idx" ON "guests" ("client_id", "rsvp_status");

-- Guest side filtering
CREATE INDEX IF NOT EXISTS "guests_client_side_idx" ON "guests" ("client_id", "guest_side");

-- Table assignment lookup
CREATE INDEX IF NOT EXISTS "guests_client_table_idx" ON "guests" ("client_id", "table_number");

-- Group name filtering
CREATE INDEX IF NOT EXISTS "guests_group_name_idx" ON "guests" ("client_id", "group_name");

-- Check-in status for day-of operations
CREATE INDEX IF NOT EXISTS "guests_checkin_idx" ON "guests" ("client_id", "checked_in");

-- ============================================
-- EVENTS TABLE - Date & Status Indexes
-- ============================================

-- Event date range queries
CREATE INDEX IF NOT EXISTS "events_client_date_idx" ON "events" ("client_id", "event_date");

-- Event status filtering
CREATE INDEX IF NOT EXISTS "events_status_idx" ON "events" ("status");

-- Event type filtering
CREATE INDEX IF NOT EXISTS "events_type_idx" ON "events" ("event_type");

-- ============================================
-- TIMELINE TABLE - Phase & Time Indexes
-- ============================================

-- Phase filtering within client timeline
CREATE INDEX IF NOT EXISTS "timeline_client_phase_idx" ON "timeline" ("client_id", "phase");

-- Time-based sorting for event timelines
CREATE INDEX IF NOT EXISTS "timeline_event_time_idx" ON "timeline" ("event_id", "start_time");

-- Source module lookup for cross-module sync
CREATE INDEX IF NOT EXISTS "timeline_source_idx" ON "timeline" ("source_module", "source_id");

-- Sort order for display
CREATE INDEX IF NOT EXISTS "timeline_sort_idx" ON "timeline" ("client_id", "sort_order");

-- ============================================
-- BUDGET TABLE - Segment & Status Indexes
-- ============================================

-- Segment filtering for budget views
CREATE INDEX IF NOT EXISTS "budget_client_segment_idx" ON "budget" ("client_id", "segment");

-- Payment status for financial reports
CREATE INDEX IF NOT EXISTS "budget_payment_status_idx" ON "budget" ("payment_status");

-- Category filtering
CREATE INDEX IF NOT EXISTS "budget_category_idx" ON "budget" ("client_id", "category");

-- Vendor-based budget lookup
CREATE INDEX IF NOT EXISTS "budget_vendor_idx" ON "budget" ("vendor_id");

-- Event-based budget filtering
CREATE INDEX IF NOT EXISTS "budget_event_idx" ON "budget" ("event_id");

-- ============================================
-- PIPELINE MODULE - CRM Indexes
-- ============================================

-- Lead scoring for prioritization
CREATE INDEX IF NOT EXISTS "pipeline_leads_score_idx" ON "pipeline_leads" ("company_id", "score" DESC);

-- Priority filtering
CREATE INDEX IF NOT EXISTS "pipeline_leads_priority_idx" ON "pipeline_leads" ("company_id", "priority");

-- Follow-up scheduling
CREATE INDEX IF NOT EXISTS "pipeline_leads_followup_idx" ON "pipeline_leads" ("next_follow_up_at");

-- Last contact tracking
CREATE INDEX IF NOT EXISTS "pipeline_leads_contact_idx" ON "pipeline_leads" ("last_contacted_at");

-- Conversion tracking
CREATE INDEX IF NOT EXISTS "pipeline_leads_converted_idx" ON "pipeline_leads" ("converted_at");

-- Activity type filtering
CREATE INDEX IF NOT EXISTS "pipeline_activities_created_idx" ON "pipeline_activities" ("lead_id", "created_at" DESC);

-- ============================================
-- PROPOSALS & CONTRACTS - Status Indexes
-- ============================================

-- Sent date tracking
CREATE INDEX IF NOT EXISTS "proposals_sent_idx" ON "proposals" ("sent_at");

-- Valid until for expiration queries
CREATE INDEX IF NOT EXISTS "proposals_valid_idx" ON "proposals" ("valid_until");

-- Contract sent tracking
CREATE INDEX IF NOT EXISTS "contracts_sent_idx" ON "contracts" ("sent_at");

-- Contract expiration
CREATE INDEX IF NOT EXISTS "contracts_valid_idx" ON "contracts" ("valid_until");

-- Fully executed tracking
CREATE INDEX IF NOT EXISTS "contracts_executed_idx" ON "contracts" ("fully_executed_at");

-- ============================================
-- WORKFLOWS - Execution Indexes
-- ============================================

-- Active workflow lookup
CREATE INDEX IF NOT EXISTS "workflows_active_company_idx" ON "workflows" ("company_id", "is_active") WHERE "is_active" = true;

-- Execution resume scheduling
CREATE INDEX IF NOT EXISTS "workflow_executions_resume_idx" ON "workflow_executions" ("next_resume_at") WHERE "status" = 'waiting';

-- Execution history
CREATE INDEX IF NOT EXISTS "workflow_executions_started_idx" ON "workflow_executions" ("company_id", "started_at" DESC);

-- ============================================
-- COMMUNICATIONS - Log Indexes
-- ============================================

-- Email log by status
CREATE INDEX IF NOT EXISTS "email_logs_status_idx" ON "email_logs" ("status");

-- Email log by date
CREATE INDEX IF NOT EXISTS "email_logs_created_idx" ON "email_logs" ("created_at" DESC);

-- SMS log by status
CREATE INDEX IF NOT EXISTS "sms_logs_status_idx" ON "sms_logs" ("status");

-- SMS log by date
CREATE INDEX IF NOT EXISTS "sms_logs_created_idx" ON "sms_logs" ("created_at" DESC);

-- WhatsApp log by status
CREATE INDEX IF NOT EXISTS "whatsapp_logs_status_idx" ON "whatsapp_logs" ("status");

-- Push notification logs by date
CREATE INDEX IF NOT EXISTS "push_notification_logs_created_idx" ON "push_notification_logs" ("created_at" DESC);

-- ============================================
-- MESSAGES - Conversation Indexes
-- ============================================

-- Unread messages for badge counts
CREATE INDEX IF NOT EXISTS "messages_unread_idx" ON "messages" ("receiver_id", "is_read") WHERE "is_read" = false;

-- Thread replies (moved to 0026 when parent_id column is added)

-- Message history by date (moved to 0026 when company_id column is added)

-- ============================================
-- NOTIFICATIONS - Read Status Indexes
-- ============================================

-- Unread notifications for user
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" ("user_id", "is_read", "created_at" DESC) WHERE "is_read" = false;

-- ============================================
-- VENDORS - Category & Rating Indexes
-- ============================================

-- Vendor category filtering
CREATE INDEX IF NOT EXISTS "vendors_category_idx" ON "vendors" ("company_id", "category");

-- Preferred vendor lookup
CREATE INDEX IF NOT EXISTS "vendors_preferred_idx" ON "vendors" ("company_id", "is_preferred") WHERE "is_preferred" = true;

-- Vendor rating for sorting
CREATE INDEX IF NOT EXISTS "vendors_rating_idx" ON "vendors" ("company_id", "rating" DESC NULLS LAST);

-- ============================================
-- HOTELS & TRANSPORT - Status Indexes
-- ============================================

-- Hotel booking status
CREATE INDEX IF NOT EXISTS "hotels_booking_idx" ON "hotels" ("client_id", "booking_confirmed");

-- Hotel payment status
CREATE INDEX IF NOT EXISTS "hotels_payment_idx" ON "hotels" ("client_id", "payment_status");

-- Transport status
CREATE INDEX IF NOT EXISTS "guest_transport_status_idx" ON "guest_transport" ("client_id", "transport_status");

-- Transport by date
CREATE INDEX IF NOT EXISTS "guest_transport_date_idx" ON "guest_transport" ("client_id", "pickup_date");

-- Vehicle availability
CREATE INDEX IF NOT EXISTS "vehicles_available_idx" ON "vehicles" ("client_id", "status") WHERE "status" = 'available';

-- ============================================
-- FLOOR PLANS & SEATING - Lookup Indexes
-- ============================================

-- Floor plan by event
CREATE INDEX IF NOT EXISTS "floor_plans_event_idx" ON "floor_plans" ("event_id");

-- Table by floor plan (for drag-drop performance)
CREATE INDEX IF NOT EXISTS "floor_plan_tables_plan_idx" ON "floor_plan_tables" ("floor_plan_id");

-- Guest by table (for seating display)
CREATE INDEX IF NOT EXISTS "floor_plan_guests_table_idx" ON "floor_plan_guests" ("table_id");

-- ============================================
-- PAYMENTS - Status & Date Indexes
-- ============================================

-- Payment status filtering
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" ("status");

-- Invoice due date
CREATE INDEX IF NOT EXISTS "invoices_due_idx" ON "invoices" ("due_date");

-- Invoice status
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" ("status");

-- ============================================
-- JOB QUEUE - Scheduling Indexes
-- ============================================

-- Pending jobs for worker
CREATE INDEX IF NOT EXISTS "job_queue_pending_idx" ON "job_queue" ("status", "scheduled_at") WHERE "status" = 'pending';

-- Job type filtering
CREATE INDEX IF NOT EXISTS "job_queue_type_idx" ON "job_queue" ("type");

-- ============================================
-- QUESTIONNAIRES - Status Indexes
-- ============================================

-- Questionnaire status for dashboard
CREATE INDEX IF NOT EXISTS "questionnaires_company_status_idx" ON "questionnaires" ("company_id", "status");

-- Questionnaire expiration
CREATE INDEX IF NOT EXISTS "questionnaires_expires_idx" ON "questionnaires" ("expires_at");

-- ============================================
-- ACTIVITY FEED - User & Date Indexes
-- ============================================

-- Recent activity for user
CREATE INDEX IF NOT EXISTS "activity_user_date_idx" ON "activity" ("user_id", "created_at" DESC);

-- Activity type filtering
CREATE INDEX IF NOT EXISTS "activity_type_idx" ON "activity" ("type");

-- Unread activity
CREATE INDEX IF NOT EXISTS "activity_unread_idx" ON "activity" ("user_id", "read") WHERE "read" = false;

-- ============================================
-- SOFT DELETE FILTERED INDEXES
-- Tables with deletedAt column need filtered indexes for active records
-- NOTE: All deleted_at indexes moved to migration 0026 where the deleted_at columns are added.
-- ============================================

-- Clients - active only (moved to 0026 where deleted_at column exists)
-- CREATE INDEX IF NOT EXISTS "clients_active_idx" ON "clients" ("company_id", "created_at" DESC) WHERE "deleted_at" IS NULL;

-- Events - active only (moved to 0026 where deleted_at column exists)
-- CREATE INDEX IF NOT EXISTS "events_active_idx" ON "events" ("client_id", "event_date") WHERE "deleted_at" IS NULL;

-- Timeline - active only (moved to 0026 where deleted_at column exists)
-- CREATE INDEX IF NOT EXISTS "timeline_active_idx" ON "timeline" ("client_id", "start_time") WHERE "deleted_at" IS NULL;

-- Pipeline leads - active only (moved to 0026 where deleted_at column exists)
-- CREATE INDEX IF NOT EXISTS "pipeline_leads_active_idx" ON "pipeline_leads" ("company_id", "created_at" DESC) WHERE "deleted_at" IS NULL;

-- Proposals - active only (moved to 0026 where deleted_at column exists)
-- CREATE INDEX IF NOT EXISTS "proposals_active_idx" ON "proposals" ("company_id", "created_at" DESC) WHERE "deleted_at" IS NULL;

-- Contracts - active only (moved to 0026 where deleted_at column exists)
-- CREATE INDEX IF NOT EXISTS "contracts_active_idx" ON "contracts" ("company_id", "created_at" DESC) WHERE "deleted_at" IS NULL;

-- Hotels - active only (moved to 0026 where deleted_at column exists)
-- CREATE INDEX IF NOT EXISTS "hotels_active_idx" ON "hotels" ("client_id") WHERE "deleted_at" IS NULL;

-- Accommodations - active only (moved to 0026 where deleted_at column exists)
-- CREATE INDEX IF NOT EXISTS "accommodations_active_idx" ON "accommodations" ("client_id") WHERE "deleted_at" IS NULL;

-- Wedding websites - active only (moved to 0026 where deleted_at column exists)
-- CREATE INDEX IF NOT EXISTS "wedding_websites_active_idx" ON "wedding_websites" ("client_id") WHERE "deleted_at" IS NULL;

-- Messages - active only (moved to 0026 when company_id/deleted_at columns are added)

-- ============================================
-- WEBHOOK EVENTS - Idempotency Index
-- ============================================

-- Unique event lookup for idempotency (moved to 0026 where webhook_events table is created)
-- CREATE INDEX IF NOT EXISTS "webhook_events_lookup_idx" ON "webhook_events" ("provider", "event_id");

-- ============================================
-- CALENDAR SYNC - Token Lookup
-- ============================================

-- Token lookup for feed URLs
CREATE INDEX IF NOT EXISTS "ical_feed_tokens_lookup_idx" ON "ical_feed_tokens" ("token");

-- ============================================
-- GIFT MODULES - Type & Status Indexes
-- ============================================

-- Gift type filtering
CREATE INDEX IF NOT EXISTS "gifts_enhanced_type_idx" ON "gifts_enhanced" ("client_id", "type");

-- Thank you status
CREATE INDEX IF NOT EXISTS "gifts_enhanced_thankyou_idx" ON "gifts_enhanced" ("client_id", "thank_you_sent") WHERE "thank_you_sent" = false;

-- ============================================
-- CHATBOT - Conversation Indexes
-- ============================================

-- Recent conversations
CREATE INDEX IF NOT EXISTS "chatbot_conversations_recent_idx" ON "chatbot_conversations" ("user_id", "last_message_at" DESC);

-- ============================================
-- STRIPE ACCOUNTS - Status Index
-- ============================================

-- Active accounts (moved to 0026 where charges_enabled column is added to stripe_accounts)
-- CREATE INDEX IF NOT EXISTS "stripe_accounts_active_idx" ON "stripe_accounts" ("company_id", "status") WHERE "charges_enabled" = true;
