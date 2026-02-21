import { useAuth } from '@/lib/auth-client';
import { type Permission, hasPermission, type Role } from './roles';

/**
 * Permission Hooks
 *
 * February 2026 - Fixed to use properly typed useAuth hook
 * instead of raw useSession with `as any` casts
 */

/**
 * Hook to check if the current user has a specific permission
 */
export function useCan(permission: Permission): boolean {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return false;

  const role = user.role as Role | null;
  if (!role) return false;

  return hasPermission(role, permission);
}

/**
 * Hook to check if the current user has any of the specified permissions
 */
export function useCanAny(permissions: Permission[]): boolean {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return false;

  const role = user.role as Role | null;
  if (!role) return false;

  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Hook to check if the current user has all of the specified permissions
 */
export function useCanAll(permissions: Permission[]): boolean {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return false;

  const role = user.role as Role | null;
  if (!role) return false;

  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Hook to get the current user's role
 */
export function useUserRole(): Role | null {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return null;

  return (user.role as Role) || null;
}

/**
 * Hook to check if current user is admin
 */
export function useIsAdmin(): boolean {
  const role = useUserRole();
  return role === 'super_admin' || role === 'company_admin';
}

/**
 * Hook to check if current user is super admin
 */
export function useIsSuperAdmin(): boolean {
  const role = useUserRole();
  return role === 'super_admin';
}
