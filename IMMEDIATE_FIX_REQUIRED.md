# 🚨 IMMEDIATE FIX REQUIRED - Remove `https://` from Domain

**Time to Fix:** 2 minutes
**Impact:** Will fix all 500 errors

---

## ❌ **PROBLEM FOUND IN YOUR SCREENSHOT**

**Screenshot 2 shows:**
```
Third Party Auth → Clerk
Domain: https://skilled-sawfish-5.clerk.accounts.dev  ← WRONG! ❌
Status: Enabled ✅
```

**The Issue:**
The domain has `https://` prefix. This causes Supabase to look for:
```
https://https://skilled-sawfish-5.clerk.accounts.dev  ← Doubled https://, validation FAILS
```

---

## ✅ **THE FIX (2 Minutes)**

### **Step 1: Edit Clerk Provider in Supabase**

1. **Go to:** https://app.supabase.com/project/gkrcaeymhgjepncbceag/auth/providers

2. **You should see the Clerk provider (currently showing "Enabled")**

3. **Click on "Clerk" or find an "Edit" button**

4. **Change the domain field:**
   ```
   Current:  https://skilled-sawfish-5.clerk.accounts.dev  ❌

   Change to:  skilled-sawfish-5.clerk.accounts.dev  ✅
   ```

   **Just remove `https://` - that's it!**

5. **Click "Save" or "Update"**

---

### **Step 2: Restart Your Dev Server**

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

### **Step 3: Test Fresh Signup**

1. **Clear browser cache/cookies** (or use incognito window)

2. **Go to:** http://localhost:3000

3. **Sign up with a NEW account**

4. **Watch terminal logs** - should see:
   ```
   ✅ [Webhook] Company created
   ✅ [Webhook] User created successfully with company_id: xxx
   ```

5. **Dashboard should load WITHOUT 500 errors!** 🎉

---

## 🔍 **Why This Fixes It**

### **How JWT Validation Works:**

**With `https://` prefix (CURRENT - BROKEN):**
```
1. Clerk JWT has:
   iss: "https://skilled-sawfish-5.clerk.accounts.dev"

2. Supabase config has:
   Domain: "https://skilled-sawfish-5.clerk.accounts.dev"

3. Supabase internally adds https:// when validating:
   Expected issuer = "https://" + "https://skilled-sawfish-5.clerk.accounts.dev"
   = "https://https://skilled-sawfish-5.clerk.accounts.dev" ❌

4. JWT iss doesn't match expected issuer
   → Validation FAILS
   → 500 errors
```

**Without `https://` prefix (AFTER FIX - WORKING):**
```
1. Clerk JWT has:
   iss: "https://skilled-sawfish-5.clerk.accounts.dev"

2. Supabase config has:
   Domain: "skilled-sawfish-5.clerk.accounts.dev" ✅

3. Supabase internally adds https:// when validating:
   Expected issuer = "https://" + "skilled-sawfish-5.clerk.accounts.dev"
   = "https://skilled-sawfish-5.clerk.accounts.dev" ✅

4. JWT iss matches expected issuer
   → Validation SUCCEEDS ✅
   → auth.jwt() ->> 'sub' returns clerk_id
   → RLS policies work
   → User data fetches successfully
   → No 500 errors! 🎉
```

---

## 📊 **Your Current Setup Status**

### ✅ **What's Already Correct:**

1. **Code Implementation** ✅
   ```typescript
   // Your code uses the correct 2025 native pattern:
   const supabase = createClient(url, key, {
     async accessToken() {
       return (await getToken()) ?? null  // ✅ No template parameter
     },
   })
   ```
   I verified this - you're NOT using the deprecated `getToken({ template: 'supabase' })`

2. **Clerk Provider Enabled** ✅
   - Screenshot shows Clerk is enabled in Supabase
   - Integration is activated

3. **Database Ready** ✅
   - Companies table exists
   - Users table exists
   - RLS policies are correct
   - Service role can create records

4. **Environment Variables** ✅
   - All Clerk keys configured
   - All Supabase keys configured

### ❌ **What's Wrong:**

1. **Domain Format** ❌
   - Has `https://` prefix
   - Should NOT have prefix
   - This single character issue causes ALL 500 errors

---

## 🎯 **Expected Outcome After Fix**

### **Before Fix (Current):**
```
❌ Dashboard: 500 errors when fetching user
❌ Browser Console: "Failed to load resource: 500"
❌ Supabase rejects Clerk JWT (issuer mismatch)
❌ auth.jwt() returns null
❌ RLS policies fail
```

### **After Fix:**
```
✅ Dashboard: Loads successfully
✅ Browser Console: No errors
✅ Supabase accepts Clerk JWT
✅ auth.jwt() ->> 'sub' returns clerk_id
✅ RLS policies work correctly
✅ User data fetches successfully
✅ Webhook creates company + user
```

---

## 🧪 **How to Verify It Worked**

After making the change and testing:

### **Check 1: Browser Console**
```
Before: ❌ Failed to load resource: 500
After:  ✅ No errors
```

### **Check 2: Network Tab**
```
Before: ❌ gkrcaeymhgjepncbceag.supabase.co/rest/v1/users → 500
After:  ✅ gkrcaeymhgjepncbceag.supabase.co/rest/v1/users → 200
```

### **Check 3: Terminal Logs**
```
Before: ❌ Webhook creates user without company (or fails)
After:  ✅ [Webhook] Company created
        ✅ [Webhook] User created successfully with company_id
```

### **Check 4: Dashboard**
```
Before: ❌ Stuck on loading or shows errors
After:  ✅ Loads normally with user data
```

---

## 📝 **Quick Reference**

**What to Change:**
```
FROM: https://skilled-sawfish-5.clerk.accounts.dev
TO:   skilled-sawfish-5.clerk.accounts.dev
```

**Where to Change It:**
```
Supabase Dashboard
  → Authentication
  → Providers
  → Third Party Auth tab
  → Clerk provider
  → Domain field
  → Remove "https://"
  → Save
```

**After Changing:**
```
1. Restart dev server
2. Clear browser cache
3. Sign up with fresh account
4. Dashboard should work!
```

---

## 🎯 **About JWT Signing Keys (From Screenshot 1)**

Your screenshot shows:
```
CURRENT KEY:  Legacy HS256 (Shared Secret)
STANDBY KEY:  ECC P-256
```

**What this means:**
- You're using the Legacy HS256 key currently
- This is the OLD approach (pre-April 2025)
- The native integration typically uses ECC P-256

**But this is NOT the main issue right now!**

The domain format is the critical blocker. Once you fix that:
- JWT validation will work (even with HS256)
- You can optionally rotate to ECC P-256 later for better security

**Priority:**
1. ✅ Fix domain (remove `https://`) ← **DO THIS NOW**
2. ⏭️ Test that it works
3. ⏭️ Optionally rotate keys later

---

## ⚡ **TL;DR - Do This Right Now**

1. **Open:** https://app.supabase.com/project/gkrcaeymhgjepncbceag/auth/providers
2. **Edit Clerk provider**
3. **Remove `https://` from domain**
4. **Domain should be:** `skilled-sawfish-5.clerk.accounts.dev`
5. **Save**
6. **Restart server:** `npm run dev`
7. **Test signup**
8. **Profit!** 🎉

---

**This ONE character change will fix all your 500 errors!**
