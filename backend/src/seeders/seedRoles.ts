/**
 * Role Seeder Script
 *
 * Creates default roles with appropriate permissions.
 * Safe to run multiple times - will skip existing roles.
 *
 * Usage: npx ts-node src/seeders/seedRoles.ts
 */

import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROLES, stringifyPermissions } from "../utils/permissions";

const prisma = new PrismaClient();

async function seedRoles() {
  console.log("🌱 Seeding default roles...\n");

  let created = 0;
  let skipped = 0;

  for (const [key, roleData] of Object.entries(DEFAULT_ROLES)) {
    try {
      // Check if role already exists
      const existingRole = await prisma.role.findUnique({
        where: { name: roleData.name },
      });

      if (existingRole) {
        console.log(`⏭️  Role "${roleData.name}" already exists, skipping...`);
        skipped++;
        continue;
      }

      // Create role
      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          permissions: stringifyPermissions(roleData.permissions),
        },
      });

      console.log(`✅ Created role: ${role.name}`);
      console.log(
        `   - Permissions: ${roleData.permissions.length} permissions`
      );
      console.log(`   - Description: ${roleData.description}\n`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating role "${roleData.name}":`, error);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✨ Role seeding complete!`);
  console.log(`   Created: ${created} roles`);
  console.log(`   Skipped: ${skipped} roles (already exist)`);
  console.log("=".repeat(50) + "\n");
}

seedRoles()
  .catch((error) => {
    console.error("Fatal error during role seeding:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
