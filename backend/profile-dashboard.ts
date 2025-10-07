const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function profileDashboardQueries() {
  console.log("🔍 Profiling dashboard queries...\n");

  const startTotal = Date.now();

  // Test 1: Basic counts (should be fast with proper indexes)
  console.log("📊 Testing basic counts...");
  const countStart = Date.now();

  const [
    totalUsers,
    activeUsers,
    totalInventoryItems,
    totalInvoices,
    pendingInvoices,
    totalWaybills,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.inventoryItem.count(),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: "pending" } }),
    prisma.waybill.count(),
  ]);

  const countTime = Date.now() - countStart;
  console.log(`   ✅ Basic counts: ${countTime}ms`);
  console.log(`   📈 Users: ${totalUsers} (${activeUsers} active)`);
  console.log(`   📦 Inventory: ${totalInventoryItems}`);
  console.log(`   📄 Invoices: ${totalInvoices} (${pendingInvoices} pending)`);
  console.log(`   🚚 Waybills: ${totalWaybills}`);

  // Test 2: Low stock count (potentially slow)
  console.log("\n⚠️ Testing low stock count...");
  const lowStockStart = Date.now();

  const lowStockCount = await prisma.inventoryItem.count({
    where: {
      currentQuantity: {
        lte: prisma.inventoryItem.fields.minStock,
      },
    },
  });

  const lowStockTime = Date.now() - lowStockStart;
  console.log(`   ✅ Low stock count: ${lowStockTime}ms`);
  console.log(`   ⚠️ Low stock items: ${lowStockCount}`);

  // Test 3: Inventory value calculation (potentially very slow)
  console.log("\n💰 Testing inventory value calculation...");
  const invValueStart = Date.now();

  const inventoryValue = await prisma.inventoryItem.aggregate({
    _sum: {
      unitPrice: true,
    },
  });

  const invValueTime = Date.now() - invValueStart;
  console.log(`   ✅ Inventory value: ${invValueTime}ms`);
  console.log(`   💰 Total value: $${inventoryValue._sum.unitPrice || 0}`);

  // Test 4: Historical inventory value (likely the slowest)
  console.log("\n📈 Testing historical inventory value...");
  const histStart = Date.now();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const previousInventoryValue = await prisma.inventoryItem.aggregate({
    where: {
      updatedAt: {
        lte: thirtyDaysAgo,
      },
    },
    _sum: {
      unitPrice: true,
    },
  });

  const histTime = Date.now() - histStart;
  console.log(`   ✅ Historical inventory value: ${histTime}ms`);
  console.log(
    `   📈 Previous value: $${previousInventoryValue._sum.unitPrice || 0}`
  );

  // Test 5: Teams with counts
  console.log("\n👥 Testing teams query...");
  const teamsStart = Date.now();

  const teamsWithCounts = await prisma.team.findMany({
    include: {
      locations: {
        include: {
          location: true,
        },
      },
      _count: {
        select: { members: true },
      },
    },
  });

  const teamsTime = Date.now() - teamsStart;
  console.log(`   ✅ Teams query: ${teamsTime}ms`);
  console.log(`   👥 Teams found: ${teamsWithCounts.length}`);

  // Test 6: Low stock items query
  console.log("\n📦 Testing low stock items...");
  const lowStockItemsStart = Date.now();

  const lowStockItems = await prisma.inventoryItem.findMany({
    where: {
      currentQuantity: {
        lte: prisma.inventoryItem.fields.minStock,
      },
    },
    include: {
      location: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      currentQuantity: "asc",
    },
    take: 5,
  });

  const lowStockItemsTime = Date.now() - lowStockItemsStart;
  console.log(`   ✅ Low stock items: ${lowStockItemsTime}ms`);
  console.log(`   📦 Items found: ${lowStockItems.length}`);

  const totalTime = Date.now() - startTotal;
  console.log(`\n🏁 Total dashboard time: ${totalTime}ms`);

  // Identify the slowest queries
  const queryTimes = [
    { name: "Basic Counts", time: countTime },
    { name: "Low Stock Count", time: lowStockTime },
    { name: "Inventory Value", time: invValueTime },
    { name: "Historical Value", time: histTime },
    { name: "Teams Query", time: teamsTime },
    { name: "Low Stock Items", time: lowStockItemsTime },
  ];

  queryTimes.sort((a, b) => b.time - a.time);

  console.log("\n🐌 Slowest queries:");
  queryTimes.forEach((query, index) => {
    const emoji = index === 0 ? "🔥" : index === 1 ? "⚠️" : "✅";
    console.log(`   ${emoji} ${query.name}: ${query.time}ms`);
  });

  await prisma.$disconnect();
}

profileDashboardQueries().catch(console.error);
