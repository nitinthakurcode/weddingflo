-- Questionnaires Migration
-- February 2026 - Client questionnaire system for WeddingFlo

-- Create enums
DO $$ BEGIN
  CREATE TYPE question_type AS ENUM (
    'text',
    'textarea',
    'number',
    'date',
    'time',
    'datetime',
    'select',
    'multi_select',
    'checkbox',
    'radio',
    'rating',
    'file_upload',
    'image_upload',
    'color_picker',
    'scale'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE questionnaire_status AS ENUM (
    'draft',
    'sent',
    'viewed',
    'in_progress',
    'completed',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Questionnaire Templates table
CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  questions JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Questionnaires table (instances sent to clients)
CREATE TABLE IF NOT EXISTS questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  template_id UUID REFERENCES questionnaire_templates(id) ON DELETE SET NULL,
  client_id UUID,
  event_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB DEFAULT '[]',
  status questionnaire_status DEFAULT 'draft',
  public_token TEXT UNIQUE,
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  reminder_sent_at TIMESTAMP,
  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Questionnaire Responses table
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer JSONB,
  answered_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for questionnaire_templates
CREATE INDEX IF NOT EXISTS questionnaire_templates_company_idx ON questionnaire_templates(company_id);
CREATE INDEX IF NOT EXISTS questionnaire_templates_category_idx ON questionnaire_templates(category);

-- Indexes for questionnaires
CREATE INDEX IF NOT EXISTS questionnaires_company_idx ON questionnaires(company_id);
CREATE INDEX IF NOT EXISTS questionnaires_client_idx ON questionnaires(client_id);
CREATE INDEX IF NOT EXISTS questionnaires_event_idx ON questionnaires(event_id);
CREATE INDEX IF NOT EXISTS questionnaires_status_idx ON questionnaires(status);
CREATE INDEX IF NOT EXISTS questionnaires_public_token_idx ON questionnaires(public_token);

-- Indexes for questionnaire_responses
CREATE INDEX IF NOT EXISTS questionnaire_responses_questionnaire_idx ON questionnaire_responses(questionnaire_id);
CREATE INDEX IF NOT EXISTS questionnaire_responses_question_idx ON questionnaire_responses(question_id);
