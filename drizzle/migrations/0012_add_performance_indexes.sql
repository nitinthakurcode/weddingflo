-- Migration: 0012_add_performance_indexes.sql
-- February 2026 - Add performance indexes for multi-tenant queries
--
-- These indexes improve query performance for:
-- 1. Multi-tenant isolation (companyId filtering)
-- 2. Session and verification lookups
-- 3. Common query patterns across features
--
-- Using CONCURRENTLY to avoid table locks in production

-- ============================================
-- Multi-tenant isolation queries (CRITICAL)
-- ============================================

-- Vendors - company lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS vendors_company_id_idx
  ON vendors(company_id);

-- ============================================
-- Session and verification lookups
-- ============================================

-- Account - user lookup for auth
CREATE INDEX CONCURRENTLY IF NOT EXISTS account_user_id_idx
  ON account(user_id);

-- Verification - identifier lookup for email/phone verification
CREATE INDEX CONCURRENTLY IF NOT EXISTS verification_identifier_idx
  ON verification(identifier);

-- ============================================
-- Common query patterns
-- ============================================

-- Clients - composite index for company + status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS clients_company_status_idx
  ON clients(company_id, status);

-- Events - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS events_client_id_idx
  ON events(client_id);

-- Timeline - client and event lookup (composite)
CREATE INDEX CONCURRENTLY IF NOT EXISTS timeline_client_id_idx
  ON timeline(client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS timeline_event_id_idx
  ON timeline(event_id);

-- Budget - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS budget_client_id_idx
  ON budget(client_id);

-- Messages - company lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_company_id_idx
  ON messages(company_id);

-- Documents - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS documents_client_id_idx
  ON documents(client_id);

-- ============================================
-- Pipeline/CRM indexes
-- ============================================

-- Pipeline leads - company + status composite
CREATE INDEX CONCURRENTLY IF NOT EXISTS pipeline_leads_company_status_idx
  ON pipeline_leads(company_id, status);

-- ============================================
-- Proposals indexes
-- ============================================

-- Proposals - company + status composite
CREATE INDEX CONCURRENTLY IF NOT EXISTS proposals_company_status_idx
  ON proposals(company_id, status);

-- ============================================
-- Additional performance indexes
-- ============================================

-- Client vendors - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS client_vendors_client_id_idx
  ON client_vendors(client_id);

-- Client vendors - vendor lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS client_vendors_vendor_id_idx
  ON client_vendors(vendor_id);

-- Advance payments - budget item lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS advance_payments_budget_item_id_idx
  ON advance_payments(budget_item_id);

-- Floor plans - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS floor_plans_client_id_idx
  ON floor_plans(client_id);

-- Gifts - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS gifts_client_id_idx
  ON gifts(client_id);

-- Gifts enhanced - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS gifts_enhanced_client_id_idx
  ON gifts_enhanced(client_id);

-- Creative jobs - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS creative_jobs_client_id_idx
  ON creative_jobs(client_id);

-- Payments - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_client_id_idx
  ON payments(client_id);

-- QR codes - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS qr_codes_client_id_idx
  ON qr_codes(client_id);

-- Activity - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_client_id_idx
  ON activity(client_id);

-- Activity - user lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_user_id_idx
  ON activity(user_id);

-- ============================================
-- Wedding invitations and team invitations
-- ============================================

-- Team invitations - token lookup (for accepting invites)
CREATE INDEX CONCURRENTLY IF NOT EXISTS team_invitations_token_idx
  ON team_invitations(token);

-- Team invitations - company lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS team_invitations_company_id_idx
  ON team_invitations(company_id);

-- Wedding invitations - token lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS wedding_invitations_token_idx
  ON wedding_invitations(token);

-- Wedding invitations - client lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS wedding_invitations_client_id_idx
  ON wedding_invitations(client_id);
