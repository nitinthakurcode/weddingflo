import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { Database } from '@/lib/database.types';

type User = Database["public"]["Tables"]["users"]["Row"];
type Company = Database["public"]["Tables"]["companies"]["Row"];

/**
 * User with company data
 */
export type UserWithCompany = User & {
  company: Company | null;
};

/**
 * Gets the current user's role from Clerk session claims.
 *
 * The role is stored in Clerk's session metadata and is synced via webhook
 * when users are created or updated.
 *
 * @returns The user's role string or null if not authenticated or role not set
 *
 * @example
 * ```tsx
 * const role = await getCurrentUserRole();
 * if (role === 'super_admin') {
 *   // Show admin features
 * }
 * ```
 */
export async function getCurrentUserRole(): Promise<string | null> {
  const { sessionClaims } = await auth();

  // Clerk stores custom metadata in publicMetadata
  const metadata = sessionClaims?.metadata as { role?: string } | undefined;
  const role = metadata?.role;

  return role || null;
}

/**
 * Checks if the current user is a super admin.
 *
 * Super admins have platform-wide access and can manage all companies.
 *
 * @returns True if the user has the super_admin role
 *
 * @example
 * ```tsx
 * const isSuperAdmin = await isSuperAdmin();
 * if (isSuperAdmin) {
 *   // Show platform management features
 * }
 * ```
 */
export async function isSuperAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'super_admin';
}

/**
 * Checks if the current user is a company admin.
 *
 * Company admins have full access to their company's data and can manage staff.
 *
 * @returns True if the user has the company_admin role
 *
 * @example
 * ```tsx
 * const isAdmin = await isCompanyAdmin();
 * if (isAdmin) {
 *   // Show company admin features
 * }
 * ```
 */
export async function isCompanyAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'company_admin';
}

/**
 * Checks if the current user is staff.
 *
 * Staff members have access to their company's data with limited permissions.
 *
 * @returns True if the user has the staff role
 *
 * @example
 * ```tsx
 * const isStaffMember = await isStaff();
 * if (isStaffMember) {
 *   // Show staff features
 * }
 * ```
 */
export async function isStaff(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'staff';
}

/**
 * Checks if the current user is a client user.
 *
 * Client users are wedding couples who have access to their own portal.
 *
 * @returns True if the user has the client_user role
 *
 * @example
 * ```tsx
 * const isClient = await isClientUser();
 * if (isClient) {
 *   // Show client portal features
 * }
 * ```
 */
export async function isClientUser(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'client_user';
}

/**
 * Requires the current user to have one of the allowed roles.
 *
 * If the user is not authenticated or doesn't have an allowed role,
 * they will be redirected to the appropriate dashboard or sign-in page.
 *
 * @param allowedRoles - Array of role strings that are allowed to access this resource
 * @throws Error if no user is authenticated
 *
 * @example
 * ```tsx
 * // In a server component or API route
 * export default async function AdminPage() {
 *   await requireRole(['super_admin', 'company_admin']);
 *   // User is guaranteed to have one of these roles here
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Require super admin only
 * await requireRole(['super_admin']);
 * ```
 */
export async function requireRole(allowedRoles: string[]): Promise<void> {
  const { userId } = await auth();

  // If no user, redirect to sign-in
  if (!userId) {
    redirect('/sign-in');
  }

  const role = await getCurrentUserRole();

  // If no role or role not in allowed list
  if (!role || !allowedRoles.includes(role)) {
    // Redirect based on user's actual role
    if (role === 'client_user') {
      redirect('/portal/dashboard');
    } else if (role === 'super_admin') {
      redirect('/superadmin/dashboard');
    } else {
      redirect('/dashboard');
    }
  }

  // User has an allowed role, continue
}

/**
 * Gets the current user from Supabase including their company data.
 *
 * This function fetches the full user record with company information joined.
 * Useful when you need both user and company data together.
 *
 * @returns User object with company data, or null if not found
 *
 * @example
 * ```tsx
 * const user = await getCurrentUserWithCompany();
 * if (user) {
 *   console.log(`${user.full_name} works for ${user.company?.name}`);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In a server component
 * export default async function CompanyDashboard() {
 *   const user = await getCurrentUserWithCompany();
 *
 *   if (!user) {
 *     return <div>Not authenticated</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>{user.company?.name}</h1>
 *       <p>Welcome, {user.full_name}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export async function getCurrentUserWithCompany(): Promise<UserWithCompany | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const supabase = createServerSupabaseClient();

  const { data: user, error } = await supabase
    .from('users')
    .select(`
      *,
      company:companies(*)
    `)
    .eq('clerk_id', userId)
    .maybeSingle();

  if (error || !user) {
    return null;
  }

  return user as UserWithCompany;
}

/**
 * Gets the current user's Clerk ID.
 *
 * @returns The Clerk user ID or null if not authenticated
 *
 * @example
 * ```tsx
 * const userId = await getCurrentUserId();
 * if (userId) {
 *   // User is authenticated
 * }
 * ```
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Gets the current user's company ID from Supabase.
 *
 * @returns The company ID or null if not found or not authenticated
 *
 * @example
 * ```tsx
 * const companyId = await getCurrentUserCompanyId();
 * if (companyId) {
 *   // Fetch company-specific data
 * }
 * ```
 */
export async function getCurrentUserCompanyId(): Promise<string | null> {
  const user = await getCurrentUserWithCompany();
  return user?.company_id || null;
}

/**
 * Checks if the current user has permission to access company resources.
 *
 * Super admins, company admins, and staff can access company resources.
 * Client users cannot.
 *
 * @returns True if user can access company resources
 *
 * @example
 * ```tsx
 * const canAccess = await canAccessCompanyResources();
 * if (canAccess) {
 *   // Show company dashboard
 * }
 * ```
 */
export async function canAccessCompanyResources(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'super_admin' || role === 'company_admin' || role === 'staff';
}

/**
 * Checks if the current user can manage staff members.
 *
 * Only super admins and company admins can manage staff.
 *
 * @returns True if user can manage staff
 *
 * @example
 * ```tsx
 * const canManage = await canManageStaff();
 * if (canManage) {
 *   // Show staff management UI
 * }
 * ```
 */
export async function canManageStaff(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'super_admin' || role === 'company_admin';
}

/**
 * Checks if the current user can manage clients.
 *
 * Super admins, company admins, and staff can manage clients.
 *
 * @returns True if user can manage clients
 *
 * @example
 * ```tsx
 * const canManage = await canManageClients();
 * if (canManage) {
 *   // Show client management UI
 * }
 * ```
 */
export async function canManageClients(): Promise<boolean> {
  return await canAccessCompanyResources();
}

// ============================================================================
// ENHANCED UTILITIES - Database Fallback & Security Helpers
// ============================================================================

/**
 * Get full user record from Supabase database.
 *
 * ⚠️ IMPORTANT: Use this ONLY when you need company_id or other user fields.
 * For role checking only, use getCurrentUserRole() instead (faster - reads from session claims).
 *
 * This function queries the database directly and is cached using React's cache()
 * to prevent multiple database calls within a single request.
 *
 * @returns Full user object from database or null if not found
 *
 * @example
 * ```tsx
 * // When you need company_id or full user data
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log('Company ID:', user.company_id);
 *   console.log('Email:', user.email);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // For role checking only, prefer this (faster):
 * const role = await getCurrentUserRole(); // ✅ Uses session claims
 *
 * // Not this:
 * const user = await getCurrentUser();
 * const role = user?.role; // ❌ Slower - queries database
 * ```
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    // Get userId from Clerk authentication
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

    // Query Supabase for full user record
    const supabase = createServerSupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user from database:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Unexpected error in getCurrentUser:', error);
    return null;
  }
});

/**
 * Get current user's company_id.
 *
 * Fast path: Reads from Clerk session claims metadata (if available)
 * Fallback: Queries Supabase database
 *
 * @returns The company ID or null if no user/company
 *
 * @example
 * ```tsx
 * // In a server component
 * const companyId = await getCompanyId();
 * if (companyId) {
 *   // Query company-scoped data
 *   const clients = await supabase
 *     .from('clients')
 *     .select('*')
 *     .eq('company_id', companyId);
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In an API route
 * export async function GET() {
 *   const companyId = await getCompanyId();
 *
 *   if (!companyId) {
 *     return Response.json({ error: 'No company found' }, { status: 400 });
 *   }
 *
 *   // Proceed with company-scoped logic
 * }
 * ```
 */
export async function getCompanyId(): Promise<string | null> {
  try {
    // Fast path: try session claims first
    const { sessionClaims } = await auth();
    const metadata = sessionClaims?.metadata as { company_id?: string } | undefined;

    if (metadata?.company_id) {
      return metadata.company_id;
    }

    // Fallback: query database
    const user = await getCurrentUser();
    return user?.company_id || null;
  } catch (error) {
    console.error('Error getting company ID:', error);
    return null;
  }
}

/**
 * Verify user has access to a specific company.
 *
 * This is a critical security function for multi-tenant applications.
 * Use it to prevent users from accessing data belonging to other companies.
 *
 * @param targetCompanyId - The company ID to verify access to
 * @throws Error if user is not authenticated or doesn't have access to the company
 *
 * @example
 * ```tsx
 * // In an API route handler
 * export async function GET(
 *   req: Request,
 *   { params }: { params: { companyId: string } }
 * ) {
 *   try {
 *     // Verify user belongs to this company
 *     await requireCompanyAccess(params.companyId);
 *
 *     // Safe to proceed - user has access to this company
 *     const data = await fetchCompanyData(params.companyId);
 *     return Response.json(data);
 *   } catch (error) {
 *     return Response.json(
 *       { error: 'Unauthorized access to company' },
 *       { status: 403 }
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * ```tsx
 * // When updating company data
 * export async function PATCH(
 *   req: Request,
 *   { params }: { params: { companyId: string } }
 * ) {
 *   // Prevent users from updating other companies' data
 *   await requireCompanyAccess(params.companyId);
 *
 *   // Now safe to update
 *   await updateCompanyData(params.companyId, await req.json());
 * }
 * ```
 */
export async function requireCompanyAccess(targetCompanyId: string): Promise<void> {
  // Super admins can access any company
  const role = await getCurrentUserRole();
  if (role === 'super_admin') {
    return; // Allow access
  }

  // Get user's company ID
  const userCompanyId = await getCompanyId();

  if (!userCompanyId) {
    throw new Error('Unauthorized: User has no company association');
  }

  // Verify company IDs match
  if (userCompanyId !== targetCompanyId) {
    throw new Error(
      `Unauthorized: User belongs to company ${userCompanyId}, ` +
      `but attempted to access company ${targetCompanyId}`
    );
  }
}

/**
 * Force refresh of user's session token after role change.
 *
 * Call this function after updating a user's role in the database (typically in a webhook)
 * to ensure their session reflects the new role immediately.
 *
 * This invalidates the user's current sessions, forcing them to get a new JWT
 * with updated role information on their next request.
 *
 * @param userId - The Clerk user ID whose session should be refreshed
 * @returns true if successful, false otherwise
 *
 * @example
 * ```tsx
 * // In a webhook handler after role update
 * export async function POST(req: Request) {
 *   const { userId, newRole } = await req.json();
 *
 *   // Update role in database
 *   await supabase
 *     .from('users')
 *     .update({ role: newRole })
 *     .eq('clerk_id', userId);
 *
 *   // Force session refresh so user gets new role immediately
 *   await forceRefreshRole(userId);
 *
 *   return Response.json({ success: true });
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In an admin panel when changing user roles
 * async function handleRoleChange(userId: string, newRole: string) {
 *   // Update in database
 *   await updateUserRole(userId, newRole);
 *
 *   // Force user to re-authenticate with new role
 *   await forceRefreshRole(userId);
 *
 *   console.log('User role updated and session refreshed');
 * }
 * ```
 */
export async function forceRefreshRole(userId: string): Promise<boolean> {
  try {
    const client = await clerkClient();

    // Get all user sessions
    const sessions = await client.sessions.getSessionList({ userId });

    // Revoke all sessions to force token refresh
    await Promise.all(
      sessions.data.map((session) =>
        client.sessions.revokeSession(session.id)
      )
    );

    return true;
  } catch (error) {
    console.error('Error refreshing user role:', error);
    return false;
  }
}

// ============================================================================
// USAGE GUIDE
// ============================================================================

/**
 * WHEN TO USE EACH FUNCTION:
 *
 * 🚀 Fast Role Checking (Session Claims):
 * - getCurrentUserRole() - Gets role from Clerk session metadata
 * - isSuperAdmin() - Checks if super_admin
 * - isCompanyAdmin() - Checks if company_admin
 * - isStaff() - Checks if staff
 * - isClientUser() - Checks if client_user
 * - canAccessCompanyResources() - Quick permission check
 * - canManageStaff() - Quick permission check
 * - canManageClients() - Quick permission check
 *
 * 📊 Database Queries (When You Need More Data):
 * - getCurrentUser() - Full user object (use when you need company_id, email, etc.)
 * - getCurrentUserWithCompany() - User + company data joined
 * - getCompanyId() - Fast path to company_id (tries session first, then DB)
 *
 * 🔒 Security & Authorization:
 * - requireRole() - Enforce role access with redirect
 * - requireCompanyAccess() - Multi-tenant security check
 *
 * 🔄 Admin Utilities:
 * - forceRefreshRole() - Refresh sessions after role changes
 *
 * ⚡ PERFORMANCE TIP:
 * Always prefer session claim functions (getCurrentUserRole, isSuperAdmin, etc.)
 * over database queries when you only need to check the role.
 *
 * Session claims are cached in the JWT and don't require a database query.
 * Database queries should only be used when you need additional user data.
 */
