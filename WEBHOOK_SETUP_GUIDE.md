# 🔗 Clerk Webhook Setup Guide - WeddingFlow Pro
**Critical:** Users NOT syncing to Supabase? Follow this guide!

---

## 🚨 PROBLEM

**Symptom:** User is created in Clerk dashboard but NOT in Supabase `users` table

**Root Cause:** Clerk webhook is not configured to call your backend

---

## ✅ SOLUTION: Configure Clerk Webhook

### **Step 1: Get Your Webhook URL**

#### **For Local Development (with ngrok):**
```
https://delilah-uncaptious-distinguishedly.ngrok-free.dev/api/webhooks/clerk
```

#### **For Production:**
```
https://yourdomain.com/api/webhooks/clerk
```

---

### **Step 2: Configure in Clerk Dashboard**

1. **Go to:** https://dashboard.clerk.com/

2. **Navigate to:**
   - Your Application → Webhooks → Add Endpoint

3. **Enter Webhook URL:**
   ```
   https://delilah-uncaptious-distinguishedly.ngrok-free.dev/api/webhooks/clerk
   ```

4. **Subscribe to Events:**
   - ✅ `user.created` (REQUIRED)
   - ✅ `user.updated` (REQUIRED)
   - ✅ `user.deleted` (RECOMMENDED)

5. **Copy the Signing Secret**
   - Clerk will show you a secret like: `whsec_xxxxxxxxxxxxx`

6. **Add to `.env.local`:**
   ```env
   CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

7. **Restart your dev server:**
   ```bash
   # Kill current server
   lsof -ti:3000 | xargs kill -9

   # Restart
   npm run dev
   ```

---

### **Step 3: Test the Webhook**

#### **Option A: Use Clerk Dashboard Test**

1. In Clerk dashboard → Webhooks → Your endpoint
2. Click "Send Test Event"
3. Select `user.created`
4. Check your terminal for logs:
   ```
   ✅ User synced successfully: { id: 'user_xxx', email: 'test@example.com', role: 'company_admin' }
   ```

#### **Option B: Create a Real Test User**

1. Sign up with a test email: http://localhost:3000/en/sign-up
2. Check terminal logs for webhook processing
3. Check Supabase → Table Editor → `users` table
4. Verify user was created

---

## 🔍 VERIFICATION CHECKLIST

### **Check 1: Webhook is Accessible**
```bash
curl -X GET https://delilah-uncaptious-distinguishedly.ngrok-free.dev/api/webhooks/clerk
```
**Expected:** `405 Method Not Allowed` (this is correct - it only accepts POST)

### **Check 2: Webhook Secret is Set**
```bash
grep CLERK_WEBHOOK_SECRET .env.local
```
**Expected:** `CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx`

### **Check 3: User Created in Clerk**
- Go to: https://dashboard.clerk.com/ → Users
- Verify user exists

### **Check 4: User Created in Supabase**
- Go to: https://supabase.com/dashboard/project/gkrcaeymhgjepncbceag/editor
- Check `users` table
- Verify user with matching `clerk_id` exists

---

## 🐛 DEBUGGING

### **Problem: Webhook Not Being Called**

**Check ngrok is running:**
```bash
curl -s http://localhost:4040/api/tunnels | grep public_url
```

**Should show:**
```json
"public_url":"https://delilah-uncaptious-distinguishedly.ngrok-free.dev"
```

**Update Clerk webhook URL if ngrok URL changed!**

---

### **Problem: Webhook Returns Error**

**Check logs in terminal:**
```bash
# Look for these log patterns:
❌ Missing svix headers
❌ Error verifying webhook signature
❌ Error creating user in Supabase
✅ User synced successfully
```

**Common Errors:**

1. **"Error verifying webhook signature"**
   - Webhook secret mismatch
   - Update CLERK_WEBHOOK_SECRET in .env.local
   - Restart dev server

2. **"Error creating user in Supabase"**
   - RLS policy issue
   - Check Supabase table permissions
   - Verify SUPABASE_SECRET_KEY is set

3. **"Failed to create company for user"**
   - Company creation failed
   - Check `companies` table RLS policies
   - Verify foreign key constraints

---

### **Problem: User in Clerk but NOT in Supabase**

**Step-by-step fix:**

1. **Delete the user from Clerk dashboard**
   - Users → Find user → Delete

2. **Verify webhook is configured correctly**
   - Check webhook URL includes /api/webhooks/clerk
   - Verify webhook secret matches

3. **Create new test user**
   - Sign up again
   - Watch terminal for webhook logs

4. **Check Supabase users table**
   - Should see new user immediately

---

## 📊 WEBHOOK FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│              CLERK → SUPABASE WEBHOOK SYNC              │
└─────────────────────────────────────────────────────────┘

1. User Signs Up
   ↓
   http://localhost:3000/en/sign-up

2. Clerk Creates User
   ↓
   User saved in Clerk database

3. Clerk Calls Your Webhook (POST)
   ↓
   https://your-ngrok-url/api/webhooks/clerk
   └─ Headers: svix-id, svix-timestamp, svix-signature
   └─ Body: { type: "user.created", data: {...} }

4. Your API Verifies Signature
   ↓
   Using CLERK_WEBHOOK_SECRET

5. Extract User Data
   ↓
   { id, email, first_name, last_name, image_url }

6. Determine Role
   ↓
   If email === SUPER_ADMIN_EMAIL:
      role = "super_admin"
   Else:
      role = "company_admin"

7. Create/Find Company
   ↓
   Super Admin: Find "platform" company
   Regular User: Create new company

8. Create User in Supabase
   ↓
   INSERT INTO users (clerk_id, email, role, company_id, ...)

9. Update Clerk Metadata
   ↓
   publicMetadata: { role, company_id, onboarding_completed: false }

10. Return Success
    ↓
    200 OK

11. User Redirected
    ↓
    /en/onboard (if first time)
    /en/dashboard (if onboarded)
```

---

## 🔐 SECURITY NOTES

### **Webhook Signature Verification**

Your webhook validates requests using Svix signatures:

```typescript
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');
evt = wh.verify(body, {
  'svix-id': svix_id,
  'svix-timestamp': svix_timestamp,
  'svix-signature': svix_signature,
});
```

**This ensures:**
- ✅ Request came from Clerk
- ✅ Payload wasn't tampered with
- ✅ Request is recent (timestamp check)
- ✅ Protects against replay attacks

### **Admin Client Usage**

The webhook uses `createServerSupabaseAdminClient()` to:
- ✅ Bypass RLS (needed to create users)
- ✅ Set initial company_id and role
- ✅ Guarantee data consistency

**DO NOT** expose this client to frontend code!

---

## 📝 CURRENT CONFIGURATION

### **Environment Variables:**
```env
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c2tpbGxlZC1zYXdmaXNoLTUuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_VXJOvNkwzVq8mTCqlAt7MM8X5h5CZNQJkP2TGGjsv2
CLERK_WEBHOOK_SECRET=whsec_rH90gB+6LwqWdDfZ+GtJO5/fXvhlaD0V
SUPER_ADMIN_EMAIL=nitinthakurcode@gmail.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://gkrcaeymhgjepncbceag.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_9H14HZConl_X4GbCpn084Q_yuS8Ycvq
SUPABASE_SECRET_KEY=sb_secret_tWU6SdCF5GPDZ5d3SOtnAA_jQKiVvG2
```

### **Webhook Endpoints:**

**Local (ngrok):**
```
https://delilah-uncaptious-distinguishedly.ngrok-free.dev/api/webhooks/clerk
```

**Production:**
```
https://yourdomain.com/api/webhooks/clerk
```

---

## 🧪 TESTING COMMANDS

### **Test Webhook Accessibility:**
```bash
curl -X GET https://delilah-uncaptious-distinguishedly.ngrok-free.dev/api/webhooks/clerk
```
Expected: 405 Method Not Allowed

### **Check ngrok Status:**
```bash
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"'
```

### **View ngrok Requests:**
Open: http://localhost:4040

### **Check Supabase Users:**
```bash
# Using Supabase CLI (if installed)
supabase db execute "SELECT clerk_id, email, role, company_id FROM users;" --project-ref gkrcaeymhgjepncbceag
```

---

## 🚀 QUICK FIX CHECKLIST

If users aren't syncing:

- [ ] **ngrok is running** (`curl http://localhost:4040`)
- [ ] **Dev server is running** (`curl http://localhost:3000`)
- [ ] **Webhook URL configured in Clerk dashboard**
- [ ] **Webhook secret matches** (CLERK_WEBHOOK_SECRET)
- [ ] **Events subscribed:** user.created, user.updated
- [ ] **Test with new sign-up** (not existing user)
- [ ] **Check terminal logs** for errors
- [ ] **Check ngrok inspector** (http://localhost:4040)
- [ ] **Verify Supabase users table** has RLS policies

---

## 📞 SUPPORT RESOURCES

- **Clerk Webhooks Docs:** https://clerk.com/docs/integrations/webhooks
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **ngrok Docs:** https://ngrok.com/docs

---

**🎯 Next Steps:**

1. Configure webhook URL in Clerk dashboard
2. Add webhook secret to .env.local
3. Restart dev server
4. Create test user
5. Verify sync works!

**Status:** Ready to configure ✅
