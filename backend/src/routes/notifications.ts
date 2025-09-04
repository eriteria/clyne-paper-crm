import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /notifications/counts - Get notification counts for navigation badges
 */
router.get("/counts", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get current date for calculations
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Count overdue invoices
    const overdueInvoices = await prisma.invoice.count({
      where: {
        dueDate: {
          lt: today,
        },
        status: {
          in: ["OPEN", "PARTIAL"],
        },
        balance: {
          gt: 0,
        },
      },
    });

    // Count low stock items from InventoryItem
    const lowStockItems = await prisma.inventoryItem.count({
      where: {
        currentQuantity: {
          lte: 10, // Use fixed threshold since there's no lowStockThreshold field
        },
      },
    });

    // Count pending customer approvals - using customers created recently without invoices
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const pendingCustomers = await prisma.customer.count({
      where: {
        createdAt: {
          gte: oneWeekAgo,
        },
        invoices: {
          none: {}, // Customers with no invoices yet (might need approval)
        },
      },
    });

    // Count recent payments needing review (payments from today)
    const recentPayments = await prisma.customerPayment.count({
      where: {
        paymentDate: {
          gte: today,
        },
        status: "COMPLETED",
      },
    });

    // Count users needing activation (admin only)
    let inactiveUsers = 0;
    if (userRole === "Admin" || userRole === "ADMIN") {
      inactiveUsers = await prisma.user.count({
        where: {
          isActive: false,
        },
      });
    }

    // Count total available credits
    const availableCredits = await prisma.credit.count({
      where: {
        status: "ACTIVE",
        availableAmount: {
          gt: 0,
        },
      },
    });

    // Count invoices due in next 7 days
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingDueInvoices = await prisma.invoice.count({
      where: {
        dueDate: {
          gte: today,
          lte: nextWeek,
        },
        status: {
          in: ["OPEN", "PARTIAL"],
        },
        balance: {
          gt: 0,
        },
      },
    });

    const notificationCounts = {
      dashboard: overdueInvoices + lowStockItems + pendingCustomers,
      customers: pendingCustomers,
      products: 0, // Can add new products needing review
      inventory: lowStockItems,
      invoices: overdueInvoices + upcomingDueInvoices,
      payments: availableCredits > 0 ? availableCredits : 0,
      financial: overdueInvoices, // Financial issues
      users: inactiveUsers,
      teams: 0, // Can add team-related notifications
      settings: 0, // Can add system alerts
      admin: inactiveUsers + pendingCustomers,
    };

    res.json({
      success: true,
      data: notificationCounts,
      meta: {
        overdueInvoices,
        lowStockItems,
        pendingCustomers,
        recentPayments,
        inactiveUsers,
        availableCredits,
        upcomingDueInvoices,
      },
    });
  } catch (error) {
    console.error("Error fetching notification counts:", error);
    res.status(500).json({
      error: "Failed to fetch notification counts",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /notifications/details/:module - Get detailed notifications for a specific module
 */
router.get(
  "/details/:module",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { module } = req.params;
      const userId = req.user!.id;

      let notifications: any[] = [];

      switch (module) {
        case "dashboard":
          // Get top priority notifications for dashboard
          const overdueInvoices = await prisma.invoice.findMany({
            where: {
              dueDate: { lt: new Date() },
              status: { in: ["OPEN", "PARTIAL"] },
              balance: { gt: 0 },
            },
            include: {
              customer: {
                select: { name: true, companyName: true },
              },
            },
            orderBy: { dueDate: "asc" },
            take: 5,
          });

          notifications = overdueInvoices.map((invoice) => ({
            id: invoice.id,
            type: "overdue_invoice",
            title: `Overdue Invoice: ${invoice.invoiceNumber}`,
            message: `${invoice.customer.name} - Due ${new Date(invoice.dueDate!).toLocaleDateString()}`,
            priority: "high",
            createdAt: invoice.dueDate,
            data: invoice,
          }));
          break;

        case "inventory":
          // Get low stock items from InventoryItem table, not Product
          const lowStockItems = await prisma.inventoryItem.findMany({
            where: {
              currentQuantity: { lte: 10 }, // You can make this configurable
            },
            orderBy: { currentQuantity: "asc" },
            take: 10,
          });

          notifications = lowStockItems.map((item) => ({
            id: item.id,
            type: "low_stock",
            title: `Low Stock Alert: ${item.name}`,
            message: `Only ${item.currentQuantity} units remaining`,
            priority:
              item.currentQuantity.toNumber() === 0 ? "critical" : "medium",
            createdAt: new Date(),
            data: item,
          }));
          break;

        case "payments":
          const availableCredits = await prisma.credit.findMany({
            where: {
              status: "ACTIVE",
              availableAmount: { gt: 0 },
            },
            include: {
              customer: {
                select: { name: true, companyName: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          notifications = availableCredits.map((credit) => ({
            id: credit.id,
            type: "available_credit",
            title: `Available Credit: ${credit.customer.name}`,
            message: `₦${credit.availableAmount} credit available`,
            priority: "low",
            createdAt: credit.createdAt,
            data: credit,
          }));
          break;

        default:
          notifications = [];
      }

      res.json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      console.error("Error fetching notification details:", error);
      res.status(500).json({
        error: "Failed to fetch notification details",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
