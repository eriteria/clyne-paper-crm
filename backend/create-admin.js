const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log("Checking database...");

    // Check if admin role exists
    let adminRole = await prisma.role.findFirst({
      where: { name: "Admin" },
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: "Admin",
          permissions: JSON.stringify({ admin: ["full-access"] }),
        },
      });
      console.log("✅ Admin role created");
    }

    // Check if admin user exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: "admin@clynepaper.com" },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("password123", 12);

      const admin = await prisma.user.create({
        data: {
          fullName: "System Administrator",
          email: "admin@clynepaper.com",
          passwordHash: hashedPassword,
          roleId: adminRole.id,
          isActive: true,
        },
      });

      console.log("✅ Admin user created successfully!");
      console.log("📧 Email: admin@clynepaper.com");
      console.log("🔑 Password: password123");
    } else {
      console.log("✅ Admin user already exists");
    }
  } catch (e) {
    console.error("❌ Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
