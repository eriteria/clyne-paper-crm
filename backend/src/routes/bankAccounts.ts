import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Middleware to check if user is admin
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  if (!user || !user.role || user.role.name !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }

  next();
};

/**
 * GET /api/bank-accounts
 * Get all active bank accounts
 * @access Authenticated users
 */
router.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: bankAccounts,
    });
  } catch (error: any) {
    console.error("Error fetching bank accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bank accounts",
      error: error.message,
    });
  }
});

/**
 * GET /api/bank-accounts/:id
 * Get a single bank account by ID
 * @access Authenticated users
 */
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
            customerPayments: true,
          },
        },
      },
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: "Bank account not found",
      });
    }

    res.json({
      success: true,
      data: bankAccount,
    });
  } catch (error: any) {
    console.error("Error fetching bank account:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bank account",
      error: error.message,
    });
  }
});

/**
 * POST /api/bank-accounts
 * Create a new bank account
 * @access Admin only
 */
router.post(
  "/",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { accountName, accountNumber, bankName, isActive } = req.body;

      // Validate required fields
      if (!accountName || !accountNumber || !bankName) {
        return res.status(400).json({
          success: false,
          message: "Account name, account number, and bank name are required",
        });
      }

      const bankAccount = await prisma.bankAccount.create({
        data: {
          accountName,
          accountNumber,
          bankName,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      res.status(201).json({
        success: true,
        message: "Bank account created successfully",
        data: bankAccount,
      });
    } catch (error: any) {
      console.error("Error creating bank account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create bank account",
        error: error.message,
      });
    }
  }
);

/**
 * PATCH /api/bank-accounts/:id
 * Update an existing bank account
 * @access Admin only
 */
router.patch(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { accountName, accountNumber, bankName, isActive } = req.body;

      // Check if bank account exists
      const existingBankAccount = await prisma.bankAccount.findUnique({
        where: { id },
      });

      if (!existingBankAccount) {
        return res.status(404).json({
          success: false,
          message: "Bank account not found",
        });
      }

      const bankAccount = await prisma.bankAccount.update({
        where: { id },
        data: {
          ...(accountName && { accountName }),
          ...(accountNumber && { accountNumber }),
          ...(bankName && { bankName }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        success: true,
        message: "Bank account updated successfully",
        data: bankAccount,
      });
    } catch (error: any) {
      console.error("Error updating bank account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update bank account",
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/bank-accounts/:id
 * Soft delete a bank account (set isActive to false)
 * @access Admin only
 */
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if bank account exists
      const existingBankAccount = await prisma.bankAccount.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              invoices: true,
              customerPayments: true,
            },
          },
        },
      });

      if (!existingBankAccount) {
        return res.status(404).json({
          success: false,
          message: "Bank account not found",
        });
      }

      // Soft delete by setting isActive to false
      const bankAccount = await prisma.bankAccount.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      res.json({
        success: true,
        message: "Bank account deactivated successfully",
        data: {
          ...bankAccount,
          linkedInvoices: existingBankAccount._count.invoices,
          linkedPayments: existingBankAccount._count.customerPayments,
        },
      });
    } catch (error: any) {
      console.error("Error deleting bank account:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete bank account",
        error: error.message,
      });
    }
  }
);

export default router;
