-- Proposals & Contracts Migration
-- February 2026 - Proposals, contracts, and e-signature system

-- Create enums for proposal and contract status
DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('draft', 'pending_signature', 'signed', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Proposal Templates table
CREATE TABLE IF NOT EXISTS proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  intro_text TEXT,
  terms_text TEXT,
  signature_text TEXT,
  default_packages JSONB,
  header_image_url TEXT,
  accent_color TEXT DEFAULT '#6B7280',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  template_id UUID REFERENCES proposal_templates(id) ON DELETE SET NULL,
  lead_id UUID,
  client_id TEXT,

  title TEXT NOT NULL,
  proposal_number TEXT,
  status proposal_status DEFAULT 'draft',

  recipient_name TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,

  wedding_date TEXT,
  venue TEXT,
  guest_count TEXT,

  intro_text TEXT,
  service_packages JSONB,
  terms_text TEXT,

  subtotal NUMERIC(15, 2),
  discount NUMERIC(15, 2) DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  tax NUMERIC(15, 2) DEFAULT 0,
  total NUMERIC(15, 2),
  currency TEXT DEFAULT 'USD',

  valid_until TIMESTAMP,
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  responded_at TIMESTAMP,

  public_token TEXT UNIQUE,
  public_url TEXT,

  client_response TEXT,
  client_response_notes TEXT,
  client_signature JSONB,

  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Contract Templates table
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  available_variables TEXT[],
  require_client_signature BOOLEAN DEFAULT true,
  require_planner_signature BOOLEAN DEFAULT true,
  signatures_required TEXT DEFAULT 'both',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL,
  template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  client_id TEXT,

  title TEXT NOT NULL,
  contract_number TEXT,
  status contract_status DEFAULT 'draft',

  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,

  wedding_date TEXT,
  venue TEXT,

  content TEXT NOT NULL,

  total_amount NUMERIC(15, 2),
  deposit_amount NUMERIC(15, 2),
  deposit_due_date TIMESTAMP,
  final_payment_due_date TIMESTAMP,
  payment_schedule JSONB,
  currency TEXT DEFAULT 'USD',

  valid_until TIMESTAMP,
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,

  public_token TEXT UNIQUE,
  public_url TEXT,

  client_signature_data JSONB,
  client_signed_at TIMESTAMP,
  planner_signature_data JSONB,
  planner_signed_at TIMESTAMP,

  fully_executed_at TIMESTAMP,
  pdf_url TEXT,

  metadata JSONB,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes for proposal_templates
CREATE INDEX IF NOT EXISTS proposal_templates_company_idx ON proposal_templates(company_id);

-- Indexes for proposals
CREATE INDEX IF NOT EXISTS proposals_company_idx ON proposals(company_id);
CREATE INDEX IF NOT EXISTS proposals_lead_idx ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS proposals_client_idx ON proposals(client_id);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
CREATE INDEX IF NOT EXISTS proposals_public_token_idx ON proposals(public_token);

-- Indexes for contract_templates
CREATE INDEX IF NOT EXISTS contract_templates_company_idx ON contract_templates(company_id);

-- Indexes for contracts
CREATE INDEX IF NOT EXISTS contracts_company_idx ON contracts(company_id);
CREATE INDEX IF NOT EXISTS contracts_client_idx ON contracts(client_id);
CREATE INDEX IF NOT EXISTS contracts_proposal_idx ON contracts(proposal_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts(status);
CREATE INDEX IF NOT EXISTS contracts_public_token_idx ON contracts(public_token);
