import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { logCreate, logUpdate, logDelete } from "../utils/auditLogger";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import {
  importInvoices,
  importJsonInvoices,
  importFlexibleJsonInvoices,
  getInvoiceImportTemplate,
  getJsonInvoiceImportTemplate,
  getImportStatistics,
  fixDuplicateInvoiceNumbers,
  ExcelInvoiceRow,
  JsonInvoiceRow,
} from "../utils/invoiceImport";

const router = express.Router();

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats
// @access  Private
router.get(
  "/stats",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      const [
        totalInvoices,
        monthlyInvoices,
        yearlyInvoices,
        pendingInvoices,
        completedInvoices,
        totalAmount,
        monthlyAmount,
        completedAmount,
        draftAmount,
      ] = await Promise.all([
        prisma.invoice.count(),
        prisma.invoice.count({
          where: {
            createdAt: {
              gte: startOfMonth,
            },
          },
        }),
        prisma.invoice.count({
          where: {
            createdAt: {
              gte: startOfYear,
            },
          },
        }),
        prisma.invoice.count({
          where: { status: "DRAFT" },
        }),
        prisma.invoice.count({
          where: { status: "COMPLETED" },
        }),
        prisma.invoice.aggregate({
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: {
            createdAt: {
              gte: startOfMonth,
            },
          },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: { status: "COMPLETED" },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: { status: "DRAFT" },
          _sum: { totalAmount: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalInvoices,
          monthlyInvoices,
          yearlyInvoices,
          pendingInvoices,
          completedInvoices,
          totalAmount: totalAmount._sum.totalAmount || 0,
          monthlyAmount: monthlyAmount._sum.totalAmount || 0,
          paidAmount: completedAmount._sum.totalAmount || 0, // Use completed as paid for frontend compatibility
          pendingAmount: draftAmount._sum.totalAmount || 0, // Use draft as pending for frontend compatibility
        },
      });
    } catch (error) {
      logger.error("Error fetching invoice statistics:", error);
      next(error);
    }
  }
);

// @desc    Get next invoice number
// @route   GET /api/invoices/next-number
// @access  Private
router.get(
  "/next-number",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Generate simple sequential invoice number
      const lastInvoice = await prisma.invoice.findFirst({
        orderBy: {
          invoiceNumber: "desc",
        },
        select: {
          invoiceNumber: true,
        },
      });

      let nextInvoiceNumber = "1000"; // Starting number
      if (lastInvoice && lastInvoice.invoiceNumber) {
        // Extract number from existing invoice number
        const lastNumber = parseInt(
          lastInvoice.invoiceNumber.replace(/\D/g, "")
        );
        if (!isNaN(lastNumber)) {
          nextInvoiceNumber = String(lastNumber + 1);
        }
      }

      res.json({
        success: true,
        data: {
          nextInvoiceNumber,
        },
      });
    } catch (error) {
      logger.error("Error getting next invoice number:", error);
      next(error);
    }
  }
);

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
router.get("/", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      dateRange,
      customerName,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: "insensitive" } },
        { customerName: { contains: search as string, mode: "insensitive" } },
        {
          customerContact: { contains: search as string, mode: "insensitive" },
        },
      ];
    }

    if (status) {
      where.status = status as string;
    }

    if (customerName) {
      where.customerName = {
        contains: customerName as string,
        mode: "insensitive",
      };
    }

    // Date range filter
    if (dateRange) {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        default:
          startDate = new Date(0);
      }

      where.createdAt = {
        gte: startDate,
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          billedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limitNum,
      }),
      prisma.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    logger.error("Error fetching invoices:", error);
    next(error);
  }
});

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
router.get(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          billedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unitPrice: true,
                },
              },
            },
          },
        },
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      logger.error("Error fetching invoice:", error);
      next(error);
    }
  }
);

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id
// @access  Private
router.patch(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = [
        "DRAFT",
        "COMPLETED",
        "draft",
        "pending",
        "paid",
        "overdue",
        "cancelled",
      ];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
        });
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: { status },
        include: {
          billedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: invoice,
        message: "Invoice updated successfully",
      });
    } catch (error) {
      logger.error("Error updating invoice:", error);
      next(error);
    }
  }
);

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
router.post("/", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      customerId,
      items,
      notes,
      dueDate,
      taxAmount = 0,
      discountAmount = 0,
    } = req.body;

    // Validation
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invoice items are required",
      });
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Validate due date is not more than 30 days from today
    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
      dueDateObj.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

      const maxDueDate = new Date(today);
      maxDueDate.setDate(today.getDate() + 30);

      if (dueDateObj > maxDueDate) {
        return res.status(400).json({
          success: false,
          message: "Due date cannot be more than 30 days from today",
        });
      }

      if (dueDateObj < today) {
        return res.status(400).json({
          success: false,
          message: "Due date cannot be in the past",
        });
      }
    }

    // Validate inventory items (no stock check - allows selling out of stock items)
    const inventoryChecks = await Promise.all(
      items.map(async (item: any) => {
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
        });

        if (!inventoryItem) {
          throw new Error(
            `Inventory item with ID ${item.inventoryItemId} not found`
          );
        }

        // Note: Removed stock quantity validation to allow selling out of stock items

        return {
          ...item,
          inventoryItem,
          lineTotal: item.quantity * item.unitPrice,
        };
      })
    );

    // Calculate totals
    const subtotal = inventoryChecks.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
    const totalAmount =
      subtotal + parseFloat(taxAmount) - parseFloat(discountAmount);

    // Generate simple sequential invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: {
        invoiceNumber: "desc",
      },
      select: {
        invoiceNumber: true,
      },
    });

    let invoiceNumber = "1000"; // Starting number
    if (lastInvoice && lastInvoice.invoiceNumber) {
      // Extract number from existing invoice number
      const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(/\D/g, ""));
      if (!isNaN(lastNumber)) {
        invoiceNumber = String(lastNumber + 1);
      }
    }

    // Create invoice with transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Use the authenticated user as billed by user
      const billedByUserId = req.user!.id;

      // Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          date: new Date(),
          customerId,
          customerName: customer.name, // For backward compatibility
          customerContact: customer.phone || customer.email, // For backward compatibility
          billedByUserId,
          teamId: req.user!.teamId,
          regionId: req.user!.regionId,
          totalAmount,
          balance: totalAmount, // Initialize balance to total amount
          taxAmount: parseFloat(taxAmount),
          discountAmount: parseFloat(discountAmount),
          notes,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: "DRAFT",
        },
      });

      // Create invoice items, update inventory, and track monthly targets
      const invoiceItems = await Promise.all(
        inventoryChecks.map(async (item) => {
          // Create invoice item
          const invoiceItem = await tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              inventoryItemId: item.inventoryItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            },
          });

          // Update inventory - subtract sold quantity
          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: {
              currentQuantity: {
                decrement: item.quantity,
              },
            },
          });

          // Track monthly target progress for the product
          const inventoryItem = item.inventoryItem;
          if (inventoryItem.productId) {
            // TODO: Fix monthlySalesTarget property name issue
            /*
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1; // JavaScript months are 0-based

            // Update or create monthly sales target record for this user and product
            await tx.monthlySalesTarget.upsert({
              where: {
                monthly_sales_targets_product_user_year_month_key: {
                  productId: inventoryItem.productId,
                  userId: req.user!.id,
                  year,
                  month,
                },
              },
              update: {
                achievedQuantity: {
                  increment: item.quantity,
                },
                achievedAmount: {
                  increment: item.lineTotal,
                },
              },
              create: {
                productId: inventoryItem.productId,
                userId: req.user!.id,
                year,
                month,
                achievedQuantity: item.quantity,
                achievedAmount: item.lineTotal,
              },
            });

            logger.info(
              `Monthly sales target updated for user ${req.user!.id}, product ${inventoryItem.productId}: +${item.quantity} units, +$${item.lineTotal}`
            );
            */
          }

          return invoiceItem;
        })
      );

      return { invoice, invoiceItems };
    });

    // Fetch the complete invoice data
    const completeInvoice = await prisma.invoice.findUnique({
      where: { id: result.invoice.id },
      include: {
        customer: true,
        billedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    // Log invoice creation
    await logCreate(
      req.user!.id,
      "INVOICE",
      result.invoice.id,
      completeInvoice
    );

    res.status(201).json({
      success: true,
      data: completeInvoice,
      message: "Invoice created successfully",
    });
  } catch (error) {
    logger.error("Error creating invoice:", error);

    // Note: Removed insufficient stock error handling since we now allow out-of-stock sales

    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
});

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
router.delete(
  "/:id",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;

      // First delete related invoice items
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Then delete the invoice
      await prisma.invoice.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Invoice deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting invoice:", error);
      next(error);
    }
  }
);

// Invoice Import Routes

// @desc    Import invoices from Excel data
// @route   POST /api/invoices/import
// @access  Private
router.post(
  "/import",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data } = req.body;

      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Excel data is required",
        });
      }

      // Validate data structure
      const requiredHeaders = [
        "Invoice No",
        "Date",
        "Customer",
        "Product",
        "Quantity",
        "Item Unit Price",
        "Item Total Price",
        "Invoice Total",
      ];

      const firstRow = data[0];
      const missingHeaders = requiredHeaders.filter(
        (header) => !(header in firstRow)
      );

      if (missingHeaders.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required headers: ${missingHeaders.join(", ")}`,
        });
      }

      // Import invoices
      const result = await importInvoices(data as ExcelInvoiceRow[]);

      // Log import activity
      await logCreate(req.user!.id, "IMPORT", "INVOICE", {
        totalRows: data.length,
        result: result.results,
      });

      res.json({
        success: true,
        data: result.results,
        message: result.message,
      });
    } catch (error) {
      logger.error("Error importing invoices:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import invoices",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// @desc    Import invoices from JSON data (better currency handling)
// @route   POST /api/invoices/import/json
// @access  Private
router.post(
  "/import/json",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { data } = req.body;

      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({
          success: false,
          message: "JSON data is required",
        });
      }

      // Import invoices using flexible JSON parser (auto-detects format)
      const result = await importFlexibleJsonInvoices(data);

      // Log import activity
      await logCreate(req.user!.id, "IMPORT", "INVOICE_JSON", {
        totalRows: data.length,
        result: result.results,
      });

      res.json({
        success: true,
        data: result.results,
        message: result.message,
      });
    } catch (error) {
      logger.error("Error importing JSON invoices:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import JSON invoices",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// @desc    Get invoice import template
// @route   GET /api/invoices/import/template
// @access  Private
router.get(
  "/import/template",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const template = getInvoiceImportTemplate();

      res.json({
        success: true,
        data: template,
        message:
          "Invoice import template with sample data. All columns are required.",
      });
    } catch (error) {
      logger.error("Error getting import template:", error);
      next(error);
    }
  }
);

// @desc    Get JSON invoice import template (with currency formatting)
// @route   GET /api/invoices/import/json/template
// @access  Private
router.get(
  "/import/json/template",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const template = getJsonInvoiceImportTemplate();

      res.json({
        success: true,
        data: template,
        message:
          "JSON invoice import template with sample data. Supports currency formatting with commas. All fields are required.",
      });
    } catch (error) {
      logger.error("Error getting JSON import template:", error);
      next(error);
    }
  }
);

// @desc    Get import statistics
// @route   GET /api/invoices/import/statistics
// @access  Private
router.get(
  "/import/statistics",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const stats = await getImportStatistics();

      res.json({
        success: true,
        data: stats,
        message: "Import statistics retrieved successfully",
      });
    } catch (error) {
      logger.error("Error getting import statistics:", error);
      next(error);
    }
  }
);

// @desc    Fix duplicate invoice numbers
// @route   POST /api/invoices/fix-duplicates
// @access  Private (Admin only)
router.post(
  "/fix-duplicates",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Note: Consider adding role-based access control here
      // For now, any authenticated user can run this cleanup

      const result = await fixDuplicateInvoiceNumbers();

      // Log the cleanup activity
      await logCreate(req.user!.id, "CLEANUP", "INVOICE_DUPLICATES", {
        result,
      });

      res.json({
        success: true,
        data: result,
        message: "Invoice cleanup completed successfully",
      });
    } catch (error) {
      logger.error("Error running invoice cleanup:", error);
      res.status(500).json({
        success: false,
        message: "Failed to run invoice cleanup",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
