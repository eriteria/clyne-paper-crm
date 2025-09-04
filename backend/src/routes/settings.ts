import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = express.Router();
const prisma = new PrismaClient();

// System settings defaults
const defaultSettings = {
  companyName: "Clyne Paper Ltd",
  companyEmail: "info@clynepaper.com",
  companyPhone: "+234-XXX-XXX-XXXX",
  companyAddress: "Lagos, Nigeria",
  currency: "NGN",
  timezone: "Africa/Lagos",
  language: "en",
  taxRate: 7.5,
  lowStockThreshold: 10,
  backupEnabled: true,
  emailNotifications: true,
  smsNotifications: false,
};

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private
router.get("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userRole = req.user!.role;

    // Only admins can view system settings
    if (userRole !== "Admin" && userRole !== "ADMIN") {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions to view system settings",
      });
      return;
    }

    // For now, return default settings
    // In a real implementation, you would fetch these from a database table
    res.json({
      success: true,
      data: defaultSettings,
    });
  } catch (error) {
    logger.error("Error fetching system settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch system settings",
    });
  }
});

// @desc    Update system settings
// @route   PATCH /api/settings
// @access  Private (Admin only)
router.patch("/", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userRole = req.user!.role;

    // Only admins can update system settings
    if (userRole !== "Admin" && userRole !== "ADMIN") {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions to update system settings",
      });
      return;
    }

    const updates = req.body;

    // Validate updates (you could add more validation here)
    const allowedFields = [
      "companyName",
      "companyEmail",
      "companyPhone",
      "companyAddress",
      "currency",
      "timezone",
      "language",
      "taxRate",
      "lowStockThreshold",
      "backupEnabled",
      "emailNotifications",
      "smsNotifications",
    ];

    const filteredUpdates = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);

    // In a real implementation, you would save these to a database
    // For now, just merge with defaults and return
    const updatedSettings = { ...defaultSettings, ...filteredUpdates };

    res.json({
      success: true,
      data: updatedSettings,
      message: "Settings updated successfully",
    });
  } catch (error) {
    logger.error("Error updating system settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update system settings",
    });
  }
});

export default router;
