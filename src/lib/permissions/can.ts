import { useUser } from '@clerk/nextjs';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/client';
import { type Permission, hasPermission, type Role } from './roles';

/**
 * Hook to check if the current user has a specific permission
 */
export function useCan(permission: Permission): boolean {
  const { user: clerkUser } = useUser();
  const supabase = useSupabase();

  const { data: user } = useQuery<any>({
    queryKey: ['users', 'current', clerkUser?.id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!clerkUser?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUser.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clerkUser?.id && !!supabase,
  });

  if (!user) return false;

  return hasPermission(user.role as Role, permission);
}

/**
 * Hook to check if the current user has any of the specified permissions
 */
export function useCanAny(permissions: Permission[]): boolean {
  const { user: clerkUser } = useUser();
  const supabase = useSupabase();

  const { data: user } = useQuery<any>({
    queryKey: ['users', 'current', clerkUser?.id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!clerkUser?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUser.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clerkUser?.id && !!supabase,
  });

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
  const supabase = useSupabase();

  const { data: user } = useQuery<any>({
    queryKey: ['users', 'current', clerkUser?.id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!clerkUser?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUser.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clerkUser?.id && !!supabase,
  });

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
  const supabase = useSupabase();

  const { data: user } = useQuery<any>({
    queryKey: ['users', 'current', clerkUser?.id],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not ready');
      if (!clerkUser?.id) throw new Error('User ID not available');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_id', clerkUser.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clerkUser?.id && !!supabase,
  });

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
