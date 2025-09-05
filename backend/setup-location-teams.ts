import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupLocationTeams() {
  try {
    console.log("🔄 Setting up teams for locations...");

    // Get all locations
    const locations = await prisma.location.findMany();
    console.log(`Found ${locations.length} locations`);

    // Delete existing teams (they are tied to old regions)
    const existingTeams = await prisma.team.findMany();
    console.log(`Found ${existingTeams.length} existing teams to clean up`);

    // Delete existing teams
    await prisma.team.deleteMany();
    console.log("✅ Cleaned up existing teams");

    // Create teams for each location
    for (const location of locations) {
      const team = await prisma.team.create({
        data: {
          name: location.name, // Use exact location name as requested
          description: `Team for ${location.name}`,
          locationId: location.id,
        },
      });

      console.log(
        `✅ Created team "${team.name}" for location "${location.name}"`
      );
    }

    // Show final state
    const teams = await prisma.team.findMany({
      include: {
        location: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    console.log("\n🎉 Team setup complete!");
    console.log("Teams created:");
    teams.forEach((team) => {
      console.log(
        `  - ${team.name} (Location: ${team.location.name}) - ${team._count.members} members`
      );
    });
  } catch (error) {
    console.error("❌ Error setting up teams:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupLocationTeams()
  .then(() => {
    console.log("✅ Team setup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Team setup failed:", error);
    process.exit(1);
  });
