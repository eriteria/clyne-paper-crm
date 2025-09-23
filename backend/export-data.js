const { PrismaClient } = require("@prisma/client");
const fs = require("fs").promises;
const path = require("path");

const prisma = new PrismaClient();

async function exportData() {
  try {
    console.log("🚀 Starting data export from local database...");

    // Export all data in the correct order (respecting foreign key dependencies)
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        source: "local-dev",
        version: "1.0.0",
      },
      roles: [],
      regions: [],
      teams: [],
      users: [],
      customers: [],
      inventoryItems: [],
      waybills: [],
      waybillItems: [],
      invoices: [],
      invoiceItems: [],
      auditLogs: [],
    };

    // Export Roles
    console.log("📋 Exporting roles...");
    exportData.roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
    });
    console.log(`  ✅ Exported ${exportData.roles.length} roles`);

    // Export Regions
    console.log("🌍 Exporting regions...");
    exportData.regions = await prisma.region.findMany({
      orderBy: { name: "asc" },
    });
    console.log(`  ✅ Exported ${exportData.regions.length} regions`);

    // Export Teams
    console.log("👥 Exporting teams...");
    exportData.teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
    });
    console.log(`  ✅ Exported ${exportData.teams.length} teams`);

    // Export Users (excluding passwords for security, we'll handle separately)
    console.log("👤 Exporting users...");
    const users = await prisma.user.findMany({
      orderBy: { email: "asc" },
    });
    exportData.users = users.map((user) => ({
      ...user,
      // Keep password hash for migration but mark it clearly
      originalPasswordHash: user.passwordHash,
    }));
    console.log(`  ✅ Exported ${exportData.users.length} users`);

    // Export Customers
    console.log("🏢 Exporting customers...");
    exportData.customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
    });
    console.log(`  ✅ Exported ${exportData.customers.length} customers`);

    // Export Inventory Items
    console.log("📦 Exporting inventory items...");
    exportData.inventoryItems = await prisma.inventoryItem.findMany({
      orderBy: { name: "asc" },
    });
    console.log(
      `  ✅ Exported ${exportData.inventoryItems.length} inventory items`
    );

    // Export Waybills
    console.log("📄 Exporting waybills...");
    exportData.waybills = await prisma.waybill.findMany({
      orderBy: { createdAt: "asc" },
    });
    console.log(`  ✅ Exported ${exportData.waybills.length} waybills`);

    // Export Waybill Items
    console.log("📋 Exporting waybill items...");
    exportData.waybillItems = await prisma.waybillItem.findMany({
      orderBy: { id: "asc" },
    });
    console.log(
      `  ✅ Exported ${exportData.waybillItems.length} waybill items`
    );

    // Export Invoices
    console.log("💰 Exporting invoices...");
    exportData.invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: "asc" },
    });
    console.log(`  ✅ Exported ${exportData.invoices.length} invoices`);

    // Export Invoice Items
    console.log("💳 Exporting invoice items...");
    exportData.invoiceItems = await prisma.invoiceItem.findMany({
      orderBy: { id: "asc" },
    });
    console.log(
      `  ✅ Exported ${exportData.invoiceItems.length} invoice items`
    );

    // Export Audit Logs (optional - might be large)
    console.log("📊 Exporting audit logs...");
    exportData.auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000, // Limit to last 1000 entries to avoid huge files
    });
    console.log(
      `  ✅ Exported ${exportData.auditLogs.length} audit logs (limited to last 1000)`
    );

    // Save to file
    const exportPath = path.join(__dirname, `data-export-${Date.now()}.json`);
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`\n✅ Data export completed successfully!`);
    console.log(`📁 Export file: ${exportPath}`);
    console.log(`📊 Summary:`);
    console.log(`   - Roles: ${exportData.roles.length}`);
    console.log(`   - Regions: ${exportData.regions.length}`);
    console.log(`   - Teams: ${exportData.teams.length}`);
    console.log(`   - Users: ${exportData.users.length}`);
    console.log(`   - Customers: ${exportData.customers.length}`);
    console.log(`   - Inventory Items: ${exportData.inventoryItems.length}`);
    console.log(`   - Waybills: ${exportData.waybills.length}`);
    console.log(`   - Waybill Items: ${exportData.waybillItems.length}`);
    console.log(`   - Invoices: ${exportData.invoices.length}`);
    console.log(`   - Invoice Items: ${exportData.invoiceItems.length}`);
    console.log(`   - Audit Logs: ${exportData.auditLogs.length}`);

    return exportPath;
  } catch (error) {
    console.error("❌ Export failed:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run export if called directly
if (require.main === module) {
  exportData().catch(console.error);
}

module.exports = { exportData };
