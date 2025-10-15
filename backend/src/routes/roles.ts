import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { authenticate, requirePermission } from "../middleware/auth";
import {
  PERMISSIONS,
  stringifyPermissions,
  parsePermissions,
  getPermissionsByResource,
  getPermissionLabel,
} from "../utils/permissions";
import type { AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// @desc    Get available permissions (grouped by resource)
// @route   GET /api/roles/permissions
// @access  Private (requires roles:view permission)
router.get(
  "/permissions",
  requirePermission(PERMISSIONS.ROLES_VIEW),
  async (req, res, next) => {
    try {
      const permissionsByResource = getPermissionsByResource();

      // Format for frontend
      const formatted = Object.entries(permissionsByResource).map(
        ([resource, permissions]) => ({
          resource,
          resourceLabel:
            resource.charAt(0).toUpperCase() +
            resource.slice(1).replace(/_/g, " "),
          permissions: permissions.map((perm) => ({
            value: perm,
            label: getPermissionLabel(perm),
          })),
        })
      );

      return res.json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      logger.error("Error fetching permissions:", error);
      return next(error);
    }
  }
);

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (requires roles:view permission)
router.get(
  "/",
  requirePermission(PERMISSIONS.ROLES_VIEW),
  async (req, res, next) => {
    try {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          permissions: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Parse permissions for each role
      const rolesWithParsedPermissions = roles.map((role) => ({
        ...role,
        permissions: parsePermissions(role.permissions),
        userCount: role._count.users,
      }));

      return res.json({
        success: true,
        data: rolesWithParsedPermissions,
      });
    } catch (error) {
      logger.error("Error fetching roles:", error);
      return next(error);
    }
  }
);

// @desc    Get role by ID
// @route   GET /api/roles/:id
// @access  Private (requires roles:view permission)
router.get(
  "/:id",
  requirePermission(PERMISSIONS.ROLES_VIEW),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              fullName: true,
              email: true,
              isActive: true,
            },
          },
        },
      });

      if (!role) {
        return res.status(404).json({
          success: false,
          error: "Role not found",
        });
      }

      // Parse permissions
      const roleWithParsedPermissions = {
        ...role,
        permissions: parsePermissions(role.permissions),
        users: role.users,
      };

      return res.json({
        success: true,
        data: roleWithParsedPermissions,
      });
    } catch (error) {
      logger.error("Error fetching role:", error);
      return next(error);
    }
  }
);

// @desc    Create new role
// @route   POST /api/roles
// @access  Private (requires roles:create permission)
router.post(
  "/",
  requirePermission(PERMISSIONS.ROLES_CREATE),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { name, permissions } = req.body;

      // Validation
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Role name is required",
        });
      }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: "Permissions must be an array",
        });
      }

      // Check if role name already exists
      const existingRole = await prisma.role.findUnique({
        where: { name: name.trim() },
      });

      if (existingRole) {
        return res.status(409).json({
          success: false,
          error: "Role with this name already exists",
        });
      }

      // Create role
      const newRole = await prisma.role.create({
        data: {
          name: name.trim(),
          permissions: stringifyPermissions(permissions),
        },
      });

      logger.info(`Role created: ${newRole.name} by user ${req.user?.email}`);

      return res.status(201).json({
        success: true,
        data: {
          ...newRole,
          permissions: parsePermissions(newRole.permissions),
        },
      });
    } catch (error) {
      logger.error("Error creating role:", error);
      return next(error);
    }
  }
);

// @desc    Update role
// @route   PUT /api/roles/:id
// @access  Private (requires roles:edit permission)
router.put(
  "/:id",
  requirePermission(PERMISSIONS.ROLES_EDIT),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const { name, permissions } = req.body;

      // Check if role exists
      const existingRole = await prisma.role.findUnique({
        where: { id },
      });

      if (!existingRole) {
        return res.status(404).json({
          success: false,
          error: "Role not found",
        });
      }

      // Prevent editing Super Admin role unless user is Super Admin
      if (
        existingRole.name === "Super Admin" &&
        req.user?.role !== "Super Admin"
      ) {
        return res.status(403).json({
          success: false,
          error: "Only Super Admin can edit the Super Admin role",
        });
      }

      // Validation
      const updateData: any = {};

      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: "Invalid role name",
          });
        }

        // Check for name conflicts
        const nameConflict = await prisma.role.findFirst({
          where: {
            name: name.trim(),
            id: { not: id },
          },
        });

        if (nameConflict) {
          return res.status(409).json({
            success: false,
            error: "Role with this name already exists",
          });
        }

        updateData.name = name.trim();
      }

      if (permissions !== undefined) {
        if (!Array.isArray(permissions)) {
          return res.status(400).json({
            success: false,
            error: "Permissions must be an array",
          });
        }

        updateData.permissions = stringifyPermissions(permissions);
      }

      // Update role
      const updatedRole = await prisma.role.update({
        where: { id },
        data: updateData,
      });

      logger.info(
        `Role updated: ${updatedRole.name} by user ${req.user?.email}`
      );

      return res.json({
        success: true,
        data: {
          ...updatedRole,
          permissions: parsePermissions(updatedRole.permissions),
        },
      });
    } catch (error) {
      logger.error("Error updating role:", error);
      return next(error);
    }
  }
);

// @desc    Delete role
// @route   DELETE /api/roles/:id
// @access  Private (requires roles:delete permission)
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.ROLES_DELETE),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;

      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      });

      if (!role) {
        return res.status(404).json({
          success: false,
          error: "Role not found",
        });
      }

      // Prevent deleting Super Admin role
      if (role.name === "Super Admin") {
        return res.status(403).json({
          success: false,
          error: "Cannot delete Super Admin role",
        });
      }

      // Check if role has users
      if (role._count.users > 0) {
        return res.status(409).json({
          success: false,
          error: `Cannot delete role with ${role._count.users} assigned user(s). Please reassign users first.`,
        });
      }

      // Delete role
      await prisma.role.delete({
        where: { id },
      });

      logger.info(`Role deleted: ${role.name} by user ${req.user?.email}`);

      return res.json({
        success: true,
        message: "Role deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting role:", error);
      return next(error);
    }
  }
);

export default router;
