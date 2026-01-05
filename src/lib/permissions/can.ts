import { useSession } from '@/lib/auth-client';
import { type Permission, hasPermission, type Role } from './roles';

/**
 * Hook to check if the current user has a specific permission
 */
export function useCan(permission: Permission): boolean {
  const { data: session, isPending } = useSession();

  if (isPending || !session?.user) return false;

  const role = (session.user as any).role as Role | undefined;
  if (!role) return false;

  return hasPermission(role, permission);
}

/**
 * Hook to check if the current user has any of the specified permissions
 */
export function useCanAny(permissions: Permission[]): boolean {
  const { data: session, isPending } = useSession();

  if (isPending || !session?.user) return false;

  const role = (session.user as any).role as Role | undefined;
  if (!role) return false;

  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Hook to check if the current user has all of the specified permissions
 */
export function useCanAll(permissions: Permission[]): boolean {
  const { data: session, isPending } = useSession();

  if (isPending || !session?.user) return false;

  const role = (session.user as any).role as Role | undefined;
  if (!role) return false;

  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Hook to get the current user's role
 */
export function useUserRole(): Role | null {
  const { data: session, isPending } = useSession();

  if (isPending || !session?.user) return null;

  return ((session.user as any).role as Role) || null;
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
