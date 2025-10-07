import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app";

// Import utils
import { logger } from "./utils/logger";

// Load environment variables
dotenv.config();

// Ensure BigInt values serialize safely in JSON responses
// Converts BigInt to number when safe, otherwise to string
// This prevents: TypeError: Do not know how to serialize a BigInt
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function toJSONBigInt() {
  const asNumber = Number(this);
  return Number.isSafeInteger(asNumber) ? asNumber : this.toString();
};

// Initialize Prisma
export const prisma = new PrismaClient();

// Create Express app with rate limiting only in production
const app = createApp({
  enableRateLimit: process.env.NODE_ENV === "production",
});
const PORT = parseInt(process.env.PORT || "5000", 10);

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📚 Environment: ${process.env.NODE_ENV}`);
});

export default app;
