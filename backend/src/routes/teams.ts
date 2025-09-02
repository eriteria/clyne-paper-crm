import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";

const router = express.Router();

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public (for dropdowns)
router.get("/", async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        region: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    logger.error("Error fetching teams:", error);
    return next(error);
  }
});

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        region: true,
        members: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!team) {
      res.status(404).json({
        success: false,
        error: "Team not found",
      });
      return;
    }

    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    logger.error("Error fetching team:", error);
    next(error);
  }
});

export default router;
