import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { sendNotification, updateNotification } from "./notifications";

const router = Router();
const prisma = new PrismaClient();

/**
 * Admin Import Routes
 * Allows admins to trigger Google Sheets import from the API
 */

/**
 * @route POST /api/admin-import/google-sheets
 * @desc Trigger Google Sheets import for production data
 * @access Private (Admin)
 */
router.post("/google-sheets", authenticate, async (req: any, res) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });

    if (!user || user.role.name !== "Admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only admins can trigger imports",
      });
    }

    // Import the function dynamically to avoid loading it on every request
    const { runFullImport, setNotificationSender, setNotificationUpdater } = await import(
      "../scripts/import-from-google-sheets"
    );

    // Set up notification sender and updater
    setNotificationSender(sendNotification);
    setNotificationUpdater(updateNotification);

    // Run the import in the background
    res.status(202).json({
      message: "Import started successfully",
      note: "You'll receive real-time notifications as the import progresses.",
    });

    // Send initial notification
    sendNotification(
      req.user.id,
      "info",
      "Import Started",
      "Google Sheets import has begun. This may take several minutes.",
      { stage: "started" }
    );

    // Run import after response is sent with userId
    runFullImport(req.user.id)
      .then(() => {
        console.log("✅ Admin-triggered import completed successfully");
      })
      .catch((error) => {
        console.error("❌ Admin-triggered import failed:", error);
      });
  } catch (error: any) {
    console.error("Error triggering import:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * @route GET /api/admin-import/status
 * @desc Check import status and counts
 * @access Private (Admin)
 */
router.get("/status", authenticate, async (req: any, res) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });

    if (!user || user.role.name !== "Admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only admins can check import status",
      });
    }

    // Check if Google credentials are configured
    const hasCredentials = !!(
      process.env.GOOGLE_CREDENTIALS_BASE64 ||
      require("fs").existsSync(
        require("path").join(__dirname, "../../google-credentials.json")
      )
    );

    // Get data counts
    const [productGroups, products, customers, invoices, payments] =
      await Promise.all([
        prisma.productGroup.count(),
        prisma.product.count(),
        prisma.customer.count(),
        prisma.invoice.count(),
        prisma.customerPayment.count(),
      ]);

    res.json({
      status: "ready",
      credentials: hasCredentials ? "configured" : "missing",
      database: {
        productGroups,
        products,
        customers,
        invoices,
        payments,
      },
    });
  } catch (error: any) {
    console.error("Error checking import status:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * @route POST /api/admin-import/fix-payment-allocations
 * @desc Fix allocatedAmount and creditAmount for existing payments
 * @access Private (Admin)
 */
router.post("/fix-payment-allocations", authenticate, async (req: any, res) => {
  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });

    if (!user || user.role.name !== "Admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only admins can trigger fixes",
      });
    }

    // Import the function dynamically
    const { fixPaymentAllocations } = await import(
      "../scripts/fix-payment-allocations"
    );

    // Run the fix in the background
    res.status(202).json({
      message: "Payment allocation fix started successfully",
      note: "This may take a few minutes. Check notifications for progress.",
    });

    // Run fix after response is sent (pass userId for notifications)
    fixPaymentAllocations(req.user.id)
      .then((result) => {
        console.log("✅ Payment allocation fix completed successfully", result);
      })
      .catch((error) => {
        console.error("❌ Payment allocation fix failed:", error);
      });
  } catch (error: any) {
    console.error("Error triggering payment allocation fix:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

export default router;
