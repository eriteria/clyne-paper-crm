import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";

const router = express.Router();

// @desc    Get all roles
// @route   GET /api/roles
// @access  Public (for dropdowns)
router.get("/", async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        permissions: true,
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    logger.error("Error fetching roles:", error);
    return next(error);
  }
});

// @desc    Get role by ID
// @route   GET /api/roles/:id
// @access  Public
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: "Role not found",
      });
    }

    return res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    logger.error("Error fetching role:", error);
    return next(error);
  }
});

export default router;
