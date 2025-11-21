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
          permissions: JSON.stringify(["*"]), // Wildcard permission for full access
        },
      });
      console.log("✅ Admin role created");
    } else {
      // Update existing role to have wildcard permissions
      adminRole = await prisma.role.update({
        where: { id: adminRole.id },
        data: {
          permissions: JSON.stringify(["*"]), // Ensure wildcard for full access
        },
      });
      console.log("✅ Admin role updated with wildcard permissions");
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
