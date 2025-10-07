const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkInvoiceTeamAssignments() {
  console.log("🔍 Checking invoice team assignments...");

  // Check total invoices
  const totalInvoices = await prisma.invoice.count();
  console.log(`📄 Total invoices in database: ${totalInvoices}`);

  // Check invoices with teamId
  const invoicesWithTeam = await prisma.invoice.count({
    where: {
      teamId: {
        not: null,
      },
    },
  });
  console.log(`📄 Invoices with teamId: ${invoicesWithTeam}`);

  // Check invoices without teamId
  const invoicesWithoutTeam = await prisma.invoice.count({
    where: {
      teamId: null,
    },
  });
  console.log(`⚠️ Invoices without teamId: ${invoicesWithoutTeam}`);

  // Sample some invoices
  const sampleInvoices = await prisma.invoice.findMany({
    take: 5,
    select: {
      id: true,
      invoiceNumber: true,
      customerId: true,
      teamId: true,
      customer: {
        select: {
          name: true,
          teamId: true,
        },
      },
    },
  });

  console.log("\n📄 Sample invoices:");
  sampleInvoices.forEach((invoice) => {
    console.log(
      `  ${invoice.invoiceNumber}: Customer teamId=${invoice.customer.teamId}, Invoice teamId=${invoice.teamId}`
    );
  });

  await prisma.$disconnect();
}

checkInvoiceTeamAssignments().catch(console.error);
