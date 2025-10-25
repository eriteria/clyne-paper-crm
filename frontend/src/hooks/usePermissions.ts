import { useAuth } from "./useAuth";

/**
 * Hook to check user permissions
 * @returns Object with permission checking functions
 */
export function usePermissions() {
  const { user } = useAuth();

  const permissions = user?.permissions || [];

  /**
   * Check if user has a specific permission
   * Supports wildcards: "*" matches all, "customers:*" matches all customer permissions
   * @param permission - Permission string (e.g., "customers:view")
   * @returns true if user has the permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!user || !permissions) return false;

    // Check for exact match
    if (permissions.includes(permission)) {
      return true;
    }

    // Check for wildcard match (e.g., "customers:*" matches "customers:view")
    const [resource, action] = permission.split(":");
    if (resource && permissions.includes(`${resource}:*`)) {
      return true;
    }

    // Check for global wildcard (Super Admin with "*" permission)
    if (permissions.includes("*")) {
      return true;
    }

    return false;
  };

  /**
   * Check if user has any of the specified permissions
   * @param requiredPermissions - Array of permission strings
   * @returns true if user has at least one of the permissions
   */
  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    if (!user || !permissions) return false;
    return requiredPermissions.some((perm) => permissions.includes(perm));
  };

  /**
   * Check if user has all of the specified permissions
   * @param requiredPermissions - Array of permission strings
   * @returns true if user has all of the permissions
   */
  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    if (!user || !permissions) return false;
    return requiredPermissions.every((perm) => permissions.includes(perm));
  };

  /**
   * Check if user is a Super Admin (has all permissions)
   * @returns true if user is a Super Admin
   */
  const isSuperAdmin = (): boolean => {
    if (!user) return false;
    return user.role === "Super Admin";
  };

  /**
   * Check if user has permission to access a resource
   * @param resource - Resource name (e.g., "customers")
   * @param action - Action name (e.g., "view", "create", "edit", "delete")
   * @returns true if user has the permission
   */
  const canAccess = (resource: string, action: string): boolean => {
    return hasPermission(`${resource}:${action}`);
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    canAccess,
  };
}
