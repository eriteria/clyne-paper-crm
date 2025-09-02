import express from "express";
import { Request, Response } from "express";
import { prisma } from "../server";
import { logCreate, logUpdate, logDelete } from "../utils/auditLogger";

const router = express.Router();

// Get all products with their groups and sales data
router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, search = "", groupId = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (search) {
      where.name = {
        contains: search as string,
        mode: "insensitive",
      };
    }

    if (groupId) {
      where.productGroupId = groupId as string;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          productGroup: true,
          inventoryItems: {
            include: {
              invoiceItems: {
                include: {
                  invoice: {
                    select: {
                      date: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate sales data for each product
    const productsWithSales = products.map((product) => {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      let monthlySales = 0;
      let totalSales = 0;

      product.inventoryItems.forEach((item) => {
        item.invoiceItems.forEach((invoiceItem) => {
          const invoiceDate = new Date(invoiceItem.invoice.date);
          const salesQuantity = Number(invoiceItem.quantity);
          const salesAmount = Number(invoiceItem.lineTotal);

          totalSales += salesAmount; // Keep total sales as revenue

          if (
            invoiceDate >= currentMonth &&
            invoiceItem.invoice.status !== "DRAFT"
          ) {
            monthlySales += salesQuantity; // Change monthly sales to quantity
          }
        });
      });

      return {
        ...product,
        monthlySales,
        totalSales,
        targetProgress:
          Number(product.monthlyTarget) > 0
            ? (monthlySales / Number(product.monthlyTarget)) * 100
            : 0,
      };
    });

    res.json({
      success: true,
      data: {
        products: productsWithSales,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
});

// Get product by ID with detailed analytics
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        productGroup: true,
        inventoryItems: {
          include: {
            invoiceItems: {
              include: {
                invoice: {
                  select: {
                    date: true,
                    status: true,
                    invoiceNumber: true,
                    customer: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Calculate detailed sales analytics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const salesByMonth: Record<string, number> = {};
    let monthlySales = 0;
    let totalSales = 0;
    const recentSales: any[] = [];

    product.inventoryItems.forEach((item) => {
      item.invoiceItems.forEach((invoiceItem) => {
        const invoiceDate = new Date(invoiceItem.invoice.date);
        const salesAmount = Number(invoiceItem.lineTotal);
        const monthKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`;

        totalSales += salesAmount;

        if (!salesByMonth[monthKey]) {
          salesByMonth[monthKey] = 0;
        }
        salesByMonth[monthKey] += salesAmount;

        if (
          invoiceDate >= currentMonth &&
          invoiceItem.invoice.status !== "DRAFT"
        ) {
          monthlySales += salesAmount;
        }

        // Collect recent sales
        recentSales.push({
          date: invoiceDate,
          amount: salesAmount,
          quantity: Number(invoiceItem.quantity),
          invoiceNumber: invoiceItem.invoice.invoiceNumber,
          customer: invoiceItem.invoice.customer.name,
        });
      });
    });

    // Sort recent sales by date (most recent first)
    recentSales.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json({
      success: true,
      data: {
        ...product,
        analytics: {
          monthlySales,
          totalSales,
          targetProgress:
            Number(product.monthlyTarget) > 0
              ? (monthlySales / Number(product.monthlyTarget)) * 100
              : 0,
          salesByMonth,
          recentSales: recentSales.slice(0, 10), // Last 10 sales
        },
      },
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
});

// Create new product
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, productGroupId, monthlyTarget = 0 } = req.body;

    if (!name || !productGroupId) {
      return res.status(400).json({
        success: false,
        message: "Product name and group are required",
      });
    }

    // Check if product group exists
    const productGroup = await prisma.productGroup.findUnique({
      where: { id: productGroupId },
    });

    if (!productGroup) {
      return res.status(400).json({
        success: false,
        message: "Product group not found",
      });
    }

    const product = await prisma.product.create({
      data: {
        name,
        productGroupId,
        monthlyTarget: Number(monthlyTarget),
      },
      include: {
        productGroup: true,
      },
    });

    // Log product creation
    await logCreate((req as any).user?.id, "PRODUCT", product.id, product);

    res.status(201).json({
      success: true,
      data: product,
      message: "Product created successfully",
    });
  } catch (error: any) {
    console.error("Error creating product:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A product with this name already exists in this group",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
});

// Update product
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, productGroupId, monthlyTarget } = req.body;

    // Get the original product for audit logging
    const originalProduct = await prisma.product.findUnique({
      where: { id },
      include: { productGroup: true },
    });

    if (!originalProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (productGroupId !== undefined)
      updateData.productGroupId = productGroupId;
    if (monthlyTarget !== undefined)
      updateData.monthlyTarget = Number(monthlyTarget);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        productGroup: true,
      },
    });

    // Log product update
    await logUpdate(
      (req as any).user?.id,
      "PRODUCT",
      product.id,
      originalProduct,
      product
    );

    res.json({
      success: true,
      data: product,
      message: "Product updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating product:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A product with this name already exists in this group",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
});

// Delete product
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get the product for audit logging before deletion
    const product = await prisma.product.findUnique({
      where: { id },
      include: { productGroup: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product has associated inventory items
    const inventoryCount = await prisma.inventoryItem.count({
      where: { productId: id },
    });

    if (inventoryCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete product with associated inventory items",
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    // Log product deletion
    await logDelete((req as any).user?.id, "PRODUCT", id, product);

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting product:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
});

// Bulk import products
router.post("/import", async (req: Request, res: Response) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products array is required",
      });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as any[],
    };

    for (const productData of products) {
      try {
        const { name, productGroupName, monthlyTarget = 0 } = productData;

        if (!name || !productGroupName) {
          results.errors.push({
            row: productData,
            error: "Product name and group name are required",
          });
          continue;
        }

        // Find or create product group
        let productGroup = await prisma.productGroup.findUnique({
          where: { name: productGroupName },
        });

        if (!productGroup) {
          productGroup = await prisma.productGroup.create({
            data: { name: productGroupName },
          });
        }

        // Try to find existing product
        const existingProduct = await prisma.product.findFirst({
          where: {
            name,
            productGroupId: productGroup.id,
          },
        });

        if (existingProduct) {
          // Update existing product
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: { monthlyTarget: Number(monthlyTarget) },
          });
          results.updated++;
        } else {
          // Create new product
          await prisma.product.create({
            data: {
              name,
              productGroupId: productGroup.id,
              monthlyTarget: Number(monthlyTarget),
            },
          });
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({
          row: productData,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`,
    });
  } catch (error) {
    console.error("Error importing products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to import products",
    });
  }
});

export default router;
