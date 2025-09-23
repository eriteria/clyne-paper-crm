import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import teamRoutes from "./routes/teams";
import regionRoutes from "./routes/regions";
import roleRoutes from "./routes/roles";
import inventoryRoutes from "./routes/inventory";
import waybillRoutes from "./routes/waybills";
import invoiceRoutes from "./routes/invoices";
import customerRoutes from "./routes/customers";
import reportRoutes from "./routes/reports";
import adminRoutes from "./routes/admin";
import financialRoutes from "./routes/financial";
import importRoutes from "./routes/import";
import productRoutes from "./routes/products";
import productGroupRoutes from "./routes/productGroups";
import auditLogRoutes from "./routes/auditLogs";
import salesTargetRoutes from "./routes/salesTargets";
import paymentRoutes from "./routes/payments";
import notificationRoutes from "./routes/notifications";
import dataManagementRoutes from "./routes/dataManagement";
import settingsRoutes from "./routes/settings";
import locationRoutes from "./routes/locations";

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

// Create Express app
const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Trust proxy for Fly.io
app.set("trust proxy", true);

// Middleware
app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3001",
      "https://clyne-paper-crm-frontend.fly.dev",
      "https://crm.clynepaper.com.ng",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/regions", regionRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/waybills", waybillRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/financial", financialRoutes);
app.use("/api/import", importRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-groups", productGroupRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/sales-targets", salesTargetRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/data-management", dataManagementRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/locations", locationRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

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
