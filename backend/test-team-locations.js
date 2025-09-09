const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testTeamLocations() {
  try {
    // Test if we can query teams with the new locations relationship
    const teams = await prisma.team.findMany({
      include: {
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    console.log("Teams with locations:", JSON.stringify(teams, null, 2));
  } catch (error) {
    console.error("Error testing team locations:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testTeamLocations();
