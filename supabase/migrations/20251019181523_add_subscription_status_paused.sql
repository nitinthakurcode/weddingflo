-- Add "paused" to subscription_status enum
-- Stripe supports paused subscriptions, and we need to handle them in the webhook

-- Check if enum value already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'paused'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'subscription_status'
    )
  ) THEN
    -- Add the enum value
    ALTER TYPE subscription_status ADD VALUE 'paused';
  END IF;
END
$$;

-- Add comment to document all possible Stripe subscription statuses
COMMENT ON TYPE subscription_status IS 'Stripe subscription status values: incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid, paused';
