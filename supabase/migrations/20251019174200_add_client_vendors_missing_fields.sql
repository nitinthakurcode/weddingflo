-- Add missing fields to client_vendors table for proper client-vendor relationship tracking

-- Add service date field
ALTER TABLE client_vendors
ADD COLUMN IF NOT EXISTS service_date DATE;

-- Add deposit paid boolean field
ALTER TABLE client_vendors
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN client_vendors.service_date IS 'Date when vendor service is scheduled';
COMMENT ON COLUMN client_vendors.deposit_paid IS 'Whether the deposit has been paid';

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_client_vendors_service_date ON client_vendors(service_date);
CREATE INDEX IF NOT EXISTS idx_client_vendors_deposit_paid ON client_vendors(deposit_paid);
