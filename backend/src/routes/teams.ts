import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";

const router = express.Router();

// @desc    Get all teams with pagination and filtering
// @route   GET /api/teams
// @access  Private
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      region,
      includeInactive = false,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        {
          leader: {
            fullName: { contains: search as string, mode: "insensitive" },
          },
        },
      ];
    }

    if (region) {
      where.regionId = region as string;
    }

    // For dropdown usage, return all teams without pagination
    if (req.query.dropdown === "true") {
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
    }

    // Get teams with pagination
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: {
          region: true,
          leader: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
              customers: true,
              invoices: true,
            },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limitNum,
      }),
      prisma.team.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        teams,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      },
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
        leader: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        members: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { fullName: "asc" },
        },
        customers: {
          select: {
            id: true,
            name: true,
            location: true,
          },
          orderBy: { name: "asc" },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
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

// @desc    Create new team
// @route   POST /api/teams
// @access  Private (Admin/Manager)
router.post("/", async (req, res, next) => {
  try {
    const { name, regionId, leaderUserId, locationNames = [] } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Team name is required",
      });
    }

    if (!regionId) {
      return res.status(400).json({
        success: false,
        error: "Region is required",
      });
    }

    // Check if team name already exists
    const existingTeam = await prisma.team.findUnique({
      where: { name },
    });

    if (existingTeam) {
      return res.status(400).json({
        success: false,
        error: "Team name already exists",
      });
    }

    // Validate region exists
    const region = await prisma.region.findUnique({
      where: { id: regionId },
    });

    if (!region) {
      return res.status(400).json({
        success: false,
        error: "Invalid region ID",
      });
    }

    // Validate leader if provided
    if (leaderUserId) {
      const leader = await prisma.user.findUnique({
        where: { id: leaderUserId },
      });

      if (!leader) {
        return res.status(400).json({
          success: false,
          error: "Invalid leader user ID",
        });
      }
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        regionId,
        leaderUserId,
        locationNames: Array.isArray(locationNames) ? locationNames : [],
      },
      include: {
        region: true,
        leader: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    logger.info(`Team created: ${team.name} by user`);

    res.status(201).json({
      success: true,
      data: team,
      message: "Team created successfully",
    });
  } catch (error) {
    logger.error("Error creating team:", error);
    next(error);
  }
});

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private (Admin/Manager)
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, regionId, leaderUserId, locationNames } = req.body;

    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id },
    });

    if (!existingTeam) {
      return res.status(404).json({
        success: false,
        error: "Team not found",
      });
    }

    // Check if new name conflicts with another team
    if (name && name !== existingTeam.name) {
      const nameConflict = await prisma.team.findUnique({
        where: { name },
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          error: "Team name already exists",
        });
      }
    }

    // Validate region if provided
    if (regionId) {
      const region = await prisma.region.findUnique({
        where: { id: regionId },
      });

      if (!region) {
        return res.status(400).json({
          success: false,
          error: "Invalid region ID",
        });
      }
    }

    // Validate leader if provided
    if (leaderUserId) {
      const leader = await prisma.user.findUnique({
        where: { id: leaderUserId },
      });

      if (!leader) {
        return res.status(400).json({
          success: false,
          error: "Invalid leader user ID",
        });
      }
    }

    // Update team
    const updatedTeam = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(regionId && { regionId }),
        ...(leaderUserId !== undefined && { leaderUserId }),
        ...(locationNames && {
          locationNames: Array.isArray(locationNames) ? locationNames : [],
        }),
      },
      include: {
        region: true,
        leader: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    logger.info(`Team updated: ${updatedTeam.name}`);

    res.json({
      success: true,
      data: updatedTeam,
      message: "Team updated successfully",
    });
  } catch (error) {
    logger.error("Error updating team:", error);
    next(error);
  }
});

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private (Admin only)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            customers: true,
            invoices: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: "Team not found",
      });
    }

    // Check if team has dependencies
    if (team._count.members > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete team. It has ${team._count.members} members. Please reassign them first.`,
      });
    }

    if (team._count.customers > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete team. It has ${team._count.customers} customers. Please reassign them first.`,
      });
    }

    if (team._count.invoices > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete team. It has ${team._count.invoices} invoices. Please reassign them first.`,
      });
    }

    // Delete team
    await prisma.team.delete({
      where: { id },
    });

    logger.info(`Team deleted: ${team.name}`);

    res.json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting team:", error);
    next(error);
  }
});

// @desc    Add members to team
// @route   POST /api/teams/:id/members
// @access  Private (Admin/Manager)
router.post("/:id/members", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "User IDs array is required",
      });
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: "Team not found",
      });
    }

    // Validate all user IDs exist
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        error: "One or more user IDs are invalid",
      });
    }

    // Update users to join the team
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { teamId: id },
    });

    logger.info(`Added ${userIds.length} members to team: ${team.name}`);

    res.json({
      success: true,
      message: `Successfully added ${userIds.length} members to the team`,
    });
  } catch (error) {
    logger.error("Error adding team members:", error);
    next(error);
  }
});

// @desc    Remove members from team
// @route   DELETE /api/teams/:id/members
// @access  Private (Admin/Manager)
router.delete("/:id/members", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "User IDs array is required",
      });
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: "Team not found",
      });
    }

    // Remove users from the team
    await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        teamId: id,
      },
      data: { teamId: null },
    });

    logger.info(`Removed ${userIds.length} members from team: ${team.name}`);

    res.json({
      success: true,
      message: `Successfully removed ${userIds.length} members from the team`,
    });
  } catch (error) {
    logger.error("Error removing team members:", error);
    next(error);
  }
});

export default router;
