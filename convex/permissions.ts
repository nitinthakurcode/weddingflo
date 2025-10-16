/**
 * Backend Permission Helpers
 * Provides utilities for checking user permissions in Convex mutations and queries
 */

import { QueryCtx, MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';

type Context = QueryCtx | MutationCtx;

export type Role = 'super_admin' | 'company_admin' | 'staff' | 'client_viewer';

export type Permission =
  | 'users:view'
  | 'users:create'
  | 'users:edit'
  | 'users:delete'
  | 'users:manage_roles'
  | 'company:view'
  | 'company:edit'
  | 'company:delete'
  | 'company:branding'
  | 'company:billing'
  | 'company:ai_config'
  | 'clients:view'
  | 'clients:create'
  | 'clients:edit'
  | 'clients:delete'
  | 'guests:view'
  | 'guests:create'
  | 'guests:edit'
  | 'guests:delete'
  | 'guests:import'
  | 'guests:export'
  | 'guests:checkin'
  | 'budget:view'
  | 'budget:create'
  | 'budget:edit'
  | 'budget:delete'
  | 'vendors:view'
  | 'vendors:create'
  | 'vendors:edit'
  | 'vendors:delete'
  | 'creatives:view'
  | 'creatives:create'
  | 'creatives:edit'
  | 'creatives:delete'
  | 'messages:view'
  | 'messages:send'
  | 'reports:view'
  | 'reports:export';

/**
 * Role-Permission mapping
 */
const RolePermissions: Record<Role, Permission[]> = {
  super_admin: [
    // Super admin has all permissions
    'users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage_roles',
    'company:view', 'company:edit', 'company:delete', 'company:branding', 'company:billing', 'company:ai_config',
    'clients:view', 'clients:create', 'clients:edit', 'clients:delete',
    'guests:view', 'guests:create', 'guests:edit', 'guests:delete', 'guests:import', 'guests:export', 'guests:checkin',
    'budget:view', 'budget:create', 'budget:edit', 'budget:delete',
    'vendors:view', 'vendors:create', 'vendors:edit', 'vendors:delete',
    'creatives:view', 'creatives:create', 'creatives:edit', 'creatives:delete',
    'messages:view', 'messages:send',
    'reports:view', 'reports:export',
  ],

  company_admin: [
    'users:view', 'users:create', 'users:edit', 'users:delete', 'users:manage_roles',
    'company:view', 'company:edit', 'company:branding', 'company:billing', 'company:ai_config',
    'clients:view', 'clients:create', 'clients:edit', 'clients:delete',
    'guests:view', 'guests:create', 'guests:edit', 'guests:delete', 'guests:import', 'guests:export', 'guests:checkin',
    'budget:view', 'budget:create', 'budget:edit', 'budget:delete',
    'vendors:view', 'vendors:create', 'vendors:edit', 'vendors:delete',
    'creatives:view', 'creatives:create', 'creatives:edit', 'creatives:delete',
    'messages:view', 'messages:send',
    'reports:view', 'reports:export',
  ],

  staff: [
    'company:view',
    'clients:view', 'clients:create', 'clients:edit',
    'guests:view', 'guests:create', 'guests:edit', 'guests:import', 'guests:export', 'guests:checkin',
    'budget:view', 'budget:create', 'budget:edit',
    'vendors:view', 'vendors:create', 'vendors:edit',
    'creatives:view', 'creatives:create', 'creatives:edit',
    'messages:view', 'messages:send',
    'reports:view',
  ],

  client_viewer: [
    'company:view',
    'clients:view',
    'guests:view',
    'budget:view',
    'vendors:view',
    'creatives:view',
    'messages:view', 'messages:send',
    'reports:view',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const rolePerms = RolePermissions[role];
  return rolePerms.includes(permission);
}

/**
 * Get current authenticated user with company info
 */
export async function getCurrentUser(ctx: Context) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerk_id', identity.subject))
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Check if current user has permission
 * Throws error if not authorized
 */
export async function requirePermission(ctx: Context, permission: Permission) {
  const user = await getCurrentUser(ctx);

  if (!hasPermission(user.role as Role, permission)) {
    throw new Error(`Unauthorized: Missing permission '${permission}'`);
  }

  return user;
}

/**
 * Check if current user is admin (company_admin or super_admin)
 */
export async function requireAdmin(ctx: Context) {
  const user = await getCurrentUser(ctx);

  if (user.role !== 'company_admin' && user.role !== 'super_admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  return user;
}

/**
 * Check if resource belongs to user's company
 * Used for multi-tenant isolation
 */
export async function requireSameCompany(
  ctx: Context,
  resourceCompanyId: Id<'companies'>
) {
  const user = await getCurrentUser(ctx);

  if (user.company_id !== resourceCompanyId) {
    throw new Error('Unauthorized: Resource not in your company');
  }

  return user;
}

/**
 * Get current user and validate they can access resource from their company
 */
export async function requireCompanyAccess(ctx: Context) {
  return await getCurrentUser(ctx);
}
