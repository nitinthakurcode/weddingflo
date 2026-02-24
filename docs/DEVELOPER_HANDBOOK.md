# WeddingFlo Developer Handbook

> **Auto-generated from source code on 2026-02-25.**
> Every value in this document was read from actual project files.

---

## Section A: Architecture Overview

### A.1 Core Stack (from package.json)

| Layer            | Package                | Version   |
|------------------|------------------------|-----------|
| Framework        | next                   | ^16.1.6   |
| Language         | typescript             | ^5.9.3    |
| React            | react / react-dom      | ^19.2.4   |
| ORM              | drizzle-orm            | ^0.45.1   |
| ORM Tooling      | drizzle-kit            | ^0.31.9   |
| API Layer        | @trpc/server           | ^11.10.0  |
| tRPC Client      | @trpc/react-query      | ^11.10.0  |
| Query            | @tanstack/react-query  | ^5.90.21  |
| Auth             | better-auth            | ^1.4.18   |
| DB Client        | postgres               | ^3.4.7    |
| AI               | ai (Vercel AI SDK)     | ^5.0.108  |
| AI Provider      | openai                 | ^6.10.0   |
| i18n             | next-intl              | ^4.5.8    |
| Payments         | stripe                 | ^20.3.1   |
| Email            | resend                 | ^6.9.2    |
| SMS              | twilio                 | ^5.10.7   |
| Error Tracking   | @sentry/nextjs         | ^10.29.0  |
| Styling          | tailwindcss            | ^4.2.0    |
| UI Components    | @radix-ui/*            | various   |
| Forms            | react-hook-form        | ^7.68.0   |
| Validation       | zod                    | ^4.3.6    |
| Charts           | recharts               | ^3.5.1    |
| PDF              | @react-pdf/renderer    | ^3.4.5    |
| Excel            | exceljs                | ^4.4.0    |
| PWA              | @ducanh2912/next-pwa   | ^10.2.9   |
| Cache            | @upstash/redis         | ^1.35.6   |
| Analytics        | posthog-js             | ^1.302.2  |
| Canvas           | konva / react-konva    | ^10.0.12  |
| Testing (Unit)   | jest                   | ^30.2.0   |
| Testing (E2E)    | @playwright/test       | ^1.57.0   |
| Testing (Intg)   | vitest                 | ^4.0.18   |

### A.2 Next.js Configuration (next.config.ts)

| Setting                        | Value                                              |
|--------------------------------|----------------------------------------------------|
| reactStrictMode                | true                                               |
| output                         | standalone (Docker)                                |
| typescript.ignoreBuildErrors   | false                                              |
| Plugins (chained)              | Sentry -> next-intl -> PWA -> Bundle Analyzer      |
| Image formats                  | AVIF, WebP                                         |
| Image remote patterns          | *.supabase.co, lh3.googleusercontent.com           |
| Compiler removeConsole         | production only (keep error, warn)                 |
| optimizePackageImports         | lucide-react, @radix-ui/react-icons                |
| Server Actions allowedOrigins  | weddingflow.pro, *.weddingflow.pro, localhost:3000  |
| Security headers               | HSTS, XFO:DENY, nosniff, CSP, Referrer-Policy      |
| Webpack client fallbacks       | fs, net, tls, child_process, path = false           |
| Webpack server externals       | canvas                                             |
| OpenTelemetry client alias     | @opentelemetry/* = false                           |

### A.3 Drizzle Configuration (drizzle.config.ts)

| Setting            | Value                          |
|--------------------|--------------------------------|
| dialect            | postgresql                     |
| schema files       | 9 files (see below)            |
| migrations output  | ./drizzle/migrations           |
| migrations table   | __drizzle_migrations__         |
| schema namespace   | public                         |
| strict mode        | true                           |
| verbose            | true                           |

Schema files registered:
1. `./src/lib/db/schema.ts` (core auth: user, session, account, verification)
2. `./src/lib/db/schema-features.ts` (clients, guests, events, vendors, budget, etc.)
3. `./src/lib/db/schema-pipeline.ts` (CRM pipeline)
4. `./src/lib/db/schema-proposals.ts` (proposals, contracts)
5. `./src/lib/db/schema-workflows.ts` (workflow automation)
6. `./src/lib/db/schema-questionnaires.ts` (client questionnaires)
7. `./src/lib/db/schema-chatbot.ts` (AI chatbot persistence)
8. `./src/lib/db/schema-invitations.ts` (team + wedding invitations)
9. `./src/lib/db/schema-relations.ts` (Drizzle ORM relations)

### A.4 Data Flow

```
 Browser                    Server                        Database
+--------+   HTTP/WSS    +----------+     Drizzle ORM   +-----------+
|        | ------------> | Next.js  | -----------------> | Supabase  |
| React  |   tRPC RPC    | App      |    SQL queries    | PostgreSQL|
| 19     | <------------ | Router   | <----------------- |           |
|        |               |          |                    |           |
| Radix  |   SSE stream  | tRPC     |   @supabase/      | RLS       |
| UI     | <------------ | Routers  |   supabase-js     | Policies  |
|        |               | (40+)    |                    |           |
+--------+               +----------+                    +-----------+
    |                         |                               |
    | useAuth()               | getServerSession()            |
    | (BetterAuth             | (cookie -> session)           |
    |  client)                |                               |
    v                         v                               v
+--------+               +----------+                    +-----------+
| Auth   |   Cookies     | Better   |    Argon2id       | user      |
| Context| <-----------> | Auth     | <----------------> | session   |
| Provid |               | Server   |    bcrypt compat   | account   |
+--------+               +----------+                    +-----------+
    |                         |
    |                    +----------+
    |                    | External |
    |                    | Services |
    |                    +----------+
    |                    | Stripe   |  Payments / Subscriptions
    |                    | Resend   |  Transactional email
    |                    | Twilio   |  SMS
    |                    | OpenAI   |  AI chatbot
    |                    | Google   |  OAuth, Calendar, Sheets
    |                    | Sentry   |  Error tracking
    |                    | PostHog  |  Product analytics
    |                    | Upstash  |  Redis (Pub/Sub, cache)
    |                    | R2/S3    |  File storage
    |                    +----------+
```

### A.5 Directory Tree

```
weddingflo/
├── src/
│   ├── app/                          # Next.js 16 App Router
│   │   ├── [locale]/                 # i18n locale prefix (always)
│   │   │   ├── (auth)/               #   Sign-in, sign-up pages
│   │   │   ├── (dashboard)/          #   Main planner dashboard
│   │   │   ├── (portal)/             #   Client/couple portal
│   │   │   ├── (superadmin)/         #   Super admin panel
│   │   │   ├── (sync)/               #   Real-time sync routes
│   │   │   └── check-in/, qr/, w/    #   Public pages
│   │   ├── api/                      # API routes
│   │   │   ├── auth/                 #   BetterAuth handler
│   │   │   ├── trpc/[trpc]/          #   tRPC HTTP endpoint
│   │   │   ├── chatbot/stream/       #   SSE streaming
│   │   │   ├── stripe/, webhooks/    #   Payment hooks
│   │   │   ├── invite/               #   Invitation acceptance
│   │   │   └── cron/, health/        #   Background jobs, health
│   │   ├── AuthProvider.tsx          # Client auth context
│   │   └── layout.tsx                # Root layout (pass-through)
│   │
│   ├── features/                     # Feature Pocket Architecture (19)
│   │   ├── analytics/                #   Reports, data export
│   │   ├── backup/                   #   Google Sheets sync
│   │   ├── budget/                   #   Budget management
│   │   ├── chatbot/                  #   AI chatbot (SSE, tools)
│   │   ├── clients/                  #   Client + pipeline mgmt
│   │   ├── communications/           #   Email, SMS, WhatsApp, push
│   │   ├── core/                     #   Users, companies, activity
│   │   ├── engagement/               #   Referral programs
│   │   ├── events/                   #   Events, timeline, hotels, vendors
│   │   ├── guests/                   #   Guest mgmt, RSVP, QR, websites
│   │   ├── integrations/             #   Third-party connectors
│   │   ├── media/                    #   Documents, creatives, PDFs
│   │   ├── payments/                 #   Stripe integration
│   │   ├── portal/                   #   Client portal features
│   │   ├── proposals/                #   Proposals, contracts, e-sign
│   │   ├── questionnaires/           #   Client questionnaires
│   │   ├── realtime/                 #   Redis Pub/Sub sync
│   │   ├── team/                     #   Team management
│   │   └── workflows/                #   Workflow automation
│   │
│   ├── components/                   # Shared React components
│   │   ├── ui/                       #   shadcn/ui base components
│   │   ├── onboarding/               #   5-step wizard
│   │   ├── dashboard/                #   Dashboard layouts
│   │   └── ...30+ categories         #   Feature-specific UI
│   │
│   ├── lib/                          # Shared libraries
│   │   ├── auth.ts                   #   BetterAuth main config
│   │   ├── auth-client.ts            #   Client auth hooks
│   │   ├── auth/                     #   Server auth, roles, rate-limit
│   │   ├── db/                       #   Drizzle schema + client
│   │   ├── trpc/                     #   tRPC client + Provider
│   │   └── ...40+ modules            #   Stripe, email, storage, etc.
│   │
│   ├── server/                       # Backend
│   │   └── trpc/routers/_app.ts      #   Main router (40+ sub-routers)
│   │
│   ├── hooks/                        # React hooks
│   ├── types/                        # TypeScript types
│   └── emails/                       # React Email templates
│
├── i18n/                             # Internationalization
│   ├── config.ts                     #   Locales: en,es,fr,de,ja,zh,hi
│   ├── routing.ts                    #   localePrefix: 'always'
│   └── request.ts                    #   Server-side getRequestConfig
│
├── drizzle/migrations/               # SQL migration files
├── tests/, e2e/, __tests__/          # Test suites
├── scripts/                          # Utility scripts
├── public/                           # Static assets
├── docs/                             # Documentation
└── .claude/                          # Claude AI config + standards
```

---

## Section B: Complete Table Reference

### B.1 schema.ts — Core Auth Tables

#### `user` (BetterAuth core + custom fields)
- **PK:** `id` (text)
- **File:** `src/lib/db/schema.ts:11`

| Column                | Type           | Constraints / Default        |
|-----------------------|----------------|------------------------------|
| id                    | text           | PK                           |
| name                  | text           | NOT NULL                     |
| email                 | text           | NOT NULL, UNIQUE             |
| emailVerified         | boolean        | NOT NULL, default false      |
| image                 | text           | nullable                     |
| createdAt             | timestamp      | NOT NULL, defaultNow         |
| updatedAt             | timestamp      | NOT NULL, defaultNow         |
| role                  | text           | default 'company_admin'      |
| companyId             | text           | nullable                     |
| firstName             | text           | nullable                     |
| lastName              | text           | nullable                     |
| avatarUrl             | text           | nullable                     |
| phoneNumber           | text           | nullable                     |
| phoneNumberVerified   | boolean        | default false                |
| preferredLanguage     | text           | default 'en'                 |
| preferredCurrency     | text           | default 'USD'                |
| timezone              | text           | default 'UTC'                |
| autoDetectLocale      | boolean        | default true                 |
| isActive              | boolean        | default true                 |
| onboardingCompleted   | boolean        | default false                |
| banned                | boolean        | default false                |
| banReason             | text           | nullable                     |
| banExpires            | timestamp      | nullable                     |
| twoFactorEnabled      | boolean        | default false                |
| isAnonymous           | boolean        | default false                |

- **Indexes:** `user_company_id_idx(companyId)`, `user_email_idx(email)`

#### `session`
- **PK:** `id` (text)
- **File:** `src/lib/db/schema.ts:54`

| Column      | Type      | Constraints                    |
|-------------|-----------|--------------------------------|
| id          | text      | PK                             |
| userId      | text      | NOT NULL, FK -> user.id CASCADE |
| token       | text      | NOT NULL, UNIQUE               |
| expiresAt   | timestamp | NOT NULL                       |
| ipAddress   | text      | nullable                       |
| userAgent   | text      | nullable                       |
| createdAt   | timestamp | NOT NULL, defaultNow           |
| updatedAt   | timestamp | NOT NULL, defaultNow           |

- **Indexes:** `session_user_id_idx(userId)`, `session_expires_at_idx(expiresAt)`

#### `account`
- **PK:** `id` (text)
- **File:** `src/lib/db/schema.ts:69`

| Column                  | Type      | Constraints                    |
|-------------------------|-----------|--------------------------------|
| id                      | text      | PK                             |
| userId                  | text      | NOT NULL, FK -> user.id CASCADE |
| accountId               | text      | NOT NULL                       |
| providerId              | text      | NOT NULL                       |
| accessToken             | text      | nullable                       |
| refreshToken            | text      | nullable                       |
| accessTokenExpiresAt    | timestamp | nullable                       |
| refreshTokenExpiresAt   | timestamp | nullable                       |
| scope                   | text      | nullable                       |
| password                | text      | nullable                       |
| createdAt               | timestamp | NOT NULL, defaultNow           |
| updatedAt               | timestamp | NOT NULL, defaultNow           |

- **Indexes:** `account_user_id_idx(userId)`

#### `verification`
- **PK:** `id` (text)
- **File:** `src/lib/db/schema.ts:87`

| Column      | Type      | Constraints          |
|-------------|-----------|----------------------|
| id          | text      | PK                   |
| identifier  | text      | NOT NULL             |
| value       | text      | NOT NULL             |
| expiresAt   | timestamp | NOT NULL             |
| createdAt   | timestamp | defaultNow           |
| updatedAt   | timestamp | defaultNow           |

- **Indexes:** `verification_identifier_idx(identifier)`

#### `webhookEvents`
- **PK:** `id` (text)
- **File:** `src/lib/db/schema.ts:99`

| Column      | Type      | Constraints          |
|-------------|-----------|----------------------|
| id          | text      | PK                   |
| provider    | text      | NOT NULL             |
| eventId     | text      | NOT NULL             |
| eventType   | text      | NOT NULL             |
| processed   | boolean   | default false        |
| processedAt | timestamp | nullable             |
| payload     | text      | nullable             |
| error       | text      | nullable             |
| createdAt   | timestamp | NOT NULL, defaultNow |

- **Indexes:** `webhook_events_event_id_idx(eventId)`, `webhook_events_provider_idx(provider)`

#### `rateLimitEntries` (UNLOGGED table)
- **PK:** `key` (text)
- **File:** `src/lib/db/schema.ts:127`

| Column    | Type             | Constraints          |
|-----------|------------------|----------------------|
| key       | text             | PK                   |
| count     | integer          | NOT NULL, default 1  |
| resetAt   | timestamp (tz)   | NOT NULL             |
| createdAt | timestamp (tz)   | NOT NULL, defaultNow |

- **Indexes:** `rate_limit_reset_idx(resetAt)`

---

### B.2 schema-features.ts — Feature Tables

#### `users` (DEPRECATED - use `user` from schema.ts)
- **PK:** `id` (text) | **File:** `schema-features.ts:37`
- 13 columns. Scheduled for removal.

#### `companies`
- **PK:** `id` (uuid, defaultRandom)
- **File:** `schema-features.ts:65`

| Column                | Type      | Constraints             |
|-----------------------|-----------|-------------------------|
| id                    | uuid      | PK, defaultRandom       |
| name                  | text      | NOT NULL                |
| subdomain             | text      | UNIQUE                  |
| logoUrl               | text      | nullable                |
| branding              | jsonb     | nullable                |
| settings              | jsonb     | nullable                |
| subscriptionTier      | text      | default 'free'          |
| subscriptionStatus    | text      | default 'trialing'      |
| stripeCustomerId      | text      | nullable                |
| stripeSubscriptionId  | text      | nullable                |
| trialEndsAt           | timestamp | nullable                |
| subscriptionEndsAt    | timestamp | nullable                |
| aiQueriesThisMonth    | integer   | default 0               |
| aiLastResetAt         | timestamp | nullable                |
| defaultCurrency       | varchar(10) | default 'INR'         |
| supportedCurrencies   | text[]    | nullable                |
| onboardingCompleted   | boolean   | default false           |
| onboardingStep        | integer   | default 1               |
| onboardingStartedAt   | timestamp | nullable                |
| onboardingCompletedAt | timestamp | nullable                |
| onboardingData        | jsonb     | nullable                |
| businessType          | text      | default 'wedding_planner' |
| createdAt             | timestamp | NOT NULL, defaultNow    |
| updatedAt             | timestamp | NOT NULL, defaultNow    |

#### `clients`
- **PK:** `id` (text)
- **File:** `schema-features.ts:93`
- **FKs:** none (companyId is logical FK to companies.id)
- 24 columns: partner1/partner2 names, emails, phones, parent names, wedding details, status, metadata
- **Indexes:** `clients_company_id_idx(companyId)`

#### `clientUsers`
- **PK:** `id` (text)
- **File:** `schema-features.ts:132`
- **FKs:** `clientId -> clients.id CASCADE`
- 8 columns: clientId, companyId, userId, role, relationship, isPrimary, timestamps

#### `guests`
- **PK:** `id` (text, defaultFn crypto.randomUUID)
- **File:** `schema-features.ts:146`
- **FKs:** `clientId -> clients.id CASCADE`
- 33 columns: name, email, phone, group, table, dietary, RSVP, plus-one, party size, travel, hotel, transport, gift, check-in, side
- **Indexes:** `guests_client_id_idx(clientId)`, `guests_rsvp_status_idx(rsvpStatus)`

#### `hotels`
- **PK:** `id` (uuid, defaultRandom)
- **File:** `schema-features.ts:196`
- **FKs:** `clientId -> clients.id CASCADE`, `guestId -> guests.id SET NULL`
- 20 columns: guest name, accommodation, room, check-in/out, cost, currency, payment status, party size
- **Indexes:** `hotels_client_id_idx(clientId)`, `hotels_guest_id_idx(guestId)`

#### `vehicles`
- **PK:** `id` (uuid) | **File:** `schema-features.ts:234`
- 11 columns: vehicleNumber, type, driver, coordinator, status enum, currentTransportId
- **Indexes:** `vehicles_client_id_idx`, `vehicles_vehicle_number_idx`, `vehicles_status_idx`

#### `guestTransport`
- **PK:** `id` (uuid) | **File:** `schema-features.ts:255`
- **FKs:** `clientId -> clients.id CASCADE`, `guestId -> guests.id SET NULL`, `eventId -> events.id SET NULL`
- 19 columns: pickup/drop details, vehicle, driver, leg type enum, leg sequence, event link
- **Indexes:** `guest_transport_client_id_idx`, `guest_transport_guest_id_idx`, `guest_transport_vehicle_id_idx`

#### `events`
- **PK:** `id` (text) | **File:** `schema-features.ts:286`
- **FKs:** `clientId -> clients.id CASCADE`
- 14 columns: title, type, date, start/end time, location, venue, guest count, status, description
- **Indexes:** `events_client_id_idx(clientId)`

#### `timeline`
- **PK:** `id` (text) | **File:** `schema-features.ts:310`
- **FKs:** `clientId -> clients.id CASCADE`, `eventId -> events.id SET NULL`
- 18 columns: title, phase (setup/showtime/wrapup), times, location, participants, responsible, sort order, source module/id for cross-module sync
- **Indexes:** `timeline_client_id_idx`, `timeline_event_id_idx`

#### `timelineTemplates`
- **PK:** `id` (text) | **File:** `schema-features.ts:341`
- 11 columns: companyId, eventType, title, offsetMinutes, durationMinutes, phase, sortOrder, isActive
- **Indexes:** `timeline_templates_company_event_idx(companyId, eventType)`

#### `vendors`
- **PK:** `id` (text) | **File:** `schema-features.ts:360`
- 14 columns: name, category, contact, email, phone, website, contract info, rating, review count, isPreferred
- **Indexes:** `vendors_company_id_idx(companyId)`

#### `clientVendors`
- **PK:** `id` (text) | **File:** `schema-features.ts:383`
- **FKs:** `clientId -> clients.id CASCADE`, `vendorId -> vendors.id CASCADE`, `eventId -> events.id SET NULL`
- 19 columns: contract/deposit amounts, payment status, venue/POC details, deliverables, approval
- **Indexes:** `client_vendors_client_id_idx`, `client_vendors_vendor_id_idx`, `client_vendors_company_id_idx`

#### `vendorComments`
- **PK:** `id` (text) | **File:** `schema-features.ts:418`
- **FKs:** `vendorId -> vendors.id CASCADE`
- 5 columns: vendorId, userId, content, timestamps

#### `vendorReviews`
- **PK:** `id` (text) | **File:** `schema-features.ts:428`
- **FKs:** `vendorId -> vendors.id CASCADE`, `clientId -> clients.id CASCADE`
- 10 columns: rating (1-5), reviewText, sub-ratings (serviceQuality, communication, valueForMoney), wouldRecommend
- **Indexes:** `vendor_reviews_vendor_id_idx`, `vendor_reviews_client_id_idx`

#### `budget`
- **PK:** `id` (text) | **File:** `schema-features.ts:447`
- **FKs:** `clientId -> clients.id CASCADE`, `vendorId -> vendors.id SET NULL`, `eventId -> events.id SET NULL`
- 19 columns: category, segment, item, estimated/actual cost, paid amount, payment status, per-guest cost tracking, client visibility
- **Indexes:** `budget_client_id_idx(clientId)`

#### `advancePayments`
- **PK:** `id` (text) | **File:** `schema-features.ts:477`
- **FKs:** `budgetItemId -> budget.id CASCADE`, `vendorId -> vendors.id SET NULL`
- 9 columns: amount, paymentDate, paymentMode, paidBy, notes
- **Indexes:** `advance_payments_budget_item_id_idx(budgetItemId)`

#### `documents`
- **PK:** `id` (text) | **File:** `schema-features.ts:495`
- **FKs:** `clientId -> clients.id CASCADE`
- 7 columns: name, url, type, size, timestamps
- **Indexes:** `documents_client_id_idx(clientId)`

#### `calendarSyncSettings`
- **PK:** `id` (text) | **File:** `schema-features.ts:509`
- 7 columns: userId, provider (default 'google'), access/refresh tokens, enabled

#### `calendarSyncedEvents`
- **PK:** `id` (text) | **File:** `schema-features.ts:521`
- **FKs:** `eventId -> events.id CASCADE`
- 6 columns: settingsId, eventId, externalId, syncedAt

#### `generatedReports`
- **PK:** `id` (text) | **File:** `schema-features.ts:532`
- **FKs:** `clientId -> clients.id CASCADE`
- 5 columns: clientId, userId, type, data (jsonb)

#### `scheduledReports`
- **PK:** `id` (text) | **File:** `schema-features.ts:542`
- 7 columns: userId, type, schedule, enabled, lastRun

#### `emailLogs` / `smsLogs` / `whatsappLogs` / `pushLogs`
- Communication log tables (files: schema-features.ts:556-625)
- Each has: id, clientId/userId, to/message/subject, status, createdAt

#### `emailPreferences` / `smsPreferences` / `pushNotificationPreferences`
- User communication preferences (files: schema-features.ts:568-974)

#### `smsTemplates` / `whatsappTemplates` / `thankYouNoteTemplates`
- Company-scoped message templates (files: schema-features.ts:588-750)

#### `pushSubscriptions`
- **PK:** `id` (text) | **File:** `schema-features.ts:628`
- 5 columns: userId, endpoint, keys (jsonb)

#### `floorPlans`
- **PK:** `id` (text) | **File:** `schema-features.ts:638`
- **FKs:** `clientId -> clients.id CASCADE`, `eventId -> events.id SET NULL`
- 10 columns: name, width, height, backgroundImage, layout (jsonb), metadata (jsonb)
- **Indexes:** `floor_plans_client_id_idx(clientId)`

#### `floorPlanTables`
- **PK:** `id` (text) | **File:** `schema-features.ts:656`
- **FKs:** `floorPlanId -> floorPlans.id CASCADE`
- 12 columns: name, tableNumber, shape, capacity, x, y, width, height, rotation

#### `floorPlanGuests`
- **PK:** `id` (text) | **File:** `schema-features.ts:675`
- **FKs:** `floorPlanId -> floorPlans.id CASCADE`, `tableId -> floorPlanTables.id CASCADE`, `guestId -> guests.id SET NULL`
- 7 columns: seatNumber, x, y

#### `gifts` / `giftsEnhanced` / `giftCategories` / `giftItems` / `giftTypes` / `guestGifts`
- Gift tracking tables (files: schema-features.ts:688-888)
- Gifts received from guests + gifts given to guests, with categories and types

#### `creativeJobs`
- **PK:** `id` (text) | **File:** `schema-features.ts:753`
- **FKs:** `clientId -> clients.id CASCADE`
- 7 columns: name, type, status, data (jsonb)

#### `websiteBuilderLayouts` / `websiteBuilderPages` / `websiteBuilderContent`
- Website builder system (files: schema-features.ts:767-790)

#### `qrCodes`
- **PK:** `id` (text) | **File:** `schema-features.ts:793`
- **FKs:** `clientId -> clients.id CASCADE`
- 5 columns: guestId, code (UNIQUE), scannedAt

#### `messages`
- **PK:** `id` (text) | **File:** `schema-features.ts:805`
- 14 columns: companyId, clientId, guestId, sender/receiver, subject, content, messageType, isRead, parentId, metadata
- **Indexes:** `messages_company_id_idx(companyId)`

#### `payments`
- **PK:** `id` (text) | **File:** `schema-features.ts:828`
- **FKs:** `clientId -> clients.id CASCADE`
- 6 columns: amount (real), status, stripeId

#### `stripeConnectAccounts` / `stripeAccounts`
- Stripe integration tables (files: schema-features.ts:841-1040)

#### `hotelBookings`
- **PK:** `id` (text) | **File:** `schema-features.ts:855`
- **FKs:** `hotelId -> hotels.id CASCADE`, `guestId -> guests.id CASCADE`
- 7 columns: checkIn, checkOut, roomType, status

#### `googleCalendarTokens`
- **PK:** `id` (text) | **File:** `schema-features.ts:868`
- 6 columns: userId, access/refresh tokens, expiresAt

#### `guestPreferences` / `guestConflicts`
- Guest relationship tables (files: schema-features.ts:891-907)

#### `activity`
- **PK:** `id` (text) | **File:** `schema-features.ts:910`
- 11 columns: userId, companyId, clientId, type, action, data (jsonb), ipAddress, userAgent, read
- **Indexes:** `activity_client_id_idx`, `activity_user_id_idx`, `activity_company_id_idx`, `activity_type_action_idx`

#### `icalFeedTokens`
- **PK:** `id` (text) | **File:** `schema-features.ts:930`
- 5 columns: userId, token (UNIQUE), clientId, expiresAt

#### `invoices`
- **PK:** `id` (text) | **File:** `schema-features.ts:940`
- **FKs:** `clientId -> clients.id CASCADE`
- 8 columns: amount, status, dueDate, paidAt, stripeInvoiceId

#### `refunds`
- **PK:** `id` (text) | **File:** `schema-features.ts:977`
- 6 columns: paymentId, amount, reason, status, stripeRefundId

#### `seatingChangeLog` / `seatingVersions`
- Floor plan versioning (files: schema-features.ts:988-1005)

#### `teamClientAssignments`
- **PK:** `id` (text) | **File:** `schema-features.ts:1043`
- **FKs:** `clientId -> clients.id CASCADE`
- 5 columns: teamMemberId, clientId, role (default 'assigned')

#### `weddingWebsites`
- **PK:** `id` (text) | **File:** `schema-features.ts:1053`
- **FKs:** `clientId -> clients.id CASCADE`
- 12 columns: subdomain (UNIQUE), customDomain, theme, settings/content (jsonb), published, password

#### `accommodations`
- **PK:** `id` (uuid) | **File:** `schema-features.ts:1071`
- **FKs:** `clientId -> clients.id CASCADE`
- 14 columns: name, address, city, phone, email, check-in/out times, amenities (text[]), roomTypes (jsonb), isDefault
- **Indexes:** `accommodations_client_id_idx(clientId)`

#### `notifications`
- **PK:** `id` (uuid) | **File:** `schema-features.ts:1094`
- 8 columns: companyId, userId, type, title, message, metadata (jsonb), isRead, readAt
- **Indexes:** `notifications_company_id_idx`, `notifications_user_id_idx`, `notifications_is_read_idx`, `notifications_created_at_idx`

#### `jobQueue`
- **PK:** `id` (uuid) | **File:** `schema-features.ts:1113`
- 11 columns: companyId, type, payload (jsonb), status, scheduledAt, attempts, maxAttempts, error
- **Indexes:** `job_queue_status_scheduled_idx(status, scheduledAt)`, `job_queue_company_id_idx`

#### `googleSheetsSyncSettings`
- **PK:** `id` (uuid) | **File:** `schema-features.ts:1133`
- 14 columns: userId, companyId, OAuth tokens, spreadsheet info, sync direction, auto-sync config
- **Indexes:** `google_sheets_sync_user_id_idx`, `google_sheets_sync_company_id_idx`

---

### B.3 schema-pipeline.ts — CRM Pipeline Tables

**Enums:** `leadStatusEnum` (new|contacted|qualified|proposal_sent|negotiating|won|lost), `activityTypeEnum` (note|call|email|meeting|task|stage_change|proposal_sent|follow_up)

#### `pipelineStages`
- **PK:** `id` (uuid) | **File:** `schema-pipeline.ts:23`
- 10 columns: companyId, name, description, color, sortOrder, isDefault, isWon, isLost, isActive
- **Indexes:** `pipeline_stages_company_idx`, `pipeline_stages_sort_idx(companyId, sortOrder)`

#### `pipelineLeads`
- **PK:** `id` (uuid) | **File:** `schema-pipeline.ts:44`
- 28 columns: contact info (firstName, lastName, email, phone), partner info, wedding details, source, priority, score (0-100), assigneeId, status enum, conversion tracking, tags (text[]), metadata (jsonb)
- **Indexes:** `pipeline_leads_company_idx`, `pipeline_leads_stage_idx`, `pipeline_leads_assignee_idx`, `pipeline_leads_status_idx`, `pipeline_leads_email_idx`

#### `pipelineActivities`
- **PK:** `id` (uuid) | **File:** `schema-pipeline.ts:106`
- 13 columns: leadId, companyId, userId, type enum, title, description, stage change tracking, task tracking (dueAt, completedAt, isCompleted)
- **Indexes:** `pipeline_activities_lead_idx`, `pipeline_activities_company_idx`, `pipeline_activities_user_idx`, `pipeline_activities_type_idx`

---

### B.4 schema-proposals.ts — Proposals & Contracts

**Enums:** `proposalStatusEnum` (draft|sent|viewed|accepted|declined|expired), `contractStatusEnum` (draft|pending_signature|signed|expired|cancelled)

#### `proposalTemplates`
- **PK:** `id` (uuid) | **File:** `schema-proposals.ts:24`
- 12 columns: companyId, name, description, introText, termsText, signatureText, defaultPackages (jsonb), headerImageUrl, accentColor, isActive, isDefault

#### `proposals`
- **PK:** `id` (uuid) | **File:** `schema-proposals.ts:54`
- 28 columns: companyId, templateId, leadId, clientId, title, proposalNumber, status enum, recipient info, wedding details, content, pricing (subtotal/discount/tax/total with numeric(15,2)), validity dates, publicToken (UNIQUE), client response + signature (jsonb)
- **Indexes:** `proposals_company_idx`, `proposals_lead_idx`, `proposals_client_idx`, `proposals_status_idx`, `proposals_public_token_idx`

#### `contractTemplates`
- **PK:** `id` (uuid) | **File:** `schema-proposals.ts:123`
- 12 columns: companyId, name, description, content (text with {{variables}}), availableVariables (text[]), signature config

#### `contracts`
- **PK:** `id` (uuid) | **File:** `schema-proposals.ts:153`
- 28 columns: companyId, templateId, proposalId, clientId, title, contractNumber, status enum, client info, wedding details, content, payment terms (jsonb schedule), publicToken (UNIQUE), client/planner signature data (jsonb), fullyExecutedAt, pdfUrl
- **Indexes:** `contracts_company_idx`, `contracts_client_idx`, `contracts_proposal_idx`, `contracts_status_idx`, `contracts_public_token_idx`

---

### B.5 schema-workflows.ts — Workflow Automation

**Enums:** `workflowTriggerTypeEnum` (lead_stage_change|client_created|event_date_approaching|payment_overdue|rsvp_received|proposal_accepted|contract_signed|scheduled|manual), `workflowStepTypeEnum` (send_email|send_sms|send_whatsapp|wait|condition|create_task|update_lead|update_client|create_notification|webhook), `workflowExecutionStatusEnum` (running|waiting|completed|failed|cancelled)

#### `workflows`
- **PK:** `id` (uuid) | **File:** `schema-workflows.ts:54`
- 12 columns: companyId, name, description, triggerType enum, triggerConfig (jsonb), cronExpression, timezone, isActive, isTemplate

#### `workflowSteps`
- **PK:** `id` (uuid) | **File:** `schema-workflows.ts:86`
- 14 columns: workflowId, stepType enum, stepOrder, name, config (jsonb), wait duration/unit, condition fields, onTrueStepId/onFalseStepId (self-FK)

#### `workflowExecutions`
- **PK:** `id` (uuid) | **File:** `schema-workflows.ts:121`
- 14 columns: workflowId, companyId, triggerType, triggerData (jsonb), entityType/entityId, status enum, currentStepId, nextResumeAt, executionData (jsonb), error

#### `workflowExecutionLogs`
- **PK:** `id` (uuid) | **File:** `schema-workflows.ts:161`
- 10 columns: executionId, stepId, stepType, stepName, status, message, inputData/outputData (jsonb), error

---

### B.6 schema-questionnaires.ts — Questionnaires

**Enums:** `questionTypeEnum` (text|textarea|number|date|time|datetime|select|multi_select|checkbox|radio|rating|file_upload|image_upload|color_picker|scale), `questionnaireStatusEnum` (draft|sent|viewed|in_progress|completed|expired)

#### `questionnaireTemplates`
- **PK:** `id` (uuid) | **File:** `schema-questionnaires.ts:54`
- 10 columns: companyId, name, description, category, questions (jsonb QuestionDefinition[]), isDefault, isActive, metadata (jsonb)

#### `questionnaires`
- **PK:** `id` (uuid) | **File:** `schema-questionnaires.ts:77`
- 15 columns: companyId, templateId (FK -> questionnaireTemplates SET NULL), clientId, eventId, name, description, questions (jsonb), status enum, publicToken (UNIQUE), sent/viewed/completed/expires/reminderSent timestamps

#### `questionnaireResponses`
- **PK:** `id` (uuid) | **File:** `schema-questionnaires.ts:112`
- **FKs:** `questionnaireId -> questionnaires.id CASCADE`
- 5 columns: questionnaireId, questionId, answer (jsonb QuestionAnswer), answeredAt, updatedAt

---

### B.7 schema-chatbot.ts — AI Chatbot

#### `chatbotConversations`
- **PK:** `id` (uuid) | **File:** `schema-chatbot.ts:20`
- **FKs:** `userId -> user.id CASCADE`, `clientId -> clients.id SET NULL`
- 8 columns: userId, clientId, companyId, title, summary, messageCount, lastMessageAt
- **Indexes:** `idx_chatbot_conv_user`, `idx_chatbot_conv_user_company`, `idx_chatbot_conv_updated`

#### `chatbotMessages`
- **PK:** `id` (uuid) | **File:** `schema-chatbot.ts:44`
- **FKs:** `conversationId -> chatbotConversations.id CASCADE`
- 8 columns: conversationId, companyId, role (user|assistant|system|tool), content, toolName, toolArgs (jsonb), toolResult (jsonb), status
- **Indexes:** `idx_chatbot_msg_conv`, `idx_chatbot_msg_created`

#### `chatbotCommandTemplates`
- **PK:** `id` (uuid) | **File:** `schema-chatbot.ts:67`
- **FKs:** `userId -> user.id CASCADE`
- 11 columns: userId, companyId, name, command, description, icon, category, usageCount, lastUsedAt, isPinned
- **Indexes:** `idx_chatbot_templates_user`, `idx_chatbot_templates_user_company`, `idx_chatbot_templates_pinned`

#### `chatbotPendingCalls` (UNLOGGED table)
- **PK:** `id` (text, caller-supplied) | **File:** `schema-chatbot.ts:124`
- 7 columns: userId, companyId, toolName, args (jsonb), preview (jsonb DbToolPreview), expiresAt
- **Indexes:** `idx_pending_calls_user`, `idx_pending_calls_expires`

---

### B.8 schema-invitations.ts — Invitations

#### `teamInvitations`
- **PK:** `id` (uuid) | **File:** `schema-invitations.ts:19`
- 9 columns: companyId, email, role (default 'staff'), token (UNIQUE), invitedBy, expiresAt, acceptedAt, acceptedBy
- **Indexes:** `team_invitations_token_idx`, `team_invitations_email_idx`, `team_invitations_company_id_idx`

#### `weddingInvitations`
- **PK:** `id` (uuid) | **File:** `schema-invitations.ts:45`
- 10 columns: clientId, companyId, email, relationship (bride|groom|family_bride|family_groom|other), token (UNIQUE), invitedBy, expiresAt, acceptedAt, acceptedBy
- **Indexes:** `wedding_invitations_token_idx`, `wedding_invitations_email_idx`, `wedding_invitations_client_id_idx`

---

### B.9 Table Count Summary

| Schema File              | Table Count |
|--------------------------|-------------|
| schema.ts                | 6           |
| schema-features.ts       | 51          |
| schema-pipeline.ts       | 3           |
| schema-proposals.ts      | 4           |
| schema-workflows.ts      | 4           |
| schema-questionnaires.ts | 3           |
| schema-chatbot.ts        | 4           |
| schema-invitations.ts    | 2           |
| **Total**                | **77**      |

---

## Section C: User Flows

### C.1 Authentication Architecture

**System:** BetterAuth (cookie-based sessions)
**Config file:** `src/lib/auth.ts` (291 lines)

| Setting              | Value                                                       |
|----------------------|-------------------------------------------------------------|
| Database             | Drizzle adapter, PostgreSQL                                 |
| Password hashing     | Argon2id (with transparent bcrypt migration)                |
| Session expiry       | 7 days (`expiresIn: 60 * 60 * 24 * 7`)                     |
| Session update age   | 1 day (`updateAge: 60 * 60 * 24`)                           |
| Cookie cache         | 5 minutes (`cookieCache.maxAge: 300`)                       |
| Secure cookies       | Production only                                             |
| 2FA                  | TOTP (Google Authenticator) + email OTP backup              |
| Social login         | Google OAuth with account linking                           |
| Email provider       | Resend (verification + password reset)                      |
| Trusted origins      | weddingflow.pro, localhost:3000                              |

**Roles (UserRole type from `src/lib/auth/types.ts`):**
- `super_admin` — Platform owner, full access
- `company_admin` — Company owner, manages team and clients
- `staff` — Team member, assigned to clients
- `client_user` — Wedding client/couple, portal access only

**Custom user fields (BetterAuth additionalFields):**
- `role`, `companyId`, `onboardingCompleted`, `firstName`, `lastName`

### C.2 Sign-Up Flow (Company Admin)

**Page:** `src/app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx` (354 lines)

```
1. User visits /en/sign-up
2. Fills form: name, email, password, confirm password
   - Password validation: 8+ characters
   - Optional: Cloudflare Turnstile CAPTCHA
   - Optional: ?ref=CODE in URL captured for referral tracking
3. Submits -> signUpWithEmail(email, password, name) from auth-client.ts
4. BetterAuth creates:
   - user record (role: 'company_admin', onboardingCompleted: false)
   - account record (providerId: 'credential')
   - session record (7-day expiry)
5. Sets session cookie -> redirects to /dashboard
6. Dashboard layout checks onboardingCompleted === false
7. Redirects to /dashboard/onboard
```

**Alternative: Google Sign-Up**
```
1. User clicks "Continue with Google" button
2. Safari: server-side redirect to /api/auth/google (cookie compat)
   Other browsers: Google One Tap frictionless flow
3. BetterAuth creates user with Google profile data
4. Account linked with providerId: 'google'
5. Same redirect flow -> onboarding
```

### C.3 Sign-In Flow (Company Admin / Staff)

**Page:** `src/app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx` (228 lines)

```
1. User visits /en/sign-in
2. Email/password form + optional Turnstile CAPTCHA
3. signInWithEmail(email, password) from auth-client.ts
4. BetterAuth verifies credentials (Argon2id or migrated bcrypt)
5. Creates session -> sets cookie
6. If 2FA enabled: redirects to 2FA verification page
7. Redirect to /dashboard (or /dashboard/onboard if not onboarded)
```

**Google One Tap (non-Safari):**
```
1. Google One Tap prompt appears automatically
2. User taps -> credential sent to BetterAuth
3. Account linking: matches by email if user exists
4. Session created -> redirect
```

### C.4 Super Admin Sign-In

**Page:** `src/app/[locale]/(superadmin)/superadmin/sign-in/[[...sign-in]]/page.tsx` (148 lines)

```
1. Restricted dark-themed UI: "Authorized Personnel Only"
2. Email/password only (no Google OAuth)
3. Post-login role check: must have role === 'super_admin'
4. Redirect to /superadmin/dashboard
```

### C.5 Password Reset Flow

**Configured in:** `src/lib/auth.ts` (emailAndPassword section)

```
1. User clicks "Forgot Password" on sign-in page
2. Enters email -> BetterAuth sends reset email via Resend
3. Email contains link with verification token
4. User clicks link -> enters new password
5. BetterAuth hashes with Argon2id -> updates account.password
6. User can sign in with new password
```

### C.6 Two-Factor Authentication (2FA)

**Configured in:** `src/lib/auth.ts` (twoFactor plugin)
**Client helpers:** `src/lib/auth-client.ts` (enable2FA, verify2FA, etc.)

```
Enable:
1. User goes to security settings
2. enable2FA() -> BetterAuth generates TOTP secret
3. User scans QR code with Google Authenticator
4. User enters 6-digit code to verify -> 2FA activated
5. user.twoFactorEnabled set to true

Sign-in with 2FA:
1. Normal email/password sign-in
2. BetterAuth detects 2FA enabled
3. Redirects to 2FA verification page
4. User enters TOTP code from authenticator app
   OR requests email OTP backup via send2FAOtp()
5. verify2FA(code) or verify2FAWithOtp(code)
6. Session created on success
```

### C.7 Company Creation & Onboarding

**Page:** `src/app/[locale]/(dashboard)/dashboard/onboard/page.tsx` (222 lines)
**Components:** `src/components/onboarding/` (5 step components)

```
Step 1 — Welcome (WelcomeStep.tsx, 95 lines)
  - Platform feature overview: clients, timelines, budgets, messaging,
    documents, registry, vendors, tasks
  - "Skip" or "Continue" buttons

Step 2 — Company Info (CompanyInfoStep.tsx, 125 lines)
  - Company name (required, Zod validated)
  - Business email (required)
  - Phone (optional)
  - Website URL (optional, URL validation)
  - About business (textarea)
  - tRPC: createCompany or updateCompany mutation

Step 3 — Preferences (PreferencesStep.tsx, 172 lines)
  - Currency: USD, EUR, GBP, CAD, AUD, JPY, CHF
  - Language: en, es, fr, de, ja
  - Timezone: 8 major zones (US Eastern through Tokyo)
  - tRPC: updateUserPreferences mutation

Step 4 — First Client (FirstClientStep.tsx, 175 lines)  [OPTIONAL]
  - Partner 1 name (required)
  - Partner 2 name (required)
  - Email (required)
  - Phone (optional)
  - Wedding date (calendar picker)
  - Vendors (comma-separated, "Category: Name" format)
  - tRPC: createClient mutation

Step 5 — Completion (CompletionStep.tsx, 78 lines)
  - Confetti animation
  - Next steps checklist
  - "Go to Dashboard" button
  - tRPC: completeOnboarding mutation
  - Sets sessionStorage.weddingflo_just_onboarded = 'true'
    (triggers product tour on dashboard)
```

**Resume logic:** Onboarding auto-saves progress via `updateProgress` tRPC. If interrupted, resumes from last incomplete step.

### C.8 Team Invitation Flow

**Schema:** `teamInvitations` in `src/lib/db/schema-invitations.ts:19`

```
1. INVITE: Company admin creates team invitation
   - Sets: email, role ('staff' | 'company_admin'), companyId
   - Generates unique token, expiresAt (configurable)
   - tRPC: teamRouter.invite mutation
   - Sends invitation email via Resend

2. ACCEPT: Invited user receives email
   - Clicks link -> /sign-up?token=<TOKEN>&type=team
   - If new user: sign-up form with email pre-filled
   - If existing user: auto-accept if email matches

3. COMPLETE: On successful signup/acceptance
   - API /api/invite/accept validates token
   - Sets user.role from invitation.role
   - Sets user.companyId from invitation.companyId
   - Marks invitation: acceptedAt = now, acceptedBy = user.id
   - Redirects to /dashboard
```

### C.9 Client Portal Invitation Flow (Wedding Couples)

**Schema:** `weddingInvitations` in `src/lib/db/schema-invitations.ts:45`
**Page:** `src/app/[locale]/(portal)/portal/sign-up/[token]/page.tsx` (262 lines)

```
1. INVITE: Company admin invites couple to wedding portal
   - Sets: email, clientId, companyId, relationship
     (bride | groom | family_bride | family_groom | other)
   - Generates unique token, expiresAt
   - Sends wedding invitation email

2. VALIDATE: Couple clicks email link
   - GET /api/invite/accept?token=<TOKEN>&type=wedding
   - Returns: invitation data (email, relationship, client info)
   - Page shows invitation details with wedding-themed UI (pink/rose)

3. SCENARIOS:
   a) Already authenticated, email matches:
      - Auto-accept without form
      - POST /api/invite/accept -> links user to client
   b) Already authenticated, email mismatch:
      - Error: "This invitation was sent to <email>"
      - Must sign out and use correct account
   c) Not authenticated (new user):
      - Sign-up form: name + password (email pre-filled, disabled)
      - Creates user with role: 'client_user'

4. COMPLETE: On acceptance
   - Creates clientUsers record linking user to wedding client
   - Sets: clientId, companyId, relationship, isPrimary
   - Marks invitation: acceptedAt, acceptedBy
   - Redirects to /portal/dashboard
```

### C.10 Client Portal Sign-In

**Page:** `src/app/[locale]/(portal)/portal/sign-in/[[...sign-in]]/page.tsx` (208 lines)

```
1. Wedding-themed sign-in (pink/rose gradient)
2. Email/password + Google OAuth options
3. Note displayed: "Don't have an account? Contact your wedding
   planner for an invitation link."
4. On success -> redirects to /portal/dashboard
5. Portal shows: checklist, timeline, payments, photos
```

### C.11 Session Management

**Server-side:** `src/lib/auth/server.ts` (62 lines)
```typescript
import { getServerSession } from '@/lib/auth/server'
const { userId, user } = await getServerSession()
// Returns: { userId, user, session } | { userId: null, user: null, session: null }
// Calls auth.api.getSession() directly — no HTTP roundtrip
```

**Client-side:** `src/lib/auth-client.ts` (155 lines)
```typescript
import { useAuth } from '@/lib/auth-client'
const { user, isAuthenticated, isLoading } = useAuth()
// Uses AuthContext from AuthProvider for hydration-safe state
```

**Hydration strategy:** `src/app/AuthProvider.tsx` (157 lines)
```
1. Locale layout fetches server session via getServerSession()
2. Passes as initialSession to AuthProvider
3. AuthProvider renders server data immediately (no loading flash)
4. BetterAuth client-side session subscription takes over
5. Once BetterAuth loads, its data replaces server data
6. Prevents hydration mismatch between SSR and client
```

### C.12 Role-Based Access Summary

| Role           | Dashboard | Portal | SuperAdmin | API Access         |
|----------------|-----------|--------|------------|--------------------|
| super_admin    | Full      | -      | Full       | All routes         |
| company_admin  | Full      | -      | -          | Company-scoped     |
| staff          | Assigned  | -      | -          | Client-scoped      |
| client_user    | -         | Full   | -          | Own wedding only   |

**Type guards from `src/lib/auth/types.ts`:**
- `isAuthenticated(session)` — has valid userId
- `isSuperAdmin(user)` — role === 'super_admin'
- `isCompanyAdmin(user)` — role === 'company_admin'
- `hasAdminAccess(user)` — super_admin OR company_admin
- `hasDashboardAccess(user)` — super_admin, company_admin, OR staff
- `hasCompanyContext(user)` — has non-null companyId

---

## Section D: Feature Module Map

### D.1 Guests Module

**Router:** `src/features/guests/server/routers/guests.router.ts`

| Procedure       | Type     | Description                          |
|------------------|----------|--------------------------------------|
| getAll           | query    | List all guests for a client         |
| getById          | query    | Get single guest by ID               |
| getStats         | query    | Aggregate guest statistics           |
| getDietaryStats  | query    | Dietary breakdown statistics         |
| create           | mutation | Add a new guest                      |
| update           | mutation | Update guest fields                  |
| delete           | mutation | Remove a guest                       |
| bulkImport       | mutation | Bulk import guests from Excel        |
| updateRSVP       | mutation | Update RSVP status for a guest       |
| checkIn          | mutation | Mark guest as checked in             |

**DB Tables:** `guests`, `qrCodes`, `guestPreferences`, `guestConflicts`
**Frontend:** `src/features/guests/` (guest list, dialogs, RSVP forms)
**broadcastSync queryPaths:**
- insert/update: `['guests.getAll', 'guests.getStats', 'hotels.getAll', 'guestTransport.getAll', 'timeline.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll']`
- delete: same as insert/update
- updateRSVP: `['guests.getAll', 'guests.getStats', 'budget.getSummary', 'clients.list', 'clients.getAll']`
- checkIn: `['guests.getAll', 'guests.getStats']`

---

### D.2 Budget Module

**Router:** `src/features/analytics/server/routers/budget.router.ts`

| Procedure         | Type     | Description                          |
|--------------------|----------|--------------------------------------|
| getAll             | query    | List all budget items for a client   |
| getSummary         | query    | Budget totals + breakdown            |
| getByCategory      | query    | Group by category                    |
| create             | mutation | Add a budget line item               |
| update             | mutation | Update budget item                   |
| delete             | mutation | Remove budget item                   |
| addAdvancePayment  | mutation | Record a payment against an item     |
| updateAdvancePayment | mutation | Edit existing payment              |
| deleteAdvancePayment | mutation | Remove a payment record            |
| bulkImport         | mutation | Bulk import budget items             |
| getCategories      | query    | List available categories            |
| recalcPerGuest     | mutation | Recalculate per-guest cost items     |
| getPaymentHistory  | query    | Payment history for an item          |
| getVendorBudget    | query    | Budget items linked to a vendor      |
| getCurrencyRates   | query    | Exchange rates for conversion        |

**DB Tables:** `budget`, `advancePayments`
**Frontend:** `src/features/budget/` (budget table, payment dialogs)
**broadcastSync queryPaths:**
- all mutations: `['budget.getAll', 'budget.getSummary', 'clients.list', 'clients.getAll']`

---

### D.3 Timeline Module

**Router:** `src/features/events/server/routers/timeline.router.ts`

| Procedure         | Type     | Description                          |
|--------------------|----------|--------------------------------------|
| getAll             | query    | List timeline items for a client     |
| getStats           | query    | Timeline statistics                  |
| getByEvent         | query    | Filter by event                      |
| create             | mutation | Add a timeline item                  |
| update             | mutation | Update timeline item                 |
| delete             | mutation | Remove timeline item                 |
| reorder            | mutation | Change sort order                    |
| toggleComplete     | mutation | Mark item completed/incomplete       |
| bulkCreate         | mutation | Bulk insert from templates           |
| shiftAll           | mutation | Shift all items by time offset       |
| getTemplates       | query    | List timeline templates              |
| applyTemplate      | mutation | Apply template to create items       |

**DB Tables:** `timeline`, `timelineTemplates`
**Frontend:** `src/features/events/` (timeline view, template dialogs)
**broadcastSync queryPaths:**
- all mutations: `['timeline.getAll', 'timeline.getStats']`

---

### D.4 Vendors Module

**Router:** `src/features/events/server/routers/vendors.router.ts`

| Procedure           | Type     | Description                          |
|----------------------|----------|--------------------------------------|
| getAll               | query    | List all client vendors              |
| getById              | query    | Get single client vendor             |
| getStats             | query    | Vendor statistics                    |
| getCategories        | query    | List vendor categories               |
| create               | mutation | Add vendor + link to client          |
| update               | mutation | Update client vendor details         |
| delete               | mutation | Remove client vendor                 |
| updatePayment        | mutation | Update payment status                |
| addComment           | mutation | Add comment to vendor                |
| deleteComment        | mutation | Remove a comment                     |
| updateDeliverables   | mutation | Update deliverables/approval         |
| bulkImport           | mutation | Bulk import vendors                  |
| addAdvancePayment    | mutation | Record vendor payment                |
| updateAdvancePayment | mutation | Edit vendor payment                  |
| deleteAdvancePayment | mutation | Remove vendor payment                |
| addReview            | mutation | Add vendor review with sub-ratings   |
| deleteReview         | mutation | Remove vendor review                 |
| getReviews           | query    | List reviews for a vendor            |
| getPaymentHistory    | query    | Payment history for vendor           |
| getPreferred         | query    | List preferred vendors               |

**DB Tables:** `vendors`, `clientVendors`, `vendorComments`, `vendorReviews`
**Frontend:** `src/features/events/` (vendor list, vendor detail, payment forms)
**broadcastSync queryPaths:**
- create/update/delete: `['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary', 'timeline.getAll']`
- updatePayment: `['vendors.getAll', 'vendors.getStats']`
- addComment/deleteComment: `['vendors.getAll']`
- updateDeliverables: `['vendors.getAll', 'vendors.getStats']`
- bulkImport: `['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary']`
- advance payments: `['vendors.getAll', 'vendors.getStats', 'budget.getAll', 'budget.getSummary']`
- reviews: `['vendors.getAll', 'vendors.getStats']`

---

### D.5 Hotels Module

**Router:** `src/features/events/server/routers/hotels.router.ts`

| Procedure         | Type     | Description                          |
|--------------------|----------|--------------------------------------|
| getAll             | query    | List all hotel bookings for client   |
| getById            | query    | Get single booking                   |
| getStats           | query    | Accommodation statistics             |
| create             | mutation | Add a hotel booking                  |
| update             | mutation | Update booking details               |
| delete             | mutation | Remove a booking                     |
| checkIn            | mutation | Mark guest as checked in at hotel    |
| bulkCreate         | mutation | Bulk create hotel bookings           |
| getAccommodations  | query    | List accommodation properties        |
| syncFromGuests     | mutation | Create bookings from guest records   |

**DB Tables:** `hotels`, `hotelBookings`, `accommodations`
**Frontend:** `src/features/events/` (hotel assignment table, booking dialogs)
**broadcastSync queryPaths:**
- create/update/delete/bulkCreate: `['hotels.getAll', 'timeline.getAll']`
- checkIn: `['hotels.getAll']`

---

### D.6 Transport Module

**Router:** `src/features/events/server/routers/guest-transport.router.ts`

| Procedure         | Type     | Description                          |
|--------------------|----------|--------------------------------------|
| getAll             | query    | List transport assignments           |
| getById            | query    | Get single transport record          |
| getStats           | query    | Transport statistics                 |
| create             | mutation | Add transport assignment             |
| update             | mutation | Update transport details             |
| delete             | mutation | Remove transport record              |
| bulkCreate         | mutation | Bulk assign transport                |
| getVehicles        | query    | List available vehicles              |
| syncFromGuests     | mutation | Auto-create from guest records       |

**DB Tables:** `guestTransport`, `vehicles`
**Frontend:** `src/features/events/` (transport table, vehicle dialogs)
**broadcastSync queryPaths:**
- all mutations: `['guestTransport.getAll', 'timeline.getAll']`

---

### D.7 Floor Plans Module

**Router:** `src/features/events/server/routers/floor-plans.router.ts`

| Procedure           | Type     | Description                          |
|----------------------|----------|--------------------------------------|
| list                 | query    | List all floor plans for client      |
| getById              | query    | Get plan with tables and guests      |
| create               | mutation | Create a new floor plan              |
| update               | mutation | Update floor plan metadata           |
| addTable             | mutation | Add table to plan                    |
| updateTable          | mutation | Update table position/properties     |
| removeTable          | mutation | Remove table from plan               |
| assignGuest          | mutation | Assign guest to table seat           |
| removeGuest          | mutation | Unassign guest from seat             |
| autoAssign           | mutation | Auto-assign guests to tables         |
| bulkAssign           | mutation | Bulk assign guests                   |
| delete               | mutation | Delete entire floor plan             |
| createVersion        | mutation | Save snapshot version                |
| restoreVersion       | mutation | Restore from saved version           |
| deleteVersion        | mutation | Remove a saved version               |
| getVersions          | query    | List versions for a plan             |
| logChange            | mutation | Record seating change                |
| getChangeLog         | query    | Get change history                   |
| addConflict          | mutation | Add guest seating conflict           |
| addPreference        | mutation | Add seating preference               |
| removeConflict       | mutation | Remove a conflict                    |
| removePreference     | mutation | Remove a preference                  |
| getConflicts         | query    | List guest conflicts                 |
| getPreferences       | query    | List seating preferences             |
| exportLayout         | query    | Export plan as JSON                   |
| duplicatePlan        | mutation | Duplicate an existing plan           |

**DB Tables:** `floorPlans`, `floorPlanTables`, `floorPlanGuests`, `seatingChangeLog`, `seatingVersions`, `guestConflicts`, `guestPreferences`
**Frontend:** `src/features/events/` (Konva canvas, table/guest drag-drop)
**broadcastSync queryPaths:**
- create/delete: `['floorPlans.list']`
- update/tables/guests/versions: `['floorPlans.list', 'floorPlans.getById']`
- conflicts/preferences/changelog: `['floorPlans.getById']`

---

### D.8 Gifts Module

**Router:** `src/features/events/server/routers/gifts.router.ts`

| Procedure | Type     | Description                          |
|-----------|----------|--------------------------------------|
| getAll    | query    | List all gifts for a client          |
| getStats  | query    | Gift statistics                      |
| create    | mutation | Record a new gift                    |
| update    | mutation | Update gift details                  |
| delete    | mutation | Remove a gift record                 |
| bulkImport| mutation | Bulk import gifts                    |

**DB Tables:** `gifts`, `giftsEnhanced`, `giftCategories`, `giftItems`, `giftTypes`, `guestGifts`
**Frontend:** `src/features/events/` (gift tracking table)
**broadcastSync queryPaths:**
- all mutations: `['gifts.getAll', 'gifts.getStats']`

---

### D.9 Clients Module

**Router:** `src/features/clients/server/routers/clients.router.ts`

| Procedure    | Type     | Description                          |
|--------------|----------|--------------------------------------|
| list         | query    | List all clients for company         |
| getAll       | query    | Extended client list with stats      |
| getById      | query    | Get single client with full data     |
| create       | mutation | Create new wedding client            |
| update       | mutation | Update client details                |
| delete       | mutation | Remove client and cascade            |
| getStats     | query    | Client statistics                    |

**DB Tables:** `clients`, `clientUsers`
**Frontend:** `src/features/clients/` (client list, client detail, forms)
**broadcastSync queryPaths:**
- create/delete: `['clients.list', 'clients.getAll']`
- update: `['clients.list', 'clients.getAll', 'clients.getById']`

---

### D.10 Events Module

**Router:** `src/features/events/server/routers/events.router.ts`

| Procedure    | Type     | Description                          |
|--------------|----------|--------------------------------------|
| getAll       | query    | List all events for a client         |
| getById      | query    | Get single event                     |
| getByType    | query    | Filter by event type                 |
| create       | mutation | Create new event                     |
| update       | mutation | Update event details                 |
| delete       | mutation | Remove event + cascade               |
| getStats     | query    | Event statistics                     |
| getTypes     | query    | List event type options              |
| duplicate    | mutation | Duplicate an event                   |

**DB Tables:** `events`
**Frontend:** `src/features/events/` (event cards, event detail page)
**broadcastSync queryPaths:**
- create/update: `['events.getAll', 'timeline.getAll']`
- delete: `['events.getAll', 'timeline.getAll', 'guests.getAll']`

---

### D.11 Module Summary Table

| Module       | Router File                                    | Procedures | broadcastSync Module |
|--------------|------------------------------------------------|------------|----------------------|
| Guests       | `guests/server/routers/guests.router.ts`       | 10         | `guests`             |
| Budget       | `analytics/server/routers/budget.router.ts`     | 15         | `budget`             |
| Timeline     | `events/server/routers/timeline.router.ts`      | 12         | `timeline`           |
| Vendors      | `events/server/routers/vendors.router.ts`       | 20         | `vendors`            |
| Hotels       | `events/server/routers/hotels.router.ts`        | 10         | `hotels`             |
| Transport    | `events/server/routers/guest-transport.router.ts`| 9         | `transport`          |
| Floor Plans  | `events/server/routers/floor-plans.router.ts`   | 26         | `floorPlans`         |
| Gifts        | `events/server/routers/gifts.router.ts`         | 6          | `gifts`              |
| Clients      | `clients/server/routers/clients.router.ts`      | 7          | `clients`            |
| Events       | `events/server/routers/events.router.ts`        | 9          | `events`             |

---

## Section E: Cross-Module Sync Matrix

### E.1 broadcastSync — Redis Pub/Sub Real-Time Invalidation

Every mutation in a tRPC router calls `broadcastSync()` from `src/lib/realtime/redis-pubsub.ts`. This publishes a `SyncAction` to Redis, which all connected clients receive via SSE. The `queryPaths` array tells each client which tRPC queries to refetch.

**SyncAction shape:**
```typescript
{
  id: string;           // crypto.randomUUID()
  type: 'insert' | 'update' | 'delete';
  module: string;       // e.g. 'guests', 'budget'
  entityId: string;     // specific ID or 'bulk'
  companyId: string;
  clientId: string;
  userId: string;
  timestamp: number;
  queryPaths: string[]; // tRPC procedure paths to invalidate
}
```

### E.2 Cascade Invalidation Matrix

When a mutation fires in **Source Module**, these **Target Queries** are also invalidated:

| Source Module | Target Queries Invalidated (beyond own)                                    |
|---------------|----------------------------------------------------------------------------|
| guests        | `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| budget        | `clients.list`, `clients.getAll`                                           |
| timeline      | *(no cascade — own queries only)*                                          |
| vendors       | `budget.getAll`, `budget.getSummary`, `timeline.getAll`                    |
| hotels        | `timeline.getAll`                                                          |
| transport     | `timeline.getAll`                                                          |
| events        | `timeline.getAll`, `guests.getAll` (on delete)                             |
| gifts         | *(no cascade — own queries only)*                                          |
| clients       | *(no cascade — own queries only)*                                          |
| floorPlans    | *(no cascade — own queries only)*                                          |

### E.3 Chatbot Tool → Query Invalidation Map

**File:** `src/features/chatbot/server/services/query-invalidation-map.ts`

The chatbot has 31 mutation tools + 14 query-only tools. Each mutation tool maps to the same `queryPaths` used by UI routers:

| Chatbot Tool            | Invalidated Queries                                                             |
|-------------------------|---------------------------------------------------------------------------------|
| `add_guest`             | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` |
| `update_guest_rsvp`     | `guests.getAll`, `guests.getStats`, `budget.getSummary`                         |
| `bulk_update_guests`    | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` |
| `check_in_guest`        | `guests.getAll`, `guests.getStats`                                              |
| `delete_guest`          | `guests.getAll`, `guests.getStats`, `hotels.getAll`, `guestTransport.getAll`, `budget.getSummary` |
| `create_event`          | `events.getAll`, `timeline.getAll`                                              |
| `update_event`          | `events.getAll`, `timeline.getAll`                                              |
| `delete_event`          | `events.getAll`, `timeline.getAll`, `guests.getAll`                             |
| `add_timeline_item`     | `timeline.getAll`                                                               |
| `shift_timeline`        | `timeline.getAll`                                                               |
| `add_vendor`            | `vendors.getAll`, `budget.getAll`, `timeline.getAll`                            |
| `update_vendor`         | `vendors.getAll`, `budget.getAll`                                               |
| `delete_vendor`         | `vendors.getAll`, `budget.getAll`, `timeline.getAll`                            |
| `add_hotel_booking`     | `hotels.getAll`                                                                 |
| `bulk_add_hotel_bookings`| `hotels.getAll`                                                                |
| `assign_transport`      | `guestTransport.getAll`                                                         |
| `update_budget_item`    | `budget.getAll`, `budget.getSummary`                                            |
| `delete_budget_item`    | `budget.getAll`, `budget.getSummary`, `timeline.getAll`                         |
| `add_gift` / `update_gift` | `gifts.getAll`                                                              |
| `delete_gift`           | `gifts.getAll`                                                                  |
| `create_client`         | `clients.list`, `clients.getAll`                                                |
| `update_client`         | `clients.list`, `clients.getAll`, `clients.getById`                             |

**14 query-only tools** (no invalidation): `get_client_summary`, `get_wedding_summary`, `get_recommendations`, `get_guest_stats`, `sync_hotel_guests`, `get_budget_overview`, `budget_currency_convert`, `search_entities`, `query_data`, `query_cross_client_events`, `export_data`, `query_analytics`, `get_weather`, `get_document_upload_url`

### E.4 Google Sheets Sync → Query Invalidation

**File:** `src/lib/google/sheets-sync.ts` — `getQueryPathsForModule()`

After a Sheets import, `broadcastSheetSync()` uses the same Redis Pub/Sub channel:

| Sheets Module | queryPaths                                                                                            |
|---------------|-------------------------------------------------------------------------------------------------------|
| guests        | `guests.getAll`, `guests.getStats`, `guests.getDietaryStats`, `hotels.getAll`, `guestTransport.getAll`, `timeline.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll` |
| budget        | `budget.getAll`, `budget.getSummary`, `clients.list`, `clients.getAll`                                |
| timeline      | `timeline.getAll`, `timeline.getStats`                                                                |
| hotels        | `hotels.getAll`, `timeline.getAll`                                                                    |
| transport     | `guestTransport.getAll`, `timeline.getAll`                                                            |
| vendors       | `vendors.getAll`, `vendors.getStats`, `budget.getAll`, `budget.getSummary`, `timeline.getAll`         |
| gifts         | `gifts.getAll`, `gifts.getStats`                                                                      |

### E.5 MODULE_PRIMARY_QUERIES

**File:** `src/features/chatbot/server/services/query-invalidation-map.ts`

Maps each module to its primary query paths for page-level refresh:

```
guests       → ['guests.getAll', 'guests.getStats']
events       → ['events.getAll']
budget       → ['budget.getAll', 'budget.getSummary']
vendors      → ['vendors.getAll']
hotels       → ['hotels.getAll']
transport    → ['guestTransport.getAll']
timeline     → ['timeline.getAll']
gifts        → ['gifts.getAll']
floorPlan    → ['floorPlans.list']
pipeline     → ['pipeline.list']
communications → ['communications.list']
creatives    → ['creatives.list']
team         → ['team.list']
proposals    → ['proposals.list']
invoices     → ['invoices.list']
websites     → ['websites.list']
workflows    → ['workflows.list']
```

---

## Section F: Change Propagation Guide

### F.1 "I Add a Column to a Table" Checklist

When adding a new column to any Drizzle schema table, you must touch **all** of these layers:

```
1. SCHEMA  → Add column to schema-*.ts file
2. MIGRATE → npx drizzle-kit generate && npx drizzle-kit push
3. ROUTER  → Add to select/insert/update shapes in router procedures
4. IMPORT  → Add to EXPECTED_*_HEADERS in excel-parser.ts (if importable)
5. EXPORT  → Add to column definition in excel-exporter.ts (if exportable)
6. SHEETS  → Add to *_HEADERS in sheets-sync.ts (if Sheets-synced)
7. CHATBOT → Add to tool-definitions.ts Zod schema (if chatbot-accessible)
8. TYPES   → Update TypeScript types in relevant feature types files
9. FRONTEND→ Add to form fields / table columns in UI components
```

### F.2 Module-Specific Propagation Paths

#### Adding a column to `guests`
| Step | File(s)                                      | What to change                                |
|------|----------------------------------------------|-----------------------------------------------|
| 1    | `src/lib/db/schema-features.ts:146`          | Add column to `guests` table definition       |
| 2    | Terminal                                      | `npx drizzle-kit generate && npx drizzle-kit push` |
| 3    | `src/features/guests/server/routers/guests.router.ts` | Add to create/update input Zod schema, select query |
| 4    | `src/lib/import/excel-parser.ts:19`          | Add to `EXPECTED_GUEST_HEADERS` array         |
| 5    | `src/lib/export/excel-exporter.ts:454`       | Add to guest export columns array             |
| 6    | `src/lib/google/sheets-sync.ts:46`           | Add to `GUEST_HEADERS` array                  |
| 7    | `src/features/chatbot/server/services/tool-definitions.ts` | Add to `add_guest` / `bulk_update_guests` Zod params |
| 8    | `src/features/chatbot/server/services/tool-executor.ts` | Handle new field in guest tool execution      |
| 9    | Guest form component + guest table columns    | Add form field + display column               |

#### Adding a column to `budget`
| Step | File(s)                                      | What to change                                |
|------|----------------------------------------------|-----------------------------------------------|
| 1    | `src/lib/db/schema-features.ts:447`          | Add column to `budget` table                  |
| 2    | Terminal                                      | `npx drizzle-kit generate && npx drizzle-kit push` |
| 3    | `src/features/analytics/server/routers/budget.router.ts` | Add to create/update input, select            |
| 4    | `src/lib/import/excel-parser.ts:45`          | Add to `EXPECTED_BUDGET_HEADERS`              |
| 5    | `src/lib/export/excel-exporter.ts:676`       | Add to budget export columns                  |
| 6    | `src/lib/google/sheets-sync.ts:55`           | Add to `BUDGET_HEADERS`                       |
| 7    | Chatbot tool-definitions.ts                   | Add to `update_budget_item` Zod params        |
| 9    | Budget form + budget table                    | Add UI field + column                         |

#### Adding a column to `hotels`
| Step | File(s)                                      | What to change                                |
|------|----------------------------------------------|-----------------------------------------------|
| 1    | `src/lib/db/schema-features.ts:196`          | Add column to `hotels` table                  |
| 2    | Terminal                                      | `npx drizzle-kit generate && npx drizzle-kit push` |
| 3    | `src/features/events/server/routers/hotels.router.ts` | Add to create/update/select                   |
| 4    | `src/lib/import/excel-parser.ts:52`          | Add to `EXPECTED_HOTEL_HEADERS`               |
| 5    | `src/lib/export/excel-exporter.ts:796`       | Add to hotel export columns                   |
| 6    | `src/lib/google/sheets-sync.ts:67`           | Add to `HOTEL_HEADERS`                        |
| 7    | Chatbot tool-definitions.ts                   | Add to `add_hotel_booking` Zod params         |
| 9    | Hotel form + hotel table                      | Add UI field + column                         |

#### Adding a column to `vendors` / `clientVendors`
| Step | File(s)                                      | What to change                                |
|------|----------------------------------------------|-----------------------------------------------|
| 1    | `src/lib/db/schema-features.ts:360` or `:383` | Add column to table                          |
| 2    | Terminal                                      | `npx drizzle-kit generate && npx drizzle-kit push` |
| 3    | `src/features/events/server/routers/vendors.router.ts` | Add to create/update/select                   |
| 4    | `src/lib/import/excel-parser.ts:66`          | Add to `EXPECTED_VENDOR_HEADERS`              |
| 5    | `src/lib/export/excel-exporter.ts:1011`      | Add to vendor export columns                  |
| 6    | `src/lib/google/sheets-sync.ts:80`           | Add to `VENDOR_HEADERS`                       |
| 7    | Chatbot tool-definitions.ts                   | Add to `add_vendor` / `update_vendor` Zod     |
| 9    | Vendor form + vendor table                    | Add UI field + column                         |

#### Adding a column to `guestTransport`
| Step | File(s)                                      | What to change                                |
|------|----------------------------------------------|-----------------------------------------------|
| 1    | `src/lib/db/schema-features.ts:255`          | Add column to `guestTransport` table          |
| 2    | Terminal                                      | `npx drizzle-kit generate && npx drizzle-kit push` |
| 3    | `src/features/events/server/routers/guest-transport.router.ts` | Add to create/update/select          |
| 4    | `src/lib/import/excel-parser.ts:59`          | Add to `EXPECTED_TRANSPORT_HEADERS`           |
| 5    | *(transport uses same exporter pattern)*      | Add to transport export columns               |
| 6    | `src/lib/google/sheets-sync.ts:74`           | Add to `TRANSPORT_HEADERS`                    |
| 7    | Chatbot tool-definitions.ts                   | Add to `assign_transport` Zod params          |
| 9    | Transport form + transport table              | Add UI field + column                         |

#### Adding a column to `timeline`
| Step | File(s)                                      | What to change                                |
|------|----------------------------------------------|-----------------------------------------------|
| 1    | `src/lib/db/schema-features.ts:310`          | Add column to `timeline` table                |
| 2    | Terminal                                      | `npx drizzle-kit generate && npx drizzle-kit push` |
| 3    | `src/features/events/server/routers/timeline.router.ts` | Add to create/update/select             |
| 4    | `src/lib/import/excel-parser.ts:37`          | Add to `EXPECTED_TIMELINE_HEADERS`            |
| 5    | Export: add to timeline master export columns | Add column definition                         |
| 6    | `src/lib/google/sheets-sync.ts:61`           | Add to `TIMELINE_HEADERS`                     |
| 7    | Chatbot tool-definitions.ts                   | Add to `add_timeline_item` Zod params         |
| 9    | Timeline form + timeline view                 | Add UI field + display                        |

### F.3 Import/Export Round-Trip Header Alias Checklist

When adding a new export header that differs from the import header:
1. Add the **canonical** (import) name to `EXPECTED_*_HEADERS` in `excel-parser.ts`
2. Add the **display** (export) name to the export column in `excel-exporter.ts`
3. Add alias mapping in `IMPORT_HEADER_ALIASES` in `excel-parser.ts` (canonical → [display alias])
4. `stripHeaderAnnotations()` handles `(Do not modify)`, `*`, `#` prefixes automatically
5. `resolveHeaderAliases()` handles the alias resolution in 2 phases (annotation strip → explicit alias)

### F.4 broadcastSync Checklist for New Mutations

When adding a new tRPC mutation:
1. Import `broadcastSync` from `src/lib/realtime/redis-pubsub.ts`
2. Call at end of mutation with correct `type`, `module`, `entityId`, `queryPaths`
3. Include cascade targets (check Section E.2 matrix)
4. Add tool to chatbot `TOOL_QUERY_MAP` in `query-invalidation-map.ts` if chatbot-accessible
5. Test: mutation fires → Redis publishes → SSE delivers → client refetches

---

## Section G: Import/Export Header Mapping

### G.1 Three Export/Import Systems

WeddingFlo has three independent header systems that must stay in sync:

| System         | File                                    | Purpose               | Format                     |
|----------------|-----------------------------------------|------------------------|----------------------------|
| Excel Export   | `src/lib/export/excel-exporter.ts`      | Download .xlsx         | Row 1: Header, Row 2: Hint |
| Excel Import   | `src/lib/import/excel-parser.ts`        | Upload .xlsx           | Row 1: Header (+ aliases)  |
| Google Sheets  | `src/lib/google/sheets-sync.ts`         | Bi-directional sync    | Row 1: Header              |

### G.2 Guests — Header Comparison

| # | Excel Export (exporter)           | Excel Import (parser)      | Google Sheets (sync)     |
|---|----------------------------------|----------------------------|--------------------------|
| 1 | ID                               | ID                         | ID                       |
| 2 | Guest Name                       | Guest Name                 | First Name               |
| 3 | Email                            | Email                      | Last Name                |
| 4 | Phone                            | Phone                      | Email                    |
| 5 | Group                            | Group                      | Phone                    |
| 6 | Side                             | Side                       | Group                    |
| 7 | RSVP                             | RSVP                       | Side                     |
| 8 | Party Size                       | Party Size                 | RSVP Status              |
| 9 | Additional Guests                | Additional Guests          | Party Size               |
| 10| Relationship                     | Relationship               | Relationship             |
| 11| Events                           | Events                     | Arrival Date             |
| 12| Arrival Date                     | Arrival Date               | Arrival Mode             |
| 13| Arrival Time                     | Arrival Time               | Departure Date           |
| 14| Arrival Mode                     | Arrival Mode               | Departure Mode           |
| 15| Departure Date                   | Departure Date             | Hotel Required           |
| 16| Departure Time                   | Departure Time             | Transport Required       |
| 17| Departure Mode                   | Departure Mode             | Meal Preference          |
| 18| Meal                             | Meal                       | Dietary Restrictions     |
| 19| Dietary                          | Dietary                    | Additional Guests        |
| 20| Hotel (Primary)                  | Hotel (Primary)            | Events                   |
| 21| Transport (Primary)              | Transport (Primary)        | Gift To Give             |
| 22| Per-Member Hotel                 | Per-Member Hotel           | Checked In               |
| 23| Per-Member Transport             | Per-Member Transport       | Notes                    |
| 24| Gift Received                    | Gift Received              | Last Updated             |
| 25| Notes                            | Notes                      |                          |
| 26| Checked In                       | Checked In                 |                          |

**Key differences:** Export/Import use combined "Guest Name" (firstName + lastName), Sheets uses separate "First Name"/"Last Name". Sheets includes "Last Updated" for sync conflict resolution. Export/Import have "Per-Member Hotel/Transport" columns not in Sheets.

### G.3 Budget — Header Comparison

| # | Excel Export (exporter)           | Excel Import (parser)      | Google Sheets (sync)     |
|---|----------------------------------|----------------------------|--------------------------|
| 1 | Expense Name                     | Item                       | ID                       |
| 2 | Expense Details                  | Description                | Item                     |
| 3 | Category                         | Category                   | Category                 |
| 4 | Event                            | Estimated Cost             | Segment                  |
| 5 | Budgeted Amount                  | Actual Cost                | Estimated Cost           |
| 6 | Transaction Date                 | Paid Amount                | Actual Cost              |
| 7 | Total Paid                       | Payment Status             | Paid Amount              |
| 8 | Balance Due                      | Transaction Date           | Payment Status           |
| 9 | Payment History                  | Per Guest Cost             | Vendor                   |
| 10| Payment Status                   | Notes                      | Notes                    |
| 11| Special Notes                    | ID                         | Last Updated             |

**Alias resolution:** `item` ← `['expense name', 'expense item']`, `estimated cost` ← `['budgeted amount']`, `paid amount` ← `['total paid']`, `description` ← `['expense details']`, `notes` ← `['special notes']`

### G.4 Hotels — Header Comparison

| # | Excel Export (exporter)                          | Excel Import (parser)        | Google Sheets (sync)     |
|---|--------------------------------------------------|------------------------------|--------------------------|
| 1 | ID (Do not modify)                               | ID                           | ID                       |
| 2 | Guest ID (Do not modify)                         | Guest Name                   | Guest Name               |
| 3 | Guest Name * (Required)                          | Hotel Name                   | Hotel Name               |
| 4 | Relationship (from guest list)                   | Room Number                  | Room Type                |
| 5 | Additional Guest Names (from guest list)         | Room Type                    | Room Number              |
| 6 | Guests in Room (...)                             | Check In Date                | Check-In Date            |
| 7 | # Total Party Size                               | Check Out Date               | Check-Out Date           |
| 8 | Email Address                                    | Accommodation Needed         | Party Size               |
| 9 | Phone Number                                     | Booking Confirmed            | Accommodation Needed     |
| 10| Need Hotel? (Yes/No)                             | Checked In                   | Booking Confirmed        |
| 11| Hotel Name                                       | Cost                         | Checked In               |
| 12| Room Number (...)                                | Currency                     | Cost                     |
| 13| Room Type (Suite/Deluxe...)                      | Payment Status               | Payment Status           |
| 14| Check-In (YYYY-MM-DD)                            | Party Size                   | Notes                    |
| 15| Check-Out (YYYY-MM-DD)                           | Notes                        | Last Updated             |
| 16| Booking Confirmed (Yes/No)                       |                              |                          |
| 17| Checked In (Yes/No)                              |                              |                          |
| 18| Room Cost (numbers only)                         |                              |                          |
| 19| Payment (pending/paid/overdue)                   |                              |                          |
| 20| Special Notes                                    |                              |                          |

**Alias resolution:** `check in date` ← `['check-in date', 'check-in']`, `check out date` ← `['check-out date', 'check-out']`, `accommodation needed` ← `['need hotel?', 'need hotel']`, `cost` ← `['room cost']`, `party size` ← `['total party size']`

### G.5 Transport — Header Comparison

| # | Excel Export (per-module exporter)    | Excel Import (parser)        | Google Sheets (sync)     |
|---|--------------------------------------|------------------------------|--------------------------|
| 1 | ID                                   | ID                           | ID                       |
| 2 | Guest Name                           | Guest Name                   | Guest Name               |
| 3 | Pickup Date                          | Pickup Date                  | Leg Type                 |
| 4 | Pickup Time                          | Pickup Time                  | Pickup Date              |
| 5 | Pickup Location                      | Pickup From                  | Pickup Time              |
| 6 | Drop-Off Location                    | Drop To                      | Pickup From              |
| 7 | Status                               | Transport Status             | Drop To                  |
| 8 | Vehicle/Shuttle                      | Vehicle Info                 | Vehicle Info             |
| 9 | Vehicle Type                         | Vehicle Type                 | Vehicle Number           |
| 10| Driver Phone                         | Driver Phone                 | Driver Phone             |
| 11| Journey Type                         | Leg Type                     | Transport Status         |
| 12| Trip #                               | Leg Sequence                 | Notes                    |
| 13| Special Notes                        | Notes                        | Last Updated             |

**Alias resolution:** `pickup from` ← `['pickup location']`, `drop to` ← `['drop-off location', 'dropoff location']`, `leg type` ← `['journey type']`, `leg sequence` ← `['trip #', 'trip']`, `transport status` ← `['status']`, `vehicle info` ← `['vehicle/shuttle']`

### G.6 Vendors — Header Comparison

| # | Excel Export (exporter)            | Excel Import (parser)        | Google Sheets (sync)     |
|---|------------------------------------|------------------------------|--------------------------|
| 1 | Vendor Name                        | Name                         | ID                       |
| 2 | Service Category                   | Category                     | Vendor Name              |
| 3 | Contact Person                     | Contact Name                 | Category                 |
| 4 | Phone Number                       | Email                        | Contact Name             |
| 5 | Email Address                      | Phone                        | Phone                    |
| 6 | Event                              | Website                      | Email                    |
| 7 | Service Location                   | Address                      | Contract Amount          |
| 8 | On-Site Contact                    | Contract Signed              | Total Paid               |
| 9 | Contact Phone                      | Contract Date                | Payment Status           |
| 10| Contact Notes                      | Rating                       | Service Date             |
| 11| Services Provided                  | Is Preferred                 | Location                 |
| 12| Contract Amount                    | Notes                        | Rating                   |
| 13| Deposit Paid                       | ID                           | Notes                    |
| 14| Service Date                       |                              | Last Updated             |
| 15| Payment Status                     |                              |                          |
| 16| Approval Status                    |                              |                          |
| 17| Approval Notes                     |                              |                          |

**Alias resolution:** `name` ← `['vendor name']`, `contact name` ← `['contact person']`, `category` ← `['service category']`, `phone` ← `['phone number']`, `email` ← `['email address']`, `notes` ← `['special notes']`, `payment status` ← `['payment']`

### G.7 Gifts — Header Comparison

| # | Excel Export (exporter)            | Excel Import (parser)        | Google Sheets (sync)     |
|---|------------------------------------|------------------------------|--------------------------|
| 1 | Guest Name                         | Guest Name                   | ID                       |
| 2 | Guest Group                        | Gift Item                    | Gift Name                |
| 3 | Email Address                      | Gift Type                    | Guest ID                 |
| 4 | Phone Number                       | Quantity                     | Guest Name               |
| 5 | Gift Item                          | Delivery Date                | Value                    |
| 6 | Gift Category                      | Delivery Time                | Status                   |
| 7 | Quantity                           | Delivery Location            | Last Updated             |
| 8 | Delivery Date                      | Delivery Status              |                          |
| 9 | Delivery Time                      | Delivered By                 |                          |
| 10| Delivery Location                  | Notes                        |                          |
| 11| Delivery Status                    |                              |                          |
| 12| Delivered By                       |                              |                          |
| 13| Special Notes                      |                              |                          |

**Alias resolution:** `gift type` ← `['gift category']`, `gift item` ← `['gift name']`

### G.8 Timeline — Header Comparison

| # | Excel Export (master export)       | Excel Import (parser)           | Google Sheets (sync)     |
|---|-----------------------------------|---------------------------------|--------------------------|
| 1 | Time                              | ID                              | ID                       |
| 2 | Activity                          | Event ID                        | Title                    |
| 3 | Location                          | Event Name                      | Description              |
| 4 | Manager                           | Title                           | Start Time               |
| 5 |                                   | Description                     | End Time                 |
| 6 |                                   | Phase                           | Location                 |
| 7 |                                   | Date                            | Phase                    |
| 8 |                                   | Start Time                      | Completed                |
| 9 |                                   | End Time                        | Responsible Person       |
| 10|                                   | Duration (Min)                  | Source Module             |
| 11|                                   | Location                        | Notes                    |
| 12|                                   | Participants                    | Last Updated             |
| 13|                                   | Responsible Person              |                          |
| 14|                                   | Completed                       |                          |
| 15|                                   | Sort Order                      |                          |
| 16|                                   | Notes                           |                          |

**Alias resolution:** `title` ← `['activity']`

**Note:** The master (multi-sheet) export uses simplified 4-column headers (Time, Activity, Location, Manager). The individual per-module import expects the full 16-column format.

### G.9 IMPORT_HEADER_ALIASES Reference

**File:** `src/lib/import/excel-parser.ts:78`

Complete alias map (canonical import name → known export variants):

```
item             ← ['expense name', 'expense item']
description      ← ['expense details']
estimated cost   ← ['budgeted amount']
paid amount      ← ['total paid']
check in date    ← ['check-in date', 'check-in']
check out date   ← ['check-out date', 'check-out']
accommodation needed ← ['need hotel?', 'need hotel']
cost             ← ['room cost']
party size       ← ['total party size']
leg type         ← ['journey type']
leg sequence     ← ['trip #', 'trip']
pickup from      ← ['pickup location']
drop to          ← ['drop-off location', 'dropoff location']
transport status ← ['status']
vehicle info     ← ['vehicle/shuttle']
name             ← ['vendor name']
contact name     ← ['contact person']
gift type        ← ['gift category']
gift item        ← ['gift name']
title            ← ['activity']
notes            ← ['special notes']
phone            ← ['phone number']
email            ← ['email address']
category         ← ['service category']
payment status   ← ['payment']
```

### G.10 Header Normalization Pipeline

```
Raw header from Excel file
    ↓
stripHeaderAnnotations()
    Removes: "(Do not modify)", "(YYYY-MM-DD)", "* (Required)", "# prefix"
    Example: "Check-In (YYYY-MM-DD)" → "check-in"
    ↓
resolveHeaderAliases() — Phase 1: Annotation stripping
    Adds base names to headerMap if different from raw
    ↓
resolveHeaderAliases() — Phase 2: Explicit aliases
    Maps export display names → canonical import names
    Example: "expense name" → maps to "item" column index
    ↓
Header map ready for field extraction
```

---

## Section H: Security Model

### H.1 Defense-in-Depth Architecture

```
Request
  ↓
1. Cloudflare WAF + DDoS (external)
  ↓
2. BetterAuth Cookie Validation
   - Secure cookies (__Secure-wf prefix in prod)
   - 7-day session, 5-min cookie cache
  ↓
3. tRPC Procedure Gate (4 levels)
   - publicProcedure / protectedProcedure / adminProcedure / superAdminProcedure
  ↓
4. withTenantScope() (application-level)
   - SET LOCAL app.current_company_id = :companyId
   - SET LOCAL app.current_role = :role
  ↓
5. PostgreSQL Row-Level Security (database-level)
   - USING (company_id = current_company_id() OR is_super_admin())
   - WITH CHECK (company_id = current_company_id() OR is_super_admin())
  ↓
6. Zod Input Validation (per procedure)
  ↓
7. Drizzle ORM → SQL → Supabase PostgreSQL
```

### H.2 Row-Level Security (RLS)

**Migration files:**
- `drizzle/migrations/0022_create_app_role.sql` — Non-superuser `weddingflo_app` role
- `drizzle/migrations/0023_rls_helpers_and_denormalize.sql` — Helper functions
- `drizzle/migrations/0024_enable_rls_all_tables.sql` — RLS policies on all tables
- `drizzle/migrations/0028_add_company_id_rls_client_vendors.sql` — Late fix for `client_vendors`

**PostgreSQL helper functions** (migration 0023):

```sql
-- Returns current tenant's company_id from session variable
CREATE OR REPLACE FUNCTION current_company_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_company_id', true), '')::TEXT;
$$ LANGUAGE SQL STABLE;

-- Returns current user's role from session variable
CREATE OR REPLACE FUNCTION current_app_role()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_role', true), '')::TEXT;
$$ LANGUAGE SQL STABLE;

-- Super admin bypass check
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT current_app_role() = 'super_admin';
$$ LANGUAGE SQL STABLE;
```

**RLS policy pattern** (applied to all tables with `company_id`):

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON <table>
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());
```

**Tables with RLS enabled:**
- Core: `user`, `clients`, `vendors`, `chatbot_conversations`, `chatbot_pending_calls`
- Child (denormalized `company_id`): `guests`, `events`, `timeline`, `budget`, `hotels`, `guest_transport`, `gifts`, `floor_plans`
- Business: `proposal_templates`, `proposals`, `contract_templates`, `contracts`, `workflows`, `workflow_executions`, `questionnaire_templates`, `questionnaires`
- Communication: `messages`, `sms_templates`, `whatsapp_templates`
- Pipeline: `pipeline_stages`, `pipeline_leads`, `pipeline_activities`
- Other: `team_invitations`, `wedding_invitations`, `activity`, `notifications`, `google_sheets_sync_settings`, `chatbot_messages`, `chatbot_command_templates`, `client_users`, `client_vendors`, `gift_categories`, `gift_types`, `thank_you_note_templates`, `stripe_accounts`, `job_queue`, `timeline_templates`

### H.3 withTenantScope — Application-Level Tenant Isolation

**File:** `src/lib/db/with-tenant-scope.ts`

```typescript
export type AppRole = 'super_admin' | 'company_admin' | 'staff' | 'client_user';

export interface TenantContext {
  companyId: string | null;
  role: AppRole;
  userId: string;
}
```

**`withTenantScope()`** — Transaction-scoped isolation:
```typescript
export async function withTenantScope<T>(
  db: PostgresJsDatabase<any>,
  context: TenantContext,
  callback: (tx: PgTransaction<any, any, any>) => Promise<T>,
): Promise<T>
```
- Uses `SET LOCAL` (transaction-scoped, auto-cleanup on commit/rollback)
- Sets `app.current_company_id` and `app.current_role` session variables
- Non-super_admin users **must** have a `companyId` — throws error otherwise

**`setTenantScopeSession()`** — Session-level scope (non-transactional):
- Uses `SET` (session-level, persists across statements)
- Must call `clearTenantScope()` afterward to prevent leaking

**`createTenantScopeMethod()`** — Convenience wrapper for tRPC context:
- Returns a curried function: `<T>(callback) => withTenantScope(db, ctx, callback)`
- Attached to tRPC context as `ctx.withTenantScope`

### H.4 tRPC Procedure Levels

**File:** `src/server/trpc/trpc.ts`

| Level              | Auth Required | Role Required                     | Usage                  |
|--------------------|---------------|-----------------------------------|------------------------|
| `publicProcedure`  | No            | None                              | Health, public APIs    |
| `protectedProcedure`| Yes          | Any authenticated user            | Most data queries      |
| `adminProcedure`   | Yes           | `company_admin` OR `super_admin`  | Settings, team mgmt   |
| `superAdminProcedure`| Yes         | `super_admin` only                | Platform admin         |

```typescript
// publicProcedure — no middleware
export const publicProcedure = t.procedure;

// protectedProcedure — requires userId
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

// adminProcedure — requires company_admin or super_admin
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (ctx.role !== 'company_admin' && ctx.role !== 'super_admin')
    throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});

// superAdminProcedure — requires super_admin only
export const superAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (ctx.role !== 'super_admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});
```

### H.5 tRPC Context — Session + Tenant Scope Injection

**File:** `src/server/trpc/context.ts`

```typescript
export async function createTRPCContext() {
  const { userId, user } = await getServerSession();
  let role = (user?.role || null) as Roles | null;
  let companyId = user?.companyId || null;

  // Fallback: if session missing role/companyId, check DB directly
  if (userId && (!role || !companyId)) {
    const [dbUser] = await db.select(...).from(userTable).where(eq(userTable.id, userId)).limit(1);
    if (dbUser) { role = dbUser.role; companyId = dbUser.companyId; }
  }

  const finalRole = (role || 'company_admin') as Roles;

  return {
    userId,
    role: finalRole,
    companyId,
    db,
    queries: dbQueries,
    user,
    withTenantScope: userId
      ? createTenantScopeMethod(db, { companyId, role: finalRole as AppRole, userId })
      : undefined,
  };
}
```

### H.6 Auth Rate Limiting

**File:** `src/lib/auth/rate-limiter.ts`
**Storage:** PostgreSQL UNLOGGED table (`rateLimitEntries`) — 2x faster than logged, no Redis dependency

| Endpoint           | Max Requests | Window       | Key          |
|--------------------|-------------|--------------|--------------|
| Sign-in            | 5           | 1 minute     | Per IP       |
| Sign-up            | 3           | 1 hour       | Per IP       |
| Password reset     | 3           | 1 hour       | Per email    |
| Verification email | 5           | 1 hour       | Per user     |
| Session refresh    | 30          | 1 minute     | Per user     |

Functions: `checkSignInRateLimit(ip)`, `checkSignUpRateLimit(ip)`, `checkPasswordResetRateLimit(email)`, `checkVerificationEmailRateLimit(userId)`, `checkSessionRefreshRateLimit(id)`

Returns: `{ success: boolean, remaining: number, reset: number, retryAfter?: number }`

### H.7 Cookie Security

**File:** `src/lib/auth.ts` — `advanced` section

| Setting              | Development          | Production               |
|----------------------|----------------------|--------------------------|
| Cookie prefix        | `wf`                 | `__Secure-wf`            |
| Secure cookies       | false                | true (HTTPS only)        |
| Session expiry       | 7 days               | 7 days                   |
| Session update age   | 1 day                | 1 day                    |
| Cookie cache         | 5 min (300s)         | 5 min (300s)             |
| Account linking      | Google (trusted)     | Google (trusted)         |
| CSRF trusted origins | localhost:3000       | weddingflow.pro, app.weddingflow.pro |

### H.8 Token Encryption (AES-256-GCM)

**File:** `src/lib/crypto/token-encryption.ts`

| Parameter        | Value                               |
|------------------|-------------------------------------|
| Algorithm        | `aes-256-gcm`                       |
| IV length        | 12 bytes (96 bits, NIST SP 800-38D) |
| Auth tag length  | 16 bytes (128 bits)                 |
| Key source       | `TOKEN_ENCRYPTION_KEY` env var      |
| Key size         | 32 bytes (256 bits, base64 encoded) |
| Output format    | `enc:v1:{iv}:{authTag}:{ciphertext}` (all base64) |

```typescript
export function encryptToken(plaintext: string): string
export function decryptToken(encryptedStr: string): string
export function isEncrypted(value: string): boolean   // checks "enc:v1:" prefix
export function reEncryptToken(encryptedStr: string, oldKeyBase64: string): string  // key rotation
```

- Double-encryption guard: `isEncrypted()` check before encrypting
- Backward compatibility: `decryptToken()` returns plaintext if not encrypted
- Key generation: `openssl rand -base64 32`

### H.9 Password Hashing — Argon2id

**File:** `src/lib/auth/argon2-password.ts`

| Parameter    | Value                         |
|--------------|-------------------------------|
| Algorithm    | Argon2id (OWASP recommended)  |
| Memory cost  | 65536 (64 MiB)                |
| Time cost    | 3 iterations                  |
| Parallelism  | 1 thread                      |
| Output       | 32 bytes (256 bits)           |

Hash format: `$argon2id$v=19$m=65536,t=3,p=1$<salt>$<hash>`

**Legacy migration:** `verifyPasswordWithRehash()` transparently detects bcrypt hashes (`$2a$`/`$2b$`), verifies, and re-hashes with Argon2id on successful login.

### H.10 Auth Event Logging

**File:** `src/lib/auth/auth-logger.ts`

Logged events: `sign_in`, `sign_out`, `sign_up`, `password_reset_request`, `password_reset_complete`, `sign_in_failed`, `session_refresh`, `account_locked`

Each log records: userId, companyId, ipAddress, userAgent, provider. Stored in the `activity` table.

### H.11 Database Role (Non-Superuser)

**Migration:** `0022_create_app_role.sql`

The application connects as `weddingflo_app` (NOT a PostgreSQL superuser). This role has:
- `SELECT, INSERT, UPDATE, DELETE` on all tables
- `USAGE, SELECT` on all sequences
- No `CREATE`, `DROP`, `ALTER`, `TRUNCATE`, or superuser privileges
- RLS policies are enforced (FORCE ROW LEVEL SECURITY)

---

## Section I: Real-Time Sync

### I.1 Architecture Overview

```
Mutation in tRPC Router
  ↓
broadcastSync({ type, module, entityId, queryPaths, ... })
  ↓
storeSyncAction(action) → Redis ZADD (sorted set)
  Key: sync:{companyId}:actions
  Score: timestamp (Date.now())
  Member: JSON.stringify(SyncAction)
  ↓
subscribeToCompany() → 500ms polling loop
  ZRANGEBYSCORE sync:{companyId}:actions lastTimestamp+1 +inf
  ↓
sync.router.ts → tRPC subscription (SSE)
  Filters: skip own userId
  Phase 1: Offline recovery (getMissedActions)
  Phase 2: Live streaming (subscribeToCompany generator)
  ↓
useRealtimeSync() hook (client)
  Dedup via seenActionIds Set
  Invalidate tRPC queries by queryPaths
  Store lastSyncTimestamp in localStorage
  ↓
UI refetch → React Query cache update → component re-render
```

### I.2 SyncAction Type

**File:** `src/lib/realtime/redis-pubsub.ts`

```typescript
export interface SyncAction {
  id: string;                  // crypto.randomUUID()
  type: 'insert' | 'update' | 'delete';
  module: 'guests' | 'budget' | 'events' | 'vendors' | 'hotels'
        | 'transport' | 'timeline' | 'gifts' | 'clients' | 'floorPlans';
  entityId: string;            // specific ID or 'bulk'
  data?: Record<string, unknown>;
  companyId: string;
  clientId?: string;
  userId: string;              // who triggered the action
  timestamp: number;           // Date.now()
  queryPaths: string[];        // tRPC procedure paths to invalidate
  toolName?: string;           // chatbot tool name (if chatbot-initiated)
}
```

### I.3 broadcastSync Function

**File:** `src/lib/realtime/broadcast-sync.ts`

```typescript
interface BroadcastSyncParams {
  type: 'insert' | 'update' | 'delete';
  module: SyncAction['module'];
  entityId: string;
  companyId: string;
  clientId?: string;
  userId: string;
  data?: Record<string, unknown>;
  queryPaths: string[];
}

export async function broadcastSync(params: BroadcastSyncParams) {
  const syncAction: SyncAction = {
    id: randomUUID(),
    type: params.type,
    module: params.module,
    entityId: params.entityId,
    companyId: params.companyId,
    clientId: params.clientId,
    userId: params.userId,
    data: params.data,
    timestamp: Date.now(),
    queryPaths: params.queryPaths,
  };

  try {
    await storeSyncAction(syncAction);
  } catch (error) {
    // Log but don't throw — sync failure shouldn't block the mutation
    console.error('[broadcastSync] Failed:', error);
  }
}
```

### I.4 Redis Storage

**File:** `src/lib/realtime/redis-pubsub.ts`

| Parameter         | Value                              |
|-------------------|------------------------------------|
| Redis key format  | `sync:{companyId}:actions`         |
| Data structure    | Sorted Set (ZADD)                  |
| Score             | `action.timestamp` (Date.now())    |
| Member            | `JSON.stringify(SyncAction)`       |
| Max actions kept  | 1000 per company (ZREMRANGEBYRANK) |
| Key TTL           | 86400 seconds (24 hours)           |

```typescript
export async function storeSyncAction(action: SyncAction): Promise<void> {
  const key = `sync:${action.companyId}:actions`;
  await redis.zadd(key, { score: action.timestamp, member: JSON.stringify(action) });
  await redis.zremrangebyrank(key, 0, -1001);  // Keep only last 1000
  await redis.expire(key, 86400);               // 24h TTL
}
```

**Offline recovery:**
```typescript
export async function getMissedActions(companyId: string, since: number): Promise<SyncAction[]> {
  const key = `sync:${companyId}:actions`;
  const results = await redis.zrange(key, since + 1, '+inf', { byScore: true });
  return results.map(r => typeof r === 'string' ? JSON.parse(r) : r);
}
```

### I.5 Polling Subscription

**File:** `src/lib/realtime/redis-pubsub.ts`

```typescript
export async function* subscribeToCompany(
  companyId: string,
  signal?: AbortSignal
): AsyncGenerator<SyncAction, void, unknown> {
  const key = `sync:${companyId}:actions`;
  let lastTimestamp = Date.now();

  while (!signal?.aborted) {
    const newActions = await getMissedActions(companyId, lastTimestamp);
    for (const action of newActions) {
      lastTimestamp = Math.max(lastTimestamp, action.timestamp);
      yield action;
    }
    await new Promise(resolve => setTimeout(resolve, 500));   // 500ms normal
    // On error: 2000ms backoff
  }
}
```

**Why polling, not Pub/Sub:** Upstash REST API does not support persistent subscriptions. The sorted set + polling approach provides the same semantics with offline recovery built in.

### I.6 SSE Connection Manager

**File:** `src/lib/sse/connection-manager.ts`

| Parameter              | Value                          |
|------------------------|--------------------------------|
| Max connections/user   | 5                              |
| Max connections/company| 50                             |
| Counter TTL            | 7200 seconds (2 hours)         |
| Redis key (user)       | `sse:conn:user:{userId}`       |
| Redis key (company)    | `sse:conn:company:{companyId}` |

**Acquire/release pattern:**
1. `acquire(userId, companyId)` → Atomically INCR both counters, check limits
2. If over limit → Atomically DECR (rollback), throw `SSEConnectionLimitError`
3. Returns `ConnectionGuard { release(), released }` — idempotent release
4. On Redis failure → Degrade gracefully (allow connection without limits)

### I.7 Sync Router (Server-Side SSE)

**File:** `src/server/trpc/routers/sync.router.ts`

Procedure: `onSync` (tRPC subscription, `protectedProcedure`)

Input: `{ lastSyncTimestamp?: number }`

```
1. Validate companyId exists
2. Acquire SSE connection slot (acquire guard)
3. Phase 1 — Offline recovery:
   - getMissedActions(companyId, lastSyncTimestamp)
   - Yield each missed action (skip own userId)
4. Phase 2 — Live streaming:
   - for await (action of subscribeToCompany(companyId, signal))
   - Yield each new action (skip own userId)
5. On disconnect: release SSE connection slot (finally block)
```

Key behavior: Actions from the **same userId** are filtered out (no echo-back). Other users in the same company see the update immediately.

### I.8 Client-Side Hook

**File:** `src/features/realtime/hooks/use-realtime-sync.ts`

```typescript
export function useRealtimeSync(options?: {
  enabled?: boolean;
  onSync?: (action: SyncAction) => void;
  onConnectionChange?: (connected: boolean) => void;
}): { isConnected: boolean; lastSync: number | null; reconnect: () => void }
```

**Deduplication:**
- `seenActionIds` = `Set<string>` of `action.id` values
- Skip if already in set
- Evict: when size > 500, keep last 250

**Query invalidation:**
- Reads `action.queryPaths` (e.g., `['guests.getAll', 'guests.getStats']`)
- Calls `queryClient.invalidateQueries()` for each path
- React Query auto-refetches stale queries

**Offline recovery:**
- Stores `lastSyncTimestamp` in `localStorage` key: `weddingflo:lastSyncTimestamp`
- On reconnect, passes to `onSync` subscription input
- Server sends all missed actions since that timestamp

### I.9 Provider Components

**File:** `src/features/realtime/components/realtime-provider.tsx`

```typescript
export function RealtimeProvider({ children, enabled, onSync }) {
  const { isConnected, lastSync, reconnect } = useRealtimeSync({ enabled, onSync });
  return (
    <RealtimeContext.Provider value={{ isConnected, lastSync, reconnect }}>
      {children}
    </RealtimeContext.Provider>
  );
}
```

Wrapped around the dashboard layout. All dashboard pages receive real-time updates automatically.

### I.10 End-to-End Example

```
1. User A updates guest RSVP → guests.router.ts:updateRSVP mutation
2. Router calls:
   broadcastSync({
     type: 'update', module: 'guests', entityId: 'abc123',
     companyId: 'comp1', clientId: 'client1', userId: 'userA',
     queryPaths: ['guests.getAll', 'guests.getStats', 'budget.getSummary',
                  'clients.list', 'clients.getAll']
   })
3. storeSyncAction → ZADD sync:comp1:actions {score: 1740000000000, member: JSON}
4. User B's subscribeToCompany polls every 500ms
5. New action found → yielded to sync.router.ts subscription
6. sync.router.ts checks userId !== 'userB' → yields to SSE stream
7. Client receives SyncAction via tRPC subscription
8. useRealtimeSync deduplicates (seenActionIds)
9. Invalidates guests.getAll, guests.getStats, budget.getSummary, etc.
10. React Query refetches → UI updates with new RSVP status
```

---

## Section J: Chatbot Architecture

### J.1 Architecture Overview

```
User message (text)
  ↓
chatbot.router.ts — chat procedure
  ↓
1. Rate limit check (per user)
  ↓
2. Client resolution (from URL pathname or explicit clientId)
  ↓
3. Context build (context-builder.ts)
   - Parallel DB queries: events, guests, budget, vendors, timeline
   - User preferences (language, timezone, currency)
   - Conversation memory (LRU cache, max 500 sessions)
   - Pronoun resolution (recent entities)
  ↓
4. System prompt assembly (chatbot-system.ts)
   - Core instructions + tool usage rules
   - Formatted context injection
  ↓
5. LLM call (GPT-4o-mini primary, GPT-4o fallback)
   - callAIWithTracking() — records usage per company
  ↓
6. Response routing:
   a. Text response → return directly
   b. Query tool call → execute immediately → follow-up LLM for natural response
   c. Mutation tool call → generate preview → store pending call → return confirmation
  ↓
7. [If mutation confirmed] confirmToolCall procedure:
   - Retrieve pending call from DB
   - Verify expiry (5-min TTL)
   - executeToolWithSync() → execute + broadcastSync
   - Update conversation memory
   - Return success + cascade results
```

### J.2 System Prompt Structure

**File:** `src/lib/ai/prompts/chatbot-system.ts` — `CORE_SYSTEM_PROMPT`

| Section                  | Lines   | Content                                          |
|--------------------------|---------|--------------------------------------------------|
| Your Role                | 19-23   | Wedding planner assistant, execute via tools      |
| Language Support          | 25-36   | en, hi, es, fr, de, ja, zh — respond in user's language |
| Tool Usage Rules          | 38-48   | Queries auto-execute; mutations require confirmation |
| Available Tools Reference | 50-129  | All 52 tools organized by feature category        |
| Entity Resolution         | 131-134 | Fuzzy matching, natural language date parsing     |
| Cascade Effects           | 136-140 | Auto-creation of related records                  |
| Multi-Turn Conversations  | 142-164 | Progressive disclosure, pronoun resolution        |
| Safety Rules              | 166-176 | No auto-execute mutations, permission validation  |
| Response Format           | 184-303 | Query/mutation/error response templates           |
| Current Context           | runtime | Injected from `formatContextForPrompt()`          |

### J.3 Tool Definitions — Complete Inventory

**File:** `src/features/chatbot/tools/definitions.ts`

**Total: 52 tools (37 mutations, 15 queries)**

Each tool has: `name`, `category`, `type` (query|mutation), `description`, `parameters` (Zod schema), optional `cascadeEffects`

#### Client Management (3 tools)
| Tool              | Type     | Description                     |
|-------------------|----------|---------------------------------|
| `create_client`   | mutation | Create new wedding client       |
| `update_client`   | mutation | Update client details           |
| `get_client_summary` | query | Get client overview             |

#### Guest Management (6 tools)
| Tool                    | Type     | Description                     |
|-------------------------|----------|---------------------------------|
| `add_guest`             | mutation | Add new guest                   |
| `update_guest_rsvp`     | mutation | Update RSVP status              |
| `get_guest_stats`       | query    | Guest statistics                |
| `bulk_update_guests`    | mutation | Update multiple guests          |
| `check_in_guest`        | mutation | Day-of check-in                 |
| `delete_guest`          | mutation | Delete guest + cascade          |

#### Event Management (3 tools)
| Tool              | Type     | Description                     |
|-------------------|----------|---------------------------------|
| `create_event`    | mutation | Create event                    |
| `update_event`    | mutation | Update event details            |
| `delete_event`    | mutation | Delete event                    |

#### Timeline Management (3 tools)
| Tool                  | Type     | Description                     |
|-----------------------|----------|---------------------------------|
| `add_timeline_item`   | mutation | Add timeline entry              |
| `shift_timeline`      | mutation | Shift all items by duration     |
| `delete_timeline_item`| mutation | Delete timeline item            |

#### Vendor Management (3 tools)
| Tool              | Type     | Description                     |
|-------------------|----------|---------------------------------|
| `add_vendor`      | mutation | Add vendor                      |
| `update_vendor`   | mutation | Update vendor status/payment    |
| `delete_vendor`   | mutation | Delete vendor                   |

#### Hotel Management (3 tools)
| Tool                       | Type     | Description                     |
|----------------------------|----------|---------------------------------|
| `add_hotel_booking`        | mutation | Add hotel for guest             |
| `bulk_add_hotel_bookings`  | mutation | Bulk hotel assignments          |
| `sync_hotel_guests`        | query    | Get hotel summary               |

#### Budget (4 tools)
| Tool                    | Type     | Description                     |
|-------------------------|----------|---------------------------------|
| `get_budget_overview`   | query    | Budget summary                  |
| `update_budget_item`    | mutation | Update budget line item         |
| `budget_currency_convert`| query   | Convert currencies              |
| `delete_budget_item`    | mutation | Delete budget item              |

#### Search & Query (4 tools)
| Tool                        | Type  | Description                     |
|-----------------------------|-------|---------------------------------|
| `search_entities`           | query | Cross-entity search             |
| `query_data`                | query | Universal query (count, sum, avg, list, group_by) |
| `query_cross_client_events` | query | Events across clients           |
| `query_analytics`           | query | Business analytics              |

#### Seating & Gifts (5 tools)
| Tool                      | Type     | Description                     |
|---------------------------|----------|---------------------------------|
| `add_seating_constraint`  | mutation | Keep together/apart rules       |
| `update_table_dietary`    | mutation | Update table meal preferences   |
| `assign_guests_to_events` | mutation | Multi-event assignment          |
| `add_gift`                | mutation | Record gift                     |
| `update_gift`             | mutation | Update gift status              |
| `delete_gift`             | mutation | Delete gift                     |

#### Communication & Operations (4 tools)
| Tool                  | Type     | Description                     |
|-----------------------|----------|---------------------------------|
| `send_communication`  | mutation | Email/SMS to guests/vendors     |
| `update_pipeline`     | mutation | CRM pipeline stage              |
| `assign_transport`    | mutation | Assign transport logistics      |
| `assign_team_member`  | mutation | Assign team to client           |

#### Business Operations (5 tools)
| Tool                | Type     | Description                     |
|---------------------|----------|---------------------------------|
| `create_proposal`   | mutation | Create proposal document        |
| `create_invoice`    | mutation | Create invoice                  |
| `export_data`       | query    | Export to Excel/PDF/CSV         |
| `update_website`    | mutation | Update wedding website          |
| `update_creative`   | mutation | Update design job status        |

#### Utilities & Automation (6 tools)
| Tool                     | Type     | Description                     |
|--------------------------|----------|---------------------------------|
| `get_weather`            | query    | Weather forecast                |
| `create_workflow`        | mutation | Create automation workflow      |
| `generate_qr_codes`      | mutation | Generate check-in QR codes     |
| `sync_calendar`          | mutation | Sync to Google/iCal            |
| `get_document_upload_url`| query    | Get signed upload URL           |
| `get_wedding_summary`    | query    | Comprehensive report            |
| `get_recommendations`    | query    | Proactive alerts                |

### J.4 Tool Executor — Execution Flow

**File:** `src/features/chatbot/server/services/tool-executor.ts` (5,946 lines)

#### Key Functions:

**`generateToolPreview(toolName, args, ctx)`**
- Returns `ToolPreview` with: `toolName`, `action`, `description`, `fields[]`, `cascadeEffects[]`, `warnings[]`, `requiresConfirmation`
- Builds human-readable preview for mutations
- Generates warnings: budget overrun, past dates, duplicates

**`generateActionDescription(toolName, args, ctx)`**
- Human-readable description, e.g.: `"Add guest Raj Kumar to wedding"`, `"Shift timeline 30 minutes later"`

**`generateWarnings(toolName, args, ctx)`**
- Budget warnings: exceeds total budget
- Date warnings: past dates
- RSVP warnings: cascading effects on seating
- Duplicate detection for guests/vendors

**`executeTool(toolName, args, ctx)`**
- Main router: 52-case switch statement
- Routes to specific `execute*()` handlers (e.g., `executeAddGuest`, `executeUpdateClient`)
- Each handler uses Drizzle ORM within transactions (via `withTransaction` or `withCascadeTransaction`)

**`executeToolWithSync(toolName, args, ctx)`**
- Wrapper around `executeTool()`
- After successful execution (non-query tools):
  1. Gets invalidation paths via `getQueriesToInvalidate(toolName)`
  2. Creates `SyncAction` with `toolName` field
  3. Calls `storeSyncAction(action)` (non-fatal on failure)
  4. Returns result

#### Helper Modules:

- **`entity-resolver.ts`**: `resolveClient()`, `resolveGuest()`, `resolveVendor()`, `resolveEvent()`, `parseNaturalDate()`, `checkGuestDuplicates()`, `checkVendorDuplicates()`
- **`transaction-wrapper.ts`**: `withTransaction()`, `withCascadeTransaction()`, exports `TransactionClient` type
- **`pending-calls.ts`**: `setPendingCall()`, `getPendingCall()`, `deletePendingCall()` — PostgreSQL UNLOGGED table, 5-min TTL

### J.5 Context Builder

**File:** `src/features/chatbot/server/services/context-builder.ts` (1,337 lines)

**`buildChatbotContext(clientId, companyId, userId)`** — Parallel queries:

```typescript
Promise.all([
  buildEventStats(clientId, companyId),       // total, upcoming, completed, nextEvent
  buildGuestStats(clientId, companyId),       // confirmed, pending, declined, dietary, hotel needs
  buildBudgetStats(clientId, companyId, totalBudget),  // totals, paid, remaining, %used
  buildVendorStats(clientId, companyId),      // by category, confirmed/pending
  buildTimelineStats(clientId, companyId),    // items, next item for today
  userId ? buildUserPreferences(userId) : undefined,
])
```

**ChatbotContext shape:**
```typescript
{
  hasClient: boolean;
  client: {
    id, displayName, partner1Name, partner2Name,
    weddingDate, venue, totalBudget, guestCountEstimate,
    status, weddingType
  } | null;
  events: { total, upcoming, completed, nextEvent: { title, date, type } | null };
  guests: { total, confirmed, pending, declined, maybe, needsHotel, needsTransport, dietarySpecial };
  budget: { totalBudget, totalEstimated, totalActual, totalPaid, remaining, percentUsed, itemCount };
  vendors: { total, confirmed, pending, byCategory: Record<string, number> };
  timeline: { totalItems, upcomingToday, nextItem: { title, startTime } | null };
  timestamp: Date;
  userPreferences?: { language, timezone, currency };
  conversationMemory?: ConversationMemory;
}
```

**Conversation Memory (LRU cache):**
- Max 500 concurrent sessions
- 1-hour expiry
- Tracks: `lastTopics` (last 5), `recentEntities` (last 10), `pendingFollowUps`, `sessionStarted`, `messageCount`

**Pronoun Resolution:** `resolvePronouns(message, memory)` — matches "them/they/those", "it/that/this", "him/her" to most recent entity `{ entityType, entityId, entityName }`

**`formatContextForPrompt(context)`** — Generates markdown injected into system prompt:
```
## Current Wedding: {displayName}
### Wedding Details — couple, date, venue, status
### Guest Summary — total, confirmed/pending/declined, hotel/transport needs
### Budget Summary — total, paid, remaining, %used
### Events — total, upcoming, next event
### Vendors — total, confirmed/pending, by category
### Timeline — total items, next item
### User Preferences — language, timezone, currency
### Recent Conversation Context — topics, entities, follow-ups
```

### J.6 Chatbot Router — Procedures

**File:** `src/features/chatbot/server/routers/chatbot.router.ts`

**Total: 20 procedures**

#### Core Chat (3 procedures)
| Procedure          | Type     | Description                                    |
|--------------------|----------|------------------------------------------------|
| `chat`             | mutation | Main chat endpoint — LLM call + tool routing   |
| `confirmToolCall`  | mutation | Confirm a pending mutation tool call            |
| `cancelToolCall`   | mutation | Cancel a pending tool call                      |

#### Context & Usage (2 procedures)
| Procedure   | Type  | Description                                    |
|-------------|-------|------------------------------------------------|
| `getUsage`  | query | AI usage stats for company                     |
| `getContext` | query | Current chatbot context for session            |

#### Conversation Management (6 procedures)
| Procedure             | Type     | Description                                |
|-----------------------|----------|--------------------------------------------|
| `listConversations`   | query    | List user's conversations with pagination  |
| `getConversation`     | query    | Get conversation + message history         |
| `createConversation`  | mutation | Create new conversation                    |
| `resumeConversation`  | mutation | Resume by ID or find recent (24h)          |
| `updateConversation`  | mutation | Update title/summary                       |
| `deleteConversation`  | mutation | Delete conversation (cascades to messages) |

#### Message Persistence (1 procedure)
| Procedure      | Type     | Description                                |
|----------------|----------|--------------------------------------------|
| `saveMessage`  | mutation | Save message, auto-generate title on first |

#### Command Templates (8 procedures)
| Procedure              | Type     | Description                         |
|------------------------|----------|-------------------------------------|
| `listTemplates`        | query    | List pinned + by usage count        |
| `getTemplate`          | query    | Get single template                 |
| `saveTemplate`         | mutation | Create new template                 |
| `updateTemplate`       | mutation | Update template & pin status        |
| `deleteTemplate`       | mutation | Delete template                     |
| `useTemplate`          | mutation | Increment usage count, return cmd   |
| `toggleTemplatePin`    | mutation | Pin/unpin template                  |
| `getSuggestedTemplates`| query    | Suggestions based on usage patterns |

### J.7 Chat Procedure — Detailed Flow

**Procedure: `chat`** (mutation, `protectedProcedure`)

Input: `{ messages: ChatCompletionMessageParam[], clientId?: string, pathname?: string }`

```
1. Rate limit check (per userId)
2. Extract clientId from pathname if not provided (e.g., /dashboard/clients/abc123)
3. Validate client ownership (companyId match)
4. Build context: buildChatbotContext(clientId, companyId, userId)
5. Resolve pronouns in last user message against conversation memory
6. Assemble system prompt: CORE_SYSTEM_PROMPT + formatContextForPrompt(context)
7. Call LLM via callAIWithTracking(messages, system, tools)
   - Primary: GPT-4o-mini
   - Fallback: GPT-4o
8. Parse response:
   a. Text only → return { type: 'response', content }
   b. Query tool call:
      - executeToolWithSync(toolName, args, ctx)
      - Follow-up LLM call to format result as natural language
      - return { type: 'response', content, toolResult }
   c. Mutation tool call:
      - generateToolPreview(toolName, args, ctx)
      - setPendingCall({ toolName, args, preview }) → PostgreSQL, 5-min expiry
      - return { type: 'confirmation_required', preview, pendingCallId }
```

### J.8 Pending Call Lifecycle

```
1. Mutation detected → generateToolPreview()
2. Store in chatbot_pending_calls (UNLOGGED table):
   - id: caller-supplied text
   - userId, companyId, toolName, args (jsonb), preview (jsonb)
   - expiresAt: NOW() + 5 minutes
3. Client shows preview card with Confirm/Cancel buttons
4a. User confirms → confirmToolCall procedure:
    - Retrieve pending call, verify not expired
    - executeToolWithSync(toolName, args, ctx)
    - Delete pending call
    - Return { success: true, data, cascadeResults }
4b. User cancels → cancelToolCall procedure:
    - Delete pending call
5. Expired calls cleaned up by cron / lazy check
```

### J.9 SSE Streaming Endpoint

**File:** `src/app/api/chatbot/stream/route.ts`

Separate from tRPC — used for streaming LLM responses directly to the client. Uses Vercel AI SDK's `StreamingTextResponse` for token-by-token delivery during long-running LLM calls.

### J.10 Chatbot Registration

**File:** `src/server/trpc/routers/_app.ts:163`

```typescript
chatbot: chatbotRouter,
```

The chatbot router is registered as `chatbot` in the main app router, making all procedures available at `trpc.chatbot.*`.

---

## Section K: Data Loss Prevention

### K.1 Soft-Delete Tables

The following tables use a `deletedAt` timestamp column. Queries filter with `isNull(table.deletedAt)` to exclude soft-deleted rows.

| Table | Schema File | Column |
|-------|-------------|--------|
| `clients` | `src/lib/db/schema-features.ts:126` | `deleted_at` |
| `events` | `src/lib/db/schema-features.ts:304` | `deleted_at` |
| `timeline` | `src/lib/db/schema-features.ts:333` | `deleted_at` |
| `hotels` | `src/lib/db/schema-features.ts:217` | `deleted_at` |
| `messages` | `src/lib/db/schema-features.ts:822` | `deleted_at` |
| `weddingWebsites` | `src/lib/db/schema-features.ts:1066` | `deleted_at` |
| `accommodations` | `src/lib/db/schema-features.ts:1088` | `deleted_at` |
| `proposals` | `src/lib/db/schema-proposals.ts:111` | `deleted_at` |
| `contracts` | `src/lib/db/schema-proposals.ts:212` | `deleted_at` |
| `pipelineLeads` | `src/lib/db/schema-pipeline.ts:94` | `deleted_at` |

### K.2 Foreign Key onDelete Settings

#### CASCADE (child records hard-deleted with parent)

| Parent | Child | File Reference |
|--------|-------|----------------|
| `clients` | `clientUsers` | `schema-features.ts:134` |
| `clients` | `guests` | `schema-features.ts:148` |
| `clients` | `events` | `schema-features.ts:288` |
| `clients` | `timeline` | `schema-features.ts:312` |
| `clients` | `budget` | `schema-features.ts:449` |
| `clients` | `documents` | `schema-features.ts:497` |
| `clients` | `clientVendors` | `schema-features.ts:385` |
| `clients` | `guestGifts` | `schema-features.ts:881` |
| `clients` | `floorPlans` | `schema-features.ts:640` |
| `clients` | `gifts` | `schema-features.ts:690` |
| `clients` | `payments` | `schema-features.ts:830` |
| `clients` | `weddingWebsites` | `schema-features.ts:1055` |
| `clients` | `accommodations` | `schema-features.ts:1073` |
| `clients` | `creativeJobs` | `schema-features.ts:755` |
| `clients` | `emailLogs` | `schema-features.ts:558` |
| `clients` | `smsLogs` | `schema-features.ts:600` |
| `clients` | `hotelBookings` | `schema-features.ts:857` |
| `clients` | `activity` | `schema-features.ts:914` |
| `clients` | `guestTransport` | `schema-features.ts:257` |
| `floorPlans` | `floorPlanTables` | `schema-features.ts:658` |
| `floorPlanTables` | `floorPlanGuests` | `schema-features.ts:678` |
| `budget` | `advancePayments` | `schema-features.ts:479` |
| `vendors` | `vendorComments` | `schema-features.ts:420` |
| `vendors` | `vendorReviews` | `schema-features.ts:430` |
| `seatingVersions` | (floorPlan ref) | `schema-features.ts:1001` |
| `user` | `chatbotConversations` | `schema-chatbot.ts:22` |

#### SET NULL (orphan child records, clear FK)

| Parent | Child | File Reference |
|--------|-------|----------------|
| `events` | `guestTransport` | `schema-features.ts:278` |
| `events` | `timeline` | `schema-features.ts:314` |
| `events` | `clientVendors` | `schema-features.ts:388` |
| `events` | `budget` | `schema-features.ts:452` |
| `guests` | `floorPlanGuests` | `schema-features.ts:679` |
| `vendors` | `advancePayments` | `schema-features.ts:481` |
| `vendors` | `budget` | `schema-features.ts:451` |

### K.3 Transaction Wrapping Pattern

**File:** `src/features/chatbot/server/services/transaction-wrapper.ts`

Three transaction functions are available:

**`withTransaction<T>(fn, options)`** (lines 100-154)
- Wraps `fn(tx)` in a Drizzle transaction with automatic BEGIN/COMMIT/ROLLBACK
- Retries up to 3 attempts on deadlocks (40P01), serialization failures (40001), lock timeouts (55P03)
- Exponential backoff: 100ms, 200ms, 300ms

**`withAtomicOperations<T>(operations)`** (lines 165-178)
- Runs multiple independent operations inside one transaction — all succeed or all fail
- Returns array of results in input order

**`withCascadeTransaction<TMain, TCascade>(mainOp, cascadeOps)`** (lines 190-213)
- Runs a main operation, then passes its result to dependent cascade operations
- Returns `{ main, cascade }` object

```typescript
import { withTransaction, TransactionClient } from '@/features/chatbot/server/services/transaction-wrapper'

const result = await withTransaction(async (tx: TransactionClient) => {
  await tx.delete(guests).where(eq(guests.clientId, clientId))
  await tx.update(clients).set({ deletedAt: new Date() }).where(eq(clients.id, clientId))
  return { deleted: true }
})
```

### K.4 Client Delete Cascade

**File:** `src/features/clients/server/routers/clients.router.ts` (lines 1037-1265)

The client deletion procedure performs a manual 19-table cascade wrapped in `withTransaction()`. The deletion order respects FK dependencies (deepest children first):

```
 1. floorPlanGuests    (deepest nested)
 2. floorPlanTables
 3. floorPlans
 4. timeline
 5. hotels
 6. guestTransport
 7. guestGifts
 8. guests
 9. clientVendors
10. budget
11. events
12. documents
13. gifts
14. giftsEnhanced
15. messages
16. payments
17. weddingWebsites
18. activity
19. clientUsers
    ── then soft-delete client (SET deletedAt = NOW()) ──
```

Each delete uses `.returning()` to count affected rows. After commit, `broadcastSync()` invalidates client lists and the response includes deletion metrics.

### K.5 Activity Table Audit Logging

**Schema:** `src/lib/db/schema-features.ts` (lines 909-927)

```
activity(id, userId, companyId, clientId, type, action, data, ipAddress, userAgent, read, createdAt)
```

Indexes: `activity_client_id_idx`, `activity_user_id_idx`, `activity_company_id_idx`, `activity_type_action_idx`

**Auth Logger:** `src/lib/auth/auth-logger.ts`

Logged auth events: `sign_in`, `sign_out`, `sign_up`, `password_reset_request`, `password_reset_complete`, `sign_in_failed`, `session_refresh`, `account_locked`

Each log captures: userId, companyId, IP address (from x-forwarded-for / x-real-ip), user agent. Logging failures are caught and swallowed — they never block auth operations.

### K.6 Seating Versioning

**Schema:** `src/lib/db/schema-features.ts` (lines 987-1005)

Two tables support seating version control:

**`seatingChangeLog`** — audit trail of individual changes with `previousData` / `newData` JSON snapshots. Cascades on floor plan delete.

**`seatingVersions`** — named snapshots (e.g., "Plan A", "Plan B") storing complete `layout` JSON:

```typescript
layout = {
  tablePositions: [{ id, tableNumber, tableName, shape, x, y, width, height, rotation, capacity, metadata }],
  guestAssignments: [{ guestId, tableId, seatNumber }]
}
```

**Save procedure:** `src/features/events/server/routers/floor-plans.router.ts` (lines 1024-1098)
- Fetches current tables + guest assignments
- Creates JSON snapshot
- Inserts new version record

Versions are created manually via `saveVersion` — no automatic versioning on every change.

---

## Section L: Debugging Guide

### L.1 "Dashboard shows wrong counts"

**Root cause:** Cached `clients.budget` or `clients.guestCount` is stale.

**Fix function:** `recalcClientStats(clientId)`
**File:** `src/lib/sync/client-stats-sync.ts` (lines 30-59)

SQL executed:
```sql
-- Budget total
UPDATE clients SET budget = (
  SELECT COALESCE(SUM(CAST(estimated_cost AS NUMERIC)), 0)::TEXT
  FROM budget WHERE client_id = $1
)
-- Guest count
UPDATE clients SET guest_count = (
  SELECT COUNT(*)::INTEGER FROM guests WHERE client_id = $1
)
```

**Called from 8+ places:** budget mutations, guest mutations, Excel import, Google Sheets sync, chatbot tool-executor, client creation.

**Emergency SQL** (run in Supabase SQL editor):
```sql
UPDATE clients SET
  budget = (SELECT COALESCE(SUM(CAST(estimated_cost AS NUMERIC)), 0)::TEXT FROM budget WHERE client_id = clients.id),
  guest_count = (SELECT COUNT(*) FROM guests WHERE client_id = clients.id),
  updated_at = NOW()
WHERE company_id = '<COMPANY_ID>';
```

**Checklist:**
- Is `recalcClientStats` called AFTER the mutation, not before?
- Are soft-deleted budget items still being counted?
- Is the `clientId` filter correct?

### L.2 "Changes don't sync across tabs/users"

**Broadcast system:** `src/lib/realtime/broadcast-sync.ts` (lines 16-39)

Mutations call `broadcastSync()` → `storeSyncAction()` → writes to Redis sorted set.

**Redis storage:** `src/lib/realtime/redis-pubsub.ts` (lines 74-94)
- Key: `sync:{companyId}:actions` (sorted set, scored by timestamp)
- Keeps last 1000 actions per company, 24-hour TTL
- Clients poll via `sync.subscribeToCompany` tRPC subscription

**Query invalidation map:** `src/features/chatbot/server/services/query-invalidation-map.ts` (lines 18-93)
- Maps 31 mutation tools to tRPC query paths that need invalidation
- If a tool isn't in `TOOL_QUERY_MAP`, its queries won't invalidate

**Checklist:**
- Is Redis connected? Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Is `broadcastSync()` called after the mutation?
- Does the client call `subscribeToCompany(companyId)`?
- Is the mutation tool listed in `TOOL_QUERY_MAP`?

### L.3 "Excel import loses data"

**Header alias system:** `src/lib/import/excel-parser.ts` (lines 78-111)

Headers are normalized in two steps:
1. **stripHeaderAnnotations** (lines 123-130): removes `(...)`, `*`, `#` prefixes, lowercases
2. **resolveHeaderAliases** (lines 138-159): maps common aliases to canonical names

Example aliases:
- `'item'` → `['expense name', 'expense item']`
- `'estimated cost'` → `['budgeted amount']`
- `'check in date'` → `['check-in date', 'check-in']`

**Checklist:**
- Do Excel headers match `EXPECTED_*_HEADERS` arrays (lines 19-71)?
- Are annotations blocking recognition? (e.g., `"Item (numbers only)"` should resolve to `"item"`)
- Are `REQUIRED_*_HEADERS` present? (e.g., `REQUIRED_GUEST_HEADERS = ['Guest Name']`)
- Row 2 hints are skipped (lines 384-387) — make sure data starts on row 3

### L.4 "Chatbot creates incomplete data"

**Tool executor:** `src/features/chatbot/server/services/tool-executor.ts`

Key differences from UI routers:
1. All mutations wrapped in `withTransaction()` with deadlock retry (3 attempts, exponential backoff)
2. Generates preview before execution with `getCascadeEffects()`
3. Always calls `recalcClientStats` after guest/budget mutations
4. Calls `recalcPerGuestBudgetItems` for per-guest cost recalculation
5. Calls `cascadeGuestSideEffects` for guest updates

**Checklist:**
- Check logs for `"Failed after retries"` — transaction rolled back
- Verify `recalcClientStats` ran (check `clients.updatedAt`)
- Check `storeSyncAction` broadcast succeeded
- Confirm tool is listed in `TOOL_QUERY_MAP` for query invalidation

### L.5 "User sees other company's data"

**RLS enforcement:** `drizzle/migrations/0024_enable_rls_all_tables.sql`

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clients
  FOR ALL
  USING (company_id = current_company_id() OR is_super_admin())
  WITH CHECK (company_id = current_company_id() OR is_super_admin());
```

**Tenant scope:** `src/lib/db/with-tenant-scope.ts` (lines 61-89)
```typescript
await withTenantScope(db, { companyId, role, userId }, async (tx) => {
  return tx.select().from(guests)  // RLS auto-filters
})
```

Sets `app.current_company_id` and `app.current_role` via `SET LOCAL` (transaction-scoped).

**Checklist:**
- Is `withTenantScope()` called (not raw `db` queries)?
- Does the table have an RLS policy? (check migration 0024)
- Does the table have a `company_id` column? (`client_vendors` was missing — fixed in migration 0028)
- Do helper functions `current_company_id()` and `is_super_admin()` exist? (migration 0023)

### L.6 "Google Sheets sync fails"

**Token encryption:** `src/lib/crypto/token-encryption.ts`
- Algorithm: AES-256-GCM with random 12-byte IV per encryption
- Storage format: `enc:v1:iv:authTag:ciphertext` (base64-encoded)
- Key: `TOKEN_ENCRYPTION_KEY` env var — 32 bytes, base64-encoded
- Generate: `openssl rand -base64 32`

**Google OAuth:** `src/lib/google/sheets-client.ts` (lines 26-99)
- Auth URL: `getAuthUrl(userId)`
- Token exchange: `getTokensFromCode(code)`
- Token refresh: `refreshAccessToken(refreshToken)`
- Scopes: `spreadsheets`, `drive.file`

**Checklist:**
- Are `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set?
- Is `TOKEN_ENCRYPTION_KEY` set and exactly 32 bytes? (decode base64, check `.length === 32`)
- Do stored tokens start with `enc:v1:`? If not, they're unencrypted or corrupted
- Does the Google OAuth callback URL match? (`/api/google-sheets/callback`)
- If decrypt fails: wrong key, corrupted data, or key was rotated

### L.7 "Auth redirect loop"

**BetterAuth config:** `src/lib/auth.ts` (lines 214-228)

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7,   // 7 days
  updateAge: 60 * 60 * 24,        // refresh every 1 day
  cookieCache: { enabled: true, maxAge: 60 * 5 },  // 5-min cache
}
advanced: {
  cookiePrefix: production ? '__Secure-wf' : 'wf',
  useSecureCookies: production,
}
```

**Env validation:** `src/lib/auth/validate-env.ts` (lines 20-120)
- Required: `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32 chars), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`
- Production: both URLs must start with `https://`

**Checklist:**
- Does `BETTER_AUTH_URL` match the actual domain?
- Does `NEXT_PUBLIC_APP_URL` match? (used for cookie domain)
- In dev: cookies use `wf` prefix (no Secure flag). In prod: `__Secure-wf` prefix (requires HTTPS)
- Is `BETTER_AUTH_SECRET` a real secret (not a placeholder)?
- Check browser DevTools → Network tab for 429 (rate limiting) or cookie domain mismatch
- Auth is NOT in proxy.ts — only i18n routing belongs there

---

## Section M: Environment Variables

### M.1 Required Variables (app won't start without these)

| Variable | Type | Purpose |
|----------|------|---------|
| `DATABASE_URL` | Server | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Server | Session signing key (min 32 chars) |
| `BETTER_AUTH_URL` | Server | Auth server origin (HTTPS in prod) |
| `NEXT_PUBLIC_APP_URL` | Client | Application base URL for redirects |

### M.2 Database & Supabase

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client | Yes | Supabase publishable key |
| `SUPABASE_SECRET_KEY` | Server | Yes | Service role key (admin) |
| `SUPABASE_ACCESS_TOKEN` | Server | Yes | CLI auth token for migrations |
| `TEST_DATABASE_URL` | Server | No | Separate test database |

### M.3 OAuth Providers

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `GOOGLE_CLIENT_ID` | Server | No | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Server | No | Google OAuth |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client | No | Google One-Tap SDK |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client | No | Cloudflare Turnstile CAPTCHA |

### M.4 AI / LLM

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `OPENAI_API_KEY` | Server | No | OpenAI API key |
| `OPENAI_MODEL` | Server | No | Model name (default: `gpt-4o-mini`) |
| `OPENAI_MAX_TOKENS` | Server | No | Token limit (default: `2000`) |
| `DEEPSEEK_API_KEY` | Server | No | DeepSeek fallback provider |
| `DEEPSEEK_API_BASE` | Server | No | DeepSeek endpoint |
| `DEEPSEEK_MODEL` | Server | No | DeepSeek model name |

### M.5 Payments (Stripe)

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `STRIPE_SECRET_KEY` | Server | No | Stripe API secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | No | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Server | No | Webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PRICE_STARTER` | Client | No | Starter tier price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL` | Client | No | Professional tier price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE` | Client | No | Enterprise tier price ID |
| `STRIPE_PLATFORM_FEE_PERCENT` | Server | No | Vendor payment fee (default: `10`) |

### M.6 Email (Resend)

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `RESEND_API_KEY` | Server | No | Resend email API key |
| `RESEND_FROM_EMAIL` | Server | No | Default sender address |
| `RESEND_WEBHOOK_SECRET` | Server | No | Production webhook secret |
| `RESEND_WEBHOOK_SECRET_NGROK` | Server | No | Ngrok dev webhook secret |
| `RESEND_WEBHOOK_SECRET_FLYIO` | Server | No | Fly.io webhook secret |

### M.7 SMS (Twilio)

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `TWILIO_ACCOUNT_SID` | Server | No | Twilio account ID |
| `TWILIO_AUTH_TOKEN` | Server | No | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Server | No | SMS sender (E.164 format) |
| `TWILIO_WHATSAPP_NUMBER` | Server | No | WhatsApp sender |

### M.8 Push Notifications (Firebase)

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client | No | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | No | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client | No | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client | No | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client | No | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client | No | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Client | No | Google Analytics ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Client | No | FCM VAPID key |
| `FIREBASE_ADMIN_PROJECT_ID` | Server | No | Admin SDK project |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server | No | Admin service account |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Server | No | Admin private key (multiline) |

### M.9 Storage (Cloudflare R2)

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `R2_ENDPOINT` | Server | No | S3-compatible endpoint |
| `R2_ACCESS_KEY_ID` | Server | No | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Server | No | R2 secret key |
| `R2_BUCKET_NAME` | Server | No | Bucket (default: `weddingflo-storage`) |
| `CLOUDFLARE_ACCOUNT_ID` | Server | No | For CDN URL construction |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Client | No | Public CDN URL for files |

### M.10 Monitoring & Analytics

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Client | No | Sentry error tracking |
| `SENTRY_AUTH_TOKEN` | Server | No | Sentry build-time auth |
| `SENTRY_ORG` | Server | No | Sentry org slug |
| `SENTRY_PROJECT` | Server | No | Sentry project slug |
| `NEXT_PUBLIC_POSTHOG_KEY` | Client | No | PostHog analytics key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Client | No | PostHog host URL |

### M.11 Caching & Rate Limiting (Redis)

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Server | No | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Server | No | Upstash Redis auth token |

### M.12 Security & Miscellaneous

| Variable | Type | Required | Purpose |
|----------|------|----------|---------|
| `TOKEN_ENCRYPTION_KEY` | Server | No | AES-256-GCM key for OAuth tokens (base64, 32 bytes) |
| `CRON_SECRET` | Server | No | Bearer token for cron job auth |
| `EXCHANGE_RATE_API_KEY` | Server | No | Live currency exchange rates |
| `SUPER_ADMIN_EMAIL` | Server | No | Super admin for onboarding |
| `NODE_ENV` | Both | No | `development` / `production` / `test` |
| `ANALYZE` | Build | No | Enable bundle analysis (`true`) |

### M.13 What Breaks If Missing

| Missing Variable | Consequence |
|------------------|-------------|
| `DATABASE_URL` | App won't start — no DB connection |
| `BETTER_AUTH_SECRET` | Auth unusable — sessions can't be signed |
| `BETTER_AUTH_URL` | Auth callbacks fail — wrong origin |
| `NEXT_PUBLIC_APP_URL` | Redirects break — wrong base URL |
| `OPENAI_API_KEY` | Chatbot + AI features disabled |
| `STRIPE_SECRET_KEY` | Payment processing disabled |
| `RESEND_API_KEY` | Email sending fails (logs warning) |
| `TWILIO_ACCOUNT_SID` | SMS sending disabled |
| `UPSTASH_REDIS_REST_URL` | Rate limiting disabled, sync polling fails |
| `TOKEN_ENCRYPTION_KEY` | Google Sheets OAuth tokens can't be encrypted/decrypted |
| `R2_ENDPOINT` | File uploads disabled |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking disabled (silent) |

---

## Section N: Internationalization (i18n)

### N.1 Configuration

**Package:** `next-intl` v4.5.8

| File | Purpose |
|------|---------|
| `i18n/config.ts` | Locale list, display names, flags, currency mapping |
| `i18n/routing.ts` | `defineRouting()` with `localePrefix: 'always'` |
| `i18n/request.ts` | Server-side message loading per request |
| `src/lib/navigation.ts` | Type-safe `Link`, `useRouter`, `redirect`, `usePathname` |
| `src/app/[locale]/layout.tsx` | Wraps app with `NextIntlClientProvider` |

### N.2 Supported Languages

| Code | Name | Flag | Default Currency |
|------|------|------|------------------|
| `en` | English | US | USD |
| `es` | Espanol | ES | EUR |
| `fr` | Francais | FR | EUR |
| `de` | Deutsch | DE | EUR |
| `ja` | Japanese | JP | JPY |
| `zh` | Chinese | CN | CNY |
| `hi` | Hindi | IN | INR |

### N.3 Translation Files

**Location:** `messages/` directory

| File | Lines |
|------|-------|
| `messages/en.json` | ~3,093 |
| `messages/es.json` | ~2,404 |
| `messages/fr.json` | ~2,438 |
| `messages/de.json` | ~2,504 |
| `messages/ja.json` | ~2,438 |
| `messages/zh.json` | ~2,549 |
| `messages/hi.json` | ~2,549 |

**50+ namespaces** organized by feature: `auth`, `dashboard`, `clients`, `guests`, `budget`, `vendors`, `events`, `timeline`, `chatbot`, `portal`, `settings`, `common`, `navigation`, etc.

### N.4 Usage Pattern

```typescript
// Client component
'use client'
import { useTranslations } from 'next-intl'

export function MyComponent() {
  const t = useTranslations('clients')        // feature namespace
  const tc = useTranslations('common')         // shared keys
  return <h1>{t('clientTitle')}</h1>
}

// Interpolation
t('errorId', { id: '123' })  // "Error ID: 123"

// Navigation (auto-prefixes locale)
import { Link, useRouter } from '@/lib/navigation'
<Link href="/dashboard">Dashboard</Link>     // → /en/dashboard
```

### N.5 How to Add a New Language

1. Add locale code to `i18n/config.ts`:
   ```typescript
   export const locales = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi', 'pt'] as const
   ```
2. Add entries to `localeNames`, `localeFlags`, `localeCurrencyMap`
3. Copy `messages/en.json` to `messages/pt.json` and translate
4. No other changes needed — routing auto-detects new locales

### N.6 How to Add a New Translation Key

1. Add the key to ALL 7 message files (same JSON path in each):
   ```json
   { "common": { "newButton": "Launch" } }         // en.json
   { "common": { "newButton": "Lanzar" } }          // es.json
   ```
2. Use in component: `const t = useTranslations('common'); t('newButton')`
3. Convention: camelCase keys, dot notation for nesting, `{varName}` for interpolation

### N.7 Routing

All URLs are locale-prefixed: `/en/dashboard`, `/es/settings`, `/ja/portal`.

The `[locale]` segment is validated in `src/app/[locale]/layout.tsx` — unsupported locales trigger `notFound()`. The next-intl plugin in `next.config.ts` handles automatic locale detection and redirection.

---

## Section O: File Uploads & Storage

### O.1 Cloudflare R2 Configuration

**File:** `src/lib/storage/r2-client.ts`

Uses `@aws-sdk/client-s3` with S3-compatible R2 endpoint:

```typescript
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})
```

### O.2 Presigned URL Flow

```
Client                    Server (tRPC)                 Cloudflare R2
  │                          │                              │
  ├─ storage.getUploadUrl ──►│                              │
  │  (fileName, type, size)  │── getPresignedUploadUrl() ──►│
  │                          │◄── signed PUT URL (900s) ────┤
  │◄── { url, key } ────────┤                              │
  │                          │                              │
  ├─ fetch(url, PUT, file) ─────────────────────────────────►│
  │◄── 200 OK ──────────────────────────────────────────────┤
  │                          │                              │
  ├─ documents.create ──────►│ (save metadata to DB)        │
```

- Upload TTL: 15 minutes (900s)
- Download TTL: 1 hour (3600s)
- Public URL pattern: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`

### O.3 File Type & Size Limits

| Category | Max Size | Allowed MIME Types |
|----------|----------|-------------------|
| Images | 10 MB | `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| Documents | 25 MB | `application/pdf`, `.docx`, `.xlsx` |
| Videos | 100 MB | `video/mp4`, `video/webm` |
| Audio | 25 MB | `audio/mpeg`, `audio/wav`, `audio/ogg` |

Defined in `r2-client.ts` lines 260-277.

### O.4 Tenant Isolation

**Key generation:** `generateFileKey(companyId, fileName, clientId?)`

Path pattern: `documents/{companyId}/{clientId}/{timestamp}-{sanitizedFileName}`

All storage router procedures verify `key.startsWith('documents/${ctx.companyId}/')` before allowing access. Path traversal prevention via `validateStorageKey()`:
- Rejects `..` (traversal), leading `/`, double `//`, null bytes
- Max key length: 1024 characters

### O.5 Storage tRPC Router

**File:** `src/features/media/server/routers/storage.router.ts`

| Procedure | Input | Purpose |
|-----------|-------|---------|
| `getUploadUrl` | fileName, fileType, fileSize, category, clientId? | Returns presigned PUT URL |
| `getDownloadUrl` | key | Returns presigned GET URL |
| `deleteFile` | key | Deletes from R2 |
| `listFiles` | clientId?, maxKeys (1-100) | Lists files by prefix |
| `bulkDelete` | keys[] (1-100) | Parallel deletion with `Promise.allSettled` |

All procedures require `adminProcedure` (authenticated + companyId).

### O.6 Frontend Upload Components

| Component | File | Max Size | Types |
|-----------|------|----------|-------|
| Avatar Upload | `src/components/settings/avatar-upload.tsx` | 10 MB | `image/*` |
| Logo Upload | `src/components/settings/logo-upload.tsx` | 5 MB | `image/*` |
| Generic File Upload | `src/components/forms/form-file-upload.tsx` | Configurable | Configurable |

The generic component supports drag-and-drop, multiple file selection, and custom validation via `FileInputConstraints` interface.

---

## Section P: Notifications, Payments & Portal

### P.1 Email (Resend)

**Client:** `src/lib/email/resend-client.ts` — lazy-initialized, max 3 retries, 30s timeout

**Email Router:** `src/features/communications/server/routers/email.router.ts` (~1,171 lines)

| Email Type | Trigger | Line |
|------------|---------|------|
| Client Invite | `sendClientInvite()` mutation | 86 |
| Wedding Reminder | `sendWeddingReminder()` mutation | 190 |
| RSVP Confirmation | `sendRsvpConfirmation()` mutation | 408 |
| Payment Reminder | Cron job `check-payment-reminders` | (see P.3) |
| Payment Receipt | `sendPaymentReceipt()` mutation | 521 |
| Vendor Communication | `sendVendorNotification()` mutation | 645 |
| Weekly Digest | `src/lib/email/digest-service.ts` | 255 |

All emails support 7 locales (en, es, fr, de, ja, zh, hi).

**Email Queue:** `src/lib/email/email-queue.ts` — priority levels (high/normal/low), auto-retry up to 3x with exponential backoff, scheduled sending support.

**Webhook Handler:** `src/app/api/webhooks/resend/route.ts` (~363 lines)
- Events: sent, delivered, delivery_delayed, complained, bounced, opened, clicked
- HMAC-SHA256 signature verification with timing-safe comparison
- Idempotent processing via `processWebhookWithIdempotency()`

### P.2 SMS (Twilio)

**Client:** `src/lib/sms/twilio-client.ts` — lazy-initialized

**Templates:** `src/lib/sms/twilio.ts` (lines 33-130) — 7 locales, 6 template types:

| Template | Example |
|----------|---------|
| `weddingReminder` | "Wedding Reminder: {eventName} in {days} days!" |
| `rsvpConfirmation` | "Hi {guestName}! Your RSVP is confirmed." |
| `paymentReminder` | "Payment Reminder: {amount} due on {dueDate}." |
| `paymentReceived` | "Payment Received: {amount} processed." |
| `vendorNotification` | "Message from your wedding planner: {message}" |
| `eventUpdate` | "Update: {eventName} - {update}" |

**SMS Router:** `src/features/communications/server/routers/sms.router.ts`

Phone validation: E.164 format (`/^\+[1-9]\d{1,14}$/`), message length warning at >1,600 chars.

### P.3 Stripe (Payments & Subscriptions)

**Config:** `src/lib/stripe/config.ts` (~240 lines)

**Subscription Tiers:**

| Tier | Price/mo | Weddings | Guests/Wedding | Staff |
|------|----------|----------|----------------|-------|
| Starter | $29 | 5 | 500 | 2 |
| Professional | $79 | 20 | 1,500 | 10 |
| Enterprise | $199 | Unlimited | Unlimited | Unlimited |

Multi-currency: USD, EUR, GBP, CHF, JPY, AUD, CAD, INR, CNY, BRL

**Checkout Flow:**
1. `POST /api/stripe/create-checkout` — creates/retrieves Stripe customer, creates checkout session
2. Stripe hosted checkout UI
3. `checkout.session.completed` webhook → updates `companies` table

**Webhook Handler:** `src/app/api/stripe/webhook/route.ts`

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set subscription tier |
| `customer.subscription.updated` | Update tier, status, end date |
| `customer.subscription.deleted` | Mark as canceled |
| `invoice.payment_succeeded` | Log success |
| `invoice.payment_failed` | Log failure |

**Billing Portal:** `POST /api/stripe/portal` — creates Stripe billing portal session, returns to `/settings/billing`

**Payment Reminders Cron:** `src/app/api/cron/check-payment-reminders/route.ts`
- Runs daily via Dokploy
- Queries budgets with payment dates 1-3 days out
- Enqueues reminder jobs per client/company

**Company subscription fields:**
```
stripeCustomerId, stripeSubscriptionId, subscriptionTier,
subscriptionStatus ('active'|'past_due'|'canceled'|'trialing'), subscriptionEndsAt
```

### P.4 Wedding Portal (Guest-Facing)

**Layout:** `src/app/[locale]/(portal)/layout.tsx`

Role-based routing:
- `client_user` → Portal (allowed)
- `company_admin`, `staff` → Redirect to `/dashboard`
- `super_admin` → Redirect to `/superadmin`

**Portal Pages:**

| Route | Page | Purpose |
|-------|------|---------|
| `/portal` | Home | Hero + quick stats grid (checklist, timeline, payments, photos) |
| `/portal/dashboard` | Dashboard | Welcome, countdown timer, progress bar, guest count, venue |
| `/portal/timeline` | Timeline | View wedding schedule |
| `/portal/checklist` | Checklist | View/manage tasks |
| `/portal/chat` | Chat | Message planner |
| `/portal/profile` | Profile | View/edit profile |
| `/portal/creatives` | Photos | View creative assets |
| `/portal/payments` | Payments | View invoices |
| `/portal/sign-up/[token]` | Invite Signup | Token-based registration for invited guests |

**Invite Flow:**
1. Planner sends email with invite link containing token
2. Guest clicks → `/portal/sign-up/{token}`
3. Token verified via `GET /api/invite/accept?token=X&type=wedding`
4. If already authenticated with matching email → auto-accept
5. Otherwise → signup form (name + password)
6. `POST /api/invite/accept` with token → creates `client_user` role
7. Redirect to `/portal/dashboard`

**Portal vs Dashboard:**

| Aspect | Portal | Dashboard |
|--------|--------|-----------|
| Role | `client_user` | `company_admin`, `staff` |
| Access | Own wedding only | All company clients |
| Capabilities | Read-only + messaging | Full CRUD |
| Design | Mobile-first, glassmorphism | Desktop-first, sidebar |

**Portal Router:** `src/features/portal/server/routers/portal.router.ts`
- `getWeddingProgress` query — returns guest stats, vendor stats, timeline count, website status

---

## Section Q: Testing & Deployment

### Q.1 Test Frameworks

| Framework | Purpose | Config File |
|-----------|---------|-------------|
| Jest | Unit + integration tests | `jest.config.js` |
| Vitest | Alternative unit testing (faster) | `vitest.config.ts` |
| Playwright | E2E + security tests | `playwright.config.ts` |

### Q.2 Running Tests

```bash
npm test                    # Jest watch mode
npm run test:unit           # Jest single run
npm run test:integration    # Jest integration only
npm run test:coverage       # Jest with coverage
npm run test:ci             # Jest CI mode (--ci --coverage --maxWorkers=2)
npm run test:e2e            # Playwright all browsers
npm run test:e2e:ui         # Playwright interactive UI
npm run test:security       # Playwright security tests
```

### Q.3 Jest Configuration

**File:** `jest.config.js`

- Environment: jsdom
- Coverage thresholds: 80% lines, 75% functions, 70% branches
- Coverage provider: v8
- Module alias: `^@/(.*)$` → `<rootDir>/src/$1`
- Setup files: `jest.polyfills.ts` (MSW v2), `jest.setup.ts` (mocks)

**Mocks in `jest.setup.ts`:**
- `superjson`, `next/navigation`, `window.matchMedia`
- `IntersectionObserver`, `ResizeObserver`
- BetterAuth: `useAuth()`, `useSession()`, `getServerSession()`, `requireAuth()`, `hasRole()`
- PostHog analytics (disabled in tests)

### Q.4 Vitest Configuration

**File:** `vitest.config.ts`

- Environment: jsdom
- Setup: `vitest.setup.ts` (imports `@testing-library/jest-dom/vitest`)
- Maps `@jest/globals` to vitest's `vi` for compatibility
- Excludes: `e2e/**`, `tests/security/*.spec.ts`

### Q.5 Writing a New Router Test

```typescript
// __tests__/routers/my-feature.test.ts
import { describe, it, expect, vi } from '@jest/globals'

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([{ id: '1', name: 'Test' }]),
  },
}))

describe('myFeature router', () => {
  it('should return items for company', async () => {
    // Test your router procedure
    const result = await caller.myFeature.list({ companyId: 'test-company' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Test')
  })
})
```

### Q.6 Playwright Configuration

**File:** `playwright.config.ts`

- Test directory: `./e2e`
- Fully parallel, retries: 2 on CI
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)
- Traces: `on-first-retry`, screenshots: `only-on-failure`
- Web server: `npm run dev` on `localhost:3000`

**Auth setup:** `e2e/auth.setup.ts` — logs in once, saves state to `playwright/.auth/user.json`

### Q.7 Security Tests

**Location:** `tests/security/`

| Test File | Purpose |
|-----------|---------|
| `tenant-isolation.spec.ts` | Cross-tenant data access (Playwright) |
| `auth-security.spec.ts` | Rate limiting, session persistence (Playwright) |
| `rls-isolation.test.ts` | RLS policy verification (Vitest) |
| `token-encryption.test.ts` | Token encrypt/decrypt (Vitest) |
| `argon2-password.test.ts` | Password hashing (Vitest) |
| `r2-tenant-isolation.test.ts` | Storage tenant isolation (Vitest) |
| `r2-validation.test.ts` | Path traversal prevention (Vitest) |
| `sse-connection-manager.test.ts` | SSE connection handling (Vitest) |

### Q.8 Drizzle Migrations

**Config:** `drizzle.config.ts` — 9 schema files, output to `./drizzle/migrations`

**Workflow:**
```bash
# 1. Edit schema files (src/lib/db/schema*.ts)
# 2. Generate migration
npx drizzle-kit generate

# 3. Review generated SQL in drizzle/migrations/NNNN_*.sql
# 4. Apply to database
npx drizzle-kit migrate

# Or push directly (dev only, no migration file)
npx drizzle-kit push

# Open Drizzle Studio (visual DB browser)
npx drizzle-kit studio
```

**Current state:** 29 migrations (0000-0028) in `drizzle/migrations/`, tracked by `meta/_journal.json`.

Migration naming: `NNNN_description.sql` (auto-generated). Always review SQL before applying to production.

### Q.9 Docker Configuration

**Dockerfile** — multi-stage build:
1. `deps` — `node:20-alpine`, install dependencies
2. `builder` — build Next.js with `SKIP_ENV_VALIDATION=true`
3. `runner` — minimal production image, non-root user (`nextjs:1001`)

Health check: `GET /api/health` every 30s, start period 40s.

**docker-compose.yml** — three services:
1. **PostgreSQL 16-alpine** — max_connections=100, shared_buffers=256MB, init script
2. **PgBouncer** — transaction pooling, max 200 clients, pool size 20, port 6432
3. **Redis 7-alpine** — 256MB max, allkeys-lru eviction, appendonly

### Q.10 Deployment (Dokploy on Hetzner)

**CI/CD:** `.github/workflows/deploy.yml`

**Pipeline:**
1. TypeScript check (`tsc --noEmit`)
2. Build Docker image → push to `ghcr.io/nitinthakur/weddingflo:latest`
3. Deploy to production (main branch only):
   - Trigger Dokploy webhook with image tag
   - SSH via Cloudflare Tunnel: `docker compose pull && docker compose up -d`
4. Health check: 5 retries, 15s intervals on `/api/health`
5. Cloudflare cache purge

**Triggers:** push to main, PR to main, manual workflow dispatch.

**Other CI workflows:**
- `.github/workflows/test.yml` — unit, integration, type check, build, E2E
- `.github/workflows/security.yml` — npm audit, Semgrep SAST, TruffleHog secrets, license compliance, OWASP dependency check (daily cron at 2 AM UTC)

**Backup:** `scripts/backup-postgres.sh` — compressed pg_dump → R2, 30-day retention, integrity verification.

---

## Section R: Third-Party Integrations

### R.1 Firebase (Push Notifications)

**Packages:** `firebase` v12.6.0 (client), `firebase-admin` v13.6.0 (server)

| File | Purpose |
|------|---------|
| `src/lib/firebase/config.ts` | Client-side Firebase init (singleton) |
| `src/lib/firebase/admin.ts` | Server-side Admin SDK for sending notifications |
| `src/lib/firebase/push-manager.ts` | Client-side token generation, topic subscriptions |
| `src/components/push/push-notification-manager.tsx` | React component integration |
| `public/firebase-messaging-sw.js` | Service worker for background notifications |

**Features:** FCM token generation, device topic subscriptions, batch sending, notification validation.

**Config:** `NEXT_PUBLIC_FIREBASE_*` (client), `FIREBASE_ADMIN_*` (server)

### R.2 PostHog (Analytics & Feature Flags)

**Package:** `posthog-js` v1.302.2

| File | Purpose |
|------|---------|
| `src/lib/analytics/posthog-client.ts` | PostHog initialization |
| `src/lib/analytics/posthog-provider.tsx` | React provider wrapper |
| `src/lib/analytics/posthog-pageview.tsx` | Automatic page view tracking |
| `src/lib/analytics/events.ts` | Event name definitions |
| `src/lib/analytics/feature-flags.ts` | Feature flag management |

**Features:** Session recording (with input masking), autocapture (click/submit/change), feature flags.

**Status:** Currently disabled in development (`opt_out_capturing`).

**Config:** `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

### R.3 Sentry (Error Monitoring)

**Package:** `@sentry/nextjs` v10.29.0

| File | Purpose |
|------|---------|
| `instrumentation.ts` | Main instrumentation entry |
| `instrumentation-server.ts` | Server-side init with `beforeSend` hook |
| `instrumentation-edge.ts` | Edge runtime instrumentation |
| `instrumentation-client.ts` | Client-side instrumentation |
| `src/app/providers/analytics-provider.tsx` | Sets user context on Sentry |

**Features:**
- 10% trace sample rate in production
- Sensitive header filtering (authorization, cookie)
- User identification via analytics provider
- Source maps uploaded at build time

**Config:** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

Next.js plugin chain: Sentry → next-intl → PWA → Bundle Analyzer (see `next.config.ts`).

### R.4 OpenAI (AI / Chatbot)

Covered in detail in **Section J**. Cross-reference summary:

| File | Purpose |
|------|---------|
| `src/lib/ai/openai-client.ts` | Lazy-loaded OpenAI client |
| `src/lib/ai/index.ts` | AI config, pricing constants, quota limits |
| `src/lib/ai/budget-predictor.ts` | Budget prediction |
| `src/lib/ai/email-generator.ts` | Email generation |
| `src/lib/ai/timeline-optimizer.ts` | Timeline optimization |
| `src/lib/ai/seating-optimizer.ts` | Seating arrangement optimization |

**Models:** Primary: `gpt-4o-mini` ($0.15/$0.60 per 1M tokens). Fallback: `gpt-4o` ($2.50/$10 per 1M tokens).

**Quota per tier:** Free: 5, Starter: 50, Professional: 200, Enterprise: 1000.

### R.5 Google APIs (Sheets & Calendar)

| File | Purpose |
|------|---------|
| `src/lib/google/sheets-client.ts` | OAuth2 flow, Sheets API client |
| `src/lib/google/sheets-sync.ts` | Bi-directional spreadsheet sync |
| `src/lib/calendar/google-calendar-sync.ts` | Calendar event sync |

**Scopes:** `spreadsheets`, `drive.file`

**Sync targets:** Guests, Budget, Timeline, Hotels, Transport, Vendors, Gifts.

See also **Section L.6** for debugging Google Sheets issues.

### R.6 Upstash Redis (Rate Limiting & Real-Time Sync)

| File | Purpose |
|------|---------|
| `src/lib/redis/rate-limiter.ts` | Sliding window rate limiting via sorted sets |
| `src/lib/realtime/redis-pubsub.ts` | Cross-instance sync broadcasting |

**Features:** Sliding window algorithm, `RateLimitError` with retry metadata, offline recovery (last 1000 actions), multi-tenant isolation by companyId.

See also **Section L.2** for debugging sync issues.

### R.7 Integration Status Summary

| Integration | Package | Status | Primary Config |
|-------------|---------|--------|----------------|
| Firebase | `firebase` / `firebase-admin` | Active | `FIREBASE_ADMIN_*` |
| PostHog | `posthog-js` | Disabled (dev) | `NEXT_PUBLIC_POSTHOG_KEY` |
| Sentry | `@sentry/nextjs` | Active | `NEXT_PUBLIC_SENTRY_DSN` |
| OpenAI | `openai` | Active | `OPENAI_API_KEY` |
| Stripe | `stripe` | Active | `STRIPE_SECRET_KEY` |
| Resend | `resend` | Active | `RESEND_API_KEY` |
| Twilio | `twilio` | Active | `TWILIO_ACCOUNT_SID` |
| Google APIs | `googleapis` | Active | `GOOGLE_CLIENT_ID` |
| Cloudflare R2 | `@aws-sdk/client-s3` | Active | `R2_ENDPOINT` |
| Upstash Redis | `@upstash/redis` | Active | `UPSTASH_REDIS_REST_URL` |

All integrations use lazy initialization — they only create clients when first accessed, so missing env vars won't crash the app on startup (they fail at call time instead).
