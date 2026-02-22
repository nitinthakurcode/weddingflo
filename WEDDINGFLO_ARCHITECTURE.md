# WeddingFlo - Complete Architecture & Single Source of Truth

**Last Updated:** February 2026
**Version:** 10.0 (Production-Ready)
**Security Rating:** 10/10

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Hosting & Infrastructure](#2-hosting--infrastructure)
3. [Database Schema (85+ Tables)](#3-database-schema-85-tables)
4. [Authentication System (BetterAuth)](#4-authentication-system-betterauth)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Sign-Up Flows](#6-sign-up-flows)
7. [Sign-In Flows](#7-sign-in-flows)
8. [Planning Modules](#8-planning-modules)
9. [AI Chatbot System](#9-ai-chatbot-system)
10. [Real-Time Sync Architecture](#10-real-time-sync-architecture)
11. [Google Sheets Bidirectional Sync](#11-google-sheets-bidirectional-sync)
12. [Security Implementation (10/10)](#12-security-implementation-1010)
13. [What Each Technology Handles](#13-what-each-technology-handles)
14. [Complete Data Flow Diagrams](#14-complete-data-flow-diagrams)
15. [API Routes & tRPC Routers](#15-api-routes--trpc-routers)

---

## 1. Tech Stack Overview

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 19.2.4 | UI library |
| TypeScript | 5.9.3 | Type safety |
| Tailwind CSS | 4.2.0 | Styling |
| Radix UI | Latest | Accessible component primitives |
| shadcn/ui | Latest | Pre-built Tailwind components |
| Framer Motion | 12.23.25 | Animations |
| Recharts | 3.5.1 | Data visualization |
| React Hook Form | 7.68.0 | Form management |
| Zod | 4.3.6 | Schema validation |
| TanStack Query | 5.x | Server state management |
| next-intl | 4.5.8 | Internationalization (i18n) |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| tRPC | 11.10.0 | End-to-end type-safe APIs |
| BetterAuth | 1.4.18 | Authentication (OAuth, email/password, 2FA) |
| Drizzle ORM | 0.45.1 | Type-safe database ORM |
| PostgreSQL | 3.4.7 | Primary database |
| Upstash Redis | 1.35.6 | Real-time pub/sub, rate limiting |

### External Services
| Service | Purpose |
|---------|---------|
| OpenAI (GPT-4o-mini, GPT-4o) | AI Chatbot |
| Google APIs | Calendar sync, Sheets integration, OAuth |
| Resend | Email delivery |
| Twilio | SMS & WhatsApp |
| Stripe | Payments & subscriptions |
| Firebase/FCM | Push notifications |
| AWS S3 | File storage |
| PostHog | Analytics |
| Sentry | Error tracking |

### Development Tools
| Tool | Purpose |
|------|---------|
| Jest 30.2.0 | Unit testing |
| Playwright 1.57.0 | E2E testing |
| ESLint 9.39.1 | Code linting |
| Prettier 3.7.4 | Code formatting |
| Husky 9.1.7 | Git hooks |

---

## 2. Hosting & Infrastructure

### Production Environment: Hostinger

```
┌─────────────────────────────────────────────────────────────┐
│                      HOSTINGER VPS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              Next.js 16 Application                  │   │
│   │              (Node.js Runtime)                       │   │
│   └─────────────────────────────────────────────────────┘   │
│                            │                                │
│   ┌────────────────────────┼────────────────────────────┐   │
│   │                        │                            │   │
│   ▼                        ▼                            ▼   │
│ PostgreSQL            Upstash Redis              AWS S3     │
│ (Managed)             (Serverless)               (Files)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Infrastructure Details

| Component | Provider | Notes |
|-----------|----------|-------|
| Web Hosting | Hostinger VPS | Node.js runtime |
| Database | PostgreSQL (Managed) | Primary data store |
| Cache/Pub-Sub | Upstash Redis | Serverless, TLS always |
| File Storage | AWS S3 | Documents, images |
| CDN | Hostinger built-in | Static assets |
| SSL | Let's Encrypt | Auto-renewed |
| Domain | weddingflow.pro | Hostinger DNS |

### Environment Configuration

```bash
# Database
DATABASE_URL=postgres://user:pass@host/weddingflo

# Redis (Upstash - Serverless)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Authentication
BETTER_AUTH_SECRET=<32+ char secret>
BETTER_AUTH_URL=https://app.weddingflow.pro/api/auth
NEXT_PUBLIC_APP_URL=https://app.weddingflow.pro

# OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# External Services
OPENAI_API_KEY=sk-xxx
RESEND_API_KEY=re_xxx
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
STRIPE_SECRET_KEY=sk_xxx

# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=weddingflo-uploads
AWS_REGION=ap-south-1
```

---

## 3. Database Schema (85+ Tables)

### Schema Files Location
```
src/lib/db/
├── schema.ts              # Core tables (user, session, clients, guests, etc.)
├── schema-features.ts     # Feature tables (floor plans, proposals, etc.)
├── schema-chatbot.ts      # AI chatbot tables
├── schema-proposals.ts    # Proposals & contracts
├── schema-workflows.ts    # Workflow automation
├── schema-questionnaires.ts # Questionnaire system
└── index.ts               # Exports & relations
```

### Authentication Tables (BetterAuth)

#### `user` (Source of Truth)
```sql
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,          -- UUID as text
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  emailVerified BOOLEAN DEFAULT false,
  image TEXT,
  avatarUrl TEXT,
  role TEXT DEFAULT 'company_admin',  -- super_admin | company_admin | staff | client_user
  companyId TEXT,               -- FK to companies
  firstName TEXT,
  lastName TEXT,
  phoneNumber TEXT,
  phoneNumberVerified BOOLEAN DEFAULT false,
  preferredLanguage TEXT DEFAULT 'en',
  preferredCurrency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  autoDetectLocale BOOLEAN DEFAULT true,
  onboardingCompleted BOOLEAN DEFAULT false,
  isActive BOOLEAN DEFAULT true,
  banned BOOLEAN DEFAULT false,
  banReason TEXT,
  banExpires TIMESTAMP,
  twoFactorEnabled BOOLEAN DEFAULT false,
  isAnonymous BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX user_company_id_idx ON "user"(companyId);
CREATE INDEX user_email_idx ON "user"(email);
```

#### `session`
```sql
CREATE TABLE session (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX session_user_id_idx ON session(userId);
CREATE INDEX session_expires_at_idx ON session(expiresAt);
```

#### `account` (OAuth/Credentials)
```sql
CREATE TABLE account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accountId TEXT NOT NULL,      -- External provider ID
  providerId TEXT NOT NULL,     -- 'google', 'credential', etc.
  accessToken TEXT,
  refreshToken TEXT,
  accessTokenExpiresAt TIMESTAMP,
  refreshTokenExpiresAt TIMESTAMP,
  password TEXT,                -- For email/password auth
  scope TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX account_user_id_idx ON account(userId);
```

#### `verification`
```sql
CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,     -- Email or phone
  value TEXT NOT NULL,          -- Token
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX verification_identifier_idx ON verification(identifier);
```

#### `rateLimitEntries` (UNLOGGED - 2x faster)
```sql
CREATE UNLOGGED TABLE rate_limit_entries (
  key TEXT PRIMARY KEY,         -- e.g., "signin:192.168.1.1"
  count INTEGER DEFAULT 1,
  resetAt TIMESTAMPTZ NOT NULL,
  createdAt TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX rate_limit_reset_idx ON rate_limit_entries(resetAt);
```

### Organization Tables

#### `companies`
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logoUrl TEXT,
  branding JSONB,               -- Colors, fonts, etc.
  settings JSONB,               -- Company preferences
  onboardingData JSONB,
  subscriptionTier TEXT DEFAULT 'free',  -- free | starter | professional | enterprise
  subscriptionStatus TEXT DEFAULT 'trialing',
  stripeCustomerId TEXT,
  stripeSubscriptionId TEXT,
  trialEndsAt TIMESTAMP,
  subscriptionEndsAt TIMESTAMP,
  aiQueriesThisMonth INTEGER DEFAULT 0,
  aiLastResetAt TIMESTAMP,
  defaultCurrency VARCHAR DEFAULT 'INR',
  supportedCurrencies TEXT[],
  onboardingCompleted BOOLEAN DEFAULT false,
  onboardingStep INTEGER DEFAULT 0,
  businessType TEXT DEFAULT 'wedding_planner',
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

### Client/Wedding Tables

#### `clients` (Wedding Records)
```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  -- Partner 1 (Bride)
  partner1FirstName TEXT,
  partner1LastName TEXT,
  partner1Email TEXT,
  partner1Phone TEXT,
  partner1FatherName TEXT,
  partner1MotherName TEXT,
  -- Partner 2 (Groom)
  partner2FirstName TEXT,
  partner2LastName TEXT,
  partner2Email TEXT,
  partner2Phone TEXT,
  partner2FatherName TEXT,
  partner2MotherName TEXT,
  -- Wedding Details
  weddingName TEXT,
  weddingDate DATE,
  venue TEXT,
  budget NUMERIC,
  guestCount INTEGER,
  status TEXT DEFAULT 'planning',  -- lead | active | planning | completed | cancelled
  planningSide TEXT DEFAULT 'both',
  weddingType TEXT DEFAULT 'traditional',
  notes TEXT,
  createdBy TEXT,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  deletedAt TIMESTAMP              -- Soft delete
);

CREATE INDEX clients_company_id_idx ON clients(companyId);
```

#### `guests`
```sql
CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients(id),
  firstName TEXT,
  lastName TEXT,
  email TEXT,
  phone TEXT,
  groupName TEXT,
  tableNumber TEXT,
  serialNumber TEXT,
  -- Dietary
  dietaryRestrictions TEXT,
  mealPreference TEXT DEFAULT 'standard',
  -- RSVP
  rsvpStatus TEXT DEFAULT 'pending',  -- pending | confirmed | declined | maybe
  plusOneAllowed BOOLEAN DEFAULT false,
  plusOneName TEXT,
  plusOneRsvp TEXT,
  plusOneMealPreference TEXT,
  partySize INTEGER DEFAULT 1,
  additionalGuestNames TEXT[],
  -- Travel
  arrivalDatetime TIMESTAMPTZ,
  arrivalMode TEXT,
  departureDatetime TIMESTAMPTZ,
  departureMode TEXT,
  -- Hotel
  hotelRequired BOOLEAN DEFAULT false,
  hotelName TEXT,
  hotelCheckIn DATE,
  hotelCheckOut DATE,
  hotelRoomType TEXT,
  -- Transport
  transportRequired BOOLEAN DEFAULT false,
  transportType TEXT,
  transportPickupLocation TEXT,
  transportPickupTime TIME,
  transportNotes TEXT,
  -- Additional
  relationshipToFamily TEXT,
  attendingEvents TEXT[],
  giftToGive TEXT,
  checkedIn BOOLEAN DEFAULT false,
  checkedInAt TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB,
  guestSide TEXT DEFAULT 'mutual',
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX guests_client_id_idx ON guests(clientId);
CREATE INDEX guests_rsvp_status_idx ON guests(rsvpStatus);
```

### Planning Module Tables

#### `events`
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients(id),
  title TEXT NOT NULL,
  eventType TEXT,
  eventDate TEXT,
  startTime TEXT,
  endTime TEXT,
  location TEXT,
  venueName TEXT,
  address TEXT,
  guestCount INTEGER,
  status TEXT DEFAULT 'planned',
  description TEXT,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  deletedAt TIMESTAMP
);
```

#### `timeline`
```sql
CREATE TABLE timeline (
  id TEXT PRIMARY KEY,
  clientId TEXT REFERENCES clients(id),
  eventId TEXT REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  phase TEXT DEFAULT 'showtime',  -- setup | showtime | wrapup
  startTime TIMESTAMP,
  endTime TIMESTAMP,
  durationMinutes INTEGER,
  location TEXT,
  participants TEXT[],
  responsiblePerson TEXT,
  completed BOOLEAN DEFAULT false,
  sortOrder INTEGER,
  notes TEXT,
  -- Cross-module sync
  sourceModule TEXT,            -- 'vendors', 'hotels', etc.
  sourceId TEXT,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  deletedAt TIMESTAMP
);
```

#### `budget`
```sql
CREATE TABLE budget (
  id TEXT PRIMARY KEY,
  clientId TEXT REFERENCES clients(id),
  vendorId TEXT,                -- For vendor sync
  eventId TEXT,
  category TEXT,
  segment TEXT,
  item TEXT NOT NULL,
  description TEXT,
  expenseDetails TEXT,
  estimatedCost NUMERIC,
  actualCost NUMERIC,
  paidAmount NUMERIC,
  paymentStatus TEXT,
  transactionDate TIMESTAMP,
  paymentDate TIMESTAMP,
  clientVisible BOOLEAN DEFAULT true,
  isLumpSum BOOLEAN DEFAULT false,
  -- Per-guest calculation
  perGuestCost NUMERIC,
  isPerGuestItem BOOLEAN DEFAULT false,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

#### `hotels` (Guest Accommodations)
```sql
CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clientId TEXT NOT NULL REFERENCES clients(id),
  guestId TEXT REFERENCES guests(id),
  guestName TEXT,
  accommodationId TEXT,
  hotelName TEXT,
  roomNumber TEXT,
  roomType TEXT,
  checkInDate DATE,
  checkOutDate DATE,
  accommodationNeeded BOOLEAN DEFAULT true,
  bookingConfirmed BOOLEAN DEFAULT false,
  checkedIn BOOLEAN DEFAULT false,
  cost NUMERIC,
  currency VARCHAR DEFAULT 'USD',
  paymentStatus TEXT DEFAULT 'pending',
  notes TEXT,
  partySize INTEGER,
  guestNamesInRoom TEXT,
  roomAssignments JSONB,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  deletedAt TIMESTAMP
);
```

#### `guestTransport`
```sql
CREATE TABLE guest_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clientId TEXT NOT NULL,
  guestId TEXT,
  guestName TEXT,
  pickupDate DATE,
  pickupTime TIME,
  pickupFrom TEXT,
  dropTo TEXT,
  transportStatus TEXT DEFAULT 'scheduled',
  vehicleInfo TEXT,
  vehicleType TEXT,
  vehicleNumber TEXT,
  vehicleId UUID,
  driverPhone TEXT,
  coordinatorPhone TEXT,
  completedAt TIMESTAMP,
  notes TEXT,
  legType TEXT,                 -- arrival | departure | inter_event
  legSequence INTEGER,
  eventId TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

#### `vendors`
```sql
CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  companyId TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  contactName TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  contractSigned BOOLEAN DEFAULT false,
  contractDate DATE,
  notes TEXT,
  rating NUMERIC,
  reviewCount INTEGER DEFAULT 0,
  isPreferred BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

#### `gifts`
```sql
CREATE TABLE gifts (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL,
  guestId TEXT,
  name TEXT NOT NULL,
  value REAL,
  status TEXT DEFAULT 'received',
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

#### `floorPlans`
```sql
CREATE TABLE floor_plans (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL,
  eventId TEXT,
  name TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  backgroundImage TEXT,
  layout JSONB,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
```

### AI Chatbot Tables

#### `chatbotConversations`
```sql
CREATE TABLE chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  clientId TEXT REFERENCES clients(id) ON DELETE SET NULL,
  companyId TEXT,
  title TEXT,
  summary TEXT,
  messageCount INTEGER DEFAULT 0,
  lastMessageAt TIMESTAMPTZ,
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chatbot_conv_user ON chatbot_conversations(userId);
CREATE INDEX idx_chatbot_conv_user_company ON chatbot_conversations(userId, companyId);
```

#### `chatbotMessages`
```sql
CREATE TABLE chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversationId UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,           -- user | assistant | system | tool
  content TEXT,
  toolName TEXT,
  toolArgs JSONB,
  toolResult JSONB,
  status TEXT DEFAULT 'success',  -- pending | streaming | success | error
  createdAt TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chatbot_msg_conv ON chatbot_messages(conversationId);
```

#### `chatbotPendingCalls` (UNLOGGED - 5min TTL)
```sql
CREATE UNLOGGED TABLE chatbot_pending_calls (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  companyId TEXT NOT NULL,
  toolName TEXT NOT NULL,
  args JSONB NOT NULL,
  preview JSONB,
  expiresAt TIMESTAMPTZ NOT NULL,
  createdAt TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pending_calls_user ON chatbot_pending_calls(userId);
CREATE INDEX idx_pending_calls_expires ON chatbot_pending_calls(expiresAt);
```

### Additional Tables (Summary)

| Category | Tables |
|----------|--------|
| **Proposals & Contracts** | proposalTemplates, proposals, contractTemplates, contracts |
| **Workflows** | workflows, workflowSteps, workflowExecutions, workflowExecutionLogs |
| **Questionnaires** | questionnaireTemplates, questionnaires, questionnaireResponses |
| **Communications** | emailLogs, smsLogs, whatsappLogs, pushSubscriptions, messages |
| **Payments** | payments, invoices, refunds, advancePayments, stripeAccounts |
| **CRM/Pipeline** | pipelineStages, pipelineLeads, pipelineActivities |
| **Website Builder** | weddingWebsites, websiteBuilderLayouts, websiteBuilderPages |
| **Invitations** | teamInvitations, weddingInvitations |
| **Activity & Audit** | activity, notifications, webhookEvents |
| **Google Integration** | googleSheetsSyncSettings, googleCalendarTokens, calendarSyncSettings |

**Total: 85+ tables with comprehensive indexing**

---

## 4. Authentication System (BetterAuth)

### Configuration Location
```
src/lib/auth.ts              # Server configuration
src/lib/auth-client.ts       # Client hooks & functions
src/lib/auth/server.ts       # getServerSession()
src/lib/auth/types.ts        # TypeScript interfaces
src/lib/auth/roles.ts        # Role helpers
src/lib/auth/rate-limiter.ts # Auth rate limiting
```

### BetterAuth Features Enabled

| Feature | Status | Configuration |
|---------|--------|---------------|
| Email/Password | Enabled | Auto sign-in after signup |
| Email Verification | Production only | 24-hour expiry |
| Password Reset | Enabled | 1-hour expiry via Resend |
| Google OAuth | Enabled | Account linking supported |
| Google One Tap | Enabled | Frictionless sign-in |
| Two-Factor Auth (TOTP) | Enabled | 6-digit, 30-second window |
| 2FA Email Backup | Enabled | 5-minute OTP expiry |
| Session Management | Cookie-based | 7-day expiry, 1-day refresh |
| Rate Limiting | PostgreSQL | UNLOGGED table (fast) |

### Server-Side Session (MANDATORY Pattern)

```typescript
// src/lib/auth/server.ts
import { getServerSession } from '@/lib/auth/server'

export async function GET() {
  const { userId, user, session } = await getServerSession()

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const role = user?.role           // 'super_admin' | 'company_admin' | 'staff' | 'client_user'
  const companyId = user?.companyId // UUID string

  // ... handler logic
}
```

### Client-Side Auth (MANDATORY Pattern)

```typescript
// In React components
import { useAuth } from '@/lib/auth-client'

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <Redirect to="/sign-in" />

  return <div>Welcome, {user.firstName}</div>
}
```

### Session Data Available

```typescript
interface BetterAuthUser {
  id: string
  email: string
  name: string | null
  role: 'super_admin' | 'company_admin' | 'staff' | 'client_user'
  companyId: string | null
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  emailVerified: boolean
  onboardingCompleted: boolean
  twoFactorEnabled: boolean
  preferredLanguage: string
  preferredCurrency: string
  timezone: string
}

interface BetterAuthSession {
  id: string
  token: string
  userId: string
  expiresAt: Date
  ipAddress: string | null
  userAgent: string | null
}
```

---

## 5. User Roles & Permissions

### Role Hierarchy

```
super_admin
    │
    ├── Can access ANY company
    ├── Can manage all users
    ├── Can view platform analytics
    └── Full system access

company_admin
    │
    ├── Full access to OWN company only
    ├── Can manage staff & clients
    ├── Can configure company settings
    └── Can manage subscriptions

staff
    │
    ├── Limited to assigned company
    ├── Can manage clients & planning
    ├── Cannot manage users
    └── Cannot change settings

client_user
    │
    ├── Portal access only
    ├── View own wedding info
    ├── Submit RSVP & preferences
    └── Cannot access dashboard
```

### Role Type Guards

```typescript
// src/lib/auth/types.ts
function isSuperAdmin(user: BetterAuthUser): boolean
function isCompanyAdmin(user: BetterAuthUser): boolean
function isStaff(user: BetterAuthUser): boolean
function isClientUser(user: BetterAuthUser): boolean
function hasAdminAccess(user: BetterAuthUser): boolean      // super_admin OR company_admin
function hasDashboardAccess(user: BetterAuthUser): boolean  // NOT client_user
function hasCompanyContext(user: BetterAuthUser): boolean   // Has companyId
```

### Authorization in tRPC

```typescript
// Protected procedure (any authenticated user)
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, userId: ctx.userId } })
})

// Admin procedure (company_admin or super_admin)
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!hasAdminAccess(ctx.user)) throw new TRPCError({ code: 'FORBIDDEN' })
  return next({ ctx })
})
```

---

## 6. Sign-Up Flows

### 6.1 Standard Sign-Up (Company Admin)

**Page:** `/src/app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx`

```
User visits /sign-up
        │
        ▼
┌─────────────────────────────┐
│ Enter: Name, Email, Password │
│ Optional: CAPTCHA (Turnstile)│
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ signUpWithEmail() called    │
│ (src/lib/auth-client.ts)    │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ BetterAuth Server Processing                                 │
│ ├─ Validate email format                                     │
│ ├─ Check email uniqueness                                    │
│ ├─ Hash password (bcrypt)                                    │
│ ├─ INSERT INTO "user" (role='company_admin', companyId=null) │
│ ├─ INSERT INTO account (providerId='credential')             │
│ ├─ INSERT INTO session                                       │
│ ├─ Set session cookie                                        │
│ └─ Log to activity table (action='sign_up')                  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│ If referral code present:   │
│ ├─ Track referral click     │
│ └─ Convert signup           │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Redirect to /dashboard      │
│ (onboardingCompleted=false) │
│ → Shows onboarding wizard   │
└─────────────────────────────┘
```

**What BetterAuth Creates:**

| Table | Records Created |
|-------|-----------------|
| `user` | 1 record (role='company_admin', companyId=null) |
| `account` | 1 record (providerId='credential', password=hashed) |
| `session` | 1 record (7-day expiry) |
| `activity` | 1 record (action='sign_up', ip, userAgent) |

### 6.2 Google OAuth Sign-Up

```
User clicks "Sign up with Google"
        │
        ▼
┌─────────────────────────────┐
│ Redirect to Google OAuth    │
│ /api/auth/google            │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Google consent screen       │
│ User grants permissions     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ BetterAuth OAuth Callback                                    │
│ ├─ Exchange code for tokens                                  │
│ ├─ Fetch Google profile                                      │
│ ├─ Check if email exists:                                    │
│ │   ├─ YES: Link account (if allowed)                        │
│ │   └─ NO: Create new user                                   │
│ ├─ INSERT INTO "user" (email verified automatically)         │
│ ├─ INSERT INTO account (providerId='google')                 │
│ ├─ INSERT INTO session                                       │
│ └─ Set session cookie                                        │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
        Redirect to /dashboard
```

### 6.3 Staff Invitation Sign-Up

```
Admin sends team invitation
        │
        ▼
┌─────────────────────────────┐
│ Email sent with invite link │
│ /api/invite/staff?token=xxx │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ User clicks link            │
│ /sign-up?invite=xxx         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Sign-Up with Invitation                                      │
│ ├─ Validate invite token (not expired, not used)             │
│ ├─ Create user with role from invitation                     │
│ ├─ Set companyId from invitation                             │
│ ├─ Mark invitation as accepted                               │
│ └─ Skip onboarding (company already exists)                  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
        Redirect to /dashboard
        (Full access to company)
```

### 6.4 Client Portal Sign-Up

**Page:** `/src/app/[locale]/(portal)/portal/sign-up/[token]/page.tsx`

```
Planner sends client invitation
        │
        ▼
┌─────────────────────────────┐
│ Email with portal invite    │
│ /portal/sign-up/xxx         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Client Portal Sign-Up                                        │
│ ├─ Validate wedding invitation token                         │
│ ├─ Pre-fill email from invitation                            │
│ ├─ User enters password                                      │
│ ├─ Create user with role='client_user'                       │
│ ├─ Set companyId from invitation                             │
│ ├─ Create clientUsers relationship                           │
│ └─ Mark invitation as accepted                               │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
        Redirect to /portal/dashboard
        (Limited access - own wedding only)
```

---

## 7. Sign-In Flows

### 7.1 Email/Password Sign-In

**Page:** `/src/app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx`

```
User visits /sign-in
        │
        ▼
┌─────────────────────────────┐
│ Enter: Email, Password      │
│ Optional: CAPTCHA           │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Rate Limit Check (PostgreSQL UNLOGGED)                       │
│ ├─ Key: "signin:{ip_address}"                                │
│ ├─ Limit: 5 attempts per minute                              │
│ └─ If exceeded: Return 429 with Retry-After                  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ BetterAuth signInWithEmail()                                 │
│ ├─ Find user by email                                        │
│ ├─ Verify password (bcrypt compare)                          │
│ ├─ Check if banned                                           │
│ ├─ Check if 2FA enabled:                                     │
│ │   ├─ YES: Return challenge, require TOTP                   │
│ │   └─ NO: Continue                                          │
│ ├─ Create new session                                        │
│ ├─ Set session cookie                                        │
│ └─ Log to activity table (action='sign_in')                  │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Role-based redirect:        │
│ ├─ super_admin → /admin     │
│ ├─ company_admin → /dashboard│
│ ├─ staff → /dashboard       │
│ └─ client_user → /portal    │
└─────────────────────────────┘
```

### 7.2 Google Sign-In

```
User clicks "Sign in with Google"
        │
        ▼
┌─────────────────────────────┐
│ Redirect to:                │
│ /api/auth/google?           │
│   locale=en&                │
│   callbackURL=/dashboard    │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Google OAuth flow           │
│ (Same as sign-up)           │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ BetterAuth:                                                  │
│ ├─ Find existing account by Google ID                        │
│ ├─ If found: Create session for existing user                │
│ ├─ If not found with linked email: Link accounts             │
│ └─ If new: Create user (same as sign-up)                     │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
        Redirect to callbackURL
```

### 7.3 Two-Factor Authentication Flow

```
User enters email/password
        │
        ▼
┌─────────────────────────────┐
│ BetterAuth detects 2FA      │
│ Returns: { twoFactorRequired }│
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Show 2FA input screen       │
│ ├─ TOTP from authenticator  │
│ └─ OR request email OTP     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ verify2FA() called                                           │
│ ├─ TOTP: Validate against stored secret (30-sec window)     │
│ └─ Email OTP: Validate against verification table (5-min)   │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
        Success → Create session & redirect
```

### 7.4 Client Portal Sign-In

**Page:** `/src/app/[locale]/(portal)/portal/sign-in/[[...sign-in]]/page.tsx`

```
Client visits /portal/sign-in
        │
        ▼
┌─────────────────────────────┐
│ Same flow as standard       │
│ sign-in                     │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ After authentication:       │
│ Check role='client_user'    │
│ Redirect to /portal         │
└─────────────────────────────┘
```

### Rate Limiting Configuration

```typescript
// src/lib/auth/rate-limiter.ts
const AUTH_RATE_LIMITS = {
  signIn: {
    maxRequests: 5,
    windowMs: 60_000      // 5 per minute per IP
  },
  signUp: {
    maxRequests: 3,
    windowMs: 3_600_000   // 3 per hour per IP
  },
  passwordReset: {
    maxRequests: 3,
    windowMs: 3_600_000   // 3 per hour per email
  },
  verificationEmail: {
    maxRequests: 5,
    windowMs: 3_600_000   // 5 per hour per user
  },
  sessionRefresh: {
    maxRequests: 30,
    windowMs: 60_000      // 30 per minute per session
  }
}
```

---

## 8. Planning Modules

### Module Overview

| Module | Router | Key Tables | Features |
|--------|--------|------------|----------|
| **Guests** | `guests.router.ts` | guests, guestPreferences, guestConflicts | RSVP, dietary, check-in, plus-ones |
| **Events** | `events.router.ts` | events | Event scheduling, venues |
| **Timeline** | `timeline.router.ts` | timeline, timelineTemplates | Day-of scheduling, phases |
| **Budget** | `budget.router.ts` | budget, advancePayments | Per-guest items, forecasting |
| **Hotels** | `hotels.router.ts` | hotels, accommodations, hotelBookings | Room assignments, capacity |
| **Transport** | `guest-transport.router.ts` | guestTransport, vehicles | Multi-leg journeys |
| **Vendors** | `vendors.router.ts` | vendors, clientVendors, vendorReviews | Contracts, payments |
| **Gifts** | `gifts.router.ts` | gifts, giftsEnhanced, guestGifts | Registry, thank-yous |
| **Floor Plans** | `floor-plans.router.ts` | floorPlans, floorPlanTables, floorPlanGuests | Drag-drop seating |

### Cross-Module Cascade Operations

When a guest is created/updated with `hotelRequired=true` or `transportRequired=true`:

```
Guest Create/Update
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Transaction Wrapper (atomic)                                 │
│                                                              │
│ 1. INSERT/UPDATE guests table                                │
│                                                              │
│ 2. If hotelRequired=true:                                    │
│    ├─ Check if hotel record exists                           │
│    ├─ If not: INSERT INTO hotels                             │
│    └─ Copy: checkIn, checkOut, roomType from guest           │
│                                                              │
│ 3. If transportRequired=true:                                │
│    ├─ Check if transport records exist                       │
│    ├─ If not: INSERT arrival leg                             │
│    └─ INSERT departure leg (if dates provided)               │
│                                                              │
│ 4. If isPerGuestItem budget items exist:                     │
│    └─ UPDATE budget.actualCost = perGuestCost × partySize    │
│                                                              │
│ 5. Broadcast SyncAction to Redis                             │
│    └─ queryPaths: ['guests.list', 'hotels.list',             │
│                    'guestTransport.list', 'budget.overview'] │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. AI Chatbot System

### Architecture

```
User Input: "Add 50 guests to Sharma-Patel wedding"
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ chatbot.chat Procedure                                       │
│                                                              │
│ 1. Build Context (context-builder.ts)                        │
│    ├─ Current client data                                    │
│    ├─ Recent conversation memory                             │
│    ├─ User preferences                                       │
│    └─ Company settings                                       │
│                                                              │
│ 2. Call OpenAI GPT-4o-mini                                   │
│    ├─ System prompt with tool definitions                    │
│    ├─ User message + context                                 │
│    └─ Function calling enabled                               │
│                                                              │
│ 3. AI Response:                                              │
│    ├─ QUERY tools → Execute immediately, return results      │
│    └─ MUTATION tools → Generate preview, request confirmation│
└─────────────────────────────────────────────────────────────┘
```

### Tool Categories

**Query Tools (Immediate Execution):**
- `list_guests` - Get guest list
- `get_budget_summary` - Budget overview
- `list_events` - Event schedule
- `search_vendors` - Find vendors

**Mutation Tools (Require Confirmation):**
- `add_guest` - Create guest
- `update_guest` - Modify guest
- `delete_guest` - Remove guest
- `create_budget_item` - Add expense
- `create_event` - Schedule event
- `update_rsvp` - Change RSVP status

### Confirmation Flow

```
AI decides to call add_guest tool
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ generateToolPreview()                                        │
│ ├─ Build human-readable preview                              │
│ └─ Store in chatbotPendingCalls (5-min TTL, UNLOGGED)       │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│ Return preview to user:     │
│ "I'll add these 50 guests:  │
│  - Ravi Sharma              │
│  - Priya Patel              │
│  - ..."                     │
│                             │
│ [Confirm] [Cancel]          │
└─────────────┬───────────────┘
              │
              ▼ (User clicks Confirm)
              │
┌─────────────────────────────────────────────────────────────┐
│ chatbot.confirmToolCall                                      │
│                                                              │
│ 1. Retrieve pending call from PostgreSQL                     │
│                                                              │
│ 2. SECURITY CHECK:                                           │
│    └─ Verify pending.companyId === ctx.companyId             │
│    └─ Verify pending.userId === ctx.userId                   │
│    (Prevents cross-tenant access - Feb 2026 fix)             │
│                                                              │
│ 3. executeToolWithSync()                                     │
│    ├─ Wrap in transaction                                    │
│    ├─ Execute tool (INSERT/UPDATE/DELETE)                    │
│    ├─ Trigger cascade operations                             │
│    └─ Broadcast SyncAction                                   │
│                                                              │
│ 4. Delete pending call                                       │
│                                                              │
│ 5. Update conversation memory                                │
└─────────────────────────────────────────────────────────────┘
```

### Rate Limiting for AI

```typescript
// src/lib/redis/rate-limiter.ts (Redis-backed)
checkAIRateLimit({
  userId: ctx.userId,
  companyId: ctx.companyId
})
// Limit: 100 AI queries per hour per company
// Uses Redis sorted sets for sliding window
```

---

## 10. Real-Time Sync Architecture

### Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME SYNC ARCHITECTURE                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│  │ Browser A   │     │ Browser B   │     │ Browser C   │            │
│  │ (Tab 1)     │     │ (Tab 2)     │     │ (Mobile)    │            │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘            │
│         │                   │                   │                    │
│         │    tRPC SSE Subscriptions             │                    │
│         │    (sync.onSync)                      │                    │
│         │                   │                   │                    │
│         ▼                   ▼                   ▼                    │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │              NEXT.JS SERVER INSTANCES                      │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │      │
│  │  │ Instance 1  │  │ Instance 2  │  │ Instance 3  │        │      │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │      │
│  └─────────┼────────────────┼────────────────┼───────────────┘      │
│            │                │                │                       │
│            └────────────────┼────────────────┘                       │
│                             │                                        │
│                             ▼                                        │
│            ┌────────────────────────────────────┐                    │
│            │         UPSTASH REDIS              │                    │
│            │  ┌──────────────────────────────┐  │                    │
│            │  │   Pub/Sub Channels            │  │                    │
│            │  │   company:{id}:sync           │  │                    │
│            │  └──────────────────────────────┘  │                    │
│            │  ┌──────────────────────────────┐  │                    │
│            │  │   Sorted Sets (Recovery)      │  │                    │
│            │  │   sync:{id}:actions           │  │                    │
│            │  │   (Last 1000 actions, 24h)    │  │                    │
│            │  └──────────────────────────────┘  │                    │
│            └────────────────────────────────────┘                    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### SyncAction Interface

```typescript
// src/lib/realtime/redis-pubsub.ts
interface SyncAction {
  id: string                    // UUID
  type: 'insert' | 'update' | 'delete'
  module: 'guests' | 'budget' | 'events' | 'vendors' |
          'hotels' | 'transport' | 'timeline' | 'gifts' |
          'clients' | 'floorPlans'
  entityId: string              // Affected entity ID
  data?: Record<string, unknown> // Entity data
  companyId: string             // Multi-tenant isolation
  clientId?: string             // Wedding-specific
  userId: string                // Who triggered it
  timestamp: number             // Unix milliseconds
  queryPaths: string[]          // tRPC paths to invalidate
  toolName?: string             // Chatbot tool that triggered
}
```

### Sync Flow

```
Mutation occurs (e.g., add guest via chatbot)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ executeToolWithSync()                                        │
│                                                              │
│ 1. Execute database operation in transaction                 │
│                                                              │
│ 2. Build SyncAction:                                         │
│    {                                                         │
│      id: uuid(),                                             │
│      type: 'insert',                                         │
│      module: 'guests',                                       │
│      entityId: newGuest.id,                                  │
│      data: newGuest,                                         │
│      companyId: ctx.companyId,                               │
│      clientId: input.clientId,                               │
│      userId: ctx.userId,                                     │
│      timestamp: Date.now(),                                  │
│      queryPaths: ['guests.list', 'guests.getStats']          │
│    }                                                         │
│                                                              │
│ 3. Parallel Redis operations:                                │
│    ├─ publishSyncAction() → Pub/Sub broadcast                │
│    └─ storeSyncAction() → Sorted set for recovery            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Redis Pub/Sub                                                │
│                                                              │
│ Channel: company:{companyId}:sync                            │
│ Message: JSON.stringify(syncAction)                          │
│                                                              │
│ ALL server instances subscribed receive instantly            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ tRPC Subscription (sync.router.ts)                           │
│                                                              │
│ async function* onSync() {                                   │
│   // Poll Redis every 500ms for new actions                  │
│   while (!signal.aborted) {                                  │
│     const newActions = await getMissedActions(companyId)     │
│     for (const action of newActions) {                       │
│       if (action.userId !== ctx.userId) {  // No echo        │
│         yield action                                         │
│       }                                                      │
│     }                                                        │
│     await sleep(500)                                         │
│   }                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ Client-Side Hook (use-realtime-sync.ts)                      │
│                                                              │
│ 1. Receive SyncAction via SSE                                │
│                                                              │
│ 2. Update localStorage lastSyncTimestamp                     │
│                                                              │
│ 3. Invalidate React Query caches:                            │
│    queryClient.invalidateQueries({                           │
│      predicate: (q) => queryPaths.includes(q.queryKey[0])    │
│    })                                                        │
│                                                              │
│ 4. UI automatically refreshes with new data                  │
└─────────────────────────────────────────────────────────────┘
```

### Offline Recovery

```
Browser reconnects after being offline
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ useRealtimeSync() initializes                                │
│                                                              │
│ 1. Read lastSyncTimestamp from localStorage                  │
│    Key: 'weddingflo:lastSyncTimestamp'                       │
│                                                              │
│ 2. Call tRPC subscription:                                   │
│    sync.onSync({ lastSyncTimestamp })                        │
│                                                              │
│ 3. Server queries Redis sorted set:                          │
│    getMissedActions(companyId, lastSyncTimestamp)            │
│    → Returns all actions since timestamp (up to 1000)        │
│                                                              │
│ 4. Process each missed action                                │
│    → Invalidate caches → UI updates                          │
│                                                              │
│ 5. Continue live streaming                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Google Sheets Bidirectional Sync

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              GOOGLE SHEETS BIDIRECTIONAL SYNC                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────┐          ┌─────────────────────────────┐   │
│  │   WeddingFlo App    │◀────────▶│      Google Sheets          │   │
│  │   (PostgreSQL)      │          │   (Spreadsheet per client)  │   │
│  └──────────┬──────────┘          └──────────────┬──────────────┘   │
│             │                                    │                   │
│             │  ┌────────────────────────────┐    │                   │
│             └─▶│   sheets-sync.ts           │◀───┘                   │
│                │                            │                        │
│                │  syncAllToSheets()         │  Export DB → Sheets    │
│                │  importAllFromSheets()     │  Import Sheets → DB    │
│                │                            │                        │
│                │  Modules:                  │                        │
│                │  ├─ Guests (18 cols)       │                        │
│                │  ├─ Budget (11 cols)       │                        │
│                │  ├─ Timeline (11 cols)     │                        │
│                │  ├─ Hotels (15 cols)       │                        │
│                │  ├─ Transport (13 cols)    │                        │
│                │  ├─ Vendors (14 cols)      │                        │
│                │  └─ Gifts (6 cols)         │                        │
│                └────────────────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Export Flow (App → Sheets)

```
User clicks "Sync to Google Sheets"
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ googleSheetsRouter.syncNow                                   │
│                                                              │
│ 1. Verify OAuth connection                                   │
│    ├─ Check accessToken validity                             │
│    └─ Refresh if expired using refreshToken                  │
│                                                              │
│ 2. Get or create spreadsheet                                 │
│    └─ Store spreadsheetId in googleSheetsSyncSettings        │
│                                                              │
│ 3. syncAllToSheets() for each module:                        │
│                                                              │
│    GUESTS:                                                   │
│    ├─ SELECT * FROM guests WHERE clientId = ?                │
│    ├─ Format: [Serial, First Name, Last Name, Email, ...]    │
│    ├─ writeSheetData('Guests', data)                         │
│    └─ formatSheetHeaders() (bold, freeze row 1)              │
│                                                              │
│    BUDGET:                                                   │
│    ├─ SELECT * FROM budget WHERE clientId = ?                │
│    └─ writeSheetData('Budget', data)                         │
│                                                              │
│    ... repeat for all 7 modules                              │
│                                                              │
│ 4. Update lastSyncedAt timestamp                             │
└─────────────────────────────────────────────────────────────┘
```

### Import Flow (Sheets → App)

```
User clicks "Import from Google Sheets"
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ googleSheetsRouter.importFromSheet                           │
│                                                              │
│ 1. readSheetData('Guests') from Sheets API                   │
│                                                              │
│ 2. For each row:                                             │
│    ├─ Parse columns into typed data                          │
│    ├─ Find existing record by ID or unique key               │
│    ├─ Compare timestamps:                                    │
│    │   ├─ Sheet newer → UPDATE database                      │
│    │   ├─ DB newer → Skip (preserve DB version)              │
│    │   └─ No match → INSERT new record                       │
│    └─ Validate data integrity                                │
│                                                              │
│ 3. importGuestsFromSheet() results:                          │
│    {                                                         │
│      success: true,                                          │
│      imported: 45,                                           │
│      updated: 12,                                            │
│      skipped: 3,                                             │
│      errors: []                                              │
│    }                                                         │
│                                                              │
│ 4. Broadcast SyncAction for imported records                 │
│    → All connected clients see updates                       │
└─────────────────────────────────────────────────────────────┘
```

### Sheet Column Mappings

**Guests Sheet (18 columns):**
```
A: Serial Number
B: First Name
C: Last Name
D: Email
E: Phone
F: Group Name
G: RSVP Status
H: Meal Preference
I: Dietary Restrictions
J: Party Size
K: Plus One Name
L: Hotel Required
M: Hotel Name
N: Check In
O: Check Out
P: Transport Required
Q: Attending Events
R: Notes
```

**Budget Sheet (11 columns):**
```
A: ID
B: Category
C: Item
D: Description
E: Estimated Cost
F: Actual Cost
G: Paid Amount
H: Payment Status
I: Transaction Date
J: Per Guest Cost
K: Notes
```

### Auto-Sync (Optional)

```typescript
// googleSheetsSyncSettings table
{
  autoSync: boolean,          // Enable auto-sync
  autoSyncInterval: 60,       // Minutes between syncs
  syncDirection: 'bidirectional' | 'export' | 'import'
}
```

---

## 12. Security Implementation (10/10)

### Multi-Tenant Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                 MULTI-TENANT SECURITY                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Company A Data                    Company B Data            │
│  ┌─────────────────┐               ┌─────────────────┐      │
│  │ companyId: A    │               │ companyId: B    │      │
│  │                 │               │                 │      │
│  │ • Guests        │    ISOLATED   │ • Guests        │      │
│  │ • Budget        │◀────────────▶│ • Budget        │      │
│  │ • Events        │   CANNOT SEE  │ • Events        │      │
│  │ • Vendors       │    EACH OTHER │ • Vendors       │      │
│  └─────────────────┘               └─────────────────┘      │
│                                                              │
│  Every query includes:                                       │
│    WHERE companyId = ctx.companyId                           │
│                                                              │
│  Redis channels isolated:                                    │
│    company:A:sync  ≠  company:B:sync                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Security Layers

| Layer | Implementation | Status |
|-------|----------------|--------|
| **Authentication** | BetterAuth with bcrypt, session cookies | ✅ |
| **Authorization** | Role-based (super_admin, company_admin, staff, client_user) | ✅ |
| **Rate Limiting** | Redis sliding window (AI, API, Auth) | ✅ |
| **CSRF Protection** | BetterAuth built-in | ✅ |
| **XSS Prevention** | React escaping, CSP headers | ✅ |
| **SQL Injection** | Drizzle ORM parameterized queries | ✅ |
| **Input Validation** | Zod schemas on all inputs | ✅ |
| **Session Security** | HTTPOnly, Secure, SameSite cookies | ✅ |
| **2FA** | TOTP with email backup | ✅ |
| **Pending Call Ownership** | companyId + userId verification | ✅ |

### Pending Call Security Fix (February 2026)

```typescript
// src/features/chatbot/server/routers/chatbot.router.ts
confirmToolCall: protectedProcedure.mutation(async ({ input, ctx }) => {
  const pending = await getPendingCall(input.pendingCallId)

  if (!pending) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }

  // SECURITY: Verify ownership (prevents cross-tenant access)
  if (pending.companyId !== ctx.companyId || pending.userId !== ctx.userId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access denied to this pending call'
    })
  }

  // ... proceed with execution
})
```

### Rate Limiting Security Fix (February 2026)

```typescript
// src/lib/redis/rate-limiter.ts
// BEFORE: In-memory Map (bypassed across multiple instances)
// AFTER: Redis-backed sliding window (works across all instances)

export async function checkRateLimit(params: {
  key: string
  maxRequests: number
  windowMs: number
}): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${params.key}`

  // Redis sorted set for sliding window
  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(redisKey, 0, windowStart)  // Remove expired
  pipeline.zcard(redisKey)                              // Count current
  const results = await pipeline.exec()

  // ... enforcement logic
}
```

### Encryption & Transport Security

| Data Type | Protection |
|-----------|------------|
| Passwords | bcrypt (10 rounds) |
| Sessions | Signed cookies, HTTPOnly |
| API Traffic | TLS 1.3 (HTTPS only) |
| Redis | Upstash TLS always enabled |
| Database | SSL connection required |
| OAuth Tokens | Encrypted in account table |
| 2FA Secrets | Encrypted storage |

### Audit Logging

```typescript
// Activity table logs all sensitive operations
{
  userId: string,
  companyId: string,
  type: 'auth' | 'data' | 'admin',
  action: 'sign_in' | 'sign_out' | 'sign_up' | 'create' | 'update' | 'delete',
  data: JSONB,           // Affected entity IDs
  ipAddress: string,
  userAgent: string,
  createdAt: timestamp
}
```

---

## 13. What Each Technology Handles

### Upstash Redis

| Purpose | Implementation |
|---------|----------------|
| **Real-time Pub/Sub** | `company:{id}:sync` channels for instant broadcasts |
| **Offline Recovery** | Sorted sets `sync:{id}:actions` (last 1000, 24h TTL) |
| **Rate Limiting** | Sliding window algorithm for AI/API/Email/SMS |
| **Session Caching** | NOT used (PostgreSQL handles sessions) |

**Key Files:**
- `src/lib/realtime/redis-pubsub.ts` - Pub/sub functions
- `src/lib/redis/rate-limiter.ts` - Rate limiting

### PostgreSQL

| Purpose | Implementation |
|---------|----------------|
| **Primary Data Store** | All 85+ tables |
| **Authentication** | user, session, account, verification tables |
| **Rate Limiting (Auth)** | UNLOGGED `rate_limit_entries` table |
| **Pending Calls** | UNLOGGED `chatbot_pending_calls` table |
| **Job Queue** | `job_queue` table (no external queue service) |
| **Transactions** | Atomic operations for cascade mutations |

### BetterAuth

| Purpose | Implementation |
|---------|----------------|
| **Sign-up** | Email/password, Google OAuth |
| **Sign-in** | Email/password, Google OAuth, Google One Tap |
| **Sessions** | Cookie-based, 7-day expiry |
| **2FA** | TOTP (authenticator), Email OTP backup |
| **Password Reset** | Email link via Resend |
| **Email Verification** | Token-based (production only) |
| **Role Management** | Custom `role` field in user table |
| **Multi-tenancy** | Custom `companyId` field in user table |

**Creates These Tables:**
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth/credential records
- `verification` - Email/password reset tokens

### tRPC

| Purpose | Implementation |
|---------|----------------|
| **API Layer** | Type-safe procedures for all operations |
| **Real-time** | SSE subscriptions via `sync.router.ts` |
| **Authorization** | `protectedProcedure`, `adminProcedure` |
| **Validation** | Zod schemas on all inputs |

### OpenAI

| Purpose | Implementation |
|---------|----------------|
| **AI Chatbot** | GPT-4o-mini (primary), GPT-4o (fallback) |
| **Tool Calling** | Function definitions for 40+ tools |
| **Context Building** | Client data + conversation memory |

### External Services Summary

| Service | Purpose |
|---------|---------|
| **Resend** | Transactional emails (verification, invites, notifications) |
| **Twilio** | SMS & WhatsApp messages |
| **Stripe** | Payments, subscriptions, invoicing |
| **Firebase/FCM** | Push notifications |
| **AWS S3** | File uploads (documents, images) |
| **Google APIs** | Calendar sync, Sheets integration, OAuth |
| **PostHog** | Product analytics |
| **Sentry** | Error tracking & monitoring |

---

## 14. Complete Data Flow Diagrams

### User Creates Guest via Chatbot

```
┌─────────────────────────────────────────────────────────────────────┐
│            CHATBOT → DATABASE → SYNC → UI FLOW                      │
└─────────────────────────────────────────────────────────────────────┘

User: "Add guest Ravi Sharma to the wedding"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 1. CHATBOT PROCESSING                                                │
│                                                                      │
│    chatbot.chat procedure                                            │
│    ├─ Build context (client data, conversation memory)               │
│    ├─ Call OpenAI GPT-4o-mini                                        │
│    └─ AI selects tool: add_guest                                     │
│                                                                      │
│    generateToolPreview()                                             │
│    ├─ Preview: "Add Ravi Sharma as guest"                            │
│    └─ Store in chatbotPendingCalls (5-min TTL)                       │
└─────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
              User confirms
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. EXECUTION                                                         │
│                                                                      │
│    chatbot.confirmToolCall                                           │
│    ├─ SECURITY: Verify companyId + userId ownership                  │
│    ├─ Call executeToolWithSync()                                     │
│    │                                                                 │
│    │   withTransaction() {                                           │
│    │     // Atomic operations                                        │
│    │     INSERT INTO guests (firstName, lastName, clientId, ...)     │
│    │                                                                 │
│    │     // Cascade: If hotelRequired                                │
│    │     INSERT INTO hotels (guestId, guestName, ...)                │
│    │                                                                 │
│    │     // Cascade: If transportRequired                            │
│    │     INSERT INTO guest_transport (guestId, ...)                  │
│    │                                                                 │
│    │     // Cascade: Update per-guest budget items                   │
│    │     UPDATE budget SET actualCost = perGuestCost * guestCount    │
│    │   }                                                             │
│    │                                                                 │
│    └─ Delete pending call                                            │
└─────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. SYNC BROADCAST                                                    │
│                                                                      │
│    Build SyncAction:                                                 │
│    {                                                                 │
│      type: 'insert',                                                 │
│      module: 'guests',                                               │
│      entityId: 'new-guest-uuid',                                     │
│      data: { firstName: 'Ravi', lastName: 'Sharma', ... },           │
│      companyId: 'company-uuid',                                      │
│      queryPaths: ['guests.list', 'guests.getStats',                  │
│                   'hotels.list', 'budget.overview']                  │
│    }                                                                 │
│                                                                      │
│    Parallel Redis operations:                                        │
│    ├─ PUBLISH company:{id}:sync → Instant broadcast                  │
│    └─ ZADD sync:{id}:actions → Store for offline recovery            │
└─────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. CLIENT UPDATE                                                     │
│                                                                      │
│    All connected browsers:                                           │
│    ├─ Receive SyncAction via tRPC SSE subscription                   │
│    ├─ React Query invalidates: guests.list, guests.getStats, ...     │
│    └─ UI automatically refreshes with new guest                      │
│                                                                      │
│    Offline browsers (reconnect later):                               │
│    ├─ Send lastSyncTimestamp to server                               │
│    ├─ Receive missed actions from Redis sorted set                   │
│    └─ Process all missed updates                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Google Sheets Sync Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              GOOGLE SHEETS BIDIRECTIONAL SYNC                        │
└─────────────────────────────────────────────────────────────────────┘

                    EXPORT (App → Sheets)

User clicks "Sync Now"
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ googleSheetsRouter.syncNow                                           │
│                                                                      │
│ 1. OAuth Check                                                       │
│    ├─ accessToken valid? → Continue                                  │
│    └─ expired? → Refresh using refreshToken                          │
│                                                                      │
│ 2. For each module (Guests, Budget, Timeline, Hotels, ...):          │
│    ├─ SELECT * FROM {table} WHERE clientId = ?                       │
│    ├─ Format as 2D array with headers                                │
│    ├─ Google Sheets API: spreadsheets.values.update()                │
│    └─ Format headers (bold, freeze)                                  │
│                                                                      │
│ 3. Update lastSyncedAt                                               │
└─────────────────────────────────────────────────────────────────────┘


                    IMPORT (Sheets → App)

User clicks "Import"
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ googleSheetsRouter.importFromSheet                                   │
│                                                                      │
│ 1. Read sheet data via Google Sheets API                             │
│                                                                      │
│ 2. For each row:                                                     │
│    ├─ Parse into typed object                                        │
│    ├─ Find existing record by ID                                     │
│    ├─ Compare updatedAt timestamps:                                  │
│    │   ├─ Sheet newer → UPDATE database                              │
│    │   ├─ DB newer → Skip (preserve DB)                              │
│    │   └─ New record → INSERT                                        │
│    └─ Validate with Zod schema                                       │
│                                                                      │
│ 3. Broadcast SyncActions for all changes                             │
│    → All connected clients see updates                               │
│                                                                      │
│ 4. Return stats:                                                     │
│    { imported: 45, updated: 12, skipped: 3, errors: [] }             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 15. API Routes & tRPC Routers

### API Routes (Next.js App Router)

| Route | Purpose |
|-------|---------|
| `/api/auth/[...all]` | BetterAuth handler (sign-in, sign-up, OAuth) |
| `/api/trpc/[trpc]` | tRPC endpoint |
| `/api/chatbot/stream` | Streaming AI responses |
| `/api/stripe/webhook` | Stripe webhooks |
| `/api/webhooks/resend` | Email delivery webhooks |
| `/api/webhooks/twilio` | SMS/WhatsApp webhooks |
| `/api/calendar/google/*` | Google Calendar OAuth |
| `/api/invite/accept` | Invitation acceptance |
| `/api/cron/*` | Scheduled jobs |

### tRPC Router Tree

```
appRouter
├── auth                    # (via BetterAuth, not tRPC)
├── clients                 # Client/wedding CRUD
├── guests                  # Guest management
├── events                  # Event scheduling
├── timeline                # Day-of timeline
├── timelineTemplates       # Reusable templates
├── budget                  # Budget tracking
├── internalBudget          # Internal expenses
├── hotels                  # Accommodations
├── accommodations          # Hotel/venue info
├── guestTransport          # Travel logistics
├── vehicles                # Fleet management
├── vendors                 # Vendor management
├── gifts                   # Gift registry
├── giftsEnhanced           # Enhanced tracking
├── guestGifts              # Party favors
├── floorPlans              # Seating arrangements
├── eventFlow               # Real-time event
├── documents               # File management
├── messages                # Direct messaging
├── email                   # Email notifications
├── sms                     # SMS notifications
├── whatsapp                # WhatsApp messages
├── push                    # Push notifications
├── payment                 # Payment processing
├── stripe                  # Stripe integration
├── pdf                     # PDF generation
├── calendar                # Google Calendar
├── analytics               # BI reporting
├── analyticsExport         # Export analytics
├── export                  # Data export
├── import                  # Data import
├── storage                 # AWS S3
├── websites                # Website builder
├── pipeline                # Sales CRM
├── googleSheets            # Sheets sync
├── referrals               # Referral program
├── team                    # Team management
├── onboarding              # Onboarding flow
├── companies               # Company settings
├── users                   # User profiles
├── activity                # Activity logs
├── questionnaires          # Q&A forms
├── workflows               # Automation
├── proposals               # Proposals
├── contracts               # Contracts
├── integrations            # Third-party
├── portal                  # Client portal
├── chatbot                 # AI chatbot
├── sync                    # Real-time sync
└── creatives               # Creative jobs
```

---

## Summary

**WeddingFlo** is a production-ready, multi-tenant wedding planning SaaS with:

- **85+ PostgreSQL tables** with comprehensive indexing
- **BetterAuth** for secure authentication (OAuth, 2FA, rate limiting)
- **Real-time sync** via Upstash Redis pub/sub
- **AI chatbot** with 40+ tools and confirmation flow
- **Bidirectional Google Sheets sync** for all planning modules
- **10/10 security rating** with multi-tenant isolation
- **Hosted on Hostinger** (not Hetzner)

This document serves as the **single source of truth** for understanding the complete architecture, data flows, and security implementation.

---

*Last updated: February 2026*
