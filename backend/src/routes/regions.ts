import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";

const router = express.Router();

// @desc    Get all regions
// @route   GET /api/regions
// @access  Public (for dropdowns)
router.get("/", async (req, res, next) => {
  try {
    const regions = await prisma.region.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      data: regions,
    });
  } catch (error) {
    logger.error("Error fetching regions:", error);
    return next(error);
  }
});

// @desc    Get region by ID
// @route   GET /api/regions/:id
// @access  Private
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        users: true,
      },
    });

    if (!region) {
      res.status(404).json({
        success: false,
        error: "Region not found",
      });
      return;
    }

    res.json({
      success: true,
      data: region,
    });
  } catch (error) {
    logger.error("Error fetching region:", error);
    next(error);
  }
});

export default router;
