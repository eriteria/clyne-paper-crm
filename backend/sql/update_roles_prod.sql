-- Safe production role update
-- This script updates the `permissions` column (stored as a JSON string) for
-- the Admin and Super Admin roles only. It does NOT create or delete users.
-- Run this against your production database after taking a backup.

BEGIN;

-- Backup current permissions (optional): copy to roles_backup table if needed
-- You can create a backup table before running this script if you want
-- Example:
-- CREATE TABLE IF NOT EXISTS roles_backup AS TABLE roles WITH NO DATA;
-- INSERT INTO roles_backup (id, name, permissions, created_at, updated_at)
-- SELECT id, name, permissions, created_at, updated_at FROM roles WHERE name IN ('Admin','Super Admin');

-- Update Admin role permissions
UPDATE roles
SET permissions = '
["customers:view","customers:create","customers:edit","customers:delete","customers:export","customers:import",
"invoices:view","invoices:create","invoices:edit","invoices:delete","invoices:approve","invoices:export","invoices:import",
"payments:view","payments:create","payments:edit","payments:delete","payments:approve","payments:export","payments:import",
"users:view","users:create","users:edit","users:delete","users:activate","users:deactivate",
"roles:view","roles:create","roles:edit","roles:delete",
"teams:view","teams:create","teams:edit","teams:delete","teams:assign_members",
"locations:view","locations:create","locations:edit","locations:delete",
"products:view","products:create","products:edit","products:delete","products:manage_groups",
"inventory:view","inventory:create","inventory:edit","inventory:delete","inventory:adjust",
"waybills:view","waybills:create","waybills:edit","waybills:delete","waybills:approve",
"credits:view","credits:create","credits:apply","credits:delete",
"returns:view","returns:create","returns:approve","returns:delete",
"reports:view_dashboard","reports:view_sales","reports:view_ar_aging","reports:view_overdue","reports:view_payments","reports:view_inventory","reports:export",
"settings:view","settings:edit","settings:manage_regions",
"audit:view","admin:import_google_sheets","admin:fix_data","admin:view_logs"]'
WHERE name = 'Admin';

-- Update Super Admin role (if present)
UPDATE roles
SET permissions = '
["customers:view","customers:create","customers:edit","customers:delete","customers:export","customers:import",
"invoices:view","invoices:create","invoices:edit","invoices:delete","invoices:approve","invoices:export","invoices:import",
"payments:view","payments:create","payments:edit","payments:delete","payments:approve","payments:export","payments:import",
"users:view","users:create","users:edit","users:delete","users:activate","users:deactivate",
"roles:view","roles:create","roles:edit","roles:delete",
"teams:view","teams:create","teams:edit","teams:delete","teams:assign_members",
"locations:view","locations:create","locations:edit","locations:delete",
"products:view","products:create","products:edit","products:delete","products:manage_groups",
"inventory:view","inventory:create","inventory:edit","inventory:delete","inventory:adjust",
"waybills:view","waybills:create","waybills:edit","waybills:delete","waybills:approve",
"credits:view","credits:create","credits:apply","credits:delete",
"returns:view","returns:create","returns:approve","returns:delete",
"reports:view_dashboard","reports:view_sales","reports:view_ar_aging","reports:view_overdue","reports:view_payments","reports:view_inventory","reports:export",
"settings:view","settings:edit","settings:manage_regions",
"audit:view","admin:import_google_sheets","admin:fix_data","admin:view_logs"]'
WHERE name = 'Super Admin';

COMMIT;

-- End of script
