import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testNewFields() {
  try {
    // Test that the new fields exist by creating a customer with them
    const testCustomer = await prisma.customer.create({
      data: {
        name: "Test Customer",
        location: "Test Location",
        onboardingDate: new Date(),
        lastOrderDate: new Date(),
        relationshipManagerName: "Test Manager",
      },
    });

    console.log("✅ New fields created successfully:", testCustomer);

    // Clean up test data
    await prisma.customer.delete({
      where: { id: testCustomer.id },
    });

    console.log("✅ Test customer deleted");
  } catch (error) {
    console.error("❌ Error testing new fields:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewFields();
