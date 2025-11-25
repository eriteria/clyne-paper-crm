import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

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
import userSettingsRoutes from "./routes/user-settings";
import locationRoutes from "./routes/locations";
import zohoAuthRoutes from "./routes/auth-zoho";
import salesReturnsRoutes from "./routes/sales-returns";
import adminImportRoutes from "./routes/admin-import";
import adminMaintenanceRoutes from "./routes/admin-maintenance";
import debugRoutes from "./routes/debug";
import maintenanceRoutes from "./routes/maintenance";
import bankAccountRoutes from "./routes/bankAccounts";

/**
 * Creates and configures the Express application
 * This factory function is designed for both production and testing environments
 */
export function createApp(options: { enableRateLimit?: boolean } = {}) {
  const app = express();
  const { enableRateLimit = false } = options;

  // Trust proxy for deployment platforms (set to 1 for Fly.io)
  app.set("trust proxy", 1);

  // Security and performance middleware
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // Rate limiting (disabled in tests by default)
  if (enableRateLimit) {
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"), // limit each IP to 100 requests per windowMs
      message: "Too many requests from this IP, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);
  }

  // CORS setup
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

  // Body parsing middleware
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
  app.use("/api/user-settings", userSettingsRoutes);
  app.use("/api/locations", locationRoutes);
  app.use("/api/auth/zoho", zohoAuthRoutes);
  app.use("/api/sales-returns", salesReturnsRoutes);
  app.use("/api/admin-import", adminImportRoutes);
  app.use("/api/admin-maintenance", adminMaintenanceRoutes);
  app.use("/api/maintenance", maintenanceRoutes); // Temporary maintenance endpoints
  app.use("/api/debug", debugRoutes); // Debug routes (dev only)
  app.use("/api/bank-accounts", bankAccountRoutes);

  // Error handling middleware
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
