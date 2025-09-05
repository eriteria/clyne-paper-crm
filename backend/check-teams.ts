import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTeams() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        location: true,
        _count: { select: { members: true } },
      },
    });

    console.log("✅ Teams in database:");
    teams.forEach((team) => {
      console.log(
        `  - ${team.name} (Location: ${team.location.name}) - ${team._count.members} members`
      );
    });
  } catch (error) {
    console.error("❌ Error checking teams:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeams();
