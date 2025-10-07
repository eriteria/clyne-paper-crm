// Simple test to create an invoice and see what happens
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testInvoiceCreation() {
  try {
    console.log("🧪 Testing invoice number generation...");

    // Get the current highest invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    });

    console.log("Last invoice number:", lastInvoice?.invoiceNumber || "None");

    // Calculate next number
    let nextNumber = "1000";
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(/\D/g, ""));
      if (!isNaN(lastNumber)) {
        nextNumber = String(lastNumber + 1);
      }
    }

    console.log("Next invoice number would be:", nextNumber);

    // Check if this number already exists
    const existing = await prisma.invoice.findFirst({
      where: { invoiceNumber: nextNumber },
    });

    if (existing) {
      console.log("❌ That number already exists! This explains the conflict.");
      console.log("Existing invoice:", {
        id: existing.id,
        invoiceNumber: existing.invoiceNumber,
        createdAt: existing.createdAt,
      });
    } else {
      console.log("✅ That number is available.");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testInvoiceCreation();
