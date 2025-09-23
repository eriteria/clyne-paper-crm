const { exportData } = require("./export-data");
const { importData } = require("./import-data");
const { execSync } = require("child_process");
const path = require("path");

async function migrateDataToProd() {
  try {
    console.log(
      "🚀 Starting complete data migration from local to production...\n"
    );

    // Step 1: Export data from local
    console.log("STEP 1: Exporting data from local database");
    console.log("=====================================");
    const exportPath = await exportData();

    console.log("\n⏱️ Waiting 2 seconds before upload...\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Upload export file to production server
    console.log("STEP 2: Uploading data file to production server");
    console.log("===============================================");
    const exportFileName = path.basename(exportPath);

    try {
      console.log("📤 Uploading file to production server...");
      execSync(
        `fly ssh sftp put "${exportPath}" /app/${exportFileName} --app clyne-paper-crm-backend`,
        {
          stdio: "inherit",
        }
      );
      console.log("✅ File uploaded successfully");
    } catch (error) {
      console.log("⚠️ SFTP upload failed, trying alternative method...");

      // Alternative: Copy via SSH
      try {
        console.log("📤 Trying SSH copy method...");
        execSync(
          `fly ssh console --app clyne-paper-crm-backend -C "cat > /app/${exportFileName}" < "${exportPath}"`,
          {
            stdio: "inherit",
          }
        );
        console.log("✅ File copied successfully");
      } catch (altError) {
        throw new Error(
          "Both upload methods failed. Please manually copy the export file to production."
        );
      }
    }

    console.log("\n⏱️ Waiting 2 seconds before import...\n");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 3: Run import on production server
    console.log("STEP 3: Importing data on production server");
    console.log("==========================================");
    try {
      console.log("📥 Running import on production server...");
      execSync(
        `fly ssh console --app clyne-paper-crm-backend -C "node import-data.js /app/${exportFileName} --clear --preserve-admin"`,
        {
          stdio: "inherit",
        }
      );
      console.log("✅ Import completed successfully");
    } catch (importError) {
      console.error("❌ Import failed on production server");
      throw importError;
    }

    console.log("\n🎉 Migration completed successfully!");
    console.log("=====================================");
    console.log("✅ Data exported from local database");
    console.log("✅ Data uploaded to production server");
    console.log("✅ Data imported to production database");
    console.log("🔒 Production admin user preserved");
    console.log("\n📝 Next steps:");
    console.log("1. Test the production application");
    console.log("2. Verify all data is present");
    console.log("3. Clean up the export file if desired");
    console.log(`\n📁 Export file location: ${exportPath}`);
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.log("\n🔧 Manual steps to complete migration:");
    console.log("1. Run: node export-data.js (to export local data)");
    console.log("2. Upload the export file to production server");
    console.log(
      "3. Run on production: node import-data.js <export-file> --clear --preserve-admin"
    );
    throw error;
  }
}

// Command line options parsing
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
🔄 Data Migration Tool
====================

This tool migrates data from your local development database to production.

Usage:
  node migrate-data.js [options]

Options:
  --help, -h              Show this help message
  --export-only           Only export data from local database
  --import-only <file>    Only import data to production (specify export file)
  --dry-run               Show what would be done without executing

Examples:
  node migrate-data.js                    # Full migration
  node migrate-data.js --export-only      # Export only
  node migrate-data.js --import-only data-export-123.json
    `);
    process.exit(0);
  }

  return {
    exportOnly: args.includes("--export-only"),
    importOnly: args.find(
      (arg) => args[args.indexOf(arg) - 1] === "--import-only"
    ),
    dryRun: args.includes("--dry-run"),
  };
}

// Main execution
if (require.main === module) {
  const options = parseArgs();

  if (options.dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
    console.log("Would perform:");
    console.log("1. Export all data from local database");
    console.log("2. Upload export file to production");
    console.log("3. Import data to production (preserving admin)");
    process.exit(0);
  }

  if (options.exportOnly) {
    console.log("📤 Export-only mode");
    exportData().catch(console.error);
  } else if (options.importOnly) {
    console.log("📥 Import-only mode");
    if (!options.importOnly) {
      console.error("❌ Please specify export file for import-only mode");
      process.exit(1);
    }

    // This would need to be run on production server
    console.log("⚠️ Import-only mode should be run on production server:");
    console.log(
      `fly ssh console --app clyne-paper-crm-backend -C "node import-data.js ${options.importOnly} --clear --preserve-admin"`
    );
  } else {
    console.log("🚀 Full migration mode");
    migrateDataToProd().catch(console.error);
  }
}

module.exports = { migrateDataToProd };
