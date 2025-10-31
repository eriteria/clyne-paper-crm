# Bank Accounts System Implementation

## Overview

This document outlines the implementation of the **Bank Accounts System** for the Clyne Paper CRM. This system allows the organization to:

1. Manage multiple bank accounts in the database
2. Link invoices to specific bank accounts
3. Track customer payments to specific bank accounts
4. Display bank account details on invoice PDFs
5. Support both CASH and BANK_TRANSFER payment methods

## Database Schema Changes

### New BankAccount Model

```prisma
model BankAccount {
  id               String            @id @default(cuid())
  accountName      String            @map("account_name")
  accountNumber    String            @map("account_number")
  bankName         String            @map("bank_name")
  isActive         Boolean           @default(true) @map("is_active")
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")
  invoices         Invoice[]
  customerPayments CustomerPayment[]

  @@map("bank_accounts")
}
```

### Updated Invoice Model

Added fields:

- `paymentMethod String? @map("payment_method")` - Can be "CASH" or "BANK_TRANSFER"
- `bankAccountId String? @map("bank_account_id")` - Foreign key to BankAccount
- `bankAccount BankAccount?` - Relation to BankAccount

### Updated CustomerPayment Model

Added fields:

- `bankAccountId String? @map("bank_account_id")` - Foreign key to BankAccount
- `bankAccount BankAccount?` - Relation to BankAccount

## Migration

**Migration Name:** `20251031105812_add_bank_accounts_system`

**What it does:**

1. Creates the `bank_accounts` table
2. Adds `bank_account_id` column to `invoices` table
3. Adds `payment_method` column to `invoices` table
4. Adds `bank_account_id` column to `customer_payments` table
5. Sets up foreign key constraints with `ON DELETE SET NULL`

**Status:** ✅ Successfully applied to development database

## Backend API Implementation

### Routes: `/api/bank-accounts`

#### 1. GET `/api/bank-accounts`

- **Access:** Authenticated users
- **Description:** Get all active bank accounts
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "default-bank-account",
        "accountName": "CLYNE PAPER LIMITED",
        "accountNumber": "2045723876",
        "bankName": "FIRST BANK",
        "isActive": true,
        "createdAt": "2025-10-31T12:00:00.000Z",
        "updatedAt": "2025-10-31T12:00:00.000Z"
      }
    ]
  }
  ```

#### 2. GET `/api/bank-accounts/:id`

- **Access:** Authenticated users
- **Description:** Get a single bank account with usage counts
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "default-bank-account",
      "accountName": "CLYNE PAPER LIMITED",
      "accountNumber": "2045723876",
      "bankName": "FIRST BANK",
      "isActive": true,
      "_count": {
        "invoices": 42,
        "customerPayments": 15
      }
    }
  }
  ```

#### 3. POST `/api/bank-accounts`

- **Access:** Admin only
- **Description:** Create a new bank account
- **Request Body:**
  ```json
  {
    "accountName": "CLYNE PAPER LIMITED",
    "accountNumber": "1234567890",
    "bankName": "ZENITH BANK",
    "isActive": true
  }
  ```

#### 4. PATCH `/api/bank-accounts/:id`

- **Access:** Admin only
- **Description:** Update an existing bank account
- **Request Body:** (all fields optional)
  ```json
  {
    "accountName": "NEW ACCOUNT NAME",
    "accountNumber": "9876543210",
    "bankName": "GTBank",
    "isActive": false
  }
  ```

#### 5. DELETE `/api/bank-accounts/:id`

- **Access:** Admin only
- **Description:** Soft delete a bank account (sets `isActive = false`)
- **Note:** This is a soft delete to preserve historical data on linked invoices/payments

## Seed Data

**Default Bank Account:**

- ID: `default-bank-account`
- Account Name: `CLYNE PAPER LIMITED`
- Account Number: `2045723876`
- Bank Name: `FIRST BANK`
- Status: Active

**Seeder Location:** `backend/src/seeders/seedBankAccounts.ts`

**Run Command:** `npx ts-node src/seeders/seedBankAccounts.ts`

## Configuration Changes

### Database Connection Fix

**Issue:** Prisma was unable to connect using `localhost:5432`

**Solution:** Updated `backend/.env` to use `127.0.0.1` instead:

```env
DATABASE_URL="postgresql://crm:Waiba2001@127.0.0.1:5432/crm"
```

**Reason:** Windows networking behavior sometimes prevents Node.js from resolving `localhost` to IPv4 address.

## Testing the API

### 1. Get All Bank Accounts

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/bank-accounts
```

### 2. Get Single Bank Account

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/bank-accounts/default-bank-account
```

### 3. Create New Bank Account (Admin)

```bash
curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountName":"CLYNE PAPER LIMITED","accountNumber":"1234567890","bankName":"ZENITH BANK"}' \
  http://localhost:5000/api/bank-accounts
```

## Next Steps

### Phase 1: Update Invoice PDF Generation ⏳

**File:** `backend/src/routes/invoices.ts`

**Current Implementation:** Line 519 has hard-coded bank details:

```typescript
doc.text(
  `ACCOUNT NAME: CLYNE PAPER LIMITED   ACCOUNT NO: 2045723876   BANK: FIRST BANK`,
  40,
  95
);
```

**Required Changes:**

1. **Update Invoice Query** (around line 447)

   ```typescript
   const invoice = await prisma.invoice.findUnique({
     where: { id: invoiceId },
     include: {
       items: {
         include: {
           inventoryItem: true,
         },
       },
       customer: {
         select: {
           id: true,
           name: true,
           defaultPaymentTermDays: true,
           returnPolicyDays: true,
         },
       },
       bankAccount: true, // Add this
     },
   });
   ```

2. **Replace Hard-Coded Bank Details** (around line 519)

   ```typescript
   // Display bank account info based on payment method
   if (invoice.paymentMethod === "BANK_TRANSFER" && invoice.bankAccount) {
     doc.text(
       `ACCOUNT NAME: ${invoice.bankAccount.accountName}   ACCOUNT NO: ${invoice.bankAccount.accountNumber}   BANK: ${invoice.bankAccount.bankName}`,
       40,
       95
     );
   } else if (invoice.paymentMethod === "CASH") {
     doc.text("PAYMENT METHOD: CASH", 40, 95);
   } else {
     // Default to showing the bank account if no payment method specified
     const defaultBankAccount = await prisma.bankAccount.findUnique({
       where: { id: "default-bank-account" },
     });
     if (defaultBankAccount) {
       doc.text(
         `ACCOUNT NAME: ${defaultBankAccount.accountName}   ACCOUNT NO: ${defaultBankAccount.accountNumber}   BANK: ${defaultBankAccount.bankName}`,
         40,
         95
       );
     }
   }
   ```

3. **Add Bank Account Override Parameter**
   - Accept `?bankAccountId=xxx` query parameter in PDF endpoint
   - Allow overriding the bank account at PDF generation time
   - Use override if provided, otherwise use invoice's linked bank account

### Phase 2: Frontend - Invoice Form Updates ⏳

**Files to Create/Update:**

- `frontend/src/hooks/useBankAccounts.ts` - Custom hook for fetching bank accounts
- `frontend/src/app/invoices/page.tsx` - Add payment method and bank account selection

**Required Changes:**

1. **Create Bank Accounts Hook**

   ```typescript
   // frontend/src/hooks/useBankAccounts.ts
   import { useQuery } from "@tanstack/react-query";
   import { apiClient } from "@/lib/api";

   export const useBankAccounts = () => {
     return useQuery({
       queryKey: ["bankAccounts"],
       queryFn: async () => {
         const response = await apiClient.get("/bank-accounts");
         return response.data.data;
       },
     });
   };
   ```

2. **Add Fields to Invoice Form**
   - Payment Method dropdown (CASH / BANK_TRANSFER)
   - Bank Account dropdown (conditional - shown only if BANK_TRANSFER selected)
   - Save both fields when creating/updating invoice

### Phase 3: Frontend - Bank Account Override Modal ⏳

**Purpose:** Allow users to change the bank account when downloading invoice PDF

**Implementation:**

1. Create modal component that shows:

   - Current payment method
   - Current bank account (if any)
   - Dropdown to select different bank account
   - "Download" button

2. Update invoice list/detail page:
   - Replace direct PDF download link with modal trigger
   - Pass selected bank account ID to PDF endpoint as query parameter

### Phase 4: Frontend - Bank Accounts Management Page (Admin) ⏳

**File:** `frontend/src/app/admin/bank-accounts/page.tsx`

**Features:**

- Table showing all bank accounts (name, number, bank, status)
- "Add New" button opening modal
- Edit button per row
- Toggle active/inactive
- View linked invoices/payments count
- Delete (soft delete) confirmation

### Phase 5: Payment Recording Updates ⏳

**Files:**

- Payment recording form components

**Changes:**

- Add bank account selection when recording customer payments
- Link payment to selected bank account in database

### Phase 6: Reporting ⏳

**File:** `frontend/src/app/reports/bank-accounts/page.tsx`

**Features:**

- Bank account selector
- Date range filters
- List of invoices using that account
- List of payments received to that account
- Total amounts
- Export to CSV

## Current Status

✅ **Completed:**

1. Database schema updated (BankAccount model)
2. Migration created and applied
3. Prisma Client regenerated
4. Default bank account seeded
5. Backend API endpoints created and tested
6. Routes registered in Express app
7. Backend server running successfully

⏳ **Pending:**

1. Update invoice PDF generation to use database bank accounts
2. Frontend: Create bank accounts hook
3. Frontend: Add bank account selection to invoice form
4. Frontend: Create bank account override modal
5. Frontend: Create admin bank accounts management page
6. Frontend: Update payment recording with bank account selection
7. Frontend: Create bank account transactions report

## Important Notes

### Payment Methods

**CASH:**

- No bank account needed
- Invoice PDF should show "PAYMENT METHOD: CASH" instead of bank details

**BANK_TRANSFER:**

- Requires bank account selection
- Invoice PDF shows selected bank account details
- Can be overridden at PDF generation time

### Backward Compatibility

**Existing Invoices:**

- Existing invoices have `paymentMethod = NULL` and `bankAccountId = NULL`
- PDF generation should default to showing the default bank account for these
- Alternatively, can be updated in bulk to link to default bank account

### Data Integrity

**Soft Deletion:**

- Bank accounts use soft deletion (`isActive = false`)
- This preserves historical data on linked invoices and payments
- Deactivated accounts won't appear in dropdowns but can still be viewed

**Foreign Keys:**

- All foreign keys use `ON DELETE SET NULL`
- If a bank account is hard-deleted, linked invoices/payments won't break
- Better to use soft deletion (deactivation) instead

## Technical Decisions

### Why Soft Delete?

Bank accounts are referenced in historical documents (invoices, payments). Hard deleting them would:

1. Break referential integrity
2. Lose audit trail
3. Make historical reports inaccurate

Soft deletion preserves all data while hiding inactive accounts from active use.

### Why Nullable Bank Account on Invoice?

Not all invoices require bank account details:

1. Cash payments don't need bank account info
2. Some invoices may be for internal tracking only
3. Allows flexibility for different payment scenarios

### Why Allow Override at PDF Generation?

Business scenarios:

1. Account details may change after invoice creation
2. Different departments may use different accounts
3. Customer-specific account preferences
4. Temporary account issues requiring fallback

## Environment Requirements

### Development

- PostgreSQL 14+ running on 127.0.0.1:5432
- Node.js 18+
- npm or yarn

### Database

- Connection string: `postgresql://crm:Waiba2001@127.0.0.1:5432/crm`
- Schema: `public`

## Deployment Checklist

Before deploying to production:

1. ☐ Run migration in production database
2. ☐ Seed production bank accounts
3. ☐ Update existing invoices to link to appropriate bank accounts
4. ☐ Test all API endpoints in staging environment
5. ☐ Complete frontend implementation
6. ☐ Test invoice PDF generation with different scenarios
7. ☐ Update admin documentation with bank account management guide
8. ☐ Train users on new bank account features
9. ☐ Set up monitoring for bank account-related errors
10. ☐ Create backup procedures for bank account data

## Support and Troubleshooting

### Common Issues

**Issue:** Prisma Client generation fails with EPERM error
**Solution:** Kill all Node.js processes: `taskkill /F /IM node.exe`

**Issue:** Cannot connect to database with localhost
**Solution:** Use `127.0.0.1` instead in DATABASE_URL

**Issue:** Bank account dropdown is empty
**Solution:** Check that bank accounts are marked as `isActive = true`

**Issue:** PDF still shows hard-coded bank details
**Solution:** Clear cache, restart backend server, verify invoice has bankAccountId

### Logs

Backend logs are stored in `backend/logs/` directory.

Check for bank account-related errors:

```bash
grep -r "bank account" backend/logs/
```

## Contacts

For questions or issues with the bank accounts system:

- Technical: Development Team
- Business Logic: Finance Department
- Database: Database Administrator

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Author:** AI Development Assistant
