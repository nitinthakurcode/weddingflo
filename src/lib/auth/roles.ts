import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { User, Company } from '@/lib/supabase/types';

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
