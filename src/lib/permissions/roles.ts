/**
 * Role-Based Access Control System
 * Defines permissions for each role in the system
 */

export const Roles = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  STAFF: 'staff',
  CLIENT_VIEWER: 'client_viewer',
} as const;

export type Role = typeof Roles[keyof typeof Roles];

/**
 * Permission categories
 */
export const Permissions = {
  // User Management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',

  // Company Management
  COMPANY_VIEW: 'company:view',
  COMPANY_EDIT: 'company:edit',
  COMPANY_DELETE: 'company:delete',
  COMPANY_BRANDING: 'company:branding',
  COMPANY_BILLING: 'company:billing',
  COMPANY_AI_CONFIG: 'company:ai_config',

  // Client Management
  CLIENTS_VIEW: 'clients:view',
  CLIENTS_CREATE: 'clients:create',
  CLIENTS_EDIT: 'clients:edit',
  CLIENTS_DELETE: 'clients:delete',

  // Guest Management
  GUESTS_VIEW: 'guests:view',
  GUESTS_CREATE: 'guests:create',
  GUESTS_EDIT: 'guests:edit',
  GUESTS_DELETE: 'guests:delete',
  GUESTS_IMPORT: 'guests:import',
  GUESTS_EXPORT: 'guests:export',
  GUESTS_CHECKIN: 'guests:checkin',

  // Budget Management
  BUDGET_VIEW: 'budget:view',
  BUDGET_CREATE: 'budget:create',
  BUDGET_EDIT: 'budget:edit',
  BUDGET_DELETE: 'budget:delete',

  // Vendor Management
  VENDORS_VIEW: 'vendors:view',
  VENDORS_CREATE: 'vendors:create',
  VENDORS_EDIT: 'vendors:edit',
  VENDORS_DELETE: 'vendors:delete',

  // Creatives Management
  CREATIVES_VIEW: 'creatives:view',
  CREATIVES_CREATE: 'creatives:create',
  CREATIVES_EDIT: 'creatives:edit',
  CREATIVES_DELETE: 'creatives:delete',

  // Messages
  MESSAGES_VIEW: 'messages:view',
  MESSAGES_SEND: 'messages:send',

  // Reports & Analytics
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Admin Features
  ADMIN_DASHBOARD: 'admin:dashboard',
  ADMIN_USERS: 'admin:users',
  ADMIN_COMPANIES: 'admin:companies',
  ADMIN_ANALYTICS: 'admin:analytics',
  ADMIN_ACTIVITY_LOG: 'admin:activity_log',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_PROFILE: 'settings:profile',
  SETTINGS_PREFERENCES: 'settings:preferences',
  SETTINGS_INTEGRATIONS: 'settings:integrations',
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];

/**
 * Role-Permission mapping
 */
export const RolePermissions: Record<Role, Permission[]> = {
  [Roles.SUPER_ADMIN]: [
    // Super admin has all permissions
    ...Object.values(Permissions),
  ],

  [Roles.COMPANY_ADMIN]: [
    // User Management
    Permissions.USERS_VIEW,
    Permissions.USERS_CREATE,
    Permissions.USERS_EDIT,
    Permissions.USERS_DELETE,
    Permissions.USERS_MANAGE_ROLES,

    // Company Management
    Permissions.COMPANY_VIEW,
    Permissions.COMPANY_EDIT,
    Permissions.COMPANY_BRANDING,
    Permissions.COMPANY_BILLING,
    Permissions.COMPANY_AI_CONFIG,

    // Full access to clients and operations
    Permissions.CLIENTS_VIEW,
    Permissions.CLIENTS_CREATE,
    Permissions.CLIENTS_EDIT,
    Permissions.CLIENTS_DELETE,

    Permissions.GUESTS_VIEW,
    Permissions.GUESTS_CREATE,
    Permissions.GUESTS_EDIT,
    Permissions.GUESTS_DELETE,
    Permissions.GUESTS_IMPORT,
    Permissions.GUESTS_EXPORT,
    Permissions.GUESTS_CHECKIN,

    Permissions.BUDGET_VIEW,
    Permissions.BUDGET_CREATE,
    Permissions.BUDGET_EDIT,
    Permissions.BUDGET_DELETE,

    Permissions.VENDORS_VIEW,
    Permissions.VENDORS_CREATE,
    Permissions.VENDORS_EDIT,
    Permissions.VENDORS_DELETE,

    Permissions.CREATIVES_VIEW,
    Permissions.CREATIVES_CREATE,
    Permissions.CREATIVES_EDIT,
    Permissions.CREATIVES_DELETE,

    Permissions.MESSAGES_VIEW,
    Permissions.MESSAGES_SEND,

    Permissions.REPORTS_VIEW,
    Permissions.REPORTS_EXPORT,

    Permissions.SETTINGS_VIEW,
    Permissions.SETTINGS_PROFILE,
    Permissions.SETTINGS_PREFERENCES,
    Permissions.SETTINGS_INTEGRATIONS,
  ],

  [Roles.STAFF]: [
    // View company
    Permissions.COMPANY_VIEW,

    // Manage clients and operations
    Permissions.CLIENTS_VIEW,
    Permissions.CLIENTS_CREATE,
    Permissions.CLIENTS_EDIT,

    Permissions.GUESTS_VIEW,
    Permissions.GUESTS_CREATE,
    Permissions.GUESTS_EDIT,
    Permissions.GUESTS_IMPORT,
    Permissions.GUESTS_EXPORT,
    Permissions.GUESTS_CHECKIN,

    Permissions.BUDGET_VIEW,
    Permissions.BUDGET_CREATE,
    Permissions.BUDGET_EDIT,

    Permissions.VENDORS_VIEW,
    Permissions.VENDORS_CREATE,
    Permissions.VENDORS_EDIT,

    Permissions.CREATIVES_VIEW,
    Permissions.CREATIVES_CREATE,
    Permissions.CREATIVES_EDIT,

    Permissions.MESSAGES_VIEW,
    Permissions.MESSAGES_SEND,

    Permissions.REPORTS_VIEW,

    Permissions.SETTINGS_VIEW,
    Permissions.SETTINGS_PROFILE,
    Permissions.SETTINGS_PREFERENCES,
  ],

  [Roles.CLIENT_VIEWER]: [
    // Read-only access for clients
    Permissions.COMPANY_VIEW,
    Permissions.CLIENTS_VIEW,
    Permissions.GUESTS_VIEW,
    Permissions.BUDGET_VIEW,
    Permissions.VENDORS_VIEW,
    Permissions.CREATIVES_VIEW,
    Permissions.MESSAGES_VIEW,
    Permissions.MESSAGES_SEND,
    Permissions.REPORTS_VIEW,
    Permissions.SETTINGS_VIEW,
    Permissions.SETTINGS_PROFILE,
    Permissions.SETTINGS_PREFERENCES,
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
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return RolePermissions[role] || [];
}

/**
 * Check if role is admin (super_admin or company_admin)
 */
export function isAdmin(role: Role): boolean {
  return role === Roles.SUPER_ADMIN || role === Roles.COMPANY_ADMIN;
}

/**
 * Check if role is super admin
 */
export function isSuperAdmin(role: Role): boolean {
  return role === Roles.SUPER_ADMIN;
}
