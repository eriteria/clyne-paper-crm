import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateTestId } from "../utils/testDb";

export interface CreateUserOptions {
  email?: string;
  fullName?: string;
  password?: string;
  roleId?: string;
  teamId?: string;
  regionId?: string;
  primaryLocationId?: string;
  isActive?: boolean;
  phone?: string;
}

/**
 * Factory for creating test users
 */
export class UserFactory {
  constructor(private prisma: PrismaClient) {}

  async create(options: CreateUserOptions = {}) {
    const {
      email = `user-${generateTestId()}@test.com`,
      fullName = "Test User",
      password = "password123",
      roleId,
      teamId,
      regionId,
      primaryLocationId,
      isActive = true,
      phone = "+2348012345678",
    } = options;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        roleId: roleId!,
        teamId,
        regionId,
        primaryLocationId,
        isActive,
        phone,
      },
      include: {
        role: true,
        team: true,
        region: true,
        primaryLocation: true,
      },
    });

    return { user, password };
  }

  async createAdmin(options: Partial<CreateUserOptions> = {}) {
    const adminRole = await this.prisma.role.findFirst({
      where: { name: "admin" },
    });

    if (!adminRole) {
      throw new Error("Admin role not found. Seed basic data first.");
    }

    return this.create({
      ...options,
      roleId: adminRole.id,
      fullName: options.fullName || "Admin User",
    });
  }

  async createManager(options: Partial<CreateUserOptions> = {}) {
    const managerRole = await this.prisma.role.findFirst({
      where: { name: "manager" },
    });

    if (!managerRole) {
      throw new Error("Manager role not found. Seed basic data first.");
    }

    return this.create({
      ...options,
      roleId: managerRole.id,
      fullName: options.fullName || "Manager User",
    });
  }

  async createStaff(options: Partial<CreateUserOptions> = {}) {
    const staffRole = await this.prisma.role.findFirst({
      where: { name: "staff" },
    });

    if (!staffRole) {
      throw new Error("Staff role not found. Seed basic data first.");
    }

    return this.create({
      ...options,
      roleId: staffRole.id,
      fullName: options.fullName || "Staff User",
    });
  }

  async createMany(count: number, options: CreateUserOptions = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(
        await this.create({
          ...options,
          email: `user-${i}-${generateTestId()}@test.com`,
          fullName: `Test User ${i + 1}`,
        })
      );
    }
    return users;
  }
}
