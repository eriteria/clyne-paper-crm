import express from "express";
import { PrismaClient } from "@prisma/client";
import {
  paymentService,
  CreatePaymentRequest,
} from "../services/paymentService";
import { logCreate, logUpdate } from "../utils/auditLogger";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /payments/summary - Get payment summary statistics
 */
router.get("/summary", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Get today's payments
    const todayPayments = await prisma.customerPayment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        paymentDate: {
          gte: today,
          lte: endOfToday,
        },
      },
    });

    // Get this month's payments
    const monthPayments = await prisma.customerPayment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        paymentDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Get total outstanding invoices
    const outstandingInvoices = await prisma.invoice.aggregate({
      _sum: {
        balance: true,
      },
      where: {
        balance: {
          gt: 0,
        },
      },
    });

    // Get total available credits
    const availableCredits = await prisma.credit.aggregate({
      _sum: {
        availableAmount: true,
      },
      where: {
        availableAmount: {
          gt: 0,
        },
      },
    });

    res.json({
      totalPaymentsToday: todayPayments._sum.amount || 0,
      totalPaymentsThisMonth: monthPayments._sum.amount || 0,
      totalOutstanding: outstandingInvoices._sum.balance || 0,
      totalCredits: availableCredits._sum.availableAmount || 0,
    });
  } catch (error) {
    console.error("Error fetching payment summary:", error);
    res.status(500).json({ error: "Failed to fetch payment summary" });
  }
});

/**
 * GET /payments/recent - Get recent payments
 */
router.get("/recent", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const paymentMethod = req.query.paymentMethod as string;
    const search = req.query.search as string;

    const where: any = {};

    if (paymentMethod && paymentMethod !== "ALL") {
      where.paymentMethod = paymentMethod;
    }

    if (search) {
      where.OR = [
        {
          customer: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          customer: {
            companyName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          referenceNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const payments = await prisma.customerPayment.findMany({
      where,
      orderBy: {
        paymentDate: "desc",
      },
      take: limit,
      skip: offset,
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
        paymentApplications: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
              },
            },
          },
        },
      },
    });

    res.json(payments);
  } catch (error) {
    console.error("Error fetching recent payments:", error);
    res.status(500).json({ error: "Failed to fetch recent payments" });
  }
});

/**
 * GET /payments/outstanding - Get outstanding invoices
 */
router.get(
  "/outstanding",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string;

      const where: any = {
        balance: {
          gt: 0,
        },
      };

      if (search) {
        where.OR = [
          {
            customer: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            customer: {
              companyName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            invoiceNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
        ];
      }

      const invoices = await prisma.invoice.findMany({
        where,
        orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }],
        take: limit,
        skip: offset,
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          balance: true,
          customer: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
        },
      });

      // Add isOverdue flag
      const invoicesWithOverdue = invoices.map((invoice: any) => ({
        ...invoice,
        customerName: invoice.customer.companyName || invoice.customer.name,
        isOverdue: new Date(invoice.dueDate) < new Date(),
      }));

      res.json(invoicesWithOverdue);
    } catch (error) {
      console.error("Error fetching outstanding invoices:", error);
      res.status(500).json({ error: "Failed to fetch outstanding invoices" });
    }
  }
);

/**
 * POST /payments - Record a customer payment
 */
router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      customerId,
      amount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      notes,
      invoiceIds,
    } = req.body;

    // Validate required fields
    if (!customerId || !amount || !paymentMethod) {
      return res.status(400).json({
        error: "Missing required fields: customerId, amount, paymentMethod",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: "Payment amount must be greater than 0",
      });
    }

    const paymentData: CreatePaymentRequest = {
      customerId,
      amount: parseFloat(amount),
      paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      referenceNumber,
      notes,
      recordedByUserId: req.user!.id,
      invoiceIds,
    };

    const result = await paymentService.processPayment(paymentData);

    // Log the payment creation
    await logCreate(req.user!.id, "CUSTOMER_PAYMENT", customerId, {
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      allocatedAmount: result.totalAllocated,
      creditAmount: result.totalCredit,
    });

    return res.status(201).json({
      success: true,
      message: "Payment processed successfully",
      data: {
        paymentId: customerId, // This should be the actual payment ID from the service
        ...result,
      },
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).json({
      error: "Failed to process payment",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /customers/:customerId/payments - Get customer payment history
 */
router.get(
  "/customers/:customerId/payments",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { customerId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await paymentService.getCustomerPayments(
        customerId,
        page,
        limit
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching customer payments:", error);
      return res.status(500).json({
        error: "Failed to fetch customer payments",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /customers/:customerId/credits - Get customer credits
 */
router.get(
  "/customers/:customerId/credits",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { customerId } = req.params;
      const activeOnly = req.query.activeOnly !== "false"; // Default to true

      const result = await paymentService.getCustomerCredits(
        customerId,
        activeOnly
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching customer credits:", error);
      return res.status(500).json({
        error: "Failed to fetch customer credits",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /credits/apply - Apply credit to an invoice
 */
router.post(
  "/credits/apply",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { creditId, invoiceId, amount } = req.body;

      if (!creditId || !invoiceId || !amount) {
        return res.status(400).json({
          error: "Missing required fields: creditId, invoiceId, amount",
        });
      }

      if (amount <= 0) {
        return res.status(400).json({
          error: "Credit amount must be greater than 0",
        });
      }

      const result = await paymentService.applyCreditToInvoice(
        creditId,
        invoiceId,
        parseFloat(amount),
        req.user!.id
      );

      // Log the credit application
      await logUpdate(req.user!.id, "CREDIT_APPLICATION", creditId, null, {
        invoiceId,
        amountApplied: result.amountApplied,
      });

      return res.json({
        success: true,
        message: "Credit applied successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error applying credit:", error);
      return res.status(400).json({
        error: "Failed to apply credit",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /customers/:customerId/ledger - Get comprehensive customer ledger
 */
router.get(
  "/customers/:customerId/ledger",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { customerId } = req.params;

      const result = await paymentService.getCustomerLedger(customerId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching customer ledger:", error);
      return res.status(500).json({
        error: "Failed to fetch customer ledger",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /customers/:customerId/open-invoices - Get open invoices for payment allocation
 */
router.get(
  "/customers/:customerId/open-invoices",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { customerId } = req.params;

      // Get open/partial invoices with balances
      const openInvoices = await prisma.invoice.findMany({
        where: {
          customerId,
          status: { in: ["OPEN", "PARTIAL"] },
          balance: { gt: 0 },
        },
        include: {
          paymentApplications: {
            include: {
              customerPayment: {
                select: {
                  id: true,
                  amount: true,
                  paymentDate: true,
                  paymentMethod: true,
                },
              },
            },
          },
        },
        orderBy: [{ dueDate: "asc" }, { date: "asc" }],
      });

      const formattedInvoices = openInvoices.map((invoice: any) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.date,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        balance: invoice.balance,
        status: invoice.status,
        isOverdue: invoice.dueDate
          ? new Date(invoice.dueDate) < new Date()
          : false,
        paymentHistory: invoice.paymentApplications.map((app: any) => ({
          paymentId: app.customerPayment.id,
          amount: app.amountApplied,
          paymentDate: app.customerPayment.paymentDate,
          paymentMethod: app.customerPayment.paymentMethod,
        })),
      }));

      const totalOutstanding = openInvoices.reduce(
        (sum: number, invoice: any) =>
          sum + parseFloat(invoice.balance.toString()),
        0
      );

      return res.json({
        success: true,
        data: {
          invoices: formattedInvoices,
          summary: {
            totalInvoices: openInvoices.length,
            totalOutstanding,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching open invoices:", error);
      return res.status(500).json({
        error: "Failed to fetch open invoices",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /initialize-balances - Initialize balances for existing invoices (migration helper)
 */
router.post(
  "/initialize-balances",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      // Check if user has admin permissions
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { role: true },
      });

      if (!user || user.role.name !== "admin") {
        return res.status(403).json({
          error: "Insufficient permissions",
        });
      }

      const result = await paymentService.initializeInvoiceBalances();

      return res.json({
        success: true,
        message: "Invoice balances initialized",
        data: result,
      });
    } catch (error) {
      console.error("Error initializing balances:", error);
      return res.status(500).json({
        error: "Failed to initialize balances",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /payment-methods - Get available payment methods
 */
router.get("/payment-methods", (req, res) => {
  const paymentMethods = [
    { value: "CASH", label: "Cash" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "CARD", label: "Card Payment" },
    { value: "MOBILE_MONEY", label: "Mobile Money" },
  ];

  return res.json({
    success: true,
    data: paymentMethods,
  });
});

export default router;
