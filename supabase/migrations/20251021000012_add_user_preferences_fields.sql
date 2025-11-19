-- Add missing user preference fields for calendar and push notifications
-- Session 55 Step 6: Pre-Deployment Verification

-- Add iCal feed preference columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS ical_include_events BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ical_include_timeline BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS ical_include_tasks BOOLEAN DEFAULT true;

-- Add device type column for push notifications
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS device_type TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.users.ical_include_events IS 'Whether to include events in iCal feed';
COMMENT ON COLUMN public.users.ical_include_timeline IS 'Whether to include timeline items in iCal feed';
COMMENT ON COLUMN public.users.ical_include_tasks IS 'Whether to include tasks in iCal feed';
COMMENT ON COLUMN public.users.device_type IS 'Device type for push notifications (web, ios, android)';
