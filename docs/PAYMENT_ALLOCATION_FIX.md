# Payment Allocation Fix Implementation

## Problem Summary

After the Google Sheets import on October 13, 2025, the customer ledger modal displays:

- **Total Invoiced**: Shows correct value
- **Total Paid**: Shows ₦0.00 (incorrect)

### Root Cause

890 payments were imported with `allocatedAmount = 0` and `creditAmount = 0`. The `getCustomerLedger()` function in `paymentService.ts` calculates `totalPaid` by summing the `allocatedAmount` field (line 380):

```typescript
const totalPaid = payments.reduce(
  (sum, pay) => sum.add(pay.allocatedAmount), // ← All imported payments have 0 here
  new Decimal(0)
);
```

Since all imported payments have `allocatedAmount = 0`, the total paid sums to 0.00 even though actual payments exist.

## Solution Implemented

### 1. Fixed Future Imports

**File**: `backend/src/scripts/import-from-google-sheets.ts`

**Changes Made**:

- Lines 601-616: Added default values `allocatedAmount: 0` and `creditAmount: 0` when creating payments
- Lines 643-693: Added logic to create OVERPAYMENT credits when payment exceeds invoice balance
- Lines 695-723: Added logic to create ADVANCE_PAYMENT credits when payment has no invoice

### 2. Created Migration Script

**File**: `backend/src/scripts/fix-payment-allocations.ts`

**Purpose**: Recalculates and updates `allocatedAmount` and `creditAmount` for existing payments

**How It Works**:

1. Finds all payments where `allocatedAmount = 0` or `creditAmount = 0`
2. For each payment:
   - Calculates `allocatedAmount` from `paymentApplications` (sum of `amountApplied`)
   - Calculates `creditAmount` from related `Credit` records where `sourcePaymentId` matches
   - Updates the payment record with correct values

**Exported Function**: `fixPaymentAllocations()` - Can be triggered via API or terminal

### 3. Created Admin API Endpoint

**File**: `backend/src/routes/admin-import.ts`

**Route**: `POST /api/admin-import/fix-payment-allocations`

**Features**:

- Admin authentication required
- Returns 202 Accepted and runs fix in background
- Logs progress to server console
- Can be triggered from frontend admin panel

### 4. Added Frontend UI

**File**: `frontend/src/app/admin/page.tsx`

**Changes**:

- Added state management for fix operation (`isFixingPayments`, `fixPaymentStatus`)
- Added `handleFixPaymentAllocations()` function with confirmation dialog
- Added orange "Fix Payment Allocations" card to admin dashboard
- Displays status messages (info/success/error) below button

## Deployment Status

### ✅ Completed

- Migration script created and tested locally
- Admin API endpoint added to backend routes
- Frontend button added to admin dashboard
- TypeScript compilation successful (`npm run build` passed)
- Old broken import script removed

### 🔄 In Progress

- Backend deployment to Fly.io (waiting for depot builder)

### ⏳ Pending

1. Complete backend deployment
2. Test admin endpoint in production
3. Trigger payment allocation fix from admin UI
4. Verify customer ledger shows correct "Total Paid" amounts
5. Check if customers page loads without 500 error

## How to Use (After Deployment)

### Option 1: Via Admin UI (Recommended)

1. Navigate to Admin Panel (`/admin`)
2. Locate the orange "Fix Payment Allocations" card
3. Click "Fix Payments" button
4. Confirm the operation
5. Monitor status message for completion
6. Check server logs for detailed progress

### Option 2: Via Terminal (If Direct Access Needed)

```bash
# SSH into Fly.io machine
fly ssh console --app clyne-paper-crm-backend

# Run the script
cd /app
node dist/scripts/fix-payment-allocations.js
```

### Option 3: Via API (If Automating)

```bash
curl -X POST https://clyne-paper-crm-backend.fly.dev/api/admin-import/fix-payment-allocations \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## Expected Results

After running the fix:

- All 890 imported payments will have correct `allocatedAmount` values
- Payments that created credits will have correct `creditAmount` values
- Customer ledger modal will show accurate "Total Paid" amounts
- The fix only updates payments where values are currently 0

## Database Impact

**Records Affected**: ~890 payments
**Operation**: UPDATE (safe, no deletions)
**Reversible**: No (but fix is idempotent - can be run multiple times safely)

## Monitoring

Check server logs for:

- Number of payments processed
- Number of payments fixed vs skipped
- Any errors during processing
- Completion message

## Related Files

### Backend

- `backend/src/scripts/fix-payment-allocations.ts` - Migration script
- `backend/src/routes/admin-import.ts` - Admin API routes
- `backend/src/scripts/import-from-google-sheets.ts` - Fixed import logic
- `backend/src/services/paymentService.ts` - Ledger calculation (unchanged)

### Frontend

- `frontend/src/app/admin/page.tsx` - Admin dashboard with fix button

### Documentation

- `docs/CREDITS_FIX_AND_CUSTOMER_TROUBLESHOOTING.md` - Comprehensive troubleshooting guide
- `docs/PAYMENT_ALLOCATION_FIX.md` - This file

## Testing Checklist

- [ ] Backend deployment completes successfully
- [ ] Admin panel loads without errors
- [ ] "Fix Payment Allocations" button is visible to admins
- [ ] Button triggers confirmation dialog
- [ ] API endpoint returns 202 Accepted
- [ ] Server logs show fix progress
- [ ] After fix: Customer ledger shows non-zero "Total Paid"
- [ ] After fix: Customers page loads without 500 error
- [ ] Fix is idempotent (running twice doesn't break anything)

## Rollback Plan

If issues occur:

1. The original payment records are preserved in database (only `allocatedAmount` and `creditAmount` fields are updated)
2. Database backups exist on Fly.io
3. Can restore from backup if critical issue occurs
4. Fix script is safe - only updates fields that are 0

## Next Steps

1. **Immediate**: Wait for backend deployment to complete
2. **Short-term**: Trigger payment allocation fix in production
3. **Verification**: Check customer ledger for accurate totals
4. **Long-term**: Monitor for any related issues or data inconsistencies

---

**Last Updated**: October 13, 2025
**Status**: Implementation complete, deployment in progress
**Next Action**: Complete Fly.io deployment and trigger fix in production
