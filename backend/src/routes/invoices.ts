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
