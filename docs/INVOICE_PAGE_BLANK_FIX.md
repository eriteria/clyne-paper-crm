# Invoice Page Blank Screen Fix

## Issue

When clicking the download button on the invoice list page, the webpage went blank.

## Root Cause

The issue was caused by **TypeScript compilation errors** that prevented the page from rendering properly:

1. **Missing type definitions**: The `Invoice` interface was missing the `paymentMethod` and `bankAccountId` properties
2. **React Hook Rule violation**: Hooks were being called **after** an early return statement (permission check)
3. **Unused import**: The `downloadInvoicePDF` function was imported but never used

## Fix Applied

### 1. Updated Invoice Type Definition (`frontend/src/types/index.ts`)

Added missing fields to the `Invoice` interface:

```typescript
export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerContact?: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  notes?: string;
  dueDate?: string;
  status: InvoiceStatus;
  paymentMethod?: string; // ✅ ADDED
  bankAccountId?: string; // ✅ ADDED
  balance?: number; // ✅ ADDED
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  billedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  team?: {
    id: string;
    name: string;
  };
  region?: {
    id: string;
    name: string;
  };
  bankAccount?: {
    // ✅ ADDED
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  items: InvoiceItem[];
}
```

These fields exist in the database schema (`backend/prisma/schema.prisma`) but were missing from the frontend type definition.

### 2. Fixed React Hook Rule Violation (`frontend/src/app/invoices/page.tsx`)

**Problem**: Permission check with early return was placed **before** hook declarations.

**React Rule**: All hooks must be called in the same order on every render. Early returns before hooks violate this rule.

**Before (❌ BROKEN):**

```typescript
export default function InvoicesPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  // ❌ Early return BEFORE hooks
  if (!hasPermission("invoices:view")) {
    return <AccessDenied />;
  }

  // ❌ Hooks called AFTER conditional return
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const { data, isLoading } = useQuery(...);
  // ... more hooks
}
```

**After (✅ FIXED):**

```typescript
export default function InvoicesPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  // ✅ All hooks declared first
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(null);
  // ... all other hooks
  const { data: invoicesData, isLoading } = useQuery(...);
  const { data: invoiceStats } = useQuery(...);
  const postDraftMutation = useMutation(...);
  const deleteMutation = useMutation(...);
  useEffect(() => { ... }, [...]);

  // ✅ Permission check AFTER all hooks
  if (!hasPermission("invoices:view")) {
    return <AccessDenied />;
  }

  // ✅ Loading check after permission
  if (isLoading) {
    return <Loading />;
  }

  return <InvoiceList />;
}
```

### 3. Removed Unused Import

Removed `downloadInvoicePDF` from imports as it's no longer used (replaced by `BankAccountOverrideModal`).

**Before:**

```typescript
import { downloadInvoicePDF } from "@/lib/utils";
```

**After:**

```typescript
// Removed - using BankAccountOverrideModal instead
```

### 4. Fixed HTML Entity in JSX

Changed apostrophe in "don't" to proper HTML entity:

**Before:**

```jsx
<p>You don't have permission...</p>
```

**After:**

```jsx
<p>You don&apos;t have permission...</p>
```

## Why This Caused a Blank Page

1. **TypeScript compilation failed** due to missing type properties
2. **React couldn't render** the component due to hook rule violations
3. **Browser showed blank page** instead of error (production build behavior)
4. **Development console** would show errors, but page remains blank

## Verification

### ✅ TypeScript Compilation

```bash
cd frontend
npm run build
# Should complete without errors
```

### ✅ No ESLint Errors

```bash
npm run lint
# Should show no errors for invoices/page.tsx
```

### ✅ Runtime Testing

1. Start frontend: `npm run dev`
2. Navigate to `/invoices`
3. Click download button on any invoice
4. Verify:
   - ✅ Bank Account Override Modal opens
   - ✅ Page doesn't go blank
   - ✅ PDF downloads successfully
   - ✅ No console errors

## Files Modified

1. ✅ `frontend/src/types/index.ts` - Added missing Invoice fields
2. ✅ `frontend/src/app/invoices/page.tsx` - Fixed hook ordering and removed unused import

## Related Features

This fix ensures the **Bank Accounts Integration** works properly:

- Invoice PDF download with bank account override
- Payment method selection on invoices
- Bank account selection for payments
- Default bank account handling

See `docs/BANK_ACCOUNTS_COMPLETE_INTEGRATION.md` for full feature documentation.

## React Hook Rules Reference

**The Rule**: Hooks must be called in the **exact same order** on every render.

**Why**: React relies on the order of hook calls to track state between renders.

**Common Violations**:

- ❌ Calling hooks inside conditionals
- ❌ Calling hooks inside loops
- ❌ Calling hooks after early returns
- ❌ Calling hooks in callbacks

**Correct Pattern**:

1. Declare all hooks at the top of the component
2. Keep hooks unconditional
3. Place conditional logic/returns **after** all hooks
4. Use conditional logic **inside** hooks if needed

**Resources**:

- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [ESLint Plugin: react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)

---

**Status:** ✅ Fixed  
**Version:** 1.0  
**Date:** October 31, 2025  
**Files Modified:** 2

- `frontend/src/types/index.ts`
- `frontend/src/app/invoices/page.tsx`
