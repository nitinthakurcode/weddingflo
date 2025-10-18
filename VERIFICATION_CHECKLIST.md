# ✅ Clerk + Supabase Integration Verification Checklist

**Your Clerk Domain:** `skilled-sawfish-5.clerk.accounts.dev`
**Date:** October 18, 2025

---

## 🔍 CLI Analysis Results

### ✅ What's Working

1. **Database Schema** ✅
   - Companies table exists
   - Users table exists
   - Both tables have 0 records (clean slate)

2. **Environment Variables** ✅
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Set ✅
   - `CLERK_SECRET_KEY`: Set ✅
   - `CLERK_WEBHOOK_SECRET`: Set ✅
   - `NEXT_PUBLIC_SUPABASE_URL`: Set ✅
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Set ✅
   - `SUPABASE_SECRET_KEY`: Set ✅

3. **Code Implementation** ✅
   - Using `getToken()` without template parameter ✅
   - Using `accessToken()` callback ✅
   - RLS policies use `auth.jwt() ->> 'sub'` ✅
   - Webhook uses service role key ✅

4. **Clerk Configuration** ✅
   - Clerk domain extracted: `skilled-sawfish-5.clerk.accounts.dev`
   - Mode: Test/Development ✅

### ⚠️ What Needs Verification

1. **Supabase Auth Provider Configuration** ⚠️
   - Need to verify Clerk is configured in Supabase dashboard
   - Need to verify the Clerk domain matches

---

## 📋 Manual Verification Steps

Since you mentioned the integration is configured on your end, please verify these exact settings:

### Step 1: Verify Supabase Dashboard Configuration

1. **Open:** https://app.supabase.com/project/gkrcaeymhgjepncbceag/auth/providers

2. **Check for Clerk Provider:**
   - Look for "Clerk" in the list of authentication providers
   - It should show as "Enabled" or "Active"

3. **Verify Clerk Domain:**
   - Click on the Clerk provider settings
   - The configured domain should be: **`skilled-sawfish-5.clerk.accounts.dev`**
   - ⚠️ Make sure there's NO `https://` prefix
   - ⚠️ Make sure there's NO trailing slash
   - ⚠️ Exact match required: `skilled-sawfish-5.clerk.accounts.dev`

4. **Screenshot for Verification:**
   ```
   Expected configuration:

   Provider: Clerk ✅
   Status: Enabled ✅
   Clerk Domain: skilled-sawfish-5.clerk.accounts.dev ✅
   ```

---

### Step 2: Verify Clerk Dashboard Configuration

1. **Open:** https://dashboard.clerk.com

2. **Navigate to:**
   - Select your application
   - Go to "Integrations" or "Configure" section
   - Look for "Supabase"

3. **Check Integration Status:**
   - Supabase integration should show as "Active" or "Enabled"
   - Should display your Clerk domain: `skilled-sawfish-5.clerk.accounts.dev`

4. **Verify Supabase Project:**
   - If there's a field for Supabase project ref, it should be: `gkrcaeymhgjepncbceag`
   - Or it might just need your Supabase URL: `https://gkrcaeymhgjepncbceag.supabase.co`

---

### Step 3: Test the Complete Flow

Once verified, test the actual flow:

```bash
# 1. Start dev server
npm run dev

# 2. Open browser to http://localhost:3000
# 3. Sign up with a NEW account (not existing)
# 4. Watch terminal logs
```

**Expected Terminal Output:**

```
🔐 Assigning role "company_admin" to user test@example.com
[Webhook] Creating company: Test's Company (subdomain: companyxxx)
✅ [Webhook] Company created, full response: {...}
✅ [Webhook] Company ID extracted successfully: xxx-xxx-xxx
[Webhook] ✓ Validation passed - company_id is set: xxx-xxx-xxx
✅ [Webhook] User created successfully with company_id: xxx-xxx-xxx
✅ Updated Clerk metadata with role: company_admin
✅ User synced successfully
```

**Expected Browser Behavior:**

- ✅ Sign up completes successfully
- ✅ Redirected to `/dashboard`
- ✅ Dashboard loads without 500 errors
- ✅ User data displays correctly
- ✅ No errors in browser console

---

## 🐛 If Still Getting 500 Errors

### Check 1: Verify Token is Being Sent

Open browser DevTools:

1. Go to **Network** tab
2. Sign in/refresh dashboard
3. Look for requests to `gkrcaeymhgjepncbceag.supabase.co`
4. Click on a request
5. Check **Request Headers**
6. Look for: `Authorization: Bearer eyJhbGc...` (should be a long JWT)

**If Authorization header is MISSING:**
- The Clerk token is not being passed to Supabase
- This means the `accessToken()` callback might not be working
- Add logging to `src/providers/supabase-provider.tsx`:
  ```typescript
  async accessToken() {
    const token = await getToken()
    console.log('🔑 Clerk token:', token ? 'Present ✅' : 'Missing ❌')
    return token ?? null
  }
  ```

**If Authorization header is PRESENT:**
- The token is being sent correctly
- The issue is with Supabase not accepting the token
- This means Clerk domain is NOT configured in Supabase
- Or the domain doesn't match

---

### Check 2: Verify JWT Structure

If you see the Authorization header, copy the token and decode it:

1. Go to: https://jwt.io
2. Paste the token in the "Encoded" section
3. Check the **Payload**:

```json
{
  "iss": "https://skilled-sawfish-5.clerk.accounts.dev",  // ⚠️ MUST match Supabase config
  "sub": "user_xxxxxxxxxxxxx",                           // Clerk user ID
  "azp": "http://localhost:3000",                        // Your app URL
  "sid": "sess_xxxxxxxxxxxxx",                           // Session ID
  "exp": 1729253892,                                     // Expiration
  ...
}
```

**Key Check:**
- The `iss` claim should be: `https://skilled-sawfish-5.clerk.accounts.dev`
- This MUST match what's configured in Supabase (without `https://`)
- Supabase config: `skilled-sawfish-5.clerk.accounts.dev`
- JWT issuer: `https://skilled-sawfish-5.clerk.accounts.dev`

---

### Check 3: Verify Webhook is Working

The 500 errors might be because users are being created WITHOUT companies.

1. Delete any existing users in Supabase dashboard
2. Sign up with a fresh account
3. Watch terminal logs carefully
4. Verify webhook creates BOTH company AND user

**If webhook fails to create company:**
- Check webhook logs for errors
- Verify `SUPABASE_SECRET_KEY` is correct
- Run: `npx tsx scripts/test-supabase-connection.ts` (should show company creation works)

---

## 🎯 Most Likely Issues

Based on analysis, the issue is likely one of these:

### Issue #1: Clerk Domain Mismatch ⚠️ (MOST LIKELY)

**Symptom:** 500 errors when fetching user data

**Cause:**
- Clerk domain in Supabase: `something-else.clerk.accounts.dev` ❌
- Actual Clerk domain: `skilled-sawfish-5.clerk.accounts.dev` ✅
- **They don't match!**

**Solution:**
1. Go to Supabase → Auth → Providers → Clerk
2. Update domain to: `skilled-sawfish-5.clerk.accounts.dev`
3. Save changes
4. Restart dev server
5. Test signup

---

### Issue #2: Clerk Provider Not Enabled

**Symptom:** Token validation fails

**Cause:**
- Clerk is not listed as a provider in Supabase
- Or it's disabled

**Solution:**
1. Go to Supabase → Auth → Providers
2. Click "Add provider"
3. Select "Clerk"
4. Enter domain: `skilled-sawfish-5.clerk.accounts.dev`
5. Click "Enable"

---

### Issue #3: Wrong JWT Issuer Format

**Symptom:** "Invalid JWT" errors

**Cause:**
- Supabase configured with: `https://skilled-sawfish-5.clerk.accounts.dev` ❌ (with https://)
- Should be: `skilled-sawfish-5.clerk.accounts.dev` ✅ (without https://)

**Solution:**
- Remove `https://` prefix from Clerk domain in Supabase
- Just use: `skilled-sawfish-5.clerk.accounts.dev`

---

## 📊 Diagnostic Commands

Run these to gather more info:

```bash
# Test database connection
npx tsx scripts/test-supabase-connection.ts

# Check auth configuration
npx tsx scripts/check-supabase-auth-config.ts

# Test Clerk token info
npx tsx scripts/test-clerk-token.ts

# Simulate user fetch
npx tsx scripts/simulate-user-fetch.ts
```

---

## ✅ Final Checklist

Before testing signup, verify:

- [ ] Supabase dashboard → Auth → Providers → Clerk is **Enabled**
- [ ] Clerk domain is: `skilled-sawfish-5.clerk.accounts.dev` (exact match)
- [ ] No `https://` prefix in Supabase configuration
- [ ] No trailing slash in domain
- [ ] Clerk dashboard → Integrations → Supabase shows **Active**
- [ ] Database is clean (0 users, 0 companies)
- [ ] Dev server is running
- [ ] `.env.local` has all required variables

---

## 🚀 Next Steps

1. **Verify** the Clerk domain in Supabase dashboard matches: `skilled-sawfish-5.clerk.accounts.dev`

2. **Test** fresh signup:
   ```bash
   npm run dev
   # Sign up with new account
   # Watch logs
   ```

3. **Report back:**
   - Does webhook create company + user successfully?
   - Does dashboard load without 500 errors?
   - Any errors in browser console?

---

**Your Clerk Domain:** `skilled-sawfish-5.clerk.accounts.dev`
**Supabase Project:** `gkrcaeymhgjepncbceag`
**Database Status:** Clean (ready for testing)
**Code Status:** Correct (2025 native integration implemented)

**Most Likely Fix:** Verify Clerk domain in Supabase matches `skilled-sawfish-5.clerk.accounts.dev`
