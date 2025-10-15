# Simplified Customer-Level Accounting

## Overview

Changed from **invoice-payment allocation tracking** to **simple customer-level accounting**.

## The Problem (Old System)

The old system tracked granular payment allocations:

- Each payment had to be allocated to specific invoices via `PaymentApplication`
- `totalPaid` was calculated from `allocatedAmount` field
- Imported payments with no allocations weren't counted
- Complex credit management system
- Outstanding balance calculated from invoice-level balances

**Result**: Imported payments showed ₦0.00 paid, outstanding balance was incorrect.

## The Solution (New System)

### Simple Formula

```
Customer Balance = Total Invoices - Total Payments

If Balance > 0  → Outstanding Balance (customer owes money)
If Balance < 0  → Available Credit (customer overpaid)
```

### Implementation

**File**: `backend/src/services/paymentService.ts` - `getCustomerLedger()` function

```typescript
// Calculate customer summary - SIMPLIFIED CUSTOMER-LEVEL ACCOUNTING
const totalInvoiced = invoices.reduce(
  (sum, inv) => sum.add(inv.totalAmount),
  new Decimal(0)
);

// Sum ALL completed payments for this customer (regardless of allocation)
const totalPaid = payments
  .filter((pay) => pay.status === "COMPLETED")
  .reduce((sum, pay) => sum.add(pay.amount), new Decimal(0));

// Calculate actual balance: invoices - payments
const actualBalance = totalInvoiced.sub(totalPaid);

// If balance is negative, that's available credit
const totalCredit = actualBalance.isNegative()
  ? actualBalance.abs()
  : new Decimal(0);

// Outstanding balance is positive balance only
const totalBalance = actualBalance.isPositive()
  ? actualBalance
  : new Decimal(0);
```

## Key Changes

### Before

- ❌ `totalPaid` = Sum of `payment.allocatedAmount` (requires payment applications)
- ❌ `totalBalance` = Sum of `invoice.balance` (requires manual balance tracking)
- ❌ `totalCredit` = Sum of active credits (separate tracking)
- ❌ Imported payments weren't counted without allocations

### After

- ✅ `totalPaid` = Sum of ALL completed `payment.amount` (no allocations needed)
- ✅ `totalBalance` = `totalInvoiced - totalPaid` (if positive)
- ✅ `totalCredit` = `totalPaid - totalInvoiced` (if payments exceed invoices)
- ✅ All payments automatically count toward customer balance

## Benefits

1. **Simplicity**: No need to track payment-to-invoice allocations
2. **Accuracy**: All payments count, regardless of allocation status
3. **Import-Friendly**: Imported payments work immediately
4. **Automatic Credits**: Overpayments automatically become credits
5. **Real-World Accounting**: Matches how businesses actually track customer balances

## Backward Compatibility

- ✅ Existing payment applications still work (for detailed tracking if needed)
- ✅ Credit system can still be used for specific scenarios
- ✅ No database migration required
- ✅ Only changes the calculation logic, not the data structure

## Use Cases

### Scenario 1: Imported Payments (Your Case)

```
Customer: 050 RESTAURANT
Invoices: ₦416,600.00
Payments: ₦126,000.00 (imported, no allocations)

Old System: Total Paid = ₦0.00 (because allocatedAmount = 0)
New System: Total Paid = ₦126,000.00 (actual payment amount)
Outstanding: ₦290,600.00 (416,600 - 126,000)
```

### Scenario 2: Overpayment

```
Customer: ABC Company
Invoices: ₦100,000.00
Payments: ₦150,000.00

Old System: Required creating credit records manually
New System:
- Total Paid = ₦150,000.00
- Outstanding = ₦0.00
- Available Credit = ₦50,000.00 (automatic)
```

### Scenario 3: Regular Operations

```
Customer: XYZ Ltd
Invoice #1: ₦50,000.00
Invoice #2: ₦30,000.00
Payment #1: ₦40,000.00
Payment #2: ₦20,000.00

Old System: Track which payment goes to which invoice
New System:
- Total Invoiced = ₦80,000.00
- Total Paid = ₦60,000.00
- Outstanding = ₦20,000.00 (simple subtraction)
```

## What Still Uses Payment Applications?

Payment applications are **optional** and useful for:

- Detailed audit trails (which payment paid which invoice)
- Specific invoice-payment linking for compliance
- Historical tracking
- Manual allocation when needed

But they're **no longer required** for basic balance calculations.

## Impact on UI

### Customer Ledger Modal

- **Total Invoiced**: Sum of all invoice amounts (unchanged)
- **Total Paid**: Sum of ALL completed payments (now accurate!)
- **Outstanding Balance**: Invoices - Payments (simplified)
- **Available Credit**: Shows when payments exceed invoices (automatic)

### What Gets Fixed

- ✅ Imported payments now show correct amounts
- ✅ Outstanding balance is accurate
- ✅ Credits automatically calculated
- ✅ No more ₦0.00 payment issues

## Testing

After deployment, verify:

1. Customer ledger shows correct "Total Paid" for imported payments
2. Outstanding balance = Total Invoiced - Total Paid
3. Overpayments show as "Available Credit"
4. All customers with imported data show accurate balances

## Deployment

**Date**: October 13, 2025
**Status**: Deployed to production
**Rollback**: Simple - revert the `getCustomerLedger()` function

## Related Files

- `backend/src/services/paymentService.ts` - Main calculation logic
- `backend/src/scripts/fix-payment-allocations.ts` - No longer needed with new system
- `frontend/src/app/customers/page.tsx` - Customer ledger UI (no changes needed)

## Next Steps

With this simplified system:

1. ✅ No need for the "Fix Payment Allocations" script anymore
2. ✅ Future imports will work correctly out of the box
3. ✅ Credits are automatic when payments > invoices
4. ✅ Can optionally remove complex payment allocation code

---

**Result**: Customer-level accounting that matches real-world business practices and works correctly with imported data.
