const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function analyzeInvoiceNumbers() {
  try {
    // Find all invoices with patterns like "XXXX-2", "XXXX-3", etc.
    const allInvoices = await prisma.invoice.findMany({
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        customerId: true,
        totalAmount: true,
        date: true,
      },
      orderBy: {
        invoiceNumber: "asc",
      },
    });

    console.log(`Total invoices found: ${allInvoices.length}`);

    // Find invoices with incremented numbers (pattern: XXXX-2, XXXX-3, etc.)
    const incrementedInvoices = allInvoices.filter((invoice) =>
      /-\d+$/.test(invoice.invoiceNumber)
    );

    console.log(
      `Invoices with incremented numbers: ${incrementedInvoices.length}`
    );

    // Group by base invoice number
    const groups = {};

    incrementedInvoices.forEach((invoice) => {
      const baseNumber = invoice.invoiceNumber.replace(/-\d+$/, "");
      if (!groups[baseNumber]) {
        groups[baseNumber] = [];
      }
      groups[baseNumber].push(invoice);
    });

    // Also check if base numbers exist as standalone invoices
    Object.keys(groups).forEach((baseNumber) => {
      const baseInvoice = allInvoices.find(
        (inv) => inv.invoiceNumber === baseNumber
      );
      if (baseInvoice) {
        groups[baseNumber].unshift(baseInvoice);
      }
    });

    console.log("Invoice groups that need fixing:");
    Object.keys(groups).forEach((baseNumber) => {
      const group = groups[baseNumber];
      const uniqueCustomers = [
        ...new Set(group.map((inv) => inv.customerName)),
      ];

      console.log(`\nBase Number: ${baseNumber}`);
      console.log(`  Total variations: ${group.length}`);
      console.log(`  Unique customers: ${uniqueCustomers.length}`);
      console.log(`  Customers: ${uniqueCustomers.join(", ")}`);

      group.forEach((inv) => {
        console.log(
          `    ${inv.invoiceNumber} - ${inv.customerName} - ₦${inv.totalAmount}`
        );
      });
    });

    return groups;
  } catch (error) {
    console.error("Error analyzing invoice numbers:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeInvoiceNumbers();
