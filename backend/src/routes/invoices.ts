import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { logCreate, logUpdate, logDelete } from "../utils/auditLogger";
import {
  authenticate,
  requirePermission,
  AuthenticatedRequest,
} from "../middleware/auth";
import { PERMISSIONS } from "../utils/permissions";
import {
  getUserAccessibleLocationIds,
  getUserPrimaryLocationId,
} from "../middleware/locationAccess";
import PDFDocument = require("pdfkit");
import { BankAccount } from "@prisma/client";
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

// Apply authentication to all invoice routes
router.use(authenticate);

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private (requires invoices:view permission)
router.get(
  "/",
  requirePermission(PERMISSIONS.INVOICES_VIEW),
  async (req: AuthenticatedRequest, res, next) => {
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
  }
);

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats
// @access  Private (requires invoices:view permission)
router.get(
  "/stats",
  requirePermission(PERMISSIONS.INVOICES_VIEW),
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
// @access  Private (requires invoices:view permission)
router.get(
  "/:id",
  requirePermission(PERMISSIONS.INVOICES_VIEW),
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

      // Check for bank account override in query params
      const bankAccountIdOverride = req.query.bankAccountId as
        | string
        | undefined;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              inventoryItem: {
                select: {
                  name: true,
                  sku: true,
                  unit: true,
                },
              },
            },
          },
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
          customer: {
            select: {
              id: true,
              name: true,
              defaultPaymentTermDays: true,
              returnPolicyDays: true,
            },
          },
          bankAccount: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Create PDF document with Letter size
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      });

      // Set response headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
      );

      // Pipe the PDF to the response
      doc.pipe(res);

      const path = require("path");
      const logoPath = path.join(__dirname, "../../public/clyne_logo.png");

      // Add logo (top-left)
      try {
        doc.image(logoPath, 40, 30, { width: 100 });
      } catch (err) {
        logger.warn("Could not load logo image:", err);
      }

      // Company contact details (top-right)
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("1 AVTI Road, Kuje, Abuja", 400, 30, {
          align: "right",
          width: 155,
        })
        .font("Helvetica")
        .text("info@clynepaper.com.ng", 400, 45, { align: "right", width: 155 })
        .text("07082028790, 09026833...", 400, 60, {
          align: "right",
          width: 155,
        });

      // Account information section (full width)
      let currentY = 95;

      // Determine which bank account to display
      let bankAccountToDisplay: any = null;

      if (bankAccountIdOverride) {
        // Use override if provided
        bankAccountToDisplay = await prisma.bankAccount.findUnique({
          where: { id: bankAccountIdOverride },
        });
      } else if (invoice.bankAccount) {
        // Use invoice's linked bank account
        bankAccountToDisplay = invoice.bankAccount;
      } else {
        // Fallback to default bank account
        bankAccountToDisplay = await prisma.bankAccount.findUnique({
          where: { id: "default-bank-account" },
        });
      }

      // Display bank account or payment method
      doc.fontSize(10).font("Helvetica-Bold");

      if (invoice.paymentMethod === "CASH") {
        doc.text("PAYMENT METHOD: CASH", 40, currentY, {
          width: 515,
          align: "left",
        });
      } else if (bankAccountToDisplay) {
        doc.text(
          `ACCOUNT NAME: ${bankAccountToDisplay.accountName}   ACCOUNT NO: ${bankAccountToDisplay.accountNumber}   BANK: ${bankAccountToDisplay.bankName}`,
          40,
          currentY,
          { width: 515, align: "left" }
        );
      } else {
        // Fallback if no bank account found
        doc.text("PAYMENT METHOD: BANK TRANSFER", 40, currentY, {
          width: 515,
          align: "left",
        });
      }

      // Invoice header row (black background)
      currentY += 20;
      const headerY = currentY;
      doc.rect(40, headerY, 515, 22).fillAndStroke("#000000", "#000000");

      // Header text (white on black)
      doc
        .fillColor("#FFFFFF")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("INVOICE NO", 50, headerY + 7, { width: 100, continued: false })
        .text("CUSTOMER", 240, headerY + 7, { width: 150, align: "center" })
        .text("DATE", 480, headerY + 7, { align: "right", width: 65 });

      // Header values row (white background with border)
      currentY = headerY + 22;
      doc.rect(40, currentY, 515, 22).stroke("#000000");

      doc
        .fillColor("#000000")
        .fontSize(11)
        .font("Helvetica")
        .text(invoice.invoiceNumber, 50, currentY + 7, { width: 100 })
        .text(invoice.customerName.toUpperCase(), 200, currentY + 7, {
          width: 200,
          align: "center",
        })
        .text(
          new Date(invoice.date)
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
            .replace(/\//g, " - "),
          450,
          currentY + 7,
          { align: "right", width: 95 }
        );

      // Table headers
      currentY += 25;
      const tableTop = currentY;
      const colX = {
        sn: 40,
        description: 90,
        qty: 380,
        unitPrice: 440,
        amount: 495,
      };
      const rowHeight = 22; // Reduced from 25 to 22

      // Draw header row background and borders
      doc
        .rect(colX.sn, tableTop, colX.description - colX.sn, rowHeight)
        .stroke();
      doc
        .rect(
          colX.description,
          tableTop,
          colX.qty - colX.description,
          rowHeight
        )
        .stroke();
      doc
        .rect(colX.qty, tableTop, colX.unitPrice - colX.qty, rowHeight)
        .stroke();
      doc
        .rect(colX.unitPrice, tableTop, colX.amount - colX.unitPrice, rowHeight)
        .stroke();
      doc.rect(colX.amount, tableTop, 555 - colX.amount, rowHeight).stroke();

      // Header text
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("S/N", colX.sn + 5, tableTop + 8, {
          width: colX.description - colX.sn - 10,
          align: "center",
        })
        .text("DESCRIPTION", colX.description + 5, tableTop + 8, {
          width: colX.qty - colX.description - 10,
        })
        .text("QTY", colX.qty + 5, tableTop + 8, {
          width: colX.unitPrice - colX.qty - 10,
          align: "center",
        })
        .text("UNIT\nPRICE", colX.unitPrice + 3, tableTop + 4, {
          width: colX.amount - colX.unitPrice - 6,
          align: "center",
          lineGap: -2,
        })
        .text("AMOUNT", colX.amount + 5, tableTop + 8, {
          width: 555 - colX.amount - 10,
          align: "right",
        });

      // Table rows
      currentY = tableTop + rowHeight;
      let serialNumber = 1;

      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item: any) => {
          const itemTotal = Number(item.lineTotal);
          const unitPrice = Number(item.unitPrice);
          const quantity = Number(item.quantity);

          // Draw row borders
          doc
            .rect(colX.sn, currentY, colX.description - colX.sn, rowHeight)
            .stroke();
          doc
            .rect(
              colX.description,
              currentY,
              colX.qty - colX.description,
              rowHeight
            )
            .stroke();
          doc
            .rect(colX.qty, currentY, colX.unitPrice - colX.qty, rowHeight)
            .stroke();
          doc
            .rect(
              colX.unitPrice,
              currentY,
              colX.amount - colX.unitPrice,
              rowHeight
            )
            .stroke();
          doc
            .rect(colX.amount, currentY, 555 - colX.amount, rowHeight)
            .stroke();

          // Row data
          doc
            .fontSize(10)
            .font("Helvetica")
            .text(serialNumber.toString(), colX.sn + 5, currentY + 8, {
              width: colX.description - colX.sn - 10,
              align: "center",
            })
            .text(
              item.inventoryItem?.name || "Product",
              colX.description + 5,
              currentY + 8,
              { width: colX.qty - colX.description - 10 }
            )
            .text(quantity.toString(), colX.qty + 5, currentY + 8, {
              width: colX.unitPrice - colX.qty - 10,
              align: "center",
            })
            .text(
              `N${unitPrice.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              colX.unitPrice + 3,
              currentY + 8,
              { width: colX.amount - colX.unitPrice - 8, align: "right" }
            )
            .text(
              `N${itemTotal.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              colX.amount + 3,
              currentY + 8,
              { width: 555 - colX.amount - 8, align: "right" }
            );

          currentY += rowHeight;
          serialNumber++;
        });
      } else {
        // Empty row if no items
        doc.rect(colX.sn, currentY, 515, rowHeight).stroke();
        doc
          .fontSize(10)
          .font("Helvetica-Oblique")
          .text("No items", colX.description + 5, currentY + 8);
        currentY += rowHeight;
      }

      // Fill remaining rows (up to 15 total rows)
      const maxRows = 15;
      const currentRows = serialNumber - 1;
      for (let i = currentRows; i < maxRows; i++) {
        doc
          .rect(colX.sn, currentY, colX.description - colX.sn, rowHeight)
          .stroke();
        doc
          .rect(
            colX.description,
            currentY,
            colX.qty - colX.description,
            rowHeight
          )
          .stroke();
        doc
          .rect(colX.qty, currentY, colX.unitPrice - colX.qty, rowHeight)
          .stroke();
        doc
          .rect(
            colX.unitPrice,
            currentY,
            colX.amount - colX.unitPrice,
            rowHeight
          )
          .stroke();
        doc.rect(colX.amount, currentY, 555 - colX.amount, rowHeight).stroke();
        currentY += rowHeight;
      }

      // Total row (bold, larger font)
      const totalAmount = Number(invoice.totalAmount);
      doc
        .rect(colX.sn, currentY, 515, rowHeight)
        .fillAndStroke("#F0F0F0", "#000000");

      doc.fillColor("#000000").fontSize(11).font("Helvetica-Bold");

      // Draw "Total:" label
      doc.text("Total:", colX.unitPrice + 3, currentY + 8, {
        width: 50,
        align: "left",
        continued: false,
        lineBreak: false,
      });

      // Draw the total amount in the AMOUNT column with explicit positioning
      const formattedTotal = totalAmount.toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Calculate the x position to right-align within the cell
      const totalText = `N${formattedTotal}`;
      const textWidth = doc.widthOfString(totalText);
      const rightMargin = 8;
      const cellWidth = 555 - colX.amount;
      const xPosition = 555 - textWidth - rightMargin;

      doc.text(totalText, xPosition, currentY + 8, {
        lineBreak: false,
        continued: false,
      });

      // Signature section
      currentY += 35; // Reduced from 50 to 35

      // Signature line
      doc
        .moveTo(40, currentY + 20)
        .lineTo(200, currentY + 20)
        .stroke("#000000"); // Reduced from 30 to 20

      // Prepared by label and name
      doc
        .fontSize(9)
        .font("Helvetica")
        .text("Prepared by:", 40, currentY + 25)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(invoice.billedBy?.fullName || "N/A", 40, currentY + 40);

      // Disclaimers section
      currentY += 65; // Reduced from 90 to 65

      // Get payment terms and return policy from customer or use defaults
      const paymentTermDays = invoice.customer?.defaultPaymentTermDays || 30;
      const returnPolicyDays = invoice.customer?.returnPolicyDays || 30;

      // Disclaimers header
      doc
        .fontSize(8)
        .font("Helvetica-Bold")
        .text("TERMS AND CONDITIONS:", 40, currentY, { underline: true });

      currentY += 12;

      // Disclaimer 1: Payment Terms
      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .text("1. Payment Terms: ", 40, currentY, { continued: true })
        .font("Helvetica")
        .text(
          `Payment is due within ${paymentTermDays} days of the invoice date. Late payments may incur additional charges.`,
          {
            width: 515,
            align: "left",
          }
        );

      currentY += 20;

      // Disclaimer 2: Goods and Services Accuracy
      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .text("2. Goods and Services Accuracy: ", 40, currentY, {
          continued: true,
        })
        .font("Helvetica")
        .text(
          "The descriptions of the goods and services provided are deemed accurate at the time of invoicing. Please ensure that all items received are in accordance with the details specified herein. Discrepancies must be reported immediately at the point of receipt.",
          {
            width: 515,
            align: "left",
          }
        );

      currentY += 28;

      // Disclaimer 3: Returns and Refunds
      doc
        .fontSize(7.5)
        .font("Helvetica-Bold")
        .text("3. Returns and Refunds: ", 40, currentY, { continued: true })
        .font("Helvetica")
        .text(
          `All sales are final, no cash refund. Returns may be accepted at the discretion of Clyne Paper Limited within ${returnPolicyDays} days of purchase, in original condition, and with prior authorization.`,
          {
            width: 515,
            align: "left",
          }
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
// @access  Private (requires invoices:edit permission)
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.INVOICES_EDIT),
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
// @access  Private (requires invoices:create permission)
router.post(
  "/",
  requirePermission(PERMISSIONS.INVOICES_CREATE),
  async (req: AuthenticatedRequest, res, next) => {
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
          (providedDueDate.getTime() - invoiceDate.getTime()) /
            (1000 * 3600 * 24)
        );

        if (daysDifference > customer.defaultPaymentTermDays) {
          return res.status(400).json({
            success: false,
            message: `Payment term cannot exceed ${customer.defaultPaymentTermDays} days for this customer. You selected ${daysDifference} days.`,
          });
        }
      }

      // Get user's accessible locations for stock validation
      const accessibleLocations = await getUserAccessibleLocationIds(req.user);

      // Validate inventory items with location-based stock check
      const inventoryChecks =
        items && Array.isArray(items) && items.length > 0
          ? await Promise.all(
              items.map(async (item: any) => {
                const inventoryItem = await prisma.inventoryItem.findUnique({
                  where: { id: item.inventoryItemId },
                  include: {
                    location: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                });

                if (!inventoryItem) {
                  throw new Error(
                    `Inventory item with ID ${item.inventoryItemId} not found`
                  );
                }

                // Verify user has access to this location
                if (
                  accessibleLocations !== "ALL" &&
                  !accessibleLocations.includes(inventoryItem.locationId)
                ) {
                  throw new Error(
                    `You do not have access to add items from location "${inventoryItem.location.name}". You can only add items from your assigned locations.`
                  );
                }

                // Check if item has stock at this location
                if (inventoryItem.currentQuantity <= 0) {
                  throw new Error(
                    `Item "${inventoryItem.name}" has no stock available at location "${inventoryItem.location.name}". Current stock: ${inventoryItem.currentQuantity}`
                  );
                }

                // Check if there's enough stock for the requested quantity
                if (inventoryItem.currentQuantity < item.quantity) {
                  throw new Error(
                    `Insufficient stock for item "${inventoryItem.name}" at location "${inventoryItem.location.name}". Requested: ${item.quantity}, Available: ${inventoryItem.currentQuantity}`
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
  }
);

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private (requires invoices:delete permission)
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.INVOICES_DELETE),
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
// @access  Private (requires invoices:import permission)
router.post(
  "/import",
  requirePermission(PERMISSIONS.INVOICES_IMPORT),
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
// @access  Private (requires invoices:import permission)
router.post(
  "/import/json",
  requirePermission(PERMISSIONS.INVOICES_IMPORT),
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

// @desc    Create automatic waybill from invoice
// @route   POST /api/invoices/:id/create-waybill
// @access  Private (requires invoices:view permission)
router.post(
  "/:id/create-waybill",
  requirePermission(PERMISSIONS.INVOICES_VIEW),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const invoiceId = req.params.id;
      const userId = req.user!.id;

      // Fetch invoice with items and customer
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          items: {
            include: {
              inventoryItem: true,
            },
          },
          customer: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Get user's primary location as source
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { primaryLocationId: true },
      });

      if (!user?.primaryLocationId) {
        return res.status(400).json({
          success: false,
          message: "User must have a primary location to create waybills",
        });
      }

      // Get the next waybill number
      const latestWaybill = await prisma.waybill.findFirst({
        orderBy: { waybillNumber: "desc" },
        select: { waybillNumber: true },
      });

      let nextNumber = 1;
      if (latestWaybill?.waybillNumber) {
        const match = latestWaybill.waybillNumber.match(/WB(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      const waybillNumber = `WB${nextNumber.toString().padStart(6, "0")}`;

      // Create waybill with items
      const waybill = await prisma.$transaction(async (prisma) => {
        // Create the waybill
        const newWaybill = await prisma.waybill.create({
          data: {
            waybillNumber,
            transferType: "OUTGOING",
            status: "PENDING", // Start as PENDING, not PROCESSING
            sourceLocationId: user.primaryLocationId!, // Our store (source)
            locationId: user.primaryLocationId!, // Same as source for OUTGOING (we're sending FROM here)
            destinationCustomerId: invoice.customerId, // Customer receiving the goods
            receivedByUserId: userId, // User who created this waybill
            date: new Date(),
            supplier: "Clyne Paper Limited", // We are the supplier/sender
            notes: `Auto-generated from Invoice #${invoice.invoiceNumber}. Delivery to: ${invoice.customerName}`,
            items: {
              create: invoice.items.map((item) => ({
                inventoryItemId: item.inventoryItemId,
                name: item.inventoryItem.name,
                sku: item.inventoryItem.sku,
                quantityReceived: item.quantity,
                unit: item.inventoryItem.unit,
                unitCost: item.unitPrice,
                status: "PENDING",
              })),
            },
          },
          include: {
            items: {
              include: {
                inventoryItem: true,
              },
            },
            sourceLocation: true,
            destinationLocation: true,
            destinationCustomer: true,
            receivedBy: true,
          },
        });

        // Log the creation
        await logCreate(userId, "WAYBILL", newWaybill.id, {
          waybillNumber,
          transferType: "OUTGOING",
          invoiceNumber: invoice.invoiceNumber,
          itemCount: invoice.items.length,
        });

        return newWaybill;
      });

      res.status(201).json({
        success: true,
        data: waybill,
        message: "Waybill created successfully from invoice",
      });
    } catch (error) {
      logger.error("Error creating waybill from invoice:", error);
      next(error);
    }
  }
);

export default router;
