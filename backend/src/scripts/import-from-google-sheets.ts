import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  readCustomersFromSheet,
  readInvoicesFromSheet,
  readPaymentsFromSheet,
  parseNairaCurrency,
  parseSheetDate,
  SHEET_IDS,
  readSheetData,
  parseSheetData,
} from "../services/googleSheets";

const prisma = new PrismaClient();

interface GoogleSheetCustomer {
  "CUSTOMER NAME": string;
  "RELATIONSHIP MANAGER": string;
  LOCATION: string;
  ADDRESS: string;
  "DATE OF ONBOARDING": string;
  "LAST ORDER DATE": string;
}

interface GoogleSheetInvoice {
  Invoice: string;
  Date: string;
  Customer: string;
  Product: string;
  Quantity: string;
  "Item Unit Price": string;
  "Item Total Price": string;
  "Invoice Total": string;
}

interface GoogleSheetPayment {
  Date: string;
  Customer: string;
  "Invoice No. (Optional)": string;
  "Payment REF": string;
  Bank: string;
  Amount: string;
}

interface GoogleSheetProduct {
  "PRODUCT NAME": string;
  "PRODUCT GROUP": string;
  TARGET: string;
}

interface GoogleSheetProductGroup {
  "PRODUCT GROUP NAME": string;
  TARGET: string;
}

/**
 * Get or create a default "Sales" role
 */
async function getOrCreateSalesRole(): Promise<string> {
  let role = await prisma.role.findUnique({
    where: { name: "Sales" },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: "Sales",
        permissions: JSON.stringify({
          customers: ["read", "create", "update"],
          invoices: ["read", "create"],
          payments: ["read"],
        }),
      },
    });
    console.log("  Created 'Sales' role");
  }

  return role.id;
}

/**
 * Get or create a system import user
 */
async function getOrCreateSystemUser(): Promise<string> {
  let systemUser = await prisma.user.findUnique({
    where: { email: "system.import@clynepaper.com" },
  });

  if (!systemUser) {
    const salesRoleId = await getOrCreateSalesRole();
    const hashedPassword = await bcrypt.hash("system_import_user", 12);

    systemUser = await prisma.user.create({
      data: {
        email: "system.import@clynepaper.com",
        fullName: "System Import User",
        passwordHash: hashedPassword,
        roleId: salesRoleId,
        isActive: false, // Disabled for login
      },
    });
    console.log("  Created system import user");
  }

  return systemUser.id;
}

/**
 * Import product groups from Google Sheets
 */
async function importProductGroups() {
  console.log("\n📦 Importing product groups from Google Sheets...");

  try {
    const rows = await readSheetData(
      SHEET_IDS.DATABASE,
      "PRODUCT GROUPS AND TARGETS"
    );
    const sheetProductGroups = parseSheetData<GoogleSheetProductGroup>(rows);

    console.log(`Found ${sheetProductGroups.length} product groups in sheet`);

    let created = 0;
    let existing = 0;

    for (const sheetGroup of sheetProductGroups) {
      const groupName = sheetGroup["PRODUCT GROUP NAME"]?.trim();
      if (!groupName) continue;

      const existingGroup = await prisma.productGroup.findFirst({
        where: { name: { equals: groupName, mode: "insensitive" } },
      });

      if (existingGroup) {
        existing++;
        continue;
      }

      await prisma.productGroup.create({
        data: {
          name: groupName,
        },
      });

      created++;
      console.log(`  ✓ Created product group: ${groupName}`);
    }

    console.log(
      `\n✅ Product groups: ${created} created, ${existing} already existed`
    );
    return { created, existing };
  } catch (error: any) {
    console.error("Error importing product groups:", error.message);
    throw error;
  }
}

/**
 * Import products from Google Sheets
 */
async function importProducts() {
  console.log("\n📦 Importing products from Google Sheets...");

  try {
    const rows = await readSheetData(SHEET_IDS.DATABASE, "PRODUCTS");
    const sheetProducts = parseSheetData<GoogleSheetProduct>(rows);

    console.log(`Found ${sheetProducts.length} products in sheet`);

    let created = 0;
    let existing = 0;
    const errors: string[] = [];

    // Get or create a default product group
    let defaultGroup = await prisma.productGroup.findFirst({
      where: { name: "General Products" },
    });

    if (!defaultGroup) {
      defaultGroup = await prisma.productGroup.create({
        data: {
          name: "General Products",
        },
      });
      console.log("  Created default product group");
    }

    for (const sheetProduct of sheetProducts) {
      const productName = sheetProduct["PRODUCT NAME"]?.trim();
      if (!productName) continue;

      try {
        const groupName = sheetProduct["PRODUCT GROUP"]?.trim();

        // Find product group
        let productGroup = defaultGroup;
        if (groupName) {
          const foundGroup = await prisma.productGroup.findFirst({
            where: { name: { equals: groupName, mode: "insensitive" } },
          });
          if (foundGroup) {
            productGroup = foundGroup;
          }
        }

        // Check if product exists
        const existingProduct = await prisma.product.findFirst({
          where: {
            name: { equals: productName, mode: "insensitive" },
            productGroupId: productGroup.id,
          },
        });

        if (existingProduct) {
          existing++;
          continue;
        }

        // Create product
        await prisma.product.create({
          data: {
            name: productName,
            productGroupId: productGroup.id,
            monthlyTarget: 0,
          },
        });

        created++;
        console.log(
          `  ✓ Created product: ${productName} (${productGroup.name})`
        );
      } catch (error: any) {
        errors.push(`${productName}: ${error.message}`);
      }
    }

    console.log(
      `\n✅ Products: ${created} created, ${existing} already existed`
    );
    if (errors.length > 0) {
      console.log(`  Errors: ${errors.length}`);
      errors.forEach((err) => console.log(`    - ${err}`));
    }

    return { created, existing, errors };
  } catch (error: any) {
    console.error("Error importing products:", error.message);
    throw error;
  }
}

/**
 * Import customers from Google Sheets
 */
async function importCustomers() {
  console.log("\n📥 Importing customers from Google Sheets...");

  try {
    const sheetCustomers =
      (await readCustomersFromSheet()) as GoogleSheetCustomer[];

    console.log(`Found ${sheetCustomers.length} customers in sheet`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Get sales role for relationship managers
    const salesRoleId = await getOrCreateSalesRole();

    for (const sheetCustomer of sheetCustomers) {
      const customerName = sheetCustomer["CUSTOMER NAME"]?.trim();
      if (!customerName) {
        skipped++;
        continue;
      }

      try {
        // Find or create relationship manager (as User)
        const rmName = sheetCustomer["RELATIONSHIP MANAGER"]?.trim();
        let relationshipManagerId: string | undefined = undefined;

        if (rmName) {
          // Try to find existing user by email
          const userEmail = `${rmName.toLowerCase().replace(/\s+/g, ".")}@clynepaper.com`;
          let existingUser = await prisma.user.findUnique({
            where: { email: userEmail },
          });

          if (!existingUser) {
            // Create user for relationship manager
            const hashedPassword = await bcrypt.hash("ChangeMe123!", 12);

            existingUser = await prisma.user.create({
              data: {
                email: userEmail,
                fullName: rmName,
                passwordHash: hashedPassword,
                roleId: salesRoleId,
                isActive: true,
              },
            });
            console.log(`  Created user for RM: ${rmName}`);
          }

          relationshipManagerId = existingUser.id;
        }

        // Find or create location
        const locationName = sheetCustomer.LOCATION?.trim();
        let locationId: string;

        if (locationName) {
          let location = await prisma.location.findFirst({
            where: { name: { equals: locationName, mode: "insensitive" } },
          });

          if (!location) {
            location = await prisma.location.create({
              data: { name: locationName },
            });
            console.log(`  Created location: ${locationName}`);
          }

          locationId = location.id;
        } else {
          // Create/get default location if not specified
          let defaultLocation = await prisma.location.findFirst({
            where: { name: "Default Location" },
          });

          if (!defaultLocation) {
            defaultLocation = await prisma.location.create({
              data: { name: "Default Location" },
            });
          }

          locationId = defaultLocation.id;
        }

        // Parse dates
        const onboardingDate = parseSheetDate(
          sheetCustomer["DATE OF ONBOARDING"]
        );
        const lastOrderDate = parseSheetDate(sheetCustomer["LAST ORDER DATE"]);

        // Check if customer exists
        const existingCustomer = await prisma.customer.findFirst({
          where: { name: { equals: customerName, mode: "insensitive" } },
        });

        if (existingCustomer) {
          // Update existing customer
          await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
              relationshipManagerId,
              locationId,
              address: sheetCustomer.ADDRESS || existingCustomer.address,
              onboardingDate: onboardingDate || existingCustomer.onboardingDate,
              lastOrderDate: lastOrderDate || existingCustomer.lastOrderDate,
            },
          });
          updated++;
          console.log(`  ✓ Updated: ${customerName}`);
        } else {
          // Create new customer
          await prisma.customer.create({
            data: {
              name: customerName,
              relationshipManagerId,
              locationId,
              address: sheetCustomer.ADDRESS || "",
              onboardingDate,
              lastOrderDate,
            },
          });
          created++;
          console.log(`  ✓ Created: ${customerName}`);
        }
      } catch (error: any) {
        errors.push(`${customerName}: ${error.message}`);
        console.error(`  ✗ Error processing ${customerName}:`, error.message);
      }
    }

    console.log("\n✅ Customer import completed!");
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    if (errors.length > 0) {
      console.log(`  Errors: ${errors.length}`);
      errors.forEach((err) => console.log(`    - ${err}`));
    }

    return { created, updated, skipped, errors };
  } catch (error) {
    console.error("Fatal error importing customers:", error);
    throw error;
  }
}

/**
 * Import invoices from Google Sheets
 * Note: This creates invoices but WITHOUT line items since InvoiceItem requires InventoryItem
 */
async function importInvoices() {
  console.log("\n📥 Importing invoices from Google Sheets...");
  console.log(
    "⚠️  Note: Invoice line items require inventory items to be set up first"
  );

  try {
    const sheetInvoices =
      (await readInvoicesFromSheet()) as GoogleSheetInvoice[];

    console.log(`Found ${sheetInvoices.length} invoice lines in sheet`);

    // Group invoice lines by invoice number
    const invoiceGroups = new Map<string, GoogleSheetInvoice[]>();
    for (const line of sheetInvoices) {
      const invoiceNum = line.Invoice?.trim();
      if (!invoiceNum) continue;

      if (!invoiceGroups.has(invoiceNum)) {
        invoiceGroups.set(invoiceNum, []);
      }
      invoiceGroups.get(invoiceNum)!.push(line);
    }

    console.log(`Grouped into ${invoiceGroups.size} unique invoices`);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    const systemUserId = await getOrCreateSystemUser();

    for (const [invoiceNumber, lines] of invoiceGroups.entries()) {
      try {
        const firstLine = lines[0];
        const customerName = firstLine.Customer?.trim();
        const invoiceDate = parseSheetDate(firstLine.Date);
        const invoiceTotal = parseNairaCurrency(firstLine["Invoice Total"]);

        if (!customerName || !invoiceDate) {
          skipped++;
          console.log(
            `  ⊘ Skipped invoice ${invoiceNumber}: Missing customer or date`
          );
          continue;
        }

        // Calculate total from line items if not provided
        let calculatedTotal = 0;
        for (const line of lines) {
          const lineTotal = parseNairaCurrency(line["Item Total Price"]);
          calculatedTotal += lineTotal;
        }

        const finalTotal = invoiceTotal > 0 ? invoiceTotal : calculatedTotal;

        // Find customer
        const customer = await prisma.customer.findFirst({
          where: { name: { equals: customerName, mode: "insensitive" } },
        });

        if (!customer) {
          errors.push(
            `Invoice ${invoiceNumber}: Customer "${customerName}" not found`
          );
          skipped++;
          continue;
        }

        // Check if invoice already exists
        const existingInvoice = await prisma.invoice.findFirst({
          where: { invoiceNumber },
        });

        if (existingInvoice) {
          skipped++;
          continue;
        }

        // Use customer's relationship manager or system user
        const billedByUserId = customer.relationshipManagerId || systemUserId;

        // Create invoice WITHOUT items (will need to be added manually via CRM)
        await prisma.invoice.create({
          data: {
            invoiceNumber,
            customerId: customer.id,
            customerName: customer.name,
            date: invoiceDate,
            totalAmount: finalTotal,
            balance: finalTotal, // Initially unpaid
            billedByUserId,
            status: "OPEN", // Use proper status
            teamId: customer.teamId,
          },
        });

        created++;
        console.log(
          `  ✓ Created invoice ${invoiceNumber}: ${lines.length} line items, ₦${finalTotal.toLocaleString()}`
        );
        console.log(
          `    ⚠️  Note: Line items not created - need inventory items first`
        );
      } catch (error: any) {
        errors.push(`Invoice ${invoiceNumber}: ${error.message}`);
        console.error(
          `  ✗ Error processing invoice ${invoiceNumber}:`,
          error.message
        );
      }
    }

    console.log("\n✅ Invoice import completed!");
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(
      `  ⚠️  Line items: Require inventory setup - create via CRM UI`
    );
    if (errors.length > 0) {
      console.log(`  Errors: ${errors.length}`);
      errors.forEach((err) => console.log(`    - ${err}`));
    }

    return { created, skipped, errors };
  } catch (error) {
    console.error("Fatal error importing invoices:", error);
    throw error;
  }
}

/**
 * Import payments from Google Sheets
 */
async function importPayments() {
  console.log("\n📥 Importing payments from Google Sheets...");

  try {
    const sheetPayments =
      (await readPaymentsFromSheet()) as GoogleSheetPayment[];

    console.log(`Found ${sheetPayments.length} payments in sheet`);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    const systemUserId = await getOrCreateSystemUser();

    for (const sheetPayment of sheetPayments) {
      try {
        const paymentDate = parseSheetDate(sheetPayment.Date);
        const amount = parseNairaCurrency(sheetPayment.Amount);
        const customerName = sheetPayment.Customer?.trim();
        const invoiceNumber = sheetPayment["Invoice No. (Optional)"]?.trim();
        const reference = sheetPayment["Payment REF"]?.trim();
        const bank = sheetPayment.Bank?.trim();

        if (!paymentDate || amount === 0 || !customerName) {
          skipped++;
          continue;
        }

        // Find customer
        const customer = await prisma.customer.findFirst({
          where: { name: { equals: customerName, mode: "insensitive" } },
        });

        if (!customer) {
          errors.push(`Payment: Customer "${customerName}" not found`);
          skipped++;
          continue;
        }

        // Get recordedBy user
        const recordedByUserId = customer.relationshipManagerId || systemUserId;

        // Check if payment already exists (by date, customer, amount)
        const existingPayment = await prisma.customerPayment.findFirst({
          where: {
            customerId: customer.id,
            amount: new Prisma.Decimal(amount),
            paymentDate,
          },
        });

        if (existingPayment) {
          skipped++;
          continue;
        }

        // Create customer payment
        const payment = await prisma.customerPayment.create({
          data: {
            customerId: customer.id,
            amount,
            paymentDate,
            paymentMethod: "BANK_TRANSFER",
            referenceNumber:
              reference ||
              `${bank} - ${paymentDate.toISOString().split("T")[0]}`,
            recordedByUserId,
            notes: bank ? `Bank: ${bank}` : undefined,
            status: "COMPLETED",
          },
        });

        created++;
        console.log(
          `  ✓ Created payment: ${customerName} - ₦${amount.toLocaleString()}`
        );

        // If invoice number was specified, create payment application
        if (invoiceNumber) {
          const invoice = await prisma.invoice.findFirst({
            where: { invoiceNumber },
          });

          if (invoice) {
            // Create payment application to link payment to invoice
            await prisma.paymentApplication.create({
              data: {
                customerPaymentId: payment.id,
                invoiceId: invoice.id,
                amountApplied: amount,
                notes: `Auto-applied from import for invoice ${invoiceNumber}`,
              },
            });

            // Update invoice balance
            const currentBalance = Number(invoice.balance);
            const newBalance = Math.max(0, currentBalance - amount);

            let newStatus = invoice.status;
            if (newBalance === 0) {
              newStatus = "PAID";
            } else if (newBalance < Number(invoice.totalAmount)) {
              newStatus = "PARTIAL";
            }

            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                balance: newBalance,
                status: newStatus,
              },
            });

            // Update payment allocated amount
            await prisma.customerPayment.update({
              where: { id: payment.id },
              data: {
                allocatedAmount: amount,
              },
            });

            console.log(
              `    → Applied to invoice ${invoiceNumber}, new balance: ₦${newBalance.toLocaleString()}`
            );
          } else {
            console.log(
              `    ⚠ Could not find invoice ${invoiceNumber} to apply payment`
            );
          }
        }
      } catch (error: any) {
        errors.push(`Payment: ${error.message}`);
        console.error(`  ✗ Error processing payment:`, error.message);
      }
    }

    console.log("\n✅ Payment import completed!");
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    if (errors.length > 0) {
      console.log(`  Errors: ${errors.length}`);
      errors.forEach((err) => console.log(`    - ${err}`));
    }

    return { created, skipped, errors };
  } catch (error) {
    console.error("Fatal error importing payments:", error);
    throw error;
  }
}

/**
 * Main import function - runs all imports in sequence
 */
async function runFullImport() {
  console.log("🚀 Starting Google Sheets import...\n");
  console.log("=".repeat(60));

  try {
    // Import in order: Product Groups → Products → Customers → Invoices → Payments
    console.log("\n📦 Phase 1: Product Setup");
    const productGroupResults = await importProductGroups();
    const productResults = await importProducts();

    console.log("\n👥 Phase 2: Customer Import");
    const customerResults = await importCustomers();

    console.log("\n📄 Phase 3: Invoice Import");
    const invoiceResults = await importInvoices();

    console.log("\n💰 Phase 4: Payment Import");
    const paymentResults = await importPayments();

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Full import completed!");
    console.log("\n📊 Summary:");
    console.log(`  Product Groups: ${productGroupResults.created} created`);
    console.log(`  Products: ${productResults.created} created`);
    console.log(
      `  Customers: ${customerResults.created} created, ${customerResults.updated} updated`
    );
    console.log(
      `  Invoices: ${invoiceResults.created} created (without line items)`
    );
    console.log(`  Payments: ${paymentResults.created} created`);

    console.log("\n⚠️  Important Next Steps:");
    console.log("  1. Set up inventory items for each product/location in CRM");
    console.log("  2. Add invoice line items manually via CRM UI");
    console.log("  3. Reset passwords for relationship manager users");
    console.log("  4. Assign users to teams and regions");
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runFullImport()
    .then(() => {
      console.log("\n✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

export {
  importCustomers,
  importInvoices,
  importPayments,
  importProducts,
  importProductGroups,
  runFullImport,
};
