-- Migration: 0011_fix_type_mismatches.sql
-- February 2026 - Fix ID type mismatches across schema
--
-- PROBLEM:
-- - companies.id is UUID but user.companyId is TEXT
-- - clients.id is TEXT but guests.clientId, hotels.clientId, etc. are UUID
--
-- SOLUTION:
-- Standardize all IDs on TEXT to match BetterAuth convention.
-- UUID columns will be cast to TEXT.
--
-- IMPORTANT: Run this in a maintenance window with full backup.

-- ============================================
-- PART 1: Fix clientId type mismatches
-- Change UUID clientId columns to TEXT
-- ============================================

-- guests.client_id: UUID -> TEXT
ALTER TABLE guests ALTER COLUMN client_id TYPE TEXT USING client_id::text;

-- hotels.client_id: UUID -> TEXT
ALTER TABLE hotels ALTER COLUMN client_id TYPE TEXT USING client_id::text;

-- vehicles.client_id: UUID -> TEXT
ALTER TABLE vehicles ALTER COLUMN client_id TYPE TEXT USING client_id::text;

-- guest_transport.client_id: UUID -> TEXT
ALTER TABLE guest_transport ALTER COLUMN client_id TYPE TEXT USING client_id::text;

-- accommodations.client_id: UUID -> TEXT
ALTER TABLE accommodations ALTER COLUMN client_id TYPE TEXT USING client_id::text;

-- hotels.guest_id: UUID -> TEXT (for consistency with guests.id which will become TEXT)
ALTER TABLE hotels ALTER COLUMN guest_id TYPE TEXT USING guest_id::text;

-- guest_transport.guest_id: UUID -> TEXT
ALTER TABLE guest_transport ALTER COLUMN guest_id TYPE TEXT USING guest_id::text;

-- ============================================
-- PART 2: Fix guests.id type (UUID -> TEXT)
-- This allows proper FK relationships with gifts.guestId etc.
-- ============================================

-- guests.id: UUID -> TEXT
-- Note: This requires recreating the primary key constraint
-- Save existing data first
CREATE TABLE guests_backup AS SELECT * FROM guests;

-- Drop dependent objects (if any)
-- Then alter the column type
ALTER TABLE guests ALTER COLUMN id TYPE TEXT USING id::text;

-- ============================================
-- PART 3: Verify companies.id compatibility
-- companies.id is UUID, but all companyId references are TEXT
-- We'll keep companies.id as UUID but ensure references work
-- by using ::text cast in queries (already done in code)
-- ============================================

-- No schema changes needed for companies.id
-- The code already handles this by storing UUID as TEXT string

-- ============================================
-- PART 4: Update indexes for performance
-- ============================================

-- Recreate indexes for changed columns
DROP INDEX IF EXISTS guests_client_id_idx;
CREATE INDEX guests_client_id_idx ON guests(client_id);

DROP INDEX IF EXISTS hotels_client_id_idx;
CREATE INDEX hotels_client_id_idx ON hotels(client_id);

DROP INDEX IF EXISTS vehicles_client_id_idx;
CREATE INDEX vehicles_client_id_idx ON vehicles(client_id);

DROP INDEX IF EXISTS guest_transport_client_id_idx;
CREATE INDEX guest_transport_client_id_idx ON guest_transport(client_id);

DROP INDEX IF EXISTS accommodations_client_id_idx;
CREATE INDEX accommodations_client_id_idx ON accommodations(client_id);

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'guests' AND column_name = 'client_id';
-- Expected: text

-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'hotels' AND column_name = 'client_id';
-- Expected: text
