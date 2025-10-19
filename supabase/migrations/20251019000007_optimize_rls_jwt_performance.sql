-- =====================================================
-- OPTIMIZE ALL RLS POLICIES - JWT PERFORMANCE FIX
-- =====================================================
-- Wraps auth.jwt() calls in subqueries to evaluate ONCE per query
-- instead of per-row, dramatically improving performance.
--
-- BEFORE: auth.jwt()->'metadata'->>'company_id' (evaluated per row)
-- AFTER: (SELECT auth.jwt()->'metadata'->>'company_id') (evaluated once)
-- =====================================================

-- =====================================================
-- 1. GUESTS TABLE - Optimize RLS Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view guests in their company" ON guests;
DROP POLICY IF EXISTS "Users can insert guests for their company clients" ON guests;
DROP POLICY IF EXISTS "Users can update guests in their company" ON guests;
DROP POLICY IF EXISTS "Users can delete guests in their company" ON guests;

CREATE POLICY "Users can view guests in their company"
  ON guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert guests for their company clients"
  ON guests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update guests in their company"
  ON guests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete guests in their company"
  ON guests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- 2. HOTELS TABLE - Optimize RLS Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view hotels in their company" ON hotels;
DROP POLICY IF EXISTS "Users can insert hotels for their company clients" ON hotels;
DROP POLICY IF EXISTS "Users can update hotels in their company" ON hotels;
DROP POLICY IF EXISTS "Users can delete hotels in their company" ON hotels;

CREATE POLICY "Users can view hotels in their company"
  ON hotels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = hotels.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert hotels for their company clients"
  ON hotels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = hotels.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update hotels in their company"
  ON hotels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = hotels.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete hotels in their company"
  ON hotels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = hotels.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- 3. GIFTS TABLE - Optimize RLS Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view gifts in their company" ON gifts;
DROP POLICY IF EXISTS "Users can insert gifts for their company clients" ON gifts;
DROP POLICY IF EXISTS "Users can update gifts in their company" ON gifts;
DROP POLICY IF EXISTS "Users can delete gifts in their company" ON gifts;

CREATE POLICY "Users can view gifts in their company"
  ON gifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = gifts.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert gifts for their company clients"
  ON gifts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = gifts.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update gifts in their company"
  ON gifts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = gifts.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete gifts in their company"
  ON gifts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = gifts.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- 4. VENDORS TABLE - Optimize RLS Policies (company-level)
-- =====================================================
DROP POLICY IF EXISTS "Users can view vendors in their company" ON vendors;
DROP POLICY IF EXISTS "Users can insert vendors in their company" ON vendors;
DROP POLICY IF EXISTS "Users can update vendors in their company" ON vendors;
DROP POLICY IF EXISTS "Users can delete vendors in their company" ON vendors;

-- Vendors are company-wide, use company_id directly
CREATE POLICY "Users can view vendors in their company"
  ON vendors FOR SELECT
  TO authenticated
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

CREATE POLICY "Users can insert vendors in their company"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

CREATE POLICY "Users can update vendors in their company"
  ON vendors FOR UPDATE
  TO authenticated
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

CREATE POLICY "Users can delete vendors in their company"
  ON vendors FOR DELETE
  TO authenticated
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

-- =====================================================
-- 5. BUDGET TABLE - Optimize RLS Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view budget in their company" ON budget;
DROP POLICY IF EXISTS "Users can insert budget for their company clients" ON budget;
DROP POLICY IF EXISTS "Users can update budget in their company" ON budget;
DROP POLICY IF EXISTS "Users can delete budget in their company" ON budget;

CREATE POLICY "Users can view budget in their company"
  ON budget FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert budget for their company clients"
  ON budget FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update budget in their company"
  ON budget FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete budget in their company"
  ON budget FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = budget.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- 6. EVENTS TABLE - Optimize RLS Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view events in their company" ON events;
DROP POLICY IF EXISTS "Users can insert events for their company clients" ON events;
DROP POLICY IF EXISTS "Users can update events in their company" ON events;
DROP POLICY IF EXISTS "Users can delete events in their company" ON events;

CREATE POLICY "Users can view events in their company"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = events.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert events for their company clients"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = events.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update events in their company"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = events.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete events in their company"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = events.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- 7. TIMELINE TABLE - Optimize RLS Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view timeline in their company" ON timeline;
DROP POLICY IF EXISTS "Users can insert timeline for their company clients" ON timeline;
DROP POLICY IF EXISTS "Users can update timeline in their company" ON timeline;
DROP POLICY IF EXISTS "Users can delete timeline in their company" ON timeline;

CREATE POLICY "Users can view timeline in their company"
  ON timeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert timeline for their company clients"
  ON timeline FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update timeline in their company"
  ON timeline FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete timeline in their company"
  ON timeline FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = timeline.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- 8. DOCUMENTS TABLE - Optimize RLS Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can insert documents for their company clients" ON documents;
DROP POLICY IF EXISTS "Users can update documents in their company" ON documents;
DROP POLICY IF EXISTS "Users can delete documents in their company" ON documents;

CREATE POLICY "Users can view documents in their company"
  ON documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can insert documents for their company clients"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can update documents in their company"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "Users can delete documents in their company"
  ON documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = documents.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- 9. MESSAGES TABLE - Optimize RLS Policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view messages in their company" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their company" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

CREATE POLICY "Users can view messages in their company"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = messages.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
    OR sender_id = (auth.uid())::uuid
    OR recipient_id = (auth.uid())::uuid
  );

CREATE POLICY "Users can insert messages in their company"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = messages.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
    AND sender_id = (auth.uid())::uuid
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = (auth.uid())::uuid
    OR recipient_id = (auth.uid())::uuid
  );

CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = (auth.uid())::uuid
  );

-- =====================================================
-- PERFORMANCE VERIFICATION
-- =====================================================
-- Run this query to verify optimized policies:
--
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename IN (
--   'guests', 'hotels', 'gifts', 'vendors', 'budget',
--   'events', 'timeline', 'documents', 'messages'
-- )
-- ORDER BY tablename, policyname;
--
-- Expected: Should see (SELECT auth.jwt()->'metadata'->>'company_id')
-- This ensures JWT is evaluated ONCE per query, not per row
-- =====================================================

-- Migration complete: All RLS policies optimized for JWT performance
-- JWT calls now wrapped in subqueries to evaluate once per query instead of per row
