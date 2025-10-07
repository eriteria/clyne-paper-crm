import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { logCreate, logUpdate, logDelete } from "../utils/auditLogger";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import PDFDocument = require("pdfkit");
import {
  ExcelInvoiceRow,
  fixDuplicateInvoiceNumbers,
  getImportStatistics,
  getInvoiceImportTemplate,
  getJsonInvoiceImportTemplate,
  importFlexibleJsonInvoices,
  importInvoices,
} from "../utils/invoiceImport";

const router = express.Router();

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
      startDate,
      endDate,
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

    // Date range filter - handle both preset ranges and custom dates
    if (startDate && endDate) {
      // Custom date range
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    } else if (dateRange) {
      // Preset date range
      const now = new Date();
      let filterStartDate: Date;

      switch (dateRange) {
        case "today":
          filterStartDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          filterStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "quarter":
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          filterStartDate = new Date(now.getFullYear(), quarterStart, 1);
          break;
        default:
          filterStartDate = new Date(0);
      }

      where.createdAt = {
        gte: filterStartDate,
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

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats
// @access  Private
router.get(
  "/stats",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { search, status, dateRange, startDate, endDate, customerName } =
        req.query;

      // Build filters (same logic as main route)
      const where: any = {};

      if (search) {
        where.OR = [
          {
            invoiceNumber: { contains: search as string, mode: "insensitive" },
          },
          { customerName: { contains: search as string, mode: "insensitive" } },
          {
            customerContact: {
              contains: search as string,
              mode: "insensitive",
            },
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

      // Date range filter - handle both preset ranges and custom dates
      if (startDate && endDate) {
        // Custom date range
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      } else if (dateRange) {
        // Preset date range
        const now = new Date();
        let filterStartDate: Date;

        switch (dateRange) {
          case "today":
            filterStartDate = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );
            break;
          case "week":
            filterStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "quarter":
            const quarterStart = Math.floor(now.getMonth() / 3) * 3;
            filterStartDate = new Date(now.getFullYear(), quarterStart, 1);
            break;
          default:
            filterStartDate = new Date(0);
        }

        where.createdAt = {
          gte: filterStartDate,
        };
      }

      // Calculate stats based on filtered invoices
      const [
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        draftInvoices,
        paidAmount,
        pendingAmount,
        totalAmount,
        actualPayments,
      ] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.count({
          where: { ...where, status: "COMPLETED" },
        }),
        prisma.invoice.count({
          where: {
            ...where,
            status: { in: ["OPEN", "pending"] },
          },
        }),
        prisma.invoice.count({
          where: { ...where, status: "DRAFT" },
        }),
        prisma.invoice.aggregate({
          where: { ...where, status: "COMPLETED" },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: {
            ...where,
            status: { in: ["OPEN", "pending"] },
          },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where,
          _sum: { totalAmount: true },
        }),
        // Get actual payments for the same date range
        (async () => {
          let paymentWhere: any = {};

          if (startDate && endDate) {
            paymentWhere.createdAt = {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
            };
          } else if (dateRange) {
            const now = new Date();
            let filterStartDate: Date;

            switch (dateRange) {
              case "today":
                filterStartDate = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate()
                );
                break;
              case "week":
                filterStartDate = new Date(
                  now.getTime() - 7 * 24 * 60 * 60 * 1000
                );
                break;
              case "month":
                filterStartDate = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  1
                );
                break;
              case "quarter":
                const quarterStart = Math.floor(now.getMonth() / 3) * 3;
                filterStartDate = new Date(now.getFullYear(), quarterStart, 1);
                break;
              default:
                filterStartDate = new Date(0);
            }

            paymentWhere.createdAt = {
              gte: filterStartDate,
            };
          }

          return prisma.customerPayment.aggregate({
            where: paymentWhere,
            _sum: { amount: true },
          });
        })(),
      ]);

      const stats = {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        draftInvoices,
        paidAmount: Number(paidAmount._sum.totalAmount || 0),
        pendingAmount: Number(pendingAmount._sum.totalAmount || 0),
        totalAmount: Number(totalAmount._sum.totalAmount || 0),
        actualPaidAmount: Number(actualPayments._sum.amount || 0),
        // For backward compatibility
        monthlyInvoices: totalInvoices,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Error fetching invoice statistics:", error);
      next(error);
    }
  }
);

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

// @desc    Download invoice as PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private
router.get(
  "/:id/pdf",
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
        },
      });

      // Add paidAmount to the invoice object if not present
      const invoiceWithPaidAmount = invoice as any;
      if (invoiceWithPaidAmount && typeof invoiceWithPaidAmount.paidAmount === "undefined") {
        // Option 1: If you have a payments relation, sum the payments
        const payments = await prisma.customerPayment.aggregate({
          where: { invoice_id: invoiceWithPaidAmount.id },
          _sum: { amount: true },
        });
        invoiceWithPaidAmount.paidAmount = Number(payments._sum.amount || 0);
      }

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Set response headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
      );

      // Pipe the PDF to the response
      doc.pipe(res);

      // Add company header
      doc.fontSize(20).text("Clyne Paper Limited", 50, 50);
      doc.fontSize(10).text("Tissue Paper Manufacturing", 50, 75);
      doc.fontSize(10).text("Lagos, Nigeria", 50, 90);

      // Add invoice title
      doc.fontSize(16).text("INVOICE", 400, 50);
      doc.fontSize(10).text(`Invoice #: ${invoice.invoiceNumber}`, 400, 75);
      doc
        .fontSize(10)
        .text(
          `Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`,
          400,
          90
        );
      doc
        .fontSize(10)
        .text(
          `Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`,
          400,
          105
        );

      // Add customer information
      doc.fontSize(12).text("Bill To:", 50, 140);
      doc.fontSize(10).text(invoice.customerName, 50, 160);
      if (invoice.customerContact) {
        doc.text(invoice.customerContact, 50, 175);
      }
      if (invoice.customerAddress) {
        doc.text(invoice.customerAddress, 50, 190);
      }

      // Add invoice details
      let currentY = 230;
      doc.fontSize(12).text("Invoice Details:", 50, currentY);
      currentY += 20;

      // Table headers
      doc.fontSize(10);
      doc.text("Description", 50, currentY);
      doc.text("Quantity", 200, currentY);
      doc.text("Unit Price", 280, currentY);
      doc.text("Total", 400, currentY);

      // Line under headers
      currentY += 15;
      doc.moveTo(50, currentY).lineTo(500, currentY).stroke();
      currentY += 10;

      // Add product details (if available in your schema)
      const quantity = invoice.quantity || 1;
      const unitPrice = invoice.totalAmount / quantity;

      doc.text(invoice.description || "Tissue Paper Products", 50, currentY);
      doc.text(quantity.toString(), 200, currentY);
      doc.text(`₦${unitPrice.toLocaleString()}`, 280, currentY);
      doc.text(`₦${invoice.totalAmount.toLocaleString()}`, 400, currentY);

      currentY += 30;

      // Add totals
      doc.moveTo(300, currentY).lineTo(500, currentY).stroke();
      currentY += 10;

      doc.fontSize(10);
      doc.text(
        `Subtotal: ₦${invoice.totalAmount.toLocaleString()}`,
        350,
        currentY
      );
      currentY += 15;

      if (invoice.taxAmount && Number(invoice.taxAmount) > 0) {
        doc.text(`Tax: ₦${Number(invoice.taxAmount).toLocaleString()}`, 350, currentY);
        currentY += 15;
      }

      doc.fontSize(12);
      const finalAmount = invoice.totalAmount.add(invoice.taxAmount || 0);
      doc.text(`Total: ₦${finalAmount.toLocaleString()}`, 350, currentY);

      // Add payment information
      currentY += 40;
      doc.fontSize(10);
      doc.text(`Status: ${invoice.status}`, 50, currentY);

      if (invoice.paidAmount && invoice.paidAmount > 0) {
        currentY += 15;
        doc.text(
          `Paid Amount: ₦${invoice.paidAmount.toLocaleString()}`,
          50,
          currentY
        );
        currentY += 15;
        const balance = finalAmount - invoice.paidAmount;
        doc.text(`Balance: ₦${balance.toLocaleString()}`, 50, currentY);
      }

      // Add footer
      currentY += 60;
      doc.fontSize(8);
      doc.text("Thank you for your business!", 50, currentY);
      doc.text(
        `Generated by: ${invoice.billedBy?.fullName || "System"}`,
        50,
        currentY + 15
      );
      doc.text(
        `Generated on: ${new Date().toLocaleDateString()}`,
        50,
        currentY + 30
      );

      // Finalize the PDF
      doc.end();
    } catch (error) {
      logger.error("Error generating invoice PDF:", error);
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
        "OPEN",
        "draft",
        "pending",
        "paid",
        "overdue",
        "cancelled",
        "open",
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

// @desc    Post (publish) a draft invoice
// @route   POST /api/invoices/:id/post
// @access  Private
router.post(
  "/:id/post",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;

      // Load the draft invoice with items
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!invoice) {
        return res
          .status(404)
          .json({ success: false, message: "Invoice not found" });
      }

      if (invoice.status !== "DRAFT") {
        return res.status(400).json({
          success: false,
          message: "Only draft invoices can be posted",
        });
      }

      // Post in a transaction: adjust inventory and set status to OPEN
      await prisma.$transaction(async (tx) => {
        // Adjust inventory for each item
        for (const item of invoice.items) {
          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: {
              currentQuantity: { decrement: item.quantity as any },
            },
          });
        }

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: "OPEN" },
        });
      });

      const updated = await prisma.invoice.findUnique({ where: { id } });

      res.json({
        success: true,
        data: updated,
        message: "Invoice posted successfully",
      });
    } catch (error) {
      logger.error("Error posting invoice:", error);
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
      action,
      status: statusInBody,
      saveForLater,
    } = req.body;

    // Determine intent: save draft vs post (publish)
    const isDraft =
      action === "save" ||
      saveForLater === true ||
      (typeof statusInBody === "string" &&
        statusInBody.toUpperCase() === "DRAFT");

    // Validation
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer ID is required",
      });
    }

    // For drafts, allow saving without items; for posted invoices, require items
    if (!isDraft) {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invoice items are required",
        });
      }
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

    // Validate payment terms: if dueDate is provided, ensure it doesn't exceed customer's default payment term
    if (dueDate) {
      const invoiceDate = new Date();
      const providedDueDate = new Date(dueDate);
      const daysDifference = Math.ceil(
        (providedDueDate.getTime() - invoiceDate.getTime()) / (1000 * 3600 * 24)
      );

      if (daysDifference > customer.defaultPaymentTermDays) {
        return res.status(400).json({
          success: false,
          message: `Payment term cannot exceed ${customer.defaultPaymentTermDays} days for this customer. You selected ${daysDifference} days.`,
        });
      }
    }

    // Validate inventory items (no stock check - allows selling out of stock items)
    const inventoryChecks =
      items && Array.isArray(items) && items.length > 0
        ? await Promise.all(
            items.map(async (item: any) => {
              const inventoryItem = await prisma.inventoryItem.findUnique({
                where: { id: item.inventoryItemId },
              });

              if (!inventoryItem) {
                throw new Error(
                  `Inventory item with ID ${item.inventoryItemId} not found`
                );
              }

              return {
                ...item,
                inventoryItem,
                lineTotal: item.quantity * item.unitPrice,
              };
            })
          )
        : [];

    // Calculate totals
    const subtotal = inventoryChecks.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
    const totalAmount =
      subtotal + parseFloat(taxAmount) - parseFloat(discountAmount);

    // Create invoice with transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Use the authenticated user as billed by user
      const billedByUserId = req.user!.id;

      // Generate unique invoice number using timestamp + random
      const timestamp = Date.now().toString();
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      const invoiceNumber = timestamp.slice(-8) + randomSuffix; // Last 8 digits of timestamp + 3 digit random

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
          dueDate: dueDate
            ? new Date(dueDate)
            : new Date(
                Date.now() +
                  customer.defaultPaymentTermDays * 24 * 60 * 60 * 1000
              ), // Use customer's default payment term
          status: isDraft ? "DRAFT" : "OPEN",
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

          // Update inventory only when posting (not for drafts)
          if (!isDraft) {
            await tx.inventoryItem.update({
              where: { id: item.inventoryItemId },
              data: {
                currentQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }

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
      message: isDraft
        ? "Invoice saved as draft"
        : "Invoice posted successfully",
    });
  } catch (error) {
    logger.error("Error creating invoice:", error);

    // Handle unique constraint violations
    if (
      error instanceof Error &&
      error.message.includes(
        "Unique constraint failed on the fields: (`invoice_number`)"
      )
    ) {
      logger.warn("Invoice number collision detected, retrying...");
      return res.status(409).json({
        success: false,
        message: "Invoice number collision detected. Please try again.",
        code: "INVOICE_NUMBER_CONFLICT",
      });
    }

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
