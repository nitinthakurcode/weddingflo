'use client';

import { useCan, useCanAny, useCanAll } from '@/lib/permissions/can';
import { type Permission } from '@/lib/permissions/roles';

interface CanProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render content based on user permissions
 *
 * Usage:
 * <Can permission={Permissions.USERS_CREATE}>
 *   <CreateUserButton />
 * </Can>
 *
 * <Can permissions={[Permissions.USERS_VIEW, Permissions.USERS_EDIT]}>
 *   <UserManagement />
 * </Can>
 *
 * <Can permissions={[...]} requireAll fallback={<NoAccess />}>
 *   <SensitiveContent />
 * </Can>
 */
export function Can({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: CanProps) {
  const singlePermission = useCan(permission!);
  const anyPermissions = useCanAny(permissions || []);
  const allPermissions = useCanAll(permissions || []);

  let hasAccess = false;

  if (permission) {
    hasAccess = singlePermission;
  } else if (permissions) {
    hasAccess = requireAll ? allPermissions : anyPermissions;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Higher-order component to wrap components with permission checks
 *
 * Usage:
 * const ProtectedComponent = withPermission(MyComponent, Permissions.USERS_CREATE);
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  fallback?: React.ReactNode
) {
  return function PermissionWrapper(props: P) {
    return (
      <Can permission={permission} fallback={fallback}>
        <Component {...props} />
      </Can>
    );
  };
}

/**
 * Higher-order component with multiple permissions
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  permissions: Permission[],
  requireAll = false,
  fallback?: React.ReactNode
) {
  return function PermissionsWrapper(props: P) {
    return (
      <Can permissions={permissions} requireAll={requireAll} fallback={fallback}>
        <Component {...props} />
      </Can>
    );
  };
}
