import express from "express";
import { prisma } from "../server";
import { logger } from "../utils/logger";

const router = express.Router();

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
router.get("/", async (req, res, next) => {
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
        { contactPerson: { contains: search as string, mode: "insensitive" } },
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
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
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
});

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
router.post("/", async (req, res, next) => {
  try {
    const { name, email, phone, address, companyName, contactPerson } =
      req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
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

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        companyName,
        contactPerson,
      },
    });

    res.status(201).json({
      success: true,
      data: customer,
      message: "Customer created successfully",
    });
  } catch (error) {
    logger.error("Error creating customer:", error);
    next(error);
  }
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, companyName, contactPerson } =
      req.body;

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
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
router.delete("/:id", async (req, res, next) => {
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
});

export default router;
