import express from "express";
import { PrismaClient } from "@prisma/client";
import {
  authenticate,
  requirePermission,
  AuthenticatedRequest,
} from "../middleware/auth";
import { PERMISSIONS } from "../utils/permissions";
import { logCreate, logUpdate, logDelete } from "../utils/auditLogger";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all admin routes
router.use(authenticate);

// Configure multer for CSV upload
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /admin/roles - Get all roles with user counts
 */
router.get(
  "/roles",
  requirePermission(PERMISSIONS.ROLES_VIEW),
  async (req: AuthenticatedRequest, res) => {
    try {

    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      error: "Failed to fetch roles",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /admin/roles - Create a new role
 */
router.post(
  "/roles",
  requirePermission(PERMISSIONS.ROLES_CREATE),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      const { name, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Role name is required",
      });
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: name.trim() },
    });

    if (existingRole) {
      return res.status(400).json({
        error: "A role with this name already exists",
      });
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        permissions: permissions || "{}",
      },
    });

    // Log the action
    await logCreate(userId, "ROLE", role.id, {
      roleName: role.name,
    });

    res.status(201).json({
      success: true,
      data: role,
      message: "Role created successfully",
    });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({
      error: "Failed to create role",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PATCH /admin/roles/:id - Update a role
 */
router.patch(
  "/roles/:id",
  requirePermission(PERMISSIONS.ROLES_EDIT),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const roleId = req.params.id;

      const { name, permissions } = req.body;

      // Check if role exists
      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!existingRole) {
        return res.status(404).json({
          error: "Role not found",
        });
      }

      // Prevent updating admin role name
      if (existingRole.name === "Admin" && name && name !== "Admin") {
        return res.status(400).json({
          error: "Cannot change the name of the Admin role",
        });
      }

      // Check if new name already exists (if name is being changed)
      if (name && name !== existingRole.name) {
        const roleWithSameName = await prisma.role.findUnique({
          where: { name: name.trim() },
        });

        if (roleWithSameName) {
          return res.status(400).json({
            error: "A role with this name already exists",
          });
        }
      }

      const updatedRole = await prisma.role.update({
        where: { id: roleId },
        data: {
          ...(name && { name: name.trim() }),
          ...(permissions && { permissions }),
        },
      });

      // Log the action
      await logUpdate(userId, "ROLE", roleId, existingRole, {
        roleName: updatedRole.name,
        changes: { name, permissions },
      });

      res.json({
        success: true,
        data: updatedRole,
        message: "Role updated successfully",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({
        error: "Failed to update role",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /admin/roles/:id - Delete a role
 */
router.delete(
  "/roles/:id",
  requirePermission(PERMISSIONS.ROLES_DELETE),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const roleId = req.params.id;

      // Check if role exists
      const existingRole = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      });

      if (!existingRole) {
        return res.status(404).json({
          error: "Role not found",
        });
      }

      // Prevent deleting admin role
      if (existingRole.name === "Admin") {
        return res.status(400).json({
          error: "Cannot delete the Admin role",
        });
      }

      // Check if role has users assigned
      if (existingRole._count.users > 0) {
        return res.status(400).json({
          error: `Cannot delete role "${existingRole.name}" as it has ${existingRole._count.users} users assigned. Please reassign them first.`,
        });
      }

      await prisma.role.delete({
        where: { id: roleId },
      });

      // Log the action
      await logDelete(userId, "ROLE", roleId, {
        roleName: existingRole.name,
      });

      res.json({
        success: true,
        message: "Role deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({
        error: "Failed to delete role",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /admin/regions - Get all regions with counts
 */
router.get(
  "/regions",
  requirePermission(PERMISSIONS.LOCATIONS_VIEW),
  async (req: AuthenticatedRequest, res) => {
    try {
      const regions = await prisma.region.findMany({
      include: {
        _count: {
          select: {
            users: true,
            invoices: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      data: regions,
    });
  } catch (error) {
    console.error("Error fetching regions:", error);
    res.status(500).json({
      error: "Failed to fetch regions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /admin/regions - Create a new region
 */
router.post(
  "/regions",
  requirePermission(PERMISSIONS.LOCATIONS_CREATE),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          error: "Region name is required",
        });
      }

      // Check if region already exists
      const existingRegion = await prisma.region.findUnique({
        where: { name: name.trim() },
      });

      if (existingRegion) {
        return res.status(400).json({
          error: "A region with this name already exists",
        });
      }

      const region = await prisma.region.create({
        data: {
          name: name.trim(),
        },
      });

      // Log the action
      await logCreate(userId, "REGION", region.id, {
        regionName: region.name,
      });

      res.status(201).json({
        success: true,
        data: region,
        message: "Region created successfully",
      });
    } catch (error) {
      console.error("Error creating region:", error);
      res.status(500).json({
        error: "Failed to create region",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * PATCH /admin/regions/:id - Update a region
 */
router.patch(
  "/regions/:id",
  requirePermission(PERMISSIONS.LOCATIONS_EDIT),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const regionId = req.params.id;

      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          error: "Region name is required",
        });
      }

      // Check if region exists
      const existingRegion = await prisma.region.findUnique({
        where: { id: regionId },
      });

      if (!existingRegion) {
        return res.status(404).json({
          error: "Region not found",
        });
      }

      // Check if new name already exists
      if (name !== existingRegion.name) {
        const regionWithSameName = await prisma.region.findUnique({
          where: { name: name.trim() },
        });

        if (regionWithSameName) {
          return res.status(400).json({
            error: "A region with this name already exists",
          });
        }
      }

      const updatedRegion = await prisma.region.update({
        where: { id: regionId },
        data: {
          name: name.trim(),
        },
      });

      // Log the action
      await logUpdate(userId, "REGION", regionId, existingRegion, {
        regionName: updatedRegion.name,
        oldName: existingRegion.name,
      });

      res.json({
        success: true,
        data: updatedRegion,
        message: "Region updated successfully",
      });
    } catch (error) {
      console.error("Error updating region:", error);
      res.status(500).json({
        error: "Failed to update region",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /admin/regions/:id - Delete a region
 */
router.delete(
  "/regions/:id",
  requirePermission(PERMISSIONS.LOCATIONS_DELETE),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const regionId = req.params.id;

      // Check if region exists
      const existingRegion = await prisma.region.findUnique({
        where: { id: regionId },
        include: {
          _count: {
            select: {
              users: true,
              invoices: true,
            },
          },
        },
      });

      if (!existingRegion) {
        return res.status(404).json({
          error: "Region not found",
        });
      }

      // Check if region has users or invoices assigned
      const { users, invoices } = existingRegion._count;
      if (users > 0 || invoices > 0) {
        return res.status(400).json({
          error: `Cannot delete region "${existingRegion.name}" as it has ${users} users and ${invoices} invoices assigned. Please reassign them first.`,
        });
      }

      await prisma.region.delete({
        where: { id: regionId },
      });

      // Log the action
      await logDelete(userId, "REGION", regionId, {
        regionName: existingRegion.name,
      });

      res.json({
        success: true,
        message: "Region deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting region:", error);
      res.status(500).json({
        error: "Failed to delete region",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /admin/locations - Get all locations with customer counts
 */
router.get(
  "/locations",
  requirePermission(PERMISSIONS.LOCATIONS_VIEW),
  async (req: AuthenticatedRequest, res) => {
    try {
      const locations = await prisma.location.findMany({
        include: {
          _count: {
            select: {
              customers: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      res.json({
        success: true,
        data: locations,
      });
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({
        error: "Failed to fetch locations",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /admin/locations - Create a new location
 */
router.post(
  "/locations",
  requirePermission(PERMISSIONS.LOCATIONS_CREATE),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      const { name, description } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          error: "Location name is required",
        });
      }

      // Check if location already exists
      const existingLocation = await prisma.location.findUnique({
        where: { name: name.trim() },
      });

      if (existingLocation) {
        return res.status(400).json({
          error: "A location with this name already exists",
        });
      }

      const location = await prisma.location.create({
        data: {
          name: name.trim(),
          description: description || null,
          isActive: true,
        },
      });

      // Log the action
      await logCreate(userId, "LOCATION", location.id, {
        locationName: location.name,
      });

      res.status(201).json({
        success: true,
        data: location,
        message: "Location created successfully",
      });
    } catch (error) {
      console.error("Error creating location:", error);
      res.status(500).json({
        error: "Failed to create location",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * PATCH /admin/locations/:id - Update a location
 */
router.patch(
  "/locations/:id",
  requirePermission(PERMISSIONS.LOCATIONS_EDIT),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const locationId = req.params.id;

      const { name, description, isActive } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          error: "Location name is required",
        });
      }

      // Check if location exists
      const existingLocation = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!existingLocation) {
        return res.status(404).json({
          error: "Location not found",
        });
      }

      // Check if another location with the same name exists
      const duplicateLocation = await prisma.location.findFirst({
        where: {
          name: name.trim(),
          id: { not: locationId },
        },
      });

      if (duplicateLocation) {
        return res.status(400).json({
          error: "A location with this name already exists",
        });
      }

      const updatedLocation = await prisma.location.update({
        where: { id: locationId },
        data: {
          name: name.trim(),
          description: description || null,
          isActive:
            isActive !== undefined ? isActive : existingLocation.isActive,
        },
      });

      // Log the action
      await logUpdate(userId, "LOCATION", locationId, existingLocation, {
        oldName: existingLocation.name,
        newName: updatedLocation.name,
      });

      res.json({
        success: true,
        data: updatedLocation,
        message: "Location updated successfully",
      });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({
        error: "Failed to update location",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /admin/locations/:id - Delete a location
 */
router.delete(
  "/locations/:id",
  requirePermission(PERMISSIONS.LOCATIONS_DELETE),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const locationId = req.params.id;

      // Check if location exists
      const existingLocation = await prisma.location.findUnique({
        where: { id: locationId },
        include: {
          _count: {
            select: {
              customers: true,
            },
          },
        },
      });

      if (!existingLocation) {
        return res.status(404).json({
          error: "Location not found",
        });
      }

      // Check if location has customers
      if (existingLocation._count.customers > 0) {
        return res.status(400).json({
          error: `Cannot delete location. It has ${existingLocation._count.customers} customers assigned to it.`,
        });
      }

      await prisma.location.delete({
        where: { id: locationId },
      });

      // Log the action
      await logDelete(userId, "LOCATION", locationId, {
        locationName: existingLocation.name,
      });

      res.json({
        success: true,
        message: "Location deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({
        error: "Failed to delete location",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /admin/teams - Get all teams with location and member info
 */
router.get(
  "/teams",
  requirePermission(PERMISSIONS.TEAMS_VIEW),
  async (req: AuthenticatedRequest, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        locations: {
          include: {
            location: true,
          },
        },
        leader: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({
      error: "Failed to fetch teams",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /admin/teams - Create a new team
 */
router.post(
  "/teams",
  requirePermission(PERMISSIONS.TEAMS_CREATE),
  async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const { name, description, locationId, leaderUserId } = req.body;

    if (!name || !locationId) {
      return res.status(400).json({
        error: "Team name and location are required",
      });
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(404).json({
        error: "Location not found",
      });
    }

    // Verify leader exists if provided
    if (leaderUserId) {
      const leader = await prisma.user.findUnique({
        where: { id: leaderUserId },
      });

      if (!leader) {
        return res.status(404).json({
          error: "Team leader not found",
        });
      }
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        leaderUserId,
        locations: {
          create: {
            locationId,
          },
        },
      },
      include: {
        locations: {
          include: {
            location: true,
          },
        },
        leader: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    await logCreate(userId, "TEAM", team.id, {
      teamName: team.name,
      locationName: location.name,
    });

    res.status(201).json({
      success: true,
      data: team,
      message: "Team created successfully",
    });
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({
      error: "Failed to create team",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PATCH /admin/teams/:id - Update a team
 */
router.patch(
  "/teams/:id",
  requirePermission(PERMISSIONS.TEAMS_EDIT),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const teamId = req.params.id;

      const { name, description, locationId, leaderUserId } = req.body;

      // Verify team exists
      const existingTeam = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          locations: {
            include: {
              location: true,
            },
          },
        },
      });

      if (!existingTeam) {
        return res.status(404).json({
          error: "Team not found",
        });
      }

      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (locationId !== undefined) updateData.locationId = locationId;
      if (leaderUserId !== undefined) updateData.leaderUserId = leaderUserId;

      // Verify location exists if being updated
      if (locationId) {
        const location = await prisma.location.findUnique({
          where: { id: locationId },
        });

        if (!location) {
          return res.status(404).json({
            error: "Location not found",
          });
        }
      }

      // Verify leader exists if being updated
      if (leaderUserId) {
        const leader = await prisma.user.findUnique({
          where: { id: leaderUserId },
        });

        if (!leader) {
          return res.status(404).json({
            error: "Team leader not found",
          });
        }
      }

      const updatedTeam = await prisma.team.update({
        where: { id: teamId },
        data: updateData,
        include: {
          locations: {
            include: {
              location: true,
            },
          },
          leader: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      await logUpdate(userId, "TEAM", teamId, existingTeam, {
        teamName: updatedTeam.name,
        changes: updateData,
      });

      res.json({
        success: true,
        data: updatedTeam,
        message: "Team updated successfully",
      });
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({
        error: "Failed to update team",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /admin/teams/:id - Delete a team
 */
router.delete(
  "/teams/:id",
  requirePermission(PERMISSIONS.TEAMS_DELETE),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const teamId = req.params.id;

      // Check if team exists and get member count
      const existingTeam = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!existingTeam) {
        return res.status(404).json({
          error: "Team not found",
        });
      }

      // Check if team has members
      if (existingTeam._count.members > 0) {
        return res.status(400).json({
          error: `Cannot delete team "${existingTeam.name}" as it has ${existingTeam._count.members} members. Please reassign them first.`,
        });
      }

      // Delete the team
      await prisma.team.delete({
        where: { id: teamId },
      });

      await logDelete(userId, "TEAM", teamId, {
        teamName: existingTeam.name,
      });

      res.json({
        success: true,
        message: "Team deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({
        error: "Failed to delete team",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /admin/teams/:id/members - Get team members
 */
router.get(
  "/teams/:id/members",
  requirePermission(PERMISSIONS.TEAMS_VIEW),
  async (req: AuthenticatedRequest, res) => {
    try {
      const teamId = req.params.id;

      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
          leader: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          locations: {
            include: {
              location: true,
            },
          },
        },
      });

      if (!team) {
        return res.status(404).json({
          error: "Team not found",
        });
      }

      res.json({
        success: true,
        data: {
          team: {
            id: team.id,
            name: team.name,
            description: team.description,
            locations: team.locations,
            leader: team.leader,
          },
          members: team.members,
        },
      });
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({
        error: "Failed to fetch team members",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /admin/teams/:id/members - Add user to team
 */
router.post(
  "/teams/:id/members",
  requirePermission(PERMISSIONS.TEAMS_EDIT),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const teamId = req.params.id;
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          error: "User IDs array is required",
        });
      }

      // Verify team exists
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        return res.status(404).json({
          error: "Team not found",
        });
      }

      // Update users to be part of this team
      const updatedUsers = await prisma.user.updateMany({
        where: {
          id: { in: userIds },
        },
        data: {
          teamId: teamId,
        },
      });

      await logUpdate(userId, "TEAM", teamId, team, {
        action: "ADD_MEMBERS",
        teamName: team.name,
        userCount: updatedUsers.count,
      });

      res.json({
        success: true,
        message: `Added ${updatedUsers.count} users to team "${team.name}"`,
        data: { addedUsers: updatedUsers.count },
      });
    } catch (error) {
      console.error("Error adding team members:", error);
      res.status(500).json({
        error: "Failed to add team members",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /admin/teams/:id/members/:userId - Remove user from team
 */
router.delete(
  "/teams/:id/members/:userId",
  requirePermission(PERMISSIONS.TEAMS_EDIT),
  async (req: AuthenticatedRequest, res) => {
    try {
      const adminUserId = req.user!.id;
      const teamId = req.params.id;
      const userIdToRemove = req.params.userId;

      // Verify team exists
      const team = await prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        return res.status(404).json({
          error: "Team not found",
        });
      }

      // Verify user exists and is in this team
      const user = await prisma.user.findFirst({
        where: {
          id: userIdToRemove,
          teamId: teamId,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: "User not found in this team",
        });
      }

      // Remove user from team
      await prisma.user.update({
        where: { id: userIdToRemove },
        data: { teamId: null },
      });

      await logUpdate(adminUserId, "TEAM", teamId, team, {
        action: "REMOVE_MEMBER",
        teamName: team.name,
        removedUserName: user.fullName,
      });

      res.json({
        success: true,
        message: `Removed ${user.fullName} from team "${team.name}"`,
      });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({
        error: "Failed to remove team member",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /admin/opening-balance-import - Import opening balances from CSV
 * This is a DESTRUCTIVE operation that:
 * 1. Deletes ALL invoices and payments
 * 2. Sets opening balances on customers from CSV
 * 3. Creates new customers if they don't exist
 */
router.post(
  "/opening-balance-import",
  requirePermission(PERMISSIONS.CUSTOMERS_IMPORT),
  upload.single("csvFile"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;

      if (!req.file) {
        return res.status(400).json({
          error: "CSV file is required",
        });
      }

      // Default location no longer required. If provided, it's ignored for import.
      // Customers created via this import will have no location assigned initially.

      // Parse CSV
      const csvData: Array<{ name: string; balance: number }> = [];
      const fileBuffer = req.file.buffer.toString("utf-8");
      const stream = Readable.from(fileBuffer);

      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(csvParser())
          .on("data", (row) => {
            // Parse the CSV row
            // Expected format: S/N, "Debtors closing Balances as at 23rd October, 2025", Closing Balance
            const customerName =
              row["Debtors closing Balances as at 23rd October, 2025"]?.trim();
            const balanceStr = row["Closing Balance"]?.trim() || "0";

            if (customerName) {
              // Remove commas from balance string and parse
              const balance = parseFloat(balanceStr.replace(/,/g, "")) || 0;
              csvData.push({ name: customerName, balance });
            }
          })
          .on("end", resolve)
          .on("error", reject);
      });

      console.log(`Parsed ${csvData.length} rows from CSV`);

      // Group by customer name and sum balances for duplicates
      const customerBalances = new Map<string, number>();
      for (const { name, balance } of csvData) {
        const normalizedName = name.toUpperCase().trim();
        const currentBalance = customerBalances.get(normalizedName) || 0;
        customerBalances.set(normalizedName, currentBalance + balance);
      }

      console.log(`Consolidated to ${customerBalances.size} unique customers`);

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // STEP 1: Delete all related records in correct order (respecting foreign keys)
        console.log("Deleting all related records...");

        // Delete sales returns first (has FK to invoices)
        const deletedSalesReturnItems = await tx.salesReturnItem.deleteMany({});
        const deletedSalesReturns = await tx.salesReturn.deleteMany({});
        console.log(
          `Deleted ${deletedSalesReturnItems.count} sales return items`
        );
        console.log(`Deleted ${deletedSalesReturns.count} sales returns`);

        // Delete invoice items (has FK to invoices)
        const deletedInvoiceItems = await tx.invoiceItem.deleteMany({});
        console.log(`Deleted ${deletedInvoiceItems.count} invoice items`);

        // Delete payments (has FK to invoices)
        const deletedPayments = await tx.payment.deleteMany({});
        const deletedCustomerPayments = await tx.customerPayment.deleteMany({});
        console.log(`Deleted ${deletedPayments.count} payments`);
        console.log(
          `Deleted ${deletedCustomerPayments.count} customer payments`
        );

        // Delete credit applications (has FK to invoices)
        const deletedCreditApplications = await tx.creditApplication.deleteMany(
          {}
        );
        console.log(
          `Deleted ${deletedCreditApplications.count} credit applications`
        );

        // Now safe to delete invoices
        const deletedInvoices = await tx.invoice.deleteMany({});
        console.log(`Deleted ${deletedInvoices.count} invoices`);

        // STEP 2: Get all existing customers
        const existingCustomers = await tx.customer.findMany({
          select: { id: true, name: true, locationId: true },
        });

        const customerMap = new Map<
          string,
          { id: string; locationId: string | null }
        >();
        for (const customer of existingCustomers) {
          customerMap.set(customer.name.toUpperCase().trim(), {
            id: customer.id,
            locationId: customer.locationId,
          });
        }

        console.log(`Found ${customerMap.size} existing customers`);

        // STEP 3: Update existing customers and create new ones
        let updatedCount = 0;
        let createdCount = 0;

        for (const [normalizedName, balance] of customerBalances.entries()) {
          const existing = customerMap.get(normalizedName);

          if (existing) {
            // Update existing customer
            await tx.customer.update({
              where: { id: existing.id },
              data: { openingBalance: balance },
            });
            updatedCount++;
          } else {
            // Create new customer
            // Find original casing from CSV data
            const originalName =
              csvData.find(
                (d) => d.name.toUpperCase().trim() === normalizedName
              )?.name || normalizedName;

            await (tx.customer.create as any)({
              data: {
                name: originalName,
                // No locationId assigned at import time; can be edited later
                openingBalance: balance,
                // Satisfy older Prisma Client types; ignored at runtime
                locationRef: undefined,
              },
            });
            createdCount++;
          }
        }

        console.log(`Updated ${updatedCount} customers`);
        console.log(`Created ${createdCount} customers`);

        return {
          deletedSalesReturnItems: deletedSalesReturnItems.count,
          deletedSalesReturns: deletedSalesReturns.count,
          deletedInvoiceItems: deletedInvoiceItems.count,
          deletedPayments: deletedPayments.count,
          deletedCustomerPayments: deletedCustomerPayments.count,
          deletedCreditApplications: deletedCreditApplications.count,
          deletedInvoices: deletedInvoices.count,
          updatedCustomers: updatedCount,
          createdCustomers: createdCount,
          totalCustomers: customerBalances.size,
        };
      });

      // Log the operation
      await logCreate(userId, "OPENING_BALANCE_IMPORT", userId, {
        action: "OPENING_BALANCE_IMPORT",
        ...result,
        importedBy: req.user!.email,
        defaultLocation: null,
      });

      res.json({
        success: true,
        message: "Opening balances imported successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error importing opening balances:", error);
      res.status(500).json({
        error: "Failed to import opening balances",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Admin routes will be implemented here
router.get("/", (req, res) => {
  res.json({ message: "Admin routes - coming soon" });
});

export default router;
