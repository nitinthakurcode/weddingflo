ALTER TABLE "advance_payments" ADD COLUMN "receipt_url" text;--> statement-breakpoint
ALTER TABLE "advance_payments" ADD COLUMN "receipt_file_name" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "gift_required" boolean DEFAULT false;