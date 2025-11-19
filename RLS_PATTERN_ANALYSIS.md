# RLS (Row Level Security) Pattern Analysis - WeddingFlow Pro

## Executive Summary
The floor_plans migration uses an **INCORRECT** RLS pattern that deviates from the rest of the codebase.

**Issue**: Uses `current_setting('app.current_company_id')::uuid` (legacy pattern)
**Correct Pattern**: Should use `auth.jwt()->'metadata'->>'company_id'` (modern Clerk integration)

---

## Pattern Evolution in WeddingFlow Pro

### Three RLS Implementation Patterns Found:

1. **Legacy Pattern** (❌ INCORRECT - used in floor_plans)
   - File: `20251023000002_create_floor_plans.sql` (latest, newest migration)
   - Method: `current_setting('app.current_company_id')::uuid`
   - Issue: Requires application to set session variable
   - Used in: floor_plans, floor_plan_tables, floor_plan_guests

2. **Direct JWT Pattern** (⚠️ DEPRECATED - older migrations)
   - Files: `20251019000006_correct_module_tables_rls.sql`
   - Method: `auth.jwt()->'metadata'->>'company_id'` (direct, per-row evaluation)
   - Issue: Performance warnings - evaluates JWT per row
   - Used in: guests, hotels, gifts, vendors, budget, events, timeline, documents, etc.

3. **Optimized JWT Pattern** (✅ CORRECT - latest optimization)
   - File: `20251019000007_optimize_rls_jwt_performance.sql` (optimization migration)
   - Method: `(SELECT auth.jwt()->'metadata'->>'company_id')` (wrapped in subquery)
   - Benefit: Evaluates JWT once per query, not per row
   - Performance: Dramatically improved
   - Used in: guests, hotels, gifts, vendors, budget, events, timeline, documents, etc.

4. **Push Notifications Pattern** (Mixed approach)
   - File: `20251021000010_create_push_notifications.sql`
   - For user_id: `(SELECT auth.jwt() ->> 'sub')`
   - For company_id: `(SELECT auth.jwt() -> 'app_metadata' ->> 'company_id')`
   - Note: Uses `app_metadata` instead of `metadata` (Clerk variation)

---

## Real Examples from Codebase

### Example 1: INCORRECT Pattern (floor_plans - Latest Migration)
**File**: `/supabase/migrations/20251023000002_create_floor_plans.sql`

```sql
CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY "companies_manage_floor_plan_tables"
  ON floor_plan_tables
  FOR ALL
  USING (
    floor_plan_id IN (
      SELECT id FROM floor_plans
      WHERE company_id = current_setting('app.current_company_id')::uuid
    )
  );

CREATE POLICY "companies_manage_floor_plan_guests"
  ON floor_plan_guests
  FOR ALL
  USING (
    floor_plan_id IN (
      SELECT id FROM floor_plans
      WHERE company_id = current_setting('app.current_company_id')::uuid
    )
  );
```

**Problems**:
- Uses outdated `current_setting()` pattern
- Requires app to set: `SET app.current_company_id = '{user_company_id}'`
- Not integrated with Clerk JWT authentication
- Will fail if session variable not set
- Inconsistent with rest of codebase

---

### Example 2: DEPRECATED Pattern (Early optimization attempt)
**File**: `/supabase/migrations/20251019000006_correct_module_tables_rls.sql`

```sql
CREATE POLICY "Users can view guests in their company"
  ON guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = guests.client_id
      AND clients.company_id::text = auth.jwt()->'metadata'->>'company_id'
    )
  );
```

**Issues**:
- Direct JWT extraction without wrapping in SELECT
- Performance: JWT evaluated per row in the EXISTS subquery
- Works but not optimized

---

### Example 3: CORRECT Pattern (Modern Optimized - Preferred)
**File**: `/supabase/migrations/20251019000007_optimize_rls_jwt_performance.sql`

```sql
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
```

**Advantages**:
- JWT wrapped in `(SELECT ...)` subquery
- Evaluates once per query, not per row
- Performance optimized
- Uses standard Clerk JWT path: `auth.jwt()->'metadata'->>'company_id'`
- Consistent across all module tables

---

### Example 4: Company-Wide Data Pattern (Direct company_id)
**File**: `/supabase/migrations/20251019000007_optimize_rls_jwt_performance.sql`

```sql
-- Vendors are company-wide, use company_id directly
CREATE POLICY "Users can view vendors in their company"
  ON vendors FOR SELECT
  TO authenticated
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));

CREATE POLICY "Users can insert vendors in their company"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));
```

**Pattern Used For**:
- Vendors (company-wide resource)
- Push subscriptions (uses `auth.jwt() ->> 'sub'` for user_id)

---

### Example 5: User-Specific Authentication
**File**: `/supabase/migrations/20251021000010_create_push_notifications.sql`

```sql
CREATE POLICY "Users view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.jwt() ->> 'sub') AND
    company_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'company_id')
  );
```

**Note**: Uses `app_metadata` instead of `metadata` (variation found in codebase)

---

## Correct Pattern Specification

### For Company-Scoped Data (Client-Owned Resources):

```sql
CREATE POLICY "policy_name"
  ON table_name FOR [SELECT|INSERT|UPDATE|DELETE]
  TO authenticated
  [USING | WITH CHECK] (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = table_name.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );
```

### For Company-Wide Data (No Client Relationship):

```sql
CREATE POLICY "policy_name"
  ON table_name FOR [SELECT|INSERT|UPDATE|DELETE]
  TO authenticated
  [USING | WITH CHECK] (
    company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
  );
```

### For User-Specific Data:

```sql
CREATE POLICY "policy_name"
  ON table_name FOR [SELECT|INSERT|UPDATE|DELETE]
  [USING | WITH CHECK] (
    user_id = (SELECT auth.jwt() ->> 'sub')
  );
```

---

## JWT Path Variations Found

| Pattern | File | Variant | Notes |
|---------|------|---------|-------|
| `auth.jwt()->'metadata'->>'company_id'` | 20251019000007 | Standard | Most common, modern pattern |
| `(SELECT auth.jwt()->'metadata'->>'company_id')` | 20251019000007 | Optimized | Wrapped in SELECT for performance |
| `auth.jwt() ->> 'sub'` | 20251021000010 | User ID | Clerk user ID claim |
| `auth.jwt() -> 'app_metadata' ->> 'company_id'` | 20251021000010 | Alt Metadata | Alternative metadata path |
| `current_setting('app.current_company_id')::uuid` | 20251023000002 | Legacy ❌ | NOT USED in modern migrations |

---

## Migration Sequence Analysis

### Timeline of RLS Evolution:

1. **20251018000007** - `final_rls_inline_jwt.sql`
   - First JWT-based approach for companies & users tables
   - Pattern: `auth.jwt()->>'sub'`

2. **20251019000006** - `correct_module_tables_rls.sql`
   - Created module tables with direct JWT extraction
   - Pattern: `auth.jwt()->'metadata'->>'company_id'` (direct)

3. **20251019000007** - `optimize_rls_jwt_performance.sql`
   - **OPTIMIZATION MIGRATION**: Wrapped JWT in SELECT for performance
   - Pattern: `(SELECT auth.jwt()->'metadata'->>'company_id')`
   - Applied to: guests, hotels, gifts, vendors, budget, events, timeline, documents

4. **20251021000010** - `create_push_notifications.sql`
   - Push notification system with mixed patterns
   - User-specific: `(SELECT auth.jwt() ->> 'sub')`
   - Company-scoped: `(SELECT auth.jwt() -> 'app_metadata' ->> 'company_id')`

5. **20251023000002** - `create_floor_plans.sql` ❌ PROBLEM
   - **LATEST** but uses **OUTDATED** pattern
   - Pattern: `current_setting('app.current_company_id')::uuid`
   - Should have followed 20251019000007 optimization

---

## Floor Plans Diagnosis

### Current Implementation (WRONG):

```sql
-- Using legacy session variable pattern
CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);
```

### Why This Is Wrong:

1. ❌ Uses outdated `current_setting()` instead of JWT
2. ❌ Requires application code to set session variable
3. ❌ Not integrated with Clerk authentication
4. ❌ Inconsistent with optimization migration (20251019000007)
5. ❌ Will fail if session not properly configured
6. ❌ Performance: Doesn't benefit from JWT caching

### Required Fix:

```sql
-- Correct pattern for company-scoped data (client-owned)
CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id'));
```

Or for nested client access (if floor_plans should check client.company_id):

```sql
-- If table has client_id relationship
CREATE POLICY "companies_manage_floor_plans"
  ON floor_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = floor_plans.client_id
      AND clients.company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
    )
  );
```

---

## Decision Matrix

| Scenario | Pattern | Example |
|----------|---------|---------|
| **Company-wide resource** (no client) | `company_id::text = (SELECT auth.jwt()...` | vendors, push_subscriptions |
| **Client-owned resource** (has client_id) | `EXISTS(SELECT... clients.company_id::text = (SELECT...)` | guests, hotels, gifts, events |
| **User-specific resource** | `user_id = (SELECT auth.jwt() ->> 'sub')` | push_subscriptions, user preferences |
| **Legacy session** ❌ | `current_setting(...)` | DEPRECATED - DO NOT USE |

---

## Summary Table

| Migration File | Date | Table | Pattern | Status |
|---|---|---|---|---|
| 20251023000002 | **LATEST** | floor_plans* | current_setting() | ❌ **WRONG** |
| 20251021000010 | Oct 21 | push_* | (SELECT auth.jwt()...) | ✅ Correct |
| 20251019000007 | Oct 19 | guests, hotels, gifts, events, vendors, budget, etc. | (SELECT auth.jwt()...) | ✅ **OPTIMIZED** |
| 20251019000006 | Oct 19 | guests, hotels, gifts, vendors, events, etc. | auth.jwt()... | ⚠️ Direct (non-optimized) |
| 20251018000007 | Oct 18 | companies, users | auth.jwt()->>'sub' | ✅ Baseline |

*floor_plans is latest migration but uses wrong pattern

---

## Recommendations

### IMMEDIATE ACTION REQUIRED:

1. **Create new migration**: `20251023000007_fix_floor_plans_rls.sql`
2. **Drop obsolete policies** from floor_plans tables
3. **Recreate policies** using correct JWT pattern:
   ```sql
   company_id::text = (SELECT auth.jwt()->'metadata'->>'company_id')
   ```
4. **Test** that floor_plans RLS works without session variable

### VERIFICATION STEPS:

```sql
-- After fix: Should work with JWT auth, no session variable needed
SELECT * FROM floor_plans WHERE company_id = auth.uid();

-- Session variable should NOT be required
-- SET app.current_company_id = '...'; -- ❌ SHOULD NOT BE NEEDED
```

### LONG-TERM:

- All future migrations should follow `20251019000007` optimization pattern
- Never use `current_setting()` for authentication-related checks
- Always wrap JWT extraction in `(SELECT ...)` for performance
- Use `auth.jwt()->'metadata'->>'company_id'` as the standard path
