import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";

const router = express.Router();

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
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
          billedByUser: {
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
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        billedByUser: {
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
});

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id
// @access  Private
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "pending", "paid", "overdue", "cancelled"];
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
        billedByUser: {
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
});

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
router.post("/", async (req, res, next) => {
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

    // Validate inventory items and check stock
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

        if (inventoryItem.currentQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.currentQuantity}, Requested: ${item.quantity}`
          );
        }

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

    // Generate unique invoice number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    // Get the count of invoices today for sequential numbering
    const todayStart = new Date(year, now.getMonth(), now.getDate());
    const todayEnd = new Date(year, now.getMonth(), now.getDate() + 1);

    const todayInvoiceCount = await prisma.invoice.count({
      where: {
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    const invoiceNumber = `INV-${year}${month}${day}-${String(todayInvoiceCount + 1).padStart(3, "0")}`;

    // Create invoice with transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get the first user as billed by user (temporary solution)
      const defaultUser = await tx.user.findFirst({
        where: { role: { name: "Admin" } },
      });

      if (!defaultUser) {
        throw new Error("No admin user found for billing");
      }

      // Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          date: new Date(),
          customerId,
          customerName: customer.name, // For backward compatibility
          customerContact: customer.phone || customer.email, // For backward compatibility
          billedByUserId: defaultUser.id,
          totalAmount,
          taxAmount: parseFloat(taxAmount),
          discountAmount: parseFloat(discountAmount),
          notes,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: "DRAFT",
        },
      });

      // Create invoice items and update inventory
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

    res.status(201).json({
      success: true,
      data: completeInvoice,
      message: "Invoice created successfully",
    });
  } catch (error) {
    logger.error("Error creating invoice:", error);

    if (
      error instanceof Error &&
      error.message.includes("Insufficient stock")
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

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
router.delete("/:id", async (req, res, next) => {
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
});

export default router;
