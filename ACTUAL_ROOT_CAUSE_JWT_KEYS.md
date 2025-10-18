# 🎯 ACTUAL ROOT CAUSE: JWT Signing Key Mismatch

**Date:** October 18, 2025
**Status:** Root cause identified - Using wrong JWT signing method

---

## ✅ **You're Right - The Domain is Correct!**

The domain with `https://` is **NOT editable** because it's **auto-configured by Supabase** when you enable the native Clerk integration. This is the correct behavior!

---

## 🔥 **THE REAL PROBLEM: Wrong JWT Signing Keys**

Looking at your **Screenshot 1 (JWT Keys)**:

```
CURRENT KEY (Active):
  Type: Legacy HS256 (Shared Secret)
  ID: 1ca2bdal-bde9-45d1-bcd6-7ce7e284eb0c
  ← This is the OLD deprecated JWT template method

STANDBY KEY (Inactive):
  Type: ECC (P-256)
  ID: 962de267-39f7-452b-9f1c5c99d37b
  ← This is the NEW native integration method
```

**The Issue:**
- You're using **Legacy HS256** (shared secret) - the OLD deprecated approach
- The **ECC P-256** key is in standby - the NEW native integration key
- Your tokens are being signed with HS256, but Supabase native integration expects ECC P-256!

---

## 🔍 **Why This Causes 500 Errors**

### **Current Broken Flow (Legacy HS256 Active):**

```
1. Clerk Dashboard (OLD Setup):
   - Has JWT template configured (deprecated)
   - Uses shared secret (HS256)
   - getToken() returns JWT signed with HS256

2. Your Code:
   - Calls getToken() ✅ (correct)
   - Gets HS256-signed JWT

3. Supabase:
   - Native integration is enabled (expects ECC P-256 JWTs)
   - Receives HS256-signed JWT
   - Tries to validate with native integration
   - JWT signature doesn't match expected format
   - Validation FAILS → 500 errors
```

### **Correct Flow (After Rotating to ECC P-256):**

```
1. Clerk Dashboard (NEW Native Integration):
   - NO JWT template needed
   - Uses ECC P-256 public/private keys
   - getToken() returns JWT signed with ECC P-256

2. Your Code:
   - Calls getToken() ✅ (already correct)
   - Gets ECC P-256-signed JWT

3. Supabase:
   - Native integration is enabled
   - Receives ECC P-256-signed JWT
   - Fetches public key from Clerk's JWKS endpoint
   - Validates JWT signature successfully ✅
   - Validation SUCCEEDS → User data fetched → No errors!
```

---

## ✅ **THE FIX: Rotate JWT Keys**

### **Step 1: Rotate Keys in Supabase Dashboard**

1. **Go to:** https://app.supabase.com/project/gkrcaeymhgjepncbceag/settings/api

2. **Click on "JWT Keys" tab** (you should already see it from your screenshot)

3. **Click the "Rotate keys" button** (green button in your screenshot)

4. **Confirm the rotation**

**What this does:**
- Makes ECC P-256 the CURRENT key (active)
- Makes Legacy HS256 the STANDBY key (for backwards compatibility)
- New tokens will be validated using ECC P-256

**After rotation:**
```
CURRENT KEY (Active):
  Type: ECC (P-256) ✅
  ID: 962de267-39f7-452b-9f1c5c99d37b

STANDBY KEY (Inactive):
  Type: Legacy HS256 (Shared Secret)
  ID: 1ca2bdal-bde9-45d1-bcd6-7ce7e284eb0c
```

---

### **Step 2: Remove JWT Template in Clerk Dashboard (Critical!)**

The native integration **does NOT use JWT templates**. If you have one configured, it needs to be removed.

1. **Go to:** https://dashboard.clerk.com

2. **Navigate to:**
   - Your application
   - "JWT Templates" or "Sessions" or "Integrations"

3. **Check if you have a "Supabase" JWT template:**
   - If you see a template named "Supabase" or similar
   - **DELETE IT** or **DEACTIVATE IT**

4. **Why?**
   - JWT templates are the OLD deprecated approach
   - Native integration doesn't need them
   - Having a template active interferes with native integration

**What to look for:**
```
❌ JWT Templates:
   - Supabase (active) ← DELETE THIS

✅ After deletion:
   - No JWT templates configured
```

---

### **Step 3: Verify Clerk Integration Settings**

1. **Go to:** https://dashboard.clerk.com

2. **Navigate to Integrations → Supabase**

3. **Verify:**
   - Integration status: **Active** ✅
   - Connected project: Should show your Supabase project
   - No JWT template mentioned (native integration doesn't use it)

---

### **Step 4: Restart Dev Server**

```bash
# Stop server (Ctrl+C)
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

---

### **Step 5: Test Fresh Signup**

1. **Clear browser cache/cookies** (or use incognito)

2. **Go to:** http://localhost:3000

3. **Sign up with a fresh account**

4. **Watch terminal logs:**
   ```
   ✅ [Webhook] Company created
   ✅ [Webhook] User created successfully with company_id: xxx
   ```

5. **Dashboard should load without 500 errors!** 🎉

---

## 🔐 **Understanding JWT Signing Methods**

### **Legacy HS256 (Shared Secret) - DEPRECATED**

**How it works:**
```
1. Clerk Dashboard:
   - Create JWT template for Supabase
   - Paste Supabase JWT secret (shared secret)

2. Clerk signs tokens:
   - Uses HS256 symmetric encryption
   - Uses the shared secret

3. Supabase validates tokens:
   - Uses the same shared secret to verify signature
```

**Problems:**
- ❌ Security risk: sharing secrets between services
- ❌ Downtime during secret rotation
- ❌ Deprecated as of April 1, 2025
- ❌ Doesn't work with native integration

---

### **ECC P-256 (Public Key) - NATIVE INTEGRATION**

**How it works:**
```
1. Clerk Dashboard:
   - NO JWT template needed
   - Clerk generates ECC P-256 key pair
   - Public key published at JWKS endpoint

2. Clerk signs tokens:
   - Uses ECC P-256 asymmetric encryption
   - Signs with private key (kept secure by Clerk)

3. Supabase validates tokens:
   - Fetches public key from Clerk's JWKS endpoint:
     https://skilled-sawfish-5.clerk.accounts.dev/.well-known/jwks.json
   - Uses public key to verify signature
   - No secrets shared!
```

**Benefits:**
- ✅ No secret sharing (more secure)
- ✅ Zero-downtime key rotation
- ✅ Official 2025 native integration method
- ✅ Works seamlessly with Supabase

---

## 🧪 **How to Verify the Fix Worked**

### **Check 1: JWT Token Structure**

After fixing, sign in and check a Supabase request in browser DevTools:

1. **Network tab** → Find request to `gkrcaeymhgjepncbceag.supabase.co`
2. **Copy Authorization header** (the JWT token)
3. **Decode at:** https://jwt.io

**Expected JWT Header:**
```json
{
  "alg": "RS256",  ← Should be RS256 (ECC) not HS256
  "kid": "ins_...",
  "typ": "JWT"
}
```

**Expected JWT Payload:**
```json
{
  "iss": "https://skilled-sawfish-5.clerk.accounts.dev",
  "sub": "user_xxxxxxxxxxxxx",
  "azp": "http://localhost:3000",
  "sid": "sess_xxxxxxxxxxxxx",
  ...
}
```

**Key indicators it's working:**
- ✅ `alg: "RS256"` (not HS256)
- ✅ `iss` matches your Clerk domain
- ✅ `sub` contains Clerk user ID

---

### **Check 2: JWKS Endpoint**

Verify Clerk's public key is accessible:

```bash
curl https://skilled-sawfish-5.clerk.accounts.dev/.well-known/jwks.json
```

**Expected response:**
```json
{
  "keys": [
    {
      "use": "sig",
      "kty": "EC",
      "kid": "ins_...",
      "crv": "P-256",
      "alg": "ES256",
      "x": "...",
      "y": "..."
    }
  ]
}
```

This confirms Clerk is publishing ECC P-256 public keys for validation.

---

### **Check 3: Supabase Logs**

After testing, check Supabase logs for JWT validation:

1. **Go to:** https://app.supabase.com/project/gkrcaeymhgjepncbceag/logs

2. **Look for:**
   - ✅ Successful JWT validation
   - ❌ No "Invalid JWT" errors
   - ❌ No "Auth session missing" errors

---

## 📋 **Complete Checklist**

- [ ] **Supabase:** Rotate JWT keys to make ECC P-256 current
- [ ] **Clerk:** Check for JWT templates and DELETE any Supabase template
- [ ] **Clerk:** Verify native Supabase integration is active
- [ ] **Code:** Already correct (uses getToken() without template) ✅
- [ ] **Clear:** Delete .next folder and restart dev server
- [ ] **Test:** Sign up with fresh account
- [ ] **Verify:** Dashboard loads without 500 errors
- [ ] **Check:** JWT uses RS256 algorithm (not HS256)

---

## 🎯 **Why Your Code is Already Correct**

I verified your codebase uses the correct 2025 native pattern:

```typescript
// ✅ Correct - Native Integration
const supabase = createClient(url, key, {
  async accessToken() {
    return (await getToken()) ?? null  // No template parameter
  },
})
```

**You're NOT using:**
```typescript
// ❌ Deprecated - JWT Template Approach
const token = await getToken({ template: 'supabase' })
```

Your code is perfect! The issue is just the JWT signing method mismatch.

---

## 🚀 **Expected Outcome**

### **Before Fix (Legacy HS256):**
```
❌ Clerk signs JWT with HS256
❌ Supabase expects ECC P-256 signature
❌ Signature validation fails
❌ auth.jwt() returns null
❌ RLS policies reject queries
❌ 500 errors
```

### **After Fix (ECC P-256):**
```
✅ Clerk signs JWT with ECC P-256
✅ Supabase validates with public key from JWKS
✅ Signature validation succeeds
✅ auth.jwt() ->> 'sub' returns clerk_id
✅ RLS policies work correctly
✅ User data fetches successfully
✅ Dashboard loads perfectly
✅ No errors!
```

---

## 🔄 **Migration Path**

### **What You Had (Deprecated):**
```
Clerk:
  - JWT Template: "Supabase"
  - Shared secret: [Supabase JWT secret]
  - Signing: HS256

Supabase:
  - JWT Keys: Legacy HS256 (CURRENT)
  - Validates with: Shared secret
```

### **What You Need (Native Integration):**
```
Clerk:
  - NO JWT Template
  - Native Supabase integration enabled
  - Signing: ECC P-256 (RS256/ES256)

Supabase:
  - JWT Keys: ECC P-256 (CURRENT)
  - Validates with: Public key from JWKS endpoint
  - Domain: https://skilled-sawfish-5.clerk.accounts.dev ✅
```

---

## ⚡ **TL;DR - Do This Now:**

1. **Supabase Dashboard:**
   - Settings → API → JWT Keys
   - Click "Rotate keys"
   - Make ECC P-256 the current key

2. **Clerk Dashboard:**
   - Check for JWT Templates
   - Delete any "Supabase" template

3. **Restart:**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Test:**
   - Fresh signup
   - Should work! 🎉

---

**The domain `https://` is correct. Your code is correct. The only issue is using the wrong JWT signing method. Rotate to ECC P-256 and you're done!** 🚀
