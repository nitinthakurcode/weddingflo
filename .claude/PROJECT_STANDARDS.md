# 🎯 WEDDINGFLOW PRO - MANDATORY PROJECT STANDARDS

**Last Updated:** October 23, 2025
**Status:** NON-NEGOTIABLE - These standards apply to EVERY code change
**Read this file at the START of EVERY session**

---

## 🚨 CRITICAL: READ FIRST

**Claude:** Before writing ANY code or making ANY suggestions:
1. Read this file completely
2. Verify all patterns match these standards
3. Reject any code that violates these standards
4. Apply these patterns to 100% of code suggestions

---

## 🔐 SESSION CLAIMS NOTICE (MANDATORY)

This app uses **Clerk session claims** for authentication. NO database queries for auth checks.

### ✅ CORRECT PATTERN (Always use this):

```typescript
import { auth } from '@clerk/nextjs/server'

// In tRPC context:
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { userId, sessionClaims } = auth()

  return {
    userId,                                    // ✅ From auth()
    companyId: sessionClaims?.metadata?.company_id,  // ✅ From session claims
    role: sessionClaims?.metadata?.role,       // ✅ From session claims
    subscriptionTier: sessionClaims?.metadata?.subscription_tier,
  }
}

// In procedures:
protectedProcedure.query(({ ctx }) => {
  const { userId, companyId, role } = ctx  // ✅ <5ms, no DB query
})
```

### ❌ FORBIDDEN (NEVER do this):

```typescript
// ❌ WRONG: Database query for auth data
const user = await db.query.users.findFirst({
  where: eq(users.clerk_id, userId)
})
const role = user.role  // ❌ NO - this is a DB query for auth

// ❌ WRONG: Auth checks in middleware
export default clerkMiddleware(async (auth, req) => {
  const user = await db.query.users.findFirst(...)  // ❌ NO DB IN MIDDLEWARE
})
```

### RULES:
- ✅ **ALWAYS** use `ctx.userId`, `ctx.companyId`, `ctx.role` from tRPC context
- ✅ **NEVER** query database for `role`, `company_id`, or auth data
- ✅ **ALWAYS** ensure <5ms auth performance (no database round-trips)
- ✅ **NEVER** add auth logic to middleware (JWT verification ONLY)

---

## ⚡ OCTOBER 2025 SUPABASE API STANDARDS (MANDATORY)

### ✅ CORRECT PATTERN (Always use this):

```typescript
// ✅ CORRECT: October 2025 Supabase client
import { createClient } from '@supabase/supabase-js'  // ✅ NOT @supabase/ssr

// Client-side or API routes:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!  // ✅ October 2025 key name
)

// Admin operations (server-side only):
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!  // ✅ Secret key for admin
)
```

### ❌ FORBIDDEN (NEVER do this):

```typescript
// ❌ WRONG: Deprecated package
import { createClient } from '@supabase/ssr'  // ❌ OLD PACKAGE

// ❌ WRONG: Deprecated key name
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY  // ❌ DEPRECATED KEY NAME
)
```

### ENVIRONMENT VARIABLES:

```bash
# ✅ CORRECT (October 2025):
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SECRET_KEY=eyJhbGc...

# ❌ FORBIDDEN (Deprecated):
SUPABASE_ANON_KEY=eyJhbGc...  # ❌ DO NOT USE
```

### RULES:
- ✅ **ALWAYS** use `@supabase/supabase-js` package
- ✅ **ALWAYS** use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` environment variable
- ✅ **ALWAYS** use `SUPABASE_SECRET_KEY` for admin operations
- ✅ **NEVER** use `SUPABASE_ANON_KEY` (deprecated October 2025)
- ✅ **NEVER** use `@supabase/ssr` package (deprecated)

---

## ⚡ OCTOBER 2025 MIDDLEWARE PATTERN (MANDATORY)

### ✅ CORRECT PATTERN (Always use this):

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/trpc(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect()  // ✅ ONLY JWT verification
  }

  // ✅ NO database queries
  // ✅ NO role checking
  // ✅ NO company_id lookups
  // ✅ Keep it minimal and fast
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### ❌ FORBIDDEN (NEVER do this):

```typescript
// ❌ WRONG: Database queries in middleware
export default clerkMiddleware(async (auth, req) => {
  const { userId } = auth()

  // ❌ NO DATABASE QUERIES IN MIDDLEWARE
  const user = await db.query.users.findFirst({
    where: eq(users.clerk_id, userId)
  })

  // ❌ NO ROLE CHECKS IN MIDDLEWARE
  if (user.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }
})
```

### RULES:
- ✅ **ONLY** JWT verification in middleware
- ✅ **NEVER** database queries in middleware
- ✅ **NEVER** role checks in middleware (do in layouts/components)
- ✅ **ALWAYS** defer auth logic to tRPC context
- ✅ **ALWAYS** keep middleware <5ms execution time

---

## 🎯 PROFESSIONAL IMPLEMENTATION STANDARDS (MANDATORY)

### 1. NO Band-Aid Approaches

**Rules:**
- ✅ Production-grade code from day 1
- ✅ Complete features (not partial implementations)
- ✅ Proper database constraints and indexes
- ✅ Full RLS policies (not basic)
- ✅ Complete error handling
- ❌ NEVER use "TODO: fix later"
- ❌ NEVER skip validation "for now"

### 2. Type Safety: Proper TypeScript Throughout

**Rules:**
- ✅ **NEVER** use `any` type (use `unknown` if needed)
- ✅ **ALWAYS** use Zod for input validation
- ✅ **ALWAYS** use generated database types
- ✅ **ALWAYS** ensure end-to-end type safety
- ✅ **ALWAYS** use TypeScript strict mode

```typescript
// ✅ CORRECT:
import { z } from 'zod'
import type { Database } from '@/lib/database.types'

const input = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1).max(100),
})

type Input = z.infer<typeof input>
type Client = Database['public']['Tables']['clients']['Row']

// ❌ FORBIDDEN:
const input: any = { ... }
function doSomething(data: any): any { ... }
```

### 3. Error Handling: Comprehensive

**Rules:**
- ✅ **ALWAYS** use `TRPCError` with proper error codes
- ✅ **ALWAYS** provide user-friendly error messages
- ✅ **ALWAYS** handle all error paths (not just happy path)
- ✅ **NEVER** expose internal errors to users
- ✅ **ALWAYS** log errors with context

```typescript
// ✅ CORRECT:
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

// ❌ FORBIDDEN:
await supabase.from('clients').insert(data)  // ❌ No error handling
return { success: true }  // ❌ No validation
```

### 4. OAuth Security: Proper Token Handling

**Rules:**
- ✅ **ALWAYS** use Clerk for OAuth (not custom implementation)
- ✅ **ALWAYS** store tokens in HTTP-only cookies (NEVER localStorage)
- ✅ **ALWAYS** use SameSite cookies for CSRF protection
- ✅ **NEVER** expose tokens in client-side code
- ✅ **ALWAYS** use proper session expiry

```typescript
// ✅ CORRECT: Clerk handles everything
import { auth } from '@clerk/nextjs/server'
const { userId } = auth()  // ✅ Secure, HTTP-only cookies

// ❌ FORBIDDEN:
const token = localStorage.getItem('auth_token')  // ❌ NOT SECURE
const decoded = jwt.decode(token)  // ❌ Manual JWT handling
```

---

## 🚨 RED FLAGS - REJECT IMMEDIATELY

If you see ANY of these patterns, **REJECT the code**:

❌ Database queries in middleware
❌ `SUPABASE_ANON_KEY` environment variable
❌ `@supabase/ssr` package import
❌ `any` types without strong justification
❌ Missing error handling
❌ `localStorage` for auth tokens
❌ Manual JWT decoding
❌ Role checks outside tRPC context
❌ Band-aid code or "TODO: fix later"
❌ Missing type safety
❌ Database queries for auth data (role, company_id)

---

## 📋 PRE-COMMIT CHECKLIST

Before suggesting ANY code, verify:

- [ ] No database queries for auth (session claims only)
- [ ] Using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not anon)
- [ ] Using `@supabase/supabase-js` package (not ssr)
- [ ] Middleware is minimal (JWT only, no DB)
- [ ] No `any` types (full TypeScript safety)
- [ ] Comprehensive error handling (TRPCError)
- [ ] Production-grade code (no band-aids)
- [ ] Proper OAuth security (Clerk, HTTP-only cookies)

---

## 📚 REFERENCE DOCUMENTS

Always read these documents when working on WeddingFlow Pro:

1. **FINAL_ARCHITECTURE_AND_DEPLOYMENT_STRATEGY.md** - Architecture patterns
2. **2025-10-22_USER_FLOWS_COMPLETE.md** - User flow patterns
3. **2025-10-22_WEDDINGFLOW_PRO_COMPLETE_STATUS.md** - Current codebase state
4. **docs/implementnow/ARCHITECTURE_VERIFICATION_REPORT.md** - Verification standards

---

## ✅ COMMITMENT

**Claude: When you start a new session:**
1. Read this file FIRST
2. Apply these standards to EVERY code suggestion
3. Reject any code that violates these standards
4. Review existing code against these standards
5. Proactively catch violations

**These standards are:**
- 🔒 Non-negotiable
- 📌 Permanent
- ⚡ Mandatory
- 🎯 Production-grade only

---

**Last Updated:** October 23, 2025
**Version:** 1.0
**Status:** ACTIVE - Apply to all WeddingFlow Pro work
