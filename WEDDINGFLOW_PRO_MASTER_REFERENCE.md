# WeddingFlow Pro - Master Reference Guide

**Last Updated:** October 23, 2025
**Version:** 1.0.0
**Architecture:** Feature Pocket Architecture (October 2025 Standard)

---

## Table of Contents

1. [What is WeddingFlow Pro?](#what-is-weddingflow-pro)
2. [Complete Feature List](#complete-feature-list)
3. [Technical Architecture](#technical-architecture)
4. [Third-Party Integrations](#third-party-integrations)
5. [Database Schema Overview](#database-schema-overview)
6. [Authentication & Authorization](#authentication--authorization)
7. [API Routes & Webhooks](#api-routes--webhooks)
8. [Deployment & Infrastructure](#deployment--infrastructure)

---

## What is WeddingFlow Pro?

### Core Purpose
WeddingFlow Pro is a comprehensive SaaS platform designed for **wedding planning companies** to manage their entire business operations - from client relationships to event logistics, payments, and guest communications.

### Value Proposition
- **Multi-tenant architecture**: Each wedding planning company gets their own isolated workspace
- **All-in-one platform**: Eliminates need for multiple tools (CRM, accounting, communication, project management)
- **AI-powered features**: Budget prediction, email generation, timeline optimization, seating arrangements
- **White-label capability**: Custom branding, subdomains, and guest-facing wedding websites
- **Multi-currency support**: 7 currencies (USD, EUR, GBP, CAD, AUD, JPY, INR)

### Target Users
1. **Wedding Planning Companies** (Primary)
   - Professional wedding planners
   - Event coordination businesses
   - Destination wedding specialists

2. **Company Roles**
   - Super Admins (platform-level management)
   - Company Admins (company owners)
   - Planners (staff members)
   - Vendors (external partners)

### Business Model
**SaaS Subscription Tiers:**

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | 5 clients, basic features |
| **Starter** | $29/mo | 25 clients, email/SMS notifications |
| **Professional** | $99/mo | 100 clients, AI features, WhatsApp, custom branding |
| **Enterprise** | $299/mo | Unlimited clients, all features, priority support, API access |

**Revenue Streams:**
- Monthly subscriptions (Stripe)
- Platform fees on vendor payments (10% via Stripe Connect)
- Add-on features (custom domains $19.99/year)

---

## Complete Feature List

### 1. Core Features

#### **Client Management**
- Multi-client workspace for each company
- Client profiles with partner details
- Wedding date tracking
- Budget allocation per client
- Client-specific settings and preferences
- Onboarding workflow with step-by-step guidance

**Router:** `src/features/clients/server/routers/clients.router.ts`
**Database Table:** `clients`

#### **Guest Management**
- Guest lists with RSVP tracking
- Group management (family, friends, etc.)
- Dietary restrictions and preferences
- Plus-one management
- Guest check-in system
- QR code generation for check-in
- Import from CSV/Excel
- Export to various formats

**Router:** `src/features/guests/server/routers/guests.router.ts`
**Database Tables:** `guests`, `guest_groups`, `guest_check_ins`

#### **Event Management**
- Multiple events per wedding (ceremony, reception, rehearsal)
- Venue management
- Event timeline
- Capacity planning
- Event-specific guest lists

**Router:** `src/features/events/server/routers/events.router.ts`
**Database Table:** `events`

#### **Timeline Management**
- Wedding day timeline builder
- Task assignment
- Deadline tracking
- Milestone management
- Duration estimates
- Completion status tracking

**Router:** `src/features/events/server/routers/timeline.router.ts`
**Database Table:** `timeline_items`

#### **Vendor Management**
- Vendor directory
- Category classification (photographer, caterer, DJ, etc.)
- Payment tracking
- Contract management
- Vendor ratings and notes
- Stripe Connect integration for vendor payouts

**Router:** `src/features/events/server/routers/vendors.router.ts`
**Database Table:** `client_vendors`

#### **Hotel Management**
- Hotel room block management
- Reservation tracking
- Guest room assignments
- Hotel contact information

**Router:** `src/features/events/server/routers/hotels.router.ts`
**Database Table:** `hotels`

#### **Gift Registry & Tracking**
- Gift registry management
- Gift tracking (who gave what)
- Thank you card tracker
- Gift status (pending, received, thanked)
- Multiple registries per client
- Enhanced gift tracking with photos

**Routers:**
- `src/features/events/server/routers/gifts.router.ts`
- `src/features/events/server/routers/gifts-enhanced.router.ts`

**Database Tables:** `gifts`, `thank_you_cards`

#### **Budget Management**
- Budget categories (venue, catering, photography, etc.)
- Estimated vs. actual costs
- Payment tracking
- Multi-currency support
- Budget vs. actual reporting
- Vendor payment allocation
- Financial analytics

**Router:** `src/features/analytics/server/routers/budget.router.ts`
**Database Table:** `budget_items`

#### **Document Management**
- File upload and storage
- Document categorization with tags
- Contracts, invoices, inspiration images
- Cloudflare R2 storage integration
- Version control
- Secure document sharing

**Router:** `src/features/media/server/routers/documents.router.ts`
**Database Table:** `documents`

#### **Creative Projects (Photography/Video)**
- Photo/video job tracking
- Shot list management
- Delivery tracking
- Client feedback
- Project status updates

**Router:** `src/features/media/server/routers/creatives.router.ts`
**Database Table:** `creative_jobs`

---

### 2. Communication Features

#### **Email Notifications**
- Automated email campaigns
- Email templates (15+ pre-built)
- Bulk email sending
- Email tracking (opens, clicks, bounces)
- Personalized email generation
- Webhook-based delivery tracking

**Integration:** Resend
**Router:** `src/features/communications/server/routers/email.router.ts`
**Database Table:** `email_logs`

**Templates:**
- Wedding reminders (7, 30, 60 days before)
- RSVP confirmations
- Payment reminders
- Vendor notifications
- Thank you emails
- Event updates

#### **SMS Notifications**
- SMS campaigns via Twilio
- Message templates
- Delivery tracking
- Multi-language support (7 languages)
- Webhook-based status updates

**Integration:** Twilio
**Router:** `src/features/communications/server/routers/sms.router.ts`
**Database Table:** `sms_logs`

**Supported Languages:**
- English, Spanish, French, German, Italian, Portuguese, Hindi

#### **WhatsApp Business Messaging**
- WhatsApp message templates
- Media messages (images, documents)
- Delivery and read receipts
- Template approval system
- Webhook-based tracking

**Integration:** Twilio WhatsApp API
**Router:** `src/features/communications/server/routers/whatsapp.router.ts`
**Database Table:** `whatsapp_logs`

#### **Push Notifications**
- Browser push notifications
- Multi-device support
- 6 notification types:
  - Payment alerts
  - RSVP updates
  - Event reminders
  - Task deadlines
  - Vendor messages
  - System notifications
- User preferences per notification type
- FCM token management

**Integration:** Firebase Cloud Messaging
**Router:** `src/features/communications/server/routers/push.router.ts`
**Database Tables:** `push_subscriptions`, `push_notifications`

#### **AI-Powered Chat Assistant**
- Context-aware AI assistant
- Natural language queries
- Wedding planning advice
- Budget recommendations
- Vendor suggestions
- Uses primary AI provider (DeepSeek if available, OpenAI fallback)

**Integration:** DeepSeek V3 (primary) + OpenAI GPT-4o (fallback)
**Router:** `src/features/communications/server/routers/ai.router.ts`
**Implementation:** `src/lib/ai/openai-client.ts`

---

### 3. Payment Features

#### **Stripe Integration**
- Payment processing (cards, bank transfers)
- Subscription billing (SaaS tiers)
- Invoice generation with line items
- Payment intent tracking
- Receipt generation
- Multi-currency support (7 currencies)
- Webhook-based status updates

**Router:** `src/features/payments/server/routers/stripe.router.ts`
**Database Tables:** `payments`, `invoices`

#### **Stripe Connect (Vendor Payments)**
- Connect accounts for vendors
- Split payments
- Platform fees (configurable %)
- Payout tracking
- Onboarding flow for vendors

**Database Table:** `stripe_accounts`

#### **Invoice Management**
- Invoice creation and editing
- Line item management
- Tax and discount calculations
- Payment tracking
- PDF generation
- Status tracking (draft, open, paid, overdue)
- Auto-generated invoice numbers

**Database Table:** `invoices`

#### **Refunds**
- Full and partial refunds
- Refund reason tracking
- Automatic payment reconciliation

**Database Table:** `refunds`

#### **Payment Methods**
- Saved payment methods
- Default payment method selection
- Card details storage (PCI-compliant via Stripe)

**Database Table:** `payment_methods`

---

### 4. Analytics Features

#### **Business Analytics**
- Revenue tracking and forecasting
- Client acquisition metrics
- Payment success rates
- Vendor performance analytics
- Event statistics
- RSVP trends
- Email/SMS delivery stats

**Router:** `src/features/analytics/server/routers/analytics.router.ts`

#### **PostHog Integration**
- Product analytics
- User behavior tracking
- Feature flags
- A/B testing
- Session recording
- Custom event tracking

**Custom Events Tracked:**
- `client_created`, `client_updated`
- `guest_imported`, `rsvp_updated`
- `ai_feature_used` (budget, email, timeline, seating)
- `payment_received`, `invoice_created`

#### **Data Import/Export**
- CSV/Excel import for guests
- Data export in multiple formats (CSV, Excel, PDF)
- Bulk operations

**Routers:**
- `src/features/analytics/server/routers/import.router.ts`
- `src/features/analytics/server/routers/export.router.ts`

---

### 5. AI Features (Dual Provider: DeepSeek + OpenAI) 🆕

**Architecture (October 2025):**
- **Primary Provider:** DeepSeek V3 (85-90% cost savings)
- **Fallback Provider:** OpenAI GPT-4o (automatic failover)
- **Auto-switching:** Seamless transition for 100% uptime
- **Cost Savings:** $35-750/month depending on scale

**Implementation:** `src/lib/ai/openai-client.ts`

#### **Budget Predictor**
- AI-powered budget estimation
- Category-wise cost breakdown
- Location-based pricing
- Guest count impact analysis
- Seasonal pricing adjustments
- Uses primary AI provider (DeepSeek if available)

**Endpoint:** `/api/ai/budget-predict`
**Implementation:** `src/lib/ai/budget-predictor.ts`
**AI Cost:** ~$0.50-2/request (DeepSeek) vs ~$5-20/request (OpenAI only)

#### **Email Generator**
- AI-generated personalized emails
- Tone adjustment (formal, casual, friendly)
- Context-aware content
- Multi-language support (7 languages)
- Uses primary AI provider (DeepSeek if available)

**Endpoint:** `/api/ai/email-generate`
**Implementation:** `src/lib/ai/email-generator.ts`
**AI Cost:** ~$0.30-1/email (DeepSeek) vs ~$3-10/email (OpenAI only)

#### **Timeline Optimizer**
- AI-optimized wedding day schedule
- Buffer time suggestions
- Conflict detection
- Venue-specific recommendations
- Uses primary AI provider (DeepSeek if available)

**Endpoint:** `/api/ai/timeline-optimize`
**Implementation:** `src/lib/ai/timeline-optimizer.ts`
**AI Cost:** ~$0.40-1.50/timeline (DeepSeek) vs ~$4-15/timeline (OpenAI only)

#### **Seating Optimizer**
- AI-powered seating arrangements
- Relationship-based optimization
- Table capacity management
- Conflict avoidance
- Uses primary AI provider (DeepSeek if available)

**Endpoint:** `/api/ai/seating`
**Implementation:** `src/lib/ai/seating-optimizer.ts`
**AI Cost:** ~$0.60-2/optimization (DeepSeek) vs ~$6-20/optimization (OpenAI only)

#### **AI Cost Comparison:**

| Feature | DeepSeek (Primary) | OpenAI (Fallback) | Savings |
|---------|-------------------|-------------------|---------|
| Budget Prediction | $0.50-2/request | $5-20/request | 90% |
| Email Generation | $0.30-1/email | $3-10/email | 90% |
| Timeline Optimization | $0.40-1.50/timeline | $4-15/timeline | 90% |
| Seating Optimization | $0.60-2/optimization | $6-20/optimization | 90% |

**Monthly AI Cost Estimates:**
- **With DeepSeek (1000 users):** $6-20/month
- **OpenAI only (1000 users):** $50-200/month
- **Savings:** 85-90% ($35-180/month)

---

### 6. Advanced Features

#### **QR Code Check-in System**
- Generate QR codes for each guest
- Mobile-friendly check-in interface
- Real-time check-in tracking
- Export attendance reports

**Router:** `src/features/guests/server/routers/qr.router.ts`
**Database Table:** `guest_check_ins`

#### **Wedding Guest Websites**
- Custom wedding websites for couples
- Free subdomain (john-jane.weddingflow.com)
- Optional custom domain ($19.99/year)
- Password protection
- Pre-built templates (classic, modern, elegant)
- Customizable sections:
  - Hero with couple names
  - Our Story
  - Wedding Party
  - Event Details
  - Travel & Accommodations
  - Registry Links
  - Photo Gallery
  - Guest Book
- Theme customization (colors, fonts)
- RSVP integration
- Photo upload by guests
- Analytics tracking

**Router:** `src/features/guests/server/routers/websites.router.ts`
**Database Tables:** `wedding_websites`, `website_visits`

#### **Google Calendar Integration**
- Two-way calendar sync
- OAuth authentication
- Auto-sync events and timeline items
- Multiple calendar support

**Router:** `src/features/events/server/routers/calendar.router.ts`
**OAuth Implementation:** `src/lib/calendar/google-oauth.ts`

#### **Floor Plan Designer**
- Interactive floor plan editor (Konva.js)
- Table placement and management
- Guest seating assignments
- Export to PDF

**Router:** `src/features/events/server/routers/floor-plans.router.ts`
**Database Table:** `floor_plans`

#### **iCalendar Feed**
- Public calendar feed for guests
- Token-based authentication
- Auto-updates with event changes

**Endpoint:** `/api/calendar/feed/[token]`

---

## Technical Architecture

### Stack Overview
```
Frontend:  Next.js 15, React 19, TypeScript, TailwindCSS, shadcn/ui
Backend:   tRPC v11, Next.js API Routes
Database:  Supabase (PostgreSQL)
Auth:      Clerk (session-based with JWT)
Storage:   Cloudflare R2 (S3-compatible)
Payments:  Stripe + Stripe Connect
AI:        DeepSeek V3 (primary) + OpenAI GPT-4o (fallback) 🆕
Analytics: PostHog, Sentry
Email:     Resend
SMS:       Twilio
Push:      Firebase Cloud Messaging
```

### Architecture Pattern: Feature Pocket Architecture

**Vertical Slices by Business Domain:**

```
src/features/
├── core/               # User/company identity & tenant management
│   └── server/routers/ # users, companies
├── clients/            # Client relationship management
│   └── server/routers/ # clients, onboarding
├── events/             # Event planning & logistics
│   └── server/routers/ # events, timeline, vendors, hotels, gifts, calendar, floor-plans
├── guests/             # Guest management & check-in
│   └── server/routers/ # guests, qr, messages, websites
├── communications/     # Multi-channel notifications
│   └── server/routers/ # email, sms, whatsapp, push, ai
├── payments/           # Payment processing & invoicing
│   └── server/routers/ # payment, stripe, pdf
├── media/              # File & asset management
│   └── server/routers/ # documents, storage, creatives
└── analytics/          # Business intelligence & reporting
    └── server/routers/ # analytics, budget, export, import
```

**Key Principles:**
- Each feature pocket is self-contained
- Vertical slice contains all layers (UI, logic, data)
- No circular dependencies between pockets
- Shared utilities in `src/lib/`

### tRPC Router Structure

**Main App Router:** `src/server/trpc/routers/_app.ts`

```typescript
export const appRouter = router({
  // Core
  users: usersRouter,
  companies: companiesRouter,

  // Clients
  clients: clientsRouter,
  onboarding: onboardingRouter,

  // Events
  events: eventsRouter,
  timeline: timelineRouter,
  vendors: vendorsRouter,
  hotels: hotelsRouter,
  gifts: giftsRouter,
  giftsEnhanced: giftsEnhancedRouter,
  calendar: calendarRouter,
  floorPlans: floorPlansRouter,

  // Guests
  guests: guestsRouter,
  qr: qrRouter,
  messages: messagesRouter,
  websites: websitesRouter,

  // Communications
  email: emailRouter,
  sms: smsRouter,
  whatsapp: whatsappRouter,
  push: pushRouter,
  ai: aiRouter,

  // Payments
  payment: paymentRouter,
  stripe: stripeRouter,
  pdf: pdfRouter,

  // Media
  documents: documentsRouter,
  storage: storageRouter,
  creatives: creativesRouter,

  // Analytics
  analytics: analyticsRouter,
  analyticsExport: analyticsExportRouter,
  budget: budgetRouter,
  export: exportRouter,
  import: importRouter,
});
```

### Database Architecture

**Supabase PostgreSQL with Row Level Security (RLS)**

**Multi-tenancy Model:**
- Each company is a tenant
- All data tables have `company_id` foreign key
- RLS policies enforce data isolation using Clerk JWT claims

**Key Design Patterns:**
- UUID primary keys
- Automatic `created_at` and `updated_at` timestamps
- JSONB for flexible schema (settings, metadata, theme colors)
- Enums for status fields
- Composite indexes for performance
- Foreign key constraints with CASCADE/SET NULL

**Total Tables:** 50+

---

## Third-Party Integrations

### 1. Authentication & Authorization

#### **Clerk**
- **Purpose:** User authentication and session management
- **Features Used:**
  - Email/password authentication
  - Social login (Google, GitHub)
  - User metadata (company_id, role)
  - JWT with custom claims
  - Webhooks for user sync
  - Multi-factor authentication (MFA)
  - Magic links

**Environment Variables:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

**Webhooks:** `/api/webhooks/clerk`, `/api/webhooks/clerk-sync`

---

### 2. Database & Storage

#### **Supabase**
- **Purpose:** PostgreSQL database with RLS
- **Features Used:**
  - Managed PostgreSQL
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Database functions
  - Automatic API generation

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key)
- `SUPABASE_SECRET_KEY` (admin operations)
- `SUPABASE_SERVICE_ROLE_KEY` (webhooks only)

**Note:** Uses October 2025 Native Integration with Clerk (no JWT templates needed)

#### **Cloudflare R2**
- **Purpose:** S3-compatible object storage
- **Features Used:**
  - File storage (documents, images, PDFs)
  - CDN integration
  - Presigned URLs
  - Zero egress fees

**Cost Savings:** ~$891/month vs AWS S3

**Environment Variables:**
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `CLOUDFLARE_ACCOUNT_ID`

**Implementation:** `src/lib/storage/r2-client.ts`

---

### 3. Payments

#### **Stripe**
- **Purpose:** Payment processing and subscription management
- **Features Used:**
  - Payment Intents API
  - Subscriptions (SaaS billing)
  - Stripe Connect (vendor payouts)
  - Invoices
  - Refunds
  - Webhooks
  - Customer Portal
  - Multi-currency support

**Environment Variables:**
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PRICE_STARTER`
- `NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL`
- `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE`
- `STRIPE_PLATFORM_FEE_PERCENT` (default: 10%)

**Webhooks:** `/api/webhooks/stripe`

**Events Tracked:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `account.updated`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

### 4. Communication Services

#### **Resend**
- **Purpose:** Transactional email delivery
- **Features Used:**
  - Email sending API
  - Email templates
  - Delivery tracking
  - Bounce/spam detection
  - Webhooks

**Environment Variables:**
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_WEBHOOK_SECRET`

**Webhooks:** `/api/webhooks/resend`

**Events Tracked:**
- `email.sent`
- `email.delivered`
- `email.bounced`
- `email.opened`
- `email.clicked`
- `email.delivery_delayed`
- `email.complained`

**Templates:** `src/lib/email/templates/`

#### **Twilio**
- **Purpose:** SMS and WhatsApp messaging
- **Features Used:**
  - SMS API
  - WhatsApp Business API
  - Delivery status tracking
  - Webhooks

**Environment Variables:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_WHATSAPP_NUMBER` (format: `whatsapp:+14155238886`)

**Webhooks:** `/api/webhooks/twilio`

**SMS Languages:** English, Spanish, French, German, Italian, Portuguese, Hindi

#### **Firebase Cloud Messaging (FCM)**
- **Purpose:** Browser push notifications
- **Features Used:**
  - Web push notifications
  - Background notifications
  - Multi-device support
  - VAPID authentication

**Environment Variables (Client):**
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

**Environment Variables (Server):**
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

**Service Worker:** `public/firebase-messaging-sw.js`

---

### 5. AI & Machine Learning

#### **DeepSeek AI (Primary Provider)** 🆕
- **Purpose:** Primary AI provider for cost optimization
- **Model:** DeepSeek V3 (deepseek-chat)
- **Cost:** $0.27 per 1M input tokens, $1.10 per 1M output tokens
- **Savings:** 85-90% vs OpenAI
- **Features Used:**
  - Chat completions
  - Budget prediction
  - Email generation
  - Timeline optimization
  - Seating optimization

**Environment Variables:**
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_API_BASE` (default: `https://api.deepseek.com/v1`)
- `DEEPSEEK_MODEL` (default: `deepseek-chat`)

#### **OpenAI (Fallback Provider)**
- **Purpose:** Fallback AI provider for reliability
- **Model:** GPT-4o (latest as of Oct 2025)
- **Cost:** $2.50 per 1M input tokens, $10 per 1M output tokens
- **Usage:** Automatic failover when DeepSeek unavailable
- **Features Used:**
  - Same as DeepSeek (automatic switching)

**Environment Variables:**
- `OPENAI_API_KEY` (required for fallback)
- `OPENAI_MODEL` (default: `gpt-4o`)
- `OPENAI_MAX_TOKENS` (default: 2000)

**Dual Provider Architecture:**
- If `DEEPSEEK_API_KEY` is set: DeepSeek primary, OpenAI fallback
- If `DEEPSEEK_API_KEY` is NOT set: OpenAI only
- Seamless switching ensures 100% uptime

**Implementation:** `src/lib/ai/openai-client.ts`

---

### 6. Analytics & Monitoring

#### **PostHog**
- **Purpose:** Product analytics and feature flags
- **Features Used:**
  - Event tracking
  - User identification
  - Session recording
  - Feature flags
  - A/B testing
  - Funnel analysis

**Environment Variables:**
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST` (default: `https://app.posthog.com`)

**Implementation:** `src/lib/analytics/posthog-provider.tsx`

#### **Sentry**
- **Purpose:** Error tracking and performance monitoring
- **Features Used:**
  - Error tracking
  - Performance monitoring (10% sample rate)
  - Session replay (10% sample rate, 100% on errors)
  - Source map uploads
  - Release tracking

**Environment Variables:**
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

**Configurations:**
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

---

### 7. External APIs

#### **Google Calendar API**
- **Purpose:** Two-way calendar synchronization
- **Features Used:**
  - OAuth 2.0 authentication
  - Calendar API v3
  - Event creation/update/delete
  - Calendar listing

**Environment Variables:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL` (for OAuth callback)

**OAuth Flow:** `src/lib/calendar/google-oauth.ts`

**Endpoints:**
- `/api/calendar/google/auth` - Start OAuth
- `/api/calendar/google/callback` - Handle OAuth callback

#### **Exchange Rate API (Optional)**
- **Purpose:** Live currency rate updates
- **Free Tier:** 1,500 requests/month

**Environment Variable:**
- `EXCHANGE_RATE_API_KEY`

---

### 8. Infrastructure

#### **Vercel**
- **Purpose:** Hosting and deployment
- **Features Used:**
  - Edge Functions
  - Serverless Functions
  - Analytics
  - Speed Insights

**Environment Variables:**
- Automatically provided by Vercel
- `VERCEL_URL`, `VERCEL_ENV`, etc.

---

## Database Schema Overview

### Core Tables

#### **companies**
- Company/tenant management
- Subscription tracking
- Stripe customer ID
- Branding settings
- Trial management

#### **users**
- User accounts
- Clerk ID mapping
- Role management (admin, planner, vendor)
- Company association
- Email preferences

#### **clients**
- Wedding clients
- Partner details
- Wedding date
- Budget allocation
- Status tracking

### Event Management Tables

#### **events**
- Wedding events (ceremony, reception)
- Venue details
- Date/time
- Capacity

#### **timeline_items**
- Wedding day schedule
- Task assignments
- Duration tracking
- Dependencies

#### **client_vendors**
- Vendor assignments
- Payment tracking
- Contract details
- Contact info

#### **hotels**
- Hotel accommodations
- Room blocks
- Reservation tracking

#### **gifts**
- Gift registry items
- Gift tracking
- Thank you cards

#### **floor_plans**
- Venue floor plans (JSON)
- Table arrangements
- Seating assignments

### Guest Management Tables

#### **guests**
- Guest information
- RSVP status
- Dietary restrictions
- Plus-one tracking
- Group assignments

#### **guest_groups**
- Family/friend groupings
- Group RSVP

#### **guest_check_ins**
- QR code check-in
- Timestamp tracking

#### **wedding_websites**
- Custom guest websites
- Domain configuration
- Theme settings
- Content sections (JSONB)

#### **website_visits**
- Analytics tracking
- Visitor IP, user agent
- Page views

### Communication Tables

#### **messages**
- Internal messaging
- User-to-user communication

#### **email_logs**
- Email delivery tracking
- Opens, clicks, bounces
- Template usage

#### **sms_logs**
- SMS delivery tracking
- Status updates
- Carrier info

#### **whatsapp_logs**
- WhatsApp message tracking
- Media attachments
- Delivery status

#### **push_notifications**
- Push notification history
- Delivery status

#### **push_subscriptions**
- FCM tokens
- Device info
- Notification preferences

### Payment Tables

#### **payments**
- Payment transactions
- Stripe payment intent ID
- Amount, currency
- Status tracking

#### **invoices**
- Invoice management
- Line items (JSONB)
- Payment status
- PDF generation

#### **stripe_accounts**
- Stripe Connect accounts
- Vendor payout info
- Onboarding status

#### **refunds**
- Refund transactions
- Reason tracking

#### **payment_methods**
- Saved payment methods
- Card details (via Stripe)

### Media Tables

#### **documents**
- File management
- Tags
- Client association
- R2 storage URLs

#### **creative_jobs**
- Photography/video projects
- Shot lists
- Delivery tracking

### Analytics Tables

#### **budget_items**
- Budget categories
- Estimated vs. actual
- Vendor assignments
- Payment tracking

#### **webhook_events**
- Webhook delivery log
- Idempotency tracking
- Retry management

#### **ai_usage_logs**
- AI feature usage tracking
- Token consumption
- Cost tracking

### System Tables

#### **onboarding_progress**
- User onboarding state
- Step completion tracking

#### **user_preferences**
- Notification settings
- Language preferences
- Theme settings

#### **calendar_connections**
- Google Calendar OAuth tokens
- Sync status

---

## Authentication & Authorization

### Authentication Flow (Clerk)

1. **User Signs Up/In:**
   - Clerk handles authentication
   - Returns JWT with user claims

2. **Session Claims:**
   ```typescript
   {
     sub: "user_xxx",           // Clerk user ID
     email: "user@example.com",
     metadata: {
       company_id: "uuid",      // Company UUID
       role: "admin"            // User role
     }
   }
   ```

3. **Supabase Integration:**
   - Clerk JWT automatically works with Supabase RLS
   - No custom JWT templates needed (October 2025 native integration)

### Row Level Security (RLS)

**Every table has RLS enabled with policies:**

1. **Service Role Bypass:**
   - Webhooks use `SUPABASE_SERVICE_ROLE_KEY`
   - Full access for background operations

2. **Company Isolation:**
   ```sql
   company_id::text = auth.jwt()->'metadata'->>'company_id'
   ```

3. **User-specific Access:**
   ```sql
   user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')
   ```

### Role-Based Access Control (RBAC)

**Roles:**
- `super_admin` - Platform-level access
- `admin` - Company owner
- `planner` - Staff member
- `vendor` - External partner

**Implemented in application layer (tRPC middleware)**

---

## API Routes & Webhooks

### tRPC Routes
- **Endpoint:** `/api/trpc/[trpc]`
- **Type-safe:** Full TypeScript support
- **Authenticated:** Clerk session required

### REST API Routes

#### **AI Endpoints**
- `POST /api/ai/chat` - AI chat assistant
- `POST /api/ai/budget-predict` - Budget prediction
- `POST /api/ai/email-generate` - Email generation
- `POST /api/ai/timeline-optimize` - Timeline optimization
- `POST /api/ai/seating` - Seating optimization

#### **Email Endpoints**
- `POST /api/email/send` - Send single email
- `POST /api/email/bulk-send` - Bulk email
- `GET /api/email/preview/[template]` - Preview template

#### **Calendar Endpoints**
- `GET /api/calendar/google/auth` - Start OAuth
- `GET /api/calendar/google/callback` - OAuth callback
- `GET /api/calendar/feed/[token]` - iCalendar feed

#### **Stripe Endpoints**
- `POST /api/stripe/create-checkout` - Create checkout session
- `POST /api/stripe/portal` - Customer portal
- `POST /api/stripe/sync-subscription` - Sync subscription
- `POST /api/stripe/cancel-subscription` - Cancel subscription

#### **Website Endpoints**
- `POST /api/websites/track-visit` - Track page visit
- `POST /api/websites/verify-password` - Verify website password

#### **Health Check**
- `GET /api/health` - Service health status

### Webhook Endpoints

#### **Stripe Webhook**
- **Endpoint:** `POST /api/webhooks/stripe`
- **Verification:** Stripe signature validation
- **Events:**
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `customer.subscription.*`

#### **Resend Webhook**
- **Endpoint:** `POST /api/webhooks/resend`
- **Verification:** Svix signature validation
- **Events:**
  - `email.sent`, `email.delivered`
  - `email.bounced`, `email.opened`
  - `email.clicked`

#### **Twilio Webhook**
- **Endpoint:** `POST /api/webhooks/twilio`
- **Verification:** Twilio signature validation
- **Events:**
  - SMS status updates
  - WhatsApp delivery status

#### **Clerk Webhooks**
- **Endpoint:** `POST /api/webhooks/clerk`
- **Endpoint:** `POST /api/webhooks/clerk-sync`
- **Events:**
  - `user.created`, `user.updated`
  - `user.deleted`
  - Sync to Supabase users table

**All webhooks use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS**

---

## Deployment & Infrastructure

### Hosting
- **Platform:** Vercel (recommended) or Fly.io
- **Region:** Auto-selected for optimal performance
- **Edge Functions:** Used for auth middleware

### Environment Configuration
- **Development:** `.env.local`
- **Production:** `.env.production`
- **Example:** `.env.example` (documented)

### Build & Deploy
```bash
# Development
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build
npm run build

# Deploy to Vercel
npm run deploy
```

### Performance Optimizations
- Next.js Image Optimization
- Automatic code splitting
- Edge caching
- R2 CDN integration
- PostHog analytics (10% sample rate in prod)
- Sentry performance monitoring (10% sample rate)

### Security
- RLS on all database tables
- Clerk authentication
- Webhook signature verification
- CORS policies
- Rate limiting (via Vercel)
- Environment variable validation
- SQL injection protection (Supabase parameterized queries)

### Monitoring
- **Errors:** Sentry
- **Analytics:** PostHog
- **Performance:** Vercel Analytics, Sentry
- **Logs:** Vercel Functions logs, Supabase logs

### Testing
- **Unit Tests:** Jest
- **Integration Tests:** Jest
- **E2E Tests:** Playwright
- **Coverage:** `npm run test:coverage`

### CI/CD
- **Platform:** GitHub Actions (recommended)
- **Pre-deploy:** `npm run predeploy` (lint + type-check)
- **Post-deploy:** Database migrations (manual)

---

## Development Scripts

```bash
# Development
npm run dev                  # Start dev server

# Testing
npm run test                 # Unit tests (watch mode)
npm run test:unit            # Unit tests
npm run test:e2e             # E2E tests (Playwright)
npm run test:coverage        # Coverage report

# Code Quality
npm run lint                 # ESLint
npm run format               # Prettier
npm run type-check           # TypeScript check

# Build
npm run build                # Production build
npm run build:analyze        # Bundle analyzer

# Database
npm run seed:admin           # Seed super admin

# Deployment
npm run predeploy            # Pre-deployment checks
npm run deploy               # Deploy to Vercel
npm run deploy:preview       # Deploy preview
```

---

## Project Structure

```
weddingflow-pro/
├── .github/                 # GitHub Actions workflows
├── docs/                    # Documentation
├── e2e/                     # Playwright E2E tests
├── public/                  # Static assets
│   ├── firebase-messaging-sw.js
│   └── manifest.json
├── scripts/                 # Utility scripts
│   ├── setup-stripe-products.ts
│   └── pre-deploy-check.sh
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/             # API routes
│   │   ├── [locale]/        # i18n routes
│   │   └── layout.tsx
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── dashboard/
│   │   ├── budget/
│   │   ├── calendar/
│   │   └── ...
│   ├── features/            # Feature pocket architecture
│   │   ├── core/
│   │   ├── clients/
│   │   ├── events/
│   │   ├── guests/
│   │   ├── communications/
│   │   ├── payments/
│   │   ├── media/
│   │   └── analytics/
│   ├── hooks/               # React hooks
│   ├── lib/                 # Shared libraries
│   │   ├── ai/
│   │   ├── analytics/
│   │   ├── calendar/
│   │   ├── email/
│   │   ├── sms/
│   │   ├── storage/
│   │   ├── stripe/
│   │   ├── supabase/
│   │   └── ...
│   ├── server/              # Server-side code
│   │   └── trpc/
│   │       ├── context.ts
│   │       ├── trpc.ts
│   │       └── routers/
│   ├── types/               # TypeScript types
│   └── lib/database.types.ts # Supabase generated types
├── supabase/
│   └── migrations/          # Database migrations (50+)
├── .env.local               # Local environment variables
├── .env.example             # Environment variable template
├── next.config.ts           # Next.js configuration
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Key Configuration Files

- **next.config.ts:** Next.js config (Sentry, PWA, i18n)
- **middleware.ts:** Clerk auth + public routes
- **tailwind.config.ts:** TailwindCSS theme
- **sentry.*.config.ts:** Sentry monitoring
- **instrumentation.ts:** OpenTelemetry
- **jest.config.js:** Jest testing
- **playwright.config.ts:** Playwright E2E

---

## Support & Resources

### Documentation
- Main docs: `/docs/`
- Architecture: `CORRECTED_ARCHITECTURE_2025_NATIVE.md`
- Standards: `.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md`

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)

---

**Document Version:** 1.0.0
**Last Updated:** October 23, 2025
**Maintained By:** WeddingFlow Pro Team
