/**
 * Build a faithful tRPC caller for audit tests so round-trip tests exercise the REAL
 * router cascade wiring (recalc/sync/broadcast), not just the lib parsers — testing the
 * parser alone would miss cascade drift, the exact false-green trap this audit kills.
 *
 * The app DB role is a superuser → bypasses RLS, so no app.current_* context is needed.
 * A `company_admin` ctx with a companyId passes staffProcedure without the staff-only
 * assertClientAccess detour.
 */
import { appRouter } from '@/server/trpc/routers/_app';
import { db } from '@/lib/db';
import type { Context } from '@/server/trpc/context';

export function buildCtx(o: { companyId: string; userId: string; role?: string }): Context {
  const role = o.role ?? 'company_admin';
  return {
    userId: o.userId,
    role,
    companyId: o.companyId,
    db,
    queries: {} as Record<string, unknown>,
    user: { id: o.userId, role, companyId: o.companyId },
    withTenantScope: undefined,
  } as unknown as Context;
}

export function makeCaller(ctx: Context) {
  return appRouter.createCaller(ctx);
}

export function callerFor(o: { companyId: string; userId: string; role?: string }) {
  return makeCaller(buildCtx(o));
}
