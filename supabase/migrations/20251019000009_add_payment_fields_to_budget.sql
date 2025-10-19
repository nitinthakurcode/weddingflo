-- Add payment_status and payment_date columns to budget table
ALTER TABLE budget
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'canceled', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN budget.payment_status IS 'Payment status for the budget item';
COMMENT ON COLUMN budget.payment_date IS 'Date when payment was made or is due';
