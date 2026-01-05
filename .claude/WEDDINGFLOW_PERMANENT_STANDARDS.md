# WEDDINGFLO - PERMANENT STANDARDS & CHECKLIST

**Last Updated:** December 2025
**Version:** 3.0 (BetterAuth Migration)
**Status:** MANDATORY - Apply to EVERY code change
**Auto-Read:** This file is automatically referenced by `/standards` command

---

## CRITICAL: READ THIS FIRST

**Before writing ANY code:**
1. Use the `/standards` command at the start of each session
2. Verify your request against all patterns below
3. Check for anti-patterns and red flags
4. Only proceed after verification passes

---

## CORE ARCHITECTURAL PRINCIPLES

### 1. AUTHENTICATION - BETTERAUTH (December 2025)

**Performance:** <10ms per request (cookie-based sessions)
**Pattern:** BetterAuth with Drizzle ORM + PostgreSQL

#### CORRECT PATTERN - Server Side:

```typescript
// In layouts, API routes, tRPC context
import { getServerSession } from '@/lib/auth/server'

const { userId, user } = await getServerSession()

// Read from session (NO database query needed)
const role = user?.role
const companyId = user?.companyId

// In tRPC context:
export const createTRPCContext = async () => {
  const { userId, user } = await getServerSession()

  return {
    userId,                    // From BetterAuth session
    role: user?.role,          // From session
    companyId: user?.companyId, // From session
    db,                        // Drizzle database client
    supabase: createServerSupabaseClient(), // For legacy queries
  }
}
```

#### CORRECT PATTERN - Client Side:

```typescript
// In React components
import { useAuth, useSession, useUserRole } from '@/lib/auth-client'

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { role, isSuperAdmin, isCompanyAdmin } = useUserRole()

  if (isLoading) return <Loading />
  if (!isAuthenticated) return <Redirect to="/sign-in" />

  return <div>Welcome, {user.name}</div>
}
```

#### FORBIDDEN PATTERNS:

```typescript
// WRONG: Old Clerk imports
import { auth } from '@clerk/nextjs/server'  // REMOVED
import { useAuth } from '@clerk/nextjs'  // REMOVED

// WRONG: Session claims from Clerk
const { sessionClaims } = await auth()  // REMOVED
const role = sessionClaims?.metadata?.role  // REMOVED

// WRONG: Database query for auth data
const { data: user } = await supabase
  .from('users')
  .select('role')
  .eq('clerk_id', userId)
  .single()  // Unnecessary - use session!
```

#### RULES:
- ALWAYS use `getServerSession()` from `@/lib/auth/server` for server-side auth
- ALWAYS use `useAuth()` from `@/lib/auth-client` for client-side auth
- NEVER query database for role or companyId (use session)
- NEVER import from `@clerk/*` packages (removed)
- ALWAYS handle auth at page/layout level, not middleware

---

### 2. SUPABASE API STANDARDS (Legacy Data Layer)

**Note:** Supabase is used as a data layer alongside Drizzle ORM. Auth is handled by BetterAuth.

#### CORRECT PATTERN:

```typescript
import { createClient } from '@supabase/supabase-js'  // CORRECT PACKAGE

// Client-side or API routes:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

// Admin operations (server-side):
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
```

#### FORBIDDEN PATTERNS:

```typescript
// WRONG: Deprecated package
import { createClient } from '@supabase/ssr'  // OLD PACKAGE

// WRONG: Deprecated key name
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY  // DEPRECATED
)
```

#### ENVIRONMENT VARIABLES:

```bash
# CORRECT:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SECRET_KEY=eyJhbGc...

# FORBIDDEN:
SUPABASE_ANON_KEY=eyJhbGc...  # DO NOT USE
```

---

### 3. PROXY PATTERN (December 2025 - Next.js 16+)

**Rule:** Proxy handles ONLY i18n routing - NO auth checks!

> **IMPORTANT:** In Next.js 16, `middleware.ts` is renamed to `proxy.ts`. The function name changes from `middleware` to `proxy`. Runtime is now Node.js (not Edge).

#### CORRECT PATTERN:

```typescript
// src/proxy.ts - RENAMED from middleware.ts in Next.js 16
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)

// Named export "proxy" - Next.js 16 standard
export function proxy(request: NextRequest): NextResponse | Response {
  // Skip i18n for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // ONLY handle internationalization
  return handleI18nRouting(request)
}

export default proxy

// NO auth.protect()
// NO session checks
// NO database queries
```

#### FORBIDDEN PATTERNS:

```typescript
// WRONG: Using deprecated middleware.ts (Next.js 16+ uses proxy.ts)
export default function middleware(req) { ... }

// WRONG: Auth checks in proxy
export function proxy(req) {
  const session = await auth.api.getSession(...)  // NO!
  if (!session) return redirect('/sign-in')  // Causes loops!
}

// WRONG: Database queries in proxy
export function proxy(req) {
  const user = await supabase.from('users')...  // SLOW!
}

// WRONG: Role checks in proxy
export function proxy(req) {
  if (session.user.role !== 'admin') {  // Do in layout instead!
    return redirect(...)
  }
}
```

#### RULES:
- File: `src/proxy.ts` (NOT middleware.ts - deprecated in Next.js 16)
- Function: `export function proxy()` (NOT middleware)
- Runtime: Node.js (Edge runtime not supported in proxy)
- ONLY i18n routing in proxy
- NEVER auth checks in proxy (causes redirect loops with next-intl)
- NEVER database queries in proxy
- ALWAYS handle auth at page/layout level

**Why:** Proxy runs on EVERY request. Auth checks there conflict with next-intl and cause redirect loops.

---

### 4. AUTH AT PAGE/LAYOUT LEVEL

**Rule:** Handle authentication in layouts, not middleware

#### CORRECT PATTERN:

```typescript
// src/app/[locale]/(dashboard)/layout.tsx
import { getServerSession } from '@/lib/auth/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }) {
  const { userId, user } = await getServerSession()

  // Auth check at layout level
  if (!userId || !user) {
    redirect('/sign-in')
    return null
  }

  // Role check at layout level
  if (user.role === 'super_admin') {
    redirect('/superadmin')
    return null
  }

  return <>{children}</>
}
```

---

## PROFESSIONAL IMPLEMENTATION STANDARDS

### 1. Type Safety: Proper TypeScript Throughout

#### CORRECT PATTERN:

```typescript
import { z } from 'zod'
import type { Database } from '@/lib/database.types'

// Input validation
const createClientInput = z.object({
  partner1_first_name: z.string().min(1).max(100),
  partner1_email: z.string().email(),
  wedding_date: z.string().datetime(),
})

type CreateClientInput = z.infer<typeof createClientInput>

// tRPC procedure
export const clientsRouter = router({
  create: protectedProcedure
    .input(createClientInput)
    .mutation(async ({ ctx, input }) => {
      // Fully typed...
    }),
})
```

#### RULES:
- NEVER use `any` type (use `unknown` if truly needed)
- ALWAYS use Zod for input validation
- ALWAYS use generated database types
- ALWAYS ensure end-to-end type safety

---

### 2. Error Handling: Comprehensive

#### CORRECT PATTERN:

```typescript
import { TRPCError } from '@trpc/server'

export const deleteClient = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    try {
      // Check permissions
      if (ctx.role !== 'company_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only company admins can delete clients',
        })
      }

      // ... operation ...

    } catch (error) {
      if (error instanceof TRPCError) throw error

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        cause: error,
      })
    }
  })
```

---

## RED FLAGS - STOP IMMEDIATELY

If you see ANY of these patterns, **REJECT the code**:

- `@clerk/*` package imports (REMOVED)
- `auth()` from Clerk (REMOVED)
- `sessionClaims` usage (REMOVED)
- Database queries in middleware
- Auth checks in middleware
- `SUPABASE_ANON_KEY` environment variable
- `@supabase/ssr` package import
- `any` types without strong justification
- Missing error handling
- `localStorage` for auth tokens
- Role checks in middleware instead of layouts

---

## PACKAGES (December 2025)

### CORRECT:

```json
{
  "better-auth": "^1.4.5",
  "drizzle-orm": "^0.45.0",
  "@supabase/supabase-js": "^2.86.0"
}
```

### NEVER INSTALL:

```json
{
  "@clerk/nextjs": "...",     // REMOVED
  "@supabase/ssr": "..."      // WRONG PACKAGE
}
```

---

## VERIFICATION CHECKLIST

### After EVERY Code Change:

```bash
# 1. TypeScript build
npm run build
# Must show: "Compiled successfully"

# 2. Test authentication flow
# - Sign out completely
# - Sign in fresh
# - Dashboard loads
```

### Pre-Commit Checklist:

- [ ] Using `getServerSession()` for server auth (not Clerk)
- [ ] Using `useAuth()` from `@/lib/auth-client` for client auth
- [ ] No auth checks in middleware (i18n only)
- [ ] Auth handled at page/layout level
- [ ] Using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not anon)
- [ ] Using `@supabase/supabase-js` package (not ssr)
- [ ] No `any` types (full TypeScript safety)
- [ ] Comprehensive error handling (TRPCError)

---

## AUTHENTICATION FLOW (BetterAuth)

### Sign In:
```typescript
import { signInWithEmail, signInWithGoogle } from '@/lib/auth-client'

// Email/password
await signInWithEmail(email, password)

// Google OAuth
await signInWithGoogle()
```

### Sign Out:
```typescript
import { signOutAndRedirect } from '@/lib/auth-client'

await signOutAndRedirect('/sign-in')
```

### Protected Server Routes:
```typescript
import { requireAuth } from '@/lib/auth/server'

export async function GET() {
  const { userId, user } = await requireAuth()
  // Throws if not authenticated
}
```

---

## PERFORMANCE TARGETS

**Authentication:**
- Session read: <10ms (cookie-based)
- Layout auth check: <10ms
- Total auth overhead: <20ms per request

**BetterAuth Advantages:**
- Self-hosted (no external API calls for auth)
- Cookie-based sessions (fast)
- No rate limits from third-party
- Full control over user data

---

**END OF PERMANENT STANDARDS - USE `/standards` COMMAND TO REFERENCE THIS FILE**
