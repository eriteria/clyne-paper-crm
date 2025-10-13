import {
  getGoogleSheetsClient,
  getSheetNames,
  readSheetData,
  SHEET_IDS,
  SHEET_NAMES,
  parseSheetData,
} from "../services/googleSheets";

/**
 * Test Google Sheets API connection
 */
async function testConnection() {
  console.log("🧪 Testing Google Sheets API connection...\n");

  try {
    // Test 1: Initialize client
    console.log("1. Initializing Google Sheets client...");
    const client = await getGoogleSheetsClient();
    console.log("   ✓ Client initialized successfully\n");

    // Test 2: Get sheet names from Database workbook
    console.log("2. Reading Database workbook sheet names...");
    const databaseSheets = await getSheetNames(SHEET_IDS.DATABASE);
    console.log("   ✓ Found sheets:", databaseSheets.join(", "));
    console.log("");

    // Test 3: Get sheet names from Master workbook
    console.log("3. Reading Master workbook sheet names...");
    const masterSheets = await getSheetNames(SHEET_IDS.MASTER);
    console.log("   ✓ Found sheets:", masterSheets.join(", "));
    console.log("");

    // Test 4: Read sample customer data
    console.log("4. Reading sample customer data (first 5 rows)...");
    const customerRows = await readSheetData(
      SHEET_IDS.DATABASE,
      SHEET_NAMES.CUSTOMERS,
      "A1:F6" // Headers + 5 rows
    );
    const customers = parseSheetData(customerRows);
    console.log(`   ✓ Read ${customers.length} customers`);
    if (customers.length > 0) {
      console.log("   Sample customer:", JSON.stringify(customers[0], null, 2));
    }
    console.log("");

    // Test 5: Read sample invoice data
    console.log("5. Reading sample invoice data (first 5 rows)...");
    const invoiceRows = await readSheetData(
      SHEET_IDS.MASTER,
      SHEET_NAMES.INVOICE_LIST,
      "A1:I6" // Headers + 5 rows
    );
    const invoices = parseSheetData(invoiceRows);
    console.log(`   ✓ Read ${invoices.length} invoice lines`);
    if (invoices.length > 0) {
      console.log("   Sample invoice:", JSON.stringify(invoices[0], null, 2));
    }
    console.log("");

    // Test 6: Read sample payment data
    console.log("6. Reading sample payment data (first 5 rows)...");
    const paymentRows = await readSheetData(
      SHEET_IDS.MASTER,
      SHEET_NAMES.PAYMENTS,
      "A1:F6" // Headers + 5 rows
    );
    const payments = parseSheetData(paymentRows);
    console.log(`   ✓ Read ${payments.length} payments`);
    if (payments.length > 0) {
      console.log("   Sample payment:", JSON.stringify(payments[0], null, 2));
    }
    console.log("");

    console.log("✅ All tests passed! Google Sheets API is working correctly.");
    console.log("\nYou can now run the full import:");
    console.log("  npx ts-node src/scripts/import-from-google-sheets.ts");
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    console.error("\nTroubleshooting:");
    console.error(
      "1. Make sure google-credentials.json exists in backend/ folder"
    );
    console.error(
      "2. Verify you've shared both Google Sheets with the service account email"
    );
    console.error(
      "3. Check that the service account has at least Viewer permission"
    );
    console.error(
      "4. Ensure Google Sheets API is enabled in your Google Cloud project"
    );
    console.error(
      "\nSee docs/GOOGLE_SHEETS_IMPORT_SETUP.md for detailed setup instructions"
    );
    process.exit(1);
  }
}

// Run the test
testConnection();
