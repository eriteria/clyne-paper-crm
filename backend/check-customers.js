const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      select: { id: true, name: true },
    });
    console.log("Existing customers:", customers);

    // Check if our test customers exist
    const testCustomers = [
      "Clyne Paper Nigeria Limited",
      "Test Customer Ltd",
      "European Partner GmbH",
    ];

    testCustomers.forEach((name) => {
      const exists = customers.some((c) => c.name === name);
      console.log(`${name}: ${exists ? "EXISTS" : "NOT FOUND"}`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomers();
