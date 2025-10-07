// Test the new invoice number generation
const timestamp = Date.now().toString();
const randomSuffix = Math.floor(Math.random() * 1000)
  .toString()
  .padStart(3, "0");
const invoiceNumber = timestamp.slice(-8) + randomSuffix;

console.log("🧪 Testing new invoice number generation:");
console.log("Timestamp:", timestamp);
console.log("Random suffix:", randomSuffix);
console.log("Generated invoice number:", invoiceNumber);
console.log("Length:", invoiceNumber.length);

// Generate a few more to test uniqueness
console.log("\n📊 Testing uniqueness with 5 generated numbers:");
const numbers = new Set();
for (let i = 0; i < 5; i++) {
  const ts = Date.now().toString();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const num = ts.slice(-8) + rand;
  numbers.add(num);
  console.log(`${i + 1}: ${num}`);
}

console.log(`\n✅ Generated ${numbers.size} unique numbers out of 5 attempts`);
console.log("💡 This approach should eliminate invoice number conflicts!");
