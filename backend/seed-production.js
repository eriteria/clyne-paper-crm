const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedProduction() {
  try {
    console.log("🔍 Checking production database...");

    // Check if users exist
    const userCount = await prisma.user.count();
    console.log(`Found ${userCount} users in production database`);

    if (userCount === 0) {
      console.log("🌱 No users found, seeding production database...");

      // Create roles first
      const adminRole = await prisma.role.upsert({
        where: { name: "Admin" },
        update: {},
        create: {
          name: "Admin",
          permissions: JSON.stringify({
            users: ["create", "read", "update", "delete"],
            teams: ["create", "read", "update", "delete"],
            regions: ["create", "read", "update", "delete"],
            inventory: ["create", "read", "update", "delete"],
            waybills: ["create", "read", "update", "delete"],
            invoices: ["create", "read", "update", "delete"],
            reports: ["read"],
            admin: ["full-access"],
          }),
        },
      });

      // Create a basic region
      const defaultRegion = await prisma.region.upsert({
        where: { name: "Abuja - FCT" },
        update: {},
        create: {
          name: "Abuja - FCT",
          code: "FCT",
        },
      });

      // Create admin user
      const hashedPassword = await bcrypt.hash("password123", 12);

      const adminUser = await prisma.user.upsert({
        where: { email: "admin@clynepaper.com" },
        update: {},
        create: {
          fullName: "System Administrator",
          email: "admin@clynepaper.com",
          phone: "+234-800-000-0001",
          passwordHash: hashedPassword,
          roleId: adminRole.id,
          regionId: defaultRegion.id,
          isActive: true,
        },
      });

      console.log("✅ Admin user created successfully!");
      console.log("📧 Email: admin@clynepaper.com");
      console.log("🔑 Password: password123");
    } else {
      console.log("✅ Users already exist in production database");

      // Show existing users
      const users = await prisma.user.findMany({
        include: { role: true },
        take: 5,
      });

      console.log("👥 Sample users:");
      users.forEach((user) => {
        console.log(`  - ${user.email} (${user.role.name})`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedProduction();
