const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function createInventoryItems() {
  try {
    console.log("Creating inventory items...");

    // Get all products
    const products = await prisma.product.findMany({
      include: { productGroup: true },
    });

    console.log(
      `Found ${products.length} products. Creating inventory items...`
    );

    // Create inventory items for each product
    const inventoryItems = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Create main warehouse inventory
      const mainWarehouseItem = await prisma.inventoryItem.upsert({
        where: {
          sku: `${product.name.replace(/[^A-Z0-9]/g, "").toUpperCase()}-MW-001`,
        },
        update: {},
        create: {
          sku: `${product.name.replace(/[^A-Z0-9]/g, "").toUpperCase()}-MW-001`,
          name: product.name,
          description: `${product.name} - ${product.productGroup.name}`,
          unit: "units",
          unitPrice: Math.floor(Math.random() * 5000) + 1000, // Random price between 1000-6000
          currentQuantity: Math.floor(Math.random() * 200) + 50, // Random stock between 50-250
          minStock: 10,
          location: "Main Warehouse",
          productId: product.id,
        },
      });

      inventoryItems.push(mainWarehouseItem);

      // Create branch store inventory for some products
      if (i % 2 === 0) {
        // Every other product
        const branchItem = await prisma.inventoryItem.upsert({
          where: {
            sku: `${product.name.replace(/[^A-Z0-9]/g, "").toUpperCase()}-BS-001`,
          },
          update: {},
          create: {
            sku: `${product.name.replace(/[^A-Z0-9]/g, "").toUpperCase()}-BS-001`,
            name: product.name,
            description: `${product.name} - ${product.productGroup.name}`,
            unit: "units",
            unitPrice: Math.floor(Math.random() * 5000) + 1000,
            currentQuantity: Math.floor(Math.random() * 100) + 20,
            minStock: 5,
            location: "Branch Store",
            productId: product.id,
          },
        });

        inventoryItems.push(branchItem);
      }
    }

    console.log(
      `Created ${inventoryItems.length} inventory items successfully!`
    );

    // Verify
    const totalInventory = await prisma.inventoryItem.count({
      where: { productId: { not: null } },
    });
    console.log(`Total inventory items linked to products: ${totalInventory}`);
  } catch (error) {
    console.error("Error creating inventory items:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createInventoryItems();
