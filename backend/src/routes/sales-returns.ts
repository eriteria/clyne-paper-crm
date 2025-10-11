import express from "express";
import { prisma } from "../server";
import { authenticate } from "../middleware/auth";
import { logger } from "../utils/logger";
import Joi from "joi";

const router = express.Router();

// Validation schema for creating a sales return
const createSalesReturnSchema = Joi.object({
  invoiceId: Joi.string().required(),
  reason: Joi.string().required(),
  notes: Joi.string().allow("").optional(),
  refundMethod: Joi.string().valid("Credit Note", "Bank Transfer").required(),
  items: Joi.array()
    .items(
      Joi.object({
        invoiceItemId: Joi.string().optional(),
        inventoryItemId: Joi.string().required(),
        productName: Joi.string().required(),
        sku: Joi.string().required(),
        quantityReturned: Joi.number().positive().required(),
        unitPrice: Joi.number().positive().required(),
        condition: Joi.string()
          .valid("Good", "Damaged", "Defective")
          .required(),
      })
    )
    .min(1)
    .required(),
});

// GET /api/sales-returns - List all sales returns with filters
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      page = "1",
      limit = "50",
      customerId,
      invoiceId,
      refundStatus,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (customerId) where.customerId = customerId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (refundStatus) where.refundStatus = refundStatus;

    if (startDate || endDate) {
      where.returnDate = {};
      if (startDate) where.returnDate.gte = new Date(startDate as string);
      if (endDate) where.returnDate.lte = new Date(endDate as string);
    }

    const [salesReturns, total] = await Promise.all([
      prisma.salesReturn.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              date: true,
              totalAmount: true,
            },
          },
          items: {
            include: {
              inventoryItem: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.salesReturn.count({ where }),
    ]);

    res.json({
      success: true,
      data: salesReturns,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch sales returns", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/sales-returns/:id - Get a single sales return by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id },
      include: {
        customer: true,
        invoice: {
          include: {
            items: {
              include: {
                inventoryItem: true,
              },
            },
          },
        },
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!salesReturn) {
      return res
        .status(404)
        .json({ success: false, error: "Sales return not found" });
    }

    res.json({ success: true, data: salesReturn });
  } catch (error) {
    logger.error("Failed to fetch sales return", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/sales-returns - Create a new sales return
router.post("/", authenticate, async (req, res) => {
  try {
    const { error, value } = createSalesReturnSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, error: error.details[0].message });
    }

    const { invoiceId, reason, notes, refundMethod, items } = value;
    const userId = (req as any).user.userId;

    // Fetch the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, error: "Invoice not found" });
    }

    // Check return policy (customer-specific)
    const returnPolicyDays = invoice.customer.returnPolicyDays || 30;
    const daysSinceInvoice = Math.floor(
      (Date.now() - invoice.date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceInvoice > returnPolicyDays) {
      return res.status(400).json({
        success: false,
        error: `Return period expired. This customer's return policy is ${returnPolicyDays} days.`,
      });
    }

    // Validate quantities
    for (const item of items) {
      const invoiceItem = invoice.items.find(
        (ii) => ii.inventoryItemId === item.inventoryItemId
      );
      if (!invoiceItem) {
        return res.status(400).json({
          success: false,
          error: `Item ${item.productName} not found in invoice`,
        });
      }

      // Check if quantity returned exceeds invoice quantity
      // (We need to account for previous returns)
      const previousReturns = await prisma.salesReturnItem.aggregate({
        where: {
          salesReturn: {
            invoiceId: invoiceId,
          },
          inventoryItemId: item.inventoryItemId,
        },
        _sum: {
          quantityReturned: true,
        },
      });

      const totalReturned =
        Number(previousReturns._sum.quantityReturned || 0) +
        Number(item.quantityReturned);

      if (totalReturned > Number(invoiceItem.quantity)) {
        return res.status(400).json({
          success: false,
          error: `Cannot return more than invoiced quantity for ${item.productName}`,
        });
      }
    }

    // Calculate total amount
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantityReturned * item.unitPrice,
      0
    );

    // Generate return number
    const lastReturn = await prisma.salesReturn.findFirst({
      orderBy: { createdAt: "desc" },
    });

    const lastNumber = lastReturn
      ? parseInt(lastReturn.returnNumber.split("-").pop() || "0")
      : 0;
    const returnNumber = `RET-${new Date().getFullYear()}-${String(
      lastNumber + 1
    ).padStart(4, "0")}`;

    // Create sales return with items
    const salesReturn = await prisma.salesReturn.create({
      data: {
        returnNumber,
        invoiceId,
        customerId: invoice.customerId,
        reason,
        notes,
        totalAmount,
        refundMethod,
        refundStatus: "Pending",
        restockStatus: "Pending",
        createdBy: userId,
        items: {
          create: items.map((item: any) => ({
            invoiceItemId: item.invoiceItemId,
            inventoryItemId: item.inventoryItemId,
            productName: item.productName,
            sku: item.sku,
            quantityReturned: item.quantityReturned,
            unitPrice: item.unitPrice,
            subtotal: item.quantityReturned * item.unitPrice,
            condition: item.condition,
            restocked: false,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
        invoice: true,
      },
    });

    logger.info(`Sales return created: ${returnNumber} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: salesReturn,
    });
  } catch (error) {
    logger.error("Failed to create sales return", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/sales-returns/:id/process - Process a sales return (restock & refund)
router.post("/:id/process", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const salesReturn = await prisma.salesReturn.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
        invoice: true,
      },
    });

    if (!salesReturn) {
      return res
        .status(404)
        .json({ success: false, error: "Sales return not found" });
    }

    if (salesReturn.refundStatus === "Completed") {
      return res.status(400).json({
        success: false,
        error: "Sales return already processed",
      });
    }

    // Process each item - restock if condition is "Good"
    for (const item of salesReturn.items) {
      if (item.condition === "Good" && item.inventoryItem) {
        // Increase inventory quantity
        await prisma.inventoryItem.update({
          where: { id: item.inventoryItemId! },
          data: {
            currentQuantity: {
              increment: item.quantityReturned,
            },
          },
        });

        // Mark item as restocked
        await prisma.salesReturnItem.update({
          where: { id: item.id },
          data: { restocked: true },
        });
      }
    }

    // Update sales return status
    const updatedReturn = await prisma.salesReturn.update({
      where: { id },
      data: {
        refundStatus: "Completed",
        restockStatus: salesReturn.items.some((i) => i.condition === "Good")
          ? "Restocked"
          : "Not Restocked",
        processedAt: new Date(),
        processedBy: userId,
      },
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
        customer: true,
        invoice: true,
      },
    });

    logger.info(
      `Sales return processed: ${salesReturn.returnNumber} by user ${userId}`
    );

    res.json({
      success: true,
      data: updatedReturn,
      message: "Sales return processed successfully",
    });
  } catch (error) {
    logger.error("Failed to process sales return", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/sales-returns/invoice/:invoiceId - Get returns for a specific invoice
router.get("/invoice/:invoiceId", authenticate, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const salesReturns = await prisma.salesReturn.findMany({
      where: { invoiceId },
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: salesReturns });
  } catch (error) {
    logger.error("Failed to fetch invoice returns", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
