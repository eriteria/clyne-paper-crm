# Production Import Guide

## ✅ Prerequisites Completed

- [x] Backend deployed to Fly.io production
- [x] Google credentials uploaded as secret (GOOGLE_CREDENTIALS_BASE64)
- [x] Prisma migrations deployed (15 migrations applied)
- [x] Admin API endpoint created for triggering import

## 🚀 Triggering the Import

### Option 1: Via API (Recommended)

**Step 1: Get Admin Auth Token**

1. Log in to the production CRM as admin:  
   `https://crm.clynepaper.com.ng` or `https://clyne-paper-crm-frontend.fly.dev`

2. Open browser DevTools console (F12) and run:
   ```javascript
   localStorage.getItem('token')
   ```

3. Copy the token (it looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**Step 2: Check Import Status**

```bash
curl -X GET https://clyne-paper-crm-backend.fly.dev/api/admin-import/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "status": "ready",
  "credentials": "configured",
  "database": {
    "productGroups": 0,
    "products": 0,
    "customers": 0,
    "invoices": 0,
    "payments": 0
  }
}
```

**Step 3: Trigger Import**

```bash
curl -X POST https://clyne-paper-crm-backend.fly.dev/api/admin-import/google-sheets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Import started successfully",
  "note": "This may take several minutes. Check server logs for progress."
}
```

**Step 4: Monitor Progress**

```bash
cd backend
fly logs -a clyne-paper-crm-backend
```

Look for log messages like:
- `✅ Using Google credentials from environment variable`
- `📦 Importing product groups...`
- `📝 Importing products...`
- `🏢 Importing customers...`
- `🧾 Importing invoices...`
- `💰 Importing payments...`
- `✅ Full import completed!`

### Option 2: Using the Helper Script

**Step 1: Get your auth token (same as above)**

**Step 2: Run the trigger script**

```bash
cd backend
npx ts-node trigger-production-import.ts "YOUR_TOKEN_HERE"
```

This will:
1. Check the import service status
2. Show current database stats
3. Trigger the import
4. Show command to monitor logs

### Option 3: Via Frontend (Future Enhancement)

Add a button in the admin panel:
- Navigate to Admin → Data Management
- Click "Import from Google Sheets"
- Confirm import
- Monitor progress in UI

---

## 📊 Expected Import Results

Based on local test import, you should see:

| Entity | Expected Count |
|--------|---------------|
| Product Groups | 19 |
| Products | 22 |
| Relationship Manager Users | 7 |
| Customers | 373 |
| Invoices | 2,285 |
| Customer Payments | 894 |
| Payment Applications | 8 |
| Locations | 6 |

**Breakdown:**
- **Customers**: 98.9% with relationship managers, 100% with locations
- **Invoices**: 64.6% OPEN, 23.8% PARTIAL, 11.6% PAID
- **Payments**: 100% with payment methods, 99.8% with reference numbers

---

## 🔍 Verifying the Import

### Quick Verification via API

```bash
# Check customer count
curl -X GET https://clyne-paper-crm-backend.fly.dev/api/admin-import/status \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.database'
```

### Detailed Verification via Database

**Option A: Via Prisma Studio (Local tunnel)**

```bash
# In one terminal: Create SSH tunnel to production DB
fly proxy 5433:5432 -a clyne-paper-crm-db

# In another terminal: Connect Prisma Studio
DATABASE_URL="postgresql://postgres:password@localhost:5433/clyne-paper-crm-db" npx prisma studio
```

Then browse the data at http://localhost:5555

**Option B: Via Direct SQL**

```bash
fly postgres connect -a clyne-paper-crm-db
```

Then run:
```sql
-- Check counts
SELECT 
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM invoices) as invoices,
  (SELECT COUNT(*) FROM customer_payments) as payments,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM product_groups) as product_groups;

-- Check relationship managers
SELECT u.full_name, u.email, r.name as role
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'Sales';

-- Check customer distribution by location
SELECT l.name, COUNT(c.id) as customer_count
FROM locations l
LEFT JOIN customers c ON c.location_id = l.id
GROUP BY l.id, l.name
ORDER BY customer_count DESC;

-- Check invoice status distribution
SELECT status, COUNT(*) as count
FROM invoices
GROUP BY status;
```

---

## ⚠️ Known Issues to Fix After Import

### 1. Relationship Manager Passwords

All 6 RMs have default password: **`ChangeMe123!`**

**To Reset:**
```typescript
// Via admin panel or create a password reset script
import bcrypt from 'bcryptjs';

const newPassword = await bcrypt.hash('NewSecurePassword123!', 12);
await prisma.user.update({
  where: { email: 'joy.akinyele@clynepaper.com' },
  data: { passwordHash: newPassword }
});
```

### 2. Missing Customer Dates

4 customers have unparseable dates:
- YELLOW DOOR APARTMENTS
- OLUWATOYIN OMONAIVE  
- ADAUGO (FCMB PLAZA)
- MEDIX PLUS PHARMACY

**Fix manually in admin panel or database**

### 3. Missing Customers

3 invoices reference customers not in database:
- Invoice #1890: "FIRST BANK MAITAMA"
- Invoice #3408: "Cosmos" (likely "COSMOS SUPERMARKET")
- Invoice #3378: "GOD SUPERMARKET" (likely "GOD FIRST SUPERMARKET")

**Fix:** Create these customers or update invoice customer IDs

### 4. Invoice Line Items

Invoice line items NOT imported (require InventoryItems first)

**Next Steps:**
1. Create InventoryItems for each product at each location
2. Then add line items via CRM UI

---

## 🛠️ Troubleshooting

### Import Fails with "Forbidden"

**Issue:** Token is invalid or user is not admin

**Fix:** 
1. Verify you're logged in as admin
2. Get a fresh token from localStorage
3. Check user role in database

### Import Fails with "Credentials Missing"

**Issue:** GOOGLE_CREDENTIALS_BASE64 secret not set

**Fix:**
```bash
# Re-upload credentials
cd backend
$content = Get-Content "google-credentials.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$encoded = [System.Convert]::ToBase64String($bytes)
fly secrets set GOOGLE_CREDENTIALS_BASE64="$encoded" -a clyne-paper-crm-backend
```

### Import Times Out

**Issue:** Import takes too long (>30s request timeout)

**Solution:** This is why we return 202 Accepted immediately and run import in background. Just monitor the logs.

### Out of Memory Errors

**Issue:** Fly.io machine runs out of memory during import

**Fix:** Increase machine memory:
```bash
fly scale memory 2048 -a clyne-paper-crm-backend
```

Then re-trigger import.

### Google Sheets API Rate Limit

**Issue:** Too many requests to Google Sheets API

**Solution:** Import script includes delays, but if rate limited:
1. Wait 1 minute
2. Re-trigger import (it will skip already imported data)

---

## 📋 Post-Import Checklist

After successful import:

- [ ] Verify counts match expected (373 customers, 2,285 invoices, etc.)
- [ ] Reset passwords for 6 relationship managers
- [ ] Fix 4 customer date issues
- [ ] Handle 3 missing customers
- [ ] Create inventory items for 22 products at 2+ locations
- [ ] Assign users to teams and regions
- [ ] Configure team-location mappings
- [ ] Test login for relationship managers
- [ ] Test creating new invoice (should work after inventory setup)

**Full checklist:** See `docs/POST_IMPORT_CHECKLIST.md`

---

## 🎯 Success Criteria

Import is successful if:

✅ All 373 customers imported with locations and RMs  
✅ All 2,285 invoices imported with correct balances  
✅ All 894 payments imported and linked  
✅ All 22 products and 19 product groups exist  
✅ 7 relationship manager users created  
✅ No errors in logs (except known 4 date parse warnings)  

---

## 📞 Support

If issues persist:

1. Check logs: `fly logs -a clyne-paper-crm-backend`
2. Check database connection: `fly postgres connect -a clyne-paper-crm-db`
3. Review error logs in `/app/logs/error.log` on production
4. Re-run import (it's idempotent - safe to repeat)

---

**Last Updated:** October 13, 2025  
**Backend:** https://clyne-paper-crm-backend.fly.dev  
**Frontend:** https://crm.clynepaper.com.ng  
**Database:** clyne-paper-crm-db (Fly Postgres)
