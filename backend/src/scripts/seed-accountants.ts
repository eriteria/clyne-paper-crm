import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedAccountants() {
  console.log("🌱 Seeding accountants...");

  // Get the Accountant role
  const accountantRole = await prisma.role.findUnique({
    where: { name: "Accountant" },
  });

  if (!accountantRole) {
    throw new Error("Accountant role not found. Please run the main seeder first.");
  }

  // Get Wuse location
  const wuseLocation = await prisma.location.findUnique({
    where: { name: "Wuse" },
  });

  if (!wuseLocation) {
    throw new Error("Wuse location not found. Please create it first.");
  }

  // Get Factory location
  const factoryLocation = await prisma.location.findUnique({
    where: { name: "Factory" },
  });

  if (!factoryLocation) {
    throw new Error("Factory location not found. Please create it first.");
  }

  // Get Abuja region
  const abujaRegion = await prisma.region.findFirst({
    where: { name: "Abuja - FCT" },
  });

  const hashedPassword = await bcrypt.hash("password123", 12);

  // Create Wuse Accountant
  const wuseAccountant = await prisma.user.upsert({
    where: { email: "accountant.wuse@clynepaper.com" },
    update: {
      primaryLocationId: wuseLocation.id,
    },
    create: {
      fullName: "Sarah Wuse",
      email: "accountant.wuse@clynepaper.com",
      phone: "+234-800-000-0101",
      passwordHash: hashedPassword,
      roleId: accountantRole.id,
      regionId: abujaRegion?.id,
      primaryLocationId: wuseLocation.id,
      isActive: true,
    },
  });

  // Assign Wuse accountant to Wuse location
  await prisma.userLocation.upsert({
    where: {
      userId_locationId: {
        userId: wuseAccountant.id,
        locationId: wuseLocation.id,
      },
    },
    update: {},
    create: {
      userId: wuseAccountant.id,
      locationId: wuseLocation.id,
    },
  });

  // Create Factory Accountant
  const factoryAccountant = await prisma.user.upsert({
    where: { email: "accountant.factory@clynepaper.com" },
    update: {
      primaryLocationId: factoryLocation.id,
    },
    create: {
      fullName: "James Factory",
      email: "accountant.factory@clynepaper.com",
      phone: "+234-800-000-0102",
      passwordHash: hashedPassword,
      roleId: accountantRole.id,
      regionId: abujaRegion?.id,
      primaryLocationId: factoryLocation.id,
      isActive: true,
    },
  });

  // Assign Factory accountant to Factory location
  await prisma.userLocation.upsert({
    where: {
      userId_locationId: {
        userId: factoryAccountant.id,
        locationId: factoryLocation.id,
      },
    },
    update: {},
    create: {
      userId: factoryAccountant.id,
      locationId: factoryLocation.id,
    },
  });

  console.log("✅ Accountants seeded successfully!");
  console.log("\n📋 Created:");
  console.log(`- Wuse Accountant: ${wuseAccountant.email} (assigned to Wuse location)`);
  console.log(`- Factory Accountant: ${factoryAccountant.email} (assigned to Factory location)`);
  console.log("\n🔑 Default password: password123");
}

seedAccountants()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
