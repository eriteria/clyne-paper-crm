import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkExistingLocations() {
  try {
    console.log("Checking existing customer locations...");

    // Get all unique locations from customers
    const customers = await prisma.customer.findMany({
      where: {
        location: {
          not: null,
        },
      },
      select: {
        location: true,
      },
    });

    const locations = [
      ...new Set(customers.map((c) => c.location).filter(Boolean)),
    ];

    console.log(`Found ${locations.length} unique locations:`);
    locations.forEach((location, index) => {
      console.log(`${index + 1}. ${location}`);
    });

    const customerCount = await prisma.customer.count();
    const customersWithLocation = await prisma.customer.count({
      where: {
        location: {
          not: null,
        },
      },
    });

    console.log(`\nTotal customers: ${customerCount}`);
    console.log(`Customers with location: ${customersWithLocation}`);
    console.log(
      `Customers without location: ${customerCount - customersWithLocation}`
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingLocations();
