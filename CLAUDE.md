# CLAUDE.md - Mandatory Pre-Edit Instructions

**STOP! Before making ANY code changes, you MUST:**

1. Read `.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md`
2. Verify your changes against December 2025 patterns
3. Follow the patterns below - NO EXCEPTIONS

---

## Quick Reference: December 2025 Patterns

### Authentication - BetterAuth (MANDATORY)
```typescript
// ✅ CORRECT - Server-side session (cookie-based, fast)
import { getServerSession } from '@/lib/auth/server'
const { userId, user } = await getServerSession()
const role = user?.role
const companyId = user?.companyId

// ✅ CORRECT - Client-side hooks
import { useAuth } from '@/lib/auth-client'
const { user, isAuthenticated, isLoading } = useAuth()

// ❌ FORBIDDEN - Old Clerk patterns
import { auth } from '@clerk/nextjs/server'  // REMOVED
const { sessionClaims } = await auth()  // REMOVED
```

### Supabase API (MANDATORY)
```typescript
// ✅ CORRECT
import { createClient } from '@supabase/supabase-js'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  // NOT anon_key

// ❌ FORBIDDEN
import { createClient } from '@supabase/ssr'  // WRONG PACKAGE
process.env.SUPABASE_ANON_KEY  // DEPRECATED
```

### API Routes (MANDATORY)
```typescript
// ✅ CORRECT - Get session inside handler
export async function GET() {
  const { userId, user } = await getServerSession()
  if (!userId) return new Response('Unauthorized', { status: 401 })
  // ... rest of handler
}

// ❌ FORBIDDEN - Module-level auth calls
const session = await getServerSession()  // Outside handler - breaks build
export async function GET() { ... }
```

### Proxy (MANDATORY - Next.js 16+)
```typescript
// ✅ CORRECT - proxy.ts (renamed from middleware.ts in Next.js 16)
// i18n only, no auth - runs on Node.js runtime
export function proxy(request: NextRequest): NextResponse | Response {
  // Skip API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }
  // Only handle i18n routing
  return handleI18nRouting(request)
}
export default proxy

// ❌ FORBIDDEN - Auth in proxy
export function proxy(req) {
  const session = await auth.api.getSession(...)  // Causes redirect loops
}

// ❌ FORBIDDEN - Old middleware.ts (deprecated in Next.js 16)
export default function middleware(req) { ... }
```

### Sign In/Out (MANDATORY)
```typescript
// ✅ CORRECT - Client-side sign in
import { signInWithEmail, signInWithGoogle } from '@/lib/auth-client'
await signInWithEmail(email, password)
await signInWithGoogle()

// ✅ CORRECT - Client-side sign out
import { signOutAndRedirect } from '@/lib/auth-client'
await signOutAndRedirect('/sign-in')
```

---

## Before Every Edit

Ask yourself:
1. Am I using `getServerSession()` from `@/lib/auth/server` for server-side auth?
2. Am I using `useAuth()` from `@/lib/auth-client` for client-side auth?
3. Am I using `proxy.ts` (NOT middleware.ts) for i18n routing? (Next.js 16+)
4. Am I handling auth at the page/layout level, not proxy?

If NO to any → Read the full standards document first.

---

## Full Documentation

- `.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md` - Complete standards
- `.claude/PROJECT_STANDARDS.md` - Project-specific rules
- `NOVEMBER_2025_FINAL_ASSESSMENT.md` - Architecture verification

**Use `/standards` command to load full context.**
