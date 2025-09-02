const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log("Testing authentication...");

    const user = await prisma.user.findUnique({
      where: { email: "admin@clynepaper.com" },
      include: { role: true },
    });

    if (user) {
      console.log("✅ User found:", user.email);
      console.log("✅ Role:", user.role.name);
      console.log("✅ Is Active:", user.isActive);

      const isValid = await bcrypt.compare("password123", user.passwordHash);
      console.log("✅ Password valid:", isValid);

      if (isValid) {
        console.log("🎉 Authentication test PASSED!");
      } else {
        console.log("❌ Password validation FAILED!");
      }
    } else {
      console.log("❌ User not found");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
