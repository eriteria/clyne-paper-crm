import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;

/**
 * Get or create a Prisma client instance for testing
 */
export function getTestPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
      log: process.env.DEBUG_TESTS ? ["query", "error", "warn"] : ["error"],
    });
  }
  return prismaInstance;
}

/**
 * Clean all tables in the test database
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  const tables = [
    "audit_logs",
    "credit_applications",
    "credits",
    "customer_payments",
    "sales_return_items",
    "sales_returns",
    "invoice_items",
    "invoices",
    "payments",
    "waybill_items",
    "waybills",
    "inventory_items",
    "products",
    "product_groups",
    "monthly_sales_targets",
    "team_locations",
    "user_locations",
    "customers",
    "users",
    "teams",
    "locations",
    "regions",
    "roles",
    "bank_accounts",
    "quickbooks_exports",
  ];

  // Disable foreign key checks temporarily
  await prisma.$executeRawUnsafe("SET session_replication_role = 'replica';");

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (error) {
      // Table might not exist, continue
      console.warn(`Failed to truncate table ${table}:`, error);
    }
  }

  // Re-enable foreign key checks
  await prisma.$executeRawUnsafe("SET session_replication_role = 'origin';");
}

/**
 * Seed basic test data (roles, locations, etc.)
 */
export async function seedBasicData(prisma: PrismaClient): Promise<{
  adminRole: any;
  managerRole: any;
  staffRole: any;
  testLocation: any;
  testRegion: any;
}> {
  // Create roles
  const adminRole = await prisma.role.create({
    data: {
      name: "admin",
      permissions: "*",
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      name: "manager",
      permissions: "read,write,approve",
    },
  });

  const staffRole = await prisma.role.create({
    data: {
      name: "staff",
      permissions: "read,write",
    },
  });

  // Create region
  const testRegion = await prisma.region.create({
    data: {
      name: "Test Region",
    },
  });

  // Create location
  const testLocation = await prisma.location.create({
    data: {
      name: "Test Location",
      code: "TEST01",
      address: "123 Test Street",
      city: "Test City",
      state: "Test State",
      country: "Nigeria",
    },
  });

  return {
    adminRole,
    managerRole,
    staffRole,
    testLocation,
    testRegion,
  };
}

/**
 * Disconnect from the test database
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

/**
 * Setup test database with migrations
 */
export async function setupTestDatabase(): Promise<void> {
  const prisma = getTestPrismaClient();
  await prisma.$connect();

  // Run migrations
  const { execSync } = require("child_process");
  const path = require("path");

  try {
    execSync("npx prisma migrate deploy", {
      cwd: path.join(__dirname, "../.."),
      stdio: "pipe",
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    });
  } catch (error) {
    console.error("Failed to run migrations:", error);
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, message = "Condition not met" } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout: ${message}`);
}

/**
 * Generate unique identifier for test data
 */
export function generateTestId(prefix: string = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
