import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

export interface PaymentAllocationResult {
  totalPaid: Decimal;
  totalAllocated: Decimal;
  totalCredit: Decimal;
  invoicesUpdated: {
    invoiceId: string;
    amountApplied: Decimal;
    newBalance: Decimal;
    newStatus: string;
  }[];
  creditCreated?: { creditId: string; amount: Decimal };
}

export interface CreatePaymentRequest {
  customerId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  referenceNumber?: string;
  notes?: string;
  recordedByUserId: string;
  invoiceIds?: string[]; // Optional: specific invoices to pay
}

export class PaymentService {
  /**
   * Process a customer payment with automatic allocation
   */
  async processPayment(
    data: CreatePaymentRequest
  ): Promise<PaymentAllocationResult> {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the customer payment record
      const payment = await tx.customerPayment.create({
        data: {
          customerId: data.customerId,
          amount: new Decimal(data.amount),
          paymentMethod: data.paymentMethod,
          paymentDate: data.paymentDate,
          referenceNumber: data.referenceNumber,
          notes: data.notes,
          recordedByUserId: data.recordedByUserId,
          status: "COMPLETED",
        },
      });

      // 2. Get open/partial invoices for the customer
      const openInvoices = await tx.invoice.findMany({
        where: {
          customerId: data.customerId,
          status: { in: ["OPEN", "PARTIAL"] },
          balance: { gt: 0 },
          ...(data.invoiceIds ? { id: { in: data.invoiceIds } } : {}),
        },
        orderBy: [
          { dueDate: "asc" }, // Pay oldest due first
          { date: "asc" }, // Then by invoice date
        ],
      });

      let remainingAmount = new Decimal(data.amount);
      let totalAllocated = new Decimal(0);
      const invoicesUpdated: {
        invoiceId: string;
        amountApplied: Decimal;
        newBalance: Decimal;
        newStatus: string;
      }[] = [];

      // 3. Allocate payment to invoices
      for (const invoice of openInvoices) {
        if (remainingAmount.lte(0)) break;

        const invoiceBalance = invoice.balance;
        const amountToApply = remainingAmount.gte(invoiceBalance)
          ? invoiceBalance
          : remainingAmount;

        // Create payment application record
        await tx.paymentApplication.create({
          data: {
            customerPaymentId: payment.id,
            invoiceId: invoice.id,
            amountApplied: amountToApply,
            notes: `Auto-allocation from payment ${payment.id}`,
          },
        });

        // Update invoice balance and status
        const newBalance = invoiceBalance.sub(amountToApply);
        const newStatus = newBalance.eq(0) ? "PAID" : "PARTIAL";

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            balance: newBalance,
            status: newStatus,
          },
        });

        invoicesUpdated.push({
          invoiceId: invoice.id,
          amountApplied: amountToApply,
          newBalance,
          newStatus,
        });

        remainingAmount = remainingAmount.sub(amountToApply);
        totalAllocated = totalAllocated.add(amountToApply);
      }

      // 4. Handle overpayment (create credit)
      let creditCreated: { creditId: string; amount: Decimal } | undefined;
      if (remainingAmount.gt(0)) {
        const credit = await tx.credit.create({
          data: {
            customerId: data.customerId,
            amount: remainingAmount,
            availableAmount: remainingAmount,
            sourcePaymentId: payment.id,
            reason: "OVERPAYMENT",
            description: `Credit from overpayment on payment ${payment.id}`,
            createdByUserId: data.recordedByUserId,
            status: "ACTIVE",
          },
        });

        creditCreated = { creditId: credit.id, amount: remainingAmount };
      }

      // 5. Update payment allocation summary
      await tx.customerPayment.update({
        where: { id: payment.id },
        data: {
          allocatedAmount: totalAllocated,
          creditAmount: creditCreated?.amount || new Decimal(0),
        },
      });

      return {
        totalPaid: new Decimal(data.amount),
        totalAllocated,
        totalCredit: creditCreated?.amount || new Decimal(0),
        invoicesUpdated,
        creditCreated,
      };
    });
  }

  /**
   * Apply credit to specific invoice
   */
  async applyCreditToInvoice(
    creditId: string,
    invoiceId: string,
    amount: number,
    appliedByUserId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Get credit and validate
      const credit = await tx.credit.findUnique({
        where: { id: creditId },
      });

      if (!credit || credit.status !== "ACTIVE") {
        throw new Error("Credit not found or not active");
      }

      if (credit.availableAmount.lt(amount)) {
        throw new Error("Insufficient credit amount available");
      }

      // 2. Get invoice and validate
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice || invoice.customerId !== credit.customerId) {
        throw new Error("Invoice not found or belongs to different customer");
      }

      if (invoice.balance.eq(0)) {
        throw new Error("Invoice is already fully paid");
      }

      // 3. Calculate application amount
      const maxApplicable = invoice.balance.lt(amount)
        ? invoice.balance
        : new Decimal(amount);

      // 4. Create credit application
      await tx.creditApplication.create({
        data: {
          creditId,
          invoiceId,
          amountApplied: maxApplicable,
          appliedByUserId,
          notes: `Credit application to invoice ${invoice.invoiceNumber}`,
        },
      });

      // 5. Update credit available amount
      const newCreditAvailable = credit.availableAmount.sub(maxApplicable);
      await tx.credit.update({
        where: { id: creditId },
        data: {
          availableAmount: newCreditAvailable,
          status: newCreditAvailable.eq(0) ? "APPLIED" : "ACTIVE",
        },
      });

      // 6. Update invoice balance and status
      const newInvoiceBalance = invoice.balance.sub(maxApplicable);
      const newInvoiceStatus = newInvoiceBalance.eq(0) ? "PAID" : "PARTIAL";

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          balance: newInvoiceBalance,
          status: newInvoiceStatus,
        },
      });

      return {
        creditId,
        invoiceId,
        amountApplied: maxApplicable,
        newCreditAvailable,
        newInvoiceBalance,
        newInvoiceStatus,
      };
    });
  }

  /**
   * Get customer payment history
   */
  async getCustomerPayments(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.customerPayment.findMany({
        where: { customerId },
        include: {
          recordedBy: {
            select: { id: true, fullName: true },
          },
          paymentApplications: {
            include: {
              invoice: {
                select: { id: true, invoiceNumber: true, totalAmount: true },
              },
            },
          },
        },
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.customerPayment.count({
        where: { customerId },
      }),
    ]);

    return {
      payments,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * Get customer credits
   */
  async getCustomerCredits(customerId: string, activeOnly = true) {
    const credits = await prisma.credit.findMany({
      where: {
        customerId,
        ...(activeOnly ? { status: "ACTIVE", availableAmount: { gt: 0 } } : {}),
      },
      include: {
        createdBy: {
          select: { id: true, fullName: true },
        },
        creditApplications: {
          include: {
            invoice: {
              select: { id: true, invoiceNumber: true },
            },
            appliedBy: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalAvailableCredit = credits
      .filter((c) => c.status === "ACTIVE")
      .reduce((sum, credit) => sum.add(credit.availableAmount), new Decimal(0));

    return {
      credits,
      totalAvailableCredit,
    };
  }

  /**
   * Get customer ledger (invoices, payments, credits)
   */
  async getCustomerLedger(customerId: string) {
    const [customer, invoices, payments, credits] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        select: { openingBalance: true },
      }),
      prisma.invoice.findMany({
        where: { customerId },
        include: {
          paymentApplications: {
            include: {
              customerPayment: {
                select: {
                  id: true,
                  paymentDate: true,
                  amount: true,
                  paymentMethod: true,
                },
              },
            },
          },
          creditApplications: {
            include: {
              credit: {
                select: { id: true, amount: true, reason: true },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.customerPayment.findMany({
        where: { customerId },
        include: {
          paymentApplications: {
            include: {
              invoice: {
                select: { id: true, invoiceNumber: true },
              },
            },
          },
        },
        orderBy: { paymentDate: "desc" },
      }),
      prisma.credit.findMany({
        where: { customerId },
        include: {
          creditApplications: {
            include: {
              invoice: {
                select: { id: true, invoiceNumber: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const openingBalance = customer?.openingBalance || new Decimal(0);

    // Calculate customer summary - SIMPLIFIED CUSTOMER-LEVEL ACCOUNTING
    // Opening balance + Total invoiced - Total paid = Current balance
    const totalInvoiced = invoices.reduce(
      (sum, inv) => sum.add(inv.totalAmount),
      new Decimal(0)
    );

    // Sum ALL completed payments for this customer (regardless of allocation)
    const totalPaid = payments
      .filter((pay) => pay.status === "COMPLETED")
      .reduce((sum, pay) => sum.add(pay.amount), new Decimal(0));

    // Calculate actual balance: opening balance + invoices - payments
    const actualBalance = openingBalance.add(totalInvoiced).sub(totalPaid);

    // If balance is negative, that's available credit
    const totalCredit = actualBalance.isNegative()
      ? actualBalance.abs()
      : new Decimal(0);

    // Outstanding balance is positive balance only
    const totalBalance = actualBalance.isPositive()
      ? actualBalance
      : new Decimal(0);

    return {
      invoices,
      payments,
      credits,
      summary: {
        openingBalance,
        totalInvoiced,
        totalPaid,
        totalCredit,
        totalBalance,
      },
    };
  }

  /**
   * Initialize invoice balances (for migration from existing invoices)
   */
  async initializeInvoiceBalances() {
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [{ balance: { equals: 0 } }],
      },
    });

    for (const invoice of invoices) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          balance: invoice.totalAmount,
          status: invoice.status === "COMPLETED" ? "OPEN" : invoice.status,
        },
      });
    }

    return { updated: invoices.length };
  }
}

export const paymentService = new PaymentService();
