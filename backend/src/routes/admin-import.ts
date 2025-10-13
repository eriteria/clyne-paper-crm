import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

/**
 * Admin Import Routes
 * Allows admins to trigger Google Sheets import from the API
 */

/**
 * @route POST /api/admin-import/google-sheets
 * @desc Trigger Google Sheets import (Admin only)
 * @access Private (Admin)
 */
router.post("/google-sheets", authenticate, async (req: Request, res: Response) => {
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
    const { runFullImport } = await import("../scripts/import-from-google-sheets");

    // Run the import in the background
    res.status(202).json({
      message: "Import started successfully",
      note: "This may take several minutes. Check server logs for progress.",
    });

    // Run import after response is sent
    runFullImport()
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
 * @desc Check import service status
 * @access Private (Admin)
 */
router.get("/status", authenticate, async (req: Request, res: Response) => {
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

export default router;
