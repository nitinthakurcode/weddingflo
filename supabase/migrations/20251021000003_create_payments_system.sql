-- Create enum types for payment status (if they don't exist)
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'requires_action',
    'succeeded',
    'canceled',
    'failed',
    'refunded',
    'partially_refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'draft',
    'open',
    'paid',
    'void',
    'uncollectible',
    'overdue'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE stripe_account_status AS ENUM (
    'pending',
    'enabled',
    'restricted',
    'disabled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Stripe Connect accounts table (for vendors/planners to receive payments)
CREATE TABLE IF NOT EXISTS stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_type TEXT DEFAULT 'express' CHECK (account_type IN ('express', 'standard', 'custom')),
  status stripe_account_status DEFAULT 'pending',
  email TEXT,
  business_name TEXT,
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'usd',
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status invoice_status DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'usd',
  subtotal BIGINT NOT NULL DEFAULT 0, -- Amount in smallest currency unit (cents)
  tax_amount BIGINT DEFAULT 0,
  discount_amount BIGINT DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  amount_paid BIGINT DEFAULT 0,
  amount_due BIGINT DEFAULT 0,
  issue_date DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  description TEXT,
  notes TEXT,
  line_items JSONB DEFAULT '[]', -- Array of {description, quantity, unit_price, amount}
  billing_details JSONB DEFAULT '{}', -- {name, email, address}
  metadata JSONB DEFAULT '{}',
  pdf_url TEXT, -- Link to generated PDF
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_account_id UUID REFERENCES stripe_accounts(id) ON DELETE SET NULL, -- Connected account receiving payment
  amount BIGINT NOT NULL, -- Amount in smallest currency unit
  currency TEXT NOT NULL DEFAULT 'usd',
  status payment_status DEFAULT 'pending',
  payment_method TEXT, -- card, bank_transfer, etc.
  payment_method_details JSONB DEFAULT '{}', -- {brand, last4, exp_month, exp_year}
  application_fee_amount BIGINT DEFAULT 0, -- Platform fee
  description TEXT,
  receipt_email TEXT,
  receipt_url TEXT,
  client_secret TEXT, -- For frontend payment confirmation
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  stripe_refund_id TEXT UNIQUE,
  amount BIGINT NOT NULL, -- Amount refunded in smallest currency unit
  currency TEXT NOT NULL,
  reason TEXT CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods table (saved customer payment methods)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank_account', 'sepa_debit', 'us_bank_account')),
  card_brand TEXT, -- visa, mastercard, amex, etc.
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  billing_details JSONB DEFAULT '{}', -- {name, email, phone, address}
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_accounts

CREATE POLICY "Users can view stripe accounts in their company"
  ON stripe_accounts
  FOR SELECT
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can insert stripe accounts for their company"
  ON stripe_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can update stripe accounts in their company"
  ON stripe_accounts
  FOR UPDATE
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- RLS Policies for invoices

CREATE POLICY "Users can view invoices in their company"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can insert invoices for their company"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can update invoices in their company"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can delete invoices in their company"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- RLS Policies for payments

CREATE POLICY "Users can view payments in their company"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can insert payments for their company"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can update payments in their company"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- RLS Policies for refunds

CREATE POLICY "Users can view refunds in their company"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can insert refunds for their company"
  ON refunds
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- RLS Policies for payment_methods

CREATE POLICY "Users can view payment methods in their company"
  ON payment_methods
  FOR SELECT
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can insert payment methods for their company"
  ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can update payment methods in their company"
  ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

CREATE POLICY "Users can delete payment methods in their company"
  ON payment_methods
  FOR DELETE
  TO authenticated
  USING (
    company_id::text = auth.jwt()->'metadata'->>'company_id'
  );

-- Indexes for performance

-- Stripe accounts indexes
CREATE INDEX idx_stripe_accounts_company_id ON stripe_accounts(company_id);
CREATE INDEX idx_stripe_accounts_user_id ON stripe_accounts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_stripe_accounts_stripe_account_id ON stripe_accounts(stripe_account_id);
CREATE INDEX idx_stripe_accounts_status ON stripe_accounts(status);

-- Invoices indexes
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_invoices_company_status_due ON invoices(company_id, status, due_date);

-- Payments indexes
CREATE INDEX idx_payments_company_id ON payments(company_id);
CREATE INDEX idx_payments_client_id ON payments(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_payments_stripe_account_id ON payments(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Composite index for analytics
CREATE INDEX idx_payments_company_status_created ON payments(company_id, status, created_at DESC);

-- Refunds indexes
CREATE INDEX idx_refunds_company_id ON refunds(company_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_stripe_refund_id ON refunds(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;
CREATE INDEX idx_refunds_status ON refunds(status);

-- Payment methods indexes
CREATE INDEX idx_payment_methods_company_id ON payment_methods(company_id);
CREATE INDEX idx_payment_methods_client_id ON payment_methods(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_payment_methods_stripe_customer_id ON payment_methods(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default) WHERE is_default = TRUE;

-- Triggers for updated_at

CREATE OR REPLACE FUNCTION update_stripe_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stripe_accounts_updated_at
  BEFORE UPDATE ON stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_accounts_updated_at();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

CREATE TRIGGER refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_refunds_updated_at();

CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Function to get payment statistics
CREATE OR REPLACE FUNCTION get_payment_stats(p_company_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_payments BIGINT,
  successful_payments BIGINT,
  failed_payments BIGINT,
  total_amount BIGINT,
  total_refunded BIGINT,
  success_rate NUMERIC,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_payments,
    COUNT(*) FILTER (WHERE status = 'succeeded')::BIGINT as successful_payments,
    COUNT(*) FILTER (WHERE status IN ('failed', 'canceled'))::BIGINT as failed_payments,
    COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0)::BIGINT as total_amount,
    COALESCE(
      (SELECT SUM(r.amount)
       FROM refunds r
       JOIN payments p ON r.payment_id = p.id
       WHERE p.company_id = p_company_id
       AND r.status = 'succeeded'
       AND r.created_at >= NOW() - INTERVAL '1 day' * p_days),
      0
    )::BIGINT as total_refunded,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'succeeded')::NUMERIC / COUNT(*)::NUMERIC) * 100,
          2
        )
      ELSE 0
    END as success_rate,
    COALESCE(MAX(currency), 'usd') as currency
  FROM payments
  WHERE
    company_id = p_company_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_invoice_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Get count of invoices for this year
  SELECT COUNT(*) INTO v_count
  FROM invoices
  WHERE company_id = p_company_id
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate invoice number: INV-YYYY-0001
  v_invoice_number := 'INV-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 4, '0');

  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update invoice totals and status
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total from line items if they exist
  IF NEW.line_items IS NOT NULL THEN
    NEW.total_amount := NEW.subtotal + COALESCE(NEW.tax_amount, 0) - COALESCE(NEW.discount_amount, 0);
    NEW.amount_due := NEW.total_amount - COALESCE(NEW.amount_paid, 0);
  END IF;

  -- Update status based on payment
  IF NEW.amount_paid >= NEW.total_amount THEN
    NEW.status := 'paid';
    IF NEW.paid_at IS NULL THEN
      NEW.paid_at := NOW();
    END IF;
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('paid', 'void') THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_totals_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON stripe_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payments TO authenticated;
GRANT SELECT, INSERT ON refunds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE stripe_accounts IS 'Stripe Connect accounts for vendors to receive payments';
COMMENT ON TABLE invoices IS 'Invoice records with line items and payment tracking';
COMMENT ON TABLE payments IS 'Payment transactions processed through Stripe';
COMMENT ON TABLE refunds IS 'Refund transactions for payments';
COMMENT ON TABLE payment_methods IS 'Saved customer payment methods';

COMMENT ON FUNCTION get_payment_stats IS 'Get payment statistics for a company over specified days';
COMMENT ON FUNCTION generate_invoice_number IS 'Generate sequential invoice number for company';
COMMENT ON FUNCTION update_invoice_totals IS 'Automatically calculate invoice totals and update status';
