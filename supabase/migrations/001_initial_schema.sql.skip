-- ============================================================================
-- WeddingFlow Pro - Initial Database Schema Migration
-- ============================================================================
-- This migration creates the complete database schema for WeddingFlow Pro
-- with Clerk authentication integration and multi-tenant RLS policies.
--
-- Compatible with:
-- - New Supabase API keys (sb_publishable_*, sb_secret_*)
-- - Clerk JWT tokens
-- - Row Level Security (RLS) for multi-tenant isolation
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'company_admin',
  'planner',
  'vendor',
  'client',
  'guest'
);

CREATE TYPE subscription_tier AS ENUM (
  'free',
  'starter',
  'professional',
  'enterprise'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired'
);

CREATE TYPE event_status AS ENUM (
  'draft',
  'planning',
  'confirmed',
  'in_progress',
  'completed',
  'canceled'
);

CREATE TYPE rsvp_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'tentative',
  'no_response'
);

CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress',
  'completed',
  'canceled'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'overdue',
  'canceled',
  'refunded'
);

CREATE TYPE vendor_category AS ENUM (
  'venue',
  'catering',
  'photography',
  'videography',
  'florals',
  'music',
  'dj',
  'transportation',
  'accommodation',
  'beauty',
  'bakery',
  'decor',
  'entertainment',
  'stationery',
  'rentals',
  'other'
);

CREATE TYPE meal_preference AS ENUM (
  'standard',
  'vegetarian',
  'vegan',
  'kosher',
  'halal',
  'gluten_free',
  'other'
);

-- ============================================================================
-- 3. HELPER FUNCTIONS FOR CLERK JWT PARSING
-- ============================================================================

-- Get the Clerk user ID from the JWT token
CREATE OR REPLACE FUNCTION requesting_clerk_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() ->> 'sub',
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get the user's role from the users table
CREATE OR REPLACE FUNCTION requesting_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role
  FROM users
  WHERE clerk_id = requesting_clerk_id();

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get the user's company_id from the users table
CREATE OR REPLACE FUNCTION requesting_user_company_id()
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM users
  WHERE clerk_id = requesting_clerk_id();

  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if the requesting user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN requesting_user_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if the requesting user is a company admin or higher
CREATE OR REPLACE FUNCTION is_company_admin_or_higher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN requesting_user_role() IN ('super_admin', 'company_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get the user's ID from the users table
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE clerk_id = requesting_clerk_id();

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 4. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Companies Table
-- ----------------------------------------------------------------------------

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  branding JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  subscription_status subscription_status NOT NULL DEFAULT 'trialing',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT companies_name_check CHECK (char_length(name) >= 1),
  CONSTRAINT companies_subdomain_check CHECK (subdomain ~* '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

-- Indexes
CREATE INDEX idx_companies_subdomain ON companies(subdomain);
CREATE INDEX idx_companies_stripe_customer_id ON companies(stripe_customer_id);
CREATE INDEX idx_companies_subscription_status ON companies(subscription_status);

-- ----------------------------------------------------------------------------
-- Users Table
-- ----------------------------------------------------------------------------

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'planner',
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_clerk_id_check CHECK (char_length(clerk_id) > 0)
);

-- Indexes
CREATE UNIQUE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);

-- ----------------------------------------------------------------------------
-- Clients Table
-- ----------------------------------------------------------------------------

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  partner1_first_name TEXT NOT NULL,
  partner1_last_name TEXT NOT NULL,
  partner1_email TEXT NOT NULL,
  partner1_phone TEXT,
  partner2_first_name TEXT,
  partner2_last_name TEXT,
  partner2_email TEXT,
  partner2_phone TEXT,
  wedding_date DATE,
  venue TEXT,
  budget DECIMAL(12, 2),
  guest_count INTEGER,
  status event_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT clients_partner1_email_check CHECK (partner1_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT clients_partner2_email_check CHECK (partner2_email IS NULL OR partner2_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT clients_budget_check CHECK (budget IS NULL OR budget >= 0),
  CONSTRAINT clients_guest_count_check CHECK (guest_count IS NULL OR guest_count >= 0)
);

-- Indexes
CREATE INDEX idx_clients_company_id ON clients(company_id);
CREATE INDEX idx_clients_wedding_date ON clients(wedding_date);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_created_by ON clients(created_by);

-- ----------------------------------------------------------------------------
-- Client Users Table (junction for clients and their portal users)
-- ----------------------------------------------------------------------------

CREATE TABLE client_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'partner',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT client_users_unique UNIQUE(client_id, user_id)
);

-- Indexes
CREATE INDEX idx_client_users_client_id ON client_users(client_id);
CREATE INDEX idx_client_users_user_id ON client_users(user_id);
CREATE INDEX idx_client_users_is_primary ON client_users(is_primary);

-- ----------------------------------------------------------------------------
-- Guests Table
-- ----------------------------------------------------------------------------

CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  group_name TEXT,
  table_number INTEGER,
  dietary_restrictions TEXT,
  meal_preference meal_preference DEFAULT 'standard',
  rsvp_status rsvp_status NOT NULL DEFAULT 'pending',
  plus_one_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  plus_one_name TEXT,
  plus_one_rsvp rsvp_status,
  plus_one_meal_preference meal_preference,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT guests_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT guests_table_number_check CHECK (table_number IS NULL OR table_number > 0)
);

-- Indexes
CREATE INDEX idx_guests_client_id ON guests(client_id);
CREATE INDEX idx_guests_rsvp_status ON guests(rsvp_status);
CREATE INDEX idx_guests_table_number ON guests(table_number);
CREATE INDEX idx_guests_group_name ON guests(group_name);

-- ----------------------------------------------------------------------------
-- Vendors Table
-- ----------------------------------------------------------------------------

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category vendor_category NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'US',
  notes TEXT,
  rating DECIMAL(3, 2),
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT vendors_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT vendors_rating_check CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

-- Indexes
CREATE INDEX idx_vendors_company_id ON vendors(company_id);
CREATE INDEX idx_vendors_category ON vendors(category);
CREATE INDEX idx_vendors_is_preferred ON vendors(is_preferred);
CREATE INDEX idx_vendors_name ON vendors(name);

-- ----------------------------------------------------------------------------
-- Client Vendors Table (junction for clients and their hired vendors)
-- ----------------------------------------------------------------------------

CREATE TABLE client_vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contract_amount DECIMAL(12, 2),
  deposit_amount DECIMAL(12, 2),
  payment_status payment_status NOT NULL DEFAULT 'pending',
  contract_signed_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT client_vendors_unique UNIQUE(client_id, vendor_id),
  CONSTRAINT client_vendors_contract_amount_check CHECK (contract_amount IS NULL OR contract_amount >= 0),
  CONSTRAINT client_vendors_deposit_amount_check CHECK (deposit_amount IS NULL OR deposit_amount >= 0)
);

-- Indexes
CREATE INDEX idx_client_vendors_client_id ON client_vendors(client_id);
CREATE INDEX idx_client_vendors_vendor_id ON client_vendors(vendor_id);
CREATE INDEX idx_client_vendors_payment_status ON client_vendors(payment_status);

-- ----------------------------------------------------------------------------
-- Tasks Table
-- ----------------------------------------------------------------------------

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tasks_title_check CHECK (char_length(title) >= 1)
);

-- Indexes
CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- ----------------------------------------------------------------------------
-- Timeline Table
-- ----------------------------------------------------------------------------

CREATE TABLE timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  participants TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT timeline_title_check CHECK (char_length(title) >= 1),
  CONSTRAINT timeline_time_check CHECK (end_time IS NULL OR end_time > start_time)
);

-- Indexes
CREATE INDEX idx_timeline_client_id ON timeline(client_id);
CREATE INDEX idx_timeline_start_time ON timeline(start_time);

-- ----------------------------------------------------------------------------
-- Budget Table
-- ----------------------------------------------------------------------------

CREATE TABLE budget (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item TEXT NOT NULL,
  estimated_cost DECIMAL(12, 2),
  actual_cost DECIMAL(12, 2),
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT budget_estimated_cost_check CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  CONSTRAINT budget_actual_cost_check CHECK (actual_cost IS NULL OR actual_cost >= 0),
  CONSTRAINT budget_paid_amount_check CHECK (paid_amount >= 0)
);

-- Indexes
CREATE INDEX idx_budget_client_id ON budget(client_id);
CREATE INDEX idx_budget_vendor_id ON budget(vendor_id);
CREATE INDEX idx_budget_category ON budget(category);

-- ----------------------------------------------------------------------------
-- Documents Table
-- ----------------------------------------------------------------------------

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  folder TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT documents_file_size_check CHECK (file_size > 0)
);

-- Indexes
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_folder ON documents(folder);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- ----------------------------------------------------------------------------
-- Messages Table (for client-planner communication)
-- ----------------------------------------------------------------------------

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT messages_body_check CHECK (char_length(body) >= 1)
);

-- Indexes
CREATE INDEX idx_messages_client_id ON messages(client_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id);

-- ----------------------------------------------------------------------------
-- Activity Logs Table
-- ----------------------------------------------------------------------------

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT activity_logs_action_check CHECK (char_length(action) >= 1)
);

-- Indexes
CREATE INDEX idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_client_id ON activity_logs(client_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- ============================================================================
-- 5. TRIGGERS FOR UPDATED_AT COLUMNS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_users_updated_at BEFORE UPDATE ON client_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_vendors_updated_at BEFORE UPDATE ON client_vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_updated_at BEFORE UPDATE ON timeline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_updated_at BEFORE UPDATE ON budget
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Companies Policies
-- ----------------------------------------------------------------------------

-- Super admins can see all companies
CREATE POLICY "Super admins can view all companies"
  ON companies FOR SELECT
  USING (is_super_admin());

-- Users can view their own company
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = requesting_user_company_id());

-- Super admins can insert companies
CREATE POLICY "Super admins can insert companies"
  ON companies FOR INSERT
  WITH CHECK (is_super_admin());

-- Company admins can update their own company
CREATE POLICY "Company admins can update their own company"
  ON companies FOR UPDATE
  USING (id = requesting_user_company_id() AND is_company_admin_or_higher());

-- Super admins can delete companies
CREATE POLICY "Super admins can delete companies"
  ON companies FOR DELETE
  USING (is_super_admin());

-- ----------------------------------------------------------------------------
-- Users Policies
-- ----------------------------------------------------------------------------

-- Super admins can see all users
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  USING (is_super_admin());

-- Users in the same company can view each other
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (company_id = requesting_user_company_id());

-- Users can view themselves
CREATE POLICY "Users can view themselves"
  ON users FOR SELECT
  USING (clerk_id = requesting_clerk_id());

-- Super admins and company admins can insert users
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (
    is_super_admin() OR
    (is_company_admin_or_higher() AND company_id = requesting_user_company_id())
  );

-- Users can update themselves
CREATE POLICY "Users can update themselves"
  ON users FOR UPDATE
  USING (clerk_id = requesting_clerk_id());

-- Company admins can update users in their company
CREATE POLICY "Company admins can update users in their company"
  ON users FOR UPDATE
  USING (
    company_id = requesting_user_company_id() AND
    is_company_admin_or_higher()
  );

-- Super admins can delete any user
CREATE POLICY "Super admins can delete users"
  ON users FOR DELETE
  USING (is_super_admin());

-- Company admins can delete users in their company
CREATE POLICY "Company admins can delete users in their company"
  ON users FOR DELETE
  USING (
    company_id = requesting_user_company_id() AND
    is_company_admin_or_higher() AND
    clerk_id != requesting_clerk_id() -- Can't delete themselves
  );

-- ----------------------------------------------------------------------------
-- Clients Policies
-- ----------------------------------------------------------------------------

-- Users can view clients in their company
CREATE POLICY "Users can view clients in their company"
  ON clients FOR SELECT
  USING (company_id = requesting_user_company_id());

-- Users can insert clients in their company
CREATE POLICY "Users can insert clients in their company"
  ON clients FOR INSERT
  WITH CHECK (company_id = requesting_user_company_id());

-- Users can update clients in their company
CREATE POLICY "Users can update clients in their company"
  ON clients FOR UPDATE
  USING (company_id = requesting_user_company_id());

-- Company admins can delete clients in their company
CREATE POLICY "Company admins can delete clients"
  ON clients FOR DELETE
  USING (
    company_id = requesting_user_company_id() AND
    is_company_admin_or_higher()
  );

-- ----------------------------------------------------------------------------
-- Client Users Policies
-- ----------------------------------------------------------------------------

-- Users can view client_users for clients in their company
CREATE POLICY "Users can view client_users in their company"
  ON client_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_users.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can insert client_users for clients in their company
CREATE POLICY "Users can insert client_users in their company"
  ON client_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_users.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can update client_users for clients in their company
CREATE POLICY "Users can update client_users in their company"
  ON client_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_users.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can delete client_users for clients in their company
CREATE POLICY "Users can delete client_users in their company"
  ON client_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_users.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- Guests Policies
-- ----------------------------------------------------------------------------

-- Users can view guests for clients in their company
CREATE POLICY "Users can view guests in their company"
  ON guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can insert guests for clients in their company
CREATE POLICY "Users can insert guests in their company"
  ON guests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can update guests for clients in their company
CREATE POLICY "Users can update guests in their company"
  ON guests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can delete guests for clients in their company
CREATE POLICY "Users can delete guests in their company"
  ON guests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- Vendors Policies
-- ----------------------------------------------------------------------------

-- Users can view vendors in their company
CREATE POLICY "Users can view vendors in their company"
  ON vendors FOR SELECT
  USING (company_id = requesting_user_company_id());

-- Users can insert vendors in their company
CREATE POLICY "Users can insert vendors in their company"
  ON vendors FOR INSERT
  WITH CHECK (company_id = requesting_user_company_id());

-- Users can update vendors in their company
CREATE POLICY "Users can update vendors in their company"
  ON vendors FOR UPDATE
  USING (company_id = requesting_user_company_id());

-- Company admins can delete vendors in their company
CREATE POLICY "Company admins can delete vendors"
  ON vendors FOR DELETE
  USING (
    company_id = requesting_user_company_id() AND
    is_company_admin_or_higher()
  );

-- ----------------------------------------------------------------------------
-- Client Vendors Policies
-- ----------------------------------------------------------------------------

-- Users can view client_vendors for clients in their company
CREATE POLICY "Users can view client_vendors in their company"
  ON client_vendors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_vendors.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can insert client_vendors for clients in their company
CREATE POLICY "Users can insert client_vendors in their company"
  ON client_vendors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_vendors.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can update client_vendors for clients in their company
CREATE POLICY "Users can update client_vendors in their company"
  ON client_vendors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_vendors.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can delete client_vendors for clients in their company
CREATE POLICY "Users can delete client_vendors in their company"
  ON client_vendors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_vendors.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- Tasks Policies
-- ----------------------------------------------------------------------------

-- Users can view tasks for clients in their company
CREATE POLICY "Users can view tasks in their company"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = tasks.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can insert tasks for clients in their company
CREATE POLICY "Users can insert tasks in their company"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = tasks.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can update tasks for clients in their company
CREATE POLICY "Users can update tasks in their company"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = tasks.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can delete tasks for clients in their company
CREATE POLICY "Users can delete tasks in their company"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = tasks.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- Timeline Policies
-- ----------------------------------------------------------------------------

-- Users can view timeline for clients in their company
CREATE POLICY "Users can view timeline in their company"
  ON timeline FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can insert timeline for clients in their company
CREATE POLICY "Users can insert timeline in their company"
  ON timeline FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can update timeline for clients in their company
CREATE POLICY "Users can update timeline in their company"
  ON timeline FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can delete timeline for clients in their company
CREATE POLICY "Users can delete timeline in their company"
  ON timeline FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- Budget Policies
-- ----------------------------------------------------------------------------

-- Users can view budget for clients in their company
CREATE POLICY "Users can view budget in their company"
  ON budget FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can insert budget for clients in their company
CREATE POLICY "Users can insert budget in their company"
  ON budget FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can update budget for clients in their company
CREATE POLICY "Users can update budget in their company"
  ON budget FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can delete budget for clients in their company
CREATE POLICY "Users can delete budget in their company"
  ON budget FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- ----------------------------------------------------------------------------
-- Documents Policies
-- ----------------------------------------------------------------------------

-- Users can view documents for clients in their company
CREATE POLICY "Users can view documents in their company"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can insert documents for clients in their company
CREATE POLICY "Users can insert documents in their company"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can update documents for clients in their company
CREATE POLICY "Users can update documents in their company"
  ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id = requesting_user_company_id()
    )
  );

-- Users can delete their own documents or company admins can delete any
CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (
    uploaded_by = requesting_user_id() OR
    (is_company_admin_or_higher() AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id = requesting_user_company_id()
    ))
  );

-- ----------------------------------------------------------------------------
-- Messages Policies
-- ----------------------------------------------------------------------------

-- Users can view messages for clients in their company
CREATE POLICY "Users can view messages in their company"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = messages.client_id
      AND clients.company_id = requesting_user_company_id()
    ) OR
    sender_id = requesting_user_id() OR
    recipient_id = requesting_user_id()
  );

-- Users can insert messages for clients in their company
CREATE POLICY "Users can insert messages in their company"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = messages.client_id
      AND clients.company_id = requesting_user_company_id()
    ) AND
    sender_id = requesting_user_id()
  );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = requesting_user_id() OR recipient_id = requesting_user_id());

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE
  USING (sender_id = requesting_user_id());

-- ----------------------------------------------------------------------------
-- Activity Logs Policies
-- ----------------------------------------------------------------------------

-- Users can view activity logs for their company
CREATE POLICY "Users can view activity logs in their company"
  ON activity_logs FOR SELECT
  USING (company_id = requesting_user_company_id() OR is_super_admin());

-- System can insert activity logs (no user check needed)
CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);

-- Super admins can delete activity logs
CREATE POLICY "Super admins can delete activity logs"
  ON activity_logs FOR DELETE
  USING (is_super_admin());

-- ============================================================================
-- 7. COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE companies IS 'Stores company information and subscription details';
COMMENT ON TABLE users IS 'Stores user accounts linked to Clerk authentication';
COMMENT ON TABLE clients IS 'Stores wedding client information (couples)';
COMMENT ON TABLE client_users IS 'Junction table linking clients to their portal users';
COMMENT ON TABLE guests IS 'Stores guest list and RSVP information';
COMMENT ON TABLE vendors IS 'Stores vendor directory for the company';
COMMENT ON TABLE client_vendors IS 'Junction table linking clients to their hired vendors';
COMMENT ON TABLE tasks IS 'Stores tasks and to-dos for wedding planning';
COMMENT ON TABLE timeline IS 'Stores day-of timeline events';
COMMENT ON TABLE budget IS 'Stores budget items and expense tracking';
COMMENT ON TABLE documents IS 'Stores document metadata (files stored in object storage)';
COMMENT ON TABLE messages IS 'Stores messages between planners and clients';
COMMENT ON TABLE activity_logs IS 'Stores audit trail of all actions';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
