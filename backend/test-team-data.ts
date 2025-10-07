const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testTeamEndpoint() {
  console.log("🔍 Testing team endpoint data...");

  // Get first team
  const firstTeam = await prisma.team.findFirst();
  if (!firstTeam) {
    console.log("❌ No teams found");
    return;
  }

  console.log(`📋 Testing with team: ${firstTeam.name} (ID: ${firstTeam.id})`);

  // Test the team query similar to API endpoint
  const team = await prisma.team.findUnique({
    where: { id: firstTeam.id },
    include: {
      locations: {
        include: {
          location: true,
        },
      },
      leader: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
      members: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { fullName: "asc" },
      },
      customers: {
        select: {
          id: true,
          name: true,
          locationRef: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          balance: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  console.log("\n📊 Team Data Results:");
  console.log(`  👥 Members: ${team?.members?.length || 0}`);
  console.log(`  🏢 Customers: ${team?.customers?.length || 0}`);
  console.log(`  📄 Invoices: ${team?.invoices?.length || 0}`);

  if (team?.invoices && team.invoices.length > 0) {
    console.log("\n📄 Sample Invoices:");
    team.invoices.slice(0, 3).forEach((invoice) => {
      console.log(
        `  - ${invoice.invoiceNumber}: $${invoice.totalAmount} (Balance: $${invoice.balance}) [${invoice.status}]`
      );
    });
  } else {
    console.log("\n⚠️ No invoices found for this team");
  }

  // Test outstanding payments calculation
  const outstandingPayments = await prisma.invoice.aggregate({
    where: {
      teamId: firstTeam.id,
      balance: {
        gt: 0,
      },
      status: {
        not: "CANCELLED",
      },
    },
    _sum: {
      balance: true,
    },
  });

  console.log(
    `\n💰 Outstanding Payments: $${outstandingPayments._sum.balance || 0}`
  );

  // Check if there are invoices with this team
  const totalInvoices = await prisma.invoice.count({
    where: {
      teamId: firstTeam.id,
    },
  });

  console.log(`\n📈 Total invoices for team: ${totalInvoices}`);

  await prisma.$disconnect();
}

testTeamEndpoint().catch(console.error);
