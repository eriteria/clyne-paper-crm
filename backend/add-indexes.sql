-- Add performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_reorder ON inventory_items(current_quantity, min_stock);