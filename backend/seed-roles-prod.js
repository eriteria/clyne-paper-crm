/**
 * Production Role Seeder Script
 * Creates default roles in production database
 * Run with: node seed-roles-prod.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Default roles with permissions
const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    name: "Super Admin",
    description: "Full system access",
    permissions: ["*"], // All permissions
  },
  ADMIN: {
    name: "Admin",
    description: "Administrative access",
    permissions: [
      "users:*",
      "teams:*",
      "regions:*",
      "roles:*",
      "customers:*",
      "invoices:*",
      "inventory:*",
      "waybills:*",
      "reports:*",
      "financial:*",
      "audit:view",
    ],
  },
  SALES_MANAGER: {
    name: "Sales Manager",
    description: "Manage sales team and operations",
    permissions: [
      "customers:view",
      "customers:create",
      "customers:edit",
      "invoices:view",
      "invoices:create",
      "invoices:edit",
      "payments:view",
      "payments:create",
      "reports:view",
      "teams:view",
      "inventory:view",
    ],
  },
  SALES_REP: {
    name: "Sales Representative",
    description: "Create and manage sales",
    permissions: [
      "customers:view",
      "customers:create",
      "invoices:view",
      "invoices:create",
      "payments:view",
      "payments:create",
      "inventory:view",
    ],
  },
  ACCOUNTANT: {
    name: "Accountant",
    description: "Financial operations",
    permissions: [
      "customers:view",
      "invoices:view",
      "invoices:edit",
      "payments:view",
      "payments:create",
      "payments:edit",
      "reports:view",
      "financial:*",
      "audit:view",
    ],
  },
  WAREHOUSE_MANAGER: {
    name: "Warehouse Manager",
    description: "Manage inventory and waybills",
    permissions: ["inventory:*", "waybills:*", "reports:view"],
  },
  VIEWER: {
    name: "Viewer",
    description: "Read-only access",
    permissions: [
      "customers:view",
      "invoices:view",
      "payments:view",
      "inventory:view",
      "reports:view",
    ],
  },
};

async function seedRoles() {
  console.log("🌱 Seeding default roles in production...\n");

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
          permissions: JSON.stringify(roleData.permissions),
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
