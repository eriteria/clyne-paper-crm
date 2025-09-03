const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function createTestCustomers() {
  try {
    const testCustomers = [
      {
        name: "Clyne Paper Nigeria Limited",
        email: "info@clynepaper.ng",
        phone: "+234-801-234-5678",
        address: "123 Industrial Area, Lagos, Nigeria",
        type: "BUSINESS",
      },
      {
        name: "Test Customer Ltd",
        email: "contact@testcustomer.com",
        phone: "+1-555-0123",
        address: "456 Business District, New York, USA",
        type: "BUSINESS",
      },
      {
        name: "European Partner GmbH",
        email: "info@europeanpartner.de",
        phone: "+49-30-12345678",
        address: "789 Business Straße, Berlin, Germany",
        type: "BUSINESS",
      },
    ];

    for (const customer of testCustomers) {
      const existing = await prisma.customer.findFirst({
        where: { name: customer.name },
      });

      if (!existing) {
        const created = await prisma.customer.create({
          data: customer,
        });
        console.log(`Created customer: ${created.name} (ID: ${created.id})`);
      } else {
        console.log(`Customer already exists: ${customer.name}`);
      }
    }

    console.log("Test customers setup complete!");
  } catch (error) {
    console.error("Error creating test customers:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCustomers();
