import express from "express";
import { Request, Response } from "express";
import { prisma } from "../server";

const router = express.Router();

// Get all product groups with aggregated analytics
router.get("/", async (req: Request, res: Response) => {
  try {
    const { includeAnalytics = "true" } = req.query;

    const productGroups = await prisma.productGroup.findMany({
      include: {
        products: {
          include:
            includeAnalytics === "true"
              ? {
                  inventoryItems: {
                    include: {
                      invoiceItems: {
                        include: {
                          invoice: { select: { date: true, status: true } },
                        },
                      },
                    },
                  },
                }
              : {},
        },
      },
      orderBy: { name: "asc" },
    });

    let groupsWithAnalytics: any = productGroups;

    if (includeAnalytics === "true") {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      groupsWithAnalytics = (productGroups as any).map((group: any) => {
        let totalTarget = 0;
        let totalMonthlySales = 0;
        let totalSales = 0;
        let productCount = group.products.length;

        const productPerformance = group.products.map((product) => {
          let productMonthlySales = 0;
          let productTotalSales = 0;

          if (product.inventoryItems) {
            product.inventoryItems.forEach((item: any) => {
              item.invoiceItems.forEach((invoiceItem: any) => {
                const invoiceDate = new Date(invoiceItem.invoice.date);
                const salesQuantity = Number(invoiceItem.quantity);
                const salesAmount = Number(invoiceItem.lineTotal);

                productTotalSales += salesAmount; // Keep total sales as revenue

                if (
                  invoiceDate >= currentMonth &&
                  invoiceItem.invoice.status !== "DRAFT"
                ) {
                  productMonthlySales += salesQuantity; // Change monthly sales to quantity
                }
              });
            });
          }

          totalTarget += Number(product.monthlyTarget);
          totalMonthlySales += productMonthlySales;
          totalSales += productTotalSales;

          return {
            id: product.id,
            name: product.name,
            monthlyTarget: Number(product.monthlyTarget),
            monthlySales: productMonthlySales,
            totalSales: productTotalSales,
            targetProgress:
              Number(product.monthlyTarget) > 0
                ? (productMonthlySales / Number(product.monthlyTarget)) * 100
                : 0,
          };
        });

        return {
          id: group.id,
          name: group.name,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          productCount,
          analytics: {
            totalTarget,
            totalMonthlySales,
            totalSales,
            targetProgress:
              totalTarget > 0 ? (totalMonthlySales / totalTarget) * 100 : 0,
            productPerformance,
          },
        };
      });
    }

    res.json({
      success: true,
      data: groupsWithAnalytics,
    });
  } catch (error) {
    console.error("Error fetching product groups:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product groups",
    });
  }
});

// Get specific product group with detailed analytics
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const productGroup = await prisma.productGroup.findUnique({
      where: { id },
      include: {
        products: {
          include: {
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
        },
      },
    });

    if (!productGroup) {
      return res.status(404).json({
        success: false,
        message: "Product group not found",
      });
    }

    // Calculate detailed analytics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const salesByMonth: Record<string, number> = {};
    let totalTarget = 0;
    let totalMonthlySales = 0;
    let totalSales = 0;

    const productPerformance = productGroup.products.map((product) => {
      let productMonthlySales = 0;
      let productTotalSales = 0;
      const productSalesByMonth: Record<string, number> = {};

      product.inventoryItems.forEach((item) => {
        item.invoiceItems.forEach((invoiceItem) => {
          const invoiceDate = new Date(invoiceItem.invoice.date);
          const salesQuantity = Number(invoiceItem.quantity);
          const salesAmount = Number(invoiceItem.lineTotal);
          const monthKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`;

          productTotalSales += salesAmount; // Keep total sales as revenue

          if (!salesByMonth[monthKey]) {
            salesByMonth[monthKey] = 0;
          }
          if (!productSalesByMonth[monthKey]) {
            productSalesByMonth[monthKey] = 0;
          }

          salesByMonth[monthKey] += salesAmount;
          productSalesByMonth[monthKey] += salesAmount;

          if (
            invoiceDate >= currentMonth &&
            invoiceItem.invoice.status !== "DRAFT"
          ) {
            productMonthlySales += salesQuantity; // Change monthly sales to quantity
          }
        });
      });

      totalTarget += Number(product.monthlyTarget);
      totalMonthlySales += productMonthlySales;
      totalSales += productTotalSales;

      return {
        id: product.id,
        name: product.name,
        monthlyTarget: Number(product.monthlyTarget),
        monthlySales: productMonthlySales,
        totalSales: productTotalSales,
        targetProgress:
          Number(product.monthlyTarget) > 0
            ? (productMonthlySales / Number(product.monthlyTarget)) * 100
            : 0,
        salesByMonth: productSalesByMonth,
        contributionToGroup:
          totalMonthlySales > 0
            ? (productMonthlySales / totalMonthlySales) * 100
            : 0,
      };
    });

    // Calculate contribution percentages after we have total sales
    const updatedProductPerformance = productPerformance.map((product) => ({
      ...product,
      contributionToGroup:
        totalMonthlySales > 0
          ? (product.monthlySales / totalMonthlySales) * 100
          : 0,
    }));

    res.json({
      success: true,
      data: {
        ...productGroup,
        analytics: {
          totalTarget,
          totalMonthlySales,
          totalSales,
          targetProgress:
            totalTarget > 0 ? (totalMonthlySales / totalTarget) * 100 : 0,
          salesByMonth,
          productPerformance: updatedProductPerformance,
          productCount: productGroup.products.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching product group:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product group",
    });
  }
});

// Create new product group
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Product group name is required",
      });
    }

    const productGroup = await prisma.productGroup.create({
      data: { name },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: productGroup,
      message: "Product group created successfully",
    });
  } catch (error: any) {
    console.error("Error creating product group:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A product group with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create product group",
    });
  }
});

// Update product group
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Product group name is required",
      });
    }

    const productGroup = await prisma.productGroup.update({
      where: { id },
      data: { name },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.json({
      success: true,
      data: productGroup,
      message: "Product group updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating product group:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Product group not found",
      });
    }

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A product group with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update product group",
    });
  }
});

// Delete product group
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if group has products
    const productCount = await prisma.product.count({
      where: { productGroupId: id },
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete product group with associated products",
      });
    }

    await prisma.productGroup.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Product group deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting product group:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Product group not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete product group",
    });
  }
});

export default router;
