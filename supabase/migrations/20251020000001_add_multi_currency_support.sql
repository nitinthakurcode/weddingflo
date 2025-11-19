-- ============================================================================
-- Migration: 20251020000001_add_multi_currency_support.sql
-- Description: Comprehensive multi-currency support for WeddingFlow Pro
-- Author: WeddingFlow Pro Team
-- Date: 2025-10-20
-- ============================================================================
--
-- This migration adds complete multi-currency support including:
-- 1. User and company currency preferences
-- 2. Currency columns on all monetary tables (budget, client_vendors, hotels, gifts)
-- 3. Currency exchange rates table with automatic conversion function
-- 4. RLS policies for currency rate management
-- 5. Performance indexes and data validation constraints
-- 6. Comprehensive documentation via comments
--
-- Tables Modified:
-- - users: added preferred_currency, preferred_language, timezone, auto_detect_locale
-- - companies: added default_currency, supported_currencies
-- - budget: added currency column
-- - client_vendors: added currency column
-- - hotels: added currency column
-- - gifts: added estimated_value and currency columns (enhanced schema)
--
-- Tables Created:
-- - currency_rates: exchange rates with RLS for super admin management
--
-- Functions Created:
-- - convert_currency(amount, from_currency, to_currency): bidirectional conversion
--
-- ============================================================================

-- Add currency support to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS auto_detect_locale BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Add currency support to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS default_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS supported_currencies TEXT[] DEFAULT ARRAY['USD', 'EUR', 'GBP'];

-- Create currency rates table for conversion
CREATE TABLE IF NOT EXISTS currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  target_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(15, 6) NOT NULL,  -- Supports rates up to 999,999,999.999999 (e.g., IDR, VND)
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(base_currency, target_currency)
);

-- Enable RLS on currency_rates
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read currency rates
CREATE POLICY "Anyone can read currency rates"
  ON currency_rates FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can modify currency rates
CREATE POLICY "Super admins can manage currency rates"
  ON currency_rates FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
  );

-- Add currency to budget table (estimated_cost, actual_cost, paid_amount)
ALTER TABLE budget
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add currency to client_vendors table (contract_amount, deposit_amount)
ALTER TABLE client_vendors
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add currency to hotels table (cost)
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add gift value tracking with currency support to gifts table
ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Insert default currency rates (approximate rates as of Oct 2025)
-- Note: These should be updated regularly via API integration (e.g., exchangerate-api.com)
INSERT INTO currency_rates (base_currency, target_currency, rate) VALUES
-- USD as base
('USD', 'USD', 1.000000),
('USD', 'EUR', 0.920000),  -- Euro
('USD', 'GBP', 0.790000),  -- British Pound
('USD', 'CHF', 0.880000),  -- Swiss Franc
('USD', 'JPY', 149.500000), -- Japanese Yen
('USD', 'AUD', 1.520000),  -- Australian Dollar
('USD', 'CAD', 1.360000),  -- Canadian Dollar
('USD', 'INR', 83.200000), -- Indian Rupee
('USD', 'CNY', 7.240000),  -- Chinese Yuan
('USD', 'SGD', 1.340000),  -- Singapore Dollar
('USD', 'HKD', 7.820000),  -- Hong Kong Dollar
('USD', 'NZD', 1.650000),  -- New Zealand Dollar
('USD', 'MXN', 17.100000), -- Mexican Peso
('USD', 'BRL', 5.000000),  -- Brazilian Real
('USD', 'ZAR', 18.500000), -- South African Rand
('USD', 'AED', 3.670000),  -- UAE Dirham
('USD', 'SAR', 3.750000),  -- Saudi Riyal
('USD', 'THB', 35.500000), -- Thai Baht
('USD', 'SEK', 10.800000), -- Swedish Krona
('USD', 'NOK', 10.700000), -- Norwegian Krone
('USD', 'DKK', 6.850000),  -- Danish Krone
('USD', 'PLN', 4.050000),  -- Polish Zloty
('USD', 'TRY', 32.500000), -- Turkish Lira
('USD', 'RUB', 95.000000), -- Russian Ruble
('USD', 'KRW', 1330.000000), -- South Korean Won
('USD', 'MYR', 4.680000),  -- Malaysian Ringgit
('USD', 'IDR', 15650.000000), -- Indonesian Rupiah
('USD', 'PHP', 56.500000), -- Philippine Peso
('USD', 'ILS', 3.720000),  -- Israeli Shekel
('USD', 'CZK', 23.100000), -- Czech Koruna
('USD', 'HUF', 360.000000), -- Hungarian Forint
('USD', 'CLP', 950.000000), -- Chilean Peso
('USD', 'ARS', 850.000000), -- Argentine Peso
('USD', 'COP', 4100.000000) -- Colombian Peso
ON CONFLICT (base_currency, target_currency) DO NOTHING;

-- Create function to convert currency
CREATE OR REPLACE FUNCTION convert_currency(
  amount DECIMAL,
  from_currency VARCHAR(3),
  to_currency VARCHAR(3)
)
RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  conversion_rate DECIMAL;
BEGIN
  IF from_currency = to_currency THEN
    RETURN amount;
  END IF;

  -- Get conversion rate
  SELECT rate INTO conversion_rate
  FROM currency_rates
  WHERE base_currency = from_currency
    AND target_currency = to_currency
  ORDER BY last_updated DESC
  LIMIT 1;

  IF conversion_rate IS NULL THEN
    -- Try reverse conversion
    SELECT (1.0 / rate) INTO conversion_rate
    FROM currency_rates
    WHERE base_currency = to_currency
      AND target_currency = from_currency
    ORDER BY last_updated DESC
    LIMIT 1;
  END IF;

  IF conversion_rate IS NULL THEN
    RAISE EXCEPTION 'No conversion rate found for % to %', from_currency, to_currency;
  END IF;

  RETURN amount * conversion_rate;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_currency_rates_lookup ON currency_rates(base_currency, target_currency);
CREATE INDEX IF NOT EXISTS idx_users_currency ON users(preferred_currency);
CREATE INDEX IF NOT EXISTS idx_companies_currency ON companies(default_currency);
CREATE INDEX IF NOT EXISTS idx_budget_currency ON budget(currency);
CREATE INDEX IF NOT EXISTS idx_client_vendors_currency ON client_vendors(currency);
CREATE INDEX IF NOT EXISTS idx_hotels_currency ON hotels(currency);
CREATE INDEX IF NOT EXISTS idx_gifts_currency ON gifts(currency);

-- Add comments for documentation
COMMENT ON TABLE currency_rates IS 'Exchange rates for currency conversion';
COMMENT ON FUNCTION convert_currency IS 'Convert amount from one currency to another';
COMMENT ON COLUMN users.preferred_currency IS 'User preferred display currency (ISO 4217 3-letter code)';
COMMENT ON COLUMN users.preferred_language IS 'User preferred language for localization (ISO 639-1 2-letter code)';
COMMENT ON COLUMN users.timezone IS 'User timezone for datetime display (IANA timezone identifier)';
COMMENT ON COLUMN companies.default_currency IS 'Company default currency for new records (ISO 4217 3-letter code)';
COMMENT ON COLUMN companies.supported_currencies IS 'List of currencies the company works with';
COMMENT ON COLUMN budget.currency IS 'Currency for all monetary amounts in this budget item';
COMMENT ON COLUMN client_vendors.currency IS 'Currency for contract and deposit amounts';
COMMENT ON COLUMN hotels.currency IS 'Currency for hotel accommodation cost';
COMMENT ON COLUMN gifts.estimated_value IS 'Estimated monetary value of the gift';
COMMENT ON COLUMN gifts.currency IS 'Currency for gift estimated value';

-- Add check constraints to ensure valid currency codes (3 uppercase letters)
ALTER TABLE users ADD CONSTRAINT users_currency_format_check
  CHECK (preferred_currency ~ '^[A-Z]{3}$');

ALTER TABLE companies ADD CONSTRAINT companies_currency_format_check
  CHECK (default_currency ~ '^[A-Z]{3}$');

ALTER TABLE budget ADD CONSTRAINT budget_currency_format_check
  CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE client_vendors ADD CONSTRAINT client_vendors_currency_format_check
  CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE hotels ADD CONSTRAINT hotels_currency_format_check
  CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE gifts ADD CONSTRAINT gifts_currency_format_check
  CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE currency_rates ADD CONSTRAINT currency_rates_base_format_check
  CHECK (base_currency ~ '^[A-Z]{3}$');

ALTER TABLE currency_rates ADD CONSTRAINT currency_rates_target_format_check
  CHECK (target_currency ~ '^[A-Z]{3}$');
