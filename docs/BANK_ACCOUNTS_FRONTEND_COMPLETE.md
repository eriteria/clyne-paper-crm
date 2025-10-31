# Bank Accounts System - Frontend Implementation Complete

## Overview

The frontend implementation for the bank accounts system is now complete. This includes reusable components, custom hooks, and a full admin management interface.

## Files Created

### 1. Custom Hooks (`frontend/src/hooks/useBankAccounts.ts`)

**Purpose:** React Query hooks for all bank account operations

**Exports:**

- `useBankAccounts()` - Fetch all active bank accounts
- `useBankAccount(id)` - Fetch single bank account by ID
- `useCreateBankAccount()` - Create new bank account (admin only)
- `useUpdateBankAccount()` - Update existing bank account (admin only)
- `useDeleteBankAccount()` - Soft delete bank account (admin only)

**Features:**

- Automatic query caching and invalidation
- TypeScript interfaces for type safety
- Error handling
- Optimistic updates

### 2. Payment Method Select Component (`frontend/src/components/PaymentMethodSelect.tsx`)

**Purpose:** Dropdown for selecting payment method (Cash/Bank Transfer)

**Props:**

- `value` - Current selected value
- `onChange` - Callback when value changes
- `error` - Error message to display
- `required` - Whether field is required
- `disabled` - Whether field is disabled
- `label` - Custom label text

**Usage:**

```tsx
<PaymentMethodSelect
  value={paymentMethod}
  onChange={(method) => setPaymentMethod(method)}
  required
  label="Payment Method"
/>
```

### 3. Bank Account Select Component (`frontend/src/components/BankAccountSelect.tsx`)

**Purpose:** Dropdown for selecting a bank account

**Props:**

- `value` - Current selected bank account ID
- `onChange` - Callback when selection changes
- `error` - Error message to display
- `required` - Whether field is required
- `disabled` - Whether field is disabled
- `label` - Custom label text
- `placeholder` - Placeholder text

**Features:**

- Automatically fetches active bank accounts
- Shows loading state
- Displays account details (name, number, bank)
- Error handling

**Usage:**

```tsx
<BankAccountSelect
  value={bankAccountId}
  onChange={(id) => setBankAccountId(id)}
  required
  label="Bank Account"
/>
```

### 4. Bank Account Override Modal (`frontend/src/components/BankAccountOverrideModal.tsx`)

**Purpose:** Modal for overriding bank account when downloading invoice PDF

**Props:**

- `isOpen` - Whether modal is visible
- `onClose` - Callback to close modal
- `onDownload` - Callback with selected bank account ID
- `currentBankAccountId` - Invoice's current bank account
- `currentPaymentMethod` - Invoice's payment method
- `invoiceNumber` - For display purposes

**Features:**

- Shows current payment method and bank account
- Allows selecting different bank account
- Handles cash payments (shows note, no override)
- Only passes override ID if different from current
- Responsive design
- Accessible UI

**Usage:**

```tsx
<BankAccountOverrideModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onDownload={(bankAccountId) => {
    downloadPDF(invoiceId, bankAccountId);
  }}
  currentBankAccountId={invoice.bankAccountId}
  currentPaymentMethod={invoice.paymentMethod}
  invoiceNumber={invoice.invoiceNumber}
/>
```

### 5. Admin Bank Accounts Page (`frontend/src/app/admin/bank-accounts/page.tsx`)

**Purpose:** Full CRUD interface for managing bank accounts

**Features:**

- **List View:**

  - Table showing all bank accounts
  - Displays account name, number, bank name, status
  - Active/inactive status badge with toggle
  - Edit and delete actions per row
  - Empty state message

- **Create/Edit Modal:**

  - Form for account name, number, bank name
  - Active status checkbox
  - Validation
  - Loading states
  - Error handling

- **Operations:**
  - Create new bank account
  - Update existing bank account
  - Toggle active/inactive status
  - Soft delete (deactivate) bank account
  - Real-time updates via React Query

**Access:** Admin only (route should be protected)

## Integration Guide

### Adding Payment Method & Bank Account to Invoice Form

Here's how to integrate the components into an existing invoice form:

```tsx
import { useState, useEffect } from "react";
import {
  PaymentMethodSelect,
  PaymentMethod,
} from "@/components/PaymentMethodSelect";
import { BankAccountSelect } from "@/components/BankAccountSelect";

function InvoiceForm() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [bankAccountId, setBankAccountId] = useState("");

  // Reset bank account when payment method changes to cash
  useEffect(() => {
    if (paymentMethod === "CASH") {
      setBankAccountId("");
    }
  }, [paymentMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invoiceData = {
      // ... other invoice fields
      paymentMethod: paymentMethod || null,
      bankAccountId: paymentMethod === "BANK_TRANSFER" ? bankAccountId : null,
    };

    // Save invoice...
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Other invoice fields... */}

      <PaymentMethodSelect
        value={paymentMethod}
        onChange={setPaymentMethod}
        required
      />

      {/* Show bank account selector only for bank transfers */}
      {paymentMethod === "BANK_TRANSFER" && (
        <BankAccountSelect
          value={bankAccountId}
          onChange={setBankAccountId}
          required
        />
      )}

      <button type="submit">Create Invoice</button>
    </form>
  );
}
```

### Adding PDF Download with Bank Account Override

Here's how to integrate the override modal into an invoice list or detail page:

```tsx
import { useState } from "react";
import { BankAccountOverrideModal } from "@/components/BankAccountOverrideModal";
import { Download } from "lucide-react";

function InvoiceList() {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDownloadPDF = async (
    invoiceId: string,
    bankAccountId?: string
  ) => {
    try {
      // Build URL with optional bank account override
      const url = bankAccountId
        ? `/api/invoices/${invoiceId}/pdf?bankAccountId=${bankAccountId}`
        : `/api/invoices/${invoiceId}/pdf`;

      // Download PDF
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to download PDF. Please try again.");
    }
  };

  return (
    <div>
      {invoices.map((invoice) => (
        <div key={invoice.id}>
          {/* Invoice details... */}

          <button
            onClick={() => {
              setSelectedInvoice(invoice);
              setIsModalOpen(true);
            }}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </button>
        </div>
      ))}

      {selectedInvoice && (
        <BankAccountOverrideModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedInvoice(null);
          }}
          onDownload={(bankAccountId) => {
            handleDownloadPDF(selectedInvoice.id, bankAccountId);
          }}
          currentBankAccountId={selectedInvoice.bankAccountId}
          currentPaymentMethod={selectedInvoice.paymentMethod}
          invoiceNumber={selectedInvoice.invoiceNumber}
        />
      )}
    </div>
  );
}
```

## Next Steps for Full Integration

### 1. Update Invoice Creation/Edit Forms

**Files to modify:**

- `frontend/src/app/invoices/page.tsx` (or wherever invoice form is)
- `frontend/src/app/invoices/[id]/page.tsx` (if edit page exists)

**Changes needed:**

1. Import `PaymentMethodSelect` and `BankAccountSelect`
2. Add state for `paymentMethod` and `bankAccountId`
3. Add conditional rendering (show bank account only if BANK_TRANSFER)
4. Update API calls to include these fields
5. Handle edit mode (populate fields from existing invoice)

### 2. Update Invoice List/Detail Pages

**Files to modify:**

- `frontend/src/app/invoices/page.tsx` (list view)
- `frontend/src/app/invoices/[id]/page.tsx` (detail view)

**Changes needed:**

1. Import `BankAccountOverrideModal`
2. Replace direct PDF download links with modal trigger
3. Implement `handleDownloadPDF` function
4. Pass invoice data to modal

### 3. Update Payment Recording

**Files to modify:**

- Payment recording form components

**Changes needed:**

1. Import `PaymentMethodSelect` and `BankAccountSelect`
2. Add fields to payment form
3. Update API call to include `bankAccountId`
4. Handle validation (bank account required for bank transfers)

### 4. Add Navigation to Bank Accounts Page

**File to modify:**

- `frontend/src/components/Layout.tsx` (or wherever admin nav is)

**Add link:**

```tsx
<Link href="/admin/bank-accounts">Bank Accounts</Link>
```

### 5. Add Route Protection

**File to modify:**

- `frontend/src/app/admin/bank-accounts/page.tsx`

**Add protection:**

```tsx
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function BankAccountsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role.name !== "Admin") {
      router.push("/");
    }
  }, [user, router]);

  // ... rest of component
}
```

## Testing Checklist

### Component Testing

- [ ] **PaymentMethodSelect**

  - [ ] Displays correctly
  - [ ] Shows both options (Cash/Bank Transfer)
  - [ ] Fires onChange when selection changes
  - [ ] Shows error message when provided
  - [ ] Respects disabled state
  - [ ] Respects required attribute

- [ ] **BankAccountSelect**

  - [ ] Fetches and displays bank accounts
  - [ ] Shows loading state while fetching
  - [ ] Shows error if fetch fails
  - [ ] Displays account details in dropdown
  - [ ] Fires onChange with account ID
  - [ ] Respects disabled state

- [ ] **BankAccountOverrideModal**

  - [ ] Opens and closes correctly
  - [ ] Shows current payment method
  - [ ] Shows current bank account (if not cash)
  - [ ] Allows selecting different bank account
  - [ ] Handles cash payments correctly
  - [ ] Passes correct bank account ID on download
  - [ ] Only passes override if different from current

- [ ] **Bank Accounts Management Page**
  - [ ] Lists all bank accounts
  - [ ] Shows correct status badges
  - [ ] Opens create modal
  - [ ] Opens edit modal with prepopulated data
  - [ ] Creates new bank account
  - [ ] Updates existing bank account
  - [ ] Toggles active/inactive status
  - [ ] Soft deletes bank account with confirmation
  - [ ] Shows loading states
  - [ ] Handles errors gracefully

### Integration Testing

- [ ] **Invoice Creation**

  - [ ] Can create invoice with cash payment
  - [ ] Can create invoice with bank transfer + account
  - [ ] Bank account field hidden for cash payments
  - [ ] Bank account field required for bank transfers
  - [ ] Data saves correctly to backend

- [ ] **Invoice Editing**

  - [ ] Loads existing payment method and bank account
  - [ ] Can change payment method
  - [ ] Can change bank account
  - [ ] Changing to cash clears bank account

- [ ] **PDF Download**
  - [ ] Modal opens with correct invoice data
  - [ ] Can download with default bank account
  - [ ] Can download with overridden bank account
  - [ ] Download works for cash invoices
  - [ ] PDF shows correct bank account details

## API Integration

All components use the custom hooks from `useBankAccounts.ts` which communicate with these backend endpoints:

- `GET /api/bank-accounts` - List active bank accounts
- `GET /api/bank-accounts/:id` - Get single bank account
- `POST /api/bank-accounts` - Create bank account (admin)
- `PATCH /api/bank-accounts/:id` - Update bank account (admin)
- `DELETE /api/bank-accounts/:id` - Soft delete bank account (admin)

Invoice endpoints already support:

- `paymentMethod` field (CASH/BANK_TRANSFER)
- `bankAccountId` field (foreign key to bank account)
- `?bankAccountId=xxx` query param on PDF endpoint for override

## Styling

All components use:

- **Tailwind CSS** for styling
- **Lucide React** icons
- Consistent color scheme (blue for primary actions, red for destructive)
- Responsive design
- Accessible form elements
- Loading and error states

## Status Summary

✅ **Frontend Complete:**

- ✅ Custom React Query hooks
- ✅ Payment method select component
- ✅ Bank account select component
- ✅ Bank account override modal
- ✅ Admin bank accounts management page
- ✅ TypeScript interfaces and type safety
- ✅ Error handling and loading states
- ✅ Responsive design
- ✅ Accessible UI components

⏳ **Integration Pending:**

- ⏳ Add payment fields to invoice creation form
- ⏳ Add payment fields to invoice edit form
- ⏳ Replace PDF download with modal in invoice list
- ⏳ Replace PDF download with modal in invoice detail
- ⏳ Add bank account to payment recording
- ⏳ Add navigation link to admin bank accounts page
- ⏳ Add route protection for admin pages
- ⏳ Test end-to-end workflows

---

**Status:** ✅ Phase 2 Complete - Frontend Components Done  
**Next:** Integration with existing invoice and payment forms  
**Date:** October 31, 2025  
**Version:** 1.0
