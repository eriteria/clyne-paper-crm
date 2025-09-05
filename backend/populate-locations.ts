import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function populateLocationsFromCustomers() {
  try {
    console.log("🌍 Starting location population from customer data...");

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

    const uniqueLocations = [
      ...new Set(customers.map((c) => c.location).filter(Boolean)),
    ] as string[];

    console.log(
      `Found ${uniqueLocations.length} unique locations from customers`
    );

    // Create locations in the Location table
    const createdLocations = [];
    for (const locationName of uniqueLocations) {
      try {
        const location = await prisma.location.upsert({
          where: { name: locationName },
          update: {},
          create: {
            name: locationName,
            description: `Location created from customer data: ${locationName}`,
            isActive: true,
          },
        });
        createdLocations.push(location);
        console.log(`✅ Created/found location: ${location.name}`);
      } catch (error) {
        console.error(`❌ Error creating location ${locationName}:`, error);
      }
    }

    console.log(
      `\n📊 Created ${createdLocations.length} locations in the database`
    );

    // Now update customers to reference the location IDs
    console.log("\n🔗 Updating customer records with location references...");

    let updatedCustomers = 0;
    for (const location of createdLocations) {
      const result = await prisma.customer.updateMany({
        where: {
          location: location.name,
          locationId: null, // Only update customers that don't already have locationId
        },
        data: {
          locationId: location.id,
        },
      });

      console.log(
        `✅ Updated ${result.count} customers for location: ${location.name}`
      );
      updatedCustomers += result.count;
    }

    console.log(
      `\n🎉 Successfully updated ${updatedCustomers} customers with location references`
    );

    // Summary report
    console.log("\n📋 Final Summary:");
    const locationStats = await prisma.location.findMany({
      include: {
        _count: {
          select: {
            customers: true,
          },
        },
      },
    });

    locationStats.forEach((location) => {
      console.log(
        `📍 ${location.name}: ${location._count.customers} customers`
      );
    });

    const totalCustomersWithLocationRef = await prisma.customer.count({
      where: {
        locationId: {
          not: null,
        },
      },
    });

    console.log(
      `\n✨ Total customers with location reference: ${totalCustomersWithLocationRef}`
    );
  } catch (error) {
    console.error("❌ Error populating locations:", error);
  } finally {
    await prisma.$disconnect();
  }
}

populateLocationsFromCustomers();
