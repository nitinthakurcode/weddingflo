CREATE TYPE "public"."transport_leg_type" AS ENUM('arrival', 'departure', 'inter_event');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('available', 'in_use', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('note', 'call', 'email', 'meeting', 'task', 'stage_change', 'proposal_sent', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('draft', 'pending_signature', 'signed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."workflow_execution_status" AS ENUM('running', 'waiting', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."workflow_step_type" AS ENUM('send_email', 'send_sms', 'send_whatsapp', 'wait', 'condition', 'create_task', 'update_lead', 'update_client', 'create_notification', 'webhook');--> statement-breakpoint
CREATE TYPE "public"."workflow_trigger_type" AS ENUM('lead_stage_change', 'client_created', 'event_date_approaching', 'payment_overdue', 'rsvp_received', 'proposal_accepted', 'contract_signed', 'scheduled', 'manual');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('text', 'textarea', 'number', 'date', 'time', 'datetime', 'select', 'multi_select', 'checkbox', 'radio', 'rating', 'file_upload', 'image_upload', 'color_picker', 'scale');--> statement-breakpoint
CREATE TYPE "public"."questionnaire_status" AS ENUM('draft', 'sent', 'viewed', 'in_progress', 'completed', 'expired');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'company_admin',
	"company_id" text,
	"first_name" text,
	"last_name" text,
	"phone_number" text,
	"phone_number_verified" boolean DEFAULT false,
	"preferred_language" text DEFAULT 'en',
	"preferred_currency" text DEFAULT 'USD',
	"timezone" text DEFAULT 'UTC',
	"auto_detect_locale" boolean DEFAULT true,
	"onboarding_completed" boolean DEFAULT false,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"two_factor_enabled" boolean DEFAULT false,
	"is_anonymous" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "accommodations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"phone" text,
	"email" text,
	"website" text,
	"check_in_time" text,
	"check_out_time" text,
	"amenities" text[],
	"room_types" jsonb,
	"notes" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"client_id" text,
	"type" text NOT NULL,
	"data" jsonb,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advance_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"budget_item_id" text,
	"budget_id" text,
	"vendor_id" text,
	"amount" text NOT NULL,
	"payment_date" text,
	"payment_mode" text,
	"paid_by" text,
	"notes" text,
	"date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"vendor_id" text,
	"event_id" uuid,
	"category" text NOT NULL,
	"segment" text,
	"item" text,
	"description" text,
	"expense_details" text,
	"estimated_cost" text,
	"actual_cost" text,
	"paid_amount" text DEFAULT '0',
	"payment_status" text DEFAULT 'pending',
	"transaction_date" text,
	"payment_date" timestamp,
	"client_visible" boolean DEFAULT true,
	"is_lump_sum" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_sync_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'google',
	"access_token" text,
	"refresh_token" text,
	"enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_synced_events" (
	"id" text PRIMARY KEY NOT NULL,
	"settings_id" text NOT NULL,
	"event_id" text NOT NULL,
	"external_id" text,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_users" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'viewer',
	"relationship" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"event_id" uuid,
	"status" text DEFAULT 'active',
	"contract_amount" text,
	"deposit_amount" text,
	"deposit_paid" boolean DEFAULT false,
	"payment_status" text DEFAULT 'pending',
	"service_date" text,
	"contract_signed_at" timestamp,
	"venue_address" text,
	"onsite_poc_name" text,
	"onsite_poc_phone" text,
	"onsite_poc_notes" text,
	"deliverables" text,
	"approval_status" text DEFAULT 'pending',
	"approval_comments" text,
	"approved_by" text,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"partner1_first_name" text NOT NULL,
	"partner1_last_name" text,
	"partner1_email" text,
	"partner1_phone" text,
	"partner1_father_name" text,
	"partner1_mother_name" text,
	"partner2_first_name" text,
	"partner2_last_name" text,
	"partner2_email" text,
	"partner2_phone" text,
	"partner2_father_name" text,
	"partner2_mother_name" text,
	"wedding_name" text,
	"wedding_date" text,
	"venue" text,
	"budget" text,
	"guest_count" integer,
	"status" text DEFAULT 'planning',
	"notes" text,
	"planning_side" text DEFAULT 'both',
	"wedding_type" text DEFAULT 'traditional',
	"created_by" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subdomain" text,
	"logo_url" text,
	"branding" jsonb,
	"settings" jsonb,
	"subscription_tier" text DEFAULT 'free',
	"subscription_status" text DEFAULT 'trialing',
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"trial_ends_at" timestamp,
	"subscription_ends_at" timestamp,
	"ai_queries_this_month" integer DEFAULT 0,
	"ai_last_reset_at" timestamp,
	"default_currency" varchar(10) DEFAULT 'INR',
	"supported_currencies" text[],
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_step" integer DEFAULT 1,
	"onboarding_started_at" timestamp,
	"onboarding_completed_at" timestamp,
	"onboarding_data" jsonb,
	"business_type" text DEFAULT 'wedding_planner',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "creative_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"name" text NOT NULL,
	"type" text,
	"status" text DEFAULT 'pending',
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"type" text,
	"size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"user_id" text,
	"to" text NOT NULL,
	"subject" text,
	"body" text,
	"status" text DEFAULT 'sent',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"marketing" boolean DEFAULT true,
	"updates" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"title" text NOT NULL,
	"event_type" text,
	"event_date" text,
	"start_time" text,
	"end_time" text,
	"location" text,
	"venue_name" text,
	"address" text,
	"guest_count" integer,
	"status" text DEFAULT 'planned',
	"description" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "floor_plan_guests" (
	"id" text PRIMARY KEY NOT NULL,
	"table_id" text NOT NULL,
	"guest_id" text NOT NULL,
	"seat_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floor_plan_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"floor_plan_id" text NOT NULL,
	"name" text NOT NULL,
	"shape" text DEFAULT 'round',
	"capacity" integer DEFAULT 8,
	"x" real,
	"y" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floor_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"event_id" text,
	"name" text NOT NULL,
	"layout" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_items" (
	"id" text PRIMARY KEY NOT NULL,
	"gift_id" text NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_types" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"guest_id" text,
	"name" text NOT NULL,
	"value" real,
	"status" text DEFAULT 'received',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts_enhanced" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"guest_id" text,
	"name" text NOT NULL,
	"type" text DEFAULT 'physical',
	"value" real,
	"thank_you_sent" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_calendar_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_conflicts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"guest1_id" text NOT NULL,
	"guest2_id" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_gifts" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"guest_id" text,
	"name" text NOT NULL,
	"type" text,
	"quantity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"preferences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_transport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"guest_name" text NOT NULL,
	"pickup_date" text,
	"pickup_time" time,
	"pickup_from" text,
	"drop_to" text,
	"transport_status" text DEFAULT 'scheduled',
	"vehicle_info" text,
	"vehicle_type" text,
	"vehicle_number" text,
	"vehicle_id" uuid,
	"driver_phone" text,
	"coordinator_phone" text,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"leg_type" "transport_leg_type" DEFAULT 'arrival',
	"leg_sequence" integer DEFAULT 1,
	"event_id" uuid
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text,
	"phone" text,
	"group_name" text,
	"table_number" integer,
	"serial_number" integer,
	"dietary_restrictions" text,
	"meal_preference" text DEFAULT 'standard',
	"rsvp_status" text DEFAULT 'pending' NOT NULL,
	"plus_one_allowed" boolean DEFAULT false NOT NULL,
	"plus_one_name" text,
	"plus_one_rsvp" text,
	"plus_one_meal_preference" text,
	"party_size" integer DEFAULT 1,
	"additional_guest_names" text[],
	"arrival_datetime" timestamp with time zone,
	"arrival_mode" text,
	"departure_datetime" timestamp with time zone,
	"departure_mode" text,
	"hotel_required" boolean DEFAULT false,
	"hotel_name" text,
	"hotel_check_in" text,
	"hotel_check_out" text,
	"hotel_room_type" text,
	"transport_required" boolean DEFAULT false,
	"transport_type" text,
	"transport_pickup_location" text,
	"transport_pickup_time" text,
	"transport_notes" text,
	"relationship_to_family" text,
	"attending_events" text[],
	"gift_to_give" text,
	"checked_in" boolean DEFAULT false,
	"checked_in_at" timestamp with time zone,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"guest_side" text DEFAULT 'mutual'
);
--> statement-breakpoint
CREATE TABLE "hotel_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"hotel_id" text NOT NULL,
	"guest_id" text NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"room_type" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"guest_id" uuid,
	"guest_name" text NOT NULL,
	"accommodation_id" uuid,
	"hotel_name" text,
	"room_number" text,
	"room_type" text,
	"check_in_date" text,
	"check_out_date" text,
	"accommodation_needed" boolean DEFAULT true,
	"booking_confirmed" boolean DEFAULT false,
	"checked_in" boolean DEFAULT false,
	"cost" numeric(15, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"payment_status" text DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	"party_size" integer DEFAULT 1,
	"guest_names_in_room" text,
	"room_assignments" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "ical_feed_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"client_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "ical_feed_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"amount" real NOT NULL,
	"status" text DEFAULT 'pending',
	"due_date" timestamp,
	"paid_at" timestamp,
	"stripe_invoice_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending',
	"scheduled_at" timestamp DEFAULT now(),
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"error" text,
	"created_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"guest_id" text,
	"sender_id" text,
	"receiver_id" text,
	"content" text,
	"type" text DEFAULT 'text',
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"amount" real NOT NULL,
	"status" text DEFAULT 'pending',
	"stripe_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"title" text,
	"body" text,
	"status" text DEFAULT 'sent',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_notification_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"subscription_id" text,
	"title" text,
	"body" text,
	"status" text DEFAULT 'sent',
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"rsvp_updates" boolean DEFAULT true,
	"messages" boolean DEFAULT true,
	"reminders" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"guest_id" text,
	"code" text NOT NULL,
	"scanned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qr_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"amount" real NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending',
	"stripe_refund_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"schedule" text,
	"enabled" boolean DEFAULT true,
	"last_run" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seating_change_log" (
	"id" text PRIMARY KEY NOT NULL,
	"floor_plan_id" text NOT NULL,
	"user_id" text,
	"change_type" text NOT NULL,
	"previous_data" jsonb,
	"new_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seating_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"floor_plan_id" text NOT NULL,
	"name" text NOT NULL,
	"layout" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"to" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'sent',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"rsvp_updates" boolean DEFAULT true,
	"reminders" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_account_id" text NOT NULL,
	"type" text DEFAULT 'express',
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_connect_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"stripe_account_id" text NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_client_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"team_member_id" text NOT NULL,
	"client_id" text NOT NULL,
	"role" text DEFAULT 'assigned',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thank_you_note_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"event_id" text,
	"title" text NOT NULL,
	"description" text,
	"phase" text DEFAULT 'showtime',
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" integer,
	"location" text,
	"participants" text[],
	"responsible_person" text,
	"completed" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"notes" text,
	"source_module" text,
	"source_id" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "timeline_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"offset_minutes" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"location" text,
	"phase" text DEFAULT 'showtime',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"auth_id" text,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"avatar_url" text,
	"role" text DEFAULT 'company_admin',
	"company_id" text,
	"is_active" boolean DEFAULT true,
	"preferred_language" text DEFAULT 'en',
	"preferred_currency" text DEFAULT 'USD',
	"timezone" text DEFAULT 'UTC',
	"auto_detect_locale" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"vehicle_number" text NOT NULL,
	"vehicle_type" text,
	"driver_name" text,
	"driver_phone" text,
	"coordinator_phone" text,
	"status" "vehicle_status" DEFAULT 'available',
	"current_transport_id" uuid,
	"available_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vendor_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"category" text,
	"contact_name" text,
	"email" text,
	"phone" text,
	"website" text,
	"address" text,
	"contract_signed" boolean DEFAULT false,
	"contract_date" text,
	"notes" text,
	"rating" integer,
	"is_preferred" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_builder_content" (
	"id" text PRIMARY KEY NOT NULL,
	"page_id" text NOT NULL,
	"content" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_builder_layouts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"template" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_builder_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"layout_id" text,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wedding_websites" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"subdomain" text,
	"custom_domain" text,
	"theme" text DEFAULT 'classic',
	"settings" jsonb,
	"published" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wedding_websites_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text,
	"to" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'sent',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"company_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"previous_stage_id" uuid,
	"new_stage_id" uuid,
	"due_at" timestamp,
	"completed_at" timestamp,
	"is_completed" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"stage_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text,
	"partner_first_name" text,
	"partner_last_name" text,
	"partner_email" text,
	"partner_phone" text,
	"wedding_date" text,
	"venue" text,
	"estimated_guest_count" integer,
	"estimated_budget" numeric(15, 2),
	"wedding_type" text,
	"source" text,
	"referral_source" text,
	"priority" text DEFAULT 'medium',
	"score" integer DEFAULT 0,
	"assignee_id" text,
	"status" "lead_status" DEFAULT 'new',
	"last_contacted_at" timestamp,
	"next_follow_up_at" timestamp,
	"converted_to_client_id" text,
	"converted_at" timestamp,
	"lost_reason" text,
	"notes" text,
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6B7280',
	"sort_order" integer DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"is_won" boolean DEFAULT false,
	"is_lost" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"content" text NOT NULL,
	"available_variables" text[],
	"require_client_signature" boolean DEFAULT true,
	"require_planner_signature" boolean DEFAULT true,
	"signatures_required" text DEFAULT 'both',
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"template_id" uuid,
	"proposal_id" uuid,
	"client_id" text,
	"title" text NOT NULL,
	"contract_number" text,
	"status" "contract_status" DEFAULT 'draft',
	"client_name" text,
	"client_email" text,
	"client_phone" text,
	"client_address" text,
	"wedding_date" text,
	"venue" text,
	"content" text NOT NULL,
	"total_amount" numeric(15, 2),
	"deposit_amount" numeric(15, 2),
	"deposit_due_date" timestamp,
	"final_payment_due_date" timestamp,
	"payment_schedule" jsonb,
	"currency" text DEFAULT 'USD',
	"valid_until" timestamp,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"public_token" text,
	"public_url" text,
	"client_signature_data" jsonb,
	"client_signed_at" timestamp,
	"planner_signature_data" jsonb,
	"planner_signed_at" timestamp,
	"fully_executed_at" timestamp,
	"pdf_url" text,
	"metadata" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "contracts_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "proposal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"intro_text" text,
	"terms_text" text,
	"signature_text" text,
	"default_packages" jsonb,
	"header_image_url" text,
	"accent_color" text DEFAULT '#6B7280',
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"template_id" uuid,
	"lead_id" uuid,
	"client_id" text,
	"title" text NOT NULL,
	"proposal_number" text,
	"status" "proposal_status" DEFAULT 'draft',
	"recipient_name" text,
	"recipient_email" text,
	"recipient_phone" text,
	"wedding_date" text,
	"venue" text,
	"guest_count" text,
	"intro_text" text,
	"service_packages" jsonb,
	"terms_text" text,
	"subtotal" numeric(15, 2),
	"discount" numeric(15, 2) DEFAULT '0',
	"discount_type" text DEFAULT 'fixed',
	"tax" numeric(15, 2) DEFAULT '0',
	"total" numeric(15, 2),
	"currency" text DEFAULT 'USD',
	"valid_until" timestamp,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"responded_at" timestamp,
	"public_token" text,
	"public_url" text,
	"client_response" text,
	"client_response_notes" text,
	"client_signature" jsonb,
	"metadata" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "proposals_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "workflow_execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"step_id" uuid,
	"step_type" "workflow_step_type",
	"step_name" text,
	"status" text NOT NULL,
	"message" text,
	"input_data" jsonb,
	"output_data" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"company_id" text NOT NULL,
	"trigger_type" "workflow_trigger_type" NOT NULL,
	"trigger_data" jsonb,
	"entity_type" text,
	"entity_id" text,
	"status" "workflow_execution_status" DEFAULT 'running',
	"current_step_id" uuid,
	"current_step_index" integer DEFAULT 0,
	"next_resume_at" timestamp,
	"execution_data" jsonb,
	"error" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"step_type" "workflow_step_type" NOT NULL,
	"step_order" integer DEFAULT 0 NOT NULL,
	"name" text,
	"config" jsonb,
	"wait_duration" integer,
	"wait_unit" text DEFAULT 'minutes',
	"condition_type" text,
	"condition_field" text,
	"condition_operator" text,
	"condition_value" text,
	"on_true_step_id" uuid,
	"on_false_step_id" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" "workflow_trigger_type" NOT NULL,
	"trigger_config" jsonb,
	"cron_expression" text,
	"timezone" text DEFAULT 'UTC',
	"is_active" boolean DEFAULT true,
	"is_template" boolean DEFAULT false,
	"metadata" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questionnaire_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionnaire_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"answer" jsonb,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaire_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"questions" jsonb DEFAULT '[]'::jsonb,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questionnaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" text NOT NULL,
	"template_id" uuid,
	"client_id" uuid,
	"event_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"questions" jsonb DEFAULT '[]'::jsonb,
	"status" "questionnaire_status" DEFAULT 'draft' NOT NULL,
	"public_token" text,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"reminder_sent_at" timestamp,
	"metadata" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "questionnaires_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_template_id_questionnaire_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."questionnaire_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "accommodations_client_id_idx" ON "accommodations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "clients_company_id_idx" ON "clients" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "guest_transport_client_id_idx" ON "guest_transport" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "guest_transport_guest_id_idx" ON "guest_transport" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "guest_transport_vehicle_id_idx" ON "guest_transport" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "guests_client_id_idx" ON "guests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "guests_rsvp_status_idx" ON "guests" USING btree ("rsvp_status");--> statement-breakpoint
CREATE INDEX "hotels_client_id_idx" ON "hotels" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "hotels_guest_id_idx" ON "hotels" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "job_queue_status_scheduled_idx" ON "job_queue" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "job_queue_company_id_idx" ON "job_queue" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "notifications_company_id_idx" ON "notifications" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "timeline_templates_company_event_idx" ON "timeline_templates" USING btree ("company_id","event_type");--> statement-breakpoint
CREATE INDEX "vehicles_client_id_idx" ON "vehicles" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "vehicles_vehicle_number_idx" ON "vehicles" USING btree ("vehicle_number");--> statement-breakpoint
CREATE INDEX "vehicles_status_idx" ON "vehicles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pipeline_activities_lead_idx" ON "pipeline_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "pipeline_activities_company_idx" ON "pipeline_activities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pipeline_activities_user_idx" ON "pipeline_activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pipeline_activities_type_idx" ON "pipeline_activities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "pipeline_leads_company_idx" ON "pipeline_leads" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pipeline_leads_stage_idx" ON "pipeline_leads" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "pipeline_leads_assignee_idx" ON "pipeline_leads" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "pipeline_leads_status_idx" ON "pipeline_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pipeline_leads_email_idx" ON "pipeline_leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "pipeline_stages_company_idx" ON "pipeline_stages" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pipeline_stages_sort_idx" ON "pipeline_stages" USING btree ("company_id","sort_order");--> statement-breakpoint
CREATE INDEX "contract_templates_company_idx" ON "contract_templates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "contracts_company_idx" ON "contracts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "contracts_client_idx" ON "contracts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "contracts_proposal_idx" ON "contracts" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contracts_public_token_idx" ON "contracts" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "proposal_templates_company_idx" ON "proposal_templates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "proposals_company_idx" ON "proposals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "proposals_lead_idx" ON "proposals" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "proposals_client_idx" ON "proposals" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proposals_public_token_idx" ON "proposals" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "workflow_execution_logs_execution_idx" ON "workflow_execution_logs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "workflow_execution_logs_step_idx" ON "workflow_execution_logs" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_workflow_idx" ON "workflow_executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_company_idx" ON "workflow_executions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_executions_next_resume_idx" ON "workflow_executions" USING btree ("next_resume_at");--> statement-breakpoint
CREATE INDEX "workflow_executions_entity_idx" ON "workflow_executions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "workflow_steps_workflow_idx" ON "workflow_steps" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_steps_order_idx" ON "workflow_steps" USING btree ("workflow_id","step_order");--> statement-breakpoint
CREATE INDEX "workflows_company_idx" ON "workflows" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "workflows_trigger_type_idx" ON "workflows" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "workflows_is_active_idx" ON "workflows" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "questionnaire_responses_questionnaire_idx" ON "questionnaire_responses" USING btree ("questionnaire_id");--> statement-breakpoint
CREATE INDEX "questionnaire_responses_question_idx" ON "questionnaire_responses" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "questionnaire_templates_company_idx" ON "questionnaire_templates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "questionnaire_templates_category_idx" ON "questionnaire_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "questionnaires_company_idx" ON "questionnaires" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "questionnaires_client_idx" ON "questionnaires" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "questionnaires_event_idx" ON "questionnaires" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "questionnaires_status_idx" ON "questionnaires" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questionnaires_public_token_idx" ON "questionnaires" USING btree ("public_token");