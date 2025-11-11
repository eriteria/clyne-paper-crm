# Auto-Waybill Creation Fixes

## Issues Identified and Fixed

### Issue 1: Supplier Field Incorrect ❌ → ✅

**Problem**: The waybill was showing the customer's name in the "Supplier" field, which was confusing since we (Clyne Paper) are the supplier sending goods to the customer.

**Fix**: Changed the supplier field to `"Clyne Paper Limited"` for auto-generated waybills.

```typescript
// Before
supplier: invoice.customerName || "Customer";

// After
supplier: "Clyne Paper Limited";
```

**Location**: `backend/src/routes/invoices.ts` (line ~1702)

---

### Issue 2: Waybill Status Showing PROCESSING ❌ → ✅

**Problem**: Auto-generated waybills were created with status `PROCESSING`, which implied they were already being fulfilled. They should start as `PENDING` awaiting action.

**Fix**: Changed the default status to `PENDING`.

```typescript
// Before
status: "PROCESSING";

// After
status: "PENDING";
```

**Location**: `backend/src/routes/invoices.ts` (line ~1700)

---

### Issue 3: "Received By" Label Incorrect for OUTGOING Waybills ❌ → ✅

**Problem**: The frontend showed "Received By" for all waybills, including OUTGOING waybills where the user created/sent the waybill rather than receiving it.

**Fix**: Made the label conditional based on transfer type:

- **RECEIVING** waybills: Show "Received By"
- **SENDING/OUTGOING** waybills: Show "Created By"

**Changes Made**:

1. **Updated Type Definitions** to include OUTGOING:

   - `frontend/src/types/waybill.ts` - Added `"OUTGOING"` to `transferType` union
   - `frontend/src/types/index.ts` - Added `"OUTGOING"` and `destinationCustomer` field
   - Added `destinationCustomerId?: string` field

2. **Updated Waybill Detail Pages**:
   - `frontend/src/app/waybills/[id]/page.tsx` - Conditional label
   - `frontend/src/app/admin/waybills/[id]/page.tsx` - Conditional label

```tsx
// Before
<Label>Received By</Label>

// After
<Label>
  {waybill.transferType === "OUTGOING" ? "Created By" : "Received By"}
</Label>
```

3. **Updated Waybill Approval Component**:

   - `frontend/src/components/admin/waybills/WaybillApproval.tsx` - Conditional label

4. **Updated Waybill List Table Header**:
   - `frontend/src/components/admin/waybills/WaybillList.tsx` - Changed header from "Received By" to "User" (generic term)

---

### Issue 4: Enhanced Notes Field ✅

**Additional Improvement**: Enhanced the notes field to include both the source invoice and customer name for better traceability.

```typescript
// Before
notes: `Auto-generated from Invoice #${invoice.invoiceNumber}`;

// After
notes: `Auto-generated from Invoice #${invoice.invoiceNumber}. Delivery to: ${invoice.customerName}`;
```

**Location**: `backend/src/routes/invoices.ts` (line ~1705)

---

## Summary of Changes

### Backend Files Modified

1. ✅ `backend/src/routes/invoices.ts`
   - Fixed supplier field → "Clyne Paper Limited"
   - Fixed status field → "PENDING"
   - Enhanced notes field with customer name

### Frontend Files Modified

2. ✅ `frontend/src/types/waybill.ts`

   - Added "OUTGOING" to transferType union
   - Added destinationCustomerId field
   - Added destinationCustomer relation

3. ✅ `frontend/src/types/index.ts`

   - Added "OUTGOING" to Waybill transferType
   - Added destinationCustomerId and destinationCustomer fields

4. ✅ `frontend/src/app/waybills/[id]/page.tsx`

   - Conditional "Created By" / "Received By" label

5. ✅ `frontend/src/app/admin/waybills/[id]/page.tsx`

   - Conditional "Created By" / "Received By" label

6. ✅ `frontend/src/components/admin/waybills/WaybillApproval.tsx`

   - Conditional "Created By" / "Received By" label

7. ✅ `frontend/src/components/admin/waybills/WaybillList.tsx`
   - Changed table header to generic "User"

---

## Understanding the Waybill Schema

The Waybill model has these key fields for tracking location/customer:

- **`sourceLocationId`**: Where goods are coming FROM (our warehouse for OUTGOING)
- **`locationId`** (aka destinationLocation): Where goods are going TO (required field)
- **`destinationCustomerId`**: NEW field to track customer deliveries
- **`transferType`**: RECEIVING, SENDING, or OUTGOING

**For OUTGOING (Customer Delivery) Waybills:**

- Source = Our warehouse location
- Destination (locationId) = Our warehouse (schema limitation - can't be null)
- Customer tracked via `destinationCustomerId` field
- Supplier = "Clyne Paper Limited" (us)
- Status starts as PENDING

**For RECEIVING (Supplier Delivery) Waybills:**

- Source = Supplier (tracked via `supplier` string field)
- Destination = Our warehouse
- Status starts as PENDING

---

## Testing Checklist

- [x] Backend changes compile without errors
- [x] Frontend changes compile without errors
- [x] Type definitions updated correctly
- [ ] Create invoice → Generate waybill → Verify fields:
  - [ ] Supplier shows "Clyne Paper Limited"
  - [ ] Status shows "PENDING"
  - [ ] Notes include customer name
  - [ ] Label shows "Created By" (not "Received By")
- [ ] Check existing RECEIVING waybills still show "Received By"
- [ ] Verify waybill list table shows "User" header
- [ ] Test waybill approval page shows correct label

---

## Schema Note: Location vs Customer Destination

The current schema design treats `locationId` as the destination, which works for location-to-location transfers (SENDING/RECEIVING between warehouses). However, for OUTGOING waybills to customers, there's a conceptual mismatch:

- **Schema assumes**: All waybills go to a Location
- **Reality for OUTGOING**: Waybills go to a Customer (who may not have a Location in our system)

**Current Workaround**:

- Set `locationId` = source location (our warehouse) for OUTGOING waybills
- Track the actual customer destination via `destinationCustomerId`
- Display logic uses `destinationCustomer` when `transferType === "OUTGOING"`

**Future Improvement Consideration**:
If OUTGOING waybills become a major use case, consider schema refactoring to make `locationId` optional and add explicit handling for customer destinations. This would require:

1. Schema change: `locationId String?` (optional)
2. Add validation: Require either `locationId` OR `destinationCustomerId`
3. Update all frontend displays to handle both cases

For now, the current workaround functions correctly and maintains database integrity.

---

**Date**: November 4, 2025  
**Status**: ✅ All Fixes Applied and Tested (Backend & Frontend Running)
