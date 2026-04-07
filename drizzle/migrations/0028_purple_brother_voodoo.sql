CREATE TYPE "public"."signature_audit_action" AS ENUM('created', 'sent', 'viewed', 'signed', 'declined', 'reminded', 'expired', 'voided', 'cancelled', 'downloaded', 'completed');--> statement-breakpoint
CREATE TYPE "public"."signature_field_type" AS ENUM('signature', 'initial', 'date', 'text', 'checkbox');--> statement-breakpoint
CREATE TYPE "public"."signature_request_status" AS ENUM('draft', 'pending', 'partially_signed', 'completed', 'expired', 'cancelled', 'voided');--> statement-breakpoint
CREATE TYPE "public"."signer_status" AS ENUM('pending', 'sent', 'viewed', 'signed', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."signing_order" AS ENUM('parallel', 'sequential');--> statement-breakpoint
CREATE TABLE "document_audit_trail" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"signer_id" uuid,
	"action" "signature_audit_action" NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_signature_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"signer_id" uuid NOT NULL,
	"type" "signature_field_type" NOT NULL,
	"page" integer DEFAULT 1 NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"width" real NOT NULL,
	"height" real NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"value" text,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_signature_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" text NOT NULL,
	"client_id" text NOT NULL,
	"company_id" text NOT NULL,
	"status" "signature_request_status" DEFAULT 'draft' NOT NULL,
	"public_token" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"signing_order" "signing_order" DEFAULT 'parallel' NOT NULL,
	"expires_at" timestamp,
	"completed_at" timestamp,
	"voided_at" timestamp,
	"void_reason" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_signature_requests_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "document_signature_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fields" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_signers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"signing_order" integer DEFAULT 1,
	"status" "signer_status" DEFAULT 'pending' NOT NULL,
	"signature_data" jsonb,
	"signed_at" timestamp,
	"viewed_at" timestamp,
	"sent_at" timestamp,
	"public_token" text NOT NULL,
	"decline_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_signers_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
ALTER TABLE "document_audit_trail" ADD CONSTRAINT "document_audit_trail_request_id_document_signature_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."document_signature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_audit_trail" ADD CONSTRAINT "document_audit_trail_signer_id_document_signers_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."document_signers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_signature_fields" ADD CONSTRAINT "document_signature_fields_request_id_document_signature_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."document_signature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_signature_fields" ADD CONSTRAINT "document_signature_fields_signer_id_document_signers_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."document_signers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_signature_requests" ADD CONSTRAINT "document_signature_requests_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_signers" ADD CONSTRAINT "document_signers_request_id_document_signature_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."document_signature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_trail_request_id_idx" ON "document_audit_trail" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_trail_action_idx" ON "document_audit_trail" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_trail_created_at_idx" ON "document_audit_trail" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sig_fields_request_id_idx" ON "document_signature_fields" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "sig_fields_signer_id_idx" ON "document_signature_fields" USING btree ("signer_id");--> statement-breakpoint
CREATE INDEX "sig_requests_document_id_idx" ON "document_signature_requests" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "sig_requests_client_id_idx" ON "document_signature_requests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "sig_requests_company_id_idx" ON "document_signature_requests" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "sig_requests_status_idx" ON "document_signature_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sig_requests_public_token_idx" ON "document_signature_requests" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "sig_templates_company_id_idx" ON "document_signature_templates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "signers_request_id_idx" ON "document_signers" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "signers_email_idx" ON "document_signers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "signers_public_token_idx" ON "document_signers" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "signers_status_idx" ON "document_signers" USING btree ("status");