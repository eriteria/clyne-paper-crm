import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function initializeInvoiceBalances() {
  console.log("Initializing invoice balances...");

  try {
    // Find all invoices without balance or with zero balance
    const invoices = await prisma.invoice.findMany({
      where: {
        balance: { lte: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        status: true,
        balance: true,
      },
    });

    console.log(`Found ${invoices.length} invoices to update`);

    // Update invoices in batches to avoid overwhelming the database
    for (const invoice of invoices) {
      // Set balance to total amount and update status if needed
      const newStatus =
        invoice.status === "COMPLETED"
          ? "OPEN"
          : invoice.status === "DRAFT"
            ? "DRAFT"
            : invoice.status;

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          balance: invoice.totalAmount,
          status: newStatus,
        },
      });

      console.log(
        `Updated invoice ${invoice.invoiceNumber} - Balance: ${invoice.totalAmount}, Status: ${newStatus}`
      );
    }

    console.log(`✅ Successfully updated ${invoices.length} invoices`);

    // Also update any invoices with COMPLETED status to OPEN (since they may have outstanding balances)
    const completedInvoices = await prisma.invoice.updateMany({
      where: {
        status: "COMPLETED",
        balance: { gt: 0 },
      },
      data: {
        status: "OPEN",
      },
    });

    console.log(
      `✅ Updated ${completedInvoices.count} completed invoices to OPEN status`
    );
  } catch (error) {
    console.error("❌ Error initializing invoice balances:", error);
  } finally {
    await prisma.$disconnect();
  }
}

initializeInvoiceBalances();
