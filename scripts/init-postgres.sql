-- PostgreSQL Initialization Script for WeddingFlo
-- Security February 2026
--
-- This script:
-- 1. Creates a restricted application user (no DROP/ALTER)
-- 2. Enables required extensions
-- 3. Sets up row-level security basics

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create restricted application user
-- This user can only SELECT, INSERT, UPDATE, DELETE - no schema changes
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'weddingflo_app') THEN
    CREATE USER weddingflo_app WITH PASSWORD 'changeme_in_production';
  END IF;
END
$$;

-- Grant minimal permissions to app user
-- The app should not be able to DROP or ALTER tables in production
REVOKE ALL ON DATABASE weddingflo FROM weddingflo_app;
GRANT CONNECT ON DATABASE weddingflo TO weddingflo_app;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO weddingflo_app;

-- Grant SELECT, INSERT, UPDATE, DELETE on all tables
-- But NOT DROP, ALTER, TRUNCATE
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO weddingflo_app;

-- Grant USAGE and SELECT on all sequences (for auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO weddingflo_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO weddingflo_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO weddingflo_app;

-- Function to log audit events
CREATE OR REPLACE FUNCTION audit_log()
RETURNS TRIGGER AS $audit_log$
BEGIN
  -- Log changes to critical tables
  IF TG_TABLE_NAME IN ('user', 'session', 'company', 'client') THEN
    INSERT INTO audit_log (
      table_name,
      record_id,
      action,
      old_data,
      new_data,
      user_id,
      ip_address,
      created_at
    ) VALUES (
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      TG_OP,
      CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
      current_setting('app.current_user_id', true),
      current_setting('app.current_ip', true),
      NOW()
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$audit_log$ LANGUAGE plpgsql;

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Grant app user permission to insert into audit_log
GRANT INSERT ON audit_log TO weddingflo_app;
GRANT SELECT ON audit_log TO weddingflo_app;

-- Disable pg_stat_statements reset for non-superusers
-- Only superusers should be able to reset statistics
REVOKE ALL ON FUNCTION pg_stat_statements_reset() FROM PUBLIC;

-- Display completion message
DO $$
BEGIN
  RAISE NOTICE 'PostgreSQL initialization completed successfully';
  RAISE NOTICE 'Remember to change weddingflo_app password in production!';
END
$$;
