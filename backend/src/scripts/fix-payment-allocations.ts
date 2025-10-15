import { PrismaClient, Prisma } from "@prisma/client";
import { sendNotification, updateNotification } from "../routes/notifications";

const prisma = new PrismaClient();

/**
 * Fix allocatedAmount and creditAmount for existing customer payments
 *
 * This script:
 * 1. Finds all payments with allocatedAmount = 0 and creditAmount = 0
 * 2. Calculates correct values based on payment applications and credits
 * 3. Updates the payment records
 */
async function fixPaymentAllocations(userId?: string) {
  console.log("🔧 Fixing payment allocations...\n");

  // Send initial notification if userId provided
  let notificationId: string | undefined;
  if (userId) {
    notificationId = `fix-payments-${Date.now()}`;
    sendNotification(
      userId,
      "progress",
      "Payment Allocation Fix Started",
      "Scanning for payments that need fixing...",
      {
        phase: 1,
        totalPhases: 3,
        progress: 0,
      }
    );
  }

  try {
    // Get all payments that need fixing
    const payments = await prisma.customerPayment.findMany({
      where: {
        OR: [{ allocatedAmount: 0 }, { creditAmount: 0 }],
      },
      include: {
        paymentApplications: true,
      },
    });

    console.log(`Found ${payments.length} payments to process\n`);

    // Update notification with count
    if (userId && notificationId) {
      updateNotification(
        notificationId,
        userId,
        "progress",
        "Payment Allocation Fix In Progress",
        `Found ${payments.length} payments to process`,
        {
          phase: 2,
          totalPhases: 3,
          progress: 10,
          totalPayments: payments.length,
        }
      );
    }

    let fixed = 0;
    let skipped = 0;

    for (const payment of payments) {
      try {
        // Calculate allocated amount from payment applications
        const totalAllocated = payment.paymentApplications.reduce(
          (sum, app) => sum.add(app.amountApplied),
          new Prisma.Decimal(0)
        );

        // Calculate credit amount from credits sourced from this payment
        const credits = await prisma.credit.findMany({
          where: { sourcePaymentId: payment.id },
        });

        const totalCredit = credits.reduce(
          (sum, credit) => sum.add(credit.amount),
          new Prisma.Decimal(0)
        );

        // Handle imported payments with no applications or credits
        // These are "completed" payments that should count toward totalPaid
        let finalAllocatedAmount = totalAllocated;
        let finalCreditAmount = totalCredit;

        if (
          payment.paymentApplications.length === 0 &&
          credits.length === 0 &&
          payment.status === "COMPLETED"
        ) {
          // This is a standalone payment (likely from import)
          // The full amount should be counted as "allocated" for ledger purposes
          finalAllocatedAmount = payment.amount;
          console.log(
            `  ℹ️  Payment ${payment.id} has no applications/credits - treating full amount as allocated: ₦${payment.amount.toNumber().toLocaleString()}`
          );
        } // Check if update is needed
        const needsUpdate =
          !payment.allocatedAmount.equals(finalAllocatedAmount) ||
          !payment.creditAmount.equals(finalCreditAmount);

        if (needsUpdate) {
          await prisma.customerPayment.update({
            where: { id: payment.id },
            data: {
              allocatedAmount: finalAllocatedAmount,
              creditAmount: finalCreditAmount,
            },
          });

          console.log(
            `✓ Fixed payment ${payment.id}: allocated=₦${finalAllocatedAmount.toNumber().toLocaleString()}, credit=₦${finalCreditAmount.toNumber().toLocaleString()}`
          );
          fixed++;
        } else {
          skipped++;
        }

        // Update progress notification every 10 payments
        if (userId && notificationId && (fixed + skipped) % 10 === 0) {
          const progress = Math.floor(
            10 + ((fixed + skipped) / payments.length) * 80
          );
          updateNotification(
            notificationId,
            userId,
            "progress",
            "Payment Allocation Fix In Progress",
            `Processing payments: ${fixed} fixed, ${skipped} already correct`,
            {
              phase: 2,
              totalPhases: 3,
              progress,
              fixed,
              skipped,
              totalPayments: payments.length,
            }
          );
        }
      } catch (error: any) {
        console.error(`✗ Error fixing payment ${payment.id}:`, error.message);
      }
    }

    console.log(`\n✅ Completed!`);
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Skipped (already correct): ${skipped}`);
    console.log(`  Total processed: ${payments.length}`);

    // Send completion notification
    if (userId && notificationId) {
      updateNotification(
        notificationId,
        userId,
        "success",
        "Payment Allocation Fix Completed",
        `Successfully fixed ${fixed} payments. ${skipped} were already correct.`,
        {
          phase: 3,
          totalPhases: 3,
          progress: 100,
          summary: {
            fixed,
            skipped,
            totalProcessed: payments.length,
          },
        }
      );
    }

    return { fixed, skipped, totalProcessed: payments.length };
  } catch (error) {
    console.error("Fatal error:", error);

    // Send error notification
    if (userId && notificationId) {
      updateNotification(
        notificationId,
        userId,
        "error",
        "Payment Allocation Fix Failed",
        error instanceof Error ? error.message : "An unexpected error occurred",
        {
          phase: 2,
          totalPhases: 3,
          progress: 0,
        }
      );
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  fixPaymentAllocations()
    .then(() => {
      console.log("\n🎉 Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

export { fixPaymentAllocations };
