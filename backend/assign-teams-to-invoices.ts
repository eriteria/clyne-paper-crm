const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function assignTeamsToInvoices() {
  console.log("🔄 Starting team assignment for invoices...");

  // Get all invoices without teamId
  const invoicesWithoutTeam = await prisma.invoice.findMany({
    where: {
      teamId: null,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          teamId: true,
        },
      },
    },
  });

  console.log(`📊 Found ${invoicesWithoutTeam.length} invoices without teams`);

  let assigned = 0;
  let unassigned = 0;

  for (const invoice of invoicesWithoutTeam) {
    if (invoice.customer.teamId) {
      // Update invoice with customer's teamId
      await prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          teamId: invoice.customer.teamId,
        },
      });
      assigned++;

      if (assigned % 100 === 0) {
        console.log(`✅ Assigned ${assigned} invoices...`);
      }
    } else {
      console.log(
        `⚠️ No team for customer "${invoice.customer.name}" (Invoice: ${invoice.invoiceNumber})`
      );
      unassigned++;
    }
  }

  console.log("\\n🎉 Team assignment completed!");
  console.log(`✅ Assigned: ${assigned} invoices`);
  console.log(`⚠️ Unassigned: ${unassigned} invoices`);

  // Verify results
  const verifyAssigned = await prisma.invoice.count({
    where: {
      teamId: {
        not: null,
      },
    },
  });

  const verifyUnassigned = await prisma.invoice.count({
    where: {
      teamId: null,
    },
  });

  console.log("\\n🔍 Verification:");
  console.log(`  📊 Invoices with teams: ${verifyAssigned}`);
  console.log(`  ⚠️ Invoices without teams: ${verifyUnassigned}`);

  await prisma.$disconnect();
}

assignTeamsToInvoices().catch(console.error);
