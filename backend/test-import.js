const {
  sampleExcelData,
  importCustomers,
  linkRelationshipManagers,
  clearDummyData,
} = require("./src/utils/customerImport.ts");

async function testImport() {
  try {
    console.log("🧪 Testing customer import functionality...\n");

    // Test with sample data
    console.log("📊 Sample data:");
    console.log(JSON.stringify(sampleExcelData, null, 2));

    console.log("\n🔄 Starting import...");
    const result = await importCustomers(sampleExcelData);

    console.log("\n📋 Import Results:");
    console.log(`Imported: ${result.imported}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      result.errors.forEach((error) => {
        console.log(`  Row ${error.row}: ${error.error}`);
      });
    }

    console.log("\n✅ Import test completed successfully!");
  } catch (error) {
    console.error("❌ Import test failed:", error);
  }
}

testImport();
