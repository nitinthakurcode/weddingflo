# WeddingFlow Pro - API Keys & Environment Variables Checklist

**Last Updated:** October 23, 2025
**Purpose:** Complete inventory of all environment variables required by WeddingFlow Pro

---

## Table of Contents

1. [Core Required Keys](#core-required-keys)
2. [Feature-Specific Keys](#feature-specific-keys)
3. [Optional Keys](#optional-keys)
4. [Missing from .env.local](#missing-from-envlocal)
5. [Security Notes](#security-notes)
6. [Setup Guide](#setup-guide)

---

## Status Legend

- ✅ **Configured** - Present in your `.env.local`
- ⚠️ **Missing** - Not in `.env.local` but required for specific features
- ❌ **Required** - Critical for app to function
- 🔧 **Optional** - Nice to have but not required

---

## Core Required Keys

These keys are **absolutely required** for the application to start and function properly.

### App Configuration
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `NEXT_PUBLIC_APP_URL` | ✅ | Application URL (callbacks, redirects) | Set to your domain |

### Authentication (Clerk)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk public key | https://dashboard.clerk.com |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key | https://dashboard.clerk.com |
| `CLERK_WEBHOOK_SECRET` | ✅ | Clerk webhook verification | https://dashboard.clerk.com/webhooks |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | Sign in page URL | Set to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | Sign up page URL | Set to `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | ✅ | Redirect after sign in | Set to `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | ✅ | Redirect after sign up | Set to `/dashboard` |

### Database (Supabase)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL | https://supabase.com/dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/public key | https://supabase.com/dashboard → Settings → API |
| `SUPABASE_SECRET_KEY` | ✅ | Supabase admin key | https://supabase.com/dashboard → Settings → API |

**Note:** October 2025 uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `SUPABASE_ANON_KEY`)

### Super Admin
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `SUPER_ADMIN_EMAIL` | ✅ | Platform admin email | Your admin email |

---

## Feature-Specific Keys

These keys enable specific features. The app will run without them, but certain features won't work.

### AI Features (OpenAI)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `OPENAI_API_KEY` | ✅ | OpenAI API access | https://platform.openai.com/api-keys |
| `OPENAI_MODEL` | ✅ | AI model (default: gpt-4o) | Set to `gpt-4o` |
| `OPENAI_MAX_TOKENS` | ✅ | Max tokens per request | Set to `2000` |

**Features Affected:**
- AI chat assistant
- Budget prediction
- Email generation
- Timeline optimization
- Seating optimizer

---

### Payment Processing (Stripe)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key | https://dashboard.stripe.com/apikeys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe public key | https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook verification | https://dashboard.stripe.com/webhooks |
| `NEXT_PUBLIC_STRIPE_PRICE_STARTER` | ✅ | Starter plan price ID | Create product in Stripe |
| `NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL` | ✅ | Professional plan price ID | Create product in Stripe |
| `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE` | ✅ | Enterprise plan price ID | Create product in Stripe |
| `STRIPE_PLATFORM_FEE_PERCENT` | ⚠️ **Missing** | Platform fee % (default: 10) | Set to `10` |

**Features Affected:**
- Subscription billing
- Payment processing
- Invoice management
- Vendor payouts (Stripe Connect)
- Refunds

---

### Email Service (Resend)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `RESEND_API_KEY` | ✅ | Resend API key | https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | ✅ | Default sender email | Your verified domain |
| `RESEND_WEBHOOK_SECRET` | ⚠️ **Missing** | Resend webhook verification | https://resend.com/webhooks |

**Features Affected:**
- Transactional emails
- Email campaigns
- Email tracking (opens, clicks)
- Automated wedding reminders

---

### SMS & WhatsApp (Twilio)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `TWILIO_ACCOUNT_SID` | ✅ | Twilio account ID | https://console.twilio.com |
| `TWILIO_AUTH_TOKEN` | ✅ | Twilio auth token | https://console.twilio.com |
| `TWILIO_PHONE_NUMBER` | ✅ | Twilio phone number | Purchase from Twilio |
| `TWILIO_WHATSAPP_NUMBER` | ⚠️ **Missing** | WhatsApp number | https://console.twilio.com/whatsapp |

**Features Affected:**
- SMS notifications
- WhatsApp messages
- Multi-language SMS (7 languages)
- Delivery tracking

---

### Push Notifications (Firebase)

#### Client-Side Configuration
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ⚠️ **Missing** | Firebase API key | https://console.firebase.google.com |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ⚠️ **Missing** | Firebase auth domain | https://console.firebase.google.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ⚠️ **Missing** | Firebase project ID | https://console.firebase.google.com |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ⚠️ **Missing** | Firebase storage bucket | https://console.firebase.google.com |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ⚠️ **Missing** | Firebase sender ID | https://console.firebase.google.com |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ⚠️ **Missing** | Firebase app ID | https://console.firebase.google.com |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | ⚠️ **Missing** | VAPID key for push | https://console.firebase.google.com |

#### Server-Side Configuration
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `FIREBASE_ADMIN_PROJECT_ID` | ⚠️ **Missing** | Admin SDK project ID | https://console.firebase.google.com |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | ⚠️ **Missing** | Admin SDK email | https://console.firebase.google.com |
| `FIREBASE_ADMIN_PRIVATE_KEY` | ⚠️ **Missing** | Admin SDK private key | https://console.firebase.google.com |

**Features Affected:**
- Browser push notifications
- Background notifications
- Multi-device support
- Real-time alerts (payments, RSVPs)

---

### Analytics (PostHog)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `NEXT_PUBLIC_POSTHOG_KEY` | ✅ | PostHog project key | https://app.posthog.com/project/settings |
| `NEXT_PUBLIC_POSTHOG_HOST` | ✅ | PostHog host URL | Set to `https://app.posthog.com` |

**Features Affected:**
- Product analytics
- Feature flags
- Session recording
- User behavior tracking
- A/B testing

---

### Error Tracking (Sentry)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ | Sentry DSN | https://sentry.io/settings/ |
| `SENTRY_AUTH_TOKEN` | ✅ | Sentry auth token | https://sentry.io/settings/account/api/auth-tokens/ |
| `SENTRY_ORG` | ⚠️ **Missing** | Sentry organization slug | Your org slug from URL |
| `SENTRY_PROJECT` | ⚠️ **Missing** | Sentry project slug | Set to `weddingflow-pro` |

**Features Affected:**
- Error tracking
- Performance monitoring
- Session replay
- Source map uploads

---

### Calendar Integration (Google)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `GOOGLE_CLIENT_ID` | ⚠️ **Missing** | Google OAuth client ID | https://console.cloud.google.com/apis/credentials |
| `GOOGLE_CLIENT_SECRET` | ⚠️ **Missing** | Google OAuth secret | https://console.cloud.google.com/apis/credentials |

**Features Affected:**
- Google Calendar sync
- Two-way event sync
- Calendar integration

**Setup Steps:**
1. Enable Google Calendar API
2. Create OAuth 2.0 credentials
3. Add redirect URI: `{NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`

---

### File Storage (Cloudflare R2)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `R2_ENDPOINT` | ⚠️ **Missing** | R2 endpoint URL | https://dash.cloudflare.com |
| `R2_ACCESS_KEY_ID` | ⚠️ **Missing** | R2 access key | https://dash.cloudflare.com |
| `R2_SECRET_ACCESS_KEY` | ⚠️ **Missing** | R2 secret key | https://dash.cloudflare.com |
| `R2_BUCKET_NAME` | ⚠️ **Missing** | R2 bucket name | Create bucket in Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | ⚠️ **Missing** | Cloudflare account ID | https://dash.cloudflare.com |

**Features Affected:**
- Document storage
- Image uploads
- PDF generation
- File management
- CDN delivery

**Fallback:** App may use Supabase Storage if R2 not configured

---

## Optional Keys

These keys enhance functionality but are not required for core operations.

### Webhooks (Service Role)
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ **Missing** | Bypass RLS for webhooks | https://supabase.com/dashboard → Settings → API |

**Use Cases:**
- Stripe webhook logging
- Resend webhook logging
- Twilio webhook logging
- Background jobs that bypass RLS

**Security:** ⚠️ Only use in secure server-side contexts (webhooks, scheduled jobs)

---

### Currency Exchange Rates
| Variable | Status | Purpose | Get From |
|----------|--------|---------|----------|
| `EXCHANGE_RATE_API_KEY` | ⚠️ **Missing** | Live currency rates | https://www.exchangerate-api.com/ |

**Features Affected:**
- Real-time currency conversion
- Multi-currency pricing

**Fallback:** Uses static exchange rates if not configured

---

### Development/CI Environment Variables
| Variable | Status | Purpose | Notes |
|----------|--------|---------|-------|
| `NODE_ENV` | Auto | Environment mode | Set by Next.js |
| `NEXT_RUNTIME` | Auto | Runtime context | Set by Next.js |
| `CI` | Auto | CI environment flag | Set by CI provider |
| `VERCEL_URL` | Auto | Vercel deployment URL | Set by Vercel |
| `VERCEL_ENV` | Auto | Vercel environment | Set by Vercel |

---

## Missing from .env.local

### Critical Missing Keys

None! All core keys are configured. ✅

---

### Feature Keys Missing (Prevents specific features from working)

#### **Push Notifications (Firebase) - 10 keys missing**
```bash
# Add to .env.local for push notifications
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**Impact:** Browser push notifications won't work

---

#### **File Storage (Cloudflare R2) - 5 keys missing**
```bash
# Add to .env.local for file storage
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=weddingflow-documents
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

**Impact:** Document uploads, file storage won't work
**Fallback:** May use Supabase Storage (less optimal, has egress fees)

---

#### **Google Calendar Sync - 2 keys missing**
```bash
# Add to .env.local for calendar integration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
```

**Impact:** Google Calendar two-way sync won't work

---

#### **Sentry Error Tracking - 2 keys missing**
```bash
# Add to .env.local for source maps & releases
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=weddingflow-pro
```

**Impact:** Source map uploads won't work (harder to debug production errors)

---

#### **Webhook Logging - 1 key missing**
```bash
# Add to .env.local for webhook logging (use carefully - admin access!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrxxxxx...
```

**Impact:** Webhook events won't be logged to database (Stripe, Resend, Twilio)
**Security:** ⚠️ This key bypasses ALL RLS policies - only use in secure server contexts

---

#### **WhatsApp Messaging - 1 key missing**
```bash
# Add to .env.local for WhatsApp support
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Impact:** WhatsApp messaging won't work (SMS will still work)

---

#### **Stripe Platform Fees - 1 key missing**
```bash
# Add to .env.local to configure platform fee percentage
STRIPE_PLATFORM_FEE_PERCENT=10
```

**Impact:** Uses default 10% platform fee on vendor payments
**Optional:** Only matters if you want to change the fee percentage

---

#### **Resend Webhook Verification - 1 key missing**
```bash
# Add to .env.local for email webhook verification
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Impact:** Email delivery webhooks won't be verified (security risk)
**Workaround:** Email sending will work, just won't track deliveries

---

#### **Currency Exchange - 1 key missing**
```bash
# Add to .env.local for live exchange rates
EXCHANGE_RATE_API_KEY=your_api_key_here
```

**Impact:** Uses static exchange rates instead of live rates
**Fallback:** Static rates are updated periodically in code

---

## Summary of Missing Keys

| Category | Missing Keys | Impact | Priority |
|----------|--------------|--------|----------|
| **Push Notifications** | 10 | Browser push won't work | Medium |
| **File Storage (R2)** | 5 | File uploads won't work | High |
| **Google Calendar** | 2 | Calendar sync won't work | Medium |
| **Sentry** | 2 | Source maps won't upload | Low |
| **Webhooks** | 1 | Webhook logging won't work | Medium |
| **WhatsApp** | 1 | WhatsApp won't work | Low |
| **Stripe Fees** | 1 | Uses default 10% fee | Low |
| **Resend Webhooks** | 1 | Email tracking won't work | Medium |
| **Exchange Rates** | 1 | Uses static rates | Low |
| **TOTAL** | **24 keys** | Various features | - |

---

## Security Notes

### ⚠️ Critical Security Rules

1. **Never Commit Secrets to Git**
   - `.env.local` is in `.gitignore`
   - Use `.env.example` as template
   - Rotate keys if accidentally committed

2. **Service Role Key (SUPABASE_SERVICE_ROLE_KEY)**
   - Bypasses ALL RLS policies
   - Use ONLY in secure server contexts:
     - Webhook handlers (`/api/webhooks/*`)
     - Server-side API routes
     - Background jobs
   - NEVER expose to client-side code
   - NEVER use in tRPC procedures (use regular Supabase client)

3. **Public vs Private Keys**
   - `NEXT_PUBLIC_*` = Safe to expose (bundled in client JavaScript)
   - No prefix = Server-only (never sent to browser)

4. **Key Rotation**
   - Rotate Clerk webhook secret if compromised
   - Rotate Stripe webhook secret if compromised
   - Rotate database keys annually
   - Use Vercel environment variables in production (not committed)

5. **Environment-Specific Keys**
   - Use test keys in development (sk_test_, pk_test_)
   - Use live keys in production (sk_live_, pk_live_)
   - Never mix test and live keys

---

## Setup Guide

### Step 1: Copy Environment Template
```bash
cp .env.example .env.local
```

### Step 2: Configure Core Keys (Required)
1. **Clerk:** Sign up at https://clerk.com → Create application → Copy keys
2. **Supabase:** Create project at https://supabase.com → Settings → API → Copy keys
3. **Set URLs:** Update `NEXT_PUBLIC_APP_URL` to your domain

### Step 3: Configure Feature Keys (As Needed)

#### For AI Features:
1. Visit https://platform.openai.com/api-keys
2. Create API key
3. Add to `OPENAI_API_KEY`

#### For Payments:
1. Visit https://dashboard.stripe.com/register
2. Get API keys from Dashboard → Developers → API keys
3. Create products for plans (Starter, Professional, Enterprise)
4. Copy price IDs to `NEXT_PUBLIC_STRIPE_PRICE_*`
5. Setup webhook at Dashboard → Developers → Webhooks
6. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

#### For Email:
1. Visit https://resend.com
2. Create API key
3. Add to `RESEND_API_KEY`
4. Setup webhook for delivery tracking

#### For SMS/WhatsApp:
1. Visit https://www.twilio.com/try-twilio
2. Get Account SID and Auth Token
3. Purchase phone number
4. Add to `.env.local`

#### For Push Notifications:
1. Visit https://console.firebase.google.com
2. Create project → Add web app
3. Get config values (8 client-side keys)
4. Generate service account key (3 server-side keys)
5. Update `public/firebase-messaging-sw.js` with config

#### For File Storage:
1. Visit https://dash.cloudflare.com
2. Create R2 bucket
3. Generate API token
4. Add credentials to `.env.local`

#### For Calendar Sync:
1. Visit https://console.cloud.google.com
2. Create project → Enable Calendar API
3. Create OAuth credentials
4. Add redirect URI: `{your-domain}/api/calendar/google/callback`
5. Copy client ID and secret

### Step 4: Verify Configuration
```bash
# Check for missing required keys
npm run dev

# Test integrations
# Each integration will log errors if keys are missing
```

---

## Quick Reference: Where to Get Each Key

| Service | URL | Keys Provided |
|---------|-----|---------------|
| **Clerk** | https://dashboard.clerk.com | CLERK_* |
| **Supabase** | https://supabase.com/dashboard | SUPABASE_* |
| **OpenAI** | https://platform.openai.com/api-keys | OPENAI_* |
| **Stripe** | https://dashboard.stripe.com/apikeys | STRIPE_* |
| **Resend** | https://resend.com/api-keys | RESEND_* |
| **Twilio** | https://console.twilio.com | TWILIO_* |
| **Firebase** | https://console.firebase.google.com | FIREBASE_* |
| **PostHog** | https://app.posthog.com/project/settings | POSTHOG_* |
| **Sentry** | https://sentry.io/settings/ | SENTRY_* |
| **Google Cloud** | https://console.cloud.google.com | GOOGLE_* |
| **Cloudflare** | https://dash.cloudflare.com | R2_*, CLOUDFLARE_* |
| **Exchange Rate API** | https://www.exchangerate-api.com/ | EXCHANGE_RATE_* |

---

## Troubleshooting

### "Clerk is not configured"
- Missing: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or `CLERK_SECRET_KEY`

### "Supabase client error"
- Missing: `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### "OpenAI API error"
- Missing: `OPENAI_API_KEY`
- Invalid key or insufficient credits

### "Stripe webhook verification failed"
- Missing: `STRIPE_WEBHOOK_SECRET`
- Wrong webhook secret

### "Email sending failed"
- Missing: `RESEND_API_KEY`
- Invalid API key or no verified domain

### "SMS sending failed"
- Missing: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, or `TWILIO_PHONE_NUMBER`
- Invalid credentials or phone number

### "Push notifications not working"
- Missing: Firebase configuration (10 keys)
- Service worker not registered

### "File upload failed"
- Missing: Cloudflare R2 configuration (5 keys)
- Bucket doesn't exist or wrong credentials

### "Calendar sync not working"
- Missing: `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET`
- OAuth redirect URI not configured

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All core keys configured
- [ ] All feature keys configured (for features you want to use)
- [ ] Test mode keys replaced with live keys (Stripe, etc.)
- [ ] Webhook URLs updated to production domain
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Environment variables set in hosting provider (Vercel/Fly.io)
- [ ] Secrets rotated from development
- [ ] `.env.local` NOT committed to git
- [ ] Service role key secured (only in server contexts)
- [ ] Source maps configured (Sentry)
- [ ] Analytics enabled (PostHog)

---

**Document Version:** 1.0.0
**Last Updated:** October 23, 2025
**Your Configuration Status:** 29 of 53 keys configured (24 optional keys missing)
