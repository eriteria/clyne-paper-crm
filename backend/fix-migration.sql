-- Fix partially applied migration 20251024142138_add_opening_balance_to_customer
-- This script is idempotent and safe to run multiple times

-- Add columns to customers table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='customers' AND column_name='opening_balance') THEN
        ALTER TABLE "customers" ADD COLUMN "opening_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='customers' AND column_name='return_policy_days') THEN
        ALTER TABLE "customers" ADD COLUMN "return_policy_days" INTEGER NOT NULL DEFAULT 30;
    END IF;
END $$;

-- Create sales_returns table if it doesn't exist
CREATE TABLE IF NOT EXISTS "sales_returns" (
    "id" TEXT NOT NULL,
    "return_number" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "refund_method" TEXT NOT NULL,
    "refund_status" TEXT NOT NULL DEFAULT 'Pending',
    "restock_status" TEXT NOT NULL DEFAULT 'Pending',
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

-- Create sales_return_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS "sales_return_items" (
    "id" TEXT NOT NULL,
    "sales_return_id" TEXT NOT NULL,
    "invoice_item_id" TEXT,
    "inventory_item_id" TEXT,
    "product_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity_returned" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "condition" TEXT NOT NULL,
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sales_return_items_pkey" PRIMARY KEY ("id")
);

-- Create indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "sales_returns_return_number_key" ON "sales_returns"("return_number");

-- Add foreign keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'sales_returns_invoice_id_fkey') THEN
        ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_invoice_id_fkey"
            FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'sales_returns_customer_id_fkey') THEN
        ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_customer_id_fkey"
            FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'sales_return_items_sales_return_id_fkey') THEN
        ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_sales_return_id_fkey"
            FOREIGN KEY ("sales_return_id") REFERENCES "sales_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'sales_return_items_inventory_item_id_fkey') THEN
        ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_inventory_item_id_fkey"
            FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
