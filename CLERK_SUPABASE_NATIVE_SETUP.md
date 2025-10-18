# Native Clerk + Supabase Integration Setup (April 2025+)

This guide uses the **NEW native integration** introduced in April 2025, which deprecates the old JWT template approach.

## What Changed?

### Old Approach (Deprecated)
- ❌ Required creating JWT templates in Clerk dashboard
- ❌ Required configuring Supabase to accept custom JWT issuers
- ❌ Used `@supabase/ssr` with manual header manipulation
- ❌ Called `getToken({ template: 'supabase' })`

### New Native Integration (April 2025+)
- ✅ NO JWT templates needed
- ✅ NO Supabase JWT configuration needed
- ✅ Uses `@supabase/supabase-js` with `accessToken()` callback
- ✅ Just call `getToken()` - no parameters
- ✅ Clerk automatically adds `"role": "authenticated"` claim

---

## Benefits

The native integration provides:
- **Simpler setup**: No JWT templates or JWKS configuration
- **Automatic token refresh**: Tokens are fetched fresh for each request
- **Better security**: No need to share Supabase JWT secret with Clerk
- **Official support**: Built into Clerk's platform

---

## Implementation (Already Complete ✅)

Your codebase now uses the native integration:

### Client-Side (`src/providers/supabase-provider.tsx`)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = useMemo(() => {
  return createClient(url, key, {
    async accessToken() {
      return session?.getToken() ?? null
    },
  })
}, [session?.id])
```

### Server-Side (`src/lib/supabase/server.ts`)
```typescript
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

export async function createServerSupabaseClient() {
  const authObj = await auth()

  return createClient(url, key, {
    async accessToken() {
      return authObj.getToken()
    },
  })
}
```

---

## Important: Middleware is for UX, Not Security

**2025 Best Practice**: Middleware should ONLY be used for UX (redirects), NOT as your security boundary.

### Why Not Use Middleware for Security?

1. **CVE-2025-29927**: Next.js middleware vulnerabilities showed why it shouldn't be the only defense
2. **Next.js Documentation**: Official docs say middleware is fine for initial checks/redirects but shouldn't be your only protection
3. **Performance**: Querying Supabase in middleware adds overhead to every request
4. **Unnecessary**: Native integration handles authorization at the data layer

### Where Security Belongs

✅ **RLS Policies** (Database layer) - Your primary security boundary
✅ **Server Actions/API Routes** (Server layer) - Additional checks if needed
❌ **Middleware** (Edge layer) - UX redirects only, not authorization

### What Your Middleware Does

Your `middleware.ts` now:
- ✅ Checks if user is authenticated (Clerk session)
- ✅ Reads role from Clerk session metadata
- ✅ Redirects based on role (UX convenience)
- ❌ Does NOT query Supabase
- ❌ Does NOT make security decisions

Actual security enforcement happens in:
- RLS policies using `auth.clerk_user_id()`
- Server-side permission checks in API routes/actions

---

## Configuration Steps

### 1. Enable Clerk Integration in Supabase (One-Time Setup)

1. Go to **Supabase Dashboard** → Your Project → Settings → **Integrations**
2. Find **Clerk** in the integrations list
3. Click **Enable** or **Connect**
4. Follow the prompts to authorize Clerk

**That's it!** No JWT templates, no JWKS URLs, no manual configuration.

### 2. Verify RLS Policies

Your RLS policies should use `auth.clerk_user_id()` to extract the Clerk user ID:

```sql
-- Helper function (already exists from migration 003)
CREATE OR REPLACE FUNCTION auth.clerk_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    NULL
  );
$$;

-- Example RLS policy
CREATE POLICY "users_read_own_data"
  ON users
  FOR SELECT
  TO authenticated
  USING (clerk_id = auth.clerk_user_id());
```

### 3. Test the Integration

1. **Sign up** with a new account
2. **Check console** for any errors
3. **Verify** dashboard loads with user data
4. **Test** CRUD operations (create, read, update, delete)

---

## Troubleshooting

### Issue: "Invalid JWT" or "Unauthorized"

**Cause**: Clerk integration not enabled in Supabase

**Fix**:
1. Go to Supabase Dashboard → Settings → Integrations
2. Enable Clerk integration
3. Verify the connection is active

### Issue: Dashboard stuck on "Loading..."

**Cause**: RLS policies blocking queries or client not getting data

**Fix**:
1. Check browser console for RLS errors
2. Verify RLS policies exist and use `auth.clerk_user_id()`
3. Check network tab to see if requests return 401/403
4. Verify user exists in `users` table with correct `clerk_id`

### Issue: User data not loading

**Cause**: User doesn't exist in Supabase database

**Fix**:
1. Check Clerk webhook is configured and firing
2. Verify webhook creates user in Supabase on sign-up
3. Manually check `users` table in Supabase dashboard
4. If missing, user webhooks to create the record

---

## Architecture

```
┌─────────────┐
│   Browser   │
│             │
│  Clerk SDK  │  ← Manages authentication
└──────┬──────┘
       │
       │ getToken() - Returns Clerk session token
       │
       ▼
┌─────────────────────────────────────────────────┐
│           Supabase Client                        │
│                                                  │
│  • accessToken() callback gets fresh token      │
│  • Token automatically added to each request    │
│  • No manual header manipulation needed         │
└──────────────────────┬──────────────────────────┘
                       │
                       │ Authorization: Bearer <token>
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│          Supabase Database                       │
│                                                  │
│  1. Native integration validates Clerk tokens   │
│  2. Extracts clerk_id from 'sub' claim          │
│  3. RLS policies enforce access control         │
│  4. Returns only authorized data                │
└─────────────────────────────────────────────────┘
```

---

## Migration from Old JWT Template Approach

If you were using the old JWT template approach:

1. ✅ **Remove JWT template** from Clerk dashboard (no longer needed)
2. ✅ **Remove JWT issuer** from Supabase auth settings (no longer needed)
3. ✅ **Update code** to use `accessToken()` callback (already done)
4. ✅ **Remove** `{ template: 'supabase' }` from `getToken()` calls (already done)
5. ✅ **Enable** Clerk integration in Supabase dashboard

---

## References

- [Clerk + Supabase Integration Docs](https://clerk.com/docs/integrations/databases/supabase)
- [Supabase + Clerk Partner Page](https://supabase.com/partners/integrations/clerk)
- [Clerk Changelog: Native Supabase Integration](https://clerk.com/changelog/2025-03-31-supabase-integration)

---

## Support

If you encounter issues:
1. Check Supabase Dashboard → Integrations → Verify Clerk is enabled
2. Review browser console for error messages
3. Check Supabase logs for authentication failures
4. Verify webhook is creating users on sign-up
