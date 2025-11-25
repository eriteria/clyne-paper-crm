import { Router, Response } from "express";
import Joi from "joi";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import * as settingsService from "../services/settings.service";

const router = Router();

// Validation schemas
const structuredSettingsSchema = Joi.object({
  emailNotifications: Joi.boolean(),
  smsNotifications: Joi.boolean(),
  defaultDashboardView: Joi.string().allow(null),
  preferredChartType: Joi.string().allow(null),
  defaultDateRange: Joi.number().integer().min(1).max(365),
}).min(1); // At least one field required

const customSettingsSchema = Joi.object().pattern(Joi.string(), Joi.any());

/**
 * GET /api/user-settings
 * Get current user's settings
 */
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const settings = await settingsService.getUserSettings(userId);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch settings",
    });
  }
});

/**
 * PATCH /api/user-settings/structured
 * Update structured settings (partial)
 */
router.patch(
  "/structured",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request body
      const { error, value } = structuredSettingsSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message,
        });
      }

      const userId = req.user!.id;
      const updatedSettings = await settingsService.updateStructuredSettings(
        userId,
        value
      );

      res.json({
        success: true,
        message: "Structured settings updated successfully",
        data: updatedSettings,
      });
    } catch (error: any) {
      console.error("Error updating structured settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update structured settings",
      });
    }
  }
);

/**
 * PATCH /api/user-settings/custom
 * Merge custom settings
 */
router.patch("/custom", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate request body
    const { error, value } = customSettingsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const userId = req.user!.id;
    const updatedSettings = await settingsService.updateCustomSettings(
      userId,
      value
    );

    res.json({
      success: true,
      message: "Custom settings updated successfully",
      data: updatedSettings,
    });
  } catch (error: any) {
    console.error("Error updating custom settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update custom settings",
    });
  }
});

/**
 * PUT /api/user-settings/custom
 * Replace entire custom settings
 */
router.put("/custom", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Validate request body
    const { error, value } = customSettingsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const userId = req.user!.id;
    const updatedSettings = await settingsService.setCustomSettings(
      userId,
      value
    );

    res.json({
      success: true,
      message: "Custom settings replaced successfully",
      data: updatedSettings,
    });
  } catch (error: any) {
    console.error("Error replacing custom settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to replace custom settings",
    });
  }
});

/**
 * DELETE /api/user-settings/custom/:key
 * Delete a specific custom setting key
 */
router.delete(
  "/custom/:key",
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { key } = req.params;

      const updatedSettings = await settingsService.deleteCustomSettingKey(
        userId,
        key
      );

      res.json({
        success: true,
        message: `Custom setting '${key}' deleted successfully`,
        data: updatedSettings,
      });
    } catch (error: any) {
      console.error("Error deleting custom setting:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete custom setting",
      });
    }
  }
);

/**
 * POST /api/user-settings/reset
 * Reset all settings to defaults
 */
router.post("/reset", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const resetSettings = await settingsService.resetToDefaults(userId);

    res.json({
      success: true,
      message: "Settings reset to defaults successfully",
      data: resetSettings,
    });
  } catch (error: any) {
    console.error("Error resetting settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset settings",
    });
  }
});

export default router;
