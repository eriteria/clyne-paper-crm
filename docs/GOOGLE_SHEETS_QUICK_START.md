# Google Sheets Import - Quick Start

## 🎯 What This Does

Automatically import your data from Google Sheets into the CRM:

- **Customers** from Database sheet → Customer table
- **Invoices** from Master sheet → Invoice + InvoiceItem tables
- **Payments** from Master sheet → Payment table

All relationships are automatically linked!

---

## 🚀 Quick Setup (5 minutes)

### 1. Create Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project: "Clyne Paper CRM"
3. Enable "Google Sheets API"
4. Create Service Account:
   - Name: `clyne-crm-sheets-reader`
   - Role: "Editor" or "Viewer"
5. Create JSON key → Downloads as JSON file
6. Rename to `google-credentials.json`
7. Move to `backend/google-credentials.json`

### 2. Share Your Sheets

1. Open `google-credentials.json`
2. Copy the `client_email` (looks like `xxxx@xxxx.iam.gserviceaccount.com`)
3. Share BOTH Google Sheets with this email:
   - Database Sheet
   - Master Sheet
   - Permission: "Viewer"

### 3. Test Connection

```bash
cd backend
npm run sheets:test
```

Should show: ✅ All tests passed!

### 4. Run Import

```bash
cd backend
npm run sheets:import
```

Wait 1-2 minutes while it imports everything.

---

## 📋 Available Commands

```bash
# Test Google Sheets connection
npm run sheets:test

# Full import (first time or re-import everything)
npm run sheets:import

# Sync (same as import, for ongoing updates)
npm run sheets:sync
```

---

## 🔄 How It Works

### First Import

1. **Customers** → Creates all customers, relationship managers, locations
2. **Invoices** → Creates invoices with line items, links to customers and products
3. **Payments** → Creates payments, links to invoices, updates invoice status

### Subsequent Syncs

- **Customers**: Updates existing, creates new ones
- **Invoices**: Skips existing (by invoice number), creates new ones
- **Payments**: Skips duplicates (by date + customer + amount), creates new ones

---

## 📊 What Gets Imported

### From Database Sheet (Table2)

| Google Sheet Column  | CRM Field                      | Notes                      |
| -------------------- | ------------------------------ | -------------------------- |
| CUSTOMER NAME        | Customer.name                  |                            |
| RELATIONSHIP MANAGER | Customer.relationshipManagerId | Creates User if needed     |
| LOCATION             | Customer.locationId            | Creates Location if needed |
| ADDRESS              | Customer.address               |                            |
| DATE OF ONBOARDING   | (tracked in logs)              | For reference              |
| LAST ORDER DATE      | (tracked in logs)              | For reference              |

### From Master Sheet (Invoice)

| Google Sheet Column | CRM Field               | Notes                     |
| ------------------- | ----------------------- | ------------------------- |
| Invoice             | Invoice.invoiceNumber   | Unique identifier         |
| Date                | Invoice.date            | Parsed automatically      |
| Customer            | Invoice.customerId      | Linked to customer        |
| Product             | InvoiceItem.productName | Creates Product if needed |
| Quantity            | InvoiceItem.quantity    |                           |
| Item Unit Price     | InvoiceItem.unitPrice   | ₦ parsed automatically    |
| Item Total Price    | InvoiceItem.totalPrice  |                           |
| Invoice Total       | Invoice.totalAmount     |                           |

### From Master Sheet (Payment)

| Google Sheet Column    | CRM Field          | Notes                         |
| ---------------------- | ------------------ | ----------------------------- |
| Date                   | Payment.date       |                               |
| Customer               | Payment.customerId | Linked to customer            |
| Invoice No. (Optional) | Payment.invoiceId  | Links to invoice if specified |
| Payment REF            | Payment.reference  |                               |
| Bank                   | (in reference)     | FCMB or Sterling Bank         |
| Amount                 | Payment.amount     | ₦ parsed automatically        |

---

## ⚙️ Smart Features

### Automatic Matching

- **Case-insensitive** customer name matching
- Creates missing customers, products, locations automatically
- Links payments to invoices when invoice number provided
- Updates invoice status based on payments (Unpaid → Partial → Paid)

### Duplicate Prevention

- Skips invoices that already exist (by invoice number)
- Skips duplicate payments (by date + customer + amount)
- Updates existing customers instead of creating duplicates

### Error Handling

- Continues on errors, logs them at the end
- Detailed console output shows what's happening
- Transaction-safe (each record isolated)

---

## 🐛 Common Issues

### "Credentials file not found"

**Fix**: Make sure `google-credentials.json` is in `backend/` folder

### "The caller does not have permission"

**Fix**: Share both Google Sheets with the service account email (from google-credentials.json)

### "Customer not found" for invoices

**Fix**: Run customer import first, or check customer name spelling matches exactly

### Some customers/products not linking

**Fix**: Check for typos or case differences in Google Sheets. The script matches case-insensitively but requires exact spelling.

---

## 💡 Pro Tips

### For First-Time Import

1. Run `npm run sheets:test` first to verify connection
2. Check the console output carefully
3. Fix any errors before running again
4. Verify data in CRM after import

### For Ongoing Sync

1. Can run `npm run sheets:sync` as often as you want
2. Safe to run multiple times - won't create duplicates
3. New data gets added, existing data stays unchanged
4. Consider scheduling daily/weekly syncs

### For Large Imports

- First import may take 2-5 minutes depending on data size
- Console shows progress in real-time
- Don't interrupt the process
- Check logs for any errors at the end

---

## 📚 Full Documentation

See `docs/GOOGLE_SHEETS_IMPORT_SETUP.md` for:

- Detailed setup instructions with screenshots
- Security best practices
- Troubleshooting guide
- Advanced configuration options

---

## 🎉 Next Steps After Import

1. ✅ Verify data in CRM
2. ✅ Fix any mismatched customer names
3. ✅ Set passwords for auto-created relationship managers
4. ✅ Assign relationship managers to teams
5. ✅ Set up scheduled syncs (optional)

---

**Need Help?** Check the console output - it tells you exactly what happened! 🚀
