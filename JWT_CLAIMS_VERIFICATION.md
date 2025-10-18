# JWT Claims Verification - 2025 Clerk + Supabase

## ✅ JWT Extraction is Correctly Configured

All our RLS policies correctly use `auth.jwt()->>'sub'` to extract the Clerk user ID from JWT claims.

### Current Implementation (CORRECT)

#### 1. Users Table - Direct JWT Access
```sql
-- Policy: Users can read their own data
CREATE POLICY "users_read_own_data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    clerk_id = (auth.jwt()->>'sub')  -- ✅ Extracts Clerk user ID from JWT 'sub' claim
  );

-- Policy: Users can update their own profile
CREATE POLICY "users_update_own_profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    clerk_id = (auth.jwt()->>'sub')  -- ✅ Matches user via JWT
  )
  WITH CHECK (
    clerk_id = (auth.jwt()->>'sub')  -- ✅ Ensures user can only update their own data
  );
```

#### 2. Security Definer Functions (No Recursion)
```sql
-- Gets current user's role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$;

-- Gets current user's company_id without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM users WHERE clerk_id = (auth.jwt()->>'sub') LIMIT 1;
$$;
```

#### 3. Super Admin Policies (Using Helper Functions)
```sql
-- Policy: Super admins can read all users
CREATE POLICY "super_admins_read_all_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'super_admin'  -- ✅ Uses helper function
  );
```

## How JWT Claims Flow Works

### 1. User Signs In via Clerk
```
User logs in → Clerk generates JWT → JWT contains:
{
  "sub": "user_2abc123xyz",        ← Clerk user ID
  "iss": "https://clerk.accounts.dev",
  "aud": "authenticated",
  "exp": 1234567890,
  ...
}
```

### 2. Supabase Client Sends JWT
```javascript
// Client-side (src/providers/supabase-provider.tsx)
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    async accessToken() {
      return (await getToken()) ?? null  // Sends Clerk JWT to Supabase
    }
  }
)
```

### 3. Supabase RLS Extracts Claims
```sql
-- When user queries the database:
SELECT * FROM users WHERE clerk_id = (auth.jwt()->>'sub')

-- Supabase extracts:
auth.jwt()           → Full JWT object
auth.jwt()->>'sub'   → "user_2abc123xyz"  (Clerk user ID)

-- Then matches against users table:
users.clerk_id = "user_2abc123xyz"  ✅ Match!
```

## JWT Claims Available in Supabase

When using Clerk's native Supabase integration, these claims are automatically available:

```sql
(auth.jwt()->>'sub')        -- Clerk user ID (e.g., "user_2abc123xyz")
(auth.jwt()->>'email')      -- User email
(auth.jwt()->>'role')       -- Always "authenticated" for logged-in users
(auth.jwt()->>'aud')        -- Audience claim
(auth.jwt()->>'iss')        -- Issuer (Clerk domain)
(auth.jwt()->>'exp')        -- Expiration timestamp
```

### Example: Getting Current User
```sql
-- This query automatically filters to current user via RLS:
SELECT * FROM users WHERE clerk_id = (auth.jwt()->>'sub')

-- User sees only their own record because:
-- 1. JWT contains sub = "user_2abc123xyz"
-- 2. RLS policy checks: clerk_id = (auth.jwt()->>'sub')
-- 3. Only rows where clerk_id = "user_2abc123xyz" are returned
```

## Verification Test

To test JWT extraction is working:

```sql
-- Run this query while authenticated
SELECT
  (auth.jwt()->>'sub') as clerk_user_id,
  (auth.jwt()->>'email') as email,
  (auth.jwt()->>'role') as role,
  auth.role() as postgres_role;

-- Expected output when logged in:
-- clerk_user_id: "user_2abc123xyz"
-- email: "user@example.com"
-- role: "authenticated"
-- postgres_role: "authenticated"

-- If NOT logged in:
-- All values will be NULL
```

## Why Login Isn't Working

✅ **JWT extraction is CORRECT** - all policies use `auth.jwt()->>'sub'`

❌ **The problem:** ALL USERS DELETED from Supabase database!

### What Happened:
1. Users were created successfully (webhook logs show this)
2. Users were then DELETED (webhook handled `user.deleted` events from Clerk)
3. Now database is empty - no user records exist
4. When you try to log in, Clerk authenticates you, but Supabase has no user record to return

### Current Status:
```bash
⚠️  NO USERS IN DATABASE

$ npx tsx scripts/check-existing-users.ts
🔍 Checking for existing users in Supabase...
⚠️  NO USERS FOUND IN DATABASE
```

### Solution:
**Sign up with a BRAND NEW email address** to create a fresh user:
1. Go to: http://localhost:3000/sign-up
2. Use an email you've NEVER used before (or one not in Clerk)
3. Complete signup
4. Webhook will create user in Supabase
5. You'll be able to log in successfully

### DON'T:
- ❌ Try to sign in with deleted user emails
- ❌ Delete users from Clerk Dashboard after creating them
- ❌ Worry about "articles" table (doesn't exist in your app)

### DO:
- ✅ Create fresh user with new email
- ✅ Complete onboarding flow
- ✅ Start using the app!

## Summary

| Component | Status | Notes |
|-----------|--------|-------|
| JWT Signing | ✅ Working | RS256 (modern asymmetric) |
| JWT Claims Extraction | ✅ Correct | Using `auth.jwt()->>'sub'` |
| RLS Policies | ✅ Correct | No infinite recursion |
| Supabase Connection | ✅ Working | API returning 200/201 |
| Clerk Auth | ✅ Working | Users can sign up |
| **User Data** | ❌ **EMPTY** | **All users deleted - need fresh signup** |

**Next Step:** Sign up with new email to create your first user!
