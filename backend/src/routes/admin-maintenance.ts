import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import {
  DEFAULT_ROLES,
  stringifyPermissions,
} from "../utils/permissions";

const router = express.Router();

/**
 * POST /api/admin-maintenance/fix-roles
 * Secure maintenance endpoint to update Admin/Super Admin role permissions.
 * Security: Requires header `x-maint-token` to match `ADMIN_MAINT_TOKEN` env var.
 * Behavior: Only updates permissions on existing roles. No create/delete.
 */
router.post("/fix-roles", async (req, res) => {
  try {
    const maintToken = req.header("x-maint-token") || (req.query.token as string | undefined);
    const expected = process.env.ADMIN_MAINT_TOKEN;

    if (!expected) {
      return res.status(503).json({
        success: false,
        error: "ADMIN_MAINT_TOKEN not configured on server. Set this secret and retry.",
      });
    }

    if (!maintToken || maintToken !== expected) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const superAdminPerms = stringifyPermissions(
      DEFAULT_ROLES.SUPER_ADMIN.permissions
    );

    let adminUpdated = false;
    let superAdminUpdated = false;

    // Update Admin role if it exists
    try {
      const admin = await prisma.role.update({
        where: { name: "Admin" },
        data: { permissions: superAdminPerms },
      });
      adminUpdated = !!admin;
    } catch (e) {
      logger.warn("Admin role not found or update failed", { error: String(e) });
    }

    // Update Super Admin role if it exists
    try {
      const superAdmin = await prisma.role.update({
        where: { name: "Super Admin" },
        data: { permissions: superAdminPerms },
      });
      superAdminUpdated = !!superAdmin;
    } catch (e) {
      logger.info("Super Admin role not found; skipping", { error: String(e) });
    }

    return res.json({
      success: true,
      message: "Role permissions updated",
      adminUpdated,
      superAdminUpdated,
      permissionsCount: DEFAULT_ROLES.SUPER_ADMIN.permissions.length,
    });
  } catch (error: any) {
    logger.error("Error in admin-maintenance fix-roles:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
