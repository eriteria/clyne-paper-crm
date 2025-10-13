import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyImport() {
  console.log("\n🔍 Verifying Google Sheets Import Results...\n");
  console.log("=" .repeat(60));

  try {
    // 1. Product Groups
    const productGroups = await prisma.productGroup.findMany();
    console.log("\n📦 Product Groups:");
    console.log(`  Total: ${productGroups.length}`);
    productGroups.slice(0, 5).forEach((pg) => {
      console.log(`    - ${pg.name}`);
    });
    if (productGroups.length > 5) {
      console.log(`    ... and ${productGroups.length - 5} more`);
    }

    // 2. Products
    const products = await prisma.product.findMany({
      include: { productGroup: true },
    });
    console.log("\n📝 Products:");
    console.log(`  Total: ${products.length}`);
    products.slice(0, 5).forEach((p) => {
      console.log(
        `    - ${p.name} (Group: ${p.productGroup?.name || "Unknown"})`
      );
    });
    if (products.length > 5) {
      console.log(`    ... and ${products.length - 5} more`);
    }

    // 3. Relationship Manager Users
    const salesRole = await prisma.role.findFirst({
      where: { name: "Sales" },
    });
    const rmUsers = await prisma.user.findMany({
      where: { roleId: salesRole?.id },
      select: { email: true, fullName: true },
    });
    console.log("\n👤 Relationship Manager Users:");
    console.log(`  Total: ${rmUsers.length}`);
    rmUsers.forEach((u) => {
      console.log(`    - ${u.fullName} (${u.email})`);
    });

    // 4. Customers
    const customers = await prisma.customer.findMany({
      include: {
        relationshipManager: { select: { fullName: true } },
        locationRef: { select: { name: true } },
      },
    });
    console.log("\n🏢 Customers:");
    console.log(`  Total: ${customers.length}`);
    console.log(`  With Relationship Managers: ${customers.filter((c) => c.relationshipManagerId).length}`);
    console.log(`  With Locations: ${customers.filter((c) => c.locationId).length}`);
    console.log(`  With Onboarding Dates: ${customers.filter((c) => c.onboardingDate).length}`);
    console.log(`  With Last Order Dates: ${customers.filter((c) => c.lastOrderDate).length}`);
    console.log("\n  Sample Customers:");
    customers.slice(0, 5).forEach((c) => {
      console.log(
        `    - ${c.name} | RM: ${c.relationshipManager?.fullName || "None"} | Location: ${c.locationRef?.name || "None"}`
      );
    });

    // 5. Invoices
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: { select: { name: true } },
        billedBy: { select: { fullName: true } },
      },
    });
    console.log("\n🧾 Invoices:");
    console.log(`  Total: ${invoices.length}`);
    console.log(
      `  With Customer Names: ${invoices.filter((i) => i.customerName).length}`
    );
    console.log(
      `  With Billed By User: ${invoices.filter((i) => i.billedByUserId).length}`
    );
    console.log(
      `  With Balance: ${invoices.filter((i) => i.balance !== null).length}`
    );
    console.log("\n  Status Breakdown:");
    const statusCounts = invoices.reduce(
      (acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    ${status}: ${count}`);
    });

    // 6. Payments
    const payments = await prisma.customerPayment.findMany({
      include: {
        customer: { select: { name: true } },
        paymentApplications: { include: { invoice: true } },
      },
    });
    console.log("\n💰 Customer Payments:");
    console.log(`  Total: ${payments.length}`);
    console.log(
      `  With Payment Methods: ${payments.filter((p) => p.paymentMethod).length}`
    );
    console.log(
      `  With Reference Numbers: ${payments.filter((p) => p.referenceNumber).length}`
    );

    const applications = await prisma.paymentApplication.findMany();
    console.log("\n📎 Payment Applications:");
    console.log(`  Total: ${applications.length}`);
    const totalApplied = applications.reduce((sum, app) => sum + Number(app.amountApplied), 0);
    console.log(
      `  Total Amount Applied: ₦${totalApplied.toLocaleString()}`
    );

    // 7. Locations
    const locations = await prisma.location.findMany({
      include: { _count: { select: { customers: true } } },
    });
    console.log("\n📍 Locations:");
    console.log(`  Total: ${locations.length}`);
    locations.slice(0, 5).forEach((loc) => {
      console.log(`    - ${loc.name} (${loc._count.customers} customers)`);
    });
    if (locations.length > 5) {
      console.log(`    ... and ${locations.length - 5} more`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Import verification complete!\n");
  } catch (error) {
    console.error("\n❌ Error verifying import:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyImport();
