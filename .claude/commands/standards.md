---
description: Load WeddingFlo permanent standards and architecture patterns
---

**LOADING WEDDINGFLOW PRO PERMANENT STANDARDS...**

You MUST read and apply the following file before proceeding:

📖 **Reading:** `.claude/WEDDINGFLOW_PERMANENT_STANDARDS.md`

This file contains:
- ✅ Session claims architecture (NO database for auth)
- ✅ October 2025 Supabase API standards
- ✅ Minimal middleware pattern
- ✅ Professional implementation standards
- ✅ Database operations checklist
- ✅ Red flags and anti-patterns
- ✅ Decision matrix for code changes
- ✅ Emergency troubleshooting
- ✅ Historical lessons (what went wrong)

**CRITICAL RULES:**
1. Use session claims for auth (NO database queries)
2. Use `@supabase/supabase-js` (NOT `@supabase/ssr`)
3. Middleware: JWT verification ONLY (no database)
4. Webhook: Update BOTH Supabase AND Clerk metadata
5. One change → test → next (never batch)
6. Read migrations before database code
7. If it works, don't touch it

**After reading, confirm:**
- ✅ I understand the session claims architecture
- ✅ I will NOT use database queries for auth
- ✅ I will use October 2025 API standards
- ✅ I will test incrementally after each change
- ✅ I will read migration files before database code

**Then proceed with the user's request.**
