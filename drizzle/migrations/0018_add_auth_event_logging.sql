-- Migration: Add auth event logging columns to activity table
-- February 2026 - Enable tracking of sign-in/sign-out/sign-up events

-- Add new columns for auth event logging
ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "company_id" text;
ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "action" text;
ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "ip_address" text;
ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "user_agent" text;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS "activity_company_id_idx" ON "activity" ("company_id");
CREATE INDEX IF NOT EXISTS "activity_type_action_idx" ON "activity" ("type", "action");

-- Comment explaining the purpose
COMMENT ON COLUMN "activity"."action" IS 'Auth action: sign_in, sign_out, sign_up, password_reset, etc.';
COMMENT ON COLUMN "activity"."ip_address" IS 'Client IP address for auth events';
COMMENT ON COLUMN "activity"."user_agent" IS 'Browser user agent for auth events';
