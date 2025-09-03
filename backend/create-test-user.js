import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // First, let's check if a role exists
    let adminRole = await prisma.role.findFirst({
      where: { name: "ADMIN" },
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: "ADMIN",
          permissions: "CREATE,READ,UPDATE,DELETE",
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        email: "admin@clynepapercrm.com",
        passwordHash: hashedPassword,
        fullName: "System Administrator",
        roleId: adminRole.id,
      },
    });

    console.log("Test user created:", {
      email: user.email,
      fullName: user.fullName,
    });
    console.log("Login credentials:");
    console.log("Email: admin@clynepapercrm.com");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
