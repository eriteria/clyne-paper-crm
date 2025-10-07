-- Performance optimization indexes for dashboard queries
-- Run these SQL commands to dramatically improve dashboard performance

-- Index for user active status queries
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Index for invoice status queries (most important - 1282 invoices)
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Index for inventory low stock queries
CREATE INDEX IF NOT EXISTS idx_inventory_stock_comparison ON inventory_items(current_quantity, min_stock);

-- Index for inventory location joins
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_items(location_id);

-- Index for team member counts
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);

-- Index for invoice team assignments (for team-specific queries)
CREATE INDEX IF NOT EXISTS idx_invoices_team ON invoices(team_id);

-- Index for customer team assignments
CREATE INDEX IF NOT EXISTS idx_customers_team ON customers(team_id);

-- Composite index for invoice balance and status (for outstanding payments)
CREATE INDEX IF NOT EXISTS idx_invoices_balance_status ON invoices(balance, status);

-- Index for waybill status if needed
CREATE INDEX IF NOT EXISTS idx_waybills_status ON waybills(status);

-- Index for updated_at fields (for historical queries)
CREATE INDEX IF NOT EXISTS idx_inventory_updated ON inventory_items(updated_at);

-- Show index creation results
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('users', 'invoices', 'inventory_items', 'customers', 'waybills')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;