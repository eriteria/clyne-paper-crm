import express from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../server";
import { logger } from "../utils/logger";
import { logCreate, logUpdate, logDelete } from "../utils/auditLogger";
import {
  clearDummyUsers,
  importUsers,
  normalizeZohoUserData,
  fullUserImport,
  getUserImportTemplate,
  ZohoUserRow,
} from "../utils/userImport";

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin/Manager)
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      team,
      teamId,
      region,
      isActive,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = { name: role as string };
    }

    if (team) {
      where.team = { name: team as string };
    }

    // Handle teamId filter - if teamId is "null" string, find users without teams
    if (teamId !== undefined) {
      if (teamId === "null") {
        where.teamId = null;
      } else {
        where.teamId = teamId as string;
      }
    }

    if (region) {
      where.region = { name: region as string };
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          role: true,
          team: {
            include: {
              locations: {
                include: {
                  location: true,
                },
              },
            },
          },
          region: true,
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    // Remove password hashes from response
    const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);

    res.json({
      success: true,
      data: {
        users: sanitizedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching users:", error);
    next(error);
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        team: {
          include: {
            locations: {
              include: {
                location: true,
              },
            },
          },
        },
        region: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Remove password hash from response
    const { passwordHash, ...sanitizedUser } = user;

    res.json({
      success: true,
      data: { user: sanitizedUser },
    });
  } catch (error) {
    logger.error("Error fetching user:", error);
    next(error);
  }
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin only)
router.post("/", async (req, res, next) => {
  try {
    const { email, fullName, phone, password, roleId, teamId, regionId } =
      req.body;

    // Validate required fields
    if (!email || !fullName || !password || !roleId) {
      res.status(400).json({
        success: false,
        error: "Please provide email, fullName, password, and roleId",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
      return;
    }

    // Validate role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      res.status(400).json({
        success: false,
        error: "Invalid role ID",
      });
      return;
    }

    // Validate team if provided
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        res.status(400).json({
          success: false,
          error: "Invalid team ID",
        });
        return;
      }
    }

    // Validate region if provided
    if (regionId) {
      const region = await prisma.region.findUnique({
        where: { id: regionId },
      });

      if (!region) {
        res.status(400).json({
          success: false,
          error: "Invalid region ID",
        });
        return;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        phone,
        passwordHash,
        roleId,
        teamId,
        regionId,
      },
      include: {
        role: true,
        team: {
          include: {
            locations: {
              include: {
                location: true,
              },
            },
          },
        },
        region: true,
      },
    });

    // Remove password hash from response
    const { passwordHash: _, ...sanitizedUser } = user;

    logger.info(`New user created: ${user.email}`);

    // Log user creation action
    await logCreate("temp-admin-id", "USER", user.id, {
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
    });

    res.status(201).json({
      success: true,
      data: { user: sanitizedUser },
    });
  } catch (error) {
    logger.error("Error creating user:", error);
    next(error);
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin/Manager or own profile)
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, fullName, phone, roleId, teamId, regionId, isActive } =
      req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      });

      if (emailTaken) {
        res.status(400).json({
          success: false,
          error: "Email is already taken",
        });
        return;
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (roleId) updateData.roleId = roleId;
    if (teamId !== undefined) updateData.teamId = teamId;
    if (regionId !== undefined) updateData.regionId = regionId;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        team: {
          include: {
            locations: {
              include: {
                location: true,
              },
            },
          },
        },
        region: true,
      },
    });

    // Remove password hash from response
    const { passwordHash, ...sanitizedUser } = user;

    logger.info(`User updated: ${user.email}`);

    // Log user update action
    await logUpdate("temp-admin-id", "USER", user.id, existingUser, {
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      isActive: user.isActive,
    });

    res.json({
      success: true,
      data: { user: sanitizedUser },
    });
  } catch (error) {
    logger.error("Error updating user:", error);
    next(error);
  }
});

// @desc    Update user password
// @route   PUT /api/users/:id/password
// @access  Private (Admin or own profile)
router.put("/:id/password", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({
        success: false,
        error: "Please provide new password",
      });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // If current password is provided, validate it
    if (currentPassword) {
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
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    logger.info(`Password updated for user: ${user.email}`);

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    logger.error("Error updating password:", error);
    next(error);
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    // Soft delete by setting isActive to false
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`User soft deleted: ${user.email}`);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting user:", error);
    next(error);
  }
});

// User Import Routes (Admin Only)

// @desc    Clear dummy user data
// @route   POST /api/users/clear-dummy-data
// @access  Private (Admin)
router.post("/clear-dummy-data", async (req, res, next) => {
  try {
    const result = await clearDummyUsers();
    res.json({
      success: true,
      message: result.message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Import users from CSV data
// @route   POST /api/users/import
// @access  Private (Admin)
router.post("/import", async (req, res, next) => {
  try {
    const { data, defaultPassword, clearData = false } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: "Invalid data format. Expected array of user objects.",
      });
    }

    if (
      !defaultPassword ||
      typeof defaultPassword !== "string" ||
      defaultPassword.length < 6
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Default password is required and must be at least 6 characters long.",
      });
    }

    const result = await fullUserImport(
      data as ZohoUserRow[],
      defaultPassword,
      clearData
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
});

// @desc    Get user import template
// @route   GET /api/users/import/template
// @access  Private (Admin)
router.get("/import/template", async (req, res, next) => {
  try {
    const template = getUserImportTemplate();

    return res.json({
      success: true,
      template,
      message:
        "User import template with sample data. The 'Role' and 'Last login time' fields will be ignored during import.",
    });
  } catch (error) {
    return next(error);
  }
});

// @desc    Get all roles
// @route   GET /api/users/roles
// @access  Public (for dropdowns)
router.get("/roles", async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      data: { roles },
    });
  } catch (error) {
    return next(error);
  }
});

// @desc    Get user's role
// @route   GET /api/users/:id/role
// @access  Private
router.get("/:id/role", async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
