import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

/**
 * Seed test database with fixture data
 */

async function seedTestDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log("🌱 Seeding test database...");

    // Load fixture files
    const customersData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "customers.json"), "utf-8")
    );
    const usersData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "users.json"), "utf-8")
    );

    // Create roles
    console.log("Creating roles...");
    const adminRole = await prisma.role.upsert({
      where: { name: "admin" },
      update: {},
      create: {
        name: "admin",
        permissions: "*",
      },
    });

    const managerRole = await prisma.role.upsert({
      where: { name: "manager" },
      update: {},
      create: {
        name: "manager",
        permissions: "read,write,approve",
      },
    });

    const staffRole = await prisma.role.upsert({
      where: { name: "staff" },
      update: {},
      create: {
        name: "staff",
        permissions: "read,write",
      },
    });

    // Create regions
    console.log("Creating regions...");
    const region = await prisma.region.upsert({
      where: { name: "Nigeria" },
      update: {},
      create: {
        name: "Nigeria",
      },
    });

    // Create locations
    console.log("Creating locations...");
    const locations = await Promise.all([
      prisma.location.upsert({
        where: { code: "LOS" },
        update: {},
        create: {
          name: "Lagos Warehouse",
          code: "LOS",
          address: "12 Warehouse Road",
          city: "Lagos",
          state: "Lagos State",
          country: "Nigeria",
        },
      }),
      prisma.location.upsert({
        where: { code: "ABJ" },
        update: {},
        create: {
          name: "Abuja Warehouse",
          code: "ABJ",
          address: "45 Industrial Avenue",
          city: "Abuja",
          state: "FCT",
          country: "Nigeria",
        },
      }),
      prisma.location.upsert({
        where: { code: "PH" },
        update: {},
        create: {
          name: "Port Harcourt Warehouse",
          code: "PH",
          address: "78 Port Complex",
          city: "Port Harcourt",
          state: "Rivers State",
          country: "Nigeria",
        },
      }),
    ]);

    // Create users
    console.log("Creating users...");
    const roleMap: { [key: string]: string } = {
      admin: adminRole.id,
      manager: managerRole.id,
      staff: staffRole.id,
    };

    for (const userData of usersData) {
      const passwordHash = await bcrypt.hash("password123", 10);
      
      await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          fullName: userData.fullName,
          phone: userData.phone,
          passwordHash,
          roleId: roleMap[userData.role],
          regionId: region.id,
          primaryLocationId: locations[0].id,
          isActive: true,
        },
      });
    }

    // Create customers
    console.log("Creating customers...");
    for (const customerData of customersData) {
      await prisma.customer.create({
        data: {
          ...customerData,
          locationId: locations[Math.floor(Math.random() * locations.length)].id,
        },
      });
    }

    // Create product groups
    console.log("Creating product groups...");
    const productGroup = await prisma.productGroup.upsert({
      where: { name: "Tissue Paper" },
      update: {},
      create: {
        name: "Tissue Paper",
      },
    });

    // Create products
    console.log("Creating products...");
    const products = await Promise.all([
      prisma.product.create({
        data: {
          name: "Premium Toilet Paper",
          productGroupId: productGroup.id,
          monthlyTarget: 10000,
        },
      }),
      prisma.product.create({
        data: {
          name: "Standard Toilet Paper",
          productGroupId: productGroup.id,
          monthlyTarget: 15000,
        },
      }),
      prisma.product.create({
        data: {
          name: "Kitchen Towels",
          productGroupId: productGroup.id,
          monthlyTarget: 8000,
        },
      }),
      prisma.product.create({
        data: {
          name: "Facial Tissues",
          productGroupId: productGroup.id,
          monthlyTarget: 12000,
        },
      }),
    ]);

    // Create inventory items
    console.log("Creating inventory items...");
    for (const location of locations) {
      for (const product of products) {
        await prisma.inventoryItem.create({
          data: {
            sku: `${location.code}-${product.name.replace(/\s+/g, "-").toUpperCase()}-001`,
            name: `${product.name} - ${location.name}`,
            description: `${product.name} stocked at ${location.name}`,
            unit: "pack",
            unitPrice: Math.floor(Math.random() * 100) + 50,
            currentQuantity: Math.floor(Math.random() * 1000) + 100,
            minStock: 50,
            locationId: location.id,
            productId: product.id,
          },
        });
      }
    }

    console.log("✅ Test database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding test database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedTestDatabase };
