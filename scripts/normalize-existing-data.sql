-- =============================================================================
-- scripts/normalize-existing-data.sql
-- =============================================================================
-- PURPOSE: Normalize legacy enum values + backfill NULLs + recalculate stats
--
-- RUN AFTER: All Drizzle migrations (especially 0026 + 0027)
-- RUN BEFORE: First deploy with new code
--
-- IDEMPOTENT: Safe to run multiple times — UPDATEs only touch rows that need it
-- TRANSACTION: Entire script runs in a single transaction
-- =============================================================================

-- =====================================================================
-- DRY RUN (uncomment to preview affected row counts BEFORE committing)
-- =====================================================================
-- SELECT 'Legacy RSVP: attending/accepted/yes → confirmed' AS change,
--        COUNT(*) AS rows_affected
-- FROM guests WHERE rsvp_status IN ('attending', 'accepted', 'yes');
--
-- SELECT 'Legacy RSVP: not_attending/no → declined' AS change,
--        COUNT(*) AS rows_affected
-- FROM guests WHERE rsvp_status IN ('not_attending', 'no');
--
-- SELECT 'Legacy RSVP: tentative/maybe_raw → maybe' AS change,
--        COUNT(*) AS rows_affected
-- FROM guests WHERE rsvp_status IN ('tentative');
--
-- SELECT 'Legacy Side: bride/bride_side → partner1' AS change,
--        COUNT(*) AS rows_affected
-- FROM guests WHERE guest_side IN ('bride', 'bride_side');
--
-- SELECT 'Legacy Side: groom/groom_side → partner2' AS change,
--        COUNT(*) AS rows_affected
-- FROM guests WHERE guest_side IN ('groom', 'groom_side');
--
-- SELECT 'Legacy Side: both/common/shared → mutual' AS change,
--        COUNT(*) AS rows_affected
-- FROM guests WHERE guest_side IN ('both', 'common', 'shared');
--
-- SELECT 'NULL company_id on guests' AS check,
--        COUNT(*) AS rows_affected
-- FROM guests WHERE company_id IS NULL;
--
-- SELECT 'NULL company_id on events' AS check,
--        COUNT(*) AS rows_affected
-- FROM events WHERE company_id IS NULL;
--
-- SELECT 'NULL company_id on budget' AS check,
--        COUNT(*) AS rows_affected
-- FROM budget WHERE company_id IS NULL;
--
-- SELECT 'NULL company_id on timeline' AS check,
--        COUNT(*) AS rows_affected
-- FROM timeline WHERE company_id IS NULL;

BEGIN;

-- =====================================================================
-- SECTION 1: Normalize RSVP status values
-- =====================================================================
-- Canonical values: 'pending' | 'confirmed' | 'declined' | 'maybe'
-- See: src/lib/constants/enums.ts — normalizeRsvpStatus()

UPDATE guests SET rsvp_status = 'confirmed', updated_at = NOW()
WHERE rsvp_status IN ('attending', 'accepted', 'yes');

UPDATE guests SET rsvp_status = 'declined', updated_at = NOW()
WHERE rsvp_status IN ('not_attending', 'no');

UPDATE guests SET rsvp_status = 'maybe', updated_at = NOW()
WHERE rsvp_status IN ('tentative');

-- Catch-all: any other non-canonical value → 'pending'
UPDATE guests SET rsvp_status = 'pending', updated_at = NOW()
WHERE rsvp_status NOT IN ('pending', 'confirmed', 'declined', 'maybe');

-- =====================================================================
-- SECTION 2: Normalize guest side values
-- =====================================================================
-- Canonical values: 'partner1' | 'partner2' | 'mutual'
-- See: src/lib/constants/enums.ts — normalizeGuestSide()

UPDATE guests SET guest_side = 'partner1', updated_at = NOW()
WHERE guest_side IN ('bride', 'bride_side');

UPDATE guests SET guest_side = 'partner2', updated_at = NOW()
WHERE guest_side IN ('groom', 'groom_side');

UPDATE guests SET guest_side = 'mutual', updated_at = NOW()
WHERE guest_side IN ('both', 'common', 'shared');

-- Catch-all: any other non-canonical value → 'mutual' (the default)
UPDATE guests SET guest_side = 'mutual', updated_at = NOW()
WHERE guest_side IS NOT NULL
  AND guest_side NOT IN ('partner1', 'partner2', 'mutual');

-- Set NULL guest_side to default
UPDATE guests SET guest_side = 'mutual', updated_at = NOW()
WHERE guest_side IS NULL;

-- =====================================================================
-- SECTION 3: Backfill NULL company_id from parent tables
-- =====================================================================
-- Migration 0027 already does this, but re-running is safe (idempotent).
-- This catches any rows created between migration and this script.

-- Direct children of clients
UPDATE guests g SET company_id = c.company_id
FROM clients c
WHERE g.client_id = c.id AND g.company_id IS NULL AND c.company_id IS NOT NULL;

UPDATE events e SET company_id = c.company_id
FROM clients c
WHERE e.client_id = c.id AND e.company_id IS NULL AND c.company_id IS NOT NULL;

UPDATE budget b SET company_id = c.company_id
FROM clients c
WHERE b.client_id = c.id AND b.company_id IS NULL AND c.company_id IS NOT NULL;

UPDATE timeline t SET company_id = c.company_id
FROM clients c
WHERE t.client_id = c.id AND t.company_id IS NULL AND c.company_id IS NOT NULL;

UPDATE hotels h SET company_id = c.company_id
FROM clients c, guests g
WHERE h.guest_id = g.id AND g.client_id = c.id AND h.company_id IS NULL AND c.company_id IS NOT NULL;

UPDATE client_vendors cv SET company_id = c.company_id
FROM clients c
WHERE cv.client_id = c.id AND cv.company_id IS NULL AND c.company_id IS NOT NULL;

UPDATE guest_transport gt SET company_id = c.company_id
FROM clients c
WHERE gt.client_id = c.id AND gt.company_id IS NULL AND c.company_id IS NOT NULL;

UPDATE floor_plans fp SET company_id = c.company_id
FROM clients c, events e
WHERE fp.event_id = e.id AND e.client_id = c.id AND fp.company_id IS NULL AND c.company_id IS NOT NULL;

UPDATE gifts gi SET company_id = c.company_id
FROM clients c, guests g
WHERE gi.guest_id = g.id AND g.client_id = c.id AND gi.company_id IS NULL AND c.company_id IS NOT NULL;

-- Chatbot tables
UPDATE chatbot_messages cm SET company_id = cc.company_id
FROM chatbot_conversations cc
WHERE cm.conversation_id = cc.id AND cm.company_id IS NULL AND cc.company_id IS NOT NULL;

-- Client users
UPDATE client_users cu SET company_id = c.company_id
FROM clients c
WHERE cu.client_id = c.id AND cu.company_id IS NULL AND c.company_id IS NOT NULL;

-- =====================================================================
-- SECTION 4: Re-apply NOT NULL constraints that may have silently failed
-- =====================================================================
-- Migration 0026 wraps SET NOT NULL in EXCEPTION handlers. If there were
-- NULL rows at migration time, the constraint was silently skipped.
-- Now that Section 3 has backfilled, re-apply them.

DO $$ BEGIN
  ALTER TABLE gift_categories ALTER COLUMN company_id SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'gift_categories.company_id NOT NULL skipped (still has NULLs?)';
END $$;

DO $$ BEGIN
  ALTER TABLE gift_types ALTER COLUMN company_id SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'gift_types.company_id NOT NULL skipped (still has NULLs?)';
END $$;

DO $$ BEGIN
  ALTER TABLE sms_templates ALTER COLUMN company_id SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'sms_templates.company_id NOT NULL skipped (still has NULLs?)';
END $$;

DO $$ BEGIN
  ALTER TABLE thank_you_note_templates ALTER COLUMN company_id SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'thank_you_note_templates.company_id NOT NULL skipped (still has NULLs?)';
END $$;

DO $$ BEGIN
  ALTER TABLE vendors ALTER COLUMN company_id SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'vendors.company_id NOT NULL skipped (still has NULLs?)';
END $$;

DO $$ BEGIN
  ALTER TABLE whatsapp_templates ALTER COLUMN company_id SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'whatsapp_templates.company_id NOT NULL skipped (still has NULLs?)';
END $$;

-- =====================================================================
-- SECTION 5: Recalculate ALL client cached stats
-- =====================================================================
-- Fixes any drift from before recalcClientStats was wired into all
-- mutation paths. Matches logic in src/lib/sync/client-stats-sync.ts.

UPDATE clients SET
  guest_count = COALESCE(sub.cnt, 0),
  budget = COALESCE(sub.total, '0'),
  updated_at = NOW()
FROM (
  SELECT
    c.id AS client_id,
    (SELECT COUNT(*)::INTEGER FROM guests g WHERE g.client_id = c.id) AS cnt,
    (SELECT COALESCE(SUM(CAST(b.estimated_cost AS NUMERIC)), 0)::TEXT
     FROM budget b WHERE b.client_id = c.id) AS total
  FROM clients c
  WHERE c.deleted_at IS NULL
) sub
WHERE clients.id = sub.client_id
  AND clients.deleted_at IS NULL;

COMMIT;

-- =====================================================================
-- POST-RUN VERIFICATION (run these manually to confirm)
-- =====================================================================
-- SELECT rsvp_status, COUNT(*) FROM guests GROUP BY rsvp_status ORDER BY 2 DESC;
-- SELECT guest_side, COUNT(*) FROM guests GROUP BY guest_side ORDER BY 2 DESC;
-- SELECT COUNT(*) AS null_company_guests FROM guests WHERE company_id IS NULL;
-- SELECT COUNT(*) AS null_company_events FROM events WHERE company_id IS NULL;
-- SELECT COUNT(*) AS null_company_budget FROM budget WHERE company_id IS NULL;
-- SELECT id, partner1_first_name, guest_count,
--        (SELECT COUNT(*) FROM guests g WHERE g.client_id = clients.id) AS actual_count
-- FROM clients WHERE deleted_at IS NULL
-- AND guest_count != (SELECT COUNT(*) FROM guests g WHERE g.client_id = clients.id)
-- LIMIT 10;
