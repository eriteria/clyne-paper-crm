import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// @desc    Get low stock items
// @route   GET /api/inventory/low-stock
// @access  Private
router.get(
  "/low-stock",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Use raw SQL for the comparison since Prisma doesn't support field-to-field comparison
      const lowStockItems = await prisma.$queryRaw`
      SELECT * FROM inventory_items 
      WHERE current_quantity <= min_stock 
      ORDER BY current_quantity ASC, name ASC
    `;

      res.json({
        success: true,
        data: {
          items: lowStockItems,
          count: (lowStockItems as any[]).length,
        },
      });
    } catch (error) {
      logger.error("Error fetching low stock items:", error);
      next(error);
    }
  }
);

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
router.get("/", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { page = 1, limit = 10, search, inStock, lowStock } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { sku: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
        { location: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (inStock === "true") {
      where.currentQuantity = { gt: 0 };
    }

    if (lowStock === "true") {
      // For low stock filter, we need to fetch all items and filter in application
      // since Prisma doesn't support field-to-field comparison
      const allItems = await prisma.inventoryItem.findMany();
      const lowStockItemIds = allItems
        .filter(
          (item: any) =>
            item.currentQuantity <= item.minStock && item.currentQuantity > 0
        )
        .map((item: any) => item.id);

      where.id = { in: lowStockItemIds };
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              productGroup: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching inventory items:", error);
    next(error);
  }
});

// @desc    Get inventory items for invoicing (only items linked to products)
// @route   GET /api/inventory/for-invoicing
// @access  Private
router.get(
  "/for-invoicing",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { location } = req.query;

      // Build filters
      const where: any = {
        productId: { not: null }, // Only items linked to products
        currentQuantity: { gt: 0 }, // Only items in stock
      };

      if (location) {
        where.location = { contains: location as string, mode: "insensitive" };
      }

      const items = await prisma.inventoryItem.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              monthlyTarget: true,
              productGroup: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ product: { name: "asc" } }, { location: "asc" }],
      });

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      logger.error("Error fetching inventory items for invoicing:", error);
      next(error);
    }
  }
);

// @desc    Get inventory item by ID
// @route   GET /api/inventory/:id
// @access  Private
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      res.status(404).json({
        success: false,
        error: "Inventory item not found",
      });
      return;
    }

    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    logger.error("Error fetching inventory item:", error);
    next(error);
  }
});

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private (Admin/Warehouse)
router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      sku,
      unit,
      unitPrice,
      currentQuantity,
      minStock,
      description,
      location,
    } = req.body;

    // Validate required fields
    if (!name || !sku || !unit || currentQuantity === undefined) {
      res.status(400).json({
        success: false,
        error: "Please provide name, sku, unit, and currentQuantity",
      });
      return;
    }

    // Check if SKU already exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { sku },
    });

    if (existingItem) {
      res.status(400).json({
        success: false,
        error: "Item with this SKU already exists",
      });
      return;
    }

    // Create inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        sku,
        unit,
        unitPrice: unitPrice ? parseFloat(unitPrice) : 0,
        currentQuantity: parseFloat(currentQuantity),
        minStock: minStock ? parseFloat(minStock) : 0,
        description,
        location,
      },
    });

    logger.info(`New inventory item created: ${item.name} (${item.sku})`);

    res.status(201).json({
      success: true,
      data: { item },
    });
  } catch (error) {
    logger.error("Error creating inventory item:", error);
    next(error);
  }
});

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (Admin/Warehouse)
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      sku,
      unit,
      currentQuantity,
      minStock,
      unitPrice,
      description,
      location,
    } = req.body;

    // Check if item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      res.status(404).json({
        success: false,
        error: "Inventory item not found",
      });
      return;
    }

    // Check if SKU is taken by another item
    if (sku && sku !== existingItem.sku) {
      const skuTaken = await prisma.inventoryItem.findUnique({
        where: { sku },
      });

      if (skuTaken) {
        res.status(400).json({
          success: false,
          error: "SKU is already taken",
        });
        return;
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (name) updateData.name = name;
    if (sku) updateData.sku = sku;
    if (unit) updateData.unit = unit;
    if (currentQuantity !== undefined)
      updateData.currentQuantity = parseFloat(currentQuantity);
    if (minStock !== undefined) updateData.minStock = parseFloat(minStock);
    if (unitPrice !== undefined) updateData.unitPrice = parseFloat(unitPrice);
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;

    // Update item
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Inventory item updated: ${item.name} (${item.sku})`);

    res.json({
      success: true,
      data: { item },
    });
  } catch (error) {
    logger.error("Error updating inventory item:", error);
    next(error);
  }
});

// @desc    Update inventory stock (stock adjustment)
// @route   PUT /api/inventory/:id/stock
// @access  Private (Admin/Warehouse)
router.put("/:id/stock", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;

    // Validate input
    if (!quantity || !type || !["add", "subtract", "set"].includes(type)) {
      res.status(400).json({
        success: false,
        error: "Please provide quantity and type (add/subtract/set)",
      });
      return;
    }

    // Check if item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      res.status(404).json({
        success: false,
        error: "Inventory item not found",
      });
      return;
    }

    let newStock: number;
    const qty = parseFloat(quantity);

    switch (type) {
      case "add":
        newStock = existingItem.currentQuantity + qty;
        break;
      case "subtract":
        newStock = existingItem.currentQuantity - qty;
        if (newStock < 0) {
          res.status(400).json({
            success: false,
            error: "Cannot reduce stock below zero",
          });
          return;
        }
        break;
      case "set":
        newStock = qty;
        if (newStock < 0) {
          res.status(400).json({
            success: false,
            error: "Stock cannot be negative",
          });
          return;
        }
        break;
      default:
        res.status(400).json({
          success: false,
          error: "Invalid stock adjustment type",
        });
        return;
    }

    // Update stock
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { currentQuantity: newStock },
    });

    logger.info(
      `Stock adjusted for ${item.name}: ${existingItem.currentQuantity} -> ${newStock} (${type} ${qty}) - Reason: ${reason || "No reason provided"}`
    );

    res.json({
      success: true,
      data: {
        item,
        stockAdjustment: {
          previousStock: existingItem.currentQuantity,
          newStock,
          adjustmentType: type,
          adjustmentQuantity: qty,
          reason: reason || "No reason provided",
        },
      },
    });
  } catch (error) {
    logger.error("Error adjusting inventory stock:", error);
    next(error);
  }
});

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (Admin only)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if item exists
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      res.status(404).json({
        success: false,
        error: "Inventory item not found",
      });
      return;
    }

    // Check if item is referenced in waybills or invoices
    const [waybillItems, invoiceItems] = await Promise.all([
      prisma.waybillItem.findFirst({
        where: { inventoryItemId: id },
      }),
      prisma.invoiceItem.findFirst({
        where: { inventoryItemId: id },
      }),
    ]);

    if (waybillItems || invoiceItems) {
      res.status(400).json({
        success: false,
        error: "Cannot delete item that is referenced in waybills or invoices",
      });
      return;
    }

    // Delete item
    await prisma.inventoryItem.delete({
      where: { id },
    });

    logger.info(`Inventory item deleted: ${item.name} (${item.sku})`);

    res.json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting inventory item:", error);
    next(error);
  }
});

export default router;
