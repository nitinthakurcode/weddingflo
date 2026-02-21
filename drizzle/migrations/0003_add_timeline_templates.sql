-- Migration: Add Timeline Templates table
-- January 2026 - Company-customizable timeline templates

-- Create timeline_templates table for company-specific template customizations
CREATE TABLE IF NOT EXISTS "timeline_templates" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "offset_minutes" INTEGER NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "location" TEXT,
  "phase" TEXT DEFAULT 'showtime',
  "sort_order" INTEGER DEFAULT 0,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create index for efficient company + event_type queries
CREATE INDEX IF NOT EXISTS "timeline_templates_company_event_idx"
ON "timeline_templates" ("company_id", "event_type");

-- Add comments for documentation
COMMENT ON TABLE "timeline_templates" IS 'Company-customizable timeline templates for event types';
COMMENT ON COLUMN "timeline_templates"."event_type" IS 'Event type: wedding, sangeet, mehendi, haldi, reception, etc.';
COMMENT ON COLUMN "timeline_templates"."offset_minutes" IS 'Minutes from event start time (negative for before)';
COMMENT ON COLUMN "timeline_templates"."phase" IS 'setup | showtime | wrapup - event phase segmentation';
COMMENT ON COLUMN "timeline_templates"."is_active" IS 'Soft disable items without deleting';
