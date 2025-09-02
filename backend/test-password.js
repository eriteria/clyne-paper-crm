import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function testPassword() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "admin@clynepaper.com" },
    });

    console.log("User found:", !!user);
    if (user) {
      console.log("User email:", user.email);
      console.log("User active:", user.isActive);
      console.log("Password hash length:", user.passwordHash.length);

      const isValid = await bcrypt.compare("admin123", user.passwordHash);
      console.log("Password valid with admin123:", isValid);

      // Test with different password
      const isValid2 = await bcrypt.compare("wrong", user.passwordHash);
      console.log("Password valid with wrong:", isValid2);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testPassword();
