const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkStatusValues() {
  try {
    console.log("Checking invoice status values...");

    // Get distinct status values
    const result = await prisma.invoice.findMany({
      select: { status: true },
      take: 20,
    });

    const statusValues = [...new Set(result.map((r) => r.status))];
    console.log("Status values found:", statusValues);

    // Count by status
    for (const status of statusValues) {
      const count = await prisma.invoice.count({
        where: { status },
      });
      console.log(`${status}: ${count} invoices`);
    }

    // Check what the statistics endpoint would find
    const completedCount = await prisma.invoice.count({
      where: { status: "COMPLETED" },
    });

    const completedRevenue = await prisma.invoice.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalAmount: true },
    });

    console.log("\nTesting corrected status filters:");
    console.log(`status: "COMPLETED": ${completedCount} invoices`);
    console.log(
      `Revenue from COMPLETED invoices: ₦${(completedRevenue._sum.totalAmount || 0).toLocaleString()}`
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatusValues();
