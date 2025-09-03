const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedSampleData() {
  try {
    console.log("Creating sample data...");

    // First, let's create a product group
    const productGroup = await prisma.productGroup.upsert({
      where: { name: "Paper Products" },
      update: {},
      create: {
        name: "Paper Products",
      },
    });

    console.log("Product group created:", productGroup);

    // Create some products
    const products = await Promise.all([
      prisma.product.upsert({
        where: {
          name_productGroupId: {
            name: "A4 Copy Paper",
            productGroupId: productGroup.id,
          },
        },
        update: {},
        create: {
          name: "A4 Copy Paper",
          productGroupId: productGroup.id,
          monthlyTarget: 1000,
        },
      }),
      prisma.product.upsert({
        where: {
          name_productGroupId: {
            name: "A3 Copy Paper",
            productGroupId: productGroup.id,
          },
        },
        update: {},
        create: {
          name: "A3 Copy Paper",
          productGroupId: productGroup.id,
          monthlyTarget: 500,
        },
      }),
    ]);

    console.log("Products created:", products);

    // Create inventory items linked to products
    const inventoryItems = await Promise.all([
      prisma.inventoryItem.upsert({
        where: { sku: "A4-COPY-001" },
        update: {},
        create: {
          sku: "A4-COPY-001",
          name: "A4 Copy Paper - 80gsm",
          description: "Premium A4 copy paper 80gsm",
          unit: "reams",
          unitPrice: 2500,
          currentQuantity: 150,
          minStock: 20,
          location: "Main Warehouse",
          productId: products[0].id,
        },
      }),
      prisma.inventoryItem.upsert({
        where: { sku: "A3-COPY-001" },
        update: {},
        create: {
          sku: "A3-COPY-001",
          name: "A3 Copy Paper - 80gsm",
          description: "Premium A3 copy paper 80gsm",
          unit: "reams",
          unitPrice: 4500,
          currentQuantity: 75,
          minStock: 10,
          location: "Main Warehouse",
          productId: products[1].id,
        },
      }),
      prisma.inventoryItem.upsert({
        where: { sku: "A4-COPY-002" },
        update: {},
        create: {
          sku: "A4-COPY-002",
          name: "A4 Copy Paper - 80gsm",
          description: "Premium A4 copy paper 80gsm",
          unit: "reams",
          unitPrice: 2500,
          currentQuantity: 200,
          minStock: 30,
          location: "Branch Store",
          productId: products[0].id,
        },
      }),
    ]);

    console.log("Inventory items created:", inventoryItems);

    console.log("Sample data created successfully!");
  } catch (error) {
    console.error("Error creating sample data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSampleData();
