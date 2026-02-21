-- Migration: 0010_team_invitations.sql
-- February 2026 - Add invitation tables for proper auth flows

-- Team Invitations - For inviting staff members to a company
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL, -- References companies.id
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL, -- References user.id
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  accepted_by TEXT, -- References user.id of accepted user
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_invitations_token_idx ON team_invitations(token);
CREATE INDEX IF NOT EXISTS team_invitations_email_idx ON team_invitations(email);
CREATE INDEX IF NOT EXISTS team_invitations_company_id_idx ON team_invitations(company_id);

-- Wedding Invitations - For inviting clients/couples to their portal
CREATE TABLE IF NOT EXISTS wedding_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL, -- References clients.id
  company_id TEXT NOT NULL, -- References companies.id (denormalized)
  email TEXT NOT NULL,
  relationship TEXT, -- 'bride', 'groom', 'family_bride', 'family_groom', 'other'
  token TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL, -- References user.id
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  accepted_by TEXT, -- References user.id of accepted user
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wedding_invitations_token_idx ON wedding_invitations(token);
CREATE INDEX IF NOT EXISTS wedding_invitations_email_idx ON wedding_invitations(email);
CREATE INDEX IF NOT EXISTS wedding_invitations_client_id_idx ON wedding_invitations(client_id);
