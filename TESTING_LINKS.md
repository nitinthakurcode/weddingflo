# WeddingFlow Pro - Testing Links & Access Guide
**Generated:** 2025-11-18 at 15:16 IST
**Status:** ✅ All Services Running

---

## 🌐 Access URLs

### Local Development
```
http://localhost:3000
```
- **Use for:** Fast development and debugging
- **Network Access:** http://192.168.29.127:3000 (from other devices on your network)

### Public ngrok URL
```
https://delilah-uncaptious-distinguishedly.ngrok-free.dev
```
- **Use for:** Testing from external devices, webhooks, mobile devices
- **Note:** This URL is temporary and will change when ngrok restarts
- **ngrok Dashboard:** http://localhost:4040

---

## 🚀 Quick Access Links

### Main Application Routes

#### Authentication & Onboarding
- **Sign In:** http://localhost:3000/en/sign-in
- **Sign Up:** http://localhost:3000/en/sign-up
- **Onboarding:** http://localhost:3000/en/onboard
- **Superadmin Login:** http://localhost:3000/en/superadmin/sign-in

#### Dashboard (After Login)
- **Main Dashboard:** http://localhost:3000/en/dashboard
- **Client List:** http://localhost:3000/en/dashboard/clients
- **Messages:** http://localhost:3000/en/messages

#### Settings
- **Profile:** http://localhost:3000/en/settings/profile
- **Company:** http://localhost:3000/en/settings/company
- **Team:** http://localhost:3000/en/settings/team
- **Billing:** http://localhost:3000/en/settings/billing
- **Preferences:** http://localhost:3000/en/settings/preferences
- **Integrations:** http://localhost:3000/en/settings/integrations
- **AI Config:** http://localhost:3000/en/settings/ai-config
- **Branding:** http://localhost:3000/en/settings/branding

#### Client Portal (Guest Access)
- **Portal Dashboard:** http://localhost:3000/en/portal
- **Portal Sign In:** http://localhost:3000/en/portal/sign-in
- **Wedding Info:** http://localhost:3000/en/portal/wedding
- **Chat:** http://localhost:3000/en/portal/chat

#### Superadmin Panel
- **Superadmin Dashboard:** http://localhost:3000/en/superadmin
- **Companies:** http://localhost:3000/en/superadmin/companies

---

## 🔗 ngrok Public URLs (For External Testing)

Replace `localhost:3000` with `https://delilah-uncaptious-distinguishedly.ngrok-free.dev`:

- **Sign In:** https://delilah-uncaptious-distinguishedly.ngrok-free.dev/en/sign-in
- **Dashboard:** https://delilah-uncaptious-distinguishedly.ngrok-free.dev/en/dashboard
- **Portal:** https://delilah-uncaptious-distinguishedly.ngrok-free.dev/en/portal

**Note:** ngrok shows an interstitial page on first visit. Click "Visit Site" to continue.

---

## 🧪 Testing Scenarios

### 1. New User Registration Flow
1. Go to: http://localhost:3000/en/sign-up
2. Create new account
3. Complete onboarding: http://localhost:3000/en/onboard
4. Land on dashboard: http://localhost:3000/en/dashboard

### 2. Existing User Login
1. Go to: http://localhost:3000/en/sign-in
2. Login with test credentials:
   - **Email:** nitinthakurcode@gmail.com (Superadmin)
3. Should redirect to dashboard

### 3. Client Management
1. Login to dashboard
2. Click "Clients" or go to: http://localhost:3000/en/dashboard/clients
3. Create a new client (wedding couple)
4. Access client-specific features:
   - Guests: `/en/dashboard/clients/[clientId]/guests`
   - Budget: `/en/dashboard/clients/[clientId]/budget`
   - Timeline: `/en/dashboard/clients/[clientId]/timeline`
   - Vendors: `/en/dashboard/clients/[clientId]/vendors`
   - Events: `/en/dashboard/clients/[clientId]/events`
   - Hotels: `/en/dashboard/clients/[clientId]/hotels`
   - Gifts: `/en/dashboard/clients/[clientId]/gifts`
   - Documents: `/en/dashboard/clients/[clientId]/documents`
   - Creatives: `/en/dashboard/clients/[clientId]/creatives`

### 4. Multi-Language Testing
Test the i18n system with different locales:
- **English:** http://localhost:3000/en/dashboard
- **Spanish:** http://localhost:3000/es/dashboard
- **French:** http://localhost:3000/fr/dashboard
- **German:** http://localhost:3000/de/dashboard
- **Japanese:** http://localhost:3000/ja/dashboard
- **Chinese:** http://localhost:3000/zh/dashboard
- **Hindi:** http://localhost:3000/hi/dashboard

### 5. Portal Testing (Client/Guest Access)
1. Create a client in dashboard
2. Get portal credentials (generated for client)
3. Login to portal: http://localhost:3000/en/portal/sign-in
4. Test portal features:
   - Dashboard
   - Wedding info
   - Chat with planner

### 6. Webhook Testing (Use ngrok URL)
Configure webhooks in external services:

**Stripe Webhooks:**
```
https://delilah-uncaptious-distinguishedly.ngrok-free.dev/api/webhooks/stripe
```

**Resend Webhooks:**
```
https://delilah-uncaptious-distinguishedly.ngrok-free.dev/api/webhooks/resend
```

**Twilio Webhooks:**
```
https://delilah-uncaptious-distinguishedly.ngrok-free.dev/api/webhooks/twilio
```

**Clerk Webhooks:**
```
https://delilah-uncaptious-distinguishedly.ngrok-free.dev/api/webhooks/clerk
```

---

## 🔍 Monitoring & Debugging

### ngrok Inspector
- **URL:** http://localhost:4040
- **Features:**
  - View all HTTP requests
  - Replay requests
  - Inspect headers and payloads
  - Debug webhook calls

### Next.js Terminal Output
- Monitor the terminal where `npm run dev` is running
- Watch for errors, warnings, and compilation messages

### Browser DevTools
- Network tab: Check API calls to `/api/*` and tRPC endpoints
- Console: Check for client-side errors
- Application tab: Check localStorage, cookies, service workers

---

## 🔐 Test Credentials

### Superadmin Account
- **Email:** nitinthakurcode@gmail.com
- **Role:** Super Administrator
- **Access:** Full system access

### Test User Accounts
Create new test accounts via:
- http://localhost:3000/en/sign-up

---

## 📊 API Endpoints

### Health Check
```bash
curl http://localhost:3000/api/health
```

### tRPC API
- **Endpoint:** http://localhost:3000/api/trpc
- **Available routers:**
  - `users.*`
  - `clients.*`
  - `guests.*`
  - `vendors.*`
  - `budget.*`
  - `events.*`
  - `timeline.*`
  - `documents.*`
  - `hotels.*`
  - `gifts.*`
  - `messages.*`
  - `creatives.*`
  - `ai.*`
  - `stripe.*`
  - `qr.*`
  - `analyticsExport.*`

---

## 🛠️ Server Management

### Restart Development Server
```bash
# Stop server
lsof -ti:3000 | xargs kill -9

# Start server
npm run dev
```

### Restart ngrok
```bash
# Stop ngrok
pkill -f ngrok

# Start ngrok
ngrok http 3000
```

### View Server Logs
```bash
# Next.js logs: Check terminal where npm run dev is running
# ngrok logs: http://localhost:4040
```

---

## ⚙️ Environment Variables

All environment variables are loaded from `.env.local`:
- Supabase credentials ✅
- Clerk authentication ✅
- Stripe payments ✅
- OpenAI API ✅
- Resend email ✅
- Twilio SMS/WhatsApp ✅
- Firebase push notifications ✅
- Sentry error tracking ✅
- PostHog analytics ✅

---

## 📱 Mobile Testing

### On Same Network
Use your local network IP:
```
http://192.168.29.127:3000
```

### From Anywhere (ngrok)
Use the public ngrok URL:
```
https://delilah-uncaptious-distinguishedly.ngrok-free.dev
```

### Test PWA Features
1. Open the app on mobile browser
2. Install as PWA (Add to Home Screen)
3. Test offline functionality
4. Test push notifications

---

## 🎯 Feature Testing Checklist

### Core Features
- [ ] User authentication (sign up, sign in, sign out)
- [ ] Onboarding flow
- [ ] Client creation and management
- [ ] Guest list management
- [ ] Budget tracking
- [ ] Vendor directory
- [ ] Event scheduling
- [ ] Timeline/task management
- [ ] Document uploads
- [ ] Hotel accommodations
- [ ] Gift registry
- [ ] Floor plans & seating
- [ ] Wedding websites

### Communication Features
- [ ] In-app messaging
- [ ] Email sending (via Resend)
- [ ] SMS sending (via Twilio)
- [ ] WhatsApp messaging
- [ ] Push notifications

### Payment Features
- [ ] Stripe payment processing
- [ ] Invoice generation
- [ ] Payment tracking
- [ ] Refund processing

### Integration Features
- [ ] Google Calendar sync
- [ ] Stripe Connect
- [ ] QR code check-in
- [ ] iCal feed generation
- [ ] Webhook processing

### AI Features
- [ ] Email generation
- [ ] Timeline optimization
- [ ] Budget prediction
- [ ] Seating optimization

### Analytics Features
- [ ] Revenue analytics
- [ ] Client metrics
- [ ] Email/SMS statistics
- [ ] Notification analytics

---

## 🚨 Troubleshooting

### Port 3000 Already in Use
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### ngrok Not Working
```bash
# Check if ngrok is installed
which ngrok

# Verify ngrok auth
ngrok config check

# Restart ngrok
pkill -f ngrok && ngrok http 3000
```

### Database Connection Issues
- Check `.env.local` has correct Supabase credentials
- Verify Supabase project is not paused
- Check network connectivity

### Authentication Issues
- Clear browser cookies/localStorage
- Check Clerk dashboard for user status
- Verify webhook sync between Clerk and Supabase

---

## 📝 Notes

- **Development Mode:** Using Next.js 15.5.6 with React 19
- **Hot Reload:** Code changes will auto-refresh the browser
- **Type Safety:** TypeScript checks run on every save
- **Build Check:** Run `npm run build` to verify production build
- **Linting:** Run `npm run lint` to check code quality

---

**Status:** ✅ Ready for Testing
**Last Updated:** 2025-11-18 15:16 IST
**Servers Running:**
- ✅ Next.js Dev Server (Port 3000)
- ✅ ngrok Tunnel (https://delilah-uncaptious-distinguishedly.ngrok-free.dev)
- ✅ ngrok Inspector (Port 4040)
