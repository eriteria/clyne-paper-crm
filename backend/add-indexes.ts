const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function addPerformanceIndexes() {
  console.log("🚀 Adding performance indexes for dashboard optimization...\n");

  const indexes = [
    {
      name: "users_active_idx",
      sql: "CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);",
      description: "Index for active user queries",
    },
    {
      name: "invoices_status_idx",
      sql: "CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);",
      description: "Index for invoice status queries (most critical)",
    },
    {
      name: "inventory_stock_idx",
      sql: "CREATE INDEX IF NOT EXISTS idx_inventory_stock_comparison ON inventory_items(current_quantity, min_stock);",
      description: "Index for low stock comparisons",
    },
    {
      name: "inventory_location_idx",
      sql: "CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_items(location_id);",
      description: "Index for inventory location joins",
    },
    {
      name: "users_team_idx",
      sql: "CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);",
      description: "Index for team member counts",
    },
    {
      name: "invoices_balance_status_idx",
      sql: "CREATE INDEX IF NOT EXISTS idx_invoices_balance_status ON invoices(balance, status);",
      description: "Composite index for outstanding payments",
    },
  ];

  for (const index of indexes) {
    try {
      console.log(`📊 Creating ${index.description}...`);
      await prisma.$executeRawUnsafe(index.sql);
      console.log(`   ✅ ${index.name} created successfully`);
    } catch (error) {
      console.log(
        `   ⚠️ ${index.name} may already exist or failed: ${error.message}`
      );
    }
  }

  console.log("\n🔍 Verifying indexes...");

  try {
    const indexCheck = await prisma.$queryRawUnsafe(`
      SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
      FROM pg_indexes 
      WHERE tablename IN ('users', 'invoices', 'inventory_items', 'customers', 'waybills')
          AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `);

    console.log(`   📈 Found ${indexCheck.length} performance indexes`);
    indexCheck.forEach((idx) => {
      console.log(`   📍 ${idx.tablename}.${idx.indexname}`);
    });
  } catch (error) {
    console.log(`   ⚠️ Could not verify indexes: ${error.message}`);
  }

  console.log("\n🎉 Index optimization complete!");
  console.log("💡 Dashboard queries should now be significantly faster.");

  await prisma.$disconnect();
}

addPerformanceIndexes().catch(console.error);
