import React from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  /**
   * Single permission or array of permissions required
   * Format: "resource:action" (e.g., "customers:delete")
   */
  permission: string | string[];

  /**
   * If true, user must have ALL specified permissions (AND logic)
   * If false, user must have ANY of the specified permissions (OR logic)
   * Default: false (OR logic)
   */
  requireAll?: boolean;

  /**
   * Content to render if user doesn't have permission
   * Default: null (renders nothing)
   */
  fallback?: React.ReactNode;

  /**
   * Content to render if user has permission
   */
  children: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 *
 * @example
 * // Single permission
 * <PermissionGate permission="customers:delete">
 *   <button>Delete Customer</button>
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions with OR logic
 * <PermissionGate permission={["customers:edit", "customers:delete"]}>
 *   <button>Edit/Delete</button>
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions with AND logic
 * <PermissionGate permission={["customers:edit", "invoices:view"]} requireAll>
 *   <button>Edit Customer & View Invoices</button>
 * </PermissionGate>
 *
 * @example
 * // With fallback content
 * <PermissionGate
 *   permission="customers:delete"
 *   fallback={<span>No permission</span>}
 * >
 *   <button>Delete</button>
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();

  // Handle single permission
  if (typeof permission === "string") {
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
  }

  // Handle multiple permissions
  const hasAccess = requireAll
    ? hasAllPermissions(permission)
    : hasAnyPermission(permission);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
