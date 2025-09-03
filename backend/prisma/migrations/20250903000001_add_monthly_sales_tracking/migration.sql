-- Add monthly sales tracking table
-- This migration adds a table to track monthly sales targets and achievements

CREATE TABLE "monthly_sales_targets" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "target_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "achieved_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "target_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "achieved_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_sales_targets_pkey" PRIMARY KEY ("id")
);

-- Add indexes for efficient querying
CREATE INDEX "monthly_sales_targets_product_id_idx" ON "monthly_sales_targets"("product_id");
CREATE INDEX "monthly_sales_targets_user_id_idx" ON "monthly_sales_targets"("user_id");
CREATE INDEX "monthly_sales_targets_year_month_idx" ON "monthly_sales_targets"("year", "month");

-- Add unique constraint to prevent duplicate records for same product/user/month
CREATE UNIQUE INDEX "monthly_sales_targets_product_user_year_month_key" ON "monthly_sales_targets"("product_id", "user_id", "year", "month");

-- Add foreign key constraints
ALTER TABLE "monthly_sales_targets" ADD CONSTRAINT "monthly_sales_targets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "monthly_sales_targets" ADD CONSTRAINT "monthly_sales_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
