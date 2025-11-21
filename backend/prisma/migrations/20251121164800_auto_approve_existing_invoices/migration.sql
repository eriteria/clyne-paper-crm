-- Auto-approve all existing invoices
-- This is a one-time migration to set all existing invoices to APPROVED status
-- New invoices created after this migration will start with PENDING status

UPDATE "invoices"
SET 
  "approval_status" = 'APPROVED',
  "approved_at" = CURRENT_TIMESTAMP
WHERE "approval_status" = 'PENDING';
