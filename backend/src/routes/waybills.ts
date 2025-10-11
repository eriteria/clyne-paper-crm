import express from "express";
import { PrismaClient, WaybillStatus, WaybillItemStatus } from "@prisma/client";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

// Get all waybills with pagination and filtering
router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 10, status, locationId, supplier } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (locationId) where.locationId = locationId;
    if (supplier) where.supplier = { contains: supplier, mode: "insensitive" };

    const [waybills, total] = await Promise.all([
      prisma.waybill.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          location: true,
          receivedBy: { select: { id: true, fullName: true } },
          items: {
            include: {
              inventoryItem: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.waybill.count({ where }),
    ]);

    return res.json({
      waybills,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching waybills:", error);
    return res.status(500).json({ error: "Failed to fetch waybills" });
  }
});

// Get single waybill with details
router.get("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const waybill = await prisma.waybill.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        receivedBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!waybill) {
      return res.status(404).json({ error: "Waybill not found" });
    }

    return res.json(waybill);
  } catch (error) {
    console.error("Error fetching waybill:", error);
    return res.status(500).json({ error: "Failed to fetch waybill" });
  }
});

// Create new waybill
router.post("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      waybillNumber,
      supplierName,
      supplierContact,
      locationId,
      notes,
      items,
    } = req.body;

    const userId = req.user!.id;

    // Validate location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(400).json({ error: "Invalid location" });
    }

    // Create waybill with items in transaction
    const waybill = await prisma.$transaction(async (tx) => {
      const newWaybill = await tx.waybill.create({
        data: {
          waybillNumber,
          supplier: supplierName, // Map supplierName to supplier field
          date: new Date(), // Use current date for waybill creation
          locationId,
          receivedByUserId: userId,
          notes,
          status: WaybillStatus.PENDING,
        },
      });

      // Create waybill items
      const waybillItems = await Promise.all(
        items.map((item: any) =>
          tx.waybillItem.create({
            data: {
              waybillId: newWaybill.id,
              sku: item.sku,
              name: item.name,
              description: item.description,
              unit: item.unit,
              quantityReceived: item.quantityReceived, // Use quantityReceived from frontend
              unitCost: item.unitCost,
              batchNo: item.batchNo,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              // inventoryItemId will be set during processing, not creation
              status: WaybillItemStatus.PENDING,
            },
          })
        )
      );

      return { ...newWaybill, items: waybillItems };
    });

    return res.status(201).json(waybill);
  } catch (error: any) {
    console.error("Error creating waybill:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Waybill number already exists" });
    }
    return res.status(500).json({ error: "Failed to create waybill" });
  }
});

// Update existing waybill
router.put("/:id", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const waybillId = req.params.id;
    const {
      waybillNumber,
      supplierName,
      supplierContact,
      locationId,
      notes,
      items,
    } = req.body;

    const userId = req.user!.id;

    // Check if waybill exists and is still editable
    const existingWaybill = await prisma.waybill.findUnique({
      where: { id: waybillId },
      include: { items: true },
    });

    if (!existingWaybill) {
      return res.status(404).json({ error: "Waybill not found" });
    }

    if (existingWaybill.status !== WaybillStatus.PENDING) {
      return res.status(400).json({
        error: "Only pending waybills can be edited",
      });
    }

    // Validate location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(400).json({ error: "Invalid location" });
    }

    // Update waybill with items in transaction
    const waybill = await prisma.$transaction(async (tx) => {
      // Delete existing waybill items
      await tx.waybillItem.deleteMany({
        where: { waybillId },
      });

      // Update waybill
      const updatedWaybill = await tx.waybill.update({
        where: { id: waybillId },
        data: {
          waybillNumber,
          supplier: supplierName,
          locationId,
          notes,
        },
      });

      // Create new waybill items
      const waybillItems = await Promise.all(
        items.map((item: any) =>
          tx.waybillItem.create({
            data: {
              waybillId: updatedWaybill.id,
              sku: item.sku,
              name: item.name,
              description: item.description,
              unit: item.unit,
              quantityReceived: item.quantityReceived,
              unitCost: item.unitCost,
              batchNo: item.batchNo,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              status: WaybillItemStatus.PENDING,
            },
          })
        )
      );

      return { ...updatedWaybill, items: waybillItems };
    });

    return res.json(waybill);
  } catch (error: any) {
    console.error("Error updating waybill:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Waybill number already exists" });
    }
    return res.status(500).json({ error: "Failed to update waybill" });
  }
});

// Process waybill - hybrid approach
router.post(
  "/:id/process",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const waybillId = req.params.id;
      const userId = req.user!.id;

      const waybill = await prisma.waybill.findUnique({
        where: { id: waybillId },
        include: {
          items: true,
          location: true,
        },
      });

      if (!waybill) {
        return res.status(404).json({ error: "Waybill not found" });
      }

      if (waybill.status === WaybillStatus.COMPLETED) {
        return res.status(400).json({ error: "Waybill already processed" });
      }

      // Update waybill status to processing
      await prisma.waybill.update({
        where: { id: waybillId },
        data: {
          status: WaybillStatus.PROCESSING,
          processedBy: userId,
          processedAt: new Date(),
        },
      });

      const results = {
        matched: [] as any[],
        newProducts: [] as any[],
        processed: [] as any[],
      };

      // Process each item
      for (const item of waybill.items) {
        // Try to find existing inventory item by SKU and location
        const existingInventory = await prisma.inventoryItem.findFirst({
          where: {
            sku: item.sku,
            locationId: waybill.locationId,
          },
        });

        if (existingInventory) {
          // Match found - update inventory quantity
          const updatedInventory = await prisma.$transaction(async (tx) => {
            // Update inventory quantity
            const updated = await tx.inventoryItem.update({
              where: { id: existingInventory.id },
              data: {
                currentQuantity: {
                  increment: item.quantityReceived,
                },
                // Update unit cost with weighted average
                unitPrice: existingInventory.currentQuantity.equals(0)
                  ? item.unitCost
                  : existingInventory.unitPrice.add(
                      item.unitCost
                        .sub(existingInventory.unitPrice)
                        .mul(item.quantityReceived)
                        .div(
                          existingInventory.currentQuantity.add(
                            item.quantityReceived
                          )
                        )
                    ),
              },
            });

            // Update waybill item
            await tx.waybillItem.update({
              where: { id: item.id },
              data: {
                inventoryItemId: existingInventory.id,
                status: WaybillItemStatus.PROCESSED,
                processedAt: new Date(),
              },
            });

            return updated;
          });

          results.matched.push({
            waybillItem: item,
            inventoryItem: updatedInventory,
          });
        } else {
          // Check if product exists in system (any location)
          const existingProduct = await prisma.inventoryItem.findFirst({
            where: { sku: item.sku },
          });

          if (existingProduct) {
            // Product exists but not in this location - create new inventory item
            const newInventoryItem = await prisma.$transaction(async (tx) => {
              const newItem = await tx.inventoryItem.create({
                data: {
                  sku: item.sku,
                  name: item.name,
                  description: item.description,
                  unit: item.unit,
                  unitPrice: item.unitCost,
                  currentQuantity: item.quantityReceived,
                  minStock: 10, // Default minimum stock
                  locationId: waybill.locationId,
                  productId: existingProduct.productId, // Link to same product if available
                },
              });

              // Update waybill item
              await tx.waybillItem.update({
                where: { id: item.id },
                data: {
                  inventoryItemId: newItem.id,
                  status: WaybillItemStatus.PROCESSED,
                  processedAt: new Date(),
                },
              });

              return newItem;
            });

            results.processed.push({
              waybillItem: item,
              inventoryItem: newInventoryItem,
            });
          } else {
            // Completely new product - mark for review
            await prisma.waybillItem.update({
              where: { id: item.id },
              data: {
                status: WaybillItemStatus.NEW_PRODUCT,
              },
            });

            results.newProducts.push(item);
          }
        }
      }

      // Update waybill final status
      const hasNewProducts = results.newProducts.length > 0;
      const finalStatus = hasNewProducts
        ? WaybillStatus.REVIEW
        : WaybillStatus.COMPLETED;

      await prisma.waybill.update({
        where: { id: waybillId },
        data: { status: finalStatus },
      });

      return res.json({
        message: "Waybill processing completed",
        status: finalStatus,
        results: {
          matched: results.matched.length,
          processed: results.processed.length,
          newProducts: results.newProducts.length,
        },
        details: results,
      });
    } catch (error) {
      console.error("Error processing waybill:", error);
      return res.status(500).json({ error: "Failed to process waybill" });
    }
  }
);

// Approve new products from waybill
router.post(
  "/:id/approve-products",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const waybillId = req.params.id;
      const { approvedItems } = req.body; // Array of { waybillItemId, productData }

      const results: Array<{ waybillItemId: string; inventoryItem: any }> = [];

      for (const approval of approvedItems) {
        const { waybillItemId, productData } = approval;

        const waybillItem = await prisma.waybillItem.findUnique({
          where: { id: waybillItemId },
          include: { waybill: true },
        });

        if (
          !waybillItem ||
          waybillItem.status !== WaybillItemStatus.NEW_PRODUCT
        ) {
          continue;
        }

        // Create new inventory item
        const newInventoryItem = await prisma.$transaction(async (tx) => {
          const newItem = await tx.inventoryItem.create({
            data: {
              sku: waybillItem.sku,
              name: productData.name || waybillItem.name,
              description: productData.description || waybillItem.description,
              unit: productData.unit || waybillItem.unit,
              unitPrice: waybillItem.unitCost,
              currentQuantity: waybillItem.quantityReceived,
              minStock: productData.minStock || 10,
              locationId: waybillItem.waybill.locationId,
            },
          });

          // Update waybill item
          await tx.waybillItem.update({
            where: { id: waybillItemId },
            data: {
              inventoryItemId: newItem.id,
              status: WaybillItemStatus.PROCESSED,
              processedAt: new Date(),
            },
          });

          return newItem;
        });

        results.push({
          waybillItemId,
          inventoryItem: newInventoryItem,
        });
      }

      // Check if all items are now processed
      const remainingNewProducts = await prisma.waybillItem.count({
        where: {
          waybillId,
          status: WaybillItemStatus.NEW_PRODUCT,
        },
      });

      if (remainingNewProducts === 0) {
        await prisma.waybill.update({
          where: { id: waybillId },
          data: { status: WaybillStatus.COMPLETED },
        });
      }

      return res.json({
        message: "Products approved successfully",
        results,
      });
    } catch (error) {
      console.error("Error approving products:", error);
      return res.status(500).json({ error: "Failed to approve products" });
    }
  }
);

// Get waybills requiring review
router.get(
  "/status/review",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const waybills = await prisma.waybill.findMany({
        where: { status: WaybillStatus.REVIEW },
        include: {
          location: true,
          receivedBy: { select: { id: true, fullName: true } },
          items: {
            where: { status: WaybillItemStatus.NEW_PRODUCT },
            include: {
              inventoryItem: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json(waybills);
    } catch (error) {
      console.error("Error fetching review waybills:", error);
      return res.status(500).json({ error: "Failed to fetch review waybills" });
    }
  }
);

export default router;
