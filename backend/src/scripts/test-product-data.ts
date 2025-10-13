import {
  readSheetData,
  parseSheetData,
  SHEET_IDS,
} from "../services/googleSheets";

async function testProductData() {
  console.log("Testing Product Groups...");
  const pgRows = await readSheetData(
    SHEET_IDS.DATABASE,
    "PRODUCT GROUPS AND TARGETS",
    "A1:B6"
  );
  const productGroups = parseSheetData(pgRows);
  console.log("Product Groups:", JSON.stringify(productGroups, null, 2));

  console.log("\nTesting Products...");
  const pRows = await readSheetData(SHEET_IDS.DATABASE, "PRODUCTS", "A1:C6");
  const products = parseSheetData(pRows);
  console.log("Products:", JSON.stringify(products, null, 2));
}

testProductData().catch(console.error);
