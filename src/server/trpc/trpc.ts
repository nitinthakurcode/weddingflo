import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Context } from './context';
import { assertClientAccess, clientIdFromInput } from './client-access';
import { applyTenantScope } from '@/lib/db/with-tenant-scope';

/**
 * Initialize tRPC with context and superjson transformer.
 *
 * Superjson allows us to serialize complex types like Date, Map, Set, etc.
 * that standard JSON.stringify cannot handle.
 *
 * Error formatter provides better error messages for Zod validation errors.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export tRPC router and base procedure.
 *
 * @example
 * ```ts
 * export const appRouter = router({
 *   users: userRouter,
 *   companies: companyRouter,
 * })
 * ```
 */
export const router = t.router;

/**
 * Tenant-scope middleware — RLS context injection (audit phase 6B.2).
 *
 * Wraps the procedure call in a short-lived transaction and sets the
 * `app.current_company_id` / `app.current_role` PostgreSQL GUCs (via the shared
 * {@link applyTenantScope} helper from `with-tenant-scope.ts`), then rebinds
 * `ctx.db` to that transaction. Every existing `ctx.db.*` call therefore runs
 * inside the scoped txn transparently — ZERO router edits. Procedures that open
 * their own `ctx.db.transaction()` simply nest (drizzle SAVEPOINTs).
 *
 * INERT until 6B.3: the app/CI still connect as a superuser, which BYPASSES RLS
 * entirely, so today this only changes plumbing (GUC set + one txn per
 * query/mutation), not row visibility. It is composed only into the authenticated
 * builders below; public/unauthenticated procedures get no scope. Onboarding
 * (companyId null) leaves `current_company_id()` NULL, so the `user` table's
 * `OR company_id IS NULL` onboarding policy keeps working. `ctx.role` is always
 * propagated so `is_super_admin()` resolves under future enforcement.
 *
 * SUBSCRIPTIONS are skipped: a subscription resolver returns a long-lived async
 * generator that tRPC iterates AFTER `next()` resolves, so wrapping it here would
 * commit the txn at generator-creation and leave any in-stream `ctx.db` query on
 * a finalized transaction. Subscriptions must scope explicitly (e.g.
 * `ctx.withTenantScope`) per yielded batch in 6B.3 — not via this per-call txn.
 *
 * NOTE: this is a tRPC procedure middleware (the same `t.procedure.use()` seam
 * the auth builders below already use) — NOT Next.js middleware/proxy. CLAUDE
 * rule 15 / CVE-2025-29927 are about `proxy.ts`, which is untouched.
 */
const tenantScopedMiddleware = t.middleware(async ({ ctx, next, type }) => {
  // Skip subscriptions (long-lived generators — see above) and, defensively,
  // unauthenticated callers (the auth checks below run first and guarantee
  // userId on every builder this is composed into).
  if (type === 'subscription' || !ctx.userId) {
    return next();
  }
  return ctx.db.transaction(async (tx) => {
    await applyTenantScope(tx, { companyId: ctx.companyId, role: ctx.role });
    // Cast keeps ctx.db's declared type (PostgresJsDatabase) so the 600+
    // downstream `ctx.db.*` call sites need no type changes. At runtime the
    // transaction is a drop-in for every query method (PgTransaction extends
    // PgDatabase); the only gap is the `$client` raw-handle prop, which no
    // resolver touches via ctx.db — hence the through-`unknown` cast.
    return next({ ctx: { ...ctx, db: tx as unknown as typeof ctx.db } });
  });
});

/**
 * Public procedure - no authentication required.
 *
 * Use this for public endpoints like health checks or public data.
 *
 * @example
 * ```ts
 * export const publicRouter = router({
 *   health: publicProcedure.query(() => ({ status: 'ok' })),
 * })
 * ```
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication.
 *
 * Ensures the user is signed in via BetterAuth.
 * Throws UNAUTHORIZED if no userId is present.
 *
 * @example
 * ```ts
 * export const userRouter = router({
 *   getProfile: protectedProcedure.query(async ({ ctx }) => {
 *     // ctx.userId is guaranteed to exist here
 *     const [user] = await ctx.db
 *       .select()
 *       .from(users)
 *       .where(eq(users.authId, ctx.userId))
 *       .limit(1);
 *     return user;
 *   }),
 * })
 * ```
 */
export const protectedProcedure = t.procedure
  .use(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
      ctx: {
        ...ctx,
        userId: ctx.userId, // userId is now guaranteed to be non-null
      },
    });
  })
  .use(tenantScopedMiddleware);

/**
 * Admin procedure - requires company_admin or super_admin role.
 *
 * Ensures the user is authenticated AND has admin privileges.
 * Throws UNAUTHORIZED if not signed in.
 * Throws FORBIDDEN if user is not an admin.
 *
 * @example
 * ```ts
 * export const companyRouter = router({
 *   updateSettings: adminProcedure
 *     .input(z.object({ theme: z.string() }))
 *     .mutation(async ({ ctx, input }) => {
 *       // User is guaranteed to be company_admin or super_admin
 *       const [company] = await ctx.db
 *         .update(companies)
 *         .set({ settings: input })
 *         .where(eq(companies.id, ctx.companyId))
 *         .returning();
 *       return company;
 *     }),
 * })
 * ```
 */
export const adminProcedure = t.procedure
  .use(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    if (ctx.role !== 'company_admin' && ctx.role !== 'super_admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next({ ctx });
  })
  .use(tenantScopedMiddleware);

/**
 * Staff procedure - client-scoped access for company_admin, super_admin, AND staff.
 *
 * Use this (instead of adminProcedure) on procedures that operate on a single
 * client's data (guests, budget, vendors, events, timeline, hotels, transport,
 * gifts, documents, floor plans, etc.). It:
 *  - allows company_admin / super_admin / staff (rejects client_user + others)
 *  - requires a company context (except super_admin)
 *  - for STAFF, auto-verifies access when the input carries a top-level
 *    `clientId` (the common case) via assertClientAccess
 *  - exposes `ctx.assertClientAccess(clientId)` so resolvers that DERIVE the
 *    clientId from an entity id can authorize after loading it
 *
 * Fail-closed: a staff request whose clientId can't be verified here MUST be
 * authorized by the resolver calling ctx.assertClientAccess(...).
 *
 * @example
 * ```ts
 * getById: staffProcedure
 *   .input(z.object({ id: z.string() }))
 *   .query(async ({ ctx, input }) => {
 *     const [row] = await ctx.db.select(...).from(guests)... // loads clientId
 *     await ctx.assertClientAccess(row.clientId) // derived-id authorization
 *     return row
 *   })
 * ```
 */
export const staffProcedure = t.procedure
  .use(async ({ ctx, next, getRawInput }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    if (
      ctx.role !== 'company_admin' &&
      ctx.role !== 'super_admin' &&
      ctx.role !== 'staff'
    ) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    if (!ctx.companyId && ctx.role !== 'super_admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'No company context' });
    }

    // Per-request asserter bound to this ctx, for derived-clientId resolvers.
    const boundAssertClientAccess = (clientId: string | null | undefined) =>
      assertClientAccess(ctx, clientId);

    // Auto-authorize the common direct-`clientId` input case for staff.
    if (ctx.role === 'staff') {
      const clientId = clientIdFromInput(await getRawInput());
      if (clientId) {
        await boundAssertClientAccess(clientId);
      }
    }

    return next({ ctx: { ...ctx, assertClientAccess: boundAssertClientAccess } });
  })
  .use(tenantScopedMiddleware);

/**
 * Super admin procedure - requires super_admin role.
 *
 * Ensures the user is authenticated AND has super admin privileges.
 * Throws UNAUTHORIZED if not signed in.
 * Throws FORBIDDEN if user is not a super admin.
 *
 * Used for platform-wide operations like managing all companies.
 *
 * @example
 * ```ts
 * export const platformRouter = router({
 *   getAllCompanies: superAdminProcedure.query(async ({ ctx }) => {
 *     // User is guaranteed to be super_admin
 *     const allCompanies = await ctx.db
 *       .select()
 *       .from(companies);
 *     return allCompanies;
 *   }),
 * })
 * ```
 */
export const superAdminProcedure = t.procedure
  .use(async ({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    if (ctx.role !== 'super_admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next({ ctx });
  })
  .use(tenantScopedMiddleware);

/**
 * Security Note - February 2026
 *
 * tRPC security is handled at multiple layers:
 *
 * 1. Authentication: BetterAuth (cookie-based sessions, automatic CSRF via trustedOrigins)
 * 2. Rate Limiting: Cloudflare WAF (external, before hitting the app)
 * 3. DDoS Protection: Cloudflare + Traefik middleware
 * 4. Multi-tenant Isolation: companyId checks in each router
 *
 * Auth rate limiting for sign-in/sign-up/password-reset is handled separately
 * in src/lib/auth/rate-limiter.ts (PostgreSQL-based).
 *
 * The middleware files in ./middleware/ are available for future use if needed
 * but are not applied to avoid complexity and potential performance overhead.
 */
