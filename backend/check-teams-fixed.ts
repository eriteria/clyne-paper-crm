import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTeamsAndLocations() {
  try {
    console.log("🔍 Checking Teams...");
    const teams = await prisma.team.findMany({
      include: {
        locations: {
          include: {
            location: true,
          },
        },
        _count: {
          select: {
            members: true,
            customers: true,
          },
        },
      },
    });

    console.log(`✅ Found ${teams.length} teams:`);
    teams.forEach((team) => {
      console.log(`  📍 ${team.name}`);
      console.log(`     Description: ${team.description || "None"}`);
      console.log(`     Members: ${team._count.members}`);
      console.log(`     Customers: ${team._count.customers}`);
      console.log(
        `     Locations: ${team.locations.map((tl) => tl.location.name).join(", ") || "None"}`
      );
      console.log("");
    });

    console.log("🔍 Checking Team-Location Mappings...");
    const teamLocations = await prisma.teamLocation.findMany({
      include: {
        team: true,
        location: true,
      },
    });

    console.log(`✅ Found ${teamLocations.length} team-location mappings:`);
    teamLocations.forEach((mapping) => {
      console.log(`  🔗 ${mapping.team.name} ↔ ${mapping.location.name}`);
    });

    console.log("🔍 Checking Customers without teams...");
    const customersWithoutTeams = await prisma.customer.count({
      where: { teamId: null },
    });

    console.log(`⚠️  Found ${customersWithoutTeams} customers without teams`);

    console.log("🔍 Checking total customers...");
    const totalCustomers = await prisma.customer.count();
    console.log(`📊 Total customers: ${totalCustomers}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeamsAndLocations();
