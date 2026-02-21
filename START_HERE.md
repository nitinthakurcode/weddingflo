# WeddingFlo - Start Here

**Status**: Production Ready
**Stack**: BetterAuth + Drizzle ORM + Hetzner PostgreSQL
**Last Updated**: December 2025

---

## Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/weddingflo.git
cd weddingflo
npm install
```

### 2. Environment Setup
```bash
cp .env.production.example .env.local
# Edit .env.local with your values
```

### 3. Database Setup
```bash
npm run db:push
npm run seed:admin
```

### 4. Development
```bash
npm run dev
# Visit http://localhost:3000
```

---

## Tech Stack (December 2025)

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, TailwindCSS 4 |
| **Backend** | tRPC v11, Next.js API Routes |
| **Database** | PostgreSQL (Hetzner) + Drizzle ORM |
| **Auth** | BetterAuth (self-hosted, cookie-based) |
| **Storage** | S3-compatible (Hetzner Object Storage) |
| **AI** | OpenAI GPT-4o-mini (primary) + GPT-4o (fallback) |
| **Email** | Resend |
| **SMS** | Twilio |
| **Payments** | Stripe |

---

## Essential Documentation

### For Developers
1. **`.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md`** - Mandatory patterns
2. **`WEDDINGFLO_MASTER_REFERENCE.md`** - Complete feature reference
3. **`README.md`** - Project overview

### Key Patterns

**Server-Side Auth:**
```typescript
import { getServerSession } from '@/lib/auth/server'
const { userId, user } = await getServerSession()
```

**Client-Side Auth:**
```typescript
import { useAuth } from '@/lib/auth-client'
const { user, isAuthenticated, isLoading } = useAuth()
```

**Database Queries:**
```typescript
import { db } from '@/lib/db'
import { clients } from '@/lib/db/schema'
const data = await db.select().from(clients)
```

---

## Commands

```bash
# Development
npm run dev              # Start dev server

# Database
npm run db:push          # Push schema changes
npm run db:generate      # Generate migration
npm run db:migrate       # Run migrations
npm run db:studio        # Open Drizzle Studio
npm run seed:admin       # Seed super admin

# Testing
npm run test             # Unit tests
npm run test:e2e         # E2E tests

# Build
npm run build            # Production build
npm run type-check       # TypeScript check

# Docker
npm run docker:build     # Build Docker image
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
```

---

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/             # API routes
│   └── [locale]/        # i18n routes
├── components/          # React components
├── features/            # Feature modules (tRPC routers)
├── lib/
│   ├── auth.ts          # BetterAuth server config
│   ├── auth-client.ts   # BetterAuth client hooks
│   └── db/              # Drizzle ORM setup
└── server/trpc/         # tRPC configuration
```

---

## Support

- **Standards**: `.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md`
- **Full Reference**: `WEDDINGFLO_MASTER_REFERENCE.md`
