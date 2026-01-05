# WEDDINGFLO - MANDATORY PROJECT STANDARDS

**Last Updated:** December 2025
**Version:** 2.0 (BetterAuth Migration)
**Status:** NON-NEGOTIABLE - These standards apply to EVERY code change
**Read this file at the START of EVERY session**

---

## CRITICAL: READ FIRST

**Claude:** Before writing ANY code or making ANY suggestions:
1. Read this file completely
2. Verify all patterns match these standards
3. Reject any code that violates these standards
4. Apply these patterns to 100% of code suggestions

---

## AUTHENTICATION - BETTERAUTH (December 2025)

This app uses **BetterAuth** with cookie-based sessions. NO Clerk imports. NO database queries for auth checks.

### Server-Side Auth (Always use this):

```typescript
import { getServerSession } from '@/lib/auth/server'

// In tRPC context:
export const createTRPCContext = async () => {
  const { userId, user } = await getServerSession()

  return {
    userId,                     // From BetterAuth session
    companyId: user?.companyId, // From session
    role: user?.role,           // From session
    db,                         // Drizzle database client
  }
}

// In procedures:
protectedProcedure.query(({ ctx }) => {
  const { userId, companyId, role } = ctx  // <10ms, no DB query
})
```

### Client-Side Auth (Always use this):

```typescript
import { useAuth, useUserRole } from '@/lib/auth-client'

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { role, isCompanyAdmin } = useUserRole()

  if (isLoading) return <Loading />
  if (!isAuthenticated) return <Redirect to="/sign-in" />

  return <div>Welcome, {user.name}</div>
}
```

### FORBIDDEN (NEVER do this):

```typescript
// WRONG: Clerk imports (REMOVED)
import { auth } from '@clerk/nextjs/server'  // REMOVED
import { useAuth } from '@clerk/nextjs'  // REMOVED

// WRONG: Session claims from Clerk
const { sessionClaims } = await auth()  // REMOVED

// WRONG: Database query for auth data
const user = await db.query.users.findFirst({
  where: eq(users.clerk_id, userId)
})
const role = user.role  // NO - use session!

// WRONG: Auth checks in middleware
export default function middleware(req) {
  const session = await auth.api.getSession(...)  // NO - causes loops!
}
```

### RULES:
- ALWAYS use `getServerSession()` from `@/lib/auth/server` on server
- ALWAYS use `useAuth()` from `@/lib/auth-client` on client
- NEVER query database for `role`, `company_id`, or auth data
- NEVER add auth logic to middleware (i18n only)
- NEVER import from `@clerk/*` packages

---

## SUPABASE API STANDARDS (MANDATORY)

### CORRECT PATTERN (Always use this):

```typescript
import { createClient } from '@supabase/supabase-js'  // NOT @supabase/ssr

// Client-side or API routes:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

// Admin operations (server-side only):
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
```

### FORBIDDEN (NEVER do this):

```typescript
// WRONG: Deprecated package
import { createClient } from '@supabase/ssr'  // OLD PACKAGE

// WRONG: Deprecated key name
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY  // DEPRECATED KEY NAME
)
```

### ENVIRONMENT VARIABLES:

```bash
# CORRECT:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SECRET_KEY=eyJhbGc...

# FORBIDDEN:
SUPABASE_ANON_KEY=eyJhbGc...  # DO NOT USE
```

---

## PROXY PATTERN (December 2025 - Next.js 16+)

### CORRECT PATTERN (Always use this):

```typescript
// src/proxy.ts - RENAMED FROM middleware.ts in Next.js 16
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

  // ONLY handle i18n routing
  return handleI18nRouting(request)

  // NO auth checks
  // NO database queries
  // NO role checking
}

export default proxy
```

### FORBIDDEN (NEVER do this):

```typescript
// WRONG: Using deprecated middleware.ts (Next.js 16+ uses proxy.ts)
export default function middleware(req) { ... }

// WRONG: Auth in proxy
export function proxy(req) {
  const session = await auth.api.getSession(...)  // NO!
  if (!session) return redirect('/sign-in')  // Causes redirect loops!
}

// WRONG: Database queries in proxy
export function proxy(req) {
  const user = await db.query.users.findFirst(...)  // NO DB IN PROXY
}
```

### RULES:
- File: `src/proxy.ts` (NOT middleware.ts - deprecated in Next.js 16)
- Function: `export function proxy()` (NOT middleware)
- Runtime: Node.js (Edge runtime not supported in proxy)
- ONLY i18n routing in proxy
- NEVER auth checks in proxy
- NEVER database queries in proxy
- ALWAYS handle auth at page/layout level

---

## PROFESSIONAL IMPLEMENTATION STANDARDS

### 1. NO Band-Aid Approaches

**Rules:**
- Production-grade code from day 1
- Complete features (not partial implementations)
- Proper database constraints and indexes
- Complete error handling
- NEVER use "TODO: fix later"
- NEVER skip validation "for now"

### 2. Type Safety: Proper TypeScript Throughout

```typescript
// CORRECT:
import { z } from 'zod'
import type { Database } from '@/lib/database.types'

const input = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1).max(100),
})

type Input = z.infer<typeof input>
type Client = Database['public']['Tables']['clients']['Row']

// FORBIDDEN:
const input: any = { ... }
function doSomething(data: any): any { ... }
```

### 3. Error Handling: Comprehensive

```typescript
// CORRECT:
import { TRPCError } from '@trpc/server'

try {
  // Operation...
} catch (error) {
  if (error instanceof TRPCError) throw error

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Failed to complete operation',
    cause: error,
  })
}

// FORBIDDEN:
await supabase.from('clients').insert(data)  // No error handling
return { success: true }  // No validation
```

---

## RED FLAGS - REJECT IMMEDIATELY

If you see ANY of these patterns, **REJECT the code**:

- `@clerk/*` package imports (REMOVED)
- `auth()` from Clerk (REMOVED)
- `sessionClaims` usage (REMOVED)
- Auth checks in middleware
- Database queries in middleware
- `SUPABASE_ANON_KEY` environment variable
- `@supabase/ssr` package import
- `any` types without strong justification
- Missing error handling
- `localStorage` for auth tokens
- Database queries for auth data (role, company_id)

---

## PRE-COMMIT CHECKLIST

Before suggesting ANY code, verify:

- [ ] Using `getServerSession()` for server auth (not Clerk)
- [ ] Using `useAuth()` from `@/lib/auth-client` for client auth
- [ ] No auth checks in middleware (i18n only)
- [ ] Using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not anon)
- [ ] Using `@supabase/supabase-js` package (not ssr)
- [ ] No `any` types (full TypeScript safety)
- [ ] Comprehensive error handling (TRPCError)
- [ ] Production-grade code (no band-aids)

---

## SIGN IN/OUT PATTERNS

### Sign In:
```typescript
import { signInWithEmail, signInWithGoogle } from '@/lib/auth-client'

await signInWithEmail(email, password)
await signInWithGoogle()
```

### Sign Out:
```typescript
import { signOutAndRedirect } from '@/lib/auth-client'

await signOutAndRedirect('/sign-in')
```

### Protected API Routes:
```typescript
import { requireAuth } from '@/lib/auth/server'

export async function GET() {
  const { userId, user } = await requireAuth()
  // Throws if not authenticated
}
```

---

## COMMITMENT

**Claude: When you start a new session:**
1. Read this file FIRST
2. Apply these standards to EVERY code suggestion
3. Reject any code that violates these standards
4. Review existing code against these standards
5. Proactively catch violations

**These standards are:**
- Non-negotiable
- Permanent
- Mandatory
- Production-grade only

---

**Last Updated:** December 2025
**Version:** 2.0 (BetterAuth Migration)
**Status:** ACTIVE - Apply to all WeddingFlo work
