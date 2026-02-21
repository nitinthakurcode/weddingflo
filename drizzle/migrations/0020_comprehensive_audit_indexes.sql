-- Migration: 0020_comprehensive_audit_indexes.sql
-- February 2026 - Additional indexes from comprehensive 10/10 audit
--
-- These indexes address gaps identified in the audit:
-- 1. Subscription status filtering
-- 2. Pipeline lead compound indexes
-- 3. Cross-module sync source lookups
-- 4. Message conversation threading
--
-- Using CONCURRENTLY to avoid table locks in production

-- ============================================
-- COMPANIES - Subscription Management
-- ============================================

-- Subscription status for billing queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "companies_subscription_status_idx"
  ON "companies" ("subscription_status");

-- Subscription tier for feature gating
CREATE INDEX CONCURRENTLY IF NOT EXISTS "companies_subscription_tier_idx"
  ON "companies" ("subscription_tier");

-- Combined billing index
CREATE INDEX CONCURRENTLY IF NOT EXISTS "companies_billing_idx"
  ON "companies" ("subscription_status", "subscription_tier");

-- ============================================
-- PIPELINE LEADS - CRM Compound Indexes
-- ============================================

-- Stage + assignee for kanban board views
CREATE INDEX CONCURRENTLY IF NOT EXISTS "pipeline_leads_stage_assignee_idx"
  ON "pipeline_leads" ("stage_id", "assignee_id");

-- Company + stage + status for filtered pipeline views
CREATE INDEX CONCURRENTLY IF NOT EXISTS "pipeline_leads_company_stage_idx"
  ON "pipeline_leads" ("company_id", "stage_id", "status");

-- ============================================
-- GUEST GIFTS - Delivery Tracking
-- ============================================

-- Guest gifts by client + delivery status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "guest_gifts_delivery_idx"
  ON "guest_gifts" ("client_id", "delivery_status");

-- Guest gifts by guest for lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS "guest_gifts_guest_idx"
  ON "guest_gifts" ("guest_id");

-- ============================================
-- FLOOR PLAN GUESTS - Seating Optimization
-- ============================================

-- Floor plan guests by client for bulk operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS "floor_plan_guests_client_idx"
  ON "floor_plan_guests" ("client_id");

-- Floor plan guests by guest for cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS "floor_plan_guests_guest_idx"
  ON "floor_plan_guests" ("guest_id");

-- ============================================
-- CHATBOT - Pending Calls Index
-- ============================================

-- Pending calls by status for processing
CREATE INDEX CONCURRENTLY IF NOT EXISTS "chatbot_pending_calls_status_idx"
  ON "chatbot_pending_calls" ("status");

-- Pending calls by conversation for cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS "chatbot_pending_calls_conv_idx"
  ON "chatbot_pending_calls" ("conversation_id");

-- ============================================
-- ACCOMMODATIONS - Hotel Management
-- ============================================

-- Accommodations by name for duplicate detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS "accommodations_name_idx"
  ON "accommodations" ("client_id", "name");

-- ============================================
-- VENDOR REVIEWS - Aggregation
-- ============================================

-- Reviews by vendor for rating calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS "vendor_reviews_vendor_idx"
  ON "vendor_reviews" ("vendor_id", "rating");

-- ============================================
-- SEATING VERSIONS - History Lookup
-- ============================================

-- Seating versions by floor plan
CREATE INDEX CONCURRENTLY IF NOT EXISTS "seating_versions_floor_plan_idx"
  ON "seating_versions" ("floor_plan_id", "created_at" DESC);

-- ============================================
-- CREATIVE JOBS - Status Tracking
-- ============================================

-- Creative jobs by status for dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS "creative_jobs_status_idx"
  ON "creative_jobs" ("client_id", "status");

-- ============================================
-- TEAM CLIENT ASSIGNMENTS - Lookup
-- ============================================

-- Team assignments by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS "team_client_assignments_user_idx"
  ON "team_client_assignments" ("user_id");

-- Team assignments by client
CREATE INDEX CONCURRENTLY IF NOT EXISTS "team_client_assignments_client_idx"
  ON "team_client_assignments" ("client_id");
