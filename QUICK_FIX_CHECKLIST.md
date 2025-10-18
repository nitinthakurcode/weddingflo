# ⚡ QUICK FIX CHECKLIST - 500 Error Resolution

**Time Required:** ~12 minutes
**Issue:** Supabase 500 errors when fetching user data
**Root Cause:** Native Clerk + Supabase integration not activated in dashboards

---

## ✅ Step 1: Activate in Clerk Dashboard (5 min)

1. Open: **https://dashboard.clerk.com**
2. Select your application
3. Go to **"Integrations"** section
4. Find **"Supabase"** integration
5. Click **"Activate Supabase integration"**
6. **Copy the Clerk domain** that appears (e.g., `app-123.clerk.accounts.dev`)

---

## ✅ Step 2: Add Provider in Supabase Dashboard (5 min)

1. Open: **https://app.supabase.com/project/gkrcaeymhgjepncbceag/auth/providers**
2. Click **"Add provider"** or **"Third Party Auth"**
3. Select **"Clerk"** from the list
4. **Paste your Clerk domain** (from Step 1)
5. Click **"Save"** or **"Enable"**

---

## ✅ Step 3: Test the Fix (2 min)

1. **Restart your dev server:**
   ```bash
   # Ctrl+C to stop
   npm run dev
   ```

2. **Sign up with a new account** (or re-login)

3. **Check terminal logs - should see:**
   ```
   ✅ [Webhook] Company created
   ✅ [Webhook] User created successfully with company_id: xxx
   ```

4. **Dashboard should load without 500 errors!** 🎉

---

## 🐛 If Still Not Working

Run diagnostics:

```bash
# Test Supabase connection
npx tsx scripts/test-supabase-connection.ts

# Clean up broken user data
npx tsx scripts/cleanup-current-user.ts
```

Check both dashboards:
- [ ] Clerk shows "Supabase: Active" ✅
- [ ] Supabase shows "Clerk" in auth providers list ✅

---

## 📖 Full Documentation

See `CLERK_SUPABASE_2025_NATIVE_INTEGRATION.md` for:
- Complete architecture explanation
- Detailed troubleshooting
- Code examples
- Official resources

---

**That's it!** Just activate the integration in both dashboards and your 500 errors will be gone. 🚀
