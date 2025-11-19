# RLS Pattern Quick Reference - WeddingFlow Pro

## Floor Plans Issue at a Glance

```
CURRENT (WRONG):
company_id = current_setting('app.current_company_id')::uuid

SHOULD BE (CORRECT):
company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
```

---

## Visual Pattern Comparison

### Pattern 1: Company-Wide Data (Direct company_id check)

```sql
✅ CORRECT (Optimized JWT Pattern)
──────────────────────────────────
CREATE POLICY "users_view_vendors"
  ON vendors
  FOR SELECT
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));


❌ WRONG (Legacy Session Pattern - Used in floor_plans)
──────────────────────────────────
CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);


⚠️ DEPRECATED (Direct JWT - Not optimized)
──────────────────────────────────
CREATE POLICY "users_view_vendors_old"
  ON vendors
  FOR SELECT
  USING (company_id::text = auth.jwt()->'metadata'->>'company_id');
```

### Pattern 2: Client-Owned Data (via clients.company_id)

```sql
✅ CORRECT (Optimized JWT Pattern)
──────────────────────────────────
CREATE POLICY "users_view_guests"
  ON guests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );


⚠️ DEPRECATED (Direct JWT - Not optimized)
──────────────────────────────────
CREATE POLICY "users_view_guests_old"
  ON guests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );
```

---

## Key Differences Explained

### 1. JWT Extraction Methods

| Method | Example | Performance | Location |
|--------|---------|-------------|----------|
| **Legacy Session** ❌ | `current_setting('app.current_company_id')::uuid` | Requires app setup | floor_plans |
| **Direct JWT** ⚠️ | `auth.jwt()->'metadata'->>'company_id'` | Per-row evaluation | 20251019000006 |
| **Optimized JWT** ✅ | `(SELECT auth.jwt()->'metadata'->>'company_id')` | Once per query | 20251019000007 |

### 2. Performance Impact

```
OPTIMIZED (Correct):    Query evaluates JWT ONCE → Applied to all rows
                        ┌─────────────────┐
                        │ JWT Extraction  │ ← Happens once
                        └────────┬────────┘
                                 │
                        ┌────────▼─────────┐
                        │ Check 100 rows   │ ← Uses cached result
                        └──────────────────┘

DIRECT (Deprecated):    Query evaluates JWT for EACH ROW
                        ┌──────────────────┐
                        │ Row 1: Extract   │ ← JWT extraction
                        ├──────────────────┤
                        │ Row 2: Extract   │ ← JWT extraction
                        ├──────────────────┤
                        │ Row 3: Extract   │ ← JWT extraction
                        └──────────────────┘

LEGACY (Wrong):         Requires application to SET session variable
                        App: SET app.current_company_id = '...'
                        Database: Check current_setting()
                        Problem: What if app forgets to set it?
```

---

## Code Review Checklist

When reviewing RLS policies, check:

- [x] **NOT using `current_setting()`** for auth-related checks
  - ❌ WRONG: `current_setting('app.current_company_id')`
  - ✅ RIGHT: `auth.jwt()->'metadata'->>'company_id'`

- [x] **JWT wrapped in SELECT subquery**
  - ❌ WRONG: `company_id = auth.jwt()->'metadata'->>'company_id'`
  - ✅ RIGHT: `company_id = (SELECT auth.jwt()->'metadata'->>'company_id')`

- [x] **Proper casting**
  - ❌ WRONG: `company_id = (SELECT auth.jwt()...)` (UUID vs text mismatch)
  - ✅ RIGHT: `company_id::text = (SELECT auth.jwt()...)` (explicit cast)

- [x] **Correct JWT path**
  - ✅ STANDARD: `auth.jwt()->'metadata'->>'company_id'` (Clerk)
  - ⚠️ ALTERNATE: `auth.jwt()->'app_metadata'->>'company_id'` (push notifications)

- [x] **Appropriate pattern for data type**
  - ✅ Company-wide: `company_id::text = (SELECT auth.jwt()...)`
  - ✅ Client-owned: `EXISTS(SELECT... clients.company_id::text = (SELECT...))`
  - ✅ User-specific: `user_id = (SELECT auth.jwt()->>'sub')`

---

## Real File Examples

### Floor Plans Migration (NEEDS FIX) ❌

**File**: `/supabase/migrations/20251023000002_create_floor_plans.sql`

```sql
-- Lines 103-106: WRONG - Using legacy session pattern
CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);
```

**Issues**:
- Uses `current_setting()` (legacy)
- No JWT integration
- Requires app to set session variable
- Inconsistent with rest of codebase

**Should be**:
```sql
CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));
```

---

### Vendors Table (CORRECT) ✅

**File**: `/supabase/migrations/20251019000007_optimize_rls_jwt_performance.sql`

```sql
-- Lines ~395-404: CORRECT - Using optimized JWT pattern
CREATE POLICY "Users can view vendors in their company"
  ON vendors FOR SELECT
  TO authenticated
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

CREATE POLICY "Users can insert vendors in their company"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));
```

**Advantages**:
- Uses JWT extracted from Clerk
- Wrapped in SELECT for performance
- Proper type casting (::text)
- Consistent with other tables

---

### Guests Table (DEPRECATED) ⚠️

**File**: `/supabase/migrations/20251019000006_correct_module_tables_rls.sql`

```sql
-- Lines 18-27: Direct JWT extraction (not optimized)
CREATE POLICY "Users can view guests in their company"
  ON guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'  -- ← Direct
    )
  );
```

**Then Updated In**: `/supabase/migrations/20251019000007_optimize_rls_jwt_performance.sql`

```sql
-- Same policy but with optimization
CREATE POLICY "Users can view guests in their company"
  ON guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')  -- ← Optimized
    )
  );
```

---

## Deployment Order

```
1. Create floor_plans (migration 20251023000002) ← HAS WRONG PATTERN
   ├─ floor_plans table created with RLS
   ├─ floor_plan_tables table created with RLS
   └─ floor_plan_guests table created with RLS

2. Fix floor_plans RLS (NEW MIGRATION NEEDED)
   ├─ Drop old policies
   ├─ Create new policies with correct JWT pattern
   └─ Verify no session variable is needed
```

---

## Testing the Fix

### Before Fix (Won't work without session setup):
```sql
-- Without app setting session variable:
-- SET app.current_company_id = 'company-uuid';
-- This query would fail or return no rows
SELECT * FROM floor_plans;  -- ❌ Fails if app didn't set session var
```

### After Fix (Will work with JWT auth):
```sql
-- With Clerk JWT from authenticated user:
-- JWT automatically contains: { "metadata": { "company_id": "..." } }
SELECT * FROM floor_plans;  -- ✅ Works with JWT auth
```

---

## Summary

| Aspect | Floor Plans | Correct Pattern |
|--------|------------|---|
| **Method** | `current_setting()` | `auth.jwt()` |
| **Wrapped** | No | Yes - in SELECT |
| **Type** | uuid | text (cast) |
| **Auth Source** | App session | Clerk JWT |
| **Performance** | Requires setup | Optimized |
| **Status** | ❌ WRONG | ✅ CORRECT |

