import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// @desc    Get monthly sales targets for current user
// @route   GET /api/sales-targets
// @access  Private
router.get("/", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { year, month } = req.query;
    const currentDate = new Date();
    const targetYear = year
      ? parseInt(year as string)
      : currentDate.getFullYear();
    const targetMonth = month
      ? parseInt(month as string)
      : currentDate.getMonth() + 1;

    const targets = await prisma.monthlySalesTarget.findMany({
      where: {
        userId: req.user!.id,
        year: targetYear,
        month: targetMonth,
      },
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
      orderBy: {
        product: {
          name: "asc",
        },
      },
    });

    res.json({
      success: true,
      data: targets,
    });
  } catch (error) {
    logger.error("Error fetching monthly sales targets:", error);
    next(error);
  }
});

// @desc    Get monthly sales summary for current user
// @route   GET /api/sales-targets/summary
// @access  Private
router.get(
  "/summary",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { year, month } = req.query;
      const currentDate = new Date();
      const targetYear = year
        ? parseInt(year as string)
        : currentDate.getFullYear();
      const targetMonth = month
        ? parseInt(month as string)
        : currentDate.getMonth() + 1;

      const targets = await prisma.monthlySalesTarget.findMany({
        where: {
          userId: req.user!.id,
          year: targetYear,
          month: targetMonth,
        },
        include: {
          product: {
            select: {
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
      });

      // Calculate summary
      const summary = {
        totalTargetQuantity: targets.reduce(
          (sum, target) => sum + Number(target.targetQuantity),
          0
        ),
        totalAchievedQuantity: targets.reduce(
          (sum, target) => sum + Number(target.achievedQuantity),
          0
        ),
        totalTargetAmount: targets.reduce(
          (sum, target) => sum + Number(target.targetAmount),
          0
        ),
        totalAchievedAmount: targets.reduce(
          (sum, target) => sum + Number(target.achievedAmount),
          0
        ),
        productsCount: targets.length,
        year: targetYear,
        month: targetMonth,
      };

      res.json({
        success: true,
        data: {
          summary,
          targets,
        },
      });
    } catch (error) {
      logger.error("Error fetching monthly sales summary:", error);
      next(error);
    }
  }
);

// @desc    Set target for a product
// @route   POST /api/sales-targets
// @access  Private
router.post("/", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { productId, year, month, targetQuantity, targetAmount } = req.body;

    if (!productId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: "Product ID, year, and month are required",
      });
    }

    const target = await prisma.monthlySalesTarget.upsert({
      where: {
        monthly_sales_targets_product_user_year_month_key: {
          productId,
          userId: req.user!.id,
          year: parseInt(year),
          month: parseInt(month),
        },
      },
      update: {
        targetQuantity: targetQuantity || 0,
        targetAmount: targetAmount || 0,
      },
      create: {
        productId,
        userId: req.user!.id,
        year: parseInt(year),
        month: parseInt(month),
        targetQuantity: targetQuantity || 0,
        targetAmount: targetAmount || 0,
      },
      include: {
        product: {
          select: {
            name: true,
            productGroup: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: target,
      message: "Sales target set successfully",
    });
  } catch (error) {
    logger.error("Error setting sales target:", error);
    next(error);
  }
});

export default router;
