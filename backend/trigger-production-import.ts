/**
 * Test script to trigger Google Sheets import on production via API
 * 
 * Usage:
 * 1. Get an admin auth token from the frontend or via login API
 * 2. Run: npx ts-node trigger-production-import.ts <AUTH_TOKEN>
 */

const BACKEND_URL = process.env.BACKEND_URL || "https://clyne-paper-crm-backend.fly.dev";

async function triggerImport(authToken: string) {
  console.log("\n🔍 Checking import service status...\n");

  try {
    // Check status first
    const statusResponse = await fetch(`${BACKEND_URL}/api/admin-import/status`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!statusResponse.ok) {
      const error = await statusResponse.json();
      console.error("❌ Failed to check status:", error);
      return;
    }

    const status = await statusResponse.json();
    console.log("✅ Import Service Status:");
    console.log(JSON.stringify(status, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");

    // Ask for confirmation
    console.log("⚠️  WARNING: This will import data from Google Sheets to production!");
    console.log("   Current database stats:", status.database);
    console.log("\n");

    // Trigger import
    console.log("🚀 Triggering import...\n");

    const importResponse = await fetch(
      `${BACKEND_URL}/api/admin-import/google-sheets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!importResponse.ok) {
      const error = await importResponse.json();
      console.error("❌ Failed to trigger import:", error);
      return;
    }

    const result = await importResponse.json();
    console.log("✅ Import Triggered:");
    console.log(JSON.stringify(result, null, 2));
    console.log("\n📊 Monitor progress with:");
    console.log(`   fly logs -a clyne-paper-crm-backend`);
    console.log("\n");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

// Get auth token from command line
const authToken = process.argv[2];

if (!authToken) {
  console.error("\n❌ Error: Auth token required\n");
  console.log("Usage: npx ts-node trigger-production-import.ts <AUTH_TOKEN>\n");
  console.log("To get an auth token:");
  console.log("1. Log in to the CRM as admin");
  console.log("2. Open browser console and run: localStorage.getItem('token')");
  console.log("3. Copy the token and pass it to this script\n");
  process.exit(1);
}

triggerImport(authToken);
