# 🔐 WeddingFlow Pro - Login Guide
**Generated:** 2025-11-18
**Environment:** Development (localhost:3000)

---

## 📋 AVAILABLE LOGIN OPTIONS

Your app has **THREE** different login portals, each for different user types:

---

## 1️⃣ **SUPERADMIN LOGIN** (App Manufacturer/Owner)

### 🎯 **Who is this for?**
- **You** (Nitin) - The app manufacturer/owner
- Platform administrators
- System-level access
- Manage all companies and users

### 🌐 **Login URL:**
```
http://localhost:3000/en/superadmin/sign-in
```

### 👤 **Your Credentials:**
```
Email: nitinthakurcode@gmail.com
Password: [Your Clerk password]
```

### 🔑 **What you get access to:**
- **Superadmin Dashboard:** http://localhost:3000/en/superadmin/dashboard
- **All Companies:** http://localhost:3000/en/superadmin/companies
- View/manage all organizations
- System-wide analytics
- Platform administration

### 🎨 **Visual Identifier:**
- Dark theme (slate/indigo background)
- Red shield icon
- "Restricted Access" warning

### ⚙️ **Configuration:**
```env
SUPER_ADMIN_EMAIL=nitinthakurcode@gmail.com
```

### 📍 **Redirect After Login:**
→ `/en/superadmin/dashboard`

---

## 2️⃣ **USER LOGIN** (Wedding Planners/Companies)

### 🎯 **Who is this for?**
- Wedding planning companies that **purchased your service**
- Professional wedding planners
- Event management businesses
- Company owners/team members

### 🌐 **Login URL:**
```
http://localhost:3000/en/sign-in
```

### 👤 **Test Account:**
```
Create a new account via Sign Up
OR
Use existing test accounts from your Clerk dashboard
```

### 🔑 **What they get access to:**
- **Main Dashboard:** http://localhost:3000/en/dashboard
- **Client Management:** Manage their wedding clients
- **Guest Lists:** Track guests, RSVPs
- **Budget Tracking:** Financial management
- **Vendor Management:** Vendor relationships
- **Timeline/Tasks:** Event planning
- **Documents:** File management
- **Team Management:** Add team members
- **Settings:** Company settings, billing, etc.

### 🎨 **Visual Identifier:**
- Light theme (primary/pink/purple gradient)
- Building icon
- "WeddingFlow Pro" branding

### 📍 **Redirect After Login:**
→ `/en/onboard` (if first time)
→ `/en/dashboard` (if onboarded)

### 💼 **Business Model:**
These are your **paying customers** who:
- Subscribe to monthly/annual plans (Stripe)
- Get their own company workspace
- Manage multiple wedding clients
- Isolated data (multi-tenant via company_id)

---

## 3️⃣ **PORTAL LOGIN** (Wedding Couples/Guests)

### 🎯 **Who is this for?**
- Wedding couples (bride & groom)
- Guests of the wedding
- End clients of the wedding planners
- Read-only or limited access

### 🌐 **Login URL:**
```
http://localhost:3000/en/portal/sign-in
```

### 👤 **How they get access:**
- Created by wedding planners (User Login accounts)
- Invited via email with credentials
- Limited permissions (can't see billing, etc.)

### 🔑 **What they get access to:**
- **Portal Dashboard:** http://localhost:3000/en/portal
- **Wedding Info:** View their wedding details
- **Chat:** Communicate with planner
- **Guest Info:** View guest list (if allowed)
- **Timeline:** See event schedule
- **RSVP:** Respond to invitations

### 🎨 **Visual Identifier:**
- Simplified interface
- Guest-friendly design
- Mobile-optimized

### 📍 **Redirect After Login:**
→ `/en/portal`

---

## 🔍 WHICH LOGIN SHOULD YOU USE?

### **Right Now (For Testing):**

Use **SUPERADMIN LOGIN** because:
- ✅ You are the app manufacturer
- ✅ You need full system access
- ✅ You want to see all features
- ✅ You're testing the platform

**Login Here:** http://localhost:3000/en/superadmin/sign-in
**Email:** nitinthakurcode@gmail.com

---

### **For Testing Company Features:**

Use **USER LOGIN** to test:
- ✅ Customer experience (wedding planner view)
- ✅ Multi-tenant isolation
- ✅ Subscription/billing features
- ✅ Client management workflow

**Create Test Account:** http://localhost:3000/en/sign-up
**Then Login:** http://localhost:3000/en/sign-in

---

### **For Testing End-Client Features:**

Use **PORTAL LOGIN** to test:
- ✅ Wedding couple experience
- ✅ Guest RSVP flow
- ✅ Mobile responsiveness
- ✅ Client communication

**Create via Dashboard:** After logging in as User, create a client
**Then Login:** http://localhost:3000/en/portal/sign-in

---

## 📊 AUTHENTICATION FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│              WEDDINGFLOW PRO LOGIN ARCHITECTURE         │
└─────────────────────────────────────────────────────────┘

1. SUPERADMIN (You - App Owner)
   ↓
   /en/superadmin/sign-in
   ↓
   nitinthakurcode@gmail.com
   ↓
   /en/superadmin/dashboard
   └─ View ALL companies
   └─ System administration
   └─ Platform-wide analytics

2. USER (Wedding Planners - Paying Customers)
   ↓
   /en/sign-in
   ↓
   Create account OR use existing
   ↓
   /en/onboard (first time)
   ↓
   /en/dashboard
   └─ Manage their clients
   └─ Company workspace
   └─ Team collaboration
   └─ Billing/subscription

3. PORTAL (Wedding Couples/Guests - End Clients)
   ↓
   /en/portal/sign-in
   ↓
   Credentials provided by planner
   ↓
   /en/portal
   └─ View wedding info
   └─ Chat with planner
   └─ RSVP management
```

---

## 🔐 ROLE-BASED ACCESS CONTROL (RLS)

### **Database Security:**

All users share the same Supabase database but:
- ✅ **Superadmin:** Bypasses RLS (uses service role key)
- ✅ **User (Planner):** Sees only their `company_id` data
- ✅ **Portal (Client):** Sees only their specific wedding data

### **Session Claims:**
```typescript
// Stored in JWT token (fast, no DB query)
{
  userId: "clerk_user_id",
  role: "superadmin" | "admin" | "member" | "client",
  company_id: "uuid" // For multi-tenant isolation
}
```

---

## 🧪 TESTING CHECKLIST

### **Test Superadmin Login:**
- [ ] Go to: http://localhost:3000/en/superadmin/sign-in
- [ ] Login with: nitinthakurcode@gmail.com
- [ ] Verify redirect to: /en/superadmin/dashboard
- [ ] Check you can see "All Companies" section
- [ ] Verify system-wide access

### **Test User Login:**
- [ ] Go to: http://localhost:3000/en/sign-up
- [ ] Create a new wedding planner account
- [ ] Complete onboarding flow
- [ ] Verify redirect to: /en/dashboard
- [ ] Create a test client (wedding couple)
- [ ] Add guests, budget items, vendors

### **Test Portal Login:**
- [ ] While logged in as User, create a client
- [ ] Get portal credentials for that client
- [ ] Logout from User account
- [ ] Go to: http://localhost:3000/en/portal/sign-in
- [ ] Login with portal credentials
- [ ] Verify limited access (no billing, team, etc.)

---

## 🆘 TROUBLESHOOTING

### **Can't login as Superadmin?**
1. Check Clerk dashboard for user existence
2. Verify email matches: `nitinthakurcode@gmail.com`
3. Check `.env.local` has `SUPER_ADMIN_EMAIL` set
4. Try password reset if needed

### **Can't create User account?**
1. Check Clerk configuration allows sign-ups
2. Verify email isn't already registered
3. Check Clerk webhook is working (user sync)
4. Look for errors in browser console

### **Portal login not working?**
1. Verify client was created properly in dashboard
2. Check portal credentials were generated
3. Ensure client has an associated user account
4. Check RLS policies allow portal access

---

## 🔑 CLERK CONFIGURATION

### **Current Setup:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c2tpbGxlZC1zYXdmaXNoLTUuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_VXJOvNkwzVq8mTCqlAt7MM8X5h5CZNQJkP2TGGjsv2
```

### **Sign In URLs:**
- User: `/en/sign-in`
- Superadmin: `/en/superadmin/sign-in`
- Portal: `/en/portal/sign-in`

### **Webhooks:**
- User sync: `/api/webhooks/clerk`
- Session claims updated on user creation/update

---

## 📱 QUICK ACCESS LINKS

### **For You (Development):**

**Superadmin Access:**
- Login: http://localhost:3000/en/superadmin/sign-in
- Dashboard: http://localhost:3000/en/superadmin/dashboard

**Test as Wedding Planner:**
- Sign Up: http://localhost:3000/en/sign-up
- Login: http://localhost:3000/en/sign-in
- Dashboard: http://localhost:3000/en/dashboard

**Test as Wedding Couple:**
- Portal Login: http://localhost:3000/en/portal/sign-in
- Portal Dashboard: http://localhost:3000/en/portal

---

## 💡 RECOMMENDED TESTING ORDER

1. **Start with Superadmin** (Your main account)
   - http://localhost:3000/en/superadmin/sign-in
   - Email: nitinthakurcode@gmail.com
   - Explore system-wide features

2. **Create a Test Company** (Wedding Planner)
   - http://localhost:3000/en/sign-up
   - Create new account
   - Complete onboarding
   - Add test clients

3. **Test Portal Access** (Wedding Couple)
   - Create client in dashboard
   - Get portal credentials
   - Login to portal
   - Test limited access

---

## 🎯 CURRENT STATUS

**All three login portals are WORKING:**
- ✅ Superadmin Login: `http://localhost:3000/en/superadmin/sign-in` (200 OK)
- ✅ User Login: `http://localhost:3000/en/sign-in` (200 OK)
- ✅ Portal Login: `http://localhost:3000/en/portal/sign-in` (200 OK)

**Your Superadmin Account:**
- Email: nitinthakurcode@gmail.com
- Status: ✅ Configured
- Access Level: Full System Access

---

**🚀 Ready to Login!**
Start here: http://localhost:3000/en/superadmin/sign-in
