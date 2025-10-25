/**
 * Script to fix Super Admin permissions
 *
 * Updates the Super Admin role to use wildcard "*" permission
 * which grants access to everything in the system.
 *
 * Usage: npx ts-node src/scripts/fix-super-admin-permissions.ts
 */

import { PrismaClient } from "@prisma/client";
import { stringifyPermissions } from "../utils/permissions";

const prisma = new PrismaClient();

async function fixSuperAdminPermissions() {
  console.log("🔧 Fixing Super Admin permissions...\n");

  try {
    // Find Super Admin role
    const superAdminRole = await prisma.role.findFirst({
      where: {
        name: {
          in: ["Super Admin", "SUPER ADMIN", "super admin"],
          mode: "insensitive",
        },
      },
    });

    if (!superAdminRole) {
      console.log("❌ Super Admin role not found in database!");
      console.log("   Please run the role seeder first: npm run db:seed");
      return;
    }

    console.log(`✅ Found Super Admin role: ${superAdminRole.name}`);
    console.log(`   Current permissions: ${superAdminRole.permissions}\n`);

    // Update to wildcard permission
    const updatedRole = await prisma.role.update({
      where: { id: superAdminRole.id },
      data: {
        permissions: stringifyPermissions(["*" as any]),
      },
    });

    console.log("✅ Successfully updated Super Admin role!");
    console.log(`   New permissions: ${updatedRole.permissions}`);
    console.log(
      '   The "*" wildcard grants access to ALL system permissions.\n'
    );

    // Count users with this role
    const userCount = await prisma.user.count({
      where: { roleId: superAdminRole.id },
    });

    console.log(`👥 ${userCount} user(s) have the Super Admin role.`);
    console.log(
      "   They will now have full access to all system features.\n"
    );
  } catch (error) {
    console.error("❌ Error updating Super Admin permissions:", error);
    throw error;
  }
}

fixSuperAdminPermissions()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
