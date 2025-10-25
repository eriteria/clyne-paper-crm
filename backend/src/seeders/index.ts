import { PrismaClient, type Region } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedCustomers } from "./customers";
import { seedInvoices } from "./invoices";
import { DEFAULT_ROLES, stringifyPermissions } from "../utils/permissions";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create Roles using proper permission format
  // Super Admin
  const superAdminRole = await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.SUPER_ADMIN.name },
    update: {
      permissions: stringifyPermissions(DEFAULT_ROLES.SUPER_ADMIN.permissions),
    },
    create: {
      name: DEFAULT_ROLES.SUPER_ADMIN.name,
      permissions: stringifyPermissions(DEFAULT_ROLES.SUPER_ADMIN.permissions),
    },
  });

  // Admin (explicit role separate from Super Admin)
  const adminRole = await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.ADMIN.name },
    update: {
      permissions: stringifyPermissions(DEFAULT_ROLES.ADMIN.permissions),
    },
    create: {
      name: DEFAULT_ROLES.ADMIN.name,
      permissions: stringifyPermissions(DEFAULT_ROLES.ADMIN.permissions),
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.SALES_MANAGER.name },
    update: {
      permissions: stringifyPermissions(
        DEFAULT_ROLES.SALES_MANAGER.permissions
      ),
    },
    create: {
      name: DEFAULT_ROLES.SALES_MANAGER.name,
      permissions: stringifyPermissions(
        DEFAULT_ROLES.SALES_MANAGER.permissions
      ),
    },
  });

  const teamLeaderRole = await prisma.role.upsert({
    where: { name: "TeamLeader" },
    update: {},
    create: {
      name: "TeamLeader",
      permissions: stringifyPermissions(
        DEFAULT_ROLES.SALES_MANAGER.permissions
      ), // Use sales manager permissions for now
    },
  });

  const salesRole = await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.SALES_REP.name },
    update: {
      permissions: stringifyPermissions(DEFAULT_ROLES.SALES_REP.permissions),
    },
    create: {
      name: DEFAULT_ROLES.SALES_REP.name,
      permissions: stringifyPermissions(DEFAULT_ROLES.SALES_REP.permissions),
    },
  });

  const warehouseRole = await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.INVENTORY_MANAGER.name },
    update: {
      permissions: stringifyPermissions(
        DEFAULT_ROLES.INVENTORY_MANAGER.permissions
      ),
    },
    create: {
      name: DEFAULT_ROLES.INVENTORY_MANAGER.name,
      permissions: stringifyPermissions(
        DEFAULT_ROLES.INVENTORY_MANAGER.permissions
      ),
    },
  });

  const viewerRole = await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.VIEWER.name },
    update: {
      permissions: stringifyPermissions(DEFAULT_ROLES.VIEWER.permissions),
    },
    create: {
      name: DEFAULT_ROLES.VIEWER.name,
      permissions: stringifyPermissions(DEFAULT_ROLES.VIEWER.permissions),
    },
  });

  const accountantRole = await prisma.role.upsert({
    where: { name: DEFAULT_ROLES.ACCOUNTANT.name },
    update: {
      permissions: stringifyPermissions(DEFAULT_ROLES.ACCOUNTANT.permissions),
    },
    create: {
      name: DEFAULT_ROLES.ACCOUNTANT.name,
      permissions: stringifyPermissions(DEFAULT_ROLES.ACCOUNTANT.permissions),
    },
  });

  // Employee role - basic viewer access
  const employeeRole = await prisma.role.upsert({
    where: { name: "Employee" },
    update: {
      permissions: stringifyPermissions(DEFAULT_ROLES.VIEWER.permissions),
    },
    create: {
      name: "Employee",
      permissions: stringifyPermissions(DEFAULT_ROLES.VIEWER.permissions),
    },
  });

  // Example: Adding a Supervisor role
  // Uncomment below to add when needed
  /*
  const supervisorRole = await prisma.role.upsert({
    where: { name: "Supervisor" },
    update: {},
    create: {
      name: "Supervisor",
      permissions: JSON.stringify({
        users: ["read"],
        teams: ["read", "update"],
        inventory: ["read", "update"],
        invoices: ["read", "update"],
        reports: ["read"],
        waybills: ["read", "update"],
      }),
    },
  });
  */

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

  const createdRegions: Region[] = [];
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
    },
  });

  const team2 = await prisma.team.upsert({
    where: { name: "Lagos Metro Team" },
    update: {},
    create: {
      name: "Lagos Metro Team",
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
      // Keep Super Admin for the default bootstrap user
      roleId: superAdminRole.id,
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

  // Create Locations for inventory placement
  const locationNames = [
    "Warehouse A - Section 1",
    "Warehouse A - Section 2",
    "Warehouse B - Section 1",
    "Warehouse B - Section 2",
    "Warehouse C - Section 1",
  ];

  const locationMap: Record<string, string> = {};
  for (const name of locationNames) {
    const loc = await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    locationMap[name] = loc.id;
  }

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
      locationId: locationMap["Warehouse A - Section 1"],
    },
    {
      sku: "TP-002",
      name: "Economy Toilet Paper - 1 Ply",
      description: "Budget-friendly 1-ply toilet paper roll",
      unit: "rolls",
      unitPrice: 200.0,
      currentQuantity: 2000,
      minStock: 300,
      locationId: locationMap["Warehouse A - Section 2"],
    },
    {
      sku: "NT-001",
      name: "Premium Napkin Tissue",
      description: "Soft premium napkin tissue packs",
      unit: "packs",
      unitPrice: 150.0,
      currentQuantity: 800,
      minStock: 100,
      locationId: locationMap["Warehouse B - Section 1"],
    },
    {
      sku: "KT-001",
      name: "Kitchen Towel Rolls",
      description: "Absorbent kitchen towel rolls",
      unit: "rolls",
      unitPrice: 450.0,
      currentQuantity: 500,
      minStock: 50,
      locationId: locationMap["Warehouse B - Section 2"],
    },
    {
      sku: "FT-001",
      name: "Facial Tissue Box",
      description: "Premium facial tissue boxes",
      unit: "boxes",
      unitPrice: 300.0,
      currentQuantity: 300,
      minStock: 50,
      locationId: locationMap["Warehouse C - Section 1"],
    },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { sku_locationId: { sku: item.sku, locationId: item.locationId } },
      update: {
        name: item.name,
        description: item.description,
        unit: item.unit,
        unitPrice: item.unitPrice,
        currentQuantity: item.currentQuantity,
        minStock: item.minStock,
      },
      create: item,
    });
  }

  console.log("✅ Database seeding completed successfully!");
  // Seed customers
  await seedCustomers();

  // Seed invoices after customers and inventory are ensured
  await seedInvoices();

  console.log("\n📋 Created:");
  console.log(
    "- 8 Roles (Admin, Manager, TeamLeader, Sales, Warehouse, Viewer, Accountant, Employee)"
  );
  console.log("- 10 Regions (Nigerian states)");
  console.log("- 2 Teams");
  console.log(
    "- 4 Users (admin@clynepaper.com, leader1@clynepaper.com, sales1@clynepaper.com, warehouse@clynepaper.com)"
  );
  console.log("- 5 Inventory Items");
  console.log("- 8 Customers");
  console.log(
    "- Invoices (1-3 per customer, items 1-4 each, terms 15-60 days within last 6 months)"
  );
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
