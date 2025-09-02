import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const customers = [
  {
    name: "Acme Corporation",
    email: "contact@acme.com",
    phone: "+1-555-0123",
    address: "123 Business Ave, Suite 100, New York, NY 10001",
    companyName: "Acme Corporation",
    contactPerson: "John Smith",
  },
  {
    name: "Tech Solutions Ltd",
    email: "info@techsolutions.com",
    phone: "+1-555-0456",
    address: "456 Innovation Drive, San Francisco, CA 94105",
    companyName: "Tech Solutions Ltd",
    contactPerson: "Sarah Johnson",
  },
  {
    name: "Global Industries",
    email: "sales@globalindustries.com",
    phone: "+1-555-0789",
    address: "789 Corporate Blvd, Chicago, IL 60601",
    companyName: "Global Industries",
    contactPerson: "Michael Brown",
  },
  {
    name: "Prime Retail Group",
    email: "orders@primeretail.com",
    phone: "+1-555-0321",
    address: "321 Commerce Street, Los Angeles, CA 90210",
    companyName: "Prime Retail Group",
    contactPerson: "Emily Davis",
  },
  {
    name: "Atlantic Manufacturing",
    email: "procurement@atlantic.com",
    phone: "+1-555-0654",
    address: "654 Industrial Park, Atlanta, GA 30309",
    companyName: "Atlantic Manufacturing",
    contactPerson: "Robert Wilson",
  },
  {
    name: "Metro Distributors",
    email: "purchasing@metro.com",
    phone: "+1-555-0987",
    address: "987 Distribution Center, Houston, TX 77002",
    companyName: "Metro Distributors",
    contactPerson: "Lisa Anderson",
  },
  {
    name: "Coastal Enterprises",
    email: "buyers@coastal.com",
    phone: "+1-555-0147",
    address: "147 Waterfront Plaza, Miami, FL 33101",
    companyName: "Coastal Enterprises",
    contactPerson: "David Martinez",
  },
  {
    name: "Mountain View Holdings",
    email: "contact@mountainview.com",
    phone: "+1-555-0258",
    address: "258 Summit Ridge, Denver, CO 80202",
    companyName: "Mountain View Holdings",
    contactPerson: "Jennifer Taylor",
  },
];

export async function seedCustomers() {
  console.log("🌱 Seeding customers...");

  try {
    // Check if customers already exist
    const existingCustomersCount = await prisma.customer.count();

    if (existingCustomersCount > 0) {
      console.log("✅ Customers already exist, skipping seed");
      return;
    }

    // Create customers
    for (const customerData of customers) {
      await prisma.customer.create({
        data: customerData,
      });
    }

    console.log(`✅ Successfully seeded ${customers.length} customers`);
  } catch (error) {
    console.error("❌ Error seeding customers:", error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedCustomers()
    .then(() => {
      console.log("🎉 Customer seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Customer seeding failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
