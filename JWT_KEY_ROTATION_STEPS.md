# 🔄 JWT Key Rotation - Fix 500 Errors

**Time Required:** 5-10 minutes
**Issue:** Using Legacy HS256 instead of ECC P-256 for native integration

---

## ✅ **Confirmed: Domain is Correct**

```
Clerk Domain: https://skilled-sawfish-5.clerk.accounts.dev ✅
Supabase Domain: https://skilled-sawfish-5.clerk.accounts.dev ✅
Both match! ✅
Not changeable (auto-managed by native integration) ✅
```

**This is correct!** The domain is auto-configured and should have `https://`.

---

## 🎯 **The Actual Problem**

**From your screenshot, you're using:**
```
CURRENT: Legacy HS256 (Shared Secret) ❌ OLD METHOD
STANDBY: ECC P-256 ✅ NEW METHOD
```

**Native integration requires:**
```
CURRENT: ECC P-256 ✅
```

---

## 🔧 **Fix Steps**

### **STEP 1: Rotate JWT Keys in Supabase (2 min)**

1. **Open:** https://app.supabase.com/project/gkrcaeymhgjepncbceag/settings/api

2. **Click "JWT Keys" tab** (you should see the screen from your screenshot)

3. **Click the green "Rotate keys" button**

4. **Confirm the rotation**

**Result:**
```
✅ ECC P-256 becomes CURRENT
✅ Legacy HS256 moves to STANDBY
✅ New tokens will use ECC P-256
```

---

### **STEP 2: Check Clerk for JWT Templates (3 min)**

This is critical! JWT templates are the **old deprecated method**.

1. **Open:** https://dashboard.clerk.com

2. **Select your application:** skilled-sawfish-5

3. **Navigate to:** "Configure" → "Sessions" → "JWT Templates"
   - Or search for "JWT Templates" in the dashboard

4. **Look for any templates** (especially one named "Supabase")

5. **If you see a Supabase JWT template:**
   - Click on it
   - **DELETE IT** or **ARCHIVE IT**

**Why?**
- JWT templates = OLD method (uses HS256 shared secret)
- Native integration = NEW method (uses ECC P-256, no templates)
- Having a template active prevents native integration from working

**What it might look like:**
```
JWT Templates:
  ┌─────────────────────────────┐
  │ Supabase                    │
  │ Status: Active              │ ← DELETE THIS
  │ Created: [date]             │
  └─────────────────────────────┘
```

---

### **STEP 3: Verify Native Integration in Clerk (2 min)**

1. **Stay in Clerk Dashboard**

2. **Navigate to:** "Integrations" → "Supabase"
   - Or look for "Integrations" in the sidebar

3. **Verify:**
   ```
   ✅ Status: Active/Connected
   ✅ Connected to: [Your Supabase project]
   ✅ No mention of JWT templates
   ```

4. **If you see "Configure" or "Setup" instead of "Active":**
   - Click it and follow the setup flow
   - This will properly activate the native integration

---

### **STEP 4: Clear Cache and Restart (1 min)**

```bash
# Stop your dev server (Ctrl+C)

# Clear Next.js cache
rm -rf .next

# Clear node modules cache (optional but recommended)
rm -rf node_modules/.cache

# Restart
npm run dev
```

---

### **STEP 5: Test with Fresh Signup (2 min)**

1. **Open incognito/private window:** http://localhost:3000

2. **Sign up with a NEW email address**

3. **Watch terminal logs - should see:**
   ```
   ✅ [Webhook] Company created
   ✅ [Webhook] User created successfully with company_id: xxx
   ✅ Updated Clerk metadata with role: company_admin
   ```

4. **Dashboard should load - check for:**
   ```
   ✅ No 500 errors
   ✅ User data displays
   ✅ No console errors
   ```

---

## 🔍 **How to Verify It's Working**

### **Check 1: JWT Algorithm**

After signing in:

1. **Open DevTools → Network tab**

2. **Refresh dashboard**

3. **Find request to:** `gkrcaeymhgjepncbceag.supabase.co/rest/v1/users`

4. **Copy the Authorization header** (starts with `Bearer eyJ...`)

5. **Paste at:** https://jwt.io

6. **Check the header:**
   ```json
   {
     "alg": "RS256",  ← Should be RS256 (ECC), not HS256 ✅
     "kid": "ins_...",
     "typ": "JWT"
   }
   ```

**If you see `"alg": "HS256"`** ❌
- JWT template is still active in Clerk
- Go back to Step 2 and delete it

**If you see `"alg": "RS256"` or `"alg": "ES256"`** ✅
- ECC P-256 is working!
- Native integration is active

---

### **Check 2: Clerk JWKS Endpoint**

Verify Clerk is publishing public keys:

```bash
curl https://skilled-sawfish-5.clerk.accounts.dev/.well-known/jwks.json
```

**Expected response:**
```json
{
  "keys": [
    {
      "use": "sig",
      "kty": "EC",       ← Elliptic Curve
      "kid": "ins_...",
      "crv": "P-256",    ← P-256 curve
      "alg": "ES256",
      "x": "...",
      "y": "..."
    }
  ]
}
```

**If this returns keys** ✅
- Clerk is properly configured for native integration

**If this fails** ❌
- JWT template might still be active
- Native integration not fully enabled

---

### **Check 3: Supabase JWT Validation**

After signing in, check Supabase logs:

1. **Go to:** https://app.supabase.com/project/gkrcaeymhgjepncbceag/logs/edge-logs

2. **Filter for:** "auth" or "jwt"

3. **Look for:**
   ```
   ✅ JWT validated successfully
   ❌ No "Invalid JWT" errors
   ❌ No "Invalid signature" errors
   ```

---

## 🎯 **Understanding the Issue**

### **Why Legacy HS256 Doesn't Work:**

```
Clerk (with JWT template):
  ↓ Signs JWT with HS256 using shared secret
  ↓ Sends to browser
  ↓
Browser:
  ↓ Sends JWT to Supabase with Authorization header
  ↓
Supabase (native integration enabled):
  ↓ Expects ECC P-256 signed JWT
  ↓ Tries to fetch public key from JWKS endpoint
  ↓ JWT has HS256 signature (not ECC)
  ↓ Validation FAILS ❌
  ↓ Returns 500 error
```

### **Why ECC P-256 Works:**

```
Clerk (native integration):
  ↓ Signs JWT with ECC P-256 private key
  ↓ Publishes public key at JWKS endpoint
  ↓ Sends JWT to browser
  ↓
Browser:
  ↓ Sends JWT to Supabase with Authorization header
  ↓
Supabase (native integration):
  ↓ Expects ECC P-256 signed JWT ✅
  ↓ Fetches public key from JWKS endpoint ✅
  ↓ Validates JWT signature ✅
  ↓ Extracts claims (sub = clerk_id) ✅
  ↓ RLS uses auth.jwt() ->> 'sub' ✅
  ↓ Returns user data successfully ✅
```

---

## 📋 **Quick Checklist**

- [ ] Rotate JWT keys in Supabase (ECC P-256 → CURRENT)
- [ ] Delete JWT templates in Clerk dashboard
- [ ] Verify native integration is active in Clerk
- [ ] Clear .next cache and restart server
- [ ] Test fresh signup
- [ ] Verify JWT uses RS256 algorithm
- [ ] Check JWKS endpoint returns keys
- [ ] Confirm dashboard loads without errors

---

## 🚨 **Common Issues**

### **Issue: Still seeing HS256 after rotation**

**Cause:** JWT template is still active in Clerk

**Fix:**
1. Go to Clerk dashboard
2. Find JWT Templates section
3. Delete ALL templates (especially Supabase)
4. Restart dev server
5. Test again

---

### **Issue: Can't find JWT Templates in Clerk**

**Possible locations:**
- Configure → Sessions → JWT Templates
- Configure → Sessions → Customize session token
- Settings → Sessions
- Integrations → Supabase (might have a JWT tab)

**If you can't find it:**
- The template might not exist (good!)
- Try testing anyway after rotating keys

---

### **Issue: Rotation didn't work**

**Checklist:**
1. Did you click "Rotate keys" in Supabase? ✅
2. Did you wait for rotation to complete? ✅
3. Did you restart dev server? ✅
4. Did you clear browser cache? ✅
5. Did you delete JWT templates in Clerk? ✅

**If still not working:**
- Check if there are multiple Supabase projects linked in Clerk
- Verify you're testing with the right project
- Check Clerk and Supabase dashboard for any error messages

---

## ⚡ **TL;DR**

```
1. Supabase → Settings → API → JWT Keys → Rotate keys (ECC P-256 → CURRENT)
2. Clerk → JWT Templates → Delete any Supabase template
3. rm -rf .next && npm run dev
4. Test fresh signup
5. Should work! 🎉
```

---

**Your domain configuration is perfect. Your code is perfect. You just need to switch from Legacy HS256 to ECC P-256 for the native integration to work!** 🚀
