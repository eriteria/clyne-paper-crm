import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";

const router = express.Router();

// @desc    Get dashboard overview metrics
// @route   GET /api/reports/dashboard
// @access  Private
router.get("/dashboard", async (req, res, next) => {
  try {
    // Get overview metrics
    const [
      totalUsers,
      activeUsers,
      totalInventoryItems,
      lowStockCount,
      totalInvoices,
      pendingInvoices,
      totalWaybills,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.inventoryItem.count(),
      prisma.$queryRaw`SELECT COUNT(*) as count FROM inventory_items WHERE current_quantity <= min_stock`,
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "pending" } }),
      prisma.waybill.count(),
    ]);

    // Get inventory value
    const inventoryValue = await prisma.inventoryItem.aggregate({
      _sum: {
        unitPrice: true,
      },
    });

    // Get teams with member counts
    const teamsWithCounts = await prisma.team.findMany({
      include: {
        location: true,
        _count: {
          select: { members: true },
        },
      },
    });

    // Get recent low stock items
    const lowStockItems = await prisma.$queryRaw`
      SELECT id, name, sku, current_quantity, min_stock, location 
      FROM inventory_items 
      WHERE current_quantity <= min_stock 
      ORDER BY current_quantity ASC 
      LIMIT 5
    `;

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalInventoryItems,
          lowStockCount: (lowStockCount as any[])[0]?.count || 0,
          totalInvoices,
          pendingInvoices,
          totalWaybills,
          totalInventoryValue: inventoryValue._sum.unitPrice || 0,
        },
        teams: teamsWithCounts.map((team: any) => ({
          id: team.id,
          name: team.name,
          location: team.location?.name,
          memberCount: team._count.members,
        })),
        lowStockItems,
      },
    });
  } catch (error) {
    logger.error("Error fetching dashboard data:", error);
    next(error);
  }
});

// @desc    Get inventory analytics
// @route   GET /api/reports/inventory
// @access  Private
router.get("/inventory", async (req, res, next) => {
  try {
    // Get inventory statistics
    const [totalItems, totalValue, lowStockItems] = await Promise.all([
      prisma.inventoryItem.count(),
      prisma.inventoryItem.aggregate({
        _sum: { unitPrice: true, currentQuantity: true },
        _avg: { unitPrice: true, currentQuantity: true },
      }),
      prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM inventory_items 
        WHERE current_quantity <= min_stock
      `,
    ]);

    // Get inventory by location
    const inventoryByLocation = await prisma.inventoryItem.groupBy({
      by: ["location"],
      _count: { id: true },
      _sum: { currentQuantity: true, unitPrice: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Get top items by quantity
    const topItemsByQuantity = await prisma.inventoryItem.findMany({
      select: {
        name: true,
        sku: true,
        currentQuantity: true,
        unit: true,
        location: true,
      },
      orderBy: { currentQuantity: "desc" },
      take: 10,
    });

    // Get items needing reorder
    const itemsNeedingReorder = await prisma.$queryRaw`
      SELECT name, sku, current_quantity, min_stock, location,
             (min_stock - current_quantity) as shortage
      FROM inventory_items 
      WHERE current_quantity <= min_stock 
      ORDER BY shortage DESC
    `;

    res.json({
      success: true,
      data: {
        summary: {
          totalItems,
          totalValue: totalValue._sum.unitPrice || 0,
          averageItemValue: totalValue._avg.unitPrice || 0,
          totalQuantity: totalValue._sum.currentQuantity || 0,
          averageQuantity: totalValue._avg.currentQuantity || 0,
          lowStockCount: (lowStockItems as any[])[0]?.count || 0,
        },
        byLocation: inventoryByLocation.map((location: any) => ({
          location: location.location || "Unspecified",
          itemCount: location._count.id,
          totalQuantity: location._sum.currentQuantity || 0,
          totalValue: location._sum.unitPrice || 0,
        })),
        topItems: topItemsByQuantity,
        reorderNeeded: itemsNeedingReorder,
      },
    });
  } catch (error) {
    logger.error("Error fetching inventory analytics:", error);
    next(error);
  }
});

// @desc    Get sales analytics
// @route   GET /api/reports/sales
// @access  Private
router.get("/sales", async (req, res, next) => {
  try {
    const { startDate, endDate, userId, teamId, regionId } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    // Build where clause
    const where: any = {};
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }
    if (userId) {
      where.createdBy = userId;
    }
    if (teamId) {
      where.createdByUser = { teamId };
    }
    if (regionId) {
      where.createdByUser = { regionId };
    }

    // Get sales metrics
    const [totalInvoices, salesSummary] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({
        where,
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    // Get sales by status
    const salesByStatus = await prisma.invoice.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    // Get top performing users
    const topUsers = await prisma.invoice.groupBy({
      by: ["createdBy"],
      where,
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 10,
    });

    // Get user details for top performers
    const userIds = topUsers.map((u: any) => u.createdBy);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
        team: { select: { name: true } },
      },
    });

    const topUsersWithDetails = topUsers.map((sale: any) => {
      const user = users.find((u: any) => u.id === sale.createdBy);
      return {
        userId: sale.createdBy,
        fullName: user?.fullName || "Unknown",
        email: user?.email || "Unknown",
        teamName: user?.team?.name || "No Team",
        invoiceCount: sale._count.id,
        totalSales: sale._sum.totalAmount || 0,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalInvoices,
          totalSales: salesSummary._sum.totalAmount || 0,
          averageSale: salesSummary._avg.totalAmount || 0,
        },
        byStatus: salesByStatus.map((status: any) => ({
          status: status.status,
          count: status._count.id,
          totalAmount: status._sum.totalAmount || 0,
        })),
        topPerformers: topUsersWithDetails,
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          userId: userId || null,
          teamId: teamId || null,
          regionId: regionId || null,
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching sales analytics:", error);
    next(error);
  }
});

// @desc    Get team performance analytics
// @route   GET /api/reports/teams
// @access  Private
router.get("/teams", async (req, res, next) => {
  try {
    // Get teams with member counts and sales data
    const teams = await prisma.team.findMany({
      include: {
        location: true,
        leader: {
          select: { fullName: true, email: true },
        },
        members: {
          select: { id: true, fullName: true, email: true, isActive: true },
        },
        invoices: {
          select: { totalAmount: true, status: true, createdAt: true },
        },
      },
    });

    const teamPerformance = teams.map((team: any) => {
      const totalSales = team.invoices.reduce(
        (sum: number, invoice: any) => sum + (invoice.totalAmount || 0),
        0
      );
      const completedInvoices = team.invoices.filter(
        (inv: any) => inv.status === "completed"
      ).length;
      const pendingInvoices = team.invoices.filter(
        (inv: any) => inv.status === "pending"
      ).length;
      const activeMembers = team.members.filter(
        (member: any) => member.isActive
      ).length;

      return {
        id: team.id,
        name: team.name,
        location: team.location?.name || "No Location",
        leader: team.leader?.fullName || "No Leader",
        memberCount: team.members.length,
        activeMemberCount: activeMembers,
        totalSales,
        completedInvoices,
        pendingInvoices,
        totalInvoices: team.invoices.length,
        averageSalePerMember:
          activeMembers > 0 ? totalSales / activeMembers : 0,
      };
    });

    // Sort by total sales descending
    teamPerformance.sort((a: any, b: any) => b.totalSales - a.totalSales);

    res.json({
      success: true,
      data: {
        teams: teamPerformance,
        summary: {
          totalTeams: teams.length,
          totalMembers: teams.reduce(
            (sum: number, team: any) => sum + team.members.length,
            0
          ),
          totalActiveMembners: teams.reduce(
            (sum: number, team: any) =>
              sum + team.members.filter((m: any) => m.isActive).length,
            0
          ),
          totalSales: teamPerformance.reduce(
            (sum: number, team: any) => sum + team.totalSales,
            0
          ),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching team analytics:", error);
    next(error);
  }
});

export default router;
