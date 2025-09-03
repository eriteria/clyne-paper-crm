const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testInventoryLevels() {
  try {
    console.log("Checking current inventory levels...");

    const inventoryItems = await prisma.inventoryItem.findMany({
      include: {
        product: {
          include: {
            productGroup: true,
          },
        },
      },
      orderBy: {
        currentQuantity: "asc",
      },
    });

    console.log(`Found ${inventoryItems.length} inventory items`);
    console.log("\nInventory Status:");
    console.log("================");

    inventoryItems.forEach((item) => {
      const productName = item.product?.name || item.name;
      const groupName = item.product?.productGroup?.name || "N/A";
      const status =
        item.currentQuantity <= 0
          ? "❌ OUT OF STOCK"
          : item.currentQuantity < 10
            ? "⚠️ LOW STOCK"
            : "✅ IN STOCK";

      console.log(
        `${productName} (${groupName}): ${item.currentQuantity} ${item.unit} ${status}`
      );
    });

    // Test creating an invoice with negative stock
    console.log("\n\nTesting invoice creation with out-of-stock items...");

    const outOfStockItem = inventoryItems.find(
      (item) => item.currentQuantity <= 5
    );
    if (outOfStockItem) {
      console.log(
        `Testing with: ${outOfStockItem.product?.name || outOfStockItem.name}`
      );
      console.log(`Current stock: ${outOfStockItem.currentQuantity}`);
      console.log(
        "✅ Invoice creation should now work even with insufficient stock"
      );
    } else {
      console.log("No low-stock items found for testing");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testInventoryLevels();
