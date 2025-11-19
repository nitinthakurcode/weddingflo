# WeddingFlow Pro - Corrected Architecture (2025 Native Integration)

**Date:** October 23, 2025
**Status:** ✅ Production-Ready
**Deployment:** Fly.io Monolith with Horizontal Scaling

---

## Architecture Principles

### 1. Monolith, NOT Microservices

**WeddingFlow Pro is architected as a MONOLITH** deployed to Fly.io with horizontal scaling across multiple regions.

**Why Monolith?**
- ✅ Simpler deployment (single codebase)
- ✅ Lower operational complexity
- ✅ Faster development iteration
- ✅ Better for teams < 20 developers
- ✅ Easier debugging and monitoring
- ✅ No distributed system complexity

**Scalability Strategy:**
- **NOT:** Breaking into microservices
- **YES:** Horizontal scaling across Fly.io regions
- **YES:** Database read replicas in each region
- **YES:** CDN for static assets (Cloudflare R2)

### 2. Feature Pockets = Logical Boundaries, NOT Service Boundaries

**Feature pockets are for CODE ORGANIZATION, not deployment separation.**

```
src/features/
├── core/          # Logical module 1
├── clients/       # Logical module 2
├── events/        # Logical module 3
...
```

**What they provide:**
- ✅ Team ownership (different teams work on different pockets)
- ✅ Clear code organization (fast debugging)
- ✅ Reduced merge conflicts (isolated changes)
- ✅ Domain-driven design (business logic grouped)

**What they DON'T provide:**
- ❌ Independent deployment
- ❌ Separate processes
- ❌ Service-to-service communication
- ❌ Distributed transactions

**All pockets are compiled into ONE Next.js application deployed as ONE Docker container to Fly.io.**

---

## 2025 Native Clerk + Supabase Integration

### How It Works (NO Decapitated API)

**Traditional (DEPRECATED) Pattern:**
```typescript
// ❌ OLD WAY: Decapitated Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // ❌ Uses anonymous key
)
```

**2025 Native Pattern:**
```typescript
// ✅ NEW WAY: Clerk JWT Native Integration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, // ✅ New 2025 format
  {
    async accessToken() {
      const { getToken } = await auth() // Get Clerk JWT
      const jwt = await getToken()
      return jwt // ✅ Clerk JWT passed to Supabase
    }
  }
)
```

**What Happens:**
1. User authenticates with Clerk
2. Clerk issues JWT token
3. Our app requests data from Supabase
4. Supabase receives Clerk JWT as auth token
5. Supabase verifies JWT signature (configured to trust Clerk)
6. Supabase applies Row Level Security (RLS) using JWT claims
7. Data returned respecting user permissions

**Benefits:**
- ✅ NO separate Supabase authentication
- ✅ Clerk is single source of truth
- ✅ JWT tokens are stateless (fast)
- ✅ RLS enforced at database level
- ✅ No manual token management

### Environment Variables (2025 Format)

**From `.env.example` (lines 24-48):**

```bash
# CLERK AUTHENTICATION
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# SUPABASE - 2025 NATIVE INTEGRATION
# IMPORTANT: Use NEW 2025 API key format (sb_publishable_* and sb_secret_*)
# Legacy JWT keys (eyJ...) deprecated as of April 1, 2025
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx  # ✅ NEW FORMAT
SUPABASE_SECRET_KEY=sb_secret_xxxxx                        # ✅ NEW FORMAT

# Service Role Key - ONLY for webhooks & iCal feeds (bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Key Differences:**
| Variable | Old Format | New Format (2025) |
|----------|-----------|-------------------|
| Public Key | `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` |
| Secret Key | `SUPABASE_KEY=eyJ...` | `SUPABASE_SECRET_KEY=sb_secret_...` |
| Auth Method | Anonymous Supabase auth | Clerk JWT forwarding |

### When to Use SERVICE_ROLE_KEY

**ONLY in these scenarios:**
1. **Webhooks** - External services (Stripe, Twilio, Resend) updating logs without user auth
2. **Public API Endpoints** - iCal feeds with token-based auth (not Clerk auth)
3. **Background Jobs** - Cron tasks that need admin access
4. **Admin Operations** - Super admin functions that bypass RLS

**Example: Calendar iCal Feed**
```typescript
// src/app/api/calendar/feed/[token]/route.ts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ CORRECT - public feed, token-based auth
);
```

This is CORRECT because:
- iCal feeds are public endpoints (Apple Calendar, Google Calendar)
- Authentication is via feed token, NOT Clerk
- Needs to bypass RLS to fetch events for token owner

---

## Fly.io Deployment Strategy

### Architecture: Single Monolith, Multiple Regions

```
┌─────────────────────────────────────────────┐
│         Fly.io Global Load Balancer         │
│     (Routes to nearest region via Anycast)  │
└─────────────────────────────────────────────┘
           │         │         │
    ┌──────┴───┐ ┌──┴──────┐ ┌┴────────┐
    │ US East  │ │ US West │ │ Europe  │
    │  (iad)   │ │  (sjc)  │ │  (fra)  │
    └──────────┘ └─────────┘ └─────────┘
    │ Machine 1 │ Machine 1 │ Machine 1│
    │ Machine 2 │ Machine 2 │ Machine 2│
    └───────────┘ └─────────┘ └─────────┘
           │           │           │
           └───────────┴───────────┘
                      │
              ┌───────────────┐
              │   Supabase    │
              │   (Postgres)  │
              │ + Read Replicas│
              └───────────────┘
```

### Scaling Phases

| Phase | Users | Regions | Machines | RAM/CPU | Cost/Month |
|-------|-------|---------|----------|---------|------------|
| **Phase 1** | 0-10K | 1 (US East) | 1 | 512MB / 1 CPU | ~$5 |
| **Phase 2** | 10-100K | 3 (US + Europe) | 6-9 | 1GB / 2 CPU | ~$50-100 |
| **Phase 3** | 100K-1M | 5+ (Global) | 15-25 | 4GB / 2-4 CPU | ~$300-500 |

### Key Features

**Fly.io Advantages:**
- ✅ 30+ regions worldwide
- ✅ Anycast routing (auto-routes to nearest machine)
- ✅ Built-in load balancing
- ✅ Zero-downtime deployments
- ✅ Automatic SSL certificates
- ✅ Health checks with auto-restart
- ✅ Docker-based deployment

**vs Vercel:**
- ❌ NO Vercel (serverless functions have cold starts)
- ✅ Fly.io machines stay warm (faster response)
- ✅ Full control over environment
- ✅ Better WebSocket support
- ✅ Lower cost at scale

### Deployment Commands

```bash
# Initial setup
fly launch

# Deploy to production
fly deploy

# Scale to 2 machines in US East
fly scale count 2 --region iad

# Add a new region
fly scale count 1 --region sjc  # US West

# Scale VM resources
fly scale vm shared-cpu-2x --memory 1024

# Monitor
fly logs
fly status
fly checks list
```

---

## Performance Targets

### Latency (P95)
- **Same Region:** < 50ms
- **Cross Region:** < 130ms (with Fly.io Anycast)
- **Database:** < 20ms (Supabase read replicas)

### Throughput
- **Phase 1 (1 machine):** ~100 req/sec
- **Phase 2 (6-9 machines):** ~600-900 req/sec
- **Phase 3 (15-25 machines):** ~1500-2500 req/sec

### Availability
- **SLA:** 99.9% uptime
- **Strategy:** Multi-region deployment + health checks
- **Failover:** Automatic (Fly.io routes around failed machines)

---

## Database Strategy

### Supabase Configuration

**Primary Database:**
- Location: AWS region closest to primary Fly.io region
- Connection: Pooler for connection management

**Read Replicas:**
- Add replicas in Phase 2 (multi-region)
- Configure read-only endpoints per region
- Use for analytics queries

**Row Level Security (RLS):**
- Enforced via Clerk JWT claims
- `user_id` and `company_id` from JWT
- Fast policy evaluation (< 1ms overhead)

---

## File Storage Strategy

### Cloudflare R2 + CDN

**Architecture:**
```
User Upload → Fly.io App → Cloudflare R2 (S3-compatible)
                                 ↓
                          Cloudflare CDN
                                 ↓
                          User Download
```

**Benefits:**
- ✅ Zero egress fees (R2)
- ✅ Global CDN included
- ✅ S3-compatible API
- ✅ ~80% cheaper than AWS S3

**Cost:**
- Storage: $0.015/GB/month
- Operations: $4.50/million requests
- Egress: **FREE** (via Cloudflare CDN)

---

## Production Checklist

### Before Deployment

- [ ] All environment variables set in Fly.io secrets
- [ ] Supabase RLS policies enabled
- [ ] Clerk JWT integration configured in Supabase
- [ ] Cloudflare R2 bucket created
- [ ] Stripe webhooks pointed to production URL
- [ ] Sentry DSN configured
- [ ] PostHog project created

### Deployment

```bash
# Set all secrets
fly secrets set CLERK_SECRET_KEY=sk_... \
                NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
                SUPABASE_SECRET_KEY=sb_secret_... \
                SUPABASE_SERVICE_ROLE_KEY=eyJ... \
                # ... (all other secrets)

# Deploy
fly deploy

# Verify
fly logs -a weddingflow-pro
fly status
```

### Post-Deployment Verification

- [ ] Health check endpoint responding: `https://yourapp.fly.dev/api/health`
- [ ] Authentication working (Clerk login)
- [ ] Database queries working (Supabase + RLS)
- [ ] File uploads working (R2)
- [ ] Webhooks receiving events (Stripe, Twilio, Resend)
- [ ] Error tracking working (Sentry)
- [ ] Analytics tracking (PostHog)

---

## Cost Breakdown (Phase 1-3)

### Phase 1: MVP (0-10K users)
- Fly.io: ~$5/month (1 machine, 512MB)
- Supabase: Free tier (500MB database)
- Clerk: Free tier (10K MAU)
- R2: ~$1/month (1GB storage)
- **Total: ~$6-10/month**

### Phase 2: Growth (10-100K users)
- Fly.io: ~$50-100/month (6-9 machines, 1GB each)
- Supabase: ~$25/month (Pro tier + read replicas)
- Clerk: ~$25/month (25K MAU)
- R2: ~$5-10/month (10GB storage)
- Twilio: ~$50/month (SMS/WhatsApp)
- Resend: ~$20/month (Email)
- **Total: ~$175-230/month**

### Phase 3: Scale (100K-1M users)
- Fly.io: ~$300-500/month (15-25 machines, 4GB each)
- Supabase: ~$100-200/month (Enterprise tier + replicas)
- Clerk: ~$100-200/month (100K MAU)
- R2: ~$20-50/month (100GB storage)
- Twilio: ~$200/month (SMS/WhatsApp)
- Resend: ~$100/month (Email)
- OpenAI: ~$100/month (AI features)
- **Total: ~$920-1370/month**

---

## Summary

✅ **Architecture:** Monolith (NOT microservices)
✅ **Deployment:** Fly.io with horizontal scaling
✅ **Authentication:** 2025 Native Clerk + Supabase JWT integration
✅ **Database:** Supabase with RLS enforced via Clerk JWT
✅ **Storage:** Cloudflare R2 + CDN
✅ **Scalability:** Multi-region deployment (NOT service splitting)
✅ **Feature Pockets:** Logical code organization (NOT service boundaries)

**Top 1% scalability = Monolith + Horizontal Scaling + Multi-Region, NOT microservices.**

---

*Last Updated: October 23, 2025*
*Architecture: 2025 Native Integration Pattern*
