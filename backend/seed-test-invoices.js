const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log("🌱 Starting comprehensive test data seeding...");

    // 1. Create or get admin role
    const adminRole = await prisma.role.upsert({
      where: { name: "Admin" },
      update: {},
      create: {
        name: "Admin",
        permissions: JSON.stringify({
          users: ["create", "read", "update", "delete"],
          teams: ["create", "read", "update", "delete"],
          regions: ["create", "read", "update", "delete"],
          inventory: ["create", "read", "update", "delete"],
          invoices: ["create", "read", "update", "delete"],
          reports: ["read"],
          admin: ["full-access"],
        }),
      },
    });

    // 2. Create regions
    const regions = await Promise.all([
      prisma.region.upsert({
        where: { name: "Lagos State" },
        update: {},
        create: { name: "Lagos State" },
      }),
      prisma.region.upsert({
        where: { name: "Abuja - FCT" },
        update: {},
        create: { name: "Abuja - FCT" },
      }),
      prisma.region.upsert({
        where: { name: "Kano State" },
        update: {},
        create: { name: "Kano State" },
      }),
    ]);
    console.log("✅ Regions created");

    // 3. Create teams
    const teams = await Promise.all([
      prisma.team.upsert({
        where: { name: "Lagos Sales Team" },
        update: {},
        create: {
          name: "Lagos Sales Team",
          description: "Sales team covering Lagos area",
        },
      }),
      prisma.team.upsert({
        where: { name: "Abuja Sales Team" },
        update: {},
        create: {
          name: "Abuja Sales Team",
          description: "Sales team covering FCT area",
        },
      }),
      prisma.team.upsert({
        where: { name: "Northern Sales Team" },
        update: {},
        create: {
          name: "Northern Sales Team",
          description: "Sales team covering Northern Nigeria",
        },
      }),
    ]);
    console.log("✅ Teams created");

    // 4. Create locations
    const locations = await Promise.all([
      prisma.location.upsert({
        where: { name: "Lagos Office" },
        update: {},
        create: { name: "Lagos Office", address: "Victoria Island, Lagos" },
      }),
      prisma.location.upsert({
        where: { name: "Abuja Office" },
        update: {},
        create: {
          name: "Abuja Office",
          address: "Central Business District, Abuja",
        },
      }),
      prisma.location.upsert({
        where: { name: "Kano Office" },
        update: {},
        create: { name: "Kano Office", address: "Commercial Area, Kano" },
      }),
    ]);
    console.log("✅ Locations created");

    // 5. Link teams to locations
    for (let i = 0; i < teams.length; i++) {
      await prisma.teamLocation.upsert({
        where: {
          teamId_locationId: {
            teamId: teams[i].id,
            locationId: locations[i].id,
          },
        },
        update: {},
        create: {
          teamId: teams[i].id,
          locationId: locations[i].id,
        },
      });
    }
    console.log("✅ Team-Location mappings created");

    // 6. Create users
    const hashedPassword = await bcrypt.hash("password123", 12);
    const users = await Promise.all([
      prisma.user.upsert({
        where: { email: "admin@clynepaper.com" },
        update: {},
        create: {
          firstName: "Admin",
          lastName: "User",
          email: "admin@clynepaper.com",
          phoneNumber: "+234-800-000-0001",
          passwordHash: hashedPassword,
          isActive: true,
          roleId: adminRole.id,
          regionId: regions[0].id,
          teamId: teams[0].id,
        },
      }),
      prisma.user.upsert({
        where: { email: "john.doe@clynepaper.com" },
        update: {},
        create: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@clynepaper.com",
          phoneNumber: "+234-800-000-0002",
          passwordHash: hashedPassword,
          isActive: true,
          roleId: adminRole.id,
          regionId: regions[0].id,
          teamId: teams[0].id,
        },
      }),
      prisma.user.upsert({
        where: { email: "jane.smith@clynepaper.com" },
        update: {},
        create: {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@clynepaper.com",
          phoneNumber: "+234-800-000-0003",
          passwordHash: hashedPassword,
          isActive: true,
          roleId: adminRole.id,
          regionId: regions[1].id,
          teamId: teams[1].id,
        },
      }),
      prisma.user.upsert({
        where: { email: "mike.wilson@clynepaper.com" },
        update: {},
        create: {
          firstName: "Mike",
          lastName: "Wilson",
          email: "mike.wilson@clynepaper.com",
          phoneNumber: "+234-800-000-0004",
          passwordHash: hashedPassword,
          isActive: true,
          roleId: adminRole.id,
          regionId: regions[2].id,
          teamId: teams[2].id,
        },
      }),
    ]);
    console.log("✅ Users created");

    // 7. Create customers
    const customers = await Promise.all([
      prisma.customer.upsert({
        where: { email: "purchasing@bigcorp.ng" },
        update: {},
        create: {
          name: "Big Corporation Limited",
          email: "purchasing@bigcorp.ng",
          phone: "+234-801-111-1111",
          address: "Corporate Plaza, Victoria Island, Lagos",
          type: "BUSINESS",
          relationshipManagerId: users[1].id,
          locationId: locations[0].id,
          teamId: teams[0].id,
        },
      }),
      prisma.customer.upsert({
        where: { email: "orders@printshop.com" },
        update: {},
        create: {
          name: "PrintShop Nigeria Ltd",
          email: "orders@printshop.com",
          phone: "+234-802-222-2222",
          address: "Industrial Estate, Ikeja, Lagos",
          type: "BUSINESS",
          relationshipManagerId: users[1].id,
          locationId: locations[0].id,
          teamId: teams[0].id,
        },
      }),
      prisma.customer.upsert({
        where: { email: "procurement@govoffice.gov.ng" },
        update: {},
        create: {
          name: "Government Office FCT",
          email: "procurement@govoffice.gov.ng",
          phone: "+234-803-333-3333",
          address: "Three Arms Zone, Abuja",
          type: "GOVERNMENT",
          relationshipManagerId: users[2].id,
          locationId: locations[1].id,
          teamId: teams[1].id,
        },
      }),
      prisma.customer.upsert({
        where: { email: "supplies@school.edu.ng" },
        update: {},
        create: {
          name: "Federal University Kano",
          email: "supplies@school.edu.ng",
          phone: "+234-804-444-4444",
          address: "University Road, Kano",
          type: "EDUCATIONAL",
          relationshipManagerId: users[3].id,
          locationId: locations[2].id,
          teamId: teams[2].id,
        },
      }),
      prisma.customer.upsert({
        where: { email: "admin@smallbiz.ng" },
        update: {},
        create: {
          name: "Small Business Enterprise",
          email: "admin@smallbiz.ng",
          phone: "+234-805-555-5555",
          address: "Trade Fair Complex, Lagos",
          type: "BUSINESS",
          relationshipManagerId: users[1].id,
          locationId: locations[0].id,
          teamId: teams[0].id,
        },
      }),
    ]);
    console.log("✅ Customers created");

    // 8. Create product group and products
    const productGroup = await prisma.productGroup.upsert({
      where: { name: "Paper Products" },
      update: {},
      create: { name: "Paper Products" },
    });

    const products = await Promise.all([
      prisma.product.upsert({
        where: {
          name_productGroupId: {
            name: "A4 Copy Paper - 80gsm",
            productGroupId: productGroup.id,
          },
        },
        update: {},
        create: {
          name: "A4 Copy Paper - 80gsm",
          productGroupId: productGroup.id,
          monthlyTarget: 1000,
        },
      }),
      prisma.product.upsert({
        where: {
          name_productGroupId: {
            name: "A3 Copy Paper - 80gsm",
            productGroupId: productGroup.id,
          },
        },
        update: {},
        create: {
          name: "A3 Copy Paper - 80gsm",
          productGroupId: productGroup.id,
          monthlyTarget: 500,
        },
      }),
    ]);

    // 9. Create inventory items
    const inventoryItems = await Promise.all([
      prisma.inventoryItem.upsert({
        where: { sku: "A4-COPY-80-001" },
        update: {},
        create: {
          sku: "A4-COPY-80-001",
          name: "A4 Copy Paper - 80gsm (500 sheets)",
          description:
            "Premium quality A4 copy paper 80gsm - 500 sheets per ream",
          unit: "reams",
          unitPrice: 2500,
          currentQuantity: 500,
          minStock: 50,
          location: "Main Warehouse Lagos",
          productId: products[0].id,
        },
      }),
      prisma.inventoryItem.upsert({
        where: { sku: "A3-COPY-80-001" },
        update: {},
        create: {
          sku: "A3-COPY-80-001",
          name: "A3 Copy Paper - 80gsm (500 sheets)",
          description:
            "Premium quality A3 copy paper 80gsm - 500 sheets per ream",
          unit: "reams",
          unitPrice: 4500,
          currentQuantity: 200,
          minStock: 20,
          location: "Main Warehouse Lagos",
          productId: products[1].id,
        },
      }),
    ]);
    console.log("✅ Products and inventory created");

    // 10. Create invoices with various statuses and dates
    const invoices = [];
    const today = new Date();

    // Helper function to create date offsets
    const daysAgo = (days) => {
      const date = new Date(today);
      date.setDate(date.getDate() - days);
      return date;
    };

    const daysFromNow = (days) => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date;
    };

    // Create recent invoices with different statuses
    const invoiceData = [
      // Recent paid invoices
      // All invoices are created as OPEN (active), no process or workflow
      {
        invoiceNumber: "INV-2024-001",
        date: daysAgo(5),
        customerId: customers[0].id,
        customerName: customers[0].name,
        customerContact: customers[0].email,
        billedByUserId: users[1].id,
        teamId: teams[0].id,
        regionId: regions[0].id,
        totalAmount: 125000.0,
        balance: 0.0,
        status: "OPEN",
        dueDate: daysAgo(1),
      },
      {
        invoiceNumber: "INV-2024-002",
        date: daysAgo(8),
        customerId: customers[1].id,
        customerName: customers[1].name,
        customerContact: customers[1].email,
        billedByUserId: users[1].id,
        teamId: teams[0].id,
        regionId: regions[0].id,
        totalAmount: 85000.0,
        balance: 0.0,
        status: "OPEN",
        dueDate: daysAgo(4),
      },
      {
        invoiceNumber: "INV-2024-003",
        date: daysAgo(3),
        customerId: customers[2].id,
        customerName: customers[2].name,
        customerContact: customers[2].email,
        billedByUserId: users[2].id,
        teamId: teams[1].id,
        regionId: regions[1].id,
        totalAmount: 250000.0,
        balance: 250000.0,
        status: "OPEN",
        dueDate: daysFromNow(27),
      },
      {
        invoiceNumber: "INV-2024-004",
        date: daysAgo(1),
        customerId: customers[3].id,
        customerName: customers[3].name,
        customerContact: customers[3].email,
        billedByUserId: users[3].id,
        teamId: teams[2].id,
        regionId: regions[2].id,
        totalAmount: 180000.0,
        balance: 180000.0,
        status: "OPEN",
        dueDate: daysFromNow(29),
      },
      {
        invoiceNumber: "INV-2024-005",
        date: daysAgo(45),
        customerId: customers[0].id,
        customerName: customers[0].name,
        customerContact: customers[0].email,
        billedByUserId: users[1].id,
        teamId: teams[0].id,
        regionId: regions[0].id,
        totalAmount: 95000.0,
        balance: 95000.0,
        status: "OPEN",
        dueDate: daysAgo(15),
      },
      {
        invoiceNumber: "INV-2024-006",
        date: daysAgo(60),
        customerId: customers[4].id,
        customerName: customers[4].name,
        customerContact: customers[4].email,
        billedByUserId: users[1].id,
        teamId: teams[0].id,
        regionId: regions[0].id,
        totalAmount: 45000.0,
        balance: 45000.0,
        status: "OPEN",
        dueDate: daysAgo(30),
      },
      {
        invoiceNumber: "INV-2024-007",
        date: daysAgo(20),
        customerId: customers[2].id,
        customerName: customers[2].name,
        customerContact: customers[2].email,
        billedByUserId: users[2].id,
        teamId: teams[1].id,
        regionId: regions[1].id,
        totalAmount: 150000.0,
        balance: 75000.0,
        status: "OPEN",
        dueDate: daysFromNow(10),
      },
      {
        invoiceNumber: "INV-2024-008",
        date: today,
        customerId: customers[1].id,
        customerName: customers[1].name,
        customerContact: customers[1].email,
        billedByUserId: users[1].id,
        teamId: teams[0].id,
        regionId: regions[0].id,
        totalAmount: 320000.0,
        balance: 320000.0,
        status: "OPEN",
        dueDate: daysFromNow(30),
      },
    ];

    for (const invoiceInfo of invoiceData) {
      const invoice = await prisma.invoice.create({
        data: invoiceInfo,
      });

      // Create invoice items for each invoice
      await prisma.invoiceItem.createMany({
        data: [
          {
            invoiceId: invoice.id,
            inventoryItemId: inventoryItems[0].id,
            quantity: Math.floor(Math.random() * 50) + 10,
            unitPrice: inventoryItems[0].unitPrice,
            lineTotal:
              (Math.floor(Math.random() * 50) + 10) *
              inventoryItems[0].unitPrice,
          },
          {
            invoiceId: invoice.id,
            inventoryItemId: inventoryItems[1].id,
            quantity: Math.floor(Math.random() * 20) + 5,
            unitPrice: inventoryItems[1].unitPrice,
            lineTotal:
              (Math.floor(Math.random() * 20) + 5) *
              inventoryItems[1].unitPrice,
          },
        ],
      });

      invoices.push(invoice);
    }

    console.log("✅ Invoices created with various statuses");

    // 11. Create some payments for paid/partial invoices
    const payments = [];

    // Payment for first invoice (fully paid)
    const payment1 = await prisma.payment.create({
      data: {
        amount: 125000.0,
        paymentDate: daysAgo(1),
        paymentMethod: "BANK_TRANSFER",
        reference: "TXN-001-2024",
        customerId: customers[0].id,
        receivedByUserId: users[1].id,
        notes: "Full payment received via bank transfer",
      },
    });

    // Payment for second invoice (fully paid)
    const payment2 = await prisma.payment.create({
      data: {
        amount: 85000.0,
        paymentDate: daysAgo(4),
        paymentMethod: "CHEQUE",
        reference: "CHQ-456789",
        customerId: customers[1].id,
        receivedByUserId: users[1].id,
        notes: "Payment by company cheque",
      },
    });

    // Partial payment for invoice 7
    const payment3 = await prisma.payment.create({
      data: {
        amount: 75000.0,
        paymentDate: daysAgo(10),
        paymentMethod: "CASH",
        reference: "CASH-789",
        customerId: customers[2].id,
        receivedByUserId: users[2].id,
        notes: "Partial payment - cash",
      },
    });

    // Create payment applications (link payments to invoices)
    await prisma.paymentApplication.createMany({
      data: [
        {
          paymentId: payment1.id,
          invoiceId: invoices[0].id,
          appliedAmount: 125000.0,
        },
        {
          paymentId: payment2.id,
          invoiceId: invoices[1].id,
          appliedAmount: 85000.0,
        },
        {
          paymentId: payment3.id,
          invoiceId: invoices[6].id,
          appliedAmount: 75000.0,
        },
      ],
    });

    console.log("✅ Payments and payment applications created");

    // Summary
    const invoiceCount = await prisma.invoice.count();
    const customerCount = await prisma.customer.count();
    const userCount = await prisma.user.count();
    const teamCount = await prisma.team.count();

    console.log("\n🎉 Test data seeding completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - ${userCount} users created`);
    console.log(`   - ${teamCount} teams created`);
    console.log(`   - ${customerCount} customers created`);
    console.log(`   - ${invoiceCount} invoices created`);
    console.log(`   - Various invoice statuses: PAID, OPEN, PARTIAL, OVERDUE`);
    console.log(`   - Sample payments and payment applications`);
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email: admin@clynepaper.com`);
    console.log(`   Password: password123`);
  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData().catch(console.error);
