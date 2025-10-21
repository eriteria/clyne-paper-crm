/**
 * Production Role Update Script - SAFE VERSION
 * 
 * ONLY updates existing roles with correct permissions.
 * Does NOT create, delete, or seed any data.
 * Safe to run on production database.
 * 
 * Usage: npm run update-roles:prod
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROLES, stringifyPermissions } from "./src/utils/permissions";

const prisma = new PrismaClient();

async function updateProductionRoles() {
  console.log("� SAFE Production Role Update - NO SEEDING\n");
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`⚠️  This script ONLY updates existing roles, no data will be created or deleted\n`);

  try {
    // Check database connection
    await prisma.$connect();
    console.log("✅ Connected to database\n");

    // Get all current roles
    const existingRoles = await prisma.role.findMany({
      select: { id: true, name: true },
    });
    console.log(`📋 Found ${existingRoles.length} existing roles\n`);

    let updated = 0;
    let skipped = 0;

    // Update Super Admin / Admin
    try {
      const admin = await prisma.role.update({
        where: { name: "Admin" },
        data: {
          permissions: stringifyPermissions(DEFAULT_ROLES.SUPER_ADMIN.permissions),
        },
      });
      console.log(`✅ Updated Admin role (ID: ${admin.id}) with ${DEFAULT_ROLES.SUPER_ADMIN.permissions.length} permissions`);
      updated++;
    } catch (error) {
      console.log(`⏭️  Admin role not found, skipping`);
      skipped++;
    }

    // Update Super Admin (if exists separately)
    try {
      const superAdmin = await prisma.role.update({
        where: { name: "Super Admin" },
        data: {
          permissions: stringifyPermissions(DEFAULT_ROLES.SUPER_ADMIN.permissions),
        },
      });
      console.log(`✅ Updated Super Admin role (ID: ${superAdmin.id}) with ${DEFAULT_ROLES.SUPER_ADMIN.permissions.length} permissions`);
      updated++;
    } catch (error) {
      console.log(`⏭️  Super Admin role not found, skipping`);
      skipped++;
    }

    // Update other roles
    const roleUpdates = [
      { name: "Manager", roleData: DEFAULT_ROLES.SALES_MANAGER, fallbackName: "Sales Manager" },
      { name: "Sales Manager", roleData: DEFAULT_ROLES.SALES_MANAGER },
      { name: "Sales", roleData: DEFAULT_ROLES.SALES_REP, fallbackName: "Sales Rep" },
      { name: "Sales Rep", roleData: DEFAULT_ROLES.SALES_REP },
      { name: "Warehouse", roleData: DEFAULT_ROLES.INVENTORY_MANAGER, fallbackName: "Inventory Manager" },
      { name: "Inventory Manager", roleData: DEFAULT_ROLES.INVENTORY_MANAGER },
      { name: "Viewer", roleData: DEFAULT_ROLES.VIEWER },
      { name: "Accountant", roleData: DEFAULT_ROLES.ACCOUNTANT },
      { name: "Employee", roleData: DEFAULT_ROLES.VIEWER },
      { name: "TeamLeader", roleData: DEFAULT_ROLES.SALES_MANAGER },
      { name: "Team Leader", roleData: DEFAULT_ROLES.SALES_MANAGER },
    ];

    for (const { name, roleData, fallbackName } of roleUpdates) {
      try {
        const role = await prisma.role.update({
          where: { name },
          data: {
            permissions: stringifyPermissions(roleData.permissions),
          },
        });
        console.log(`✅ Updated ${name} role (ID: ${role.id}) with ${roleData.permissions.length} permissions`);
        updated++;
      } catch (error) {
        if (fallbackName) {
          console.log(`⏭️  ${name} not found, trying ${fallbackName}`);
        } else {
          console.log(`⏭️  ${name} role not found, skipping`);
          skipped++;
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✨ Production role update completed!`);
    console.log(`   ✅ Updated: ${updated} roles`);
    console.log(`   ⏭️  Skipped: ${skipped} roles (not found)`);
    console.log("=".repeat(60));
    console.log("\n🔐 Users must log out and log back in for changes to take effect.\n");

  } catch (error) {
    console.error("\n❌ Error updating production roles:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log("👋 Disconnected from database\n");
  }
}

// Run the update
updateProductionRoles()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
