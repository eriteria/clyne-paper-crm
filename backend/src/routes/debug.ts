/**
 * Debug Routes - Development Only
 *
 * These routes help debug permission and authentication issues.
 * Should be disabled in production.
 */

import express from "express";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// Only enable in development
if (process.env.NODE_ENV !== "production") {
  /**
   * @desc    Get current user's permissions
   * @route   GET /api/debug/permissions
   * @access  Private
   */
  router.get(
    "/permissions",
    authenticate,
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = req.user;

        res.json({
          success: true,
          data: {
            userId: user?.id,
            email: user?.email,
            role: user?.role,
            roleId: user?.roleId,
            permissions: user?.permissions || [],
            permissionCount: user?.permissions?.length || 0,
            hasSuperAdminWildcard: user?.permissions?.includes("*" as any),
            teamId: user?.teamId,
            regionId: user?.regionId,
          },
          message:
            "This endpoint shows your current authentication and permissions. Log out and back in if permissions look incorrect.",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: "Error fetching debug info",
        });
      }
    }
  );

  /**
   * @desc    Test permission check
   * @route   POST /api/debug/check-permission
   * @access  Private
   */
  router.post(
    "/check-permission",
    authenticate,
    async (req: AuthenticatedRequest, res) => {
      try {
        const { permission } = req.body;
        const user = req.user;

        if (!permission) {
          return res.status(400).json({
            success: false,
            error: "Please provide a permission to check",
          });
        }

        const userPermissions = user?.permissions || [];

        // Check exact match
        const hasExact = userPermissions.includes(permission);

        // Check wildcard
        const [resource, action] = permission.split(":");
        const hasWildcard = resource && userPermissions.includes(`${resource}:*` as any);

        // Check global wildcard
        const hasSuperAdmin = userPermissions.includes("*" as any);

        const hasPermission = hasExact || hasWildcard || hasSuperAdmin;

        res.json({
          success: true,
          data: {
            permission,
            hasPermission,
            checks: {
              exactMatch: hasExact,
              wildcardMatch: hasWildcard,
              superAdminWildcard: hasSuperAdmin,
            },
            userPermissions,
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: "Error checking permission",
        });
      }
    }
  );

  console.log(
    "⚠️  Debug routes enabled at /api/debug (development mode only)"
  );
} else {
  console.log("ℹ️  Debug routes disabled (production mode)");
}

export default router;
