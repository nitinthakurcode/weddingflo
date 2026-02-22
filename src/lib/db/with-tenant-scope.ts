/**
 * @module with-tenant-scope
 * @description Drizzle ORM wrapper that sets PostgreSQL session variables
 * for Row-Level Security (RLS) tenant isolation.
 *
 * Every database operation that touches tenant-scoped tables MUST go through
 * `withTenantScope()`. This sets `app.current_company_id` and `app.current_role`
 * as transaction-local variables that RLS policies read via `current_company_id()`.
 *
 * @example
 * ```typescript
 * // In a tRPC procedure:
 * getAll: protectedProcedure.query(async ({ ctx }) => {
 *   return ctx.withTenantScope(async (tx) => {
 *     // RLS automatically filters to ctx.companyId — even if you
 *     // forget the WHERE clause, the database blocks cross-tenant access.
 *     return tx.select().from(guests).where(eq(guests.clientId, clientId));
 *   });
 * });
 * ```
 *
 * @see migrations/0002_rls_helpers_and_denormalize.sql — creates the helper functions
 * @see migrations/0003_enable_rls_all_tables.sql — creates the RLS policies
 *
 * WeddingFlo Security Remediation — Phase 2.1
 */

import { sql, type SQL } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/** User roles from BetterAuth */
export type AppRole = 'super_admin' | 'company_admin' | 'staff' | 'client_user';

/** Context required to establish a tenant scope */
export interface TenantContext {
  /** The authenticated user's company ID (null for super_admin without company) */
  companyId: string | null;
  /** The authenticated user's role */
  role: AppRole;
  /** The authenticated user's ID (for audit logging within the transaction) */
  userId: string;
}

/**
 * Execute a callback within a tenant-scoped database transaction.
 *
 * Sets PostgreSQL session variables so RLS policies automatically filter
 * rows to the authenticated user's company. Uses `SET LOCAL` which scopes
 * the variable to the current transaction only — no risk of leaking between
 * concurrent requests.
 *
 * @param db - The Drizzle database instance
 * @param context - The authenticated user's tenant context
 * @param callback - Function to execute within the scoped transaction
 * @returns The return value of the callback
 *
 * @throws {Error} If companyId is null and role is not super_admin
 *   (non-super_admin users must have a company context)
 */
export async function withTenantScope<T>(
  db: PostgresJsDatabase<any>,
  context: TenantContext,
  callback: (tx: PgTransaction<any, any, any>) => Promise<T>,
): Promise<T> {
  // Validate: non-super_admin users MUST have a companyId
  if (!context.companyId && context.role !== 'super_admin') {
    throw new Error(
      `[withTenantScope] Non-super_admin user "${context.userId}" has no companyId. ` +
      `This is a security violation — every tenant-scoped operation requires a company context.`
    );
  }

  return db.transaction(async (tx) => {
    // SET LOCAL scopes the variable to this transaction only.
    // When the transaction commits or rolls back, the variable is automatically cleared.
    if (context.companyId) {
      await tx.execute(
        sql`SELECT set_config('app.current_company_id', ${context.companyId}, true)`
      );
    }

    await tx.execute(
      sql`SELECT set_config('app.current_role', ${context.role}, true)`
    );

    return callback(tx);
  });
}

/**
 * Create a tRPC context extension that provides `withTenantScope` as a method.
 *
 * Drop this into your `createTRPCContext` function to add the method
 * directly to the context object.
 *
 * @example
 * ```typescript
 * // src/server/trpc/context.ts
 * import { createTenantScopeMethod } from '@/lib/db/with-tenant-scope';
 *
 * export async function createTRPCContext({ req }: { req: Request }) {
 *   const session = await getServerSession(req);
 *   return {
 *     db,
 *     userId: session.userId,
 *     companyId: session.user.companyId,
 *     role: session.user.role,
 *     withTenantScope: createTenantScopeMethod(db, {
 *       companyId: session.user.companyId,
 *       role: session.user.role,
 *       userId: session.userId,
 *     }),
 *   };
 * }
 *
 * // Then in procedures:
 * .query(async ({ ctx }) => {
 *   return ctx.withTenantScope(async (tx) => {
 *     return tx.select().from(clients);
 *   });
 * });
 * ```
 */
export function createTenantScopeMethod(
  db: PostgresJsDatabase<any>,
  context: TenantContext,
) {
  return <T>(callback: (tx: PgTransaction<any, any, any>) => Promise<T>): Promise<T> => {
    return withTenantScope(db, context, callback);
  };
}

/**
 * Set tenant context WITHOUT a transaction wrapper.
 *
 * Use this ONLY for read-only operations where you need RLS filtering
 * but don't need transactional guarantees. The variable persists for the
 * entire database connection session, so you MUST call `clearTenantScope()`
 * afterward or the next request on the same connection will inherit the scope.
 *
 * ⚠️  PREFER `withTenantScope()` in most cases. This function exists only for
 *     edge cases like streaming queries where a transaction wrapper is impractical.
 *
 * @param db - The Drizzle database instance
 * @param context - The authenticated user's tenant context
 */
export async function setTenantScopeSession(
  db: PostgresJsDatabase<any>,
  context: TenantContext,
): Promise<void> {
  if (context.companyId) {
    await db.execute(
      sql`SELECT set_config('app.current_company_id', ${context.companyId}, false)`
    );
  }
  await db.execute(
    sql`SELECT set_config('app.current_role', ${context.role}, false)`
  );
}

/**
 * Clear tenant context from the current database session.
 * Call this after `setTenantScopeSession()` to prevent scope leaking.
 */
export async function clearTenantScope(
  db: PostgresJsDatabase<any>,
): Promise<void> {
  await db.execute(sql`RESET app.current_company_id`);
  await db.execute(sql`RESET app.current_role`);
}
