const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log("=== Checking Products ===");
    const products = await prisma.product.findMany({
      include: { productGroup: true },
    });
    console.log("Products:", products.length);
    products.forEach((p) =>
      console.log("- ", p.name, "(Group:", p.productGroup.name, ")")
    );

    console.log("\n=== Checking Inventory Items ===");
    const inventory = await prisma.inventoryItem.findMany({
      include: { product: { include: { productGroup: true } } },
    });
    console.log("Inventory Items:", inventory.length);
    inventory.forEach((i) =>
      console.log(
        "- ",
        i.name,
        "(SKU:",
        i.sku,
        ", Stock:",
        i.currentQuantity,
        ", Product:",
        i.product?.name || "No Product",
        ")"
      )
    );

    console.log("\n=== Checking Items for Invoicing ===");
    const invoicingItems = await prisma.inventoryItem.findMany({
      where: {
        productId: { not: null },
        currentQuantity: { gt: 0 },
      },
      include: { product: { include: { productGroup: true } } },
    });
    console.log("Items available for invoicing:", invoicingItems.length);
    invoicingItems.forEach((i) =>
      console.log("- ", i.name, "(Stock:", i.currentQuantity, ")")
    );
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
