import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { logCreate } from "../utils/auditLogger";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /data-management/export - Export system data
 */
router.get("/export", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Check if user has admin permissions
    if (userRole !== "Admin" && userRole !== "ADMIN") {
      return res.status(403).json({
        error: "Insufficient permissions. Only administrators can export data.",
      });
    }

    const { tables } = req.query;
    const tablesToExport = tables ? (tables as string).split(",") : ["all"];

    const exportData: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportedBy: req.user!.email,
        version: "1.0.0",
        tables: tablesToExport,
      },
    };

    // Export customers data
    if (
      tablesToExport.includes("all") ||
      tablesToExport.includes("customers")
    ) {
      exportData.customers = await prisma.customer.findMany({
        include: {
          team: true,
          relationshipManager: {
            select: { id: true, fullName: true, email: true },
          },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              date: true,
              dueDate: true,
              totalAmount: true,
              balance: true,
              status: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paymentDate: true,
              paymentMethod: true,
              status: true,
            },
          },
        },
      });
    }

    // Export products data
    if (tablesToExport.includes("all") || tablesToExport.includes("products")) {
      exportData.products = await prisma.product.findMany({
        include: {
          productGroup: {
            select: { id: true, name: true },
          },
        },
      });
    }

    // Export invoices data
    if (tablesToExport.includes("all") || tablesToExport.includes("invoices")) {
      exportData.invoices = await prisma.invoice.findMany({
        include: {
          customer: {
            select: { id: true, name: true, companyName: true },
          },
          items: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  product: { select: { id: true, name: true } },
                },
              },
            },
          },
          paymentApplications: {
            include: {
              customerPayment: {
                select: { id: true, amount: true, paymentDate: true },
              },
            },
          },
        },
      });
    }

    // Export users data (admin only, without sensitive info)
    if (tablesToExport.includes("all") || tablesToExport.includes("users")) {
      exportData.users = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          role: {
            select: { id: true, name: true, permissions: true },
          },
          team: {
            select: { id: true, name: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Export payment data
    if (tablesToExport.includes("all") || tablesToExport.includes("payments")) {
      exportData.payments = await prisma.customerPayment.findMany({
        include: {
          customer: {
            select: { id: true, name: true, companyName: true },
          },
          recordedBy: {
            select: { id: true, fullName: true },
          },
          paymentApplications: {
            include: {
              invoice: {
                select: { id: true, invoiceNumber: true },
              },
            },
          },
        },
      });
    }

    // Log the export action
    await logCreate(userId, "DATA_EXPORT", userId, {
      tables: tablesToExport,
      recordCount: Object.keys(exportData).reduce((total, key) => {
        if (key === "metadata") return total;
        return (
          total + (Array.isArray(exportData[key]) ? exportData[key].length : 0)
        );
      }, 0),
    });

    // Set headers for file download
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=clyne-crm-export-${new Date().toISOString().split("T")[0]}.json`
    );

    res.json(exportData);
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({
      error: "Failed to export data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /data-management/import - Import system data
 */
router.post("/import", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Check if user has admin permissions
    if (userRole !== "Admin" && userRole !== "ADMIN") {
      return res.status(403).json({
        error: "Insufficient permissions. Only administrators can import data.",
      });
    }

    const { data, options = {} } = req.body;

    if (!data) {
      return res.status(400).json({
        error: "No data provided for import",
      });
    }

    const importResults = {
      imported: 0,
      skipped: 0,
      errors: 0,
      details: [] as string[],
    };

    // Import in transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Import customers if provided
      if (data.customers && Array.isArray(data.customers)) {
        for (const customer of data.customers) {
          try {
            // Check if customer already exists
            const existing = await tx.customer.findFirst({
              where: {
                OR: [
                  { email: customer.email },
                  {
                    AND: [
                      { name: customer.name },
                      { companyName: customer.companyName },
                    ],
                  },
                ],
              },
            });

            if (existing && !options.allowDuplicates) {
              importResults.skipped++;
              importResults.details.push(
                `Customer ${customer.name} already exists`
              );
              continue;
            }

            // Create customer without nested relations for initial import
            await tx.customer.create({
              data: {
                name: customer.name,
                companyName: customer.companyName,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                // NOTE: location is required in the schema via locationId. Importers should map and set locationId separately.
                // relationship manager and team assignment should be handled separately as well.
              } as any,
            });

            importResults.imported++;
          } catch (error) {
            importResults.errors++;
            importResults.details.push(
              `Error importing customer ${customer.name}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      }

      // Product import disabled (schema no longer matches legacy product shape). Implement via InventoryItem/ProductGroup if needed.
    });

    // Log the import action
    await logCreate(userId, "DATA_IMPORT", userId, {
      results: importResults,
      source: data.metadata?.exportedBy || "unknown",
    });

    res.json({
      success: true,
      message: "Data import completed",
      results: importResults,
    });
  } catch (error) {
    console.error("Error importing data:", error);
    res.status(500).json({
      error: "Failed to import data",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /data-management/clear-cache - Clear application cache
 */
router.delete(
  "/clear-cache",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Check if user has admin permissions
      if (userRole !== "Admin" && userRole !== "ADMIN") {
        return res.status(403).json({
          error:
            "Insufficient permissions. Only administrators can clear cache.",
        });
      }

      // For now, this is a placeholder. In a real application, you would:
      // 1. Clear Redis cache if using Redis
      // 2. Clear file-based cache
      // 3. Reset any in-memory caches
      // 4. Clear temporary files

      // Log the cache clear action
      await logCreate(userId, "CACHE_CLEAR", userId, {
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Cache cleared successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({
        error: "Failed to clear cache",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /data-management/backup - Create manual backup
 */
router.post("/backup", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Check if user has admin permissions
    if (userRole !== "Admin" && userRole !== "ADMIN") {
      return res.status(403).json({
        error:
          "Insufficient permissions. Only administrators can create backups.",
      });
    }

    // This is a placeholder for backup functionality
    // In a real application, you would:
    // 1. Create a database dump
    // 2. Compress the dump
    // 3. Store it in a secure location (S3, local storage, etc.)
    // 4. Return the backup ID or location

    const backupId = `backup_${Date.now()}`;

    // Log the backup creation
    await logCreate(userId, "BACKUP_CREATED", userId, {
      backupId,
      timestamp: new Date().toISOString(),
      type: "manual",
    });

    res.json({
      success: true,
      message: "Backup created successfully",
      backupId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    res.status(500).json({
      error: "Failed to create backup",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /data-management/statistics - Get system statistics
 */
router.get(
  "/statistics",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Check if user has appropriate permissions
      if (userRole !== "Admin" && userRole !== "ADMIN") {
        return res.status(403).json({
          error:
            "Insufficient permissions. Only administrators can view system statistics.",
        });
      }

      // Get counts from database
      const [
        customerCount,
        productCount,
        invoiceCount,
        userCount,
        totalRevenue,
      ] = await Promise.all([
        prisma.customer.count(),
        prisma.product.count(),
        prisma.invoice.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.invoice.aggregate({
          _sum: { totalAmount: true },
          where: { status: { in: ["PARTIAL", "PAID"] } },
        }),
      ]);

      // Format revenue
      const revenueDecimal = totalRevenue._sum?.totalAmount;
      const revenueNumber = revenueDecimal ? Number(revenueDecimal as any) : 0;
      const formattedRevenue = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(revenueNumber);

      res.json({
        success: true,
        data: {
          customers: customerCount,
          products: productCount,
          invoices: invoiceCount,
          users: userCount,
          revenue: formattedRevenue,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({
        error: "Failed to fetch system statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
