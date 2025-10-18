# Testing Guide - 2025 Native Clerk + Supabase Integration

**Date:** October 18, 2025
**Status:** Ready for Testing
**Integration:** Native Clerk + Supabase with ECC P-256

---

## 📋 Pre-Test Checklist

Before running any tests, ensure the following are in place:

### ✅ Configuration Requirements

- [ ] **ECC P-256 is CURRENT** in Supabase → Settings → Auth → JWT Keys
- [ ] **Legacy HS256 revoked** (no longer in key list)
- [ ] **New API keys active** (sb_publishable_*, sb_secret_*)
- [ ] **No JWT templates** in Clerk Dashboard → Configure → Sessions
- [ ] **Clerk integration enabled** in Supabase → Settings → Auth → Third-Party Auth
- [ ] **Environment variables** set correctly in `.env.local`

### ✅ Database Requirements

- [ ] **RLS migration applied** (`20251018000006_final_rls_policies_ecc_p256.sql`)
- [ ] **Companies table** exists with RLS enabled
- [ ] **Users table** exists with RLS enabled
- [ ] **auth.clerk_user_id()** helper function created

### ✅ Code Requirements

- [ ] **No legacy key references** in codebase
- [ ] **accessToken() callback** pattern used (not JWT templates)
- [ ] **Admin client** uses `SUPABASE_SECRET_KEY`
- [ ] **Client/server providers** use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

---

## 🧪 Testing Levels

### Level 1: Quick Smoke Test (5 minutes)

**Goal:** Verify basic integration works end-to-end

**Steps:**

1. **Clear cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Test signup flow:**
   - Open incognito window: http://localhost:3000
   - Sign up with NEW email address
   - Watch terminal for webhook logs

3. **Expected webhook output:**
   ```
   🔐 Assigning role "company_admin" to user test@example.com
   [Webhook] Creating company: Test's Company (subdomain: companyxxx)
   ✅ [Webhook] Company created
   ✅ [Webhook] User created successfully with company_id: xxx
   ✅ Updated Clerk metadata with role: company_admin
   ```

4. **Verify dashboard loads:**
   - Should redirect to `/dashboard`
   - No 500 errors in browser console
   - User data displays correctly

**Success Criteria:**
- ✅ Webhook creates company + user
- ✅ Dashboard loads without errors
- ✅ No "Auth session missing" errors

---

### Level 2: JWT Verification (10 minutes)

**Goal:** Confirm JWT is using ES256 algorithm

**Steps:**

1. **Sign in to application**

2. **Open DevTools → Network tab**

3. **Refresh dashboard page**

4. **Find Supabase API request:**
   - Look for: `gkrcaeymhgjepncbceag.supabase.co/rest/v1/users`

5. **Copy Authorization header:**
   - Click request → Headers tab
   - Copy value starting with `Bearer eyJ...`

6. **Decode at jwt.io:**
   - Paste JWT into "Encoded" section
   - Check HEADER section

7. **Verify algorithm:**
   ```json
   {
     "alg": "ES256",  ✅ CORRECT (or RS256)
     "kid": "ins_...",
     "typ": "JWT"
   }
   ```

   **If you see:**
   - `"alg": "HS256"` ❌ - JWT template still active, delete it
   - `"alg": "ES256"` ✅ - ECC P-256 working
   - `"alg": "RS256"` ✅ - RSA also valid for native integration

8. **Verify payload structure:**
   ```json
   {
     "iss": "https://skilled-sawfish-5.clerk.accounts.dev",
     "sub": "user_xxxxxxxxxxxxx",  ← clerk_id
     "azp": "http://localhost:3000",
     "sid": "sess_xxxxxxxxxxxxx",
     "exp": 1729253892,
     "iat": 1729253592
   }
   ```

**Success Criteria:**
- ✅ Algorithm is ES256 or RS256 (NOT HS256)
- ✅ Issuer matches Clerk domain
- ✅ sub claim contains user_xxx format

---

### Level 3: JWKS Endpoint Verification (2 minutes)

**Goal:** Confirm Clerk is publishing ECC P-256 public keys

**Steps:**

1. **Fetch JWKS endpoint:**
   ```bash
   curl https://skilled-sawfish-5.clerk.accounts.dev/.well-known/jwks.json
   ```

2. **Expected response:**
   ```json
   {
     "keys": [
       {
         "use": "sig",
         "kty": "EC",           ← Elliptic Curve ✅
         "kid": "ins_...",
         "crv": "P-256",        ← P-256 curve ✅
         "alg": "ES256",        ← ECDSA with SHA-256 ✅
         "x": "base64...",
         "y": "base64..."
       }
     ]
   }
   ```

**Success Criteria:**
- ✅ `kty` is "EC" (Elliptic Curve)
- ✅ `crv` is "P-256"
- ✅ `alg` is "ES256"

---

### Level 4: RLS Policy Testing (15 minutes)

**Goal:** Verify Row Level Security works correctly

#### 4.1 Test User Can Read Own Data

**Setup:**
```typescript
// In browser console after signing in
const response = await fetch('/api/test-user-access');
console.log(await response.json());
```

**Create test endpoint** (if not exists):
```typescript
// src/app/api/test-user-access/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('*');

  return NextResponse.json({ data, error });
}
```

**Expected result:**
```json
{
  "data": [
    {
      "id": "xxx",
      "clerk_id": "user_xxx",
      "email": "test@example.com",
      "role": "company_admin",
      ...
    }
  ],
  "error": null
}
```

**Success Criteria:**
- ✅ Returns only current user's data
- ✅ No error present
- ✅ clerk_id matches logged-in user

---

#### 4.2 Test User Cannot Access Other Users

**Setup:**
1. Sign up second user with different email
2. Copy their `user_id` from database
3. Try to fetch with first user's session

**Test query:**
```typescript
// Should return empty or error
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('clerk_id', 'user_OTHER_USER_ID');  // Different user
```

**Expected result:**
```json
{
  "data": [],  // Empty - RLS blocks access ✅
  "error": null
}
```

**Success Criteria:**
- ✅ Returns empty array (no data)
- ✅ Does not throw error (just filters results)

---

#### 4.3 Test Super Admin Access

**Setup:**
1. Run super admin seed script:
   ```bash
   npx tsx scripts/seed-super-admin.ts
   ```

2. Sign in with super admin email

**Test query:**
```typescript
const { data, error } = await supabase
  .from('users')
  .select('*');
```

**Expected result:**
```json
{
  "data": [
    { "email": "user1@example.com", ... },
    { "email": "user2@example.com", ... },
    { "email": "admin@example.com", ... }
  ],  // All users visible ✅
  "error": null
}
```

**Success Criteria:**
- ✅ Returns ALL users across all companies
- ✅ Super admin can see everyone

---

#### 4.4 Test Service Role Bypass

**Setup:**
```typescript
// Use admin client (bypasses RLS)
const supabaseAdmin = createServerSupabaseAdminClient();

const { data, error } = await supabaseAdmin
  .from('users')
  .select('*');
```

**Expected result:**
- ✅ Returns ALL users (RLS bypassed)
- ✅ Works even without auth context

---

### Level 5: Webhook Testing (10 minutes)

**Goal:** Verify Clerk webhooks properly create users

#### 5.1 Test User Creation Webhook

**Steps:**

1. **Set up webhook monitoring:**
   ```bash
   # In terminal, tail Next.js logs
   npm run dev
   ```

2. **Trigger webhook:**
   - Sign up new user in incognito window
   - Watch terminal output

3. **Expected logs:**
   ```
   ========================================
   🎯 Clerk Webhook Received
   ========================================
   Type: user.created
   User ID: user_xxx
   Email: test@example.com
   ========================================

   🔐 Assigning role "company_admin" to user test@example.com
   [Webhook] Creating company: Test's Company
   ✅ [Webhook] Company created
   ✅ [Webhook] User created successfully with company_id: xxx
   ✅ Updated Clerk metadata with role: company_admin
   ✅ User synced successfully
   ```

4. **Verify database:**
   ```bash
   npx tsx scripts/verify-clerk-supabase.ts
   ```

   **Expected output:**
   ```
   ✅ Connected to Supabase successfully!
   📊 Found 1 users in database

   👤 User: test@example.com
      Clerk ID: user_xxx
      Role: company_admin
      Company ID: xxx
      Active: true
   ```

**Success Criteria:**
- ✅ Webhook executes without errors
- ✅ Company is created in database
- ✅ User is created with correct company_id
- ✅ Clerk metadata updated with role

---

#### 5.2 Test User Update Webhook

**Steps:**

1. **Update user in Clerk Dashboard:**
   - Go to https://dashboard.clerk.com
   - Users → Select user → Edit
   - Change first name or last name
   - Save

2. **Expected webhook logs:**
   ```
   Type: user.updated
   User ID: user_xxx
   ✅ [Webhook] User updated successfully
   ```

3. **Verify in database:**
   - User record should reflect updated name

**Success Criteria:**
- ✅ user.updated webhook fires
- ✅ Database record updates correctly

---

### Level 6: End-to-End User Flow (20 minutes)

**Goal:** Test complete user journey

#### Test Scenario: New Company Onboarding

1. **Sign Up**
   - Open http://localhost:3000 in incognito
   - Click "Sign Up"
   - Enter email, password, name
   - Submit

2. **Expected: Onboarding redirect**
   - Should redirect to `/onboard`
   - Company creation form should show

3. **Complete onboarding**
   - Enter company name
   - Submit form

4. **Expected: Dashboard loads**
   - Redirects to `/dashboard`
   - Shows welcome message
   - Displays user stats

5. **Create test data**
   - Add a guest
   - Create an event
   - Add a budget item

6. **Verify data persistence**
   - Refresh page
   - All data should still be there

7. **Test settings pages**
   - Navigate to Settings → Profile
   - Update profile info
   - Save changes
   - Refresh → Changes persist

8. **Sign out and sign back in**
   - Click sign out
   - Sign in again
   - All data still accessible

**Success Criteria:**
- ✅ Complete flow works without errors
- ✅ Data persists across sessions
- ✅ RLS properly scopes data to user

---

## 🔍 Verification Scripts

### Run All Verification Checks

```bash
# 1. Verify Clerk + Supabase integration
npx tsx scripts/verify-clerk-supabase.ts

# 2. Check database connection
npx tsx scripts/test-supabase-connection.ts

# 3. Verify RLS policies
npx tsx scripts/check-rls-policies.ts
```

**Expected output:**
```
✅ Connected to Supabase successfully!
✅ Users synced from Clerk
✅ RLS enabled on users table
✅ JWT uses ES256 algorithm
✅ 2025 Native Integration: ACTIVE
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Still seeing HS256 in JWT

**Symptoms:**
- JWT header shows `"alg": "HS256"`
- Dashboard returns 500 errors

**Diagnosis:**
```bash
# Check JWT at jwt.io - if shows HS256, JWT template is active
```

**Fix:**
1. Go to Clerk Dashboard
2. Configure → Sessions → JWT Templates
3. Delete ALL templates (especially "Supabase")
4. Clear cache: `rm -rf .next`
5. Restart: `npm run dev`
6. Test with fresh signup

---

### Issue 2: 500 Errors on User Fetch

**Symptoms:**
- Browser console shows 500 from Supabase
- Terminal shows no errors

**Diagnosis:**
```bash
# Check Supabase logs
# Likely cause: JWT validation failing
```

**Fix:**
1. Verify ECC P-256 is CURRENT in Supabase
2. Check JWKS endpoint returns ECC keys
3. Ensure no JWT templates in Clerk
4. Test with fresh user signup

---

### Issue 3: RLS Denying Access

**Symptoms:**
- User can't see own data
- Empty results returned

**Diagnosis:**
```typescript
// Check clerk_id in JWT matches database
console.log(auth.jwt()->>'sub');  // In Supabase
```

**Fix:**
1. Apply RLS migration: `supabase db push`
2. Verify auth.clerk_user_id() function exists
3. Check users.clerk_id field is populated
4. Test with fresh signup (not migrated user)

---

### Issue 4: Webhook Not Creating User

**Symptoms:**
- Sign up succeeds in Clerk
- User not in Supabase database
- Webhook logs missing

**Diagnosis:**
```bash
# Check webhook endpoint
curl -X POST http://localhost:3000/api/webhooks/clerk \
  -H "Content-Type: application/json"
```

**Fix:**
1. Verify CLERK_WEBHOOK_SECRET in .env.local
2. Check webhook URL in Clerk Dashboard
3. Ensure admin client uses SUPABASE_SECRET_KEY
4. Test webhook endpoint directly

---

## 📊 Success Metrics

### Integration Health Checklist

After completing all tests, verify:

- [ ] **JWT Algorithm** - ES256 (not HS256)
- [ ] **JWKS Endpoint** - Returns ECC P-256 keys
- [ ] **User Signup** - Creates company + user automatically
- [ ] **Dashboard Load** - No 500 errors
- [ ] **RLS Policies** - Users see only their own data
- [ ] **Super Admin** - Can see all users
- [ ] **Webhook Logs** - Company and user creation succeed
- [ ] **Data Persistence** - Data survives page refresh
- [ ] **Settings Update** - Profile changes save correctly
- [ ] **Sign Out/In** - Session restores properly

### Performance Benchmarks

- **User Signup** - < 3 seconds (webhook processing)
- **Dashboard Load** - < 2 seconds (initial data fetch)
- **Page Navigation** - < 500ms (React Query cache)
- **API Response** - < 200ms (Supabase queries)

---

## 🎉 Test Complete!

If all tests pass:

1. ✅ **2025 Native Integration** is working
2. ✅ **ECC P-256 JWT signing** is active
3. ✅ **RLS policies** are protecting data
4. ✅ **Webhooks** are syncing users
5. ✅ **Application** is production-ready

**Next Steps:**
- Deploy to staging environment
- Run same tests in staging
- Monitor error rates with Sentry
- Track analytics with PostHog
- Prepare for production deployment

---

**Questions or issues?** Check:
- `ECC_P256_SETUP_COMPLETE.md` - Comprehensive setup guide
- `2025_NATIVE_INTEGRATION_COMPLETE.md` - Full audit report
- `QUICK_TEST_NOW.md` - 5-minute quick test

---

**Happy Testing!** 🚀
