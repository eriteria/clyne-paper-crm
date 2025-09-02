import express from "express";
import { Request, Response } from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";

const router = express.Router();

// @desc    Get audit logs with pagination and filtering
// @route   GET /api/audit-logs
// @access  Private (Admin only)
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 50,
      actionType,
      entityType,
      userId,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering
    const where: any = {};

    if (actionType) {
      where.actionType = actionType as string;
    }

    if (entityType) {
      where.entityType = entityType as string;
    }

    if (userId) {
      where.userId = userId as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: {
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
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
    });
  }
});

// @desc    Get recent audit logs for dashboard
// @route   GET /api/audit-logs/recent
// @access  Private (Admin only)
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const auditLogs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: parseInt(limit as string),
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: auditLogs,
    });
  } catch (error) {
    logger.error("Error fetching recent audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent audit logs",
    });
  }
});

// @desc    Get audit log statistics
// @route   GET /api/audit-logs/stats
// @access  Private (Admin only)
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    // Get action type breakdown
    const actionStats = await prisma.auditLog.groupBy({
      by: ["actionType"],
      where: {
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Get entity type breakdown
    const entityStats = await prisma.auditLog.groupBy({
      by: ["entityType"],
      where: {
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Get most active users
    const userStats = await prisma.auditLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Get user details for the most active users
    const userIds = userStats.map((stat) => stat.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: { select: { name: true } },
      },
    });

    const userStatsWithDetails = userStats.map((stat) => {
      const user = users.find((u) => u.id === stat.userId);
      return {
        userId: stat.userId,
        count: stat._count.id,
        user,
      };
    });

    // Get daily activity for the last 30 days
    const dailyActivity = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs 
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    res.json({
      success: true,
      data: {
        actionStats,
        entityStats,
        userStats: userStatsWithDetails,
        dailyActivity,
        totalLogs: await prisma.auditLog.count({
          where: { createdAt: { gte: startDate } },
        }),
      },
    });
  } catch (error) {
    logger.error("Error fetching audit log statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit log statistics",
    });
  }
});

// @desc    Get specific audit log by ID
// @route   GET /api/audit-logs/:id
// @access  Private (Admin only)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    res.json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    logger.error("Error fetching audit log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit log",
    });
  }
});

export default router;
