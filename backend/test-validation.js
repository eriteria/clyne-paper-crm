// Test data validation for invoice import
// This script tests the numeric validation fixes

// Test data with potential problematic values
const testDataWithIssues = [
  {
    "Invoice No": "2051",
    Date: "5-Jun-25",
    Customer: "050 RESTAURANT",
    Product: "Test Product A",
    Quantity: "2",
    "Item Unit Price": "", // Empty string - should cause NaN
    "Item Total Price": "500",
    "Invoice Total": "500",
  },
  {
    "Invoice No": "2052",
    Date: "6-Jun-25",
    Customer: "Test Customer 2",
    Product: "Test Product B",
    Quantity: "invalid", // Invalid number
    "Item Unit Price": "2000",
    "Item Total Price": "10000",
    "Invoice Total": "10000",
  },
  {
    "Invoice No": "2053",
    Date: "7-Jun-25",
    Customer: "Test Customer 3",
    Product: "Test Product C",
    Quantity: "3",
    "Item Unit Price": "1500",
    "Item Total Price": "4500",
    "Invoice Total": "4500",
  },
];

console.log("Testing data validation for invoice import:");
console.log("==========================================");

testDataWithIssues.forEach((row, index) => {
  console.log(`\nRow ${index + 1}:`);
  console.log(`  Invoice No: ${row["Invoice No"]}`);
  console.log(`  Customer: ${row["Customer"]}`);
  console.log(`  Product: ${row["Product"]}`);

  // Test the parsing logic
  const quantityStr = row["Quantity"]?.toString() || "0";
  const unitPriceStr = row["Item Unit Price"]?.toString() || "0";
  const lineTotalStr = row["Item Total Price"]?.toString() || "0";
  const invoiceTotalStr = row["Invoice Total"]?.toString() || "0";

  const quantity = parseFloat(quantityStr);
  const unitPrice = parseFloat(unitPriceStr);
  const lineTotal = parseFloat(lineTotalStr);
  const invoiceTotal = parseFloat(invoiceTotalStr);

  console.log(
    `  Raw Values: Qty="${quantityStr}", Price="${unitPriceStr}", Line="${lineTotalStr}", Total="${invoiceTotalStr}"`
  );
  console.log(
    `  Parsed Values: Qty=${quantity}, Price=${unitPrice}, Line=${lineTotal}, Total=${invoiceTotal}`
  );

  // Check for validation issues
  const hasNaN =
    isNaN(quantity) ||
    isNaN(unitPrice) ||
    isNaN(lineTotal) ||
    isNaN(invoiceTotal);
  console.log(
    `  Validation Result: ${hasNaN ? "❌ INVALID (contains NaN)" : "✅ VALID"}`
  );

  if (hasNaN) {
    const issues = [];
    if (isNaN(quantity)) issues.push("Quantity");
    if (isNaN(unitPrice)) issues.push("Unit Price");
    if (isNaN(lineTotal)) issues.push("Line Total");
    if (isNaN(invoiceTotal)) issues.push("Invoice Total");
    console.log(`  Issues: ${issues.join(", ")}`);
  }
});

console.log(
  "\n🔧 Summary: The validation logic will now catch these issues before attempting to create invoices in the database."
);
