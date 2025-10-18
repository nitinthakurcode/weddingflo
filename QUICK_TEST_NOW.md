# ⚡ Quick Test - ECC P-256 Now Active

**Time:** 5 minutes
**Status:** Ready to test!

---

## ✅ **What's Done**

1. **JWT Keys Rotated** ✅
   - ECC P-256 is now CURRENT
   - Legacy HS256 moved to standby

2. **Code is Correct** ✅
   - No changes needed
   - Already using native integration pattern

3. **Domain Configured** ✅
   - https://skilled-sawfish-5.clerk.accounts.dev
   - Auto-managed, correct format

---

## ⚡ **Do This Now (5 min)**

### **1. Check Clerk for JWT Templates (2 min)**

1. Open: https://dashboard.clerk.com
2. Go to: Configure → Sessions → JWT Templates (or search "JWT Templates")
3. If you see any templates (especially "Supabase"): **DELETE THEM**
4. Should show: "No templates configured" ✅

---

### **2. Clear Cache and Restart (1 min)**

```bash
rm -rf .next
npm run dev
```

---

### **3. Test Fresh Signup (2 min)**

1. Open **incognito window:** http://localhost:3000
2. **Sign up** with NEW email
3. **Watch terminal** for:
   ```
   ✅ [Webhook] Company created
   ✅ [Webhook] User created successfully
   ```
4. **Dashboard should load** - No 500 errors!

---

## ✅ **Success Indicators**

- [ ] Webhook creates company + user
- [ ] Dashboard loads without errors
- [ ] No 500 errors in console
- [ ] User data displays correctly

---

## 🔍 **Verify JWT is ES256 (Optional)**

1. After signup, open DevTools → Network
2. Find Supabase request
3. Copy Authorization header
4. Decode at https://jwt.io
5. Check header shows: `"alg": "ES256"` ✅

---

## 🎉 **That's It!**

If webhook succeeds and dashboard loads → **You're done!** 🚀

---

**Read `ECC_P256_SETUP_COMPLETE.md` for full details.**
