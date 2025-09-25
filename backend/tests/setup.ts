import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { join } from "path";

// Test database setup
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || "file:./test.db",
    },
  },
});

beforeAll(async () => {
  // Set environment to test
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-key-for-testing-only";

  // Apply migrations to test database
  try {
    execSync("npx prisma migrate dev --name init", {
      cwd: join(__dirname, ".."),
      stdio: "pipe",
    });
  } catch (error) {
    // Migration might already exist, continue
  }

  // Prisma client should be generated before running tests
  // Run: npx prisma generate

  // Connect to database
  await prisma.$connect();
});

beforeEach(async () => {
  // Clean database between tests
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `.catch(async () => {
    // If PostgreSQL query fails, we're probably using SQLite
    // Clean SQLite tables
    await cleanSQLiteTables();
    return [];
  });

  // Clean PostgreSQL tables
  for (const { tablename } of tablenames) {
    if (tablename !== "_prisma_migrations") {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
});

async function cleanSQLiteTables() {
  // Get all table names from SQLite
  const tables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'
  `;

  // Delete all records from each table
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table.name}"`);
  }
}

afterAll(async () => {
  // Clean up and disconnect
  await prisma.$disconnect();
});

// Export prisma instance for tests
export { prisma };
