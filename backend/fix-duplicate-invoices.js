const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixDuplicateInvoiceNumbers() {
  try {
    console.log("Starting invoice number cleanup...");

    // Get all invoices to analyze
    const allInvoices = await prisma.invoice.findMany({
      include: {
        items: true,
        customer: true,
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

    // Get the highest existing invoice number to start assigning new ones
    const highestInvoiceNumber = Math.max(
      ...allInvoices
        .map((inv) => parseInt(inv.invoiceNumber.replace(/[^\d]/g, "")))
        .filter((num) => !isNaN(num))
    );

    let nextInvoiceNumber = highestInvoiceNumber + 1;

    console.log(`Starting new invoice numbers from: ${nextInvoiceNumber}`);

    // Process each group
    for (const [baseNumber, invoicesInGroup] of Object.entries(groups)) {
      console.log(`\nProcessing base number: ${baseNumber}`);
      console.log(`  Invoices in group: ${invoicesInGroup.length}`);

      // Group by customer
      const customerGroups = {};
      invoicesInGroup.forEach((invoice) => {
        const customerKey = invoice.customerId || invoice.customerName;
        if (!customerGroups[customerKey]) {
          customerGroups[customerKey] = [];
        }
        customerGroups[customerKey].push(invoice);
      });

      const uniqueCustomers = Object.keys(customerGroups);
      console.log(`  Unique customers: ${uniqueCustomers.length}`);

      // If all invoices are for the same customer, combine them into one invoice
      if (uniqueCustomers.length === 1) {
        const customerInvoices = customerGroups[uniqueCustomers[0]];

        if (customerInvoices.length > 1) {
          console.log(
            `    Combining ${customerInvoices.length} invoices for same customer`
          );

          // Keep the first invoice (usually the base number without suffix)
          const primaryInvoice = customerInvoices[0];
          const invoicesToMerge = customerInvoices.slice(1);

          // Move all items from secondary invoices to primary invoice
          for (const secondaryInvoice of invoicesToMerge) {
            console.log(
              `    Moving items from ${secondaryInvoice.invoiceNumber} to ${primaryInvoice.invoiceNumber}`
            );

            // Update invoice items to point to primary invoice
            await prisma.invoiceItem.updateMany({
              where: { invoiceId: secondaryInvoice.id },
              data: { invoiceId: primaryInvoice.id },
            });

            // Delete the secondary invoice
            await prisma.invoice.delete({
              where: { id: secondaryInvoice.id },
            });
          }

          // Recalculate total for primary invoice
          const allItems = await prisma.invoiceItem.findMany({
            where: { invoiceId: primaryInvoice.id },
          });

          const newTotal = allItems.reduce(
            (sum, item) => sum + item.lineTotal,
            0
          );

          await prisma.invoice.update({
            where: { id: primaryInvoice.id },
            data: { totalAmount: newTotal },
          });

          console.log(`    Updated total amount to ₦${newTotal}`);
        }
      }
      // If different customers, assign unique invoice numbers
      else {
        console.log(
          `    Different customers found, assigning unique invoice numbers`
        );

        let customerIndex = 0;
        for (const [customerKey, customerInvoices] of Object.entries(
          customerGroups
        )) {
          // Keep the first customer group with the base number
          if (customerIndex === 0) {
            console.log(
              `    Keeping ${customerInvoices[0].invoiceNumber} for first customer`
            );
          } else {
            // Assign new invoice numbers to subsequent customers
            for (const invoice of customerInvoices) {
              const newInvoiceNumber = nextInvoiceNumber.toString();
              console.log(
                `    Changing ${invoice.invoiceNumber} to ${newInvoiceNumber} for customer: ${invoice.customerName}`
              );

              await prisma.invoice.update({
                where: { id: invoice.id },
                data: { invoiceNumber: newInvoiceNumber },
              });

              nextInvoiceNumber++;
            }
          }
          customerIndex++;
        }
      }
    }

    console.log("\nInvoice number cleanup completed successfully!");
  } catch (error) {
    console.error("Error fixing duplicate invoice numbers:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicateInvoiceNumbers();
