/**
 * Comprehensive Permission System for Clyne Paper CRM
 *
 * This file defines all available permissions in the system.
 * Permissions follow the format: resource:action
 */

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export const PERMISSIONS = {
  // Customer Management
  CUSTOMERS_VIEW: "customers:view",
  CUSTOMERS_CREATE: "customers:create",
  CUSTOMERS_EDIT: "customers:edit",
  CUSTOMERS_DELETE: "customers:delete",
  CUSTOMERS_EXPORT: "customers:export",
  CUSTOMERS_IMPORT: "customers:import",

  // Invoice Management
  INVOICES_VIEW: "invoices:view",
  INVOICES_CREATE: "invoices:create",
  INVOICES_EDIT: "invoices:edit",
  INVOICES_DELETE: "invoices:delete",
  INVOICES_APPROVE: "invoices:approve",
  INVOICES_EXPORT: "invoices:export",
  INVOICES_IMPORT: "invoices:import",

  // Payment Management
  PAYMENTS_VIEW: "payments:view",
  PAYMENTS_CREATE: "payments:create",
  PAYMENTS_EDIT: "payments:edit",
  PAYMENTS_DELETE: "payments:delete",
  PAYMENTS_APPROVE: "payments:approve",
  PAYMENTS_EXPORT: "payments:export",
  PAYMENTS_IMPORT: "payments:import",

  // User Management
  USERS_VIEW: "users:view",
  USERS_CREATE: "users:create",
  USERS_EDIT: "users:edit",
  USERS_DELETE: "users:delete",
  USERS_ACTIVATE: "users:activate",
  USERS_DEACTIVATE: "users:deactivate",

  // Role Management
  ROLES_VIEW: "roles:view",
  ROLES_CREATE: "roles:create",
  ROLES_EDIT: "roles:edit",
  ROLES_DELETE: "roles:delete",

  // Team Management
  TEAMS_VIEW: "teams:view",
  TEAMS_CREATE: "teams:create",
  TEAMS_EDIT: "teams:edit",
  TEAMS_DELETE: "teams:delete",
  TEAMS_ASSIGN_MEMBERS: "teams:assign_members",

  // Location Management
  LOCATIONS_VIEW: "locations:view",
  LOCATIONS_CREATE: "locations:create",
  LOCATIONS_EDIT: "locations:edit",
  LOCATIONS_DELETE: "locations:delete",

  // Product Management
  PRODUCTS_VIEW: "products:view",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_EDIT: "products:edit",
  PRODUCTS_DELETE: "products:delete",
  PRODUCTS_MANAGE_GROUPS: "products:manage_groups",

  // Inventory Management
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_CREATE: "inventory:create",
  INVENTORY_EDIT: "inventory:edit",
  INVENTORY_DELETE: "inventory:delete",
  INVENTORY_ADJUST: "inventory:adjust",
  INVENTORY_VIEW_ALL_LOCATIONS: "inventory:view_all_locations",
  INVENTORY_MANAGE_ALL_LOCATIONS: "inventory:manage_all_locations",

  // Waybill Management
  WAYBILLS_VIEW: "waybills:view",
  WAYBILLS_CREATE: "waybills:create",
  WAYBILLS_EDIT: "waybills:edit",
  WAYBILLS_DELETE: "waybills:delete",
  WAYBILLS_APPROVE: "waybills:approve",

  // Credit Management
  CREDITS_VIEW: "credits:view",
  CREDITS_CREATE: "credits:create",
  CREDITS_APPLY: "credits:apply",
  CREDITS_DELETE: "credits:delete",

  // Sales Returns
  RETURNS_VIEW: "returns:view",
  RETURNS_CREATE: "returns:create",
  RETURNS_APPROVE: "returns:approve",
  RETURNS_DELETE: "returns:delete",

  // Reports
  REPORTS_VIEW_DASHBOARD: "reports:view_dashboard",
  REPORTS_VIEW_SALES: "reports:view_sales",
  REPORTS_VIEW_FINANCIAL: "reports:view_financial",
  REPORTS_VIEW_AR_AGING: "reports:view_ar_aging",
  REPORTS_VIEW_OVERDUE: "reports:view_overdue",
  REPORTS_VIEW_PAYMENTS: "reports:view_payments",
  REPORTS_VIEW_INVENTORY: "reports:view_inventory",
  REPORTS_EXPORT: "reports:export",

  // System Settings
  SETTINGS_VIEW: "settings:view",
  SETTINGS_EDIT: "settings:edit",
  SETTINGS_MANAGE_REGIONS: "settings:manage_regions",

  // Audit & Admin
  AUDIT_VIEW: "audit:view",
  ADMIN_IMPORT_GOOGLE_SHEETS: "admin:import_google_sheets",
  ADMIN_FIX_DATA: "admin:fix_data",
  ADMIN_VIEW_LOGS: "admin:view_logs",
} as const;

// Type for all permission values
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================================================
// PERMISSION GROUPS (for easier role creation)
// ============================================================================

export const PERMISSION_GROUPS = {
  // All permissions (Super Admin)
  ALL: Object.values(PERMISSIONS),

  // Customer-related permissions
  CUSTOMER_FULL: [
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,
    PERMISSIONS.CUSTOMERS_DELETE,
    PERMISSIONS.CUSTOMERS_EXPORT,
    PERMISSIONS.CUSTOMERS_IMPORT,
  ],
  CUSTOMER_BASIC: [
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_EDIT,
  ],
  CUSTOMER_READONLY: [PERMISSIONS.CUSTOMERS_VIEW],

  // Invoice-related permissions
  INVOICE_FULL: [
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_EDIT,
    PERMISSIONS.INVOICES_DELETE,
    PERMISSIONS.INVOICES_APPROVE,
    PERMISSIONS.INVOICES_EXPORT,
    PERMISSIONS.INVOICES_IMPORT,
  ],
  INVOICE_BASIC: [
    PERMISSIONS.INVOICES_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_EDIT,
  ],
  INVOICE_READONLY: [PERMISSIONS.INVOICES_VIEW],

  // Payment-related permissions
  PAYMENT_FULL: [
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_EDIT,
    PERMISSIONS.PAYMENTS_DELETE,
    PERMISSIONS.PAYMENTS_APPROVE,
    PERMISSIONS.PAYMENTS_EXPORT,
    PERMISSIONS.PAYMENTS_IMPORT,
  ],
  PAYMENT_BASIC: [
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_EDIT,
  ],
  PAYMENT_READONLY: [PERMISSIONS.PAYMENTS_VIEW],

  // User management permissions
  USER_FULL: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_ACTIVATE,
    PERMISSIONS.USERS_DEACTIVATE,
  ],
  USER_READONLY: [PERMISSIONS.USERS_VIEW],

  // Role management permissions
  ROLE_FULL: [
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.ROLES_CREATE,
    PERMISSIONS.ROLES_EDIT,
    PERMISSIONS.ROLES_DELETE,
  ],
  ROLE_READONLY: [PERMISSIONS.ROLES_VIEW],

  // Product & Inventory permissions
  PRODUCT_FULL: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_EDIT,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.PRODUCTS_MANAGE_GROUPS,
  ],
  INVENTORY_FULL: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.INVENTORY_DELETE,
    PERMISSIONS.INVENTORY_ADJUST,
  ],

  // All reports
  REPORTS_ALL: [
    PERMISSIONS.REPORTS_VIEW_DASHBOARD,
    PERMISSIONS.REPORTS_VIEW_SALES,
    PERMISSIONS.REPORTS_VIEW_AR_AGING,
    PERMISSIONS.REPORTS_VIEW_OVERDUE,
    PERMISSIONS.REPORTS_VIEW_PAYMENTS,
    PERMISSIONS.REPORTS_VIEW_INVENTORY,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  REPORTS_FINANCIAL: [
    PERMISSIONS.REPORTS_VIEW_DASHBOARD,
    PERMISSIONS.REPORTS_VIEW_AR_AGING,
    PERMISSIONS.REPORTS_VIEW_OVERDUE,
    PERMISSIONS.REPORTS_VIEW_PAYMENTS,
    PERMISSIONS.REPORTS_EXPORT,
  ],
  REPORTS_SALES: [
    PERMISSIONS.REPORTS_VIEW_DASHBOARD,
    PERMISSIONS.REPORTS_VIEW_SALES,
    PERMISSIONS.REPORTS_EXPORT,
  ],
};

// ============================================================================
// DEFAULT ROLE DEFINITIONS
// ============================================================================

export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    name: "Super Admin",
    permissions: ["*" as Permission], // Wildcard grants all permissions
    description: "Full system access with all permissions",
  },

  ADMIN: {
    name: "Admin",
    permissions: [
      ...PERMISSION_GROUPS.CUSTOMER_FULL,
      ...PERMISSION_GROUPS.INVOICE_FULL,
      ...PERMISSION_GROUPS.PAYMENT_FULL,
      ...PERMISSION_GROUPS.USER_READONLY,
      // Allow Admins to view roles (for roles management UI access)
      PERMISSIONS.ROLES_VIEW,
      ...PERMISSION_GROUPS.PRODUCT_FULL,
      ...PERMISSION_GROUPS.INVENTORY_FULL,
      ...PERMISSION_GROUPS.REPORTS_ALL,
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.TEAMS_EDIT,
      PERMISSIONS.LOCATIONS_VIEW,
      PERMISSIONS.LOCATIONS_EDIT,
      PERMISSIONS.WAYBILLS_VIEW,
      PERMISSIONS.WAYBILLS_CREATE,
      PERMISSIONS.WAYBILLS_EDIT,
      PERMISSIONS.CREDITS_VIEW,
      PERMISSIONS.CREDITS_CREATE,
      PERMISSIONS.RETURNS_VIEW,
      PERMISSIONS.RETURNS_CREATE,
      PERMISSIONS.SETTINGS_VIEW,
    ],
    description: "Administrative access without user/role management",
  },

  SALES_MANAGER: {
    name: "Sales Manager",
    permissions: [
      ...PERMISSION_GROUPS.CUSTOMER_FULL,
      ...PERMISSION_GROUPS.INVOICE_FULL,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_CREATE,
      ...PERMISSION_GROUPS.REPORTS_SALES,
      PERMISSIONS.REPORTS_VIEW_AR_AGING,
      PERMISSIONS.REPORTS_VIEW_OVERDUE,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.CREDITS_VIEW,
      PERMISSIONS.CREDITS_CREATE,
      PERMISSIONS.RETURNS_VIEW,
      PERMISSIONS.RETURNS_CREATE,
    ],
    description: "Manage sales team, customers, and invoices",
  },

  ACCOUNTANT: {
    name: "Accountant",
    permissions: [
      PERMISSIONS.CUSTOMERS_VIEW,
      ...PERMISSION_GROUPS.INVOICE_FULL,
      ...PERMISSION_GROUPS.PAYMENT_FULL,
      ...PERMISSION_GROUPS.INVENTORY_FULL,
      ...PERMISSION_GROUPS.REPORTS_FINANCIAL,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.WAYBILLS_VIEW,
      PERMISSIONS.WAYBILLS_CREATE,
      PERMISSIONS.WAYBILLS_EDIT,
      PERMISSIONS.CREDITS_VIEW,
      PERMISSIONS.CREDITS_CREATE,
      PERMISSIONS.CREDITS_APPLY,
      PERMISSIONS.RETURNS_VIEW,
      PERMISSIONS.RETURNS_APPROVE,
      PERMISSIONS.AUDIT_VIEW,
    ],
    description: "Manage financial operations, inventory, and reporting",
  },

  SALES_REP: {
    name: "Sales Rep",
    permissions: [
      ...PERMISSION_GROUPS.CUSTOMER_BASIC,
      ...PERMISSION_GROUPS.INVOICE_BASIC,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_CREATE,
      PERMISSIONS.REPORTS_VIEW_DASHBOARD,
      PERMISSIONS.REPORTS_VIEW_SALES,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.CREDITS_VIEW,
    ],
    description: "Create and manage customer orders",
  },

  INVENTORY_MANAGER: {
    name: "Inventory Manager",
    permissions: [
      ...PERMISSION_GROUPS.PRODUCT_FULL,
      ...PERMISSION_GROUPS.INVENTORY_FULL,
      PERMISSIONS.WAYBILLS_VIEW,
      PERMISSIONS.WAYBILLS_CREATE,
      PERMISSIONS.WAYBILLS_EDIT,
      PERMISSIONS.WAYBILLS_APPROVE,
      PERMISSIONS.REPORTS_VIEW_INVENTORY,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.INVOICES_VIEW,
    ],
    description: "Manage products, inventory, and waybills",
  },

  VIEWER: {
    name: "Viewer",
    permissions: [
      PERMISSIONS.CUSTOMERS_VIEW,
      PERMISSIONS.INVOICES_VIEW,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.REPORTS_VIEW_DASHBOARD,
      PERMISSIONS.REPORTS_VIEW_SALES,
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.USERS_VIEW,
    ],
    description: "Read-only access to most system data",
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse permissions from database (JSON string) to array
 */
export function parsePermissions(permissionsJson: string | null): Permission[] {
  if (!permissionsJson) return [];

  try {
    const parsed = JSON.parse(permissionsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Check if a permission set includes a specific permission
 * Supports wildcards: "roles:*" matches "roles:view", "roles:create", etc.
 */
export function hasPermission(
  userPermissions: Permission[] | string[],
  requiredPermission: Permission
): boolean {
  // Check for exact match
  if (userPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard match (e.g., "roles:*" matches "roles:view")
  const [resource, action] = requiredPermission.split(":");
  const wildcardPermission = `${resource}:*`;
  if (userPermissions.includes(wildcardPermission as Permission)) {
    return true;
  }

  // Check for global wildcard (e.g., "*" matches everything)
  if (userPermissions.includes("*" as Permission)) {
    return true;
  }

  return false;
}

/**
 * Check if a permission set includes ANY of the required permissions
 */
export function hasAnyPermission(
  userPermissions: Permission[] | string[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((perm) =>
    hasPermission(userPermissions, perm)
  );
}

/**
 * Check if a permission set includes ALL of the required permissions
 */
export function hasAllPermissions(
  userPermissions: Permission[] | string[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((perm) =>
    hasPermission(userPermissions, perm)
  );
}

/**
 * Stringify permissions array for database storage
 */
export function stringifyPermissions(permissions: Permission[]): string {
  return JSON.stringify(permissions);
}

/**
 * Get all available permissions grouped by resource
 */
export function getPermissionsByResource() {
  const grouped: Record<string, Permission[]> = {};

  Object.values(PERMISSIONS).forEach((permission) => {
    const [resource] = permission.split(":");
    if (!grouped[resource]) {
      grouped[resource] = [];
    }
    grouped[resource].push(permission);
  });

  return grouped;
}

/**
 * Get human-readable permission name
 */
export function getPermissionLabel(permission: Permission): string {
  const [resource, action] = permission.split(":");
  const resourceLabel =
    resource.charAt(0).toUpperCase() + resource.slice(1).replace(/_/g, " ");
  const actionLabel =
    action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, " ");
  return `${resourceLabel} - ${actionLabel}`;
}
