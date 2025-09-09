import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /locations - Get all locations
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: locations,
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch locations",
    });
  }
});

export default router;
