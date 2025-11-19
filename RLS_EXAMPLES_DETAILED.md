# RLS Examples - Detailed Side-by-Side Comparison

## Example 1: Company-Wide Data Pattern

### The Problem (floor_plans - WRONG)

```sql
-- File: supabase/migrations/20251023000002_create_floor_plans.sql
-- Lines: 103-106

CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);
```

**Issues**:
1. Uses `current_setting('app.current_company_id')` - requires app setup
2. Returns UUID type, needs casting
3. Not integrated with Clerk JWT
4. Fails if session variable not set
5. No performance optimization

**Requires app code like**:
```typescript
// Before querying floor_plans, app must run:
const supabase = createClient();
await supabase.rpc('set_session_var', { 
  company_id: userCompanyId 
});
// OR in raw SQL:
// SET app.current_company_id = 'uuid-here';
```

---

### The Solution (vendors - CORRECT)

```sql
-- File: supabase/migrations/20251019000007_optimize_rls_jwt_performance.sql
-- Lines: ~395-404

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
```

**Advantages**:
1. Uses Clerk JWT from `auth.jwt()`
2. JWT wrapped in `(SELECT ...)` for single evaluation
3. Explicit cast to text `::text` for proper comparison
4. No session variable setup needed
5. Optimized for performance
6. Automatic with authenticated user

**No app setup needed**:
```typescript
// With Clerk JWT, query just works:
const supabase = createClient();
const { data } = await supabase
  .from('vendors')
  .select('*');  // ✅ RLS handles company_id automatically
```

---

## Example 2: Client-Owned Data Pattern

### The Deprecated Version (guests - OLD)

```sql
-- File: supabase/migrations/20251019000006_correct_module_tables_rls.sql
-- Lines: 18-27

CREATE POLICY "Users can view guests in their company"
  ON guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
      -- ⚠️ NOT wrapped in (SELECT ...) - evaluated per row
    )
  );
```

**Performance Issue**:
```
Query: SELECT * FROM guests
       ↓
For each of 100 guest rows:
  ├─ Extract JWT ← Expensive operation
  ├─ Compare company_id
  └─ Check EXISTS subquery
  
Total: 100 JWT extractions!
```

---

### The Optimized Version (guests - CURRENT)

```sql
-- File: supabase/migrations/20251019000007_optimize_rls_jwt_performance.sql
-- Lines: 19-28

CREATE POLICY "Users can view guests in their company"
  ON guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
      -- ✅ Wrapped in (SELECT ...) - evaluated once
    )
  );
```

**Performance Benefit**:
```
Query: SELECT * FROM guests
       ↓
Extract JWT once: (SELECT auth.jwt()->'metadata'->>'company_id')
       ↓
For each of 100 guest rows:
  ├─ Use cached JWT value
  ├─ Compare company_id
  └─ Check EXISTS subquery
  
Total: 1 JWT extraction! (cached/optimized)
```

---

## Example 3: All CRUD Operations Pattern

### Company-Wide Resource (Vendors)

```sql
-- File: supabase/migrations/20251019000007_optimize_rls_jwt_performance.sql

-- SELECT
CREATE POLICY "Users can view vendors in their company"
  ON vendors FOR SELECT
  TO authenticated
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

-- INSERT
CREATE POLICY "Users can insert vendors in their company"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

-- UPDATE
CREATE POLICY "Users can update vendors in their company"
  ON vendors FOR UPDATE
  TO authenticated
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

-- DELETE
CREATE POLICY "Users can delete vendors in their company"
  ON vendors FOR DELETE
  TO authenticated
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));
```

### Client-Owned Resource (Guests)

```sql
-- File: supabase/migrations/20251019000007_optimize_rls_jwt_performance.sql

-- SELECT
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

-- INSERT
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

-- UPDATE
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

-- DELETE
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
```

---

## Example 4: User-Specific Data

### Push Subscriptions (User-Owned)

```sql
-- File: supabase/migrations/20251021000010_create_push_notifications.sql
-- Lines: 71-92

-- SELECT - Only own subscriptions
CREATE POLICY "Users view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- INSERT - Only own subscriptions
CREATE POLICY "Users insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.jwt() ->> 'sub') AND
    company_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'company_id')
  );

-- UPDATE - Only own subscriptions
CREATE POLICY "Users update own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (user_id = (SELECT auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

-- DELETE - Only own subscriptions
CREATE POLICY "Users delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));
```

**Pattern Notes**:
1. Uses `auth.jwt() ->> 'sub'` for Clerk user ID
2. Also checks `app_metadata` variant (not `metadata`)
3. Combines user_id AND company_id checks for INSERT
4. Wrapped in `(SELECT ...)` for optimization

---

## Example 5: Comparison Matrix

### Side-by-Side: Wrong vs Correct

```
SCENARIO: Company-Wide Data (Like vendors, floor_plans)
═════════════════════════════════════════════════════════════════

❌ WRONG (floor_plans current):
─────────────────────────────────
CREATE POLICY "..."
  USING (company_id = current_setting('app.current_company_id')::uuid);

Problems:
  • Uses legacy current_setting()
  • Requires app to SET variable
  • UUID type (no casting shown)
  • Not Clerk-integrated


⚠️ OLD (Early attempts):
─────────────────────────────────
CREATE POLICY "..."
  USING (company_id::text = auth.jwt()->'metadata'->>'company_id');

Problems:
  • Direct JWT extraction
  • Evaluated per row
  • Performance penalty


✅ CORRECT (vendors, modern):
─────────────────────────────────
CREATE POLICY "..."
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

Advantages:
  • JWT-based (Clerk-integrated)
  • Wrapped in SELECT (optimized)
  • Proper type casting
  • Performance optimized
```

---

## Example 6: Migration Evolution Timeline

```
20251018000007: final_rls_inline_jwt.sql
├─ First JWT implementation
├─ Used for: companies, users
├─ Pattern: auth.jwt()->>'sub'
└─ Status: Baseline ✅

20251019000006: correct_module_tables_rls.sql
├─ Created module tables (guests, hotels, gifts, vendors, etc.)
├─ Pattern: Direct JWT (not wrapped)
├─ Status: Working but not optimized ⚠️
└─ Example:
   WHERE clients.company_id::text = auth.jwt()->'metadata'->>'company_id'

20251019000007: optimize_rls_jwt_performance.sql ← KEY OPTIMIZATION
├─ Performance improvement migration
├─ Updated ALL previous policies
├─ Pattern: Wrapped JWT in (SELECT ...)
├─ Status: Best practice ✅ FOLLOW THIS
└─ Example:
   WHERE clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')

20251021000010: create_push_notifications.sql
├─ Push notifications with mixed patterns
├─ User-specific: (SELECT auth.jwt()->>'sub')
├─ Company-scoped: (SELECT auth.jwt()->'app_metadata'->>'company_id')
├─ Status: Correct but uses app_metadata variant
└─ Note: Different JWT path than others

20251023000002: create_floor_plans.sql ❌ PROBLEM
├─ Latest migration
├─ Pattern: current_setting('app.current_company_id')::uuid
├─ Status: REGRESSED to legacy pattern ❌
└─ Should follow: 20251019000007 optimization
```

---

## Example 7: How to Fix floor_plans

### Step 1: Create New Migration

**File**: `supabase/migrations/20251023000007_fix_floor_plans_rls.sql`

```sql
-- =====================================================
-- FIX: Floor Plans RLS - Update to JWT Pattern
-- =====================================================
-- Previous migration (20251023000002) used legacy 
-- current_setting() pattern. This migration fixes it
-- to use the modern optimized JWT pattern from
-- migration 20251019000007 (optimize_rls_jwt_performance.sql)
-- =====================================================

-- Drop old policies using current_setting()
DROP POLICY IF EXISTS "companies_manage_floor_plans" ON floor_plans;
DROP POLICY IF EXISTS "companies_manage_floor_plan_tables" ON floor_plan_tables;
DROP POLICY IF EXISTS "companies_manage_floor_plan_guests" ON floor_plan_guests;

-- Create new policies using JWT pattern
CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

CREATE POLICY "companies_manage_floor_plan_tables"
  ON floor_plan_tables
  FOR ALL
  USING (
    floor_plan_id IN (
      SELECT id FROM floor_plans
      WHERE company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

CREATE POLICY "companies_manage_floor_plan_guests"
  ON floor_plan_guests
  FOR ALL
  USING (
    floor_plan_id IN (
      SELECT id FROM floor_plans
      WHERE company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After this migration, floor_plans RLS should work
-- with Clerk JWT authentication without requiring
-- session variable setup.
--
-- Test: SELECT * FROM floor_plans should return only
--       rows where company_id matches authenticated user's
--       company from JWT metadata.
```

### Step 2: No App Code Changes Needed

The beauty of this fix:

```typescript
// BEFORE (would require session setup):
// await supabase.rpc('set_session_var', { company_id });
// const { data } = await supabase.from('floor_plans').select('*');

// AFTER (just works with JWT):
const { data } = await supabase.from('floor_plans').select('*');
// ✅ RLS automatically filters based on JWT company_id
```

---

## Summary Reference

| Component | Wrong | Correct |
|-----------|-------|---------|
| **Method** | `current_setting()` | `auth.jwt()` |
| **Wrapped** | N/A | `(SELECT ...)` |
| **Casting** | `::uuid` | `::text` |
| **Scope** | Session var | JWT claim |
| **File** | 20251023000002 | 20251019000007 |
| **Status** | Latest but wrong | Modern best practice |
| **Fix** | Create new migration | Use as template |

