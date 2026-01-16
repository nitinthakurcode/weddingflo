-- Add eventId and phase columns to timeline table
-- These columns enable event-wise timeline grouping with phase segmentation
-- January 2026

-- Add eventId column to link timeline items to specific events
ALTER TABLE timeline ADD COLUMN IF NOT EXISTS event_id text;

-- Add phase column for segmentation (setup, showtime, wrapup)
ALTER TABLE timeline ADD COLUMN IF NOT EXISTS phase text DEFAULT 'showtime';

-- Add index for efficient event-based timeline queries
CREATE INDEX IF NOT EXISTS timeline_event_id_idx ON timeline(event_id);

-- Add index for phase-based filtering
CREATE INDEX IF NOT EXISTS timeline_phase_idx ON timeline(phase);

-- Add combined index for event + phase queries (most common access pattern)
CREATE INDEX IF NOT EXISTS timeline_event_phase_idx ON timeline(event_id, phase);

-- Vehicles table columns (if not already present from initial setup)
-- These support fleet tracking in transport module
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS coordinator_phone text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_transport_id uuid;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS available_at timestamp;

-- Guest transport additional columns for fleet tracking
ALTER TABLE guest_transport ADD COLUMN IF NOT EXISTS vehicle_type text;
ALTER TABLE guest_transport ADD COLUMN IF NOT EXISTS vehicle_number text;
ALTER TABLE guest_transport ADD COLUMN IF NOT EXISTS vehicle_id uuid;
ALTER TABLE guest_transport ADD COLUMN IF NOT EXISTS driver_phone text;
ALTER TABLE guest_transport ADD COLUMN IF NOT EXISTS coordinator_phone text;

-- Vehicle tracking indexes
CREATE INDEX IF NOT EXISTS guest_transport_vehicle_id_idx ON guest_transport(vehicle_id);

-- Hotels table - add accommodation link column
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS accommodation_id uuid;

-- Accommodations index for hotel lookups
CREATE INDEX IF NOT EXISTS hotels_accommodation_id_idx ON hotels(accommodation_id);
