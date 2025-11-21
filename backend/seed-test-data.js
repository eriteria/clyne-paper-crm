/**
 * Seed test database with sample data for E2E tests
 * Run with: DATABASE_URL="postgresql://crm:Waiba2001@127.0.0.1:5432/crm_test" node seed-test-data.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding test database...");

  // Create locations
  const locations = await Promise.all([
    prisma.location.upsert({
      where: { name: "Lagos" },
      update: {},
      create: {
        name: "Lagos",
        description: "Lagos location",
      },
    }),
    prisma.location.upsert({
      where: { name: "Abuja" },
      update: {},
      create: {
        name: "Abuja",
        description: "Abuja location",
      },
    }),
  ]);
  console.log(`✅ Created ${locations.length} locations`);

  // Get admin user
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@clynepaper.com" },
  });

  if (!adminUser) {
    console.error("❌ Admin user not found. Run create-admin.js first.");
    process.exit(1);
  }

  // Create teams
  const salesTeam = await prisma.team.upsert({
    where: { name: "Sales Team" },
    update: {},
    create: {
      name: "Sales Team",
      description: "Main sales team",
      members: {
        connect: { id: adminUser.id },
      },
    },
  });
  console.log("✅ Created sales team");

  // Link team to locations
  await Promise.all(
    locations.map((location) =>
      prisma.teamLocation.upsert({
        where: {
          teamId_locationId: {
            teamId: salesTeam.id,
            locationId: location.id,
          },
        },
        update: {},
        create: {
          teamId: salesTeam.id,
          locationId: location.id,
        },
      })
    )
  );
  console.log("✅ Linked team to locations");

  // Create test customers
  await prisma.customer.deleteMany({}); // Clear existing test customers
  const customers = await prisma.customer.createMany({
    data: [
      {
        name: "Test Customer 1",
        email: "customer1@test.com",
        phone: "+2348012345671",
        address: "Test Address 1, Lagos",
        locationId: locations[0].id,
        teamId: salesTeam.id,
        defaultPaymentTermDays: 30,
      },
      {
        name: "Test Customer 2",
        email: "customer2@test.com",
        phone: "+2348012345672",
        address: "Test Address 2, Abuja",
        locationId: locations[1].id,
        teamId: salesTeam.id,
        defaultPaymentTermDays: 15,
      },
      {
        name: "Test Customer 3",
        email: "customer3@test.com",
        phone: "+2348012345673",
        address: "Test Address 3, Lagos",
        locationId: locations[0].id,
        teamId: salesTeam.id,
        defaultPaymentTermDays: 0, // CASH
      },
    ],
  });
  console.log(`✅ Created ${customers.count} test customers`);

  // Create product groups
  const productGroup = await prisma.productGroup.upsert({
    where: { name: "Tissue Paper" },
    update: {},
    create: {
      name: "Tissue Paper",
    },
  });
  console.log("✅ Created product group");

  // Create products
  await prisma.product.deleteMany({}); // Clear existing products
  const products = await prisma.product.createMany({
    data: [
      {
        name: "Jumbo Roll",
        productGroupId: productGroup.id,
        monthlyTarget: 1000,
      },
      {
        name: "Toilet Paper",
        productGroupId: productGroup.id,
        monthlyTarget: 500,
      },
    ],
  });
  console.log(`✅ Created ${products.count} products`);

  console.log("\n🎉 Test database seeded successfully!");
  console.log("📊 Summary:");
  console.log(`   - ${locations.length} locations`);
  console.log(`   - 1 team`);
  console.log(`   - ${customers.count} customers`);
  console.log(`   - ${products.count} products`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
