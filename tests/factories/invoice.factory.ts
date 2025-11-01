import { PrismaClient, InvoiceStatus } from "@prisma/client";
import { generateTestId } from "../utils/testDb";

export interface CreateInvoiceOptions {
  customerId?: string;
  userId?: string;
  teamId?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  currency?: string;
  status?: InvoiceStatus;
  dueDate?: Date;
  issueDate?: Date;
  notes?: string;
  items?: Array<{
    inventoryItemId?: string;
    quantity: number;
    unitPrice: number;
    description?: string;
  }>;
}

/**
 * Factory for creating test invoices
 */
export class InvoiceFactory {
  constructor(private prisma: PrismaClient) {}

  async create(options: CreateInvoiceOptions = {}) {
    const {
      customerId,
      userId,
      teamId,
      invoiceNumber = `INV-TEST-${generateTestId()}`,
      totalAmount = 10000,
      currency = "NGN",
      status = "PENDING",
      dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      issueDate = new Date(),
      notes,
      items = [],
    } = options;

    // Get customer if not provided
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      const customer = await this.prisma.customer.findFirst();
      if (!customer) {
        throw new Error("No customer found. Create a customer first.");
      }
      finalCustomerId = customer.id;
    }

    // Get user if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      const user = await this.prisma.user.findFirst();
      if (!user) {
        throw new Error("No user found. Create a user first.");
      }
      finalUserId = user.id;
    }

    // Calculate actual total from items if provided
    const calculatedTotal =
      items.length > 0
        ? items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
        : totalAmount;

    const invoice = await this.prisma.invoice.create({
      data: {
        customerId: finalCustomerId,
        userId: finalUserId,
        teamId,
        invoiceNumber,
        totalAmount: calculatedTotal,
        currency,
        status,
        dueDate,
        issueDate,
        notes,
        items: {
          create: items.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            description: item.description || "Test item",
          })),
        },
      },
      include: {
        customer: true,
        user: true,
        team: true,
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    return invoice;
  }

  async createWithItems(
    customerId: string,
    itemCount: number = 3,
    options: Partial<CreateInvoiceOptions> = {}
  ) {
    // Get some inventory items
    const inventoryItems = await this.prisma.inventoryItem.findMany({
      take: itemCount,
    });

    const items = inventoryItems.map((item, index) => ({
      inventoryItemId: item.id,
      quantity: 10 + index * 5,
      unitPrice: parseFloat(item.unitPrice.toString()),
      description: `${item.name} - Test line item`,
    }));

    return this.create({
      ...options,
      customerId,
      items,
    });
  }

  async createPaid(options: Partial<CreateInvoiceOptions> = {}) {
    return this.create({
      ...options,
      status: "PAID",
    });
  }

  async createOverdue(options: Partial<CreateInvoiceOptions> = {}) {
    return this.create({
      ...options,
      status: "PENDING",
      dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    });
  }

  async createMany(count: number, options: CreateInvoiceOptions = {}) {
    const invoices = [];
    for (let i = 0; i < count; i++) {
      invoices.push(
        await this.create({
          ...options,
          invoiceNumber: `INV-TEST-${i}-${generateTestId()}`,
        })
      );
    }
    return invoices;
  }
}
