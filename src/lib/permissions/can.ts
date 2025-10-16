import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { type Permission, hasPermission, type Role } from './roles';

/**
 * Hook to check if the current user has a specific permission
 */
export function useCan(permission: Permission): boolean {
  const { user: clerkUser } = useUser();
  const user = useQuery(
    api.users.getCurrentUser,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  if (!user) return false;

  return hasPermission(user.role as Role, permission);
}

/**
 * Hook to check if the current user has any of the specified permissions
 */
export function useCanAny(permissions: Permission[]): boolean {
  const { user: clerkUser } = useUser();
  const user = useQuery(
    api.users.getCurrentUser,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  if (!user) return false;

  return permissions.some((permission) =>
    hasPermission(user.role as Role, permission)
  );
}

/**
 * Hook to check if the current user has all of the specified permissions
 */
export function useCanAll(permissions: Permission[]): boolean {
  const { user: clerkUser } = useUser();
  const user = useQuery(
    api.users.getCurrentUser,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  if (!user) return false;

  return permissions.every((permission) =>
    hasPermission(user.role as Role, permission)
  );
}

/**
 * Hook to get the current user's role
 */
export function useUserRole(): Role | null {
  const { user: clerkUser } = useUser();
  const user = useQuery(
    api.users.getCurrentUser,
    clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  return (user?.role as Role) || null;
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
