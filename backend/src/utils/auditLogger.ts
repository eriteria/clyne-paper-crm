import { prisma } from "../server";
import { logger } from "./logger";

export interface AuditLogData {
  userId: string;
  actionType: "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "LOGIN" | "LOGOUT" | "EXPORT" | "IMPORT";
  entityType: string;
  entityId: string;
  previousValue?: any;
  currentValue?: any;
}

/**
 * Creates an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        actionType: data.actionType,
        entityType: data.entityType,
        entityId: data.entityId,
        previousValue: data.previousValue ? JSON.stringify(data.previousValue) : null,
        currentValue: data.currentValue ? JSON.stringify(data.currentValue) : null,
      },
    });

    logger.info(`Audit log created: ${data.actionType} on ${data.entityType} ${data.entityId} by user ${data.userId}`);
  } catch (error) {
    logger.error("Failed to create audit log:", error);
    // Don't throw error - audit logging should not break the main functionality
  }
}

/**
 * Convenience function for logging CREATE actions
 */
export async function logCreate(
  userId: string,
  entityType: string,
  entityId: string,
  currentValue?: any
): Promise<void> {
  await createAuditLog({
    userId,
    actionType: "CREATE",
    entityType,
    entityId,
    currentValue,
  });
}

/**
 * Convenience function for logging UPDATE actions
 */
export async function logUpdate(
  userId: string,
  entityType: string,
  entityId: string,
  previousValue?: any,
  currentValue?: any
): Promise<void> {
  await createAuditLog({
    userId,
    actionType: "UPDATE",
    entityType,
    entityId,
    previousValue,
    currentValue,
  });
}

/**
 * Convenience function for logging DELETE actions
 */
export async function logDelete(
  userId: string,
  entityType: string,
  entityId: string,
  previousValue?: any
): Promise<void> {
  await createAuditLog({
    userId,
    actionType: "DELETE",
    entityType,
    entityId,
    previousValue,
  });
}

/**
 * Convenience function for logging VIEW actions (for sensitive data access)
 */
export async function logView(
  userId: string,
  entityType: string,
  entityId: string
): Promise<void> {
  await createAuditLog({
    userId,
    actionType: "VIEW",
    entityType,
    entityId,
  });
}

/**
 * Convenience function for logging LOGIN actions
 */
export async function logLogin(userId: string, additionalData?: any): Promise<void> {
  await createAuditLog({
    userId,
    actionType: "LOGIN",
    entityType: "USER",
    entityId: userId,
    currentValue: additionalData,
  });
}

/**
 * Convenience function for logging LOGOUT actions
 */
export async function logLogout(userId: string): Promise<void> {
  await createAuditLog({
    userId,
    actionType: "LOGOUT",
    entityType: "USER",
    entityId: userId,
  });
}

/**
 * Convenience function for logging EXPORT actions
 */
export async function logExport(
  userId: string,
  exportType: string,
  entityIds: string[],
  metadata?: any
): Promise<void> {
  await createAuditLog({
    userId,
    actionType: "EXPORT",
    entityType: exportType,
    entityId: entityIds.join(","),
    currentValue: metadata,
  });
}

/**
 * Convenience function for logging IMPORT actions
 */
export async function logImport(
  userId: string,
  importType: string,
  entityCount: number,
  metadata?: any
): Promise<void> {
  await createAuditLog({
    userId,
    actionType: "IMPORT",
    entityType: importType,
    entityId: `bulk_${Date.now()}`,
    currentValue: { entityCount, ...metadata },
  });
}

/**
 * Get human-readable action description
 */
export function getActionDescription(auditLog: any): string {
  const { actionType, entityType, user } = auditLog;
  const userName = user?.fullName || "Unknown User";

  switch (actionType) {
    case "CREATE":
      return `${userName} created a ${entityType.toLowerCase()}`;
    case "UPDATE":
      return `${userName} updated a ${entityType.toLowerCase()}`;
    case "DELETE":
      return `${userName} deleted a ${entityType.toLowerCase()}`;
    case "VIEW":
      return `${userName} viewed a ${entityType.toLowerCase()}`;
    case "LOGIN":
      return `${userName} logged in`;
    case "LOGOUT":
      return `${userName} logged out`;
    case "EXPORT":
      return `${userName} exported ${entityType.toLowerCase()} data`;
    case "IMPORT":
      return `${userName} imported ${entityType.toLowerCase()} data`;
    default:
      return `${userName} performed ${actionType} on ${entityType.toLowerCase()}`;
  }
}

/**
 * Get action type color for UI display
 */
export function getActionColor(actionType: string): string {
  switch (actionType) {
    case "CREATE":
      return "text-green-600 bg-green-100";
    case "UPDATE":
      return "text-blue-600 bg-blue-100";
    case "DELETE":
      return "text-red-600 bg-red-100";
    case "VIEW":
      return "text-gray-600 bg-gray-100";
    case "LOGIN":
      return "text-purple-600 bg-purple-100";
    case "LOGOUT":
      return "text-orange-600 bg-orange-100";
    case "EXPORT":
      return "text-yellow-600 bg-yellow-100";
    case "IMPORT":
      return "text-indigo-600 bg-indigo-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}
