const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function migrateTeamLocations() {
  try {
    console.log("Starting team-location data migration...");

    // Since the location_id column was dropped, we need to check if there's any way to recover this data
    // For now, let's just create a default assignment for existing teams

    // Get all teams
    const teams = await prisma.team.findMany();
    console.log(`Found ${teams.length} teams`);

    // Get all locations
    const locations = await prisma.location.findMany({
      where: { isActive: true },
    });
    console.log(`Found ${locations.length} active locations`);

    if (locations.length === 0) {
      console.log(
        "No active locations found. Cannot assign teams to locations."
      );
      return;
    }

    // For each team without location assignments, assign them to the first available location
    // In a real scenario, you would want to maintain this data properly
    for (const team of teams) {
      const existingAssignments = await prisma.teamLocation.count({
        where: { teamId: team.id },
      });

      if (existingAssignments === 0) {
        // Assign to the first location as default
        await prisma.teamLocation.create({
          data: {
            teamId: team.id,
            locationId: locations[0].id,
          },
        });
        console.log(
          `Assigned team "${team.name}" to location "${locations[0].name}"`
        );
      }
    }

    console.log("Team-location migration completed successfully!");
  } catch (error) {
    console.error("Error during team-location migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateTeamLocations();
