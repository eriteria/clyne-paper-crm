// Test the currency parsing function
const { parseCurrencyValue } = require("./src/utils/invoiceImport");

// Test various currency formats
const testValues = [
  "₦1,250,000.50",
  "$2,500.75",
  "€5,750.25",
  "£1,000.00",
  "1,500.50",
  "500",
  "invalid",
];

console.log("Testing currency parsing:");
testValues.forEach((value) => {
  const parsed = parseCurrencyValue(value);
  console.log(`"${value}" -> ${parsed} (type: ${typeof parsed})`);
});
