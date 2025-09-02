import { PrismaClient } from "@prisma/client";
import { getTeamForLocation } from "./locationTeamMapping";

const prisma = new PrismaClient();

interface ExcelCustomerRow {
  "CUSTOMER NAME": string;
  "RELATIONSHIP MANAGER": string;
  LOCATION: string;
  ADDRESS: string;
  "DATE OF ONBOARDING": string; // Will be parsed to Date
  "LAST ORDER DATE": string; // Will be parsed to Date
}

/**
 * Safely removes all dummy/test data from the database
 * Use this before importing real data
 */
export async function clearDummyData() {
  console.log("🧹 Starting to clear dummy data...");

  try {
    // Delete in order to respect foreign key constraints
    await prisma.auditLog.deleteMany({});
    console.log("✅ Cleared audit logs");

    await prisma.invoiceItem.deleteMany({});
    console.log("✅ Cleared invoice items");

    await prisma.payment.deleteMany({});
    console.log("✅ Cleared payments");

    await prisma.invoice.deleteMany({});
    console.log("✅ Cleared invoices");

    await prisma.customer.deleteMany({});
    console.log("✅ Cleared customers");

    await prisma.waybillItem.deleteMany({});
    console.log("✅ Cleared waybill items");

    await prisma.waybill.deleteMany({});
    console.log("✅ Cleared waybills");

    await prisma.inventoryItem.deleteMany({});
    console.log("✅ Cleared inventory items");

    await prisma.quickBooksExport.deleteMany({});
    console.log("✅ Cleared QuickBooks exports");

    await prisma.reportsCache.deleteMany({});
    console.log("✅ Cleared reports cache");

    // Keep users, teams, regions, roles, and tax rates as they are structural data

    console.log("🎉 Successfully cleared all dummy data!");
    return { success: true, message: "All dummy data cleared successfully" };
  } catch (error) {
    console.error("❌ Error clearing dummy data:", error);
    throw new Error(
      `Failed to clear dummy data: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Parses date strings from Excel format to JavaScript Date
 */
function parseExcelDate(dateString: string): Date | null {
  if (!dateString || dateString.trim() === "") return null;

  // Handle common Excel date formats
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    // Try parsing MM/DD/YYYY format
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const [month, day, year] = parts;
      const parsedDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return null;
  }
  return date;
}

/**
 * Validates customer data before import
 */
function validateCustomerData(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || data.name.trim() === "") {
    errors.push("Customer name is required");
  }

  if (data.name && data.name.length > 255) {
    errors.push("Customer name must be less than 255 characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Imports customers from Excel data
 * This function handles the import safely with validation and error handling
 */
export async function importCustomers(excelData: ExcelCustomerRow[]): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string; data: any }>;
}> {
  console.log(`📊 Starting import of ${excelData.length} customers...`);

  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string; data: any }> = [];

  for (let i = 0; i < excelData.length; i++) {
    const row = excelData[i];
    const rowNumber = i + 1;

    try {
      // Transform Excel row to our format
      const customerData = {
        name: row["CUSTOMER NAME"]?.trim(),
        location: row["LOCATION"]?.trim() || undefined,
        address: row["ADDRESS"]?.trim() || undefined,
        relationshipManagerName:
          row["RELATIONSHIP MANAGER"]?.trim() || undefined,
        onboardingDate: parseExcelDate(row["DATE OF ONBOARDING"]) || undefined,
        lastOrderDate: parseExcelDate(row["LAST ORDER DATE"]) || undefined,
      };

      // Validate data
      const validation = validateCustomerData(customerData);
      if (!validation.isValid) {
        errors.push({
          row: rowNumber,
          error: validation.errors.join(", "),
          data: row,
        });
        skipped++;
        continue;
      }

      // Check if customer already exists (by name)
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          name: {
            equals: customerData.name,
            mode: "insensitive",
          },
        },
      });

      if (existingCustomer) {
        console.log(
          `⚠️  Customer "${customerData.name}" already exists, skipping...`
        );
        skipped++;
        continue;
      }

      // Get team for location if location is provided
      let teamId: string | null = null;
      if (customerData.location) {
        teamId = await getTeamForLocation(customerData.location);
        if (teamId) {
          console.log(
            `🏢 Assigned team for location "${customerData.location}"`
          );
        } else {
          console.log(
            `⚠️  No team found for location "${customerData.location}"`
          );
        }
      }

      // Create customer with team assignment
      await (prisma.customer as any).create({
        data: {
          ...customerData,
          teamId, // Add team assignment
        },
      });

      imported++;
      console.log(`✅ Imported customer: ${customerData.name}`);
    } catch (error) {
      errors.push({
        row: rowNumber,
        error: error instanceof Error ? error.message : "Unknown error",
        data: row,
      });
      skipped++;
    }
  }

  console.log(
    `🎉 Import completed! Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors.length}`
  );

  return {
    success: errors.length < excelData.length,
    imported,
    skipped,
    errors,
  };
}

/**
 * Links customers to relationship managers by matching names
 * Run this after importing both users and customers
 */
export async function linkRelationshipManagers(): Promise<{
  success: boolean;
  linked: number;
  unmatched: Array<{ customerName: string; managerName: string }>;
}> {
  console.log("🔗 Linking customers to relationship managers...");

  // Get customers with relationship manager names but no ID assigned
  const customers = await (prisma.customer as any).findMany({
    where: {
      relationshipManagerName: {
        not: null,
      },
      relationshipManagerId: null,
    },
  });

  let linked = 0;
  const unmatched: Array<{ customerName: string; managerName: string }> = [];

  for (const customer of customers) {
    const managerName = customer.relationshipManagerName;
    if (!managerName) continue;

    // Try to find user by full name (case insensitive)
    const user = await prisma.user.findFirst({
      where: {
        fullName: {
          equals: managerName,
          mode: "insensitive",
        },
        isActive: true,
      },
    });

    if (user) {
      await (prisma.customer as any).update({
        where: { id: customer.id },
        data: {
          relationshipManagerId: user.id,
        },
      });
      linked++;
      console.log(`✅ Linked ${customer.name} to ${user.fullName}`);
    } else {
      unmatched.push({
        customerName: customer.name,
        managerName: managerName,
      });
      console.log(`⚠️  No user found for relationship manager: ${managerName}`);
    }
  }

  console.log(
    `🎉 Linking completed! Linked: ${linked}, Unmatched: ${unmatched.length}`
  );

  return {
    success: true,
    linked,
    unmatched,
  };
}

/**
 * Updates last order dates based on actual invoice data
 * Run this after importing invoices to get accurate last order dates
 */
export async function updateLastOrderDates(): Promise<{
  success: boolean;
  updated: number;
}> {
  console.log("📅 Updating last order dates from invoice data...");

  const customersWithInvoices = await (prisma.customer as any).findMany({
    include: {
      invoices: {
        orderBy: {
          date: "desc",
        },
        take: 1,
      },
    },
  });

  let updated = 0;

  for (const customer of customersWithInvoices) {
    if (customer.invoices.length > 0) {
      const lastInvoiceDate = customer.invoices[0].date;

      // Only update if the date is different
      if (
        !customer.lastOrderDate ||
        customer.lastOrderDate.getTime() !== lastInvoiceDate.getTime()
      ) {
        await (prisma.customer as any).update({
          where: { id: customer.id },
          data: { lastOrderDate: lastInvoiceDate },
        });
        updated++;
      }
    }
  }

  console.log(`✅ Updated ${updated} customer last order dates`);

  return {
    success: true,
    updated,
  };
}

/**
 * Sample data for testing the import process
 */
export const sampleExcelData: ExcelCustomerRow[] = [
  {
    "CUSTOMER NAME": "ABC Corporation",
    "RELATIONSHIP MANAGER": "John Smith",
    LOCATION: "Lagos",
    ADDRESS: "123 Victoria Island, Lagos State",
    "DATE OF ONBOARDING": "01/15/2024",
    "LAST ORDER DATE": "08/20/2025",
  },
  {
    "CUSTOMER NAME": "XYZ Industries",
    "RELATIONSHIP MANAGER": "Jane Doe",
    LOCATION: "Abuja",
    ADDRESS: "456 Central Business District, Abuja",
    "DATE OF ONBOARDING": "03/10/2024",
    "LAST ORDER DATE": "08/25/2025",
  },
];

/**
 * Comprehensive import function that handles the entire process
 */
export async function fullDataImport(
  excelData: ExcelCustomerRow[],
  clearData: boolean = false
) {
  console.log("🚀 Starting full data import process...");

  try {
    if (clearData) {
      await clearDummyData();
    }

    const importResult = await importCustomers(excelData);

    console.log("📋 Import Summary:");
    console.log(`  ✅ Imported: ${importResult.imported}`);
    console.log(`  ⚠️  Skipped: ${importResult.skipped}`);
    console.log(`  ❌ Errors: ${importResult.errors.length}`);

    if (importResult.errors.length > 0) {
      console.log("\n🔍 Errors encountered:");
      importResult.errors.forEach((error) => {
        console.log(`  Row ${error.row}: ${error.error}`);
      });
    }

    return importResult;
  } catch (error) {
    console.error("❌ Full import failed:", error);
    throw error;
  }
}

// Re-export location mapping functions for convenience
export {
  createDefaultTeamsForLocations,
  getTeamForLocation,
  assignCustomersToTeams,
  addLocationMapping,
  getLocationMappings,
} from "./locationTeamMapping";
