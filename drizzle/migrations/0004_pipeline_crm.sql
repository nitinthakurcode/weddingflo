-- Pipeline CRM Migration
-- February 2026 - Lead management and sales pipeline for WeddingFlo

-- Create enums for lead status and activity type
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('note', 'call', 'email', 'meeting', 'task', 'stage_change', 'proposal_sent', 'follow_up');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Pipeline Stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pipeline Leads table
CREATE TABLE IF NOT EXISTS pipeline_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,

  -- Lead contact info
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,

  -- Partner info (for weddings)
  partner_first_name TEXT,
  partner_last_name TEXT,
  partner_email TEXT,
  partner_phone TEXT,

  -- Wedding details
  wedding_date TEXT,
  venue TEXT,
  estimated_guest_count INTEGER,
  estimated_budget NUMERIC(15, 2),
  wedding_type TEXT,

  -- Lead metadata
  source TEXT,
  referral_source TEXT,
  priority TEXT DEFAULT 'medium',
  score INTEGER DEFAULT 0,

  -- Assignment
  assignee_id TEXT,

  -- Status tracking
  status lead_status DEFAULT 'new',
  last_contacted_at TIMESTAMP,
  next_follow_up_at TIMESTAMP,

  -- Conversion tracking
  converted_to_client_id TEXT,
  converted_at TIMESTAMP,
  lost_reason TEXT,

  -- Additional info
  notes TEXT,
  tags TEXT[],
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Pipeline Activities table
CREATE TABLE IF NOT EXISTS pipeline_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- For stage changes
  previous_stage_id UUID,
  new_stage_id UUID,

  -- For tasks/follow-ups
  due_at TIMESTAMP,
  completed_at TIMESTAMP,
  is_completed BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for pipeline_stages
CREATE INDEX IF NOT EXISTS pipeline_stages_company_idx ON pipeline_stages(company_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_sort_idx ON pipeline_stages(company_id, sort_order);

-- Indexes for pipeline_leads
CREATE INDEX IF NOT EXISTS pipeline_leads_company_idx ON pipeline_leads(company_id);
CREATE INDEX IF NOT EXISTS pipeline_leads_stage_idx ON pipeline_leads(stage_id);
CREATE INDEX IF NOT EXISTS pipeline_leads_assignee_idx ON pipeline_leads(assignee_id);
CREATE INDEX IF NOT EXISTS pipeline_leads_status_idx ON pipeline_leads(status);
CREATE INDEX IF NOT EXISTS pipeline_leads_email_idx ON pipeline_leads(email);

-- Indexes for pipeline_activities
CREATE INDEX IF NOT EXISTS pipeline_activities_lead_idx ON pipeline_activities(lead_id);
CREATE INDEX IF NOT EXISTS pipeline_activities_company_idx ON pipeline_activities(company_id);
CREATE INDEX IF NOT EXISTS pipeline_activities_user_idx ON pipeline_activities(user_id);
CREATE INDEX IF NOT EXISTS pipeline_activities_type_idx ON pipeline_activities(type);
