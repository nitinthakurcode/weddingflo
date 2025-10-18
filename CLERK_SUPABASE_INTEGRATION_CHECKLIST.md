# Clerk + Supabase Native Integration Checklist (2025)

## ✅ Clerk Next.js Integration - VERIFIED

Your Clerk Next.js setup is **correctly configured**:

### 1. ClerkProvider Setup ✅
```tsx
// src/app/AuthProvider.tsx
<ClerkProvider
  publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
  appearance={{ variables: { colorPrimary: '#8b5cf6' } }}
>
  {children}
</ClerkProvider>
```

### 2. Middleware ✅
```tsx
// src/middleware.ts
export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

  if (!isPublic) {
    auth().protect();  // Protects non-public routes
  }
  return NextResponse.next();
});
```

### 3. Custom Sign-In/Sign-Up Pages ✅
```tsx
// Environment variables
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

// Custom pages exist at:
// - src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
// - src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
```

### 4. Environment Variables ✅
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  ✅ Set
CLERK_SECRET_KEY=sk_test_...                   ✅ Set
CLERK_WEBHOOK_SECRET=whsec_...                 ✅ Set
```

---

## ⚠️ CRITICAL: Verify Supabase Integration After Re-Enabling

Since you **deleted and re-enabled** the Clerk-Supabase integration, you MUST verify these settings:

### Step 1: Check Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/gkrcaeymhgjepncbceag/auth/providers
2. Click **"Third Party Auth"** tab
3. Verify **Clerk** shows as **"Enabled"** ✅
4. Verify the domain is: `https://skilled-sawfish-5.clerk.accounts.dev`

### Step 2: Check Clerk Dashboard
1. Go to: https://dashboard.clerk.com
2. Navigate to: **Integrations** → **Supabase**
3. Verify the integration shows as **"Active"** ✅
4. Verify it's using the correct Supabase project

### Step 3: Verify Webhook Configuration
After re-enabling, you may need to recreate the webhook!

#### Check Current Webhook:
1. Go to: https://dashboard.clerk.com/apps/.../webhooks
2. Look for webhook with URL: `https://YOUR_NGROK_URL/api/webhooks/clerk`
3. **If webhook was deleted**, you need to create a new one!

#### Webhook Events Required:
```
✅ user.created
✅ user.updated
✅ user.deleted
```

#### Create New Webhook (If Missing):
```bash
# 1. Start ngrok (if not running)
ngrok http 3000

# 2. Copy ngrok URL (e.g., https://abc123.ngrok.io)

# 3. In Clerk Dashboard → Webhooks → Add Endpoint:
Endpoint URL: https://YOUR_NGROK_URL/api/webhooks/clerk
Events: user.created, user.updated, user.deleted

# 4. Copy the webhook secret and update .env.local:
CLERK_WEBHOOK_SECRET=whsec_...
```

### Step 4: Verify JWT Settings

Since you re-enabled the integration, verify JWT configuration:

1. **Clerk Dashboard** → **JWT Templates**
   - ❌ Should have **NO custom JWT templates** (use default)
   - ✅ Supabase integration manages this automatically

2. **Signing Keys**
   - Go to: Clerk Dashboard → **API Keys** → **JWT Keys**
   - Should show: **RS256** (current)
   - ❌ No legacy HS256 keys

3. **JWKS Endpoint**
   - URL: `https://skilled-sawfish-5.clerk.accounts.dev/.well-known/jwks.json`
   - Should return RS256 keys

---

## 🔍 Test Integration After Re-Enabling

### Test 1: Sign Up with Fresh Email
```bash
# 1. Go to http://localhost:3000/sign-up
# 2. Use a BRAND NEW email (important!)
# 3. Complete signup

# Expected behavior:
✅ Clerk creates user
✅ Webhook fires: user.created
✅ Webhook creates user in Supabase
✅ Webhook creates company in Supabase
✅ User redirected to /onboard
✅ User can access /dashboard
```

### Test 2: Check Server Logs
```bash
# Watch your terminal running `npm run dev`

# You should see:
✅ POST /api/webhooks/clerk 200
✅ [Webhook] Creating company: ...
✅ [Webhook] Company created
✅ [Webhook] User created successfully
```

### Test 3: Verify User in Supabase
```bash
# Run this script:
npx tsx scripts/check-existing-users.ts

# Expected output:
✅ Found 1 user(s):
   1. your-email@example.com
      Clerk ID: user_2abc123xyz
      Role: company_admin
      Company ID: uuid-here
```

---

## ❌ Common Issues After Re-Enabling

### Issue 1: Webhook Not Firing
**Symptom:** User created in Clerk but not in Supabase

**Solution:**
1. Verify webhook exists in Clerk Dashboard
2. Check webhook URL matches your ngrok URL
3. Verify webhook secret in .env.local
4. Check server logs for webhook errors

### Issue 2: JWT Validation Failing
**Symptom:** 401 errors when querying Supabase

**Solution:**
1. Verify Clerk domain in Supabase: `https://skilled-sawfish-5.clerk.accounts.dev`
2. Ensure no custom JWT templates in Clerk
3. Verify JWKS endpoint is accessible
4. Check RLS policies use `auth.jwt()->>'sub'`

### Issue 3: Integration Shows "Not Connected"
**Symptom:** Supabase Third Party Auth shows Clerk as disabled

**Solution:**
1. Re-enable in Supabase: Auth → Providers → Third Party Auth → Clerk
2. Enter Clerk domain: `https://skilled-sawfish-5.clerk.accounts.dev`
3. Save changes
4. Wait 1-2 minutes for propagation

---

## 📋 Environment Variables Checklist

After re-enabling, verify ALL these are set correctly in `.env.local`:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c2tpbGxlZC1zYXdmaXNoLTUuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_VXJOvNkwzVq8mTCqlAt7MM8X5h5CZNQJkP2TGGjsv2
CLERK_WEBHOOK_SECRET=whsec_rH90gB+6LwqWdDfZ+GtJO5/fXvhlaD0V

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase Configuration (2025 Native Integration)
NEXT_PUBLIC_SUPABASE_URL=https://gkrcaeymhgjepncbceag.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_9H14HZConl_X4GbCpn084Q_yuS8Ycvq
SUPABASE_SECRET_KEY=sb_secret_tWU6SdCF5GPDZ5d3SOtnAA_jQKiVvG2
```

---

## ✅ Integration Architecture (2025 Native)

```
┌─────────────────────────────────────────────────────────────┐
│                     USER SIGN UP FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. User → /sign-up page
2. Clerk <SignUp /> component → Clerk API (creates user)
3. Clerk → Webhook → Your API /api/webhooks/clerk
4. Webhook → Supabase (creates user + company using admin client)
5. User → /onboard (via Clerk redirect)

┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATED REQUEST FLOW                 │
└─────────────────────────────────────────────────────────────┘

1. User authenticated → Clerk session active
2. React Component → useSupabase() hook
3. Hook calls → Clerk getToken() → Returns Clerk JWT
4. Supabase client → Sends JWT in Authorization header
5. Supabase RLS → Validates JWT via JWKS endpoint
6. Supabase RLS → Extracts user ID: auth.jwt()->>'sub'
7. Supabase → Returns filtered data based on RLS policies

┌─────────────────────────────────────────────────────────────┐
│                      KEY DIFFERENCES 2025                    │
└─────────────────────────────────────────────────────────────┘

❌ OLD (Deprecated):
- Custom JWT templates in Clerk
- Manually sharing JWT secrets
- HS256 symmetric signing

✅ NEW (2025 Native):
- No JWT templates needed
- Automatic JWKS endpoint validation
- RS256 asymmetric signing
- Third Party Auth integration in Supabase
- Direct Clerk domain configuration
```

---

## 🚀 Next Steps

1. **Verify webhook exists** in Clerk Dashboard
2. **Test sign up** with fresh email
3. **Check server logs** for successful webhook
4. **Run user check** script to confirm user created
5. **Try logging in** with the new user

If any step fails, share the error and I'll help debug!

---

## 📝 Quick Verification Commands

```bash
# 1. Check if users exist in Supabase
npx tsx scripts/check-existing-users.ts

# 2. Restart dev server
lsof -ti:3000 | xargs kill -9
npm run dev

# 3. Start ngrok (for webhooks)
ngrok http 3000

# 4. Test sign up
# Open: http://localhost:3000/sign-up
# Use NEW email you've never used before
```
