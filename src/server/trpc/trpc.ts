import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Context } from './context';

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
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // userId is now guaranteed to be non-null
    },
  });
});

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
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  if (ctx.role !== 'company_admin' && ctx.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

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
export const superAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  if (ctx.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});
