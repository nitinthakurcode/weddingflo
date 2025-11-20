# CLAUDE.md - Mandatory Pre-Edit Instructions

**STOP! Before making ANY code changes, you MUST:**

1. Read `.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md`
2. Verify your changes against November 2025 patterns
3. Follow the patterns below - NO EXCEPTIONS

---

## Quick Reference: November 2025 Patterns

### Supabase API (MANDATORY)
```typescript
// ✅ CORRECT
import { createClient } from '@supabase/supabase-js'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  // NOT anon_key

// ❌ FORBIDDEN
import { createClient } from '@supabase/ssr'  // WRONG PACKAGE
process.env.SUPABASE_ANON_KEY  // DEPRECATED
```

### Authentication (MANDATORY)
```typescript
// ✅ CORRECT - Session claims only (<5ms)
const { sessionClaims } = await auth()
const role = sessionClaims?.metadata?.role
const companyId = sessionClaims?.metadata?.company_id

// ❌ FORBIDDEN - Database queries for auth
const user = await supabase.from('users').select('role')  // SLOW!
```

### API Routes (MANDATORY)
```typescript
// ✅ CORRECT - Create client inside handler
export async function GET() {
  const supabase = createClient(...)  // Inside handler
}

// ❌ FORBIDDEN - Module-level client
const supabase = createClient(...)  // Outside handler - breaks build
export async function GET() { ... }
```

### Middleware (MANDATORY)
```typescript
// ✅ CORRECT - i18n only, no auth
export default clerkMiddleware((auth, req) => {
  return handleI18nRouting(req)  // NO auth.protect()
})

// ❌ FORBIDDEN - Auth in middleware
export default clerkMiddleware((auth, req) => {
  auth().protect()  // Causes redirect loops with next-intl
})
```

---

## Before Every Edit

Ask yourself:
1. Am I creating Supabase clients inside handlers? (not module level)
2. Am I using PUBLISHABLE_KEY? (not ANON_KEY)
3. Am I using session claims for auth? (not database queries)
4. Am I keeping middleware minimal? (i18n only)

If NO to any → Read the full standards document first.

---

## Full Documentation

- `.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md` - Complete standards
- `.claude/PROJECT_STANDARDS.md` - Project-specific rules
- `NOVEMBER_2025_FINAL_ASSESSMENT.md` - Architecture verification

**Use `/standards` command to load full context.**
