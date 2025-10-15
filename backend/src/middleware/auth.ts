import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../server";
import {
  Permission,
  parsePermissions,
  hasPermission,
  hasAnyPermission,
} from "../utils/permissions";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    roleId: string;
    teamId?: string;
    regionId?: string;
    permissions: Permission[];
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access token required",
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Access token required",
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
    };

    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: "User account is inactive",
      });
    }

    // Parse permissions from role
    const permissions = parsePermissions(user.role.permissions);

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      roleId: user.role.id,
      teamId: user.teamId || undefined,
      regionId: user.regionId || undefined,
      permissions,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: "Token expired",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Authentication error",
    });
  }
};

/**
 * Middleware to require specific permission(s)
 * Must be used AFTER authenticate middleware
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Response | void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userPermissions = req.user.permissions || [];

    // Check if user has at least one of the required permissions
    const hasRequiredPermission = requiredPermissions.some((perm) =>
      hasPermission(userPermissions, perm)
    );

    if (!hasRequiredPermission) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        required: requiredPermissions,
      });
    }

    next();
  };
};

/**
 * Middleware to require ALL specified permissions
 * Must be used AFTER authenticate middleware
 */
export const requireAllPermissions = (...requiredPermissions: Permission[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Response | void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userPermissions = req.user.permissions || [];

    // Check if user has ALL required permissions
    const hasAll = requiredPermissions.every((perm) =>
      hasPermission(userPermissions, perm)
    );

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        required: requiredPermissions,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is super admin
 * Must be used AFTER authenticate middleware
 */
export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  if (req.user.role !== "Super Admin") {
    return res.status(403).json({
      success: false,
      error: "Super Admin access required",
    });
  }

  next();
};

// Export the AuthenticatedRequest type for use in routes
export type { AuthenticatedRequest };
