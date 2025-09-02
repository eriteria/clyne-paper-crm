import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

const prisma = new PrismaClient();

// Interface for CSV user data from Zoho
export interface ZohoUserRow {
  "First Name": string;
  "Last Name": string;
  "Email address": string;
  Role?: string; // We'll ignore this for now
  "Last login time"?: string; // We'll ignore this for now
}

// Normalized user interface for import
export interface ImportUserData {
  firstName: string;
  lastName: string;
  email: string;
  defaultPassword: string;
  roleId?: string; // Optional, will use default role if not provided
}

/**
 * Clear all user dummy/test data except admin users
 */
export async function clearDummyUsers() {
  try {
    logger.info("Starting to clear dummy user data...");

    // Don't delete admin users - keep users with admin role
    const adminRole = await prisma.role.findFirst({
      where: { name: "Admin" },
    });

    const whereClause = adminRole ? { roleId: { not: adminRole.id } } : {};

    const deletedUsers = await prisma.user.deleteMany({
      where: whereClause,
    });

    logger.info(`Cleared ${deletedUsers.count} dummy users from database`);

    return {
      message: `Successfully cleared ${deletedUsers.count} dummy users`,
      deletedCount: deletedUsers.count,
    };
  } catch (error) {
    logger.error("Error clearing dummy user data:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to clear dummy users: ${errorMessage}`);
  }
}

/**
 * Import users from normalized data
 */
export async function importUsers(userData: ImportUserData[]): Promise<{
  imported: number;
  errors: Array<{ row: number; error: string; data: ImportUserData }>;
  message: string;
}> {
  const errors: Array<{ row: number; error: string; data: ImportUserData }> =
    [];
  let imported = 0;

  logger.info(`Starting import of ${userData.length} users...`);

  // Get default role (Employee) for users
  const defaultRole = await prisma.role.findFirst({
    where: { name: "Employee" },
  });

  if (!defaultRole) {
    throw new Error(
      "Default 'Employee' role not found. Please ensure roles are properly seeded."
    );
  }

  for (let i = 0; i < userData.length; i++) {
    const user = userData[i];
    try {
      // Validate required fields - email is essential, names can have defaults
      if (!user.email) {
        errors.push({
          row: i + 1,
          error: "Missing required email address",
          data: user,
        });
        continue;
      }

      // Provide defaults for missing names
      const firstName = user.firstName || "Unknown";
      const lastName = user.lastName || "User";

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.email)) {
        errors.push({
          row: i + 1,
          error: "Invalid email format",
          data: user,
        });
        continue;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        errors.push({
          row: i + 1,
          error: `User with email ${user.email} already exists`,
          data: user,
        });
        continue;
      }

      // Hash the default password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(user.defaultPassword, saltRounds);

      // Create the user with defaults for missing fields
      await prisma.user.create({
        data: {
          fullName: `${firstName} ${lastName}`.trim(),
          email: user.email.toLowerCase(),
          passwordHash,
          roleId: user.roleId || defaultRole.id,
          isActive: true,
          // Optional fields with defaults:
          // phone: null (not provided in CSV)
          // teamId: null (not assigned during import)
          // regionId: null (not assigned during import)
        },
      });

      imported++;
      logger.info(`Imported user: ${user.email}`);
    } catch (error) {
      logger.error(`Error importing user ${user.email}:`, error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      errors.push({
        row: i + 1,
        error: errorMessage,
        data: user,
      });
    }
  }

  const message = `Import completed: ${imported} users imported successfully${
    errors.length > 0 ? `, ${errors.length} errors` : ""
  }`;

  logger.info(message);

  return {
    imported,
    errors,
    message,
  };
}

/**
 * Convert Zoho CSV data to normalized import format
 */
export function normalizeZohoUserData(
  zohoData: ZohoUserRow[],
  defaultPassword: string
): ImportUserData[] {
  return zohoData
    .filter((row) => row["Email address"]?.trim()) // Filter out rows without email
    .map((row) => ({
      firstName: row["First Name"]?.trim() || "Unknown",
      lastName: row["Last Name"]?.trim() || "User",
      email: row["Email address"]?.trim().toLowerCase(),
      defaultPassword,
    }));
}

/**
 * Full user import process with data clearing option
 */
export async function fullUserImport(
  zohoData: ZohoUserRow[],
  defaultPassword: string,
  clearData = false
): Promise<{
  imported: number;
  errors: Array<{ row: number; error: string; data: ImportUserData }>;
  message: string;
  cleared?: number;
}> {
  try {
    let cleared = 0;

    // Clear existing data if requested
    if (clearData) {
      const clearResult = await clearDummyUsers();
      cleared = clearResult.deletedCount;
    }

    // Normalize the data
    const normalizedData = normalizeZohoUserData(zohoData, defaultPassword);

    if (normalizedData.length === 0) {
      return {
        imported: 0,
        errors: [],
        message: "No valid user data found to import",
        cleared,
      };
    }

    // Import the users
    const importResult = await importUsers(normalizedData);

    return {
      ...importResult,
      cleared,
    };
  } catch (error) {
    logger.error("Error in full user import:", error);
    throw error;
  }
}

/**
 * Get user import template for CSV download
 */
export function getUserImportTemplate() {
  return [
    {
      "First Name": "John",
      "Last Name": "Doe",
      "Email address": "john.doe@company.com",
      Role: "Employee", // This will be ignored - users will get Employee role by default
      "Last login time": "2024-01-15", // This will be ignored
    },
    {
      "First Name": "Jane",
      "Last Name": "Smith",
      "Email address": "jane.smith@company.com",
      Role: "Manager", // This will be ignored - users will get Employee role by default
      "Last login time": "2024-01-14", // This will be ignored
    },
  ];
}
