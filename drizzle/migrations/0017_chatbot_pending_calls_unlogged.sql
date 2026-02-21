-- Migration: Create UNLOGGED tables for temporary/cache data
-- February 2026 - PostgreSQL UNLOGGED tables replace Redis for high-performance temporary storage
--
-- UNLOGGED tables provide ~2x faster writes by skipping WAL (Write Ahead Log)
-- Trade-off: Data is lost on unexpected crash (acceptable for ephemeral data)
-- Benefit: No need for external Redis/cache service, no network hop
--
-- Performance benchmarks (September 2025):
-- - UNLOGGED writes: 0.03ms/query avg
-- - LOGGED writes: 0.24ms/query avg (8x slower)
-- - PostgreSQL read: 67ms avg (vs Redis 44ms - imperceptible difference for UX)
-- Source: https://dizzy.zone/2025/09/24/Redis-is-fast-Ill-cache-in-Postgres/

-- ============================================
-- CHATBOT PENDING TOOL CALLS (UNLOGGED)
-- ============================================

-- Create the UNLOGGED table for pending chatbot tool confirmations
CREATE UNLOGGED TABLE IF NOT EXISTS "chatbot_pending_calls" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "company_id" text NOT NULL,
  "tool_name" text NOT NULL,
  "args" jsonb NOT NULL,
  "preview" jsonb NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for user-based lookups
CREATE INDEX IF NOT EXISTS "idx_pending_calls_user" ON "chatbot_pending_calls" ("user_id");

-- Index for expiration cleanup queries
CREATE INDEX IF NOT EXISTS "idx_pending_calls_expires" ON "chatbot_pending_calls" ("expires_at");

-- Comment explaining the table purpose
COMMENT ON TABLE "chatbot_pending_calls" IS 'UNLOGGED table for temporary chatbot tool call confirmations (5 min TTL). Data loss on crash is acceptable.';

-- ============================================
-- AUTH RATE LIMITING (UNLOGGED)
-- ============================================

-- Create the UNLOGGED table for auth rate limiting
-- Replaces Redis-based rate limiting with PostgreSQL for simplicity
CREATE UNLOGGED TABLE IF NOT EXISTS "rate_limit_entries" (
  "key" text PRIMARY KEY,  -- e.g., "signin:192.168.1.1", "signup:10.0.0.1"
  "count" integer NOT NULL DEFAULT 1,
  "reset_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for cleanup queries (delete expired entries)
CREATE INDEX IF NOT EXISTS "rate_limit_reset_idx" ON "rate_limit_entries" ("reset_at");

-- Comment explaining the table purpose
COMMENT ON TABLE "rate_limit_entries" IS 'UNLOGGED table for auth rate limiting (fixed window). Replaces Redis for simpler infrastructure.';
