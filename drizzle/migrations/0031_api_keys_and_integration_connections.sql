CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"service" text DEFAULT 'zapier',
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"provider" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"access_token" text,
	"refresh_token" text,
	"realm_id" text,
	"company_name" text,
	"expires_at" timestamp,
	"last_sync_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "api_keys_company_id_idx" ON "api_keys" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "integration_connections_company_id_idx" ON "integration_connections" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "integration_connections_provider_idx" ON "integration_connections" USING btree ("company_id","provider");--> statement-breakpoint

-- ============================================================================
-- Row-Level Security (tenant isolation) — matches the pattern from 0024/0030
-- ============================================================================
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "api_keys" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "api_keys";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "api_keys"
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());--> statement-breakpoint

ALTER TABLE "integration_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "integration_connections" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "integration_connections";--> statement-breakpoint
CREATE POLICY tenant_isolation ON "integration_connections"
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());