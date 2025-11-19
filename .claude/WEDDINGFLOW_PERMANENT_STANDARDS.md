# 🎯 WEDDINGFLOW PRO - PERMANENT STANDARDS & CHECKLIST

**Last Updated:** October 23, 2025
**Version:** 2.0 (Consolidated from preflight + project standards)
**Status:** MANDATORY - Apply to EVERY code change
**Auto-Read:** This file is automatically referenced by `/standards` command

---

## 🚨 CRITICAL: READ THIS FIRST

**Before writing ANY code:**
1. Use the `/standards` command at the start of each session
2. Verify your request against all patterns below
3. Check for anti-patterns and red flags
4. Only proceed after verification passes

---

## ⚡ CORE ARCHITECTURAL PRINCIPLES

### 1. SESSION CLAIMS FOR AUTHENTICATION (NO DATABASE)

**Performance:** <5ms per request
**Pattern:** Pure Clerk session claims (October 2025 native)

#### ✅ CORRECT PATTERN:

```typescript
// In layouts, middleware, tRPC context
import { auth } from '@clerk/nextjs/server'

const { userId, sessionClaims } = await auth()

// ✅ Read from session claims (NO database query)
const role = sessionClaims?.metadata?.role
const companyId = sessionClaims?.metadata?.company_id
const subscriptionTier = sessionClaims?.metadata?.subscription_tier

// In tRPC context:
export const createTRPCContext = async () => {
  const { userId, sessionClaims } = await auth()

  return {
    userId,                                          // ✅ From auth()
    role: sessionClaims?.metadata?.role,            // ✅ Session claims
    companyId: sessionClaims?.metadata?.company_id, // ✅ Session claims
    subscriptionTier: sessionClaims?.metadata?.subscription_tier,
    supabase: createServerSupabaseClient(),
  }
}
```

#### ❌ FORBIDDEN PATTERNS:

```typescript
// ❌ WRONG: Database query for auth
const supabase = createServerSupabaseClient()
const { data: user } = await supabase
  .from('users')
  .select('role')
  .eq('clerk_id', userId)
  .single()
const role = user?.role  // ❌ 50-100ms database query!

// ❌ WRONG: Database query in middleware
export default clerkMiddleware(async (auth, req) => {
  const user = await db.query.users.findFirst(...)  // ❌ NO DB IN MIDDLEWARE
})

// ❌ WRONG: Helper function that queries database
const role = await getCurrentUserRole()  // ❌ If this queries DB, it's WRONG
```

#### RULES:
- ✅ **ALWAYS** use `sessionClaims.metadata.role` for role checks
- ✅ **ALWAYS** use `sessionClaims.metadata.company_id` for company ID
- ✅ **NEVER** query database for `role`, `company_id`, or auth data
- ✅ **ALWAYS** ensure <5ms auth performance
- ✅ **NEVER** add database queries to middleware or layouts for auth

---

### 2. OCTOBER 2025 SUPABASE API STANDARDS

**Critical:** Uses `@supabase/supabase-js` (NOT `@supabase/ssr`)

#### ✅ CORRECT PATTERN:

```typescript
import { createClient } from '@supabase/supabase-js'  // ✅ CORRECT PACKAGE

// Client-side or API routes:
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!  // ✅ October 2025 key
)

// Admin operations (server-side):
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!  // ✅ Secret key for admin
)
```

#### ✅ CORRECT SERVER CLIENT (DO NOT CHANGE):

```typescript
// src/lib/supabase/server.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'
import type { Database } from './types'

/**
 * CRITICAL: This function is SYNCHRONOUS (no async keyword).
 * The accessToken callback inside is async, but the function itself is not.
 */
export function createServerSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      async accessToken() {
        const { getToken } = await auth()
        const jwt = await getToken()  // ✅ Default Clerk JWT (no template)
        if (!jwt) throw new Error('Not authenticated')
        return jwt
      },
    }
  )
}

// ❌ WRONG: Making function async breaks 50+ files
// export async function createServerSupabaseClient() { ... }
```

#### ❌ FORBIDDEN PATTERNS:

```typescript
// ❌ WRONG: Deprecated package
import { createClient } from '@supabase/ssr'  // ❌ OLD PACKAGE

// ❌ WRONG: Deprecated key name
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY  // ❌ DEPRECATED
)

// ❌ WRONG: JWT template (doesn't exist)
async accessToken() {
  const jwt = await getToken({ template: 'supabase' })  // ❌ NO TEMPLATE
  return jwt
}

// ❌ WRONG: Making client function async
export async function createServerSupabaseClient() { ... }  // ❌ BREAKS 50+ FILES
```

#### ENVIRONMENT VARIABLES:

```bash
# ✅ CORRECT (October 2025):
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SECRET_KEY=eyJhbGc...

# ❌ FORBIDDEN (Deprecated):
SUPABASE_ANON_KEY=eyJhbGc...  # ❌ DO NOT USE
```

#### RULES:
- ✅ **ALWAYS** use `@supabase/supabase-js` package
- ✅ **ALWAYS** use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- ✅ **ALWAYS** use `SUPABASE_SECRET_KEY` for admin operations
- ✅ **NEVER** use `SUPABASE_ANON_KEY` (deprecated)
- ✅ **NEVER** use `@supabase/ssr` package
- ✅ **NEVER** use JWT templates (use default Clerk JWT)
- ✅ **NEVER** make `createServerSupabaseClient` async

---

### 3. MINIMAL MIDDLEWARE PATTERN (OCTOBER 2025)

**Rule:** Middleware handles ONLY JWT verification

#### ✅ CORRECT PATTERN:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/qr(.*)',
  '/check-in(.*)',
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
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

#### ❌ FORBIDDEN PATTERNS:

```typescript
// ❌ WRONG: Database queries in middleware
export default clerkMiddleware(async (auth, req) => {
  const { userId } = auth()
  const supabase = createServerSupabaseClient()  // ❌ NO!
  const user = await supabase.from('users')...   // ❌ SLOW!
})

// ❌ WRONG: Role checks in middleware
export default clerkMiddleware((auth, req) => {
  const { sessionClaims } = auth()
  if (sessionClaims?.metadata?.role !== 'admin') {  // ❌ Do in layout
    return NextResponse.redirect(...)
  }
})
```

#### RULES:
- ✅ **ONLY** JWT verification in middleware
- ✅ **NEVER** database queries in middleware
- ✅ **NEVER** role checks in middleware (do in layouts)
- ✅ **ALWAYS** keep middleware <5ms execution time
- ✅ **NEVER** create Supabase clients in middleware

**Why:** Middleware runs on EVERY request (images, CSS, fonts, API). Database queries = performance disaster + rate limits.

---

### 4. DUAL SYNC PATTERN (WEBHOOK)

**Rule:** ALWAYS update BOTH Supabase database AND Clerk metadata

#### ✅ CORRECT PATTERN:

```typescript
// src/app/api/webhooks/clerk/route.ts
if (evt.type === 'user.created') {
  const supabase = createServerSupabaseAdminClient()

  // 1. Create company
  const { data: company } = await supabase
    .from('companies')
    .insert({ name: `${first_name}'s Company`, subscription_tier: 'free' })
    .select()
    .single()

  // 2. Create user in Supabase (source of truth)
  await supabase.from('users').insert({
    clerk_id: id,
    email: email_addresses[0].email_address,
    role: 'company_admin',
    company_id: company.id,
    first_name,
    last_name,
  })

  // 3. ✅ CRITICAL: Update Clerk metadata for session claims
  const client = await clerkClient()
  await client.users.updateUserMetadata(id, {
    publicMetadata: {
      role: 'company_admin',
      company_id: company.id,
    },
  })
}
```

#### ❌ FORBIDDEN PATTERNS:

```typescript
// ❌ INCOMPLETE: Only updating Supabase
await supabase.from('users').insert({ role: 'admin' })
// ❌ Missing: Clerk metadata update!

// ❌ INCOMPLETE: Only updating Clerk
await client.users.updateUserMetadata(id, {
  publicMetadata: { role: 'admin' }
})
// ❌ Missing: Supabase update!
```

#### RULES:
- ✅ **ALWAYS** update Supabase database (source of truth)
- ✅ **ALWAYS** update Clerk metadata (session claims)
- ✅ **BOTH** must succeed for auth to work
- ✅ **NEVER** update only one (auth will break)

---

## 🎯 PROFESSIONAL IMPLEMENTATION STANDARDS

### 1. NO Band-Aid Approaches

#### RULES:
- ✅ Production-grade code from day 1
- ✅ Complete features (not partial implementations)
- ✅ Proper database constraints and indexes
- ✅ Full RLS policies (not basic)
- ✅ Complete error handling
- ❌ **NEVER** use "TODO: fix later"
- ❌ **NEVER** skip validation "for now"
- ❌ **NEVER** implement partial solutions

---

### 2. Type Safety: Proper TypeScript Throughout

#### ✅ CORRECT PATTERN:

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
type Client = Database['public']['Tables']['clients']['Row']

// tRPC procedure
export const clientsRouter = router({
  create: protectedProcedure
    .input(createClientInput)
    .mutation(async ({ ctx, input }) => {
      // Fully typed...
    }),
})
```

#### ❌ FORBIDDEN PATTERNS:

```typescript
// ❌ WRONG: No types
const input: any = { ... }
function doSomething(data: any): any { ... }

// ❌ WRONG: No validation
export const create = protectedProcedure
  .mutation(async ({ ctx, input }) => {  // ❌ No input schema
    await supabase.from('clients').insert(input)  // ❌ Unvalidated
  })
```

#### RULES:
- ✅ **NEVER** use `any` type (use `unknown` if truly needed)
- ✅ **ALWAYS** use Zod for input validation
- ✅ **ALWAYS** use generated database types
- ✅ **ALWAYS** ensure end-to-end type safety
- ✅ **ALWAYS** use TypeScript strict mode

---

### 3. Error Handling: Comprehensive

#### ✅ CORRECT PATTERN:

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

      // Check existence
      const { data: client } = await ctx.supabase
        .from('clients')
        .select('id')
        .eq('id', input.id)
        .eq('company_id', ctx.companyId)
        .single()

      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        })
      }

      // Delete
      const { error } = await ctx.supabase
        .from('clients')
        .delete()
        .eq('id', input.id)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete client',
          cause: error,
        })
      }

      return { success: true }
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

#### ❌ FORBIDDEN PATTERNS:

```typescript
// ❌ WRONG: No error handling
export const deleteClient = protectedProcedure
  .mutation(async ({ ctx, input }) => {
    await supabase.from('clients').delete().eq('id', input.id)  // ❌ No checks
    return { success: true }  // ❌ No validation
  })
```

#### RULES:
- ✅ **ALWAYS** use `TRPCError` with proper codes
- ✅ **ALWAYS** provide user-friendly error messages
- ✅ **ALWAYS** handle all error paths (not just happy path)
- ✅ **NEVER** expose internal errors to users
- ✅ **ALWAYS** log errors with context

---

### 4. OAuth Security: Proper Token Handling

#### ✅ CORRECT PATTERN:

```typescript
// ✅ Clerk handles everything securely
import { auth } from '@clerk/nextjs/server'

const { userId, sessionClaims } = await auth()  // ✅ HTTP-only cookies
```

#### ❌ FORBIDDEN PATTERNS:

```typescript
// ❌ WRONG: Manual token handling
const token = localStorage.getItem('auth_token')  // ❌ NOT SECURE
const decoded = jwt.decode(token)  // ❌ Manual JWT handling
```

#### RULES:
- ✅ **ALWAYS** use Clerk for OAuth (not custom implementation)
- ✅ **ALWAYS** store tokens in HTTP-only cookies (NEVER localStorage)
- ✅ **ALWAYS** use SameSite cookies for CSRF protection
- ✅ **NEVER** expose tokens in client-side code
- ✅ **ALWAYS** use proper session expiry (7 days)

---

## 📋 DATABASE OPERATIONS CHECKLIST

### Before ANY Database Code:

```
□ Read the relevant migration file in supabase/migrations/
□ Verify exact column names exist
□ Verify exact data types match
□ Check NOT NULL constraints
□ Check foreign key constraints
□ Use TablesInsert<'table'> or TablesUpdate<'table'> types
□ NO assumptions - only code what exists in migrations
```

#### ✅ CORRECT PATTERN:

```typescript
// 1. Read migration file first
// File: supabase/migrations/20251018000001_create_clients_table.sql
// Confirmed columns: partner1_first_name, partner1_email, wedding_date...

// 2. Code to match migration
import type { Database } from '@/lib/database.types'

type ClientInsert = Database['public']['Tables']['clients']['Insert']

const newClient: ClientInsert = {
  company_id: ctx.companyId!,
  partner1_first_name: input.partner1_first_name,
  partner1_email: input.partner1_email,
  wedding_date: input.wedding_date,
  // ✅ Only columns that exist in migration
}

await ctx.supabase.from('clients').insert(newClient)
```

#### ❌ FORBIDDEN PATTERNS:

```typescript
// ❌ WRONG: Assumptions about schema
await supabase.from('companies').insert({
  name: 'Acme',
  email: 'admin@acme.com'  // ❌ Does this column exist? Check migration!
})
```

#### RULES:
- ✅ **ALWAYS** read migration file BEFORE writing database code
- ✅ **NEVER** assume column names or types
- ✅ **ALWAYS** use generated TypeScript types
- ✅ **ALWAYS** check constraints (NOT NULL, UNIQUE, etc.)
- ✅ **USE** database for DATA operations, NOT for auth

---

## 🚨 RED FLAGS - STOP IMMEDIATELY

If you see ANY of these patterns, **REJECT the code**:

- ❌ Database queries in middleware
- ❌ Database queries for role/company_id in layouts
- ❌ Database queries for auth in tRPC context creation
- ❌ `SUPABASE_ANON_KEY` environment variable
- ❌ `@supabase/ssr` package import
- ❌ `any` types without strong justification
- ❌ Missing error handling
- ❌ `localStorage` for auth tokens
- ❌ Manual JWT decoding
- ❌ Role checks outside session claims
- ❌ Band-aid code or "TODO: fix later"
- ❌ Missing type safety
- ❌ Only updating Supabase OR Clerk (must update BOTH)
- ❌ JWT templates (use default Clerk JWT)
- ❌ Making `createServerSupabaseClient` async
- ❌ Helper functions that query database for auth

---

## 🎯 DECISION MATRIX

### Should I Modify This Working Code?

```
                    Is it broken?
                         │
                    ┌────┴────┐
                   NO        YES
                    │          │
            ┌───────┴─────┐    └─→ Fix it (incrementally)
            │             │
    Does user request   Is there a
    this change?        concrete problem?
            │             │
        ┌───┴───┐     ┌───┴───┐
       YES     NO    YES     NO
        │       │     │       │
        ↓       │     │       │
    Ask why   ──┴─────┴───────┘
    it's needed        │
        │              ↓
        ↓         LEAVE IT ALONE
    User confirms    (If it works,
    necessity?          don't touch)
        │
    ┌───┴───┐
   YES     NO
    │       │
    ↓       ↓
  Change  Don't change
```

---

## ✅ INCREMENTAL CHANGE PATTERN

**ALWAYS follow this pattern:**

```typescript
// Change 1: Update ONE file
// Test 1: npm run build → ✅ Pass

// Change 2: Update NEXT file
// Test 2: npm run build → ✅ Pass

// Change 3: Update FINAL file
// Test 3: npm run build → ✅ Pass → Test in browser → ✅ Works
```

#### RULES:
- ✅ **NEVER** batch 10+ file changes and test at the end
- ✅ **ALWAYS** test after EACH change
- ✅ **ALWAYS** run `npm run build` after each change
- ✅ **NEVER** assume multiple changes will work together

---

## 📊 VERIFICATION CHECKLIST

### After EVERY Code Change:

```bash
# 1. TypeScript build
npm run build
# ✅ Must show: "Compiled successfully"

# 2. Linter check
npm run lint
# ⚠️ Warnings OK, errors NOT OK

# 3. Test authentication flow
# - Sign out completely
# - Sign in fresh
# - Dashboard loads with session claims
# - Check DevTools: sessionClaims has role + company_id
```

### Functional Verification:

```
□ Can still sign in?
□ Dashboard still loads?
□ Session claims working (check DevTools cookies)?
□ tRPC queries working?
□ No console errors?
□ Feature I just added works?
□ Performance: Auth checks <10ms?
```

---

## 🎬 SESSION START RITUAL

**At the START of EVERY session:**

```bash
# 1. Verify authentication works
# - Sign in at localhost:3000/sign-in
# - Dashboard loads
# - Check DevTools: sessionClaims has role + company_id

# 2. Verify build is clean
npm run build
# Must show: Compiled successfully

# 3. Check git status
git status
# Should be clean (or only expected changes)
```

**If ANY fail → Fix that FIRST before new work!**

---

## 📦 CRITICAL PACKAGES (DO NOT CHANGE)

### ✅ CORRECT:

```json
{
  "@supabase/supabase-js": "^2.75.0",
  "@clerk/nextjs": "^6.0.0"
}
```

### ❌ NEVER INSTALL:

```json
{
  "@supabase/ssr": "..."  // ❌ WRONG PACKAGE
}
```

**Why:** We use Clerk for auth (JWT-based), NOT Supabase Auth (cookie-based). The SSR package is for Supabase's own authentication system.

---

## 📞 EMERGENCY CONTACTS (When Things Break)

### Authentication Broke?

1. **Check session claims:**
   - DevTools → Application → Cookies
   - Look for `__session` cookie
   - Verify JWT contains metadata.role and metadata.company_id

2. **Check webhook:**
   - Verify webhook is updating Clerk metadata
   - Check logs for: "Updated Clerk metadata with role: ..."

3. **Force token refresh:**
   - Sign out completely
   - Sign in again
   - New JWT should have metadata

4. **Check layouts:**
   - Verify using `sessionClaims?.metadata?.role`
   - NOT using database queries

5. **Verify Supabase client:**
   - Check `src/lib/supabase/server.ts`
   - Must use `@supabase/supabase-js`
   - Must use `accessToken()` callback
   - Must fetch default JWT (no template)

6. **Check packages:**
   ```bash
   npm list @supabase/supabase-js  # Should show v2.75.0
   npm list @supabase/ssr          # Should show NOT FOUND
   ```

### Database Errors?

1. Read: Migration file for that table
2. Check: Column exists in migration
3. Check: Data type matches
4. Check: NOT NULL constraints satisfied

### TypeScript Errors After Change?

1. **Revert:** The change you just made
2. **Build:** Should work again
3. **Understand:** Why the change broke it
4. **Fix:** The root cause, not the symptom

---

## 🎓 THE GOLDEN RULES (MEMORIZE THESE)

1. **Session claims for auth** (NO database queries)
2. **Database for data** (user profiles, company info, etc.)
3. **Webhook syncs BOTH** (Supabase + Clerk metadata)
4. **One change → test → next** (never batch)
5. **Read migrations before database code** (no assumptions)
6. **If it works, don't touch it** (unless broken or requested)
7. **October 2025 APIs only** (no deprecated patterns)

---

## 📚 REFERENCE DOCUMENTS

**Always read these when working on WeddingFlow Pro:**

1. **docs/FINAL_ARCHITECTURE_AND_DEPLOYMENT_STRATEGY.md** - Architecture patterns
2. **docs/2025-10-22_USER_FLOWS_COMPLETE.md** - User flow patterns
3. **docs/2025-10-22_WEDDINGFLOW_PRO_COMPLETE_STATUS.md** - Current codebase state
4. **docs/implementnow/ARCHITECTURE_VERIFICATION_REPORT.md** - Verification standards
5. **docs/SUPABASE_CLERK_WORKING_MODEL.md** - Complete Supabase + Clerk integration
6. **docs/SESSION_19_COMPLETION_SUMMARY.md** - Historical context (what went wrong)

---

## ✅ PRE-COMMIT CHECKLIST

Before suggesting ANY code, verify:

- [ ] No database queries for auth (session claims only)
- [ ] Using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not anon)
- [ ] Using `@supabase/supabase-js` package (not ssr)
- [ ] Middleware is minimal (JWT only, no DB)
- [ ] No `any` types (full TypeScript safety)
- [ ] Comprehensive error handling (TRPCError)
- [ ] Production-grade code (no band-aids)
- [ ] Proper OAuth security (Clerk, HTTP-only cookies)
- [ ] Read migration files before database code
- [ ] One change at a time (incremental testing)

---

## 🚀 PERFORMANCE TARGETS

**Authentication:**
- Middleware: <1ms (JWT verification only)
- Layout check: <5ms (session claims read)
- tRPC context: <5ms (session claims read)
- **Total auth overhead: <10ms per request**

**vs Database Queries:**
- Database auth check: 50-100ms
- **Session claims: 10-20x faster**

---

## 🎓 KEY LEARNINGS FROM HISTORY

### Session 19 Disaster (October 18, 2025)

**What Went Wrong:**
- Changed `createServerSupabaseClient()` to use JWT templates → broke auth
- Switched to `@supabase/ssr` package → wrong auth pattern
- Made function async → broke 50+ files
- Batch changed multiple files → hard to isolate errors
- **Result:** Put project back 2-3 days

**The Fix:**
- Restored EXACT working implementation
- Used `accessToken()` callback with default JWT (no template)
- Kept function synchronous
- Used `@supabase/supabase-js` (not SSR)
- Incremental changes with testing

**The Lesson:**
- **If it works, don't touch it**
- Read documentation before modifying
- One change at a time
- Test after every change
- Verify schema before database code

---

## ✅ CURRENT IMPLEMENTATION (October 2025)

**Status:** ✅ WORKING - Pure Session Claims Architecture

**What's Working:**
- Authentication via session claims (<5ms)
- No database queries for auth checks
- tRPC with session claims context
- Webhook dual sync (Supabase + Clerk)
- All layouts using session claims
- Build passes with 0 errors
- User tested: Login and signup work perfectly

**Performance:**
- Before: 50-100ms per auth check (database query)
- After: <5ms per auth check (session claims)
- **10-20x faster authentication**

---

## 📖 CONTINUOUS IMPROVEMENT

**During implementation:**

```bash
# Every 3-5 changes:
npm run build

# Before committing:
npm run build && npm run lint

# Before deploying:
npm run build && npm run lint && npm test
```

---

**END OF PERMANENT STANDARDS - USE `/standards` COMMAND TO REFERENCE THIS FILE**
