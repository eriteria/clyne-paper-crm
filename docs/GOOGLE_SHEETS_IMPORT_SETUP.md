# Google Sheets Import Setup Guide

This guide will help you set up Google Sheets API integration for importing data from your Google Sheets into the CRM.

## Step 1: Create a Google Cloud Service Account

### 1.1 Go to Google Cloud Console

Visit: https://console.cloud.google.com/

### 1.2 Create a New Project (or select existing)

- Click "Select a project" at the top
- Click "NEW PROJECT"
- Name it: "Clyne Paper CRM"
- Click "CREATE"

### 1.3 Enable Google Sheets API

- In the search bar, type "Google Sheets API"
- Click on "Google Sheets API"
- Click "ENABLE"

### 1.4 Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "CREATE CREDENTIALS" → "Service Account"
3. Fill in details:
   - **Service account name**: `clyne-crm-sheets-reader`
   - **Service account ID**: Will auto-generate
   - **Description**: "Service account for reading Clyne Paper Google Sheets"
4. Click "CREATE AND CONTINUE"
5. For "Grant this service account access to project":
   - Select role: "Editor" (or just "Viewer" if read-only)
6. Click "CONTINUE" then "DONE"

### 1.5 Create and Download Credentials Key

1. Find your new service account in the list
2. Click on it to open details
3. Go to "KEYS" tab
4. Click "ADD KEY" → "Create new key"
5. Select "JSON" format
6. Click "CREATE"
7. A JSON file will download automatically

### 1.6 Save the Credentials File

1. Rename the downloaded file to: `google-credentials.json`
2. Move it to your backend folder: `backend/google-credentials.json`
3. **IMPORTANT**: This file contains sensitive credentials!

## Step 2: Share Google Sheets with Service Account

### 2.1 Get Service Account Email

Open the `google-credentials.json` file and find the `client_email` field.
It will look like: `clyne-crm-sheets-reader@clyne-paper-crm.iam.gserviceaccount.com`

### 2.2 Share Your Google Sheets

For BOTH sheets (Database and Master):

1. Open the Google Sheet
2. Click "Share" button (top right)
3. Paste the service account email
4. Set permission to "Viewer" (read-only)
5. Uncheck "Notify people"
6. Click "Share"

**Sheets to share:**

- Database Sheet: https://docs.google.com/spreadsheets/d/1NLzldesyGsAXR-UfWnX6ax37sZ42MbD0b7PiIMi9hf4/edit
- Master Sheet: https://docs.google.com/spreadsheets/d/1wURUIeMCe1AERYzI6Q7DIofuBJQwq__-GMKNjGW3IpE/edit

## Step 3: Verify Setup

Run this test script to verify the connection:

```bash
cd backend
npx ts-node src/scripts/test-google-sheets.ts
```

If successful, you should see the sheet names printed out.

## Step 4: Run Initial Import

Once verified, run the full import:

```bash
cd backend
npx ts-node src/scripts/import-from-google-sheets.ts
```

This will:

1. Import all customers from Database sheet
2. Import all invoices from Master sheet
3. Import all payments from Master sheet
4. Link everything together

## Step 5: Set Up Ongoing Sync (Optional)

For regular syncing, you can:

### Option A: Manual Sync

Run the import script whenever you want to sync:

```bash
npm run sync:sheets
```

### Option B: Scheduled Sync (Coming Soon)

We can set up a cron job or scheduled task to run daily/weekly.

### Option C: API Endpoint

Trigger sync from the CRM UI via an admin panel button.

---

## Troubleshooting

### Error: "Credentials file not found"

- Make sure `google-credentials.json` is in the `backend/` folder
- Check the file name is exactly `google-credentials.json`

### Error: "The caller does not have permission"

- Make sure you shared both Google Sheets with the service account email
- Check the service account email in google-credentials.json
- Verify the share permission is at least "Viewer"

### Error: "Unable to parse range"

- Check that the sheet tab names in `googleSheets.ts` match your actual sheet tabs
- Sheet names are case-sensitive

### Error: "Customer/Product not found"

- This is expected on first run
- The script will create missing customers, products, locations automatically
- Check the console output for details

---

## Security Notes

⚠️ **IMPORTANT**: The `google-credentials.json` file contains sensitive credentials!

- **DO NOT** commit this file to Git (it's already in .gitignore)
- **DO NOT** share this file publicly
- **DO NOT** include it in any screenshots or logs
- Store it securely on your server

If credentials are compromised:

1. Go to Google Cloud Console
2. Find the service account
3. Delete the compromised key
4. Create a new key
5. Replace the old credentials file

---

## What Gets Imported?

### Customers (from Database → Table2)

- Customer name
- Relationship Manager (creates User accounts if needed)
- Location (creates Location records if needed)
- Address
- Onboarding date (tracked in notes/logs)
- Last order date (tracked in notes/logs)

### Invoices (from Master → Invoice sheet)

- Invoice number
- Date
- Customer (linked to imported customers)
- Items (product, quantity, unit price, total)
- Invoice total
- Status (calculated from payments)

### Payments (from Master → Payment sheet)

- Payment date
- Customer (linked)
- Invoice number (linked if specified)
- Payment reference
- Bank
- Amount
- Updates invoice status automatically

---

## Next Steps After Import

1. **Verify Data**: Check the CRM to ensure data imported correctly
2. **Fix Discrepancies**: Some customer names may not match exactly - update mappings if needed
3. **Set Password**: All auto-created relationship manager users have temporary passwords
4. **Configure Teams**: Assign relationship managers to proper teams
5. **Test Sync**: Run the import again to verify it handles duplicates correctly

---

Need help? Check the console output from the import script - it provides detailed information about what was imported, skipped, or had errors.
