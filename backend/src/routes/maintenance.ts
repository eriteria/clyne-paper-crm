/**
 * Maintenance endpoint for one-time administrative tasks
 * IMPORTANT: This endpoint should be secured or removed after use
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROLES, stringifyPermissions } from "../utils/permissions";

const router = Router();
const prisma = new PrismaClient();

// Temporary endpoint to fix admin role
// TODO: Remove this after fixing the admin role in production
router.post("/fix-admin-role", async (req: Request, res: Response) => {
  try {
    console.log("🔧 Starting admin role fix...");

    // 1. Ensure Super Admin role exists
    const superAdminRole = await prisma.role.upsert({
      where: { name: DEFAULT_ROLES.SUPER_ADMIN.name },
      update: {
        permissions: stringifyPermissions(DEFAULT_ROLES.SUPER_ADMIN.permissions),
      },
      create: {
        name: DEFAULT_ROLES.SUPER_ADMIN.name,
        permissions: stringifyPermissions(DEFAULT_ROLES.SUPER_ADMIN.permissions),
      },
    });

    console.log(`✅ Super Admin role ready (ID: ${superAdminRole.id})`);

    // 2. Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@clynepaper.com" },
      include: { role: true },
    });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        error: "admin@clynepaper.com not found",
      });
    }

    console.log(`Found user: ${adminUser.fullName}, Current Role: ${adminUser.role.name}`);

    // 3. Check if already Super Admin
    if (adminUser.roleId === superAdminRole.id) {
      return res.json({
        success: true,
        message: "User already has Super Admin role",
        data: {
          user: adminUser.email,
          role: adminUser.role.name,
        },
      });
    }

    // 4. Update to Super Admin
    const updatedUser = await prisma.user.update({
      where: { email: "admin@clynepaper.com" },
      data: { roleId: superAdminRole.id },
      include: { role: true },
    });

    console.log(`✅ Updated user role to: ${updatedUser.role.name}`);

    res.json({
      success: true,
      message: "Admin role updated successfully",
      data: {
        user: updatedUser.email,
        previousRole: adminUser.role.name,
        newRole: updatedUser.role.name,
        note: "User must log out and log back in for permissions to take effect",
      },
    });
  } catch (error) {
    console.error("Error fixing admin role:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fix admin role",
    });
  }
});

export default router;
