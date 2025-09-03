// Test date parsing for invoice import
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

// Test various date formats
const testDates = [
  "1-Sep-25",
  "15-Dec-24",
  "5-Jan-26",
  "31-Mar-25",
  "10-Jul-23",
];

console.log("Testing date parsing for d-mmm-YY format:");
console.log("===========================================");

testDates.forEach((dateStr) => {
  try {
    const parsed = parseDateFromDMmmYY(dateStr);
    console.log(
      `${dateStr} → ${parsed.toLocaleDateString()} (${parsed.toISOString().split("T")[0]})`
    );
  } catch (error) {
    console.log(`${dateStr} → ERROR: ${error.message}`);
  }
});

console.log("\nFor comparison, standard Date parsing:");
console.log("=====================================");

testDates.forEach((dateStr) => {
  const standardParsed = new Date(dateStr);
  console.log(
    `${dateStr} → ${standardParsed.toLocaleDateString()} (Valid: ${!isNaN(standardParsed.getTime())})`
  );
});
