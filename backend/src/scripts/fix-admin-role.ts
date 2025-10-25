/**
 * Fix Admin User Role Script
 *
 * Updates admin@clynepaper.com to use the Super Admin role with wildcard permissions.
 * Safe to run multiple times - idempotent operation.
 *
 * Usage: npx ts-node src/scripts/fix-admin-role.ts
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROLES, stringifyPermissions } from "../utils/permissions";

const prisma = new PrismaClient();

async function fixAdminRole() {
  console.log("🔧 Fixing admin user role assignment...\n");

  try {
    // 1. Ensure Super Admin role exists with correct permissions
    console.log("📋 Step 1: Ensuring Super Admin role exists...");
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
    console.log(`   Permissions: ${superAdminRole.permissions}\n`);

    // 2. Find the admin user
    console.log("📋 Step 2: Finding admin@clynepaper.com user...");
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@clynepaper.com" },
      include: { role: true },
    });

    if (!adminUser) {
      console.error("❌ Error: admin@clynepaper.com user not found!");
      console.log("\nTo create the admin user, run: npm run db:seed");
      process.exit(1);
    }

    console.log(`✅ Found user: ${adminUser.fullName}`);
    console.log(`   Current Role: ${adminUser.role.name}`);
    console.log(`   Current Role ID: ${adminUser.roleId}\n`);

    // 3. Check if user already has Super Admin role
    if (adminUser.roleId === superAdminRole.id) {
      console.log("✅ User already has Super Admin role - no changes needed!");
      console.log("\n" + "=".repeat(60));
      console.log("✨ Admin user is correctly configured!");
      console.log("=".repeat(60));
      return;
    }

    // 4. Update user to Super Admin role
    console.log("📋 Step 3: Updating user role to Super Admin...");
    const updatedUser = await prisma.user.update({
      where: { email: "admin@clynepaper.com" },
      data: { roleId: superAdminRole.id },
      include: { role: true },
    });

    console.log(`✅ Successfully updated user role!`);
    console.log(`   New Role: ${updatedUser.role.name}`);
    console.log(`   New Role ID: ${updatedUser.roleId}`);

    console.log("\n" + "=".repeat(60));
    console.log("✨ Admin role fix completed successfully!");
    console.log("=".repeat(60));
    console.log("\n⚠️  IMPORTANT: Users need to log out and log back in for");
    console.log("   the new permissions to take effect (JWT token refresh).\n");

  } catch (error) {
    console.error("❌ Error during admin role fix:", error);
    process.exit(1);
  }
}

fixAdminRole()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
