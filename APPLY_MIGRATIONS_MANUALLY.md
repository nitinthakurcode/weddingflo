# ⚠️ CRITICAL: Manual Migration Required

## Issue
Your Supabase database has **57 security warnings** and **performance issues** that must be fixed.

The automated scripts cannot apply these migrations - they **MUST** be applied manually through the Supabase Dashboard.

---

## 🔴 STEP 1: Fix Function Security Warnings (57 functions)

### Go to Supabase SQL Editor
1. Open: https://supabase.com/dashboard/project/gkrcaeymhgjepncbceag/sql
2. Create a new query
3. Copy the ENTIRE contents of this file:
   ```
   supabase/migrations/20251118070157_fix_function_search_path_security.sql
   ```
4. Paste into the SQL Editor
5. Click **"Run"** (or press Cmd+Enter)
6. Wait for completion (~10 seconds)

### What This Fixes
- ✅ Adds `SET search_path = public` to 57 database functions
- ✅ Prevents SQL injection via search_path manipulation
- ✅ Maintains existing function behavior

---

## 🟡 STEP 2: Fix RLS Performance Warnings (85+ policies)

The RLS policies are using `auth.uid()` which gets re-evaluated for **every row**. This creates performance issues at scale.

### The Fix
Replace all instances of:
```sql
auth.uid()
```

With:
```sql
(SELECT auth.uid())
```

This caches the result instead of re-evaluating it for every row.

### Apply This Migration

Create and run this SQL in Supabase Dashboard:

```sql
-- Fix RLS Performance: Wrap auth.uid() in subquery
-- This prevents re-evaluation for each row

-- Companies table
DROP POLICY IF EXISTS "users_update_own_company_onboarding" ON public.companies;
CREATE POLICY "users_update_own_company_onboarding" ON public.companies
FOR UPDATE USING (
  id = (
    SELECT metadata->>'company_id'
    FROM auth.users
    WHERE id = (SELECT auth.uid())
  )::uuid
);

-- Users table
DROP POLICY IF EXISTS "authenticated_users_read_users" ON public.users;
CREATE POLICY "authenticated_users_read_users" ON public.users
FOR SELECT USING (
  company_id = (
    SELECT metadata->>'company_id'
    FROM auth.users
    WHERE id = (SELECT auth.uid())
  )::uuid
);

DROP POLICY IF EXISTS "authenticated_users_update_users" ON public.users;
CREATE POLICY "authenticated_users_update_users" ON public.users
FOR UPDATE USING (
  id = (SELECT auth.uid())
);

-- Apply same pattern to ALL other tables
-- (This is a sample - you'll need to update all 85+ policies)
```

---

## 🔵 CRITICAL NOTE

**Your auth architecture is correct:**
- ✅ Using Clerk session claims (no database queries in middleware)
- ✅ Using October 2025 Supabase keys (PUBLISHABLE_KEY and SECRET_KEY)
- ✅ Minimal middleware pattern

**These migrations only affect:**
- Database function security (SQL injection prevention)
- RLS query performance (caching auth lookups)

They do **NOT** change your authentication flow.

---

## Verification

After applying migrations, check Supabase Dashboard:

1. **Database > Linter**
   - Function search_path warnings should drop from 57 to 0
   - RLS initplan warnings should drop from 85+ to 0

2. **Performance Advisor**
   - `auth_rls_initplan` warnings should be resolved

---

## Why Manual Application is Required

1. **No psql client** installed on your system
2. **Supabase CLI** having authentication issues
3. **Management API** endpoint doesn't support raw SQL execution
4. **Supabase Dashboard SQL Editor** is the official, supported method

This is the standard way to apply migrations for Supabase projects.
