const { PrismaClient } = require("@prisma/client");
const fs = require("fs").promises;
const path = require("path");

const prisma = new PrismaClient();

async function importData(importFilePath, options = {}) {
  const {
    clearExistingData = false,
    skipAuditLogs = false,
    skipUsers = false,
    preserveProductionAdmin = true,
  } = options;

  try {
    console.log("🚀 Starting data import to production database...");

    // Read import file
    const importDataRaw = await fs.readFile(importFilePath, "utf-8");
    const importData = JSON.parse(importDataRaw);

    console.log(`📁 Import file: ${importFilePath}`);
    console.log(`📅 Export date: ${importData.metadata?.exportDate}`);
    console.log(`📊 Data summary:`);
    console.log(`   - Roles: ${importData.roles?.length || 0}`);
    console.log(`   - Regions: ${importData.regions?.length || 0}`);
    console.log(`   - Teams: ${importData.teams?.length || 0}`);
    console.log(`   - Users: ${importData.users?.length || 0}`);
    console.log(`   - Customers: ${importData.customers?.length || 0}`);
    console.log(
      `   - Inventory Items: ${importData.inventoryItems?.length || 0}`
    );
    console.log(`   - Waybills: ${importData.waybills?.length || 0}`);
    console.log(`   - Invoices: ${importData.invoices?.length || 0}`);

    // Backup existing admin if preserving
    let productionAdmin = null;
    if (preserveProductionAdmin) {
      productionAdmin = await prisma.user.findFirst({
        where: { email: "admin@clynepaper.com" },
        include: { role: true },
      });
      console.log(`🔒 Production admin backed up: ${productionAdmin?.email}`);
    }

    // Clear existing data if requested
    if (clearExistingData) {
      console.log("🗑️ Clearing existing data...");

      // Delete in reverse dependency order
      await prisma.auditLog.deleteMany({});
      await prisma.invoiceItem.deleteMany({});
      await prisma.invoice.deleteMany({});
      await prisma.waybillItem.deleteMany({});
      await prisma.waybill.deleteMany({});
      await prisma.inventoryItem.deleteMany({});
      await prisma.customer.deleteMany({});

      if (!preserveProductionAdmin) {
        await prisma.user.deleteMany({});
      } else {
        await prisma.user.deleteMany({
          where: {
            NOT: { email: "admin@clynepaper.com" },
          },
        });
      }

      await prisma.team.deleteMany({});
      await prisma.region.deleteMany({});

      if (!preserveProductionAdmin) {
        await prisma.role.deleteMany({});
      } else {
        // Keep admin role
        await prisma.role.deleteMany({
          where: {
            NOT: { name: "Admin" },
          },
        });
      }

      console.log("✅ Existing data cleared");
    }

    let importStats = {
      roles: 0,
      regions: 0,
      teams: 0,
      users: 0,
      customers: 0,
      inventoryItems: 0,
      waybills: 0,
      waybillItems: 0,
      invoices: 0,
      invoiceItems: 0,
      auditLogs: 0,
      skipped: 0,
    };

    // Import Roles
    if (importData.roles?.length > 0) {
      console.log("📋 Importing roles...");
      for (const role of importData.roles) {
        try {
          await prisma.role.upsert({
            where: { name: role.name },
            update: {
              permissions: role.permissions,
            },
            create: {
              id: role.id,
              name: role.name,
              permissions: role.permissions,
            },
          });
          importStats.roles++;
        } catch (error) {
          console.warn(`  ⚠️ Skipped role ${role.name}: ${error.message}`);
          importStats.skipped++;
        }
      }
      console.log(`  ✅ Imported ${importStats.roles} roles`);
    }

    // Import Regions
    if (importData.regions?.length > 0) {
      console.log("🌍 Importing regions...");
      for (const region of importData.regions) {
        try {
          await prisma.region.upsert({
            where: { name: region.name },
            update: {
              code: region.code,
            },
            create: {
              id: region.id,
              name: region.name,
              code: region.code,
            },
          });
          importStats.regions++;
        } catch (error) {
          console.warn(`  ⚠️ Skipped region ${region.name}: ${error.message}`);
          importStats.skipped++;
        }
      }
      console.log(`  ✅ Imported ${importStats.regions} regions`);
    }

    // Import Teams
    if (importData.teams?.length > 0) {
      console.log("👥 Importing teams...");
      for (const team of importData.teams) {
        try {
          await prisma.team.upsert({
            where: { name: team.name },
            update: {
              description: team.description,
              leaderUserId: team.leaderUserId,
            },
            create: {
              id: team.id,
              name: team.name,
              description: team.description,
              leaderUserId: team.leaderUserId,
            },
          });
          importStats.teams++;
        } catch (error) {
          console.warn(`  ⚠️ Skipped team ${team.name}: ${error.message}`);
          importStats.skipped++;
        }
      }
      console.log(`  ✅ Imported ${importStats.teams} teams`);
    }

    // Import Users (if not skipped)
    if (!skipUsers && importData.users?.length > 0) {
      console.log("👤 Importing users...");
      for (const user of importData.users) {
        try {
          // Skip if preserving admin and this is the admin
          if (
            preserveProductionAdmin &&
            user.email === "admin@clynepaper.com"
          ) {
            console.log(`  🔒 Skipped production admin: ${user.email}`);
            continue;
          }

          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              fullName: user.fullName,
              phone: user.phone,
              passwordHash: user.originalPasswordHash,
              roleId: user.roleId,
              teamId: user.teamId,
              regionId: user.regionId,
              isActive: user.isActive,
            },
            create: {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
              passwordHash: user.originalPasswordHash,
              roleId: user.roleId,
              teamId: user.teamId,
              regionId: user.regionId,
              isActive: user.isActive,
            },
          });
          importStats.users++;
        } catch (error) {
          console.warn(`  ⚠️ Skipped user ${user.email}: ${error.message}`);
          importStats.skipped++;
        }
      }
      console.log(`  ✅ Imported ${importStats.users} users`);
    }

    // Import Customers
    if (importData.customers?.length > 0) {
      console.log("🏢 Importing customers...");
      for (const customer of importData.customers) {
        try {
          await prisma.customer.upsert({
            where: { email: customer.email },
            update: {
              name: customer.name,
              phone: customer.phone,
              address: customer.address,
              city: customer.city,
              state: customer.state,
              relationshipManager: customer.relationshipManager,
              teamId: customer.teamId,
            },
            create: {
              id: customer.id,
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              city: customer.city,
              state: customer.state,
              relationshipManager: customer.relationshipManager,
              teamId: customer.teamId,
            },
          });
          importStats.customers++;
        } catch (error) {
          console.warn(
            `  ⚠️ Skipped customer ${customer.email}: ${error.message}`
          );
          importStats.skipped++;
        }
      }
      console.log(`  ✅ Imported ${importStats.customers} customers`);
    }

    // Import Inventory Items
    if (importData.inventoryItems?.length > 0) {
      console.log("📦 Importing inventory items...");
      for (const item of importData.inventoryItems) {
        try {
          await prisma.inventoryItem.upsert({
            where: { name: item.name },
            update: {
              description: item.description,
              unit: item.unit,
              currentStock: item.currentStock,
              minimumStock: item.minimumStock,
              unitPrice: item.unitPrice,
            },
            create: {
              id: item.id,
              name: item.name,
              description: item.description,
              unit: item.unit,
              currentStock: item.currentStock,
              minimumStock: item.minimumStock,
              unitPrice: item.unitPrice,
            },
          });
          importStats.inventoryItems++;
        } catch (error) {
          console.warn(
            `  ⚠️ Skipped inventory item ${item.name}: ${error.message}`
          );
          importStats.skipped++;
        }
      }
      console.log(
        `  ✅ Imported ${importStats.inventoryItems} inventory items`
      );
    }

    // Import other data (waybills, invoices, etc.) if needed
    // Note: These might have dependencies that need careful handling

    console.log(`\n✅ Data import completed!`);
    console.log(`📊 Import Summary:`);
    console.log(`   ✅ Roles: ${importStats.roles}`);
    console.log(`   ✅ Regions: ${importStats.regions}`);
    console.log(`   ✅ Teams: ${importStats.teams}`);
    console.log(`   ✅ Users: ${importStats.users}`);
    console.log(`   ✅ Customers: ${importStats.customers}`);
    console.log(`   ✅ Inventory Items: ${importStats.inventoryItems}`);
    console.log(`   ⚠️ Skipped: ${importStats.skipped}`);

    if (preserveProductionAdmin && productionAdmin) {
      console.log(`\n🔒 Production admin preserved: ${productionAdmin.email}`);
    }

    return importStats;
  } catch (error) {
    console.error("❌ Import failed:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run import if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const importFilePath = args[0];

  if (!importFilePath) {
    console.error("❌ Please provide import file path");
    console.log("Usage: node import-data.js <path-to-export-file.json>");
    process.exit(1);
  }

  const options = {
    clearExistingData: args.includes("--clear"),
    skipAuditLogs: args.includes("--skip-audit-logs"),
    skipUsers: args.includes("--skip-users"),
    preserveProductionAdmin: !args.includes("--no-preserve-admin"),
  };

  importData(importFilePath, options).catch(console.error);
}

module.exports = { importData };
