import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedCustomers } from "./customers";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create Roles
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
        waybills: ["create", "read", "update", "delete"],
        invoices: ["create", "read", "update", "delete"],
        reports: ["read"],
        admin: ["full-access"],
      }),
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "Manager" },
    update: {},
    create: {
      name: "Manager",
      permissions: JSON.stringify({
        users: ["read", "update"],
        teams: ["read"],
        regions: ["read"],
        inventory: ["read"],
        waybills: ["read"],
        invoices: ["read"],
        reports: ["read"],
      }),
    },
  });

  const teamLeaderRole = await prisma.role.upsert({
    where: { name: "TeamLeader" },
    update: {},
    create: {
      name: "TeamLeader",
      permissions: JSON.stringify({
        users: ["read"],
        teams: ["read"],
        regions: ["read"],
        inventory: ["read"],
        waybills: ["read"],
        invoices: ["create", "read", "update"],
        reports: ["read"],
      }),
    },
  });

  const salesRole = await prisma.role.upsert({
    where: { name: "Sales" },
    update: {},
    create: {
      name: "Sales",
      permissions: JSON.stringify({
        inventory: ["read"],
        invoices: ["create", "read", "update"],
        reports: ["read"],
      }),
    },
  });

  const warehouseRole = await prisma.role.upsert({
    where: { name: "Warehouse" },
    update: {},
    create: {
      name: "Warehouse",
      permissions: JSON.stringify({
        inventory: ["create", "read", "update"],
        waybills: ["create", "read", "update"],
        invoices: ["read"],
        reports: ["read"],
      }),
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { name: "Viewer" },
    update: {},
    create: {
      name: "Viewer",
      permissions: JSON.stringify({
        inventory: ["read"],
        waybills: ["read"],
        invoices: ["read"],
        reports: ["read"],
      }),
    },
  });

  // Create Regions (Nigerian states)
  const regions = [
    { name: "Abuja - FCT" },
    { name: "Lagos" },
    { name: "Kano" },
    { name: "Rivers" },
    { name: "Oyo" },
    { name: "Kaduna" },
    { name: "Ogun" },
    { name: "Imo" },
    { name: "Borno" },
    { name: "Niger" },
  ];

  const createdRegions = [];
  for (const region of regions) {
    const createdRegion = await prisma.region.upsert({
      where: { name: region.name },
      update: {},
      create: region,
    });
    createdRegions.push(createdRegion);
  }

  // Create Teams
  const abujaRegion = createdRegions.find((r) => r.name === "Abuja - FCT");
  const lagosRegion = createdRegions.find((r) => r.name === "Lagos");

  const team1 = await prisma.team.upsert({
    where: { name: "Abuja Central Team" },
    update: {},
    create: {
      name: "Abuja Central Team",
      regionId: abujaRegion!.id,
    },
  });

  const team2 = await prisma.team.upsert({
    where: { name: "Lagos Metro Team" },
    update: {},
    create: {
      name: "Lagos Metro Team",
      regionId: lagosRegion!.id,
    },
  });

  // Create Users
  const hashedPassword = await bcrypt.hash("password123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@clynepaper.com" },
    update: {},
    create: {
      fullName: "System Administrator",
      email: "admin@clynepaper.com",
      phone: "+234-800-000-0001",
      passwordHash: hashedPassword,
      roleId: adminRole.id,
      regionId: abujaRegion!.id,
      isActive: true,
    },
  });

  const teamLeader1 = await prisma.user.upsert({
    where: { email: "leader1@clynepaper.com" },
    update: {},
    create: {
      fullName: "John Adebayo",
      email: "leader1@clynepaper.com",
      phone: "+234-800-000-0002",
      passwordHash: hashedPassword,
      roleId: teamLeaderRole.id,
      teamId: team1.id,
      regionId: abujaRegion!.id,
      isActive: true,
    },
  });

  const salesPerson1 = await prisma.user.upsert({
    where: { email: "sales1@clynepaper.com" },
    update: {},
    create: {
      fullName: "Mary Okafor",
      email: "sales1@clynepaper.com",
      phone: "+234-800-000-0003",
      passwordHash: hashedPassword,
      roleId: salesRole.id,
      teamId: team1.id,
      regionId: abujaRegion!.id,
      isActive: true,
    },
  });

  const warehouseUser = await prisma.user.upsert({
    where: { email: "warehouse@clynepaper.com" },
    update: {},
    create: {
      fullName: "David Okoro",
      email: "warehouse@clynepaper.com",
      phone: "+234-800-000-0004",
      passwordHash: hashedPassword,
      roleId: warehouseRole.id,
      regionId: abujaRegion!.id,
      isActive: true,
    },
  });

  // Update team leaders
  await prisma.team.update({
    where: { id: team1.id },
    data: { leaderUserId: teamLeader1.id },
  });

  // Create Sample Inventory Items
  const inventoryItems = [
    {
      sku: "TP-001",
      name: "Premium Toilet Paper - 2 Ply",
      description: "High quality 2-ply toilet paper roll",
      unit: "rolls",
      unitPrice: 350.0,
      currentQuantity: 1500,
      minStock: 200,
      location: "Warehouse A - Section 1",
    },
    {
      sku: "TP-002",
      name: "Economy Toilet Paper - 1 Ply",
      description: "Budget-friendly 1-ply toilet paper roll",
      unit: "rolls",
      unitPrice: 200.0,
      currentQuantity: 2000,
      minStock: 300,
      location: "Warehouse A - Section 2",
    },
    {
      sku: "NT-001",
      name: "Premium Napkin Tissue",
      description: "Soft premium napkin tissue packs",
      unit: "packs",
      unitPrice: 150.0,
      currentQuantity: 800,
      minStock: 100,
      location: "Warehouse B - Section 1",
    },
    {
      sku: "KT-001",
      name: "Kitchen Towel Rolls",
      description: "Absorbent kitchen towel rolls",
      unit: "rolls",
      unitPrice: 450.0,
      currentQuantity: 500,
      minStock: 50,
      location: "Warehouse B - Section 2",
    },
    {
      sku: "FT-001",
      name: "Facial Tissue Box",
      description: "Premium facial tissue boxes",
      unit: "boxes",
      unitPrice: 300.0,
      currentQuantity: 300,
      minStock: 50,
      location: "Warehouse C - Section 1",
    },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {},
      create: item,
    });
  }

  console.log("✅ Database seeding completed successfully!");
  // Seed customers
  await seedCustomers();

  console.log("\n📋 Created:");
  console.log(
    "- 6 Roles (Admin, Manager, TeamLeader, Sales, Warehouse, Viewer)"
  );
  console.log("- 10 Regions (Nigerian states)");
  console.log("- 2 Teams");
  console.log(
    "- 4 Users (admin@clynepaper.com, leader1@clynepaper.com, sales1@clynepaper.com, warehouse@clynepaper.com)"
  );
  console.log("- 5 Inventory Items");
  console.log("- 8 Customers");
  console.log("\n🔑 Default password for all users: password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
