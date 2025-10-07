const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkFactoryMapping() {
  console.log("🔍 Checking Factory team and location mappings...");

  // Check locations
  const locations = await prisma.location.findMany();
  console.log("\n📍 All Locations:");
  locations.forEach((loc) => {
    console.log(`  ID: ${loc.id}, Name: "${loc.name}"`);
  });

  // Check teams
  const teams = await prisma.team.findMany();
  console.log("\n👥 All Teams:");
  teams.forEach((team) => {
    console.log(`  ID: ${team.id}, Name: "${team.name}"`);
  });

  // Check team-location mappings
  const teamLocations = await prisma.teamLocation.findMany({
    include: {
      team: true,
      location: true,
    },
  });

  console.log("\n🔗 TeamLocation mappings:");
  teamLocations.forEach((tl) => {
    console.log(`  "${tl.team.name}" ↔ "${tl.location.name}"`);
  });

  // Find Factory location
  const factoryLocation = await prisma.location.findFirst({
    where: { name: "Factory" },
  });

  console.log("\n🏭 Factory Location Details:");
  console.log(factoryLocation);

  // Find Factory team
  const factoryTeam = await prisma.team.findFirst({
    where: { name: "Factory" },
  });

  console.log("\n🏭 Factory Team Details:");
  console.log(factoryTeam);

  // Check if there should be a mapping
  if (factoryLocation && factoryTeam) {
    const mapping = await prisma.teamLocation.findFirst({
      where: {
        teamId: factoryTeam.id,
        locationId: factoryLocation.id,
      },
    });

    console.log("\n🔗 Factory Team ↔ Factory Location mapping:");
    console.log(mapping);

    if (!mapping) {
      console.log(
        "\n❌ Missing mapping! Creating Factory Team ↔ Factory Location mapping..."
      );

      const newMapping = await prisma.teamLocation.create({
        data: {
          teamId: factoryTeam.id,
          locationId: factoryLocation.id,
        },
      });

      console.log("✅ Created mapping:", newMapping);
    }
  }

  await prisma.$disconnect();
}

checkFactoryMapping().catch(console.error);
