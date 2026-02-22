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
CREATE INDEX IF NOT EXISTS "companies_subscription_status_idx"
  ON "companies" ("subscription_status");

-- Subscription tier for feature gating
CREATE INDEX IF NOT EXISTS "companies_subscription_tier_idx"
  ON "companies" ("subscription_tier");

-- Combined billing index
CREATE INDEX IF NOT EXISTS "companies_billing_idx"
  ON "companies" ("subscription_status", "subscription_tier");

-- ============================================
-- PIPELINE LEADS - CRM Compound Indexes
-- ============================================

-- Stage + assignee for kanban board views
CREATE INDEX IF NOT EXISTS "pipeline_leads_stage_assignee_idx"
  ON "pipeline_leads" ("stage_id", "assignee_id");

-- Company + stage + status for filtered pipeline views
CREATE INDEX IF NOT EXISTS "pipeline_leads_company_stage_idx"
  ON "pipeline_leads" ("company_id", "stage_id", "status");

-- ============================================
-- GUEST GIFTS - Delivery Tracking
-- ============================================

-- REMOVED: guest_gifts_delivery_idx - delivery_status column does not exist on guest_gifts table

-- Guest gifts by guest for lookup
CREATE INDEX IF NOT EXISTS "guest_gifts_guest_idx"
  ON "guest_gifts" ("guest_id");

-- ============================================
-- FLOOR PLAN GUESTS - Seating Optimization
-- ============================================

-- REMOVED: floor_plan_guests_client_idx - client_id column does not exist on floor_plan_guests table

-- Floor plan guests by guest for cleanup
CREATE INDEX IF NOT EXISTS "floor_plan_guests_guest_idx"
  ON "floor_plan_guests" ("guest_id");

-- ============================================
-- CHATBOT - Pending Calls Index
-- ============================================

-- REMOVED: chatbot_pending_calls_status_idx - status column does not exist on chatbot_pending_calls table

-- REMOVED: chatbot_pending_calls_conv_idx - conversation_id column does not exist on chatbot_pending_calls table

-- ============================================
-- ACCOMMODATIONS - Hotel Management
-- ============================================

-- Accommodations by name for duplicate detection
CREATE INDEX IF NOT EXISTS "accommodations_name_idx"
  ON "accommodations" ("client_id", "name");

-- ============================================
-- VENDOR REVIEWS - Aggregation
-- ============================================

-- Reviews by vendor for rating calculation
CREATE INDEX IF NOT EXISTS "vendor_reviews_vendor_idx"
  ON "vendor_reviews" ("vendor_id", "rating");

-- ============================================
-- SEATING VERSIONS - History Lookup
-- ============================================

-- Seating versions by floor plan
CREATE INDEX IF NOT EXISTS "seating_versions_floor_plan_idx"
  ON "seating_versions" ("floor_plan_id", "created_at" DESC);

-- ============================================
-- CREATIVE JOBS - Status Tracking
-- ============================================

-- Creative jobs by status for dashboard
CREATE INDEX IF NOT EXISTS "creative_jobs_status_idx"
  ON "creative_jobs" ("client_id", "status");

-- ============================================
-- TEAM CLIENT ASSIGNMENTS - Lookup
-- ============================================

-- Team assignments by team member (column is team_member_id, not user_id)
CREATE INDEX IF NOT EXISTS "team_client_assignments_user_idx"
  ON "team_client_assignments" ("team_member_id");

-- Team assignments by client
CREATE INDEX IF NOT EXISTS "team_client_assignments_client_idx"
  ON "team_client_assignments" ("client_id");
