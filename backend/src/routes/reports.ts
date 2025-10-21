import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = express.Router();

// Helper function to build dynamic where clause from filters
// Model-aware date field mapping
const MODEL_DATE_FIELDS: Record<string, string | null> = {
  invoice: "date",
  customerPayment: "paymentDate",
  payment: "paymentDate",
  customer: "createdAt",
  inventoryItem: "createdAt",
  waybill: "date",
  salesReturn: "returnDate",
  team: "createdAt",
  location: "createdAt",
  product: "createdAt",
  productGroup: "createdAt",
  // Models without date fields (will skip date filtering)
  invoiceItem: null,
  waybillItem: null,
};

function buildWhereClause(filters: any, model?: string): any {
  const where: any = {};

  if (!filters) return where;

  // Date range filters - only apply if the model has a date field
  if (filters.startDate || filters.endDate) {
    let dateField = filters.dateField; // Allow explicit override
    
    // If no explicit dateField and model provided, use model's default date field
    if (!dateField && model && MODEL_DATE_FIELDS[model]) {
      dateField = MODEL_DATE_FIELDS[model];
    }
    
    // Only add date filter if we have a valid date field
    if (dateField) {
      where[dateField] = {};
      if (filters.startDate) {
        where[dateField].gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        where[dateField].lte = endDate;
      }
    }
  }

  // Array filters (in operator)
  if (filters.customerIds && Array.isArray(filters.customerIds)) {
    where.customerId = { in: filters.customerIds };
  }
  if (filters.teamIds && Array.isArray(filters.teamIds)) {
    where.teamId = { in: filters.teamIds };
  }
  if (filters.locationIds && Array.isArray(filters.locationIds)) {
    where.locationId = { in: filters.locationIds };
  }
  if (filters.productIds && Array.isArray(filters.productIds)) {
    where.inventoryItemId = { in: filters.productIds };
  }
  if (filters.statuses && Array.isArray(filters.statuses)) {
    where.status = { in: filters.statuses };
  }

  // Numeric range filters
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    const amountField = filters.amountField || "totalAmount";
    where[amountField] = {};
    if (filters.minAmount !== undefined) {
      where[amountField].gte = Number(filters.minAmount);
    }
    if (filters.maxAmount !== undefined) {
      where[amountField].lte = Number(filters.maxAmount);
    }
  }

  // String search filters (contains)
  if (filters.search) {
    where.OR = [
      { customerName: { contains: filters.search, mode: "insensitive" } },
      { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

// Helper function to parse aggregation requests
function parseAggregations(aggregations: string[]): any {
  const result: any = {};

  if (!aggregations || !Array.isArray(aggregations)) {
    return { _count: true };
  }

  aggregations.forEach((agg) => {
    const [operation, field] = agg.split(":");

    switch (operation) {
      case "sum":
        if (!result._sum) result._sum = {};
        result._sum[field] = true;
        break;
      case "avg":
        if (!result._avg) result._avg = {};
        result._avg[field] = true;
        break;
      case "min":
        if (!result._min) result._min = {};
        result._min[field] = true;
        break;
      case "max":
        if (!result._max) result._max = {};
        result._max[field] = true;
        break;
      case "count":
        result._count = true;
        break;
    }
  });

  return result;
}

// @desc    Get dashboard overview metrics
// @route   GET /api/reports/dashboard
// @access  Private
router.get("/dashboard", async (req, res, next) => {
  try {
    const startTime = Date.now();

    // Optimize: Use raw SQL for counts - much faster than individual Prisma queries
    const countsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM inventory_items) as total_inventory_items,
        (SELECT COUNT(*) FROM inventory_items WHERE current_quantity <= min_stock) as low_stock_count,
        (SELECT COUNT(*) FROM invoices) as total_invoices,
        (SELECT COUNT(*) FROM invoices WHERE status = 'OPEN') as pending_invoices,
        (SELECT COUNT(*) FROM waybills) as total_waybills
    `;

    const [countsResult] = (await prisma.$queryRawUnsafe(countsQuery)) as any[];

    // Convert BigInt values to numbers
    const counts = {
      totalUsers: Number(countsResult.total_users),
      activeUsers: Number(countsResult.active_users),
      totalInventoryItems: Number(countsResult.total_inventory_items),
      lowStockCount: Number(countsResult.low_stock_count),
      totalInvoices: Number(countsResult.total_invoices),
      pendingInvoices: Number(countsResult.pending_invoices),
      totalWaybills: Number(countsResult.total_waybills),
    };

    // Simplified inventory value calculation - remove historical comparison for now
    const inventoryValue = await prisma.inventoryItem.aggregate({
      _sum: {
        unitPrice: true,
      },
    });

    // Simplified teams query - just get essential data
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { members: true },
        },
      },
    });

    // Optimized low stock items query
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        currentQuantity: {
          lte: prisma.inventoryItem.fields.minStock,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentQuantity: true,
        minStock: true,
        location: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        currentQuantity: "asc",
      },
      take: 5,
    });

    const queryTime = Date.now() - startTime;
    logger.info(`Dashboard query completed in ${queryTime}ms`);

    res.json({
      success: true,
      data: {
        overview: {
          ...counts,
          totalInventoryValue: Number(inventoryValue._sum.unitPrice || 0),
          inventoryValueChange: 0, // Simplified for performance
        },
        teams: teams.map((team: any) => ({
          id: team.id,
          name: team.name,
          memberCount: team._count.members,
        })),
        lowStockItems: lowStockItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          current_quantity: item.currentQuantity,
          min_stock: item.minStock,
          location_name: item.location?.name,
        })),
      },
    });
  } catch (error) {
    logger.error("Error fetching dashboard data:", error);
    next(error);
  }
});

// @desc    Dynamic report query endpoint - flexible reporting without hardcoded endpoints
// @route   POST /api/reports/query
// @access  Private
// @body    { model, filters, groupBy, aggregations, include, orderBy, limit }
router.post(
  "/query",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        model,
        filters = {},
        groupBy = [],
        aggregations = ["count"],
        include = {},
        orderBy = {},
        limit = 1000,
      } = req.body;

      logger.info(
        `[DYNAMIC QUERY] Model: ${model}, Filters: ${JSON.stringify(filters)}, GroupBy: ${JSON.stringify(groupBy)}`
      );

      // Validate model name (security: prevent arbitrary model access)
      const allowedModels = [
        "invoice",
        "customerPayment",
        "customer",
        "inventoryItem",
        "waybill",
        "invoiceItem",
        "team",
        "location",
        "product",
        "productGroup",
      ];

      if (!allowedModels.includes(model)) {
        return res.status(400).json({
          success: false,
          error: `Invalid model. Allowed models: ${allowedModels.join(", ")}`,
        });
      }

      // Build where clause from filters (pass model for date field mapping)
      const where = buildWhereClause(filters, model);

      logger.info(`[DYNAMIC QUERY] Built where clause: ${JSON.stringify(where)}`);

      // Determine if this is a groupBy query or a regular query
      if (groupBy && groupBy.length > 0) {
        // GroupBy aggregation query
        const aggregationFields = parseAggregations(aggregations);

        logger.info(
          `[DYNAMIC QUERY] Executing groupBy with aggregations: ${JSON.stringify(aggregationFields)}`
        );

        // Build orderBy clause for groupBy queries
        // When using groupBy, can only order by grouped fields or aggregations
        let groupByOrderBy;
        if (orderBy && orderBy.field && orderBy.aggregate) {
          // Order by aggregation result (e.g., _sum, _count, _avg)
          groupByOrderBy = { [orderBy.aggregate]: { [orderBy.field]: orderBy.direction || "desc" } };
        } else if (orderBy && orderBy.field && groupBy.includes(orderBy.field)) {
          // Order by a field that's in the groupBy
          groupByOrderBy = { [orderBy.field]: orderBy.direction || "desc" };
        }
        // Otherwise, no orderBy (Prisma will use natural order)

        const data = await (prisma as any)[model].groupBy({
          by: groupBy,
          where,
          ...aggregationFields,
          orderBy: groupByOrderBy,
          take: Math.min(limit, 1000), // Cap at 1000 for safety
        });

        logger.info(`[DYNAMIC QUERY] GroupBy returned ${data.length} groups`);

        res.json({
          success: true,
          model,
          queryType: "groupBy",
          resultCount: data.length,
          data,
        });
      } else {
        // Regular find query with aggregation
        const aggregationFields = parseAggregations(aggregations);

        logger.info(
          `[DYNAMIC QUERY] Executing aggregate: ${JSON.stringify(aggregationFields)}`
        );

        const aggregateResult = await (prisma as any)[model].aggregate({
          where,
          ...aggregationFields,
        });

        // Also fetch sample records if requested
        let records = [];
        if (include && Object.keys(include).length > 0) {
          records = await (prisma as any)[model].findMany({
            where,
            include,
            orderBy: orderBy.field
              ? { [orderBy.field]: orderBy.direction || "desc" }
              : undefined,
            take: Math.min(limit, 100), // Limit sample records to 100
          });
        }

        logger.info(
          `[DYNAMIC QUERY] Aggregate complete, sample records: ${records.length}`
        );

        res.json({
          success: true,
          model,
          queryType: "aggregate",
          aggregation: aggregateResult,
          sampleRecords: records,
          sampleCount: records.length,
        });
      }
    } catch (error: any) {
      logger.error(`[DYNAMIC QUERY] Error: ${error.message}`, error);
      res.status(500).json({
        success: false,
        error: error.message || "Error executing dynamic query",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
);

// @desc    Accounts Receivable Aging report
// @route   GET /api/reports/ar-aging
// @access  Private
// Query params:
// - asOf: YYYY-MM-DD (defaults to today, end of day)
// - mode: "due" | "outstanding" (default: "due")
//   - due: age by days past due (uses dueDate; if missing, falls back to invoice.date + netDays)
//   - outstanding: age by days since invoice.date
// - netDays: number (default: 30) used when dueDate is missing in due-mode
// - teamId, regionId, customerId: optional filters
router.get(
  "/ar-aging",
  authenticate,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        asOf,
        mode = "due",
        netDays: netDaysParam,
        teamId,
        regionId,
        customerId,
      } = req.query as Record<string, string | undefined>;

      const netDays = Number.isFinite(Number(netDaysParam))
        ? Math.max(0, parseInt(netDaysParam as string, 10))
        : 30;

      // Set asOf to end of day for inclusiveness
      const asOfDate = asOf ? new Date(asOf) : new Date();
      asOfDate.setHours(23, 59, 59, 999);

      // Build base filters for open A/R
      // Use FIFO (First In, First Out) payment allocation
      const where: any = {
        status: { in: ["OPEN", "PARTIAL"] },
      };

      if (teamId) where.teamId = teamId;
      if (regionId) where.regionId = regionId;
      if (customerId) where.customerId = customerId;

      // Fetch all invoices for filtered customers
      const invoices = await prisma.invoice.findMany({
        where,
        select: {
          id: true,
          customerId: true,
          customerName: true,
          date: true,
          dueDate: true,
          totalAmount: true,
        },
        orderBy: { date: "asc" }, // Sort by date for FIFO
      });

      // Get all payments grouped by customer
      const customerIds = [...new Set(invoices.map((inv) => inv.customerId))];

      // Helper function to convert Prisma Decimal to number
      const toNumber = (val: any): number => {
        if (val == null) return 0;
        const n =
          typeof val === "object" && "toNumber" in val
            ? val.toNumber()
            : Number(val);
        return Number.isFinite(n) ? n : 0;
      };

      const payments = await prisma.customerPayment.groupBy({
        by: ["customerId"],
        where: {
          customerId: { in: customerIds },
          status: "COMPLETED",
        },
        _sum: { amount: true },
      });

      // Create a map of customer payments
      const customerPayments = new Map(
        payments.map((p) => [p.customerId, toNumber(p._sum.amount || 0)])
      );

      // Aging buckets definition
      type BucketKey = "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus";
      const bucketKeys: BucketKey[] = [
        "current",
        "d1_30",
        "d31_60",
        "d61_90",
        "d90_plus",
      ];

      const initBuckets = () => ({
        current: 0,
        d1_30: 0,
        d31_60: 0,
        d61_90: 0,
        d90_plus: 0,
      });

      const addToBucket = (obj: any, key: BucketKey, amount: number) => {
        obj[key] = (obj[key] || 0) + amount;
      };

      const dayDiff = (a: Date, b: Date) => {
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
      };

      // Aggregate by customer
      const byCustomer: Record<
        string,
        {
          customerId: string;
          customerName: string | null;
          current: number;
          d1_30: number;
          d31_60: number;
          d61_90: number;
          d90_plus: number;
          total: number;
          invoices: Array<{
            id: string;
            date: Date;
            dueDate: Date | null;
            balance: number;
            daysPastDueOrOutstanding: number;
            bucket: BucketKey;
          }>;
        }
      > = {};

      // Apply FIFO logic per customer to calculate invoice balances
      const invoiceBalances = new Map<string, number>();

      for (const cId of customerIds) {
        let remainingPayment = customerPayments.get(cId) || 0;
        const customerInvoices = invoices
          .filter((inv) => inv.customerId === cId)
          .sort((a, b) => a.date.getTime() - b.date.getTime()); // Oldest first (FIFO)

        for (const inv of customerInvoices) {
          const invoiceAmount = toNumber(inv.totalAmount);

          if (remainingPayment >= invoiceAmount) {
            // Fully paid
            invoiceBalances.set(inv.id, 0);
            remainingPayment -= invoiceAmount;
          } else if (remainingPayment > 0) {
            // Partially paid
            invoiceBalances.set(inv.id, invoiceAmount - remainingPayment);
            remainingPayment = 0;
          } else {
            // Unpaid
            invoiceBalances.set(inv.id, invoiceAmount);
          }
        }
      }

      // Now process invoices for aging buckets
      for (const inv of invoices) {
        const balance = invoiceBalances.get(inv.id) || 0;

        if (balance <= 0) continue; // Invoice fully paid, skip

        let metric = 0; // days past due or outstanding depending on mode
        if (mode === "outstanding") {
          // Age by days since invoice date
          metric = dayDiff(asOfDate, inv.date);
        } else {
          // Default: due-mode
          // Use dueDate if present; otherwise assume terms of netDays from invoice date
          const effectiveDue = inv.dueDate
            ? new Date(inv.dueDate)
            : new Date(inv.date.getTime() + netDays * 24 * 60 * 60 * 1000);
          metric = Math.max(0, dayDiff(asOfDate, effectiveDue));
        }

        let bucket: BucketKey = "current";
        if (mode === "outstanding") {
          // In outstanding mode, treat 0–30 as Current
          if (metric <= 30) bucket = "current";
          else if (metric <= 60)
            bucket = "d1_30"; // 31–60
          else if (metric <= 90)
            bucket = "d31_60"; // 61–90
          else bucket = "d90_plus"; // 90+
        } else {
          // due-mode buckets by days past due
          if (metric === 0)
            bucket = "current"; // not yet due
          else if (metric <= 30) bucket = "d1_30";
          else if (metric <= 60) bucket = "d31_60";
          else if (metric <= 90) bucket = "d61_90";
          else bucket = "d90_plus";
        }

        const key = inv.customerId;
        if (!byCustomer[key]) {
          byCustomer[key] = {
            customerId: inv.customerId,
            customerName: inv.customerName ?? null,
            ...initBuckets(),
            total: 0,
            invoices: [],
          };
        }

        addToBucket(byCustomer[key], bucket, balance);
        byCustomer[key].total += balance;
        byCustomer[key].invoices.push({
          id: inv.id,
          date: inv.date,
          dueDate: inv.dueDate,
          balance,
          daysPastDueOrOutstanding: metric,
          bucket,
        });
      }

      // Compute grand totals
      const totals = initBuckets() as Record<BucketKey, number> & {
        total: number;
      };
      (totals as any).total = 0;
      for (const c of Object.values(byCustomer)) {
        for (const k of bucketKeys) {
          (totals as any)[k] += c[k];
        }
        (totals as any).total += c.total;
      }

      // Prepare response
      const customers = Object.values(byCustomer).sort(
        (a, b) => b.total - a.total
      );

      res.json({
        success: true,
        asOf: asOfDate.toISOString(),
        mode,
        netDays,
        filters: { teamId, regionId, customerId },
        totals,
        customers,
      });
    } catch (error) {
      logger.error("Error generating AR aging report:", error);
      next(error);
    }
  }
);

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
      by: ["locationId"],
      _count: { id: true },
      _sum: { currentQuantity: true, unitPrice: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Get top items by quantity - using raw SQL for consistency
    const topItemsByQuantity = await prisma.$queryRaw`
      SELECT 
        i.name, 
        i.sku, 
        i.current_quantity, 
        i.unit,
        l.name as location_name
      FROM inventory_items i
      JOIN locations l ON i.location_id = l.id
      ORDER BY i.current_quantity DESC 
      LIMIT 10
    `;

    // Get items needing reorder - using raw SQL with proper join
    const itemsNeedingReorder = await prisma.$queryRaw`
      SELECT 
        i.name, 
        i.sku, 
        i.current_quantity, 
        i.min_stock, 
        l.name as location_name,
        (i.min_stock - i.current_quantity) as shortage
      FROM inventory_items i
      JOIN locations l ON i.location_id = l.id
      WHERE i.current_quantity <= i.min_stock 
      ORDER BY shortage DESC
    `;

    // Get location details for mapping
    const locationIds = inventoryByLocation.map((item: any) => item.locationId);
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true },
    });
    const locationMap = new Map(locations.map((loc) => [loc.id, loc.name]));

    res.json({
      success: true,
      data: {
        summary: {
          totalItems,
          totalValue: totalValue._sum.unitPrice || 0,
          averageItemValue: totalValue._avg.unitPrice || 0,
          totalQuantity: totalValue._sum.currentQuantity || 0,
          averageQuantity: totalValue._avg.currentQuantity || 0,
          lowStockCount: (() => {
            const v = (lowStockItems as any[])[0]?.count;
            if (typeof v === "bigint") return Number(v);
            if (typeof v === "string") return parseInt(v, 10) || 0;
            return v || 0;
          })(),
        },
        byLocation: inventoryByLocation.map((location: any) => ({
          location: locationMap.get(location.locationId) || "Unknown Location",
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

// @desc    Get overdue invoices
// @route   GET /api/reports/overdue-invoices
// @access  Private
router.get("/overdue-invoices", async (req, res, next) => {
  try {
    // Overdue = dueDate in the past and not PAID/CANCELLED
    // Use FIFO (First In, First Out) payment allocation to calculate balance
    const today = new Date();

    const invoices = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: today },
        NOT: { status: { in: ["PAID", "CANCELLED"] } },
      },
      include: {
        customer: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        billedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { date: "asc" }, // Sort by date for FIFO
    });

    // Get all payments grouped by customer
    const customerIds = [...new Set(invoices.map((inv) => inv.customerId))];
    const payments = await prisma.customerPayment.groupBy({
      by: ["customerId"],
      where: {
        customerId: { in: customerIds },
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    // Create a map of customer payments
    const customerPayments = new Map(
      payments.map((p) => [p.customerId, Number(p._sum.amount || 0)])
    );

    // Apply FIFO logic to calculate balance for each invoice
    const invoiceBalances = new Map<string, number>();

    // Process each customer's invoices with FIFO
    for (const cId of customerIds) {
      let remainingPayment = customerPayments.get(cId) || 0;
      const customerInvoices = invoices
        .filter((inv) => inv.customerId === cId)
        .sort((a, b) => a.date.getTime() - b.date.getTime()); // Oldest first

      for (const inv of customerInvoices) {
        const invoiceAmount = Number(inv.totalAmount);

        if (remainingPayment >= invoiceAmount) {
          // Fully paid
          invoiceBalances.set(inv.id, 0);
          remainingPayment -= invoiceAmount;
        } else if (remainingPayment > 0) {
          // Partially paid
          invoiceBalances.set(inv.id, invoiceAmount - remainingPayment);
          remainingPayment = 0;
        } else {
          // Unpaid
          invoiceBalances.set(inv.id, invoiceAmount);
        }
      }
    }

    // Filter to only overdue invoices with outstanding balance
    const overdueInvoices = invoices
      .map((inv) => {
        const balance = invoiceBalances.get(inv.id) || 0;

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customer: inv.customer?.name || inv.customerName,
          team: inv.team?.name || null,
          billedBy: inv.billedBy?.fullName || null,
          totalAmount: inv.totalAmount,
          balance,
          dueDate: inv.dueDate,
          daysOverdue: inv.dueDate
            ? Math.floor(
                (today.getTime() - inv.dueDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null,
          status: inv.status,
        };
      })
      .filter((inv) => inv.balance > 0); // Only include invoices with outstanding balance

    res.json({ success: true, data: overdueInvoices });
  } catch (error) {
    logger.error("Error fetching overdue invoices:", error);
    next(error);
  }
});

// @desc    Get sales analytics
// @route   GET /api/reports/sales
// @access  Private
router.get("/sales", async (req, res, next) => {
  // DEBUG: Run a raw SQL query to print all invoice IDs and dates
  try {
    const rawInvoices =
      await prisma.$queryRaw`SELECT id, date FROM invoices ORDER BY date DESC LIMIT 10`;
    logger.info(
      `[SALES REPORT][RAW SQL] Sample invoices: ${JSON.stringify(rawInvoices)}`
    );
  } catch (rawErr) {
    logger.error(`[SALES REPORT][RAW SQL] Error: ${rawErr}`);
  }
  try {
    const { startDate, endDate, userId, teamId, regionId } = req.query;

    // Log all parameters
    logger.info(
      `[SALES REPORT] Parameters received: startDate=${startDate}, endDate=${endDate}, userId=${userId}, teamId=${teamId}, regionId=${regionId}`
    );

    // Build date filter (use createdAt to match working invoices endpoint)
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
      logger.info(`[SALES REPORT] Added startDate filter: ${dateFilter.gte}`);
    }
    if (endDate) {
      // For endDate, set to end of day (23:59:59.999) instead of start of day
      const endOfDay = new Date(endDate as string);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.lte = endOfDay;
      logger.info(`[SALES REPORT] Added endDate filter: ${dateFilter.lte}`);
    }

    // Build where clause (use createdAt like the working invoices endpoint)
    const where: any = {};
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    logger.info(
      `[SALES REPORT] Final where clause: ${JSON.stringify(where, null, 2)}`
    );

    // Debug: log invoice count and sample IDs/dates for this query (using createdAt)
    const debugInvoices = await prisma.invoice.findMany({
      where,
      select: { id: true, createdAt: true, date: true },
      take: 5,
    });
    logger.info(
      `[SALES REPORT] Invoice count for query: ${debugInvoices.length}, sample: ${JSON.stringify(debugInvoices)}`
    );

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
      by: ["billedByUserId"],
      where,
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 10,
    });

    // Get user details for top performers
    const userIds = topUsers.map((u: any) => u.billedByUserId);
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
      const user = users.find((u: any) => u.id === sale.billedByUserId);
      return {
        userId: sale.billedByUserId,
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
        locations: {
          include: {
            location: true,
          },
        },
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

// @desc    Get executive summary report
// @route   GET /api/reports/executive
// @access  Private
router.get("/executive", async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Revenue metrics
    const [revenueData, previousPeriodRevenue] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          date: { gte: start, lte: end },
          status: { in: ["PAID", "PARTIALLY_PAID"] },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: {
          date: {
            gte: new Date(start.getTime() - (end.getTime() - start.getTime())),
            lt: start,
          },
          status: { in: ["PAID", "PARTIALLY_PAID"] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    // Customer metrics
    const [newCustomers, totalCustomers, activeCustomers] = await Promise.all([
      prisma.customer.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.customer.count(),
      prisma.customer.count({
        where: {
          invoices: {
            some: {
              date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Active in last 90 days
            },
          },
        },
      }),
    ]);

    // Top products by revenue - using inventory item relation
    const topProductsRaw = await prisma.$queryRaw`
      SELECT 
        ii2.sku,
        ii2.name,
        SUM(ii.quantity * ii.unit_price) as revenue,
        SUM(ii.quantity) as total_quantity,
        COUNT(*) as order_count
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN inventory_items ii2 ON ii.inventory_item_id = ii2.id
      WHERE i.date >= ${start} AND i.date <= ${end}
        AND i.status IN ('PAID', 'PARTIALLY_PAID')
      GROUP BY ii2.sku, ii2.name
      ORDER BY revenue DESC
      LIMIT 10
    `;

    // Monthly revenue trend
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(total_amount) as revenue,
        COUNT(*) as invoice_count
      FROM invoices 
      WHERE date >= ${start} AND date <= ${end}
        AND status IN ('PAID', 'PARTIALLY_PAID')
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month
    `;

    // Team performance summary
    const teamPerformance = await prisma.team.findMany({
      include: {
        invoices: {
          where: {
            date: { gte: start, lte: end },
            status: { in: ["PAID", "PARTIALLY_PAID"] },
          },
          select: { totalAmount: true },
        },
        _count: { select: { members: true } },
      },
    });

    const revenueGrowth = previousPeriodRevenue._sum.totalAmount
      ? ((Number(revenueData._sum.totalAmount || 0) -
          Number(previousPeriodRevenue._sum.totalAmount)) /
          Number(previousPeriodRevenue._sum.totalAmount)) *
        100
      : 0;

    res.json({
      success: true,
      data: {
        period: { start, end },
        revenue: {
          current: revenueData._sum.totalAmount || 0,
          previous: previousPeriodRevenue._sum.totalAmount || 0,
          growth: revenueGrowth,
          invoiceCount: revenueData._count,
        },
        customers: {
          new: newCustomers,
          total: totalCustomers,
          active: activeCustomers,
          retention:
            totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0,
        },
        topProducts: (topProductsRaw as any[]).map((product: any) => ({
          sku: product.sku,
          name: product.name,
          revenue: Number(product.revenue || 0),
          quantity: Number(product.total_quantity || 0),
          orderCount: Number(product.order_count || 0),
        })),
        monthlyTrend: monthlyRevenue,
        teamPerformance: teamPerformance.map((team: any) => ({
          name: team.name,
          revenue: team.invoices.reduce(
            (sum: number, inv: any) => sum + Number(inv.totalAmount || 0),
            0
          ),
          members: team._count.members,
        })),
      },
    });
  } catch (error) {
    logger.error("Error fetching executive report:", error);
    next(error);
  }
});

// @desc    Get customer analytics report
// @route   GET /api/reports/customers
// @access  Private
router.get("/customers", async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Calculate previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = start;

    // Customer overview metrics
    const [
      totalCustomers,
      newCustomersThisPeriod,
      newCustomersPrevPeriod,
      activeCustomers,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.customer.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),
      prisma.customer.count({
        where: {
          invoices: {
            some: {
              date: { gte: start, lte: end },
            },
          },
        },
      }),
    ]);

    // Customer retention calculation
    const customersWithPreviousPurchases = await prisma.customer.count({
      where: {
        invoices: {
          some: { date: { lt: start } },
        },
      },
    });

    const retentionCustomers = await prisma.customer.count({
      where: {
        AND: [
          {
            invoices: {
              some: { date: { lt: start } },
            },
          },
          {
            invoices: {
              some: { date: { gte: start, lte: end } },
            },
          },
        ],
      },
    });

    const retentionRate =
      customersWithPreviousPurchases > 0
        ? (retentionCustomers / customersWithPreviousPurchases) * 100
        : 0;

    // At-risk customers (no purchases in last 90 days)
    const atRiskCustomers = await prisma.customer.count({
      where: {
        AND: [
          {
            invoices: {
              every: {
                date: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
              },
            },
          },
          {
            invoices: {
              some: {},
            },
          },
        ],
      },
    });

    // Customer acquisition trend
    const customerAcquisition = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_customers
      FROM customers 
      WHERE created_at >= ${start} AND created_at <= ${end}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `;

    // Top customers by revenue with additional metrics
    const topCustomersRaw = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        l.name as location_name,
        COALESCE(SUM(i.total_amount), 0) as total_revenue,
        COUNT(i.id) as invoice_count,
        AVG(i.total_amount) as avg_order_value,
        MIN(i.date) as first_purchase,
        MAX(i.date) as last_purchase
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
        AND i.date >= ${start} 
        AND i.date <= ${end}
        AND i.status IN ('PAID', 'PARTIALLY_PAID')
      LEFT JOIN locations l ON c.location_id = l.id
      GROUP BY c.id, c.name, c.email, c.phone, l.name
      ORDER BY total_revenue DESC
      LIMIT 20
    `;

    // Customer segmentation by revenue
    const customerSegmentation = await prisma.$queryRaw`
      WITH customer_revenue AS (
        SELECT 
          c.id,
          c.name,
          COALESCE(SUM(i.total_amount), 0) as total_revenue
        FROM customers c
        LEFT JOIN invoices i ON c.id = i.customer_id
          AND i.date >= ${start} 
          AND i.date <= ${end}
          AND i.status IN ('PAID', 'PARTIALLY_PAID')
        GROUP BY c.id, c.name
      )
      SELECT 
        CASE 
          WHEN total_revenue >= 100000 THEN 'High Value'
          WHEN total_revenue >= 50000 THEN 'Medium Value'
          WHEN total_revenue >= 10000 THEN 'Regular'
          ELSE 'Low Value'
        END as segment,
        COUNT(*) as customer_count,
        SUM(total_revenue) as segment_revenue,
        AVG(total_revenue) as avg_revenue_per_customer
      FROM customer_revenue
      GROUP BY 
        CASE 
          WHEN total_revenue >= 100000 THEN 'High Value'
          WHEN total_revenue >= 50000 THEN 'Medium Value'
          WHEN total_revenue >= 10000 THEN 'Regular'
          ELSE 'Low Value'
        END
      ORDER BY segment_revenue DESC
    `;

    // Customer by location - using raw query instead of groupBy with include
    const customersByLocation = await prisma.$queryRaw`
      SELECT 
        l.id as location_id,
        l.name as location_name,
        COUNT(c.id) as customer_count,
        COALESCE(SUM(revenue_data.total_revenue), 0) as location_revenue
      FROM locations l
      LEFT JOIN customers c ON l.id = c.location_id
      LEFT JOIN (
        SELECT 
          customer_id,
          SUM(total_amount) as total_revenue
        FROM invoices 
        WHERE date >= ${start} AND date <= ${end}
          AND status IN ('PAID', 'PARTIALLY_PAID')
        GROUP BY customer_id
      ) revenue_data ON c.id = revenue_data.customer_id
      GROUP BY l.id, l.name
      ORDER BY customer_count DESC
    `;

    // Customer payment behavior
    const paymentBehavior = await prisma.$queryRaw`
      WITH customer_payment_days AS (
        SELECT 
          i.customer_id,
          AVG(EXTRACT(DAY FROM (p.payment_date - i.date))) as avg_payment_days
        FROM invoices i
        JOIN payments p ON i.id = p.invoice_id
        WHERE i.date >= ${start} AND i.date <= ${end}
        GROUP BY i.customer_id
      )
      SELECT 
        CASE 
          WHEN avg_payment_days <= 7 THEN 'Fast Payers'
          WHEN avg_payment_days <= 30 THEN 'Regular Payers'
          ELSE 'Slow Payers'
        END as payment_type,
        COUNT(*) as customer_count,
        AVG(avg_payment_days) as avg_payment_days
      FROM customer_payment_days
      GROUP BY 
        CASE 
          WHEN avg_payment_days <= 7 THEN 'Fast Payers'
          WHEN avg_payment_days <= 30 THEN 'Regular Payers'
          ELSE 'Slow Payers'
        END
      ORDER BY avg_payment_days
    `;

    // Calculate growth rates
    const customerGrowthRate =
      newCustomersPrevPeriod > 0
        ? ((newCustomersThisPeriod - newCustomersPrevPeriod) /
            newCustomersPrevPeriod) *
          100
        : 0;

    res.json({
      success: true,
      data: {
        period: { start, end },
        overview: {
          totalCustomers,
          newCustomers: newCustomersThisPeriod,
          newCustomersPrevious: newCustomersPrevPeriod,
          customerGrowthRate: Math.round(customerGrowthRate * 100) / 100,
          activeCustomers,
          retentionRate: Math.round(retentionRate * 100) / 100,
          atRiskCustomers,
        },
        acquisition: customerAcquisition,
        topCustomers: (topCustomersRaw as any[]).map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          location: customer.location_name,
          revenue: Number(customer.total_revenue || 0),
          invoiceCount: Number(customer.invoice_count || 0),
          avgOrderValue: Number(customer.avg_order_value || 0),
          firstPurchase: customer.first_purchase,
          lastPurchase: customer.last_purchase,
        })),
        segmentation: customerSegmentation,
        locationDistribution: customersByLocation,
        paymentBehavior,
      },
    });
  } catch (error) {
    logger.error("Error fetching customer analytics:", error);
    next(error);
  }
});

// @desc    Get operational reports
// @route   GET /api/reports/operations
// @access  Private
router.get("/operations", async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Waybill processing metrics
    const waybillMetrics = await prisma.waybill.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: true,
    });

    // Average processing time for waybills
    const processingTimes = await prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at))/3600) as avg_processing_hours
      FROM waybills 
      WHERE processed_at IS NOT NULL
        AND created_at >= ${start} 
        AND created_at <= ${end}
    `;

    // Inventory turnover by location
    const inventoryTurnover = await prisma.$queryRaw`
      SELECT 
        l.name as location,
        COUNT(i.id) as item_count,
        AVG(i.current_quantity) as avg_stock,
        COUNT(CASE WHEN i.current_quantity <= i.min_stock THEN 1 END) as low_stock_count
      FROM locations l
      LEFT JOIN inventory_items i ON l.id = i.location_id
      GROUP BY l.id, l.name
      ORDER BY item_count DESC
    `;

    // Invoice processing efficiency
    const invoiceMetrics = await prisma.invoice.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: true,
      _sum: { totalAmount: true },
    });

    // Delivery performance (mock data - would need tracking system)
    const deliveryMetrics = {
      onTimeDeliveries: 85,
      averageDeliveryDays: 3.2,
      delayedDeliveries: 15,
    };

    res.json({
      success: true,
      data: {
        period: { start, end },
        waybills: {
          byStatus: waybillMetrics,
          avgProcessingTime:
            (processingTimes as any[])[0]?.avg_processing_hours || 0,
        },
        inventory: {
          turnover: inventoryTurnover,
        },
        invoices: {
          byStatus: invoiceMetrics,
        },
        delivery: deliveryMetrics,
      },
    });
  } catch (error) {
    logger.error("Error fetching operational report:", error);
    next(error);
  }
});

// @desc    Export report data
// @route   POST /api/reports/export
// @access  Private
router.post("/export", async (req, res, next) => {
  try {
    const { reportType, format, startDate, endDate, filters } = req.body;

    let reportData: any = {};
    let filename = "";

    // Fetch report data based on type
    switch (reportType) {
      case "sales":
        // Re-use existing sales analytics logic
        const salesResponse = await fetch(
          `${req.protocol}://${req.get("host")}/api/reports/sales?startDate=${startDate}&endDate=${endDate}`
        );
        reportData = await salesResponse.json();
        filename = `sales_report_${new Date().toISOString().split("T")[0]}`;
        break;

      case "inventory":
        const inventoryResponse = await fetch(
          `${req.protocol}://${req.get("host")}/api/reports/inventory`
        );
        reportData = await inventoryResponse.json();
        filename = `inventory_report_${new Date().toISOString().split("T")[0]}`;
        break;

      case "executive":
        const execResponse = await fetch(
          `${req.protocol}://${req.get("host")}/api/reports/executive?startDate=${startDate}&endDate=${endDate}`
        );
        reportData = await execResponse.json();
        filename = `executive_summary_${new Date().toISOString().split("T")[0]}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "Invalid report type",
        });
    }

    // For now, return JSON data - later can implement PDF/Excel generation
    res.json({
      success: true,
      data: {
        reportType,
        format,
        filename,
        data: reportData.data,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error exporting report:", error);
    next(error);
  }
});

export default router;
