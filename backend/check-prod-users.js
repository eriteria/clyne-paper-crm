const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log("Checking production database users...");
    const users = await prisma.user.findMany({
      include: { role: true },
    });

    console.log(`Found ${users.length} users:`);
    users.forEach((u) => {
      console.log(`- ${u.email} (${u.role.name}) - Active: ${u.isActive}`);
    });

    // Check for admin user specifically
    const admin = await prisma.user.findFirst({
      where: {
        email: "admin@clynepaper.com",
      },
      include: { role: true },
    });

    if (admin) {
      console.log("\nAdmin user found:");
      console.log(`Email: ${admin.email}`);
      console.log(`Role: ${admin.role.name}`);
      console.log(`Active: ${admin.isActive}`);
    } else {
      console.log("\nAdmin user NOT found - database needs seeding!");
    }
  } catch (error) {
    console.error("Error checking users:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
