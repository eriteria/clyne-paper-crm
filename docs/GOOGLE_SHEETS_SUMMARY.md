# Google Sheets Import - Complete Summary

## ✅ What's Been Built

I've created a complete Google Sheets integration system that allows you to import data from your existing Google Sheets (Database and Master) into the CRM. This implements **Option B (Ongoing Sync)** as you requested.

---

## 📦 Files Created

### Backend Services
- **`backend/src/services/googleSheets.ts`** - Core Google Sheets API service
  - Authentication with service account
  - Read data from any sheet
  - Parse data into objects
  - Currency and date parsing utilities
  - Pre-configured sheet IDs and names

### Import Scripts
- **`backend/src/scripts/import-from-google-sheets.ts`** - Main import script
  - Import customers from Database sheet
  - Import invoices from Master sheet  
  - Import payments from Master sheet
  - Intelligent linking and matching
  - Duplicate prevention
  - Error handling and reporting

- **`backend/src/scripts/test-google-sheets.ts`** - Connection test script
  - Verify Google Sheets API authentication
  - Test reading from all sheets
  - Show sample data
  - Troubleshooting guidance

### Documentation
- **`docs/GOOGLE_SHEETS_IMPORT_SETUP.md`** - Complete setup guide
  - Step-by-step Google Cloud setup
  - Service account creation
  - Sharing permissions
  - Troubleshooting

- **`docs/GOOGLE_SHEETS_QUICK_START.md`** - Quick reference guide
  - 5-minute setup checklist
  - Available commands
  - Data mapping tables
  - Common issues and fixes

### Configuration
- **`backend/package.json`** - Added npm scripts:
  - `npm run sheets:test` - Test connection
  - `npm run sheets:import` - Run full import
  - `npm run sheets:sync` - Sync (same as import)

- **`.gitignore`** - Added `google-credentials.json` to prevent accidental commits

---

## 🎯 Features

### Data Import Capabilities

#### Customers (from Database → Table2)
- ✅ Customer name
- ✅ Relationship Manager (auto-creates User accounts)
- ✅ Location (auto-creates Location records)
- ✅ Address
- ✅ Onboarding and last order dates (tracked)

#### Invoices (from Master → Invoice sheet)
- ✅ Invoice number (unique identifier)
- ✅ Date (multiple format support)
- ✅ Customer linking
- ✅ Multiple line items per invoice
- ✅ Product auto-creation
- ✅ Quantity, unit price, totals
- ✅ Naira currency parsing (₦)

#### Payments (from Master → Payment sheet)
- ✅ Payment date
- ✅ Customer linking
- ✅ Optional invoice linking
- ✅ Payment reference and bank
- ✅ Amount with currency parsing
- ✅ Auto-update invoice status (Unpaid → Partial → Paid)

### Smart Features

#### Intelligent Matching
- **Case-insensitive** customer name matching
- Handles variations in naming
- Links payments to invoices when invoice number provided
- Creates missing entities automatically (customers, products, locations, users)

#### Duplicate Prevention
- Skips existing invoices (by invoice number)
- Skips duplicate payments (by date + customer + amount)
- Updates existing customers instead of creating duplicates
- Safe to run multiple times

#### Error Handling
- Continues processing even if individual records fail
- Detailed console output shows progress
- Error summary at the end
- Transaction-safe (each record isolated)

---

## 🚀 How to Use

### Step 1: Google Cloud Setup (One-time)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project "Clyne Paper CRM"
3. Enable "Google Sheets API"
4. Create Service Account with Viewer/Editor role
5. Download JSON credentials
6. Save as `backend/google-credentials.json`

### Step 2: Share Your Sheets (One-time)

1. Open `google-credentials.json`
2. Copy the `client_email`
3. Share both Google Sheets with this email:
   - Database Sheet: `1NLzldesyGsAXR-UfWnX6ax37sZ42MbD0b7PiIMi9hf4`
   - Master Sheet: `1wURUIeMCe1AERYzI6Q7DIofuBJQwq__-GMKNjGW3IpE`
4. Permission: "Viewer"

### Step 3: Test Connection

```bash
cd backend
npm run sheets:test
```

Expected output: ✅ All tests passed!

### Step 4: Run Import

```bash
cd backend
npm run sheets:import
```

This will:
1. Import all customers (creates relationship managers and locations as needed)
2. Import all invoices (creates products as needed, groups by invoice number)
3. Import all payments (links to invoices, updates invoice status)

Takes 1-3 minutes depending on data size.

### Step 5: Ongoing Sync

Run anytime you want to sync new data:

```bash
npm run sheets:sync
```

Safe to run repeatedly - won't create duplicates!

---

## 📊 Data Mapping

### Your Google Sheets → CRM Database

#### Customers
```
Database Sheet (Table2)
├─ CUSTOMER NAME          → Customer.name
├─ RELATIONSHIP MANAGER   → Customer.relationshipManagerId (creates User)
├─ LOCATION               → Customer.locationId (creates Location)
├─ ADDRESS                → Customer.address
├─ DATE OF ONBOARDING     → (tracked for reference)
└─ LAST ORDER DATE        → (tracked for reference)
```

#### Invoices
```
Master Sheet (Invoice)
├─ Invoice                → Invoice.invoiceNumber
├─ Date                   → Invoice.date
├─ Customer               → Invoice.customerId (linked)
├─ Product                → InvoiceItem.productName (creates Product)
├─ Quantity               → InvoiceItem.quantity
├─ Item Unit Price        → InvoiceItem.unitPrice
├─ Item Total Price       → InvoiceItem.totalPrice
└─ Invoice Total          → Invoice.totalAmount
```

#### Payments
```
Master Sheet (Payment)
├─ Date                   → Payment.date
├─ Customer               → Payment.customerId (linked)
├─ Invoice No. (Optional) → Payment.invoiceId (linked if specified)
├─ Payment REF            → Payment.reference
├─ Bank                   → (included in reference)
└─ Amount                 → Payment.amount
```

---

## 🔄 Import Behavior

### First Import (Historical Data)
- Creates all customers with relationship managers
- Creates all invoices with line items
- Creates all payments
- Links everything together
- Calculates invoice statuses

### Subsequent Syncs (New Data)
- **Customers**: Updates if exists, creates if new
- **Invoices**: Skips if invoice number exists, creates if new
- **Payments**: Skips if duplicate (date+customer+amount), creates if new
- **Invoice Status**: Recalculates based on payments

---

## 🎨 Special Handling

### Currency Parsing
Handles all these formats:
- `₦25,500.00` → 25500
- `N25500` → 25500  
- `25,500.00` → 25500
- `25500` → 25500

### Date Parsing
Handles multiple formats:
- `5 Jun 2025`
- `28 Aug 2024`
- `2024-08-28`
- Standard ISO dates

### Multiple Invoice Lines
Groups by invoice number:
```
Invoice 1087, Line 1: MARAX PREMIUM SERVIETTE
Invoice 1087, Line 2: MUSHY ROLL
→ Creates 1 invoice with 2 items
```

### Payment-Invoice Linking
- If payment has invoice number → Links directly
- Updates invoice status automatically:
  - No payments → "Unpaid"
  - Partial payment → "Partial"
  - Full payment → "Paid"

---

## 🐛 Troubleshooting

### Common Errors

**"Credentials file not found"**
- Ensure `google-credentials.json` is in `backend/` folder
- Check filename is exactly `google-credentials.json`

**"The caller does not have permission"**
- Share both sheets with service account email
- Check permission is at least "Viewer"
- Wait a few minutes after sharing

**"Customer not found" for invoices**
- Run customer import first
- Check customer names match exactly (case doesn't matter)

**"Product not found"**
- Script auto-creates products
- If error persists, check product name isn't empty in sheet

### Getting Help
1. Check console output - it shows exactly what happened
2. Look for error summary at the end
3. See `docs/GOOGLE_SHEETS_IMPORT_SETUP.md` for detailed guide
4. Check `docs/GOOGLE_SHEETS_QUICK_START.md` for quick fixes

---

## 🔐 Security Notes

### Credentials Protection
- `google-credentials.json` contains sensitive credentials
- ✅ Already added to `.gitignore` - won't be committed
- ❌ Never share this file publicly
- ❌ Never include in screenshots or logs
- Store securely on your server

### If Credentials Compromised
1. Go to Google Cloud Console
2. Find the service account
3. Delete compromised key
4. Create new key
5. Download and replace credentials file

---

## 📈 Next Steps

### After Initial Import
1. ✅ Verify data imported correctly in CRM
2. ✅ Check customer list matches
3. ✅ Verify invoices and line items
4. ✅ Check payments linked to invoices
5. ✅ Review invoice statuses

### Ongoing Usage
1. ✅ Continue entering data in Google Sheets as usual
2. ✅ Run `npm run sheets:sync` daily/weekly to import new data
3. ✅ Check sync output for any errors
4. ✅ Monitor for customer name discrepancies

### Future Enhancements (Optional)
- Schedule automatic syncs (cron job)
- Add UI button in admin panel to trigger sync
- Create sync history/log viewer
- Add conflict resolution for data mismatches
- Export from CRM back to Google Sheets

---

## 📚 Documentation Files

All created documentation:

1. **Setup Guide**: `docs/GOOGLE_SHEETS_IMPORT_SETUP.md`
   - Complete step-by-step setup
   - Screenshots and detailed instructions
   - Troubleshooting guide

2. **Quick Start**: `docs/GOOGLE_SHEETS_QUICK_START.md`
   - 5-minute setup checklist
   - Command reference
   - Data mapping tables
   - Common issues

3. **This Summary**: `docs/GOOGLE_SHEETS_SUMMARY.md`
   - Overview of what was built
   - Features and capabilities
   - Usage guide

---

## 🎉 You're All Set!

Your Google Sheets import system is ready to use. Follow the setup steps, test the connection, and run your first import!

**Quick Start Commands:**
```bash
cd backend
npm run sheets:test      # Test connection first
npm run sheets:import    # Run full import
npm run sheets:sync      # For ongoing syncs
```

The system is designed for **ongoing sync (Option B)** - you can keep using Google Sheets and periodically sync to the CRM for reporting and analytics.

---

**Questions?** Check the documentation files or review the console output from the import scripts - they provide detailed feedback on what's happening!
