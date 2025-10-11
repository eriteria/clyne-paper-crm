import express from "express";
import multer from "multer";
import csv from "csv-parse";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authenticate } from "../middleware/auth";
import fs from "fs";
import path from "path";
import {
  clearDummyData,
  importCustomers,
  linkRelationshipManagers,
  updateLastOrderDates,
  fullDataImport,
  createDefaultTeamsForLocations,
  assignCustomersToTeams,
  addLocationMapping,
  getLocationMappings,
} from "../utils/customerImport";

const router = express.Router();

/**
 * POST /api/import/clear-dummy-data
 * Clears all dummy/test data from the database
 */
router.post("/clear-dummy-data", async (req, res, next) => {
  try {
    const result = await clearDummyData();
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/import/customers
 * Import customers from Excel data
 * Body: { data: ExcelCustomerRow[], clearData?: boolean }
 */
router.post("/customers", async (req, res, next) => {
  try {
    const { data, clearData = false } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "Invalid data format. Expected array of customer objects.",
      });
    }

    if (clearData) {
      await clearDummyData();
    }

    const result = await importCustomers(data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/import/link-relationship-managers
 * Links customers to relationship managers by matching names
 */
router.post("/link-relationship-managers", async (req, res, next) => {
  try {
    const result = await linkRelationshipManagers();
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/import/update-last-order-dates
 * Updates customer last order dates based on invoice data
 */
router.post("/update-last-order-dates", async (req, res, next) => {
  try {
    const result = await updateLastOrderDates();
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/import/full-process
 * Complete import process including data clearing and linking
 * Body: { data: ExcelCustomerRow[], clearData?: boolean }
 */
router.post("/full-process", async (req, res, next) => {
  try {
    const { data, clearData = false } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "Invalid data format. Expected array of customer objects.",
      });
    }

    const result = await fullDataImport(data, clearData);

    res.json({
      success: true,
      data: result,
      message:
        "Import completed. You can now run link-relationship-managers to connect customers to users.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/import/template
 * Returns the expected Excel format for customer import
 */
router.get("/template", (req, res) => {
  const template = {
    headers: [
      "CUSTOMER NAME",
      "RELATIONSHIP MANAGER",
      "LOCATION",
      "ADDRESS",
      "DATE OF ONBOARDING",
      "LAST ORDER DATE",
    ],
    example: [
      {
        "CUSTOMER NAME": "ABC Corporation",
        "RELATIONSHIP MANAGER": "John Smith",
        LOCATION: "Lagos",
        ADDRESS: "123 Victoria Island, Lagos State",
        "DATE OF ONBOARDING": "01/15/2024",
        "LAST ORDER DATE": "08/20/2025",
      },
    ],
    notes: [
      "CUSTOMER NAME is required",
      "RELATIONSHIP MANAGER should match the full name of an existing user",
      "Dates can be in MM/DD/YYYY format",
      "All other fields are optional",
      "If RELATIONSHIP MANAGER doesn't match a user, it will be stored for later linking",
    ],
  };

  res.json({
    success: true,
    data: template,
  });
});

/**
 * POST /api/import/setup-location-teams
 * Creates default teams for common locations
 */
router.post("/setup-location-teams", async (req, res, next) => {
  try {
    const result = await createDefaultTeamsForLocations();
    res.json({
      success: true,
      data: result,
      message: "Default location teams created successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/import/assign-customers-to-teams
 * Assigns existing customers to teams based on their locations
 */
router.post("/assign-customers-to-teams", async (req, res, next) => {
  try {
    const result = await assignCustomersToTeams();
    res.json({
      success: true,
      data: result,
      message: "Customer team assignment completed",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/import/location-mappings
 * Gets all current location-to-team mappings
 */
router.get("/location-mappings", async (req, res, next) => {
  try {
    const result = await getLocationMappings();
    res.json({
      success: true,
      data: result.mappings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/import/add-location-mapping
 * Adds a new location to an existing team
 * Body: { location: string, teamName: string }
 */
router.post("/add-location-mapping", async (req, res, next) => {
  try {
    const { location, teamName } = req.body;

    if (!location || !teamName) {
      return res.status(400).json({
        success: false,
        error: "Both location and teamName are required",
      });
    }

    const result = await addLocationMapping(location, teamName);
    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
