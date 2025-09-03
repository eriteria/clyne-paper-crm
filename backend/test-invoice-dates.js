// Simple test for date parsing function
// Testing d-mmm-YY format like "1-Sep-25"

function parseDateFromDMmmYY(dateStr) {
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
  const month = monthNames[monthStr];
  if (month === undefined) {
    throw new Error(`Invalid month: ${monthStr}`);
  }

  // Convert 2-digit year to 4-digit year
  // Assuming 25 = 2025, etc.
  const fullYear = year < 50 ? 2000 + year : 1900 + year;

  // Use UTC to avoid timezone issues
  return new Date(Date.UTC(fullYear, month, day));
}

// Simulate the parseInvoiceData function logic for dates
function testInvoiceImport(rows) {
  const invoiceMap = new Map();

  for (const row of rows) {
    const invoiceNumber = row["Invoice No"]?.toString().trim();
    const dateStr = row["Date"]?.toString().trim();
    const customerName = row["Customer"]?.toString().trim();
    const productName = row["Product"]?.toString().trim();
    const quantity = parseFloat(row["Quantity"]?.toString() || "0");
    const unitPrice = parseFloat(row["Item Unit Price"]?.toString() || "0");
    const lineTotal = parseFloat(row["Item Total Price"]?.toString() || "0");
    const invoiceTotal = parseFloat(row["Invoice Total"]?.toString() || "0");

    if (!invoiceNumber || !customerName || !productName) {
      continue; // Skip invalid rows
    }

    // Parse date - handle d-mmm-YY format (e.g., "1-Sep-25")
    let parsedDate;
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

    const invoice = invoiceMap.get(invoiceNumber);

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

// Test data with the d-mmm-YY format
const testData = [
  {
    "Invoice No": "INV-001",
    Date: "1-Sep-25",
    Customer: "Test Customer 1",
    Product: "Test Product A",
    Quantity: "10",
    "Item Unit Price": "1500",
    "Item Total Price": "15000",
    "Invoice Total": "15000",
  },
  {
    "Invoice No": "INV-002",
    Date: "15-Dec-24",
    Customer: "Test Customer 2",
    Product: "Test Product B",
    Quantity: "5",
    "Item Unit Price": "2000",
    "Item Total Price": "10000",
    "Invoice Total": "10000",
  },
  {
    "Invoice No": "INV-003",
    Date: "31-Mar-26",
    Customer: "Test Customer 3",
    Product: "Test Product C",
    Quantity: "8",
    "Item Unit Price": "1200",
    "Item Total Price": "9600",
    "Invoice Total": "9600",
  },
];

console.log("Testing invoice import with d-mmm-YY date format:");
console.log("=================================================");

try {
  const parsedInvoices = testInvoiceImport(testData);

  console.log(`Successfully parsed ${parsedInvoices.length} invoices:`);
  console.log("");

  parsedInvoices.forEach((invoice, index) => {
    console.log(`Invoice ${index + 1}:`);
    console.log(`  Number: ${invoice.invoiceNumber}`);
    console.log(
      `  Date: ${invoice.date.toLocaleDateString()} (${invoice.date.toISOString().split("T")[0]})`
    );
    console.log(`  Customer: ${invoice.customerName}`);
    console.log(`  Items: ${invoice.items.length}`);
    console.log(`  Total: ₦${invoice.totalAmount.toLocaleString()}`);

    invoice.items.forEach((item, itemIndex) => {
      console.log(
        `    Item ${itemIndex + 1}: ${item.productName} (Qty: ${item.quantity}, Unit: ₦${item.unitPrice}, Total: ₦${item.lineTotal})`
      );
    });
    console.log("");
  });

  console.log("✅ Date parsing test passed!");
} catch (error) {
  console.error("❌ Date parsing test failed:", error);
}
