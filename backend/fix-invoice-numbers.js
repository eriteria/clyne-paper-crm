const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixDuplicateInvoiceNumbers() {
  try {
    console.log("🔍 Checking for duplicate invoice numbers...");

    // Find all invoices with their counts
    const invoiceCounts = await prisma.$queryRaw`
      SELECT invoice_number, COUNT(*) as count 
      FROM invoices 
      GROUP BY invoice_number 
      HAVING COUNT(*) > 1
      ORDER BY invoice_number
    `;

    console.log(`Found ${invoiceCounts.length} duplicate invoice numbers`);

    if (invoiceCounts.length === 0) {
      console.log("✅ No duplicate invoice numbers found!");
      return;
    }

    for (const duplicate of invoiceCounts) {
      console.log(
        `\n🔧 Fixing duplicate invoice number: ${duplicate.invoice_number} (${duplicate.count} copies)`
      );

      // Get all invoices with this number, ordered by creation date
      const invoices = await prisma.invoice.findMany({
        where: { invoiceNumber: duplicate.invoice_number },
        orderBy: { createdAt: "asc" },
      });

      // Keep the first one, renumber the rest
      for (let i = 1; i < invoices.length; i++) {
        const invoice = invoices[i];

        // Generate a new unique number
        const timestamp = Date.now();
        const newNumber = `${parseInt(duplicate.invoice_number) + 1000 + i}`;

        console.log(
          `  📝 Updating invoice ID ${invoice.id}: ${duplicate.invoice_number} → ${newNumber}`
        );

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { invoiceNumber: newNumber },
        });
      }
    }

    console.log("\n✅ Fixed all duplicate invoice numbers!");

    // Show the highest invoice number now
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    });

    console.log(
      `📊 Latest invoice number: ${lastInvoice?.invoiceNumber || "None"}`
    );
  } catch (error) {
    console.error("❌ Error fixing invoice numbers:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicateInvoiceNumbers();
