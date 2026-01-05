import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { users, companies, session } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { User, Company, UserWithCompany } from '@/lib/db/types';

// Re-export for convenience
export type { UserWithCompany };

/**
 * Gets the current user's role from BetterAuth session.
 *
 * @returns The user's role string or null if not authenticated or role not set
 */
export async function getCurrentUserRole(): Promise<string | null> {
  const { user } = await getServerSession();
  return user?.role || null;
}

/**
 * Checks if the current user is a super admin.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'super_admin';
}

/**
 * Checks if the current user is a company admin.
 */
export async function isCompanyAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'company_admin';
}

/**
 * Checks if the current user is staff.
 */
export async function isStaff(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'staff';
}

/**
 * Checks if the current user is a client user.
 */
export async function isClientUser(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'client_user';
}

/**
 * Requires the current user to have one of the allowed roles.
 * Redirects if unauthorized.
 */
export async function requireRole(allowedRoles: string[]): Promise<void> {
  const { userId } = await getServerSession();

  if (!userId) {
    redirect('/sign-in');
  }

  const role = await getCurrentUserRole();

  if (!role || !allowedRoles.includes(role)) {
    if (role === 'client_user') {
      redirect('/portal/dashboard');
    } else if (role === 'super_admin') {
      redirect('/superadmin/dashboard');
    } else {
      redirect('/dashboard');
    }
  }
}

/**
 * Gets the current user from database including their company data.
 * Uses Drizzle ORM directly.
 */
export async function getCurrentUserWithCompany(): Promise<UserWithCompany | null> {
  const { userId } = await getServerSession();

  if (!userId) {
    return null;
  }

  try {
    const result = await db
      .select()
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.authId, userId))
      .limit(1);

    if (!result.length) {
      return null;
    }

    const row = result[0];
    // Convert Drizzle camelCase to snake_case expected by UserWithCompany type
    return {
      ...row.users,
      company: row.companies,
    } as unknown as UserWithCompany;
  } catch (error) {
    console.error('Error fetching user with company:', error);
    return null;
  }
}

/**
 * Gets the current user's ID.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await getServerSession();
  return userId;
}

/**
 * Gets the current user's company ID.
 */
export async function getCurrentUserCompanyId(): Promise<string | null> {
  const { user } = await getServerSession();
  return user?.companyId || null;
}

/**
 * Checks if the current user has permission to access company resources.
 */
export async function canAccessCompanyResources(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'super_admin' || role === 'company_admin' || role === 'staff';
}

/**
 * Checks if the current user can manage staff members.
 */
export async function canManageStaff(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'super_admin' || role === 'company_admin';
}

/**
 * Checks if the current user can manage clients.
 */
export async function canManageClients(): Promise<boolean> {
  return await canAccessCompanyResources();
}

/**
 * Get full user record from database.
 * Cached to prevent multiple database calls within a single request.
 * Uses Drizzle ORM directly.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const { userId } = await getServerSession();

    if (!userId) {
      return null;
    }

    // Query by auth_id which stores the auth provider's user ID (BetterAuth)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.authId, userId))
      .limit(1);

    return (user as unknown as User) || null;
  } catch (error) {
    console.error('Unexpected error in getCurrentUser:', error);
    return null;
  }
});

/**
 * Get current user's company_id.
 * Fast path: Reads from session (no DB query needed with BetterAuth)
 */
export async function getCompanyId(): Promise<string | null> {
  try {
    const { user } = await getServerSession();
    return user?.companyId || null;
  } catch (error) {
    console.error('Error getting company ID:', error);
    return null;
  }
}

/**
 * Verify user has access to a specific company.
 * Critical security function for multi-tenant applications.
 */
export async function requireCompanyAccess(targetCompanyId: string): Promise<void> {
  const role = await getCurrentUserRole();
  if (role === 'super_admin') {
    return; // Super admins can access any company
  }

  const userCompanyId = await getCompanyId();

  if (!userCompanyId) {
    throw new Error('Unauthorized: User has no company association');
  }

  if (userCompanyId !== targetCompanyId) {
    throw new Error(
      `Unauthorized: User belongs to company ${userCompanyId}, ` +
      `but attempted to access company ${targetCompanyId}`
    );
  }
}

/**
 * Force refresh of user's session after role change.
 * With BetterAuth, sessions are stored in the database, so we can invalidate them directly.
 * Uses Drizzle ORM directly.
 */
export async function forceRefreshRole(userId: string): Promise<boolean> {
  try {
    // Delete all sessions for this user to force re-authentication
    // BetterAuth sessions are stored in 'session' table
    await db.delete(session).where(eq(session.userId, userId));

    return true;
  } catch (error) {
    console.error('Error refreshing user role:', error);
    return false;
  }
}
