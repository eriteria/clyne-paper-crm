// Simple test setup
import { config } from "dotenv";
import { join } from "path";

// Load test environment variables
config({ path: join(__dirname, "..", ".env.test") });

// Set default test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "test-refresh-secret-key";

console.log("✅ Test environment configured");
