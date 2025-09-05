import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { logLogin } from "../utils/auditLogger";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

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
          include: { location: true },
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

    // Log the login action
    await logLogin(user.id, {
      email: user.email,
      role: user.role.name,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

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
                location: user.team.location,
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

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get("/profile", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          select: { id: true, name: true, permissions: true },
        },
        team: {
          include: {
            location: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        role: user.role,
        team: user.team,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile",
    });
  }
});

// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
router.patch(
  "/profile",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { fullName, email, phone } = req.body;

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            NOT: { id: userId },
          },
        });

        if (existingUser) {
          res.status(400).json({
            success: false,
            error: "Email is already in use by another user",
          });
          return;
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(fullName && { fullName }),
          ...(email && { email }),
          ...(phone && { phone }),
        },
        include: {
          role: {
            select: { id: true, name: true, permissions: true },
          },
          team: {
            include: {
              location: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        data: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          isActive: updatedUser.isActive,
          role: updatedUser.role,
          team: updatedUser.team,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (error) {
      logger.error("Error updating user profile:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user profile",
      });
    }
  }
);

// @desc    Change user password
// @route   PATCH /api/auth/change-password
// @access  Private
router.patch(
  "/change-password",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: "Current password and new password are required",
        });
        return;
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          error: "Current password is incorrect",
        });
        return;
      }

      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedNewPassword },
      });

      res.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      logger.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        error: "Failed to change password",
      });
    }
  }
);

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
