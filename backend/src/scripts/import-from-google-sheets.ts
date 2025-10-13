import { PrismaClient } from "@prisma/client";
import {
  readCustomersFromSheet,
  readInvoicesFromSheet,
  readPaymentsFromSheet,
  parseNairaCurrency,
  parseSheetDate,
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
          // Try to find existing user by name
          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: { contains: rmName.toLowerCase(), mode: "insensitive" } },
                { email: { equals: `${rmName.toLowerCase().replace(/\s+/g, ".")}@clynepaper.com` } },
              ],
            },
          });

          if (existingUser) {
            relationshipManagerId = existingUser.id;
          } else {
            // Create a placeholder user for the relationship manager
            const newUser = await prisma.user.create({
              data: {
                email: `${rmName.toLowerCase().replace(/\s+/g, ".")}@clynepaper.com`,
                password: "temporary_password_change_me", // They'll need to reset
                role: "Sales",
                name: rmName,
              },
            });
            relationshipManagerId = newUser.id;
            console.log(`  Created user for RM: ${rmName}`);
          }
        }

        // Find location by name
        const locationName = sheetCustomer.LOCATION?.trim();
        let locationId: string | undefined = undefined;

        if (locationName) {
          const location = await prisma.location.findFirst({
            where: { name: { equals: locationName, mode: "insensitive" } },
          });

          if (location) {
            locationId = location.id;
          } else {
            // Create location if it doesn't exist
            const newLocation = await prisma.location.create({
              data: { name: locationName },
            });
            locationId = newLocation.id;
            console.log(`  Created location: ${locationName}`);
          }
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
              // Add custom fields for dates if you want to track them
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
              // Add other fields as needed
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
 */
async function importInvoices() {
  console.log("\n📥 Importing invoices from Google Sheets...");

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
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [invoiceNumber, lines] of invoiceGroups.entries()) {
      try {
        const firstLine = lines[0];
        const customerName = firstLine.Customer?.trim();
        const invoiceDate = parseSheetDate(firstLine.Date);
        const invoiceTotal = parseNairaCurrency(firstLine["Invoice Total"]);

        if (!customerName || !invoiceDate) {
          skipped++;
          console.log(`  ⊘ Skipped invoice ${invoiceNumber}: Missing customer or date`);
          continue;
        }

        // Find customer
        const customer = await prisma.customer.findFirst({
          where: { name: { equals: customerName, mode: "insensitive" } },
        });

        if (!customer) {
          errors.push(
            `Invoice ${invoiceNumber}: Customer "${customerName}" not found`
          );
          console.log(`  ⊘ Skipped invoice ${invoiceNumber}: Customer not found`);
          skipped++;
          continue;
        }

        // Check if invoice already exists
        const existingInvoice = await prisma.invoice.findFirst({
          where: { invoiceNumber },
        });

        if (existingInvoice) {
          updated++;
          console.log(`  ⟳ Invoice ${invoiceNumber} already exists, skipping`);
          continue;
        }

        // Calculate totals from line items
        let calculatedTotal = 0;
        const items = [];

        for (const line of lines) {
          const productName = line.Product?.trim();
          const quantity = parseInt(line.Quantity) || 0;
          const unitPrice = parseNairaCurrency(line["Item Unit Price"]);
          const lineTotal = parseNairaCurrency(line["Item Total Price"]);

          if (!productName || quantity === 0) continue;

          // Find or create product
          let product = await prisma.product.findFirst({
            where: { name: { equals: productName, mode: "insensitive" } },
          });

          if (!product) {
            // Create product with default values
            product = await prisma.product.create({
              data: {
                name: productName,
                price: unitPrice,
                // Add to a default product group or leave null
              },
            });
            console.log(`    Created product: ${productName}`);
          }

          items.push({
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice,
            totalPrice: lineTotal,
          });

          calculatedTotal += lineTotal;
        }

        // Use invoice total from sheet if available, otherwise use calculated
        const finalTotal = invoiceTotal > 0 ? invoiceTotal : calculatedTotal;

        // Create invoice with items
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            customerId: customer.id,
            date: invoiceDate,
            totalAmount: finalTotal,
            status: "Unpaid", // We'll update this after importing payments
            items: {
              create: items,
            },
          },
        });

        created++;
        console.log(
          `  ✓ Created invoice ${invoiceNumber}: ${items.length} items, ₦${finalTotal.toLocaleString()}`
        );
      } catch (error: any) {
        errors.push(`Invoice ${invoiceNumber}: ${error.message}`);
        console.error(`  ✗ Error processing invoice ${invoiceNumber}:`, error.message);
      }
    }

    console.log("\n✅ Invoice import completed!");
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    if (errors.length > 0) {
      console.log(`  Errors: ${errors.length}`);
      errors.forEach((err) => console.log(`    - ${err}`));
    }

    return { created, updated, skipped, errors };
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
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

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

        // Find invoice if specified
        let invoiceId: string | undefined = undefined;
        if (invoiceNumber) {
          const invoice = await prisma.invoice.findFirst({
            where: { invoiceNumber },
          });
          if (invoice) {
            invoiceId = invoice.id;
          } else {
            console.log(
              `  ⚠ Payment references non-existent invoice ${invoiceNumber}`
            );
          }
        }

        // Check if payment already exists (by date, customer, amount)
        const existingPayment = await prisma.payment.findFirst({
          where: {
            customerId: customer.id,
            amount,
            date: paymentDate,
          },
        });

        if (existingPayment) {
          updated++;
          continue;
        }

        // Create payment
        await prisma.payment.create({
          data: {
            customerId: customer.id,
            invoiceId,
            amount,
            date: paymentDate,
            method: "Bank Transfer", // Default method
            reference: reference || `${bank} - ${paymentDate.toISOString().split("T")[0]}`,
          },
        });

        created++;
        console.log(
          `  ✓ Created payment: ${customerName} - ₦${amount.toLocaleString()}`
        );

        // Update invoice status if linked
        if (invoiceId) {
          const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { payments: true },
          });

          if (invoice) {
            const totalPaid = invoice.payments.reduce(
              (sum, p) => sum + p.amount,
              0
            );

            let newStatus: "Paid" | "Partial" | "Unpaid" = "Unpaid";
            if (totalPaid >= invoice.totalAmount) {
              newStatus = "Paid";
            } else if (totalPaid > 0) {
              newStatus = "Partial";
            }

            await prisma.invoice.update({
              where: { id: invoiceId },
              data: { status: newStatus },
            });
          }
        }
      } catch (error: any) {
        errors.push(`Payment: ${error.message}`);
        console.error(`  ✗ Error processing payment:`, error.message);
      }
    }

    console.log("\n✅ Payment import completed!");
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    if (errors.length > 0) {
      console.log(`  Errors: ${errors.length}`);
      errors.forEach((err) => console.log(`    - ${err}`));
    }

    return { created, updated, skipped, errors };
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
  console.log("=" .repeat(60));

  try {
    // Import in order: Customers → Invoices → Payments
    const customerResults = await importCustomers();
    const invoiceResults = await importInvoices();
    const paymentResults = await importPayments();

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Full import completed!");
    console.log("\nSummary:");
    console.log(
      `  Customers: ${customerResults.created} created, ${customerResults.updated} updated`
    );
    console.log(
      `  Invoices: ${invoiceResults.created} created, ${invoiceResults.updated} updated`
    );
    console.log(
      `  Payments: ${paymentResults.created} created, ${paymentResults.updated} updated`
    );
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

export { importCustomers, importInvoices, importPayments, runFullImport };
