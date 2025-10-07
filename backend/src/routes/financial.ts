import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// @desc    Get financial dashboard data for accountants
// @route   GET /api/financial/dashboard
// @access  Private (Accountant)
router.get(
  "/dashboard",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Get total revenue
      const totalRevenue = await prisma.invoice.aggregate({
        where: { status: { in: ["PAID", "PARTIALLY_PAID"] } },
        _sum: { totalAmount: true },
      });

      // Get outstanding invoices
      const outstandingInvoices = await prisma.invoice.aggregate({
        where: { status: { in: ["SENT", "OVERDUE"] } },
        _sum: { totalAmount: true },
        _count: true,
      });

      // Get recent payments (using CustomerPayment model which has the actual data)
      const recentPayments = await prisma.customerPayment.findMany({
        take: 10,
        orderBy: { paymentDate: "desc" },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
          recordedBy: {
            select: {
              fullName: true,
            },
          },
        },
      });

      logger.info(`Found ${recentPayments.length} recent payments`);

      // Convert Decimal amounts to numbers for JSON serialization
      const serializedRecentPayments = recentPayments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      }));

      // Get monthly revenue trend (last 12 months)
      const monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', i.date) as month,
        SUM(COALESCE(p.amount, 0)) as total_paid,
        SUM(i.total_amount) as total_invoiced
      FROM invoices i
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE i.date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', i.date)
      ORDER BY month DESC
    `;

      // Get payment methods breakdown
      const paymentMethods = await prisma.customerPayment.groupBy({
        by: ["paymentMethod"],
        _sum: { amount: true },
        _count: true,
        where: {
          paymentDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
      });

      // Get tax summary
      const taxSummary = await prisma.invoice.aggregate({
        where: {
          date: {
            gte: new Date(new Date().getFullYear(), 0, 1), // Start of current year
          },
        },
        _sum: { taxAmount: true },
      });

      res.json({
        success: true,
        data: {
          totalRevenue: Number(totalRevenue._sum?.totalAmount || 0),
          outstandingAmount: Number(outstandingInvoices._sum?.totalAmount || 0),
          outstandingCount: outstandingInvoices._count || 0,
          recentPayments: serializedRecentPayments,
          monthlyRevenue,
          paymentMethods,
          taxCollected: Number(taxSummary._sum?.taxAmount || 0),
        },
      });
    } catch (error) {
      logger.error("Error fetching financial dashboard:", error);
      next(error);
    }
  }
);

// @desc    Get all payments with filtering
// @route   GET /api/financial/payments
// @access  Private (Accountant)
router.get(
  "/payments",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        paymentMethod,
        status,
        search,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filters
      const where: any = {};

      if (startDate && endDate) {
        where.paymentDate = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      if (paymentMethod) {
        where.paymentMethod = paymentMethod;
      }

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          {
            referenceNumber: {
              contains: search as string,
              mode: "insensitive",
            },
          },
          { notes: { contains: search as string, mode: "insensitive" } },
          {
            customer: {
              OR: [
                {
                  name: {
                    contains: search as string,
                    mode: "insensitive",
                  },
                },
                {
                  companyName: {
                    contains: search as string,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        ];
      }

      // Get payments with pagination (using CustomerPayment model)
      const [payments, total] = await Promise.all([
        prisma.customerPayment.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { paymentDate: "desc" },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                companyName: true,
              },
            },
            recordedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        }),
        prisma.customerPayment.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      // Convert Decimal amounts to numbers for JSON serialization
      const serializedPayments = payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
        allocatedAmount: Number(payment.allocatedAmount),
        creditAmount: Number(payment.creditAmount),
      }));

      res.json({
        success: true,
        data: serializedPayments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      logger.error("Error fetching payments:", error);
      next(error);
    }
  }
);

// @desc    Generate customer ledger report
// @route   GET /api/financial/customer-ledger/:customerId
// @access  Private (Accountant)
router.get(
  "/customer-ledger/:customerId",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { customerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // Get customer details
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          phone: true,
          address: true,
        },
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Calculate opening balance (all transactions before start date)
      const [openingInvoices, openingPayments] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            customerId,
            date: { lt: start },
          },
          _sum: { totalAmount: true },
        }),
        prisma.customerPayment.aggregate({
          where: {
            customerId,
            paymentDate: { lt: start },
          },
          _sum: { amount: true },
        }),
      ]);

      const openingBalance =
        Number(openingInvoices._sum.totalAmount || 0) -
        Number(openingPayments._sum.amount || 0);

      // Get transactions within the period
      const [periodInvoices, periodPayments] = await Promise.all([
        prisma.invoice.findMany({
          where: {
            customerId,
            date: { gte: start, lte: end },
          },
          select: {
            id: true,
            invoiceNumber: true,
            date: true,
            totalAmount: true,
            status: true,
            notes: true,
          },
          orderBy: { date: "asc" },
        }),
        prisma.customerPayment.findMany({
          where: {
            customerId,
            paymentDate: { gte: start, lte: end },
          },
          select: {
            id: true,
            paymentDate: true,
            amount: true,
            paymentMethod: true,
            referenceNumber: true,
            notes: true,
          },
          orderBy: { paymentDate: "asc" },
        }),
      ]);

      // Combine and sort transactions by date
      const transactions = [
        ...periodInvoices.map((invoice) => ({
          id: invoice.id,
          date: invoice.date,
          type: "INVOICE" as const,
          reference: invoice.invoiceNumber,
          description: invoice.notes || `Invoice ${invoice.invoiceNumber}`,
          debit: Number(invoice.totalAmount),
          credit: 0,
          status: invoice.status,
        })),
        ...periodPayments.map((payment) => ({
          id: payment.id,
          date: payment.paymentDate,
          type: "PAYMENT" as const,
          reference: payment.referenceNumber || "-",
          description: payment.notes || `Payment via ${payment.paymentMethod}`,
          debit: 0,
          credit: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
        })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate running balance
      let runningBalance = openingBalance;
      const transactionsWithBalance = transactions.map((transaction) => {
        runningBalance += transaction.debit - transaction.credit;
        return {
          ...transaction,
          balance: runningBalance,
        };
      });

      const closingBalance = runningBalance;

      // Calculate period totals
      const periodTotals = {
        totalInvoices: periodInvoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount),
          0
        ),
        totalPayments: periodPayments.reduce(
          (sum, pay) => sum + Number(pay.amount),
          0
        ),
        netMovement: closingBalance - openingBalance,
      };

      const ledgerData = {
        customer,
        period: {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        },
        balances: {
          opening: openingBalance,
          closing: closingBalance,
        },
        transactions: transactionsWithBalance,
        summary: {
          openingBalance,
          closingBalance,
          ...periodTotals,
        },
      };

      res.json({
        success: true,
        data: ledgerData,
      });
    } catch (error) {
      logger.error("Error generating customer ledger:", error);
      next(error);
    }
  }
);

// @desc    Get detailed financial reports
// @route   GET /api/financial/reports
// @access  Private (Accountant)
router.get(
  "/reports",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { type, startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      let reportData: any = {};

      switch (type) {
        case "income-statement":
          // Revenue
          const revenue = await prisma.payment.aggregate({
            where: {
              paymentDate: { gte: start, lte: end },
              status: "COMPLETED",
            },
            _sum: { amount: true },
          });

          // Tax collected
          const taxes = await prisma.invoice.aggregate({
            where: {
              date: { gte: start, lte: end },
              status: { in: ["PAID", "PARTIALLY_PAID"] },
            },
            _sum: { taxAmount: true },
          });

          reportData = {
            period: { start, end },
            revenue: Number(revenue._sum?.amount || 0),
            taxCollected: Number(taxes._sum?.taxAmount || 0),
            netRevenue:
              Number(revenue._sum?.amount || 0) -
              Number(taxes._sum?.taxAmount || 0),
          };
          break;

        case "aged-receivables":
          const invoices = await prisma.invoice.findMany({
            where: {
              status: { in: ["SENT", "OVERDUE"] },
            },
            include: {
              customer: true,
              payments: true,
            },
          });

          const aged = invoices.map((invoice) => {
            const totalPaid = invoice.payments.reduce(
              (sum, payment) => sum + Number(payment.amount),
              0
            );
            const remaining = Number(invoice.totalAmount) - totalPaid;
            const daysPastDue = invoice.dueDate
              ? Math.floor(
                  (new Date().getTime() - invoice.dueDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0;

            return {
              ...invoice,
              remainingAmount: remaining,
              daysPastDue,
              ageCategory:
                daysPastDue <= 0
                  ? "Current"
                  : daysPastDue <= 30
                    ? "1-30 days"
                    : daysPastDue <= 60
                      ? "31-60 days"
                      : daysPastDue <= 90
                        ? "61-90 days"
                        : "90+ days",
            };
          });

          reportData = { aged };
          break;

        case "tax-summary":
          const taxData = await prisma.invoice.groupBy({
            by: ["status"],
            where: {
              date: { gte: start, lte: end },
            },
            _sum: { taxAmount: true, totalAmount: true },
            _count: true,
          });

          reportData = {
            period: { start, end },
            taxData,
          };
          break;

        default:
          return res.status(400).json({
            success: false,
            error: "Invalid report type",
          });
      }

      res.json({
        success: true,
        data: reportData,
      });
    } catch (error) {
      logger.error("Error generating financial report:", error);
      next(error);
    }
  }
);

// @desc    Export data for QuickBooks
// @route   POST /api/financial/quickbooks-export
// @access  Private (Accountant)
router.post(
  "/quickbooks-export",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { exportType, entityIds, startDate, endDate } = req.body;
      const userId = req.user?.id; // Get from authentication middleware

      let exportData: any = {};
      let filename = "";

      switch (exportType) {
        case "INVOICES":
          const invoices = await prisma.invoice.findMany({
            where: {
              id: entityIds ? { in: entityIds } : undefined,
              date:
                startDate && endDate
                  ? {
                      gte: new Date(startDate),
                      lte: new Date(endDate),
                    }
                  : undefined,
            },
            include: {
              customer: true,
              items: {
                include: {
                  inventoryItem: true,
                },
              },
              payments: true,
            },
          });

          exportData = {
            invoices: invoices.map((invoice) => ({
              InvoiceNumber: invoice.invoiceNumber,
              Date: invoice.date.toISOString().split("T")[0],
              CustomerName: invoice.customer.name,
              CustomerEmail: invoice.customer.email,
              DueDate: invoice.dueDate?.toISOString().split("T")[0],
              Subtotal: Number(invoice.totalAmount) - Number(invoice.taxAmount),
              TaxAmount: Number(invoice.taxAmount),
              Total: Number(invoice.totalAmount),
              Status: invoice.status,
              Items: invoice.items.map((item) => ({
                Description: item.inventoryItem.name,
                Quantity: Number(item.quantity),
                UnitPrice: Number(item.unitPrice),
                LineTotal: Number(item.lineTotal),
              })),
              Payments: invoice.payments.map((payment) => ({
                Date: payment.paymentDate.toISOString().split("T")[0],
                Amount: Number(payment.amount),
                Method: payment.paymentMethod,
                Reference: payment.referenceNumber,
              })),
            })),
          };
          filename = `invoices_export_${new Date().toISOString().split("T")[0]}.json`;
          break;

        case "PAYMENTS":
          const payments = await prisma.payment.findMany({
            where: {
              id: entityIds ? { in: entityIds } : undefined,
              paymentDate:
                startDate && endDate
                  ? {
                      gte: new Date(startDate),
                      lte: new Date(endDate),
                    }
                  : undefined,
            },
            include: {
              invoice: {
                include: {
                  customer: true,
                },
              },
            },
          });

          exportData = {
            payments: payments.map((payment) => ({
              PaymentDate: payment.paymentDate.toISOString().split("T")[0],
              Amount: Number(payment.amount),
              PaymentMethod: payment.paymentMethod,
              ReferenceNumber: payment.referenceNumber,
              InvoiceNumber: payment.invoice.invoiceNumber,
              CustomerName: payment.invoice.customer.name,
              Status: payment.status,
            })),
          };
          filename = `payments_export_${new Date().toISOString().split("T")[0]}.json`;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: "Invalid export type",
          });
      }

      // Save export record
      const exportRecord = await prisma.quickBooksExport.create({
        data: {
          exportType,
          entityIds: entityIds || [],
          exportData: JSON.stringify(exportData),
          exportedByUserId: req.user?.id || "unknown", // Get from auth middleware
          exportDate: new Date(),
          filename,
          status: "COMPLETED",
        },
      });

      res.json({
        success: true,
        data: {
          exportId: exportRecord.id,
          filename,
          exportData,
        },
      });
    } catch (error) {
      logger.error("Error creating QuickBooks export:", error);
      next(error);
    }
  }
);

// @desc    Record a payment for an invoice
// @route   POST /api/financial/payments
// @access  Private (Accountant)
router.post(
  "/payments",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        invoiceId,
        amount,
        paymentMethod,
        paymentDate,
        referenceNumber,
        notes,
      } = req.body;
      const userId = req.user?.id || "unknown"; // Get from auth middleware

      // Validate invoice exists
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: "Invoice not found",
        });
      }

      // Calculate remaining amount
      const totalPaid = invoice.payments.reduce(
        (sum: number, payment: any) => sum + Number(payment.amount),
        0
      );
      const remainingAmount = Number(invoice.totalAmount) - totalPaid;

      if (Number(amount) > remainingAmount) {
        return res.status(400).json({
          success: false,
          error: "Payment amount exceeds remaining balance",
        });
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          invoiceId,
          amount: Number(amount),
          paymentMethod,
          paymentDate: new Date(paymentDate),
          referenceNumber,
          notes,
          recordedByUserId: userId,
          status: "COMPLETED",
        },
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

      // Update invoice status based on payment
      const newTotalPaid = totalPaid + Number(amount);
      let newStatus = invoice.status;

      if (newTotalPaid >= Number(invoice.totalAmount)) {
        newStatus = "PAID";
      } else if (newTotalPaid > 0) {
        newStatus = "PARTIALLY_PAID";
      }

      // Update invoice status if needed
      if (newStatus !== invoice.status) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: newStatus },
        });
      }

      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      logger.error("Error recording payment:", error);
      next(error);
    }
  }
);

// @desc    Get export history
// @route   GET /api/financial/exports
// @access  Private (Accountant)
router.get(
  "/exports",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [exports, total] = await Promise.all([
        prisma.quickBooksExport.findMany({
          skip,
          take: limitNum,
          orderBy: { exportDate: "desc" },
          include: {
            exportedBy: {
              select: {
                fullName: true,
              },
            },
          },
        }),
        prisma.quickBooksExport.count(),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: exports,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      logger.error("Error fetching export history:", error);
      next(error);
    }
  }
);

export default router;
