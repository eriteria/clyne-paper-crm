import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function assignTeamsToCustomers() {
  try {
    console.log("🔄 Starting team assignment for existing customers...");

    // Get all customers without teams
    const customersWithoutTeams = await prisma.customer.findMany({
      where: { teamId: null },
      include: {
        locationRef: true,
      },
    });

    console.log(
      `📊 Found ${customersWithoutTeams.length} customers without teams`
    );

    let assigned = 0;
    let unassigned = 0;

    for (const customer of customersWithoutTeams) {
      if (!customer.locationId) {
        console.log(
          `⚠️  Customer ${customer.name} has no location, skipping...`
        );
        unassigned++;
        continue;
      }

      // Find team assigned to this location
      const teamLocation = await prisma.teamLocation.findFirst({
        where: { locationId: customer.locationId },
        include: { team: true },
      });

      if (teamLocation) {
        // Update customer with team assignment
        await prisma.customer.update({
          where: { id: customer.id },
          data: { teamId: teamLocation.team.id },
        });

        console.log(
          `✅ Assigned customer "${customer.name}" (${customer.locationRef?.name}) to team "${teamLocation.team.name}"`
        );
        assigned++;
      } else {
        console.log(
          `⚠️  No team found for location "${customer.locationRef?.name}" for customer "${customer.name}"`
        );
        unassigned++;
      }
    }

    console.log("");
    console.log("🎉 Team assignment completed!");
    console.log(`✅ Assigned: ${assigned} customers`);
    console.log(`⚠️  Unassigned: ${unassigned} customers`);

    // Verify the results
    console.log("");
    console.log("🔍 Verification - Teams with customer counts:");
    const teamsWithCounts = await prisma.team.findMany({
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });

    teamsWithCounts.forEach((team) => {
      console.log(`  📍 ${team.name}: ${team._count.customers} customers`);
    });
  } catch (error) {
    console.error("❌ Error assigning teams:", error);
  } finally {
    await prisma.$disconnect();
  }
}

assignTeamsToCustomers();
