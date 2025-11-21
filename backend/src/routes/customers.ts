import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { logCreate, logUpdate, logDelete } from "../utils/auditLogger";
import {
  authenticate,
  requirePermission,
  type AuthenticatedRequest,
} from "../middleware/auth";
import { PERMISSIONS, type Permission } from "../utils/permissions";

const router = express.Router();

// Apply authentication to all customer routes
router.use(authenticate);

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private (requires customers:view permission)
router.get(
  "/",
  requirePermission(PERMISSIONS.CUSTOMERS_VIEW),
  async (req, res, next) => {
    try {
      const { search, page = 1, limit = 50 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build filters
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { email: { contains: search as string, mode: "insensitive" } },
          { phone: { contains: search as string, mode: "insensitive" } },
          { companyName: { contains: search as string, mode: "insensitive" } },
          {
            contactPerson: { contains: search as string, mode: "insensitive" },
          },
        ];
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          orderBy: {
            name: "asc",
          },
          skip,
          take: limitNum,
          include: {
            relationshipManager: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
            locationRef: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            _count: {
              select: {
                invoices: true,
              },
            },
          },
        }),
        prisma.customer.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        success: true,
        data: customers,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      logger.error("Error fetching customers:", error);
      next(error);
    }
  }
);

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private (requires customers:view permission)
router.get(
  "/:id",
  requirePermission(PERMISSIONS.CUSTOMERS_VIEW),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          relationshipManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          locationRef: {
            select: {
              id: true,
              name: true,
              description: true,
              isActive: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          invoices: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          },
          _count: {
            select: {
              invoices: true,
            },
          },
        },
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      logger.error("Error fetching customer:", error);
      next(error);
    }
  }
);

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private (requires customers:create permission)
router.post(
  "/",
  requirePermission(PERMISSIONS.CUSTOMERS_CREATE),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const {
        name,
        email,
        phone,
        address,
        companyName,
        contactPerson,
        relationshipManagerId,
        locationId,
        defaultPaymentTermDays = 30,
      } = req.body;

      // Validation
      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Customer name is required",
        });
      }

      if (!locationId) {
        return res.status(400).json({
          success: false,
          message: "Location is required",
        });
      }

      // Check if customer with same email already exists
      if (email) {
        const existingCustomer = await prisma.customer.findFirst({
          where: { email },
        });

        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: "Customer with this email already exists",
          });
        }
      }

      // Find team assigned to this location
      let teamId: string | null = null;
      const teamLocation = await prisma.teamLocation.findFirst({
        where: { locationId },
        include: { team: true },
      });

      if (teamLocation) {
        teamId = teamLocation.team.id;
      }

      // Create customer with proper null handling for optional fields
      const customer = await prisma.customer.create({
        data: {
          name,
          email,
          phone,
          address,
          companyName,
          contactPerson,
          relationshipManagerId: relationshipManagerId || null, // Convert undefined to null
          locationId,
          teamId, // Auto-assign team based on location
          defaultPaymentTermDays,
        },
        include: {
          relationshipManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          locationRef: {
            select: {
              id: true,
              name: true,
              description: true,
              isActive: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      // Log customer creation action
      // Temporarily disabled - audit logging issue
      // await logCreate("temp-admin-id", "CUSTOMER", customer.id, {
      //   name: customer.name,
      //   email: customer.email,
      //   companyName: customer.companyName,
      // });

      res.status(201).json({
        success: true,
        data: customer,
        message: "Customer created successfully",
      });
    } catch (error) {
      logger.error("Error creating customer:", error);
      next(error);
    }
  }
);

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private (requires customers:edit permission)
router.put(
  "/:id",
  requirePermission(PERMISSIONS.CUSTOMERS_EDIT),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        phone,
        address,
        companyName,
        contactPerson,
        relationshipManagerId,
        defaultPaymentTermDays,
      } = req.body;

      // Check if customer exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Check if email is being changed and if it conflicts
      if (email && email !== existingCustomer.email) {
        const emailConflict = await prisma.customer.findFirst({
          where: { email, id: { not: id } },
        });

        if (emailConflict) {
          return res.status(400).json({
            success: false,
            message: "Customer with this email already exists",
          });
        }
      }

      const customer = await prisma.customer.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          address,
          companyName,
          contactPerson,
          relationshipManagerId,
          ...(defaultPaymentTermDays !== undefined && {
            defaultPaymentTermDays,
          }),
        },
        include: {
          relationshipManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          locationRef: {
            select: {
              id: true,
              name: true,
              description: true,
              isActive: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: customer,
        message: "Customer updated successfully",
      });
    } catch (error) {
      logger.error("Error updating customer:", error);
      next(error);
    }
  }
);

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (requires customers:delete permission)
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;

      // Check if customer exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              invoices: true,
            },
          },
        },
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Check if customer has invoices
      if (existingCustomer._count.invoices > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete customer with existing invoices",
        });
      }

      await prisma.customer.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Customer deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting customer:", error);
      next(error);
    }
  }
);

export default router;
