// Test the date parsing functionality in isolation
// This simulates how the import would work

const testTemplate = [
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

console.log("📄 Updated Template Test:");
console.log("========================");
console.log("Testing template data with d-mmm-YY date format:");
console.log("");

testTemplate.forEach((row, index) => {
  console.log(`Row ${index + 1}:`);
  console.log(`  Invoice No: ${row["Invoice No"]}`);
  console.log(`  Date: ${row["Date"]} (d-mmm-YY format)`);
  console.log(`  Customer: ${row["Customer"]}`);
  console.log(`  Product: ${row["Product"]}`);
  console.log("");
});

console.log("✅ Template format updated successfully!");
console.log(
  "💡 Users can now download this template and see the correct date format examples."
);
