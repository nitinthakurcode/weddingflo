/**
 * BetterAuth User Types
 *
 * February 2026 - Proper TypeScript interfaces for BetterAuth user with custom fields
 *
 * These types eliminate the need for `as any` casts throughout the codebase
 * and provide compile-time safety for user properties.
 */

/**
 * User roles in WeddingFlo
 * Matches the database role column values
 */
export type UserRole = 'super_admin' | 'company_admin' | 'staff' | 'client_user';

/**
 * BetterAuth session object
 */
export interface BetterAuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * BetterAuth user with custom WeddingFlo fields
 * This interface represents the full user object returned from BetterAuth session
 */
export interface BetterAuthUser {
  // Core BetterAuth fields
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Custom WeddingFlo fields (defined in auth.ts additionalFields)
  role: UserRole | null;
  companyId: string | null;
  onboardingCompleted: boolean;
  firstName: string | null;
  lastName: string | null;

  // Optional security fields
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
  twoFactorEnabled?: boolean;
}

/**
 * Return type for getServerSession()
 */
export interface ServerSessionResult {
  userId: string | null;
  user: BetterAuthUser | null;
  session: BetterAuthSession | null;
}

/**
 * Authenticated session result (for when we know user is logged in)
 */
export interface AuthenticatedSession {
  userId: string;
  user: BetterAuthUser;
  session: BetterAuthSession;
}

/**
 * Type guard to check if session is authenticated
 */
export function isAuthenticated(
  result: ServerSessionResult
): result is AuthenticatedSession {
  return result.userId !== null && result.user !== null;
}

/**
 * Type guard to check if user has super_admin role
 */
export function isSuperAdmin(user: BetterAuthUser | null): boolean {
  return user?.role === 'super_admin';
}

/**
 * Type guard to check if user has company_admin role
 */
export function isCompanyAdmin(user: BetterAuthUser | null): boolean {
  return user?.role === 'company_admin';
}

/**
 * Type guard to check if user has staff role
 */
export function isStaff(user: BetterAuthUser | null): boolean {
  return user?.role === 'staff';
}

/**
 * Type guard to check if user has client_user role
 */
export function isClientUser(user: BetterAuthUser | null): boolean {
  return user?.role === 'client_user';
}

/**
 * Type guard to check if user has admin access (super_admin or company_admin)
 */
export function hasAdminAccess(user: BetterAuthUser | null): boolean {
  return user?.role === 'super_admin' || user?.role === 'company_admin';
}

/**
 * Type guard to check if user has dashboard access (super_admin, company_admin, or staff)
 */
export function hasDashboardAccess(user: BetterAuthUser | null): boolean {
  return (
    user?.role === 'super_admin' ||
    user?.role === 'company_admin' ||
    user?.role === 'staff'
  );
}

/**
 * Type guard to check if user has company context
 */
export function hasCompanyContext(user: BetterAuthUser | null): boolean {
  return user?.companyId !== null && user?.companyId !== undefined;
}
