/**
 * Location Access Middleware
 * Controls user access to inventory at different locations
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get all location IDs the user has access to
 * Returns "ALL" for super admins or users with manage_all_locations permission
 * Returns array of location IDs for regular users
 */
export async function getUserAccessibleLocationIds(
  user: AuthenticatedRequest["user"]
): Promise<string[] | "ALL"> {
  if (!user) return [];

  // Super Admin (has wildcard permission) can access all locations
  if (user.permissions?.includes("*")) {
    return "ALL";
  }

  // Check for explicit permission to manage all locations
  if (
    user.permissions?.includes("inventory:manage_all_locations") ||
    user.permissions?.includes("inventory:view_all_locations")
  ) {
    return "ALL";
  }

  // Fetch user with location assignments
  const userWithLocations = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      assignedLocations: {
        select: { locationId: true },
      },
    },
  });

  if (!userWithLocations) return [];

  // Collect all accessible location IDs
  const locationIds: string[] = [];

  // Add primary location
  if (userWithLocations.primaryLocationId) {
    locationIds.push(userWithLocations.primaryLocationId);
  }

  // Add assigned locations
  if (userWithLocations.assignedLocations) {
    locationIds.push(
      ...userWithLocations.assignedLocations.map((ul) => ul.locationId)
    );
  }

  // Remove duplicates
  return [...new Set(locationIds)];
}

/**
 * Get user's primary location ID
 */
export async function getUserPrimaryLocationId(
  user: AuthenticatedRequest["user"]
): Promise<string | null> {
  if (!user) return null;

  const userWithLocation = await prisma.user.findUnique({
    where: { id: user.id },
    select: { primaryLocationId: true },
  });

  return userWithLocation?.primaryLocationId || null;
}

/**
 * Middleware: Requires user to have access to a specific location
 */
export function requireLocationAccess(locationIdParam: string = "locationId") {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const locationId =
        req.params[locationIdParam] ||
        req.body[locationIdParam] ||
        req.query[locationIdParam];

      if (!locationId) {
        return res.status(400).json({
          success: false,
          error: "Location ID is required",
        });
      }

      const accessibleLocations = await getUserAccessibleLocationIds(req.user);

      if (
        accessibleLocations === "ALL" ||
        accessibleLocations.includes(locationId as string)
      ) {
        next();
      } else {
        return res.status(403).json({
          success: false,
          error: "You do not have access to this location",
        });
      }
    } catch (error) {
      console.error("Location access check error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to verify location access",
      });
    }
  };
}

/**
 * Middleware: Inject accessible locations into request
 * Useful for filtering queries
 */
export async function injectAccessibleLocations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const accessibleLocations = await getUserAccessibleLocationIds(req.user);
    (req as any).accessibleLocationIds = accessibleLocations;
    next();
  } catch (error) {
    console.error("Error injecting accessible locations:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to determine accessible locations",
    });
  }
}

/**
 * Check if user can manage multiple locations
 */
export async function canManageMultipleLocations(
  user: AuthenticatedRequest["user"]
): Promise<boolean> {
  if (!user) return false;

  // Super admin or explicit permission
  if (
    user.permissions?.includes("*") ||
    user.permissions?.includes("inventory:manage_all_locations")
  ) {
    return true;
  }

  // Check if user has multiple location assignments
  const userWithLocations = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      assignedLocations: true,
    },
  });

  if (!userWithLocations) return false;

  const totalLocations =
    (userWithLocations.primaryLocationId ? 1 : 0) +
    (userWithLocations.assignedLocations?.length || 0);

  return totalLocations > 1;
}
