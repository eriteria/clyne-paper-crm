const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function migrateCustomerLocations() {
  try {
    console.log("Starting customer location migration...");

    // First, get all locations
    const locations = await prisma.location.findMany();
    console.log(
      "Available locations:",
      locations.map((l) => `${l.name} (${l.id})`)
    );

    if (locations.length === 0) {
      console.log("No locations found. Creating a default location...");
      const defaultLocation = await prisma.location.create({
        data: {
          name: "Main Office",
          description: "Default location for existing customers",
          isActive: true,
        },
      });
      locations.push(defaultLocation);
    }

    // Get the first location as default
    const defaultLocationId = locations[0].id;
    console.log(
      `Using default location: ${locations[0].name} (${defaultLocationId})`
    );

    // Get customers with null locationId
    const customersWithoutLocation = await prisma.customer.findMany({
      where: {
        locationId: null,
      },
      select: {
        id: true,
        name: true,
        location: true, // old location field
      },
    });

    console.log(
      `Found ${customersWithoutLocation.length} customers without locationId`
    );

    // Update customers to use the default location
    if (customersWithoutLocation.length > 0) {
      const updateResult = await prisma.customer.updateMany({
        where: {
          locationId: null,
        },
        data: {
          locationId: defaultLocationId,
        },
      });

      console.log(
        `Updated ${updateResult.count} customers with default location`
      );
    }

    // For customers that have the old 'location' field, try to match them to actual locations
    const customersWithOldLocation = await prisma.customer.findMany({
      where: {
        location: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        location: true,
        locationId: true,
      },
    });

    console.log(
      `Found ${customersWithOldLocation.length} customers with old location field`
    );

    for (const customer of customersWithOldLocation) {
      // Try to find a matching location by name
      const matchingLocation = locations.find(
        (loc) =>
          loc.name.toLowerCase().includes(customer.location.toLowerCase()) ||
          customer.location.toLowerCase().includes(loc.name.toLowerCase())
      );

      if (matchingLocation && customer.locationId !== matchingLocation.id) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { locationId: matchingLocation.id },
        });
        console.log(
          `Updated customer ${customer.name}: "${customer.location}" -> ${matchingLocation.name}`
        );
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateCustomerLocations();
