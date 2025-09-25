import request from "supertest";
import { Express } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../setup";

export class TestHelper {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Create a test user with specified role
   */
  async createTestUser(
    userData: {
      email?: string;
      password?: string;
      fullName?: string;
      roleId?: string;
      teamId?: string;
      regionId?: string;
    } = {}
  ) {
    const {
      email = "test@example.com",
      password = "password123",
      fullName = "Test User",
      roleId,
      teamId,
      regionId,
    } = userData;

    // Ensure role exists or create one
    let role;
    if (roleId) {
      role = await prisma.role.findFirst({ where: { id: roleId } });
    }

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: "Test Role",
          permissions: "read,write",
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        roleId: role.id,
        teamId,
        regionId,
        isActive: true,
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

    return { user, password };
  }

  /**
   * Generate JWT token for testing
   */
  generateAuthToken(userId: string, roleId: string): string {
    return jwt.sign(
      {
        userId,
        roleId,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );
  }

  /**
   * Get authenticated request agent
   */
  async getAuthenticatedAgent(userData?: any) {
    const { user, password } = await this.createTestUser(userData);

    const loginResponse = await request(this.app).post("/api/auth/login").send({
      email: user.email,
      password,
    });

    const { token } = loginResponse.body.data;

    return {
      user,
      token,
      get: (url: string) =>
        request(this.app).get(url).set("Authorization", `Bearer ${token}`),
      post: (url: string) =>
        request(this.app).post(url).set("Authorization", `Bearer ${token}`),
      put: (url: string) =>
        request(this.app).put(url).set("Authorization", `Bearer ${token}`),
      delete: (url: string) =>
        request(this.app).delete(url).set("Authorization", `Bearer ${token}`),
    };
  }

  /**
   * Create test data for specific entities
   */
  async createTestCustomer(data: any = {}) {
    // Create location first if not provided
    let locationId = data.locationId;
    if (!locationId) {
      const location = await this.createTestLocation();
      locationId = location.id;
    }

    return await prisma.customer.create({
      data: {
        name: data.name || "Test Customer",
        email: data.email || "customer@test.com",
        phone: data.phone || "+234123456789",
        address: data.address || "123 Test Street",
        locationId,
        ...data,
      },
    });
  }

  async createTestInvoice(customerId: string, data: any = {}) {
    return await prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber || `INV-${Date.now()}`,
        customerId,
        totalAmount: data.totalAmount || 1000,
        currency: data.currency || "NGN",
        status: data.status || "PENDING",
        dueDate:
          data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ...data,
      },
    });
  }

  async createTestLocation(data: any = {}) {
    return await prisma.location.create({
      data: {
        name: data.name || "Test Location",
        code: data.code || "TEST",
        address: data.address || "Test Address",
        city: data.city || "Test City",
        state: data.state || "Test State",
        country: data.country || "Nigeria",
        ...data,
      },
    });
  }

  async createTestTeam(locationIds: string[] = [], data: any = {}) {
    const team = await prisma.team.create({
      data: {
        name: data.name || "Test Team",
        description: data.description || "Test team description",
        ...data,
      },
    });

    // Link team to locations if provided
    if (locationIds.length > 0) {
      await prisma.teamLocation.createMany({
        data: locationIds.map((locationId) => ({
          teamId: team.id,
          locationId,
        })),
      });
    }

    return team;
  }

  /**
   * Clean specific table
   */
  async cleanTable(tableName: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
  }

  /**
   * Wait for async operations to complete
   */
  async waitForAsync(ms: number = 100) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create app instance for testing
 */
export function createTestApp() {
  const { createApp } = require("../../src/app");

  // Create app without rate limiting for testing
  return createApp({ enableRateLimit: false });
}
