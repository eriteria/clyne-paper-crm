const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixSingleInvoicesWithSuffix() {
  try {
    console.log("Fixing single invoices that still have suffixes...");

    // Find all invoices with suffixes (pattern: XXXX-2, XXXX-3, etc.)
    const invoicesWithSuffix = await prisma.invoice.findMany({
      where: {
        invoiceNumber: {
          contains: "-",
        },
      },
      orderBy: {
        invoiceNumber: "asc",
      },
    });

    console.log(`Found ${invoicesWithSuffix.length} invoices with suffixes`);

    for (const invoice of invoicesWithSuffix) {
      // Extract base number (remove -X suffix)
      const baseNumber = invoice.invoiceNumber.replace(/-\d+$/, "");

      // Check if base number is already taken
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: baseNumber,
          id: { not: invoice.id },
        },
      });

      if (!existingInvoice) {
        // Base number is available, use it
        console.log(`Changing ${invoice.invoiceNumber} to ${baseNumber}`);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { invoiceNumber: baseNumber },
        });
      } else {
        console.log(
          `Base number ${baseNumber} is taken, keeping ${invoice.invoiceNumber}`
        );
      }
    }

    console.log("Single invoice suffix cleanup completed!");
  } catch (error) {
    console.error("Error fixing single invoices with suffix:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSingleInvoicesWithSuffix();
