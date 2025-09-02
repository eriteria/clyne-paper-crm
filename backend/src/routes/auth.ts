import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../server";
import { logger } from "../utils/logger";

const router = express.Router();

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        team: {
          include: { region: true },
        },
        region: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: "Account is deactivated",
      });
      return;
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role.name,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
    );

    logger.info(`User ${user.email} logged in successfully`);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role.name,
          team: user.team
            ? {
                id: user.team.id,
                name: user.team.name,
                region: user.team.region,
              }
            : null,
          region: user.region,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: "Refresh token required",
      });
      return;
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string
    ) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: "Invalid refresh token",
      });
      return;
    }

    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role.name,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post("/logout", async (req, res) => {
  // In a real implementation, you might want to blacklist the token
  // For now, we'll just return success since JWT is stateless
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

export default router;
