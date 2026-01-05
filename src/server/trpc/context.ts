import { getServerSession } from '@/lib/auth/server';
import { db, eq } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema/auth';
import * as dbQueries from '@/lib/db/queries';
import type { Roles } from '@/types/globals';
import type { inferAsyncReturnType } from '@trpc/server';

/**
 * Creates the tRPC context for each request.
 *
 * December 2025 - Drizzle ORM Only (Supabase Removed)
 *
 * This context provides:
 * - userId: BetterAuth user ID (null if not authenticated)
 * - role: User role from session
 * - companyId: Company ID from user profile
 * - db: Drizzle database client (Hetzner PostgreSQL)
 * - queries: Pre-built database query functions
 *
 * Note: Supabase has been removed. All database operations
 * now use Drizzle ORM against Hetzner PostgreSQL.
 */
export async function createTRPCContext() {
  // Get session from BetterAuth
  const { userId, user } = await getServerSession();

  // Extract role and companyId from user
  let role = (user?.role || null) as Roles | null;
  let companyId = user?.companyId || null;

  // If session is missing role/companyId, check database directly
  // This handles stale session cache after sync
  if (userId && (!role || !companyId)) {
    try {
      const [dbUser] = await db
        .select({ role: userTable.role, companyId: userTable.companyId })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      if (dbUser) {
        role = (dbUser.role as Roles) || role;
        companyId = dbUser.companyId || companyId;
      }
    } catch (error) {
      console.error('[tRPC Context] DB lookup error:', error);
    }
  }

  // Default to company_admin if still no role
  const finalRole = (role || 'company_admin') as Roles;

  return {
    userId,
    role: finalRole,
    companyId,
    db,
    queries: dbQueries,
    user,
  };
}

export type Context = inferAsyncReturnType<typeof createTRPCContext>;
