const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkPayments() {
  try {
    console.log("Checking payments in database...");

    // Check total payment count
    const paymentCount = await prisma.payment.count();
    console.log(`Total payments: ${paymentCount}`);

    // Check recent payments
    const recentPayments = await prisma.payment.findMany({
      take: 5,
      orderBy: { paymentDate: "desc" },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
        recordedBy: {
          select: {
            fullName: true,
          },
        },
      },
    });

    console.log(`Recent payments found: ${recentPayments.length}`);
    recentPayments.forEach((payment) => {
      console.log(
        `- Payment ID: ${payment.id}, Amount: ${payment.amount}, Date: ${payment.paymentDate}`
      );
    });

    // Check if there are invoices to make payments for
    const invoiceCount = await prisma.invoice.count();
    console.log(`Total invoices: ${invoiceCount}`);

    if (invoiceCount > 0 && paymentCount === 0) {
      console.log(
        "Found invoices but no payments. Consider creating test payment data."
      );
    }
  } catch (error) {
    console.error("Error checking payments:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPayments();
