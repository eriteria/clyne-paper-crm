import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const prisma = new PrismaClient();

/**
 * Parse currency value that may contain commas (e.g., "1,500.00" or "₦1,200" or "1200")
 */
function parseCurrencyValue(value: string | number): number {
  if (typeof value === "number") {
    return value;
  }

  if (!value || typeof value !== "string") {
    return 0;
  }

  // Remove currency symbols, commas, and extra spaces
  const cleanValue = value
    .replace(/[₦$£€,\s]/g, "") // Remove currency symbols and commas
    .trim();

  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse date from d-mmm-YY format (e.g., "1-Sep-25")
 */
function parseDateFromDMmmYY(dateStr: string): Date {
  const monthNames = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  // Split by hyphen or dash
  const parts = dateStr.split(/[-–—]/);
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].trim();
  const year = parseInt(parts[2], 10);

  // Convert month name to number
  const month = monthNames[monthStr as keyof typeof monthNames];
  if (month === undefined) {
    throw new Error(`Invalid month: ${monthStr}`);
  }

  // Convert 2-digit year to 4-digit year
  // Assuming 25 = 2025, etc.
  const fullYear = year < 50 ? 2000 + year : 1900 + year;

  // Use UTC to avoid timezone issues
  return new Date(Date.UTC(fullYear, month, day));
}

// Interface for Excel invoice data from former platform
export interface ExcelInvoiceRow {
  "Invoice No": string;
  Date: string;
  Customer: string;
  Product: string;
  Quantity: string | number;
  "Item Unit Price": string | number;
  "Item Total Price": string | number;
  "Invoice Total": string | number;
}

// Interface for JSON invoice data (more flexible for currency formatting)
export interface JsonInvoiceRow {
  invoiceNo: string;
  date: string;
  customer: string;
  product: string;
  quantity: string | number;
  itemUnitPrice: string | number;
  itemTotalPrice: string | number;
  invoiceTotal: string | number;
}

// Interface for JSON invoice data with spaced field names (from table converters)
export interface SpacedJsonInvoiceRow {
  "Invoice No": string;
  Date: string;
  Customer: string;
  Product: string;
  Quantity: string | number;
  "Item Unit Price": string | number;
  "Item Total Price": string | number;
  "Invoice Total": string | number;
}

// Normalized invoice interface for import
export interface ImportInvoiceData {
  invoiceNumber: string;
  date: Date;
  customerName: string;
  items: InvoiceItemData[];
  totalAmount: number;
}

export interface InvoiceItemData {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/**
 * Convert spaced JSON format to standard format
 */
export function convertSpacedJsonToStandard(
  spacedRows: SpacedJsonInvoiceRow[]
): JsonInvoiceRow[] {
  return spacedRows.map((row) => ({
    invoiceNo: row["Invoice No"],
    date: row["Date"],
    customer: row["Customer"],
    product: row["Product"],
    quantity: row["Quantity"],
    itemUnitPrice: row["Item Unit Price"],
    itemTotalPrice: row["Item Total Price"],
    invoiceTotal: row["Invoice Total"],
  }));
}

/**
 * Parse and group JSON invoice rows by invoice number (with better currency handling)
 */
export function parseJsonInvoiceData(
  rows: JsonInvoiceRow[]
): ImportInvoiceData[] {
  const invoiceMap = new Map<string, ImportInvoiceData>();

  for (const row of rows) {
    const invoiceNumber = row.invoiceNo?.toString().trim();
    const dateStr = row.date?.toString().trim();
    const customerName = row.customer?.toString().trim();
    const productName = row.product?.toString().trim();

    // Parse numeric values with currency support
    const quantity = parseCurrencyValue(row.quantity);
    const unitPrice = parseCurrencyValue(row.itemUnitPrice);
    const lineTotal = parseCurrencyValue(row.itemTotalPrice);
    const invoiceTotal = parseCurrencyValue(row.invoiceTotal);

    // Validate numeric fields
    if (
      isNaN(quantity) ||
      isNaN(unitPrice) ||
      isNaN(lineTotal) ||
      isNaN(invoiceTotal)
    ) {
      logger.warn(
        `Skipping JSON row with invalid numeric data: Invoice ${invoiceNumber}, Quantity: ${row.quantity}, Unit Price: ${row.itemUnitPrice}, Line Total: ${row.itemTotalPrice}, Invoice Total: ${row.invoiceTotal}`
      );
      continue;
    }

    if (!invoiceNumber || !customerName || !productName) {
      continue; // Skip invalid rows
    }

    // Parse date - handle d-mmm-YY format (e.g., "1-Sep-25")
    let parsedDate: Date;
    try {
      parsedDate = parseDateFromDMmmYY(dateStr);
      if (isNaN(parsedDate.getTime())) {
        // Fallback to standard parsing
        parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }
      }
    } catch {
      parsedDate = new Date();
    }

    // Create or update invoice
    if (!invoiceMap.has(invoiceNumber)) {
      invoiceMap.set(invoiceNumber, {
        invoiceNumber,
        date: parsedDate,
        customerName,
        items: [],
        totalAmount: invoiceTotal,
      });
    }

    const invoice = invoiceMap.get(invoiceNumber)!;

    // Add item to invoice
    invoice.items.push({
      productName,
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  return Array.from(invoiceMap.values());
}

/**
 * Parse and group invoice rows by invoice number
 */
export function parseInvoiceData(rows: ExcelInvoiceRow[]): ImportInvoiceData[] {
  const invoiceMap = new Map<string, ImportInvoiceData>();

  for (const row of rows) {
    const invoiceNumber = row["Invoice No"]?.toString().trim();
    const dateStr = row["Date"]?.toString().trim();
    const customerName = row["Customer"]?.toString().trim();
    const productName = row["Product"]?.toString().trim();

    // Parse numeric values with currency support
    const quantity = parseCurrencyValue(row["Quantity"]);
    const unitPrice = parseCurrencyValue(row["Item Unit Price"]);
    const lineTotal = parseCurrencyValue(row["Item Total Price"]);
    const invoiceTotal = parseCurrencyValue(row["Invoice Total"]);

    // Validate numeric fields
    if (
      isNaN(quantity) ||
      isNaN(unitPrice) ||
      isNaN(lineTotal) ||
      isNaN(invoiceTotal)
    ) {
      logger.warn(
        `Skipping row with invalid numeric data: Invoice ${invoiceNumber}, Quantity: ${row["Quantity"]}, Unit Price: ${row["Item Unit Price"]}, Line Total: ${row["Item Total Price"]}, Invoice Total: ${row["Invoice Total"]}`
      );
      continue;
    }

    if (!invoiceNumber || !customerName || !productName) {
      continue; // Skip invalid rows
    }

    // Parse date - handle d-mmm-YY format (e.g., "1-Sep-25")
    let parsedDate: Date;
    try {
      parsedDate = parseDateFromDMmmYY(dateStr);
      if (isNaN(parsedDate.getTime())) {
        // Fallback to standard parsing
        parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) {
          parsedDate = new Date();
        }
      }
    } catch {
      parsedDate = new Date();
    }

    // Create or update invoice
    if (!invoiceMap.has(invoiceNumber)) {
      invoiceMap.set(invoiceNumber, {
        invoiceNumber,
        date: parsedDate,
        customerName,
        items: [],
        totalAmount: invoiceTotal,
      });
    }

    const invoice = invoiceMap.get(invoiceNumber)!;

    // Add item to invoice
    invoice.items.push({
      productName,
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  return Array.from(invoiceMap.values());
}

/**
 * Find or create customer by name
 */
async function findOrCreateCustomer(customerName: string) {
  try {
    // First try to find existing customer
    let customer = await prisma.customer.findFirst({
      where: {
        name: {
          equals: customerName,
          mode: "insensitive",
        },
      },
      include: {
        relationshipManager: true,
      },
    });

    if (!customer) {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          // We'll leave relationship manager assignment for later
        },
        include: {
          relationshipManager: true,
        },
      });

      logger.info(`Created new customer: ${customerName}`);
    }

    return customer;
  } catch (error) {
    logger.error(`Error finding/creating customer ${customerName}:`, error);
    throw error;
  }
}

/**
 * Find inventory item by product name
 */
async function findInventoryItemByProductName(productName: string) {
  try {
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        OR: [
          {
            name: {
              equals: productName,
              mode: "insensitive",
            },
          },
          {
            product: {
              name: {
                equals: productName,
                mode: "insensitive",
              },
            },
          },
        ],
      },
      include: {
        product: true,
      },
    });

    return inventoryItem;
  } catch (error) {
    logger.error(
      `Error finding inventory item for product ${productName}:`,
      error
    );
    return null;
  }
}

/**
 * Find a default user (system user or admin) for billing
 */
async function getDefaultBillingUser() {
  try {
    // Try to find a system user or admin
    const adminRole = await prisma.role.findFirst({
      where: { name: "Admin" },
    });

    if (adminRole) {
      const adminUser = await prisma.user.findFirst({
        where: { roleId: adminRole.id },
      });

      if (adminUser) {
        return adminUser;
      }
    }

    // Fallback to any active user
    const fallbackUser = await prisma.user.findFirst({
      where: { isActive: true },
    });

    return fallbackUser;
  } catch (error) {
    logger.error("Error finding default billing user:", error);
    throw new Error("No suitable billing user found");
  }
}

/**
 * Import a single invoice
 */
async function importSingleInvoice(
  invoiceData: ImportInvoiceData,
  defaultUser: any
) {
  try {
    // Find or create customer by name
    const customer = await findOrCreateCustomer(invoiceData.customerName);

    // Use customer's relationship manager or default user
    const billingUser = customer.relationshipManager || defaultUser;

    // Check if invoice already exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { invoiceNumber: invoiceData.invoiceNumber },
    });

    if (existingInvoice) {
      logger.warn(
        `Invoice ${invoiceData.invoiceNumber} already exists, skipping`
      );
      return {
        success: false,
        message: `Invoice ${invoiceData.invoiceNumber} already exists`,
      };
    }

    // Process items and find inventory matches
    const processedItems = [];
    const missingProducts = [];

    for (const item of invoiceData.items) {
      const inventoryItem = await findInventoryItemByProductName(
        item.productName
      );

      if (inventoryItem) {
        processedItems.push({
          inventoryItemId: inventoryItem.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        });
      } else {
        missingProducts.push(item.productName);
      }
    }

    if (processedItems.length === 0) {
      return {
        success: false,
        message: `No matching products found for invoice ${invoiceData.invoiceNumber}`,
        missingProducts,
      };
    }

    // Validate data before creating invoice
    if (!customer.id) {
      return {
        success: false,
        message: `Customer ID is missing for invoice ${invoiceData.invoiceNumber}`,
      };
    }

    if (!billingUser.id) {
      return {
        success: false,
        message: `Billing user ID is missing for invoice ${invoiceData.invoiceNumber}`,
      };
    }

    if (isNaN(invoiceData.totalAmount) || invoiceData.totalAmount < 0) {
      return {
        success: false,
        message: `Invalid total amount (${invoiceData.totalAmount}) for invoice ${invoiceData.invoiceNumber}`,
      };
    }

    // Validate all processed items have valid numeric values
    for (const item of processedItems) {
      if (
        isNaN(item.unitPrice) ||
        isNaN(item.lineTotal) ||
        isNaN(item.quantity)
      ) {
        return {
          success: false,
          message: `Invalid numeric values in items for invoice ${invoiceData.invoiceNumber}`,
        };
      }
    }

    logger.info(
      `Creating invoice ${invoiceData.invoiceNumber} for customer ${customer.name} (${customer.id})`
    );

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invoiceData.invoiceNumber,
        date: invoiceData.date,
        customerId: customer.id,
        customerName: customer.name,
        billedByUserId: billingUser.id,
        teamId: customer.teamId || null,
        regionId: null, // Set to null for imported invoices for now
        totalAmount: invoiceData.totalAmount,
        status: "COMPLETED", // Imported invoices are completed
        items: {
          create: processedItems,
        },
      },
      include: {
        items: {
          include: {
            inventoryItem: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      invoice,
      missingProducts: missingProducts.length > 0 ? missingProducts : undefined,
    };
  } catch (error) {
    logger.error(
      `Error importing invoice ${invoiceData.invoiceNumber}:`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Error importing invoice ${invoiceData.invoiceNumber}: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

/**
 * Import multiple invoices from Excel data
 */
export async function importInvoices(rows: ExcelInvoiceRow[]) {
  try {
    logger.info(`Starting import of ${rows.length} invoice rows...`);

    // Parse and group invoice data
    const invoices = parseInvoiceData(rows);
    logger.info(
      `Parsed ${invoices.length} unique invoices from ${rows.length} rows`
    );

    // Get default billing user
    const defaultUser = await getDefaultBillingUser();
    if (!defaultUser) {
      throw new Error("No suitable billing user found for import");
    }

    const results = {
      total: invoices.length,
      successful: 0,
      failed: 0,
      errors: [] as any[],
      warnings: [] as string[],
    };

    // Import each invoice
    for (const invoiceData of invoices) {
      const result = await importSingleInvoice(invoiceData, defaultUser);

      if (result.success) {
        results.successful++;
        if (result.missingProducts && result.missingProducts.length > 0) {
          results.warnings.push(
            `Invoice ${invoiceData.invoiceNumber}: Missing products - ${result.missingProducts.join(", ")}`
          );
        }
      } else {
        results.failed++;
        results.errors.push({
          invoiceNumber: invoiceData.invoiceNumber,
          error: result.message,
          missingProducts: result.missingProducts,
        });
      }
    }

    logger.info(
      `Import completed: ${results.successful} successful, ${results.failed} failed`
    );

    return {
      success: true,
      message: `Import completed: ${results.successful} invoices imported successfully, ${results.failed} failed`,
      results,
    };
  } catch (error) {
    logger.error("Error during invoice import:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `Import failed: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

/**
 * Import invoices from flexible JSON data (auto-detects format)
 */
export async function importFlexibleJsonInvoices(rows: any[]) {
  try {
    logger.info(
      `Starting flexible JSON import of ${rows.length} invoice rows...`
    );

    if (rows.length === 0) {
      throw new Error("No data to import");
    }

    // Check the format of the first row to determine structure
    const firstRow = rows[0];
    let normalizedRows: JsonInvoiceRow[];

    // Check if it's the spaced format
    if (
      "Invoice No" in firstRow &&
      "Date" in firstRow &&
      "Customer" in firstRow &&
      "Product" in firstRow
    ) {
      logger.info("Detected spaced field format, converting...");
      normalizedRows = convertSpacedJsonToStandard(
        rows as SpacedJsonInvoiceRow[]
      );
    } else if (
      "invoiceNo" in firstRow &&
      "date" in firstRow &&
      "customer" in firstRow &&
      "product" in firstRow
    ) {
      logger.info("Detected standard field format");
      normalizedRows = rows as JsonInvoiceRow[];
    } else {
      throw new Error(
        "Unrecognized JSON format. Expected either camelCase fields (invoiceNo, date, customer, product) or spaced fields (Invoice No, Date, Customer, Product)"
      );
    }

    // Use the existing import function with normalized data
    return await importJsonInvoices(normalizedRows);
  } catch (error) {
    logger.error("Flexible JSON import failed:", error);
    throw error;
  }
}

/**
 * Import invoices from JSON data (with better currency handling)
 */
export async function importJsonInvoices(rows: JsonInvoiceRow[]) {
  try {
    logger.info(`Starting JSON import of ${rows.length} invoice rows...`);

    // Parse and group JSON invoice data
    const invoices = parseJsonInvoiceData(rows);
    logger.info(
      `Parsed ${invoices.length} unique invoices from ${rows.length} JSON rows`
    );

    // Get default billing user
    const defaultUser = await getDefaultBillingUser();
    if (!defaultUser) {
      throw new Error("No suitable billing user found for import");
    }

    const results = {
      total: invoices.length,
      successful: 0,
      failed: 0,
      errors: [] as any[],
      warnings: [] as string[],
    };

    // Import each invoice
    for (const invoiceData of invoices) {
      const result = await importSingleInvoice(invoiceData, defaultUser);

      if (result.success) {
        results.successful++;
        if (result.missingProducts && result.missingProducts.length > 0) {
          results.warnings.push(
            `Invoice ${invoiceData.invoiceNumber}: Missing products - ${result.missingProducts.join(", ")}`
          );
        }
      } else {
        results.failed++;
        results.errors.push({
          invoiceNumber: invoiceData.invoiceNumber,
          error: result.message,
          missingProducts: result.missingProducts,
        });
      }
    }

    logger.info(
      `JSON Import completed: ${results.successful} successful, ${results.failed} failed`
    );

    return {
      success: true,
      message: `JSON Import completed: ${results.successful} invoices imported successfully, ${results.failed} failed`,
      results,
    };
  } catch (error) {
    logger.error("Error during JSON invoice import:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `JSON Import failed: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

/**
 * Get invoice import template
 */
export function getInvoiceImportTemplate() {
  return [
    {
      "Invoice No": "INV-001",
      Date: "15-Jan-25",
      Customer: "ABC Company",
      Product: "Product A",
      Quantity: 10,
      "Item Unit Price": 1500,
      "Item Total Price": 15000,
      "Invoice Total": 25000,
    },
    {
      "Invoice No": "INV-001",
      Date: "15-Jan-25",
      Customer: "ABC Company",
      Product: "Product B",
      Quantity: 5,
      "Item Unit Price": 2000,
      "Item Total Price": 10000,
      "Invoice Total": 25000,
    },
    {
      "Invoice No": "INV-002",
      Date: "16-Feb-25",
      Customer: "XYZ Corporation",
      Product: "Product C",
      Quantity: 20,
      "Item Unit Price": 1200,
      "Item Total Price": 24000,
      "Invoice Total": 24000,
    },
  ];
}

/**
 * Get JSON invoice import template (with currency-friendly format)
 */
export function getJsonInvoiceImportTemplate() {
  return [
    {
      invoiceNo: "INV-001",
      date: "15-Jan-25",
      customer: "ABC Company",
      product: "Product A",
      quantity: 10,
      itemUnitPrice: "₦1,500.00",
      itemTotalPrice: "₦15,000.00",
      invoiceTotal: "₦25,000.00",
    },
    {
      invoiceNo: "INV-001",
      date: "15-Jan-25",
      customer: "ABC Company",
      product: "Product B",
      quantity: 5,
      itemUnitPrice: "₦2,000.00",
      itemTotalPrice: "₦10,000.00",
      invoiceTotal: "₦25,000.00",
    },
    {
      invoiceNo: "INV-002",
      date: "16-Feb-25",
      customer: "XYZ Corporation",
      product: "Product C",
      quantity: 20,
      itemUnitPrice: "₦1,200.00",
      itemTotalPrice: "₦24,000.00",
      invoiceTotal: "₦24,000.00",
    },
  ];
}

/**
 * Get import statistics
 */
export async function getImportStatistics() {
  try {
    const totalInvoices = await prisma.invoice.count();
    const totalCustomers = await prisma.customer.count();
    const totalItems = await prisma.invoiceItem.count();

    const recentImports = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        customer: true,
        billedBy: true,
      },
    });

    return {
      totalInvoices,
      totalCustomers,
      totalItems,
      recentImports,
    };
  } catch (error) {
    logger.error("Error getting import statistics:", error);
    throw error;
  }
}

/**
 * Fix duplicate invoice numbers that were created during import
 * This function consolidates invoices with the same number and customer,
 * or assigns unique numbers to invoices with same number but different customers
 */
export async function fixDuplicateInvoiceNumbers() {
  try {
    logger.info("Starting duplicate invoice number cleanup...");

    // Find all invoices with incremented numbers (pattern: XXXX-2, XXXX-3, etc.)
    const allInvoices = await prisma.invoice.findMany({
      include: {
        items: true,
        customer: true,
      },
      orderBy: {
        invoiceNumber: "asc",
      },
    });

    const incrementedInvoices = allInvoices.filter((invoice) =>
      /-\d+$/.test(invoice.invoiceNumber)
    );

    if (incrementedInvoices.length === 0) {
      logger.info("No duplicate invoice numbers found");
      return { message: "No duplicates found" };
    }

    logger.info(
      `Found ${incrementedInvoices.length} invoices with incremented numbers`
    );

    // Group by base invoice number
    const groups: { [key: string]: any[] } = {};

    incrementedInvoices.forEach((invoice) => {
      const baseNumber = invoice.invoiceNumber.replace(/-\d+$/, "");
      if (!groups[baseNumber]) {
        groups[baseNumber] = [];
      }
      groups[baseNumber].push(invoice);
    });

    // Also check if base numbers exist as standalone invoices
    Object.keys(groups).forEach((baseNumber) => {
      const baseInvoice = allInvoices.find(
        (inv) => inv.invoiceNumber === baseNumber
      );
      if (baseInvoice) {
        groups[baseNumber].unshift(baseInvoice);
      }
    });

    // Get the highest existing invoice number for new assignments
    const highestInvoiceNumber = Math.max(
      ...allInvoices
        .map((inv) => parseInt(inv.invoiceNumber.replace(/[^\d]/g, "")))
        .filter((num) => !isNaN(num))
    );

    let nextInvoiceNumber = highestInvoiceNumber + 1;
    let fixedCount = 0;
    let combinedCount = 0;

    // Process each group
    for (const [baseNumber, invoicesInGroup] of Object.entries(groups)) {
      // Group by customer
      const customerGroups: { [key: string]: any[] } = {};
      invoicesInGroup.forEach((invoice) => {
        const customerKey = invoice.customerId || invoice.customerName;
        if (!customerGroups[customerKey]) {
          customerGroups[customerKey] = [];
        }
        customerGroups[customerKey].push(invoice);
      });

      const uniqueCustomers = Object.keys(customerGroups);

      // If all invoices are for the same customer, combine them
      if (uniqueCustomers.length === 1) {
        const customerInvoices = customerGroups[uniqueCustomers[0]];

        if (customerInvoices.length > 1) {
          // Keep the first invoice and merge others into it
          const primaryInvoice = customerInvoices[0];
          const invoicesToMerge = customerInvoices.slice(1);

          for (const secondaryInvoice of invoicesToMerge) {
            // Move all items from secondary invoices to primary invoice
            await prisma.invoiceItem.updateMany({
              where: { invoiceId: secondaryInvoice.id },
              data: { invoiceId: primaryInvoice.id },
            });

            // Delete the secondary invoice
            await prisma.invoice.delete({
              where: { id: secondaryInvoice.id },
            });
          }

          // Recalculate total for primary invoice
          const allItems = await prisma.invoiceItem.findMany({
            where: { invoiceId: primaryInvoice.id },
          });

          const newTotal = allItems.reduce(
            (sum, item) => sum + Number(item.lineTotal),
            0
          );

          await prisma.invoice.update({
            where: { id: primaryInvoice.id },
            data: { totalAmount: newTotal },
          });

          combinedCount++;
          logger.info(
            `Combined ${customerInvoices.length} invoices into ${primaryInvoice.invoiceNumber}`
          );
        }
      }
      // If different customers, assign unique invoice numbers
      else {
        let customerIndex = 0;
        for (const customerInvoices of Object.values(customerGroups)) {
          // Keep the first customer group with the base number
          if (customerIndex > 0) {
            // Assign new invoice numbers to subsequent customers
            for (const invoice of customerInvoices) {
              await prisma.invoice.update({
                where: { id: invoice.id },
                data: { invoiceNumber: nextInvoiceNumber.toString() },
              });

              fixedCount++;
              logger.info(
                `Assigned new invoice number ${nextInvoiceNumber} to ${invoice.customerName}`
              );
              nextInvoiceNumber++;
            }
          }
          customerIndex++;
        }
      }
    }

    // Fix single invoices with suffixes
    const remainingSuffixInvoices = await prisma.invoice.findMany({
      where: {
        invoiceNumber: { contains: "-" },
      },
    });

    for (const invoice of remainingSuffixInvoices) {
      const baseNumber = invoice.invoiceNumber.replace(/-\d+$/, "");

      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: baseNumber,
          id: { not: invoice.id },
        },
      });

      if (!existingInvoice) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { invoiceNumber: baseNumber },
        });
        fixedCount++;
        logger.info(
          `Removed suffix from ${invoice.invoiceNumber} -> ${baseNumber}`
        );
      }
    }

    const message = `Invoice cleanup completed: ${combinedCount} invoices combined, ${fixedCount} invoice numbers fixed`;
    logger.info(message);

    return {
      message,
      combinedCount,
      fixedCount,
    };
  } catch (error) {
    logger.error("Error fixing duplicate invoice numbers:", error);
    throw error;
  }
}
