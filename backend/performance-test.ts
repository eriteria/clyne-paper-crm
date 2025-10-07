const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function performanceTest() {
  console.log("🚀 Running performance diagnostics...\n");

  const startTime = Date.now();

  // Test 1: Dashboard stats query (most complex)
  console.log("📊 Testing dashboard stats query...");
  const dashboardStart = Date.now();

  try {
    const [
      totalUsers,
      activeUsers,
      totalInventoryItems,
      lowStockCount,
      totalInvoices,
      pendingInvoices,
      totalWaybills,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.inventoryItem.count(),
      prisma.inventoryItem.count({
        where: {
          currentQuantity: {
            lte: prisma.inventoryItem.fields.minStock,
          },
        },
      }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "OPEN" } }),
      prisma.waybill.count(),
    ]);

    const dashboardTime = Date.now() - dashboardStart;
    console.log(`   ✅ Dashboard stats: ${dashboardTime}ms`);
    console.log(`   📈 Users: ${totalUsers} (${activeUsers} active)`);
    console.log(
      `   📦 Inventory: ${totalInventoryItems} items (${lowStockCount} low stock)`
    );
    console.log(
      `   📄 Invoices: ${totalInvoices} (${pendingInvoices} pending)`
    );
    console.log(`   🚚 Waybills: ${totalWaybills}`);
  } catch (error) {
    console.log(`   ❌ Dashboard stats failed: ${error.message}`);
  }

  // Test 2: Customers query with pagination (common)
  console.log("\n👥 Testing customers query...");
  const customersStart = Date.now();

  try {
    const customers = await prisma.customer.findMany({
      take: 10,
      include: {
        relationshipManager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        locationRef: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    const customersTime = Date.now() - customersStart;
    console.log(`   ✅ Customers query: ${customersTime}ms`);
    console.log(`   📊 Retrieved: ${customers.length} customers`);
  } catch (error) {
    console.log(`   ❌ Customers query failed: ${error.message}`);
  }

  // Test 3: Team query with all includes (recently updated)
  console.log("\n👨‍👩‍👧‍👦 Testing team query...");
  const teamStart = Date.now();

  try {
    const team = await prisma.team.findFirst({
      include: {
        locations: {
          include: {
            location: true,
          },
        },
        leader: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        members: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { fullName: "asc" },
        },
        customers: {
          select: {
            id: true,
            name: true,
            locationRef: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { name: "asc" },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            balance: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    const teamTime = Date.now() - teamStart;
    console.log(`   ✅ Team query: ${teamTime}ms`);
    if (team) {
      console.log(`   📊 Team: ${team.name}`);
      console.log(`   👥 Members: ${team.members?.length || 0}`);
      console.log(`   👨‍💼 Customers: ${team.customers?.length || 0}`);
      console.log(`   📄 Invoices: ${team.invoices?.length || 0}`);
    }
  } catch (error) {
    console.log(`   ❌ Team query failed: ${error.message}`);
  }

  // Test 4: Outstanding payments calculation
  console.log("\n💰 Testing outstanding payments calculation...");
  const outstandingStart = Date.now();

  try {
    const outstandingPayments = await prisma.invoice.aggregate({
      where: {
        balance: {
          gt: 0,
        },
        status: {
          not: "CANCELLED",
        },
      },
      _sum: {
        balance: true,
      },
    });

    const outstandingTime = Date.now() - outstandingStart;
    console.log(`   ✅ Outstanding payments: ${outstandingTime}ms`);
    console.log(
      `   💰 Total outstanding: $${outstandingPayments._sum.balance || 0}`
    );
  } catch (error) {
    console.log(`   ❌ Outstanding payments failed: ${error.message}`);
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n🏁 Total test time: ${totalTime}ms`);

  // Database connection info
  console.log("\n🔍 Database info:");
  console.log(
    `   📍 Connection: ${process.env.DATABASE_URL ? "Configured" : "Missing"}`
  );

  await prisma.$disconnect();
}

performanceTest().catch(console.error);
