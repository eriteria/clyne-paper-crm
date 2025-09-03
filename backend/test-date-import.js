// Test invoice import with correct date format
const { parseInvoiceData } = require("./src/utils/invoiceImport");

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
  const parsedInvoices = parseInvoiceData(testData);

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
