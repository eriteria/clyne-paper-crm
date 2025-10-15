# Credits Fix & Customer Troubleshooting Guide

## Date: October 13, 2025

## Summary of Changes

### ✅ Fixed: Automatic Credit Creation from Google Sheets Import

**Problem**: When payments exceeded invoice amounts or had no invoice specified, the excess wasn't being tracked as customer credit.

**Solution**: Enhanced the Google Sheets import script (`backend/src/scripts/import-from-google-sheets.ts`) to automatically handle:

#### 1. **Overpayment Credits**

- When a payment amount exceeds an invoice balance
- Example: Invoice balance ₦100,000, Payment ₦150,000
- Result: ₦100,000 applied to invoice, ₦50,000 created as OVERPAYMENT credit

#### 2. **Advance Payment Credits**

- When payment has no invoice number specified
- All payment amount converted to ADVANCE_PAYMENT credit
- Customer can apply these credits to future invoices

**How It Works:**

```typescript
// Before (old code):
- Applied full payment amount to invoice (even if > balance)
- Did not track overpayments
- Ignored payments without invoices

// After (new code):
- Calculate amountToApply = min(payment amount, invoice balance)
- Create credit for overpayment = payment amount - amountToApply
- Update payment.allocatedAmount and payment.creditAmount
- For payments without invoices, create advance payment credit
```

**Benefits:**

- ✅ Accurate customer credit tracking
- ✅ No more lost overpayments
- ✅ Advance payments properly recorded
- ✅ Credits available in Credit Management modal
- ✅ Can be applied to future invoices

---

## 🔍 Customer Display Issue Troubleshooting

### Reported Issue

"Customers not showing in production - saying 'no customers found'"

### Diagnostic Steps

1. **Verify Data Exists**

   - Import logs show: **369 customers created**
   - Backend is running and database is synced
   - Data definitely exists in production database

2. **Possible Causes**

   **A. Rate Limiter Crashes (Most Likely)**

   - Backend logs show repeated rate limiter errors
   - Server crashes when requests come in
   - May prevent customer API from responding

   **B. Authentication Token Expired**

   - User may need to log out and log back in
   - Token refresh may have failed

   **C. Frontend Caching**

   - Browser cache may be serving old empty state
   - Hard refresh needed (Ctrl+F5)

   **D. API Route Permission Issue**

   - User role may not have access to customers endpoint
   - Check user permissions

### Quick Fixes to Try

#### Option 1: Hard Refresh Browser

```
1. Press Ctrl + F5 (Windows) or Cmd + Shift + R (Mac)
2. Or open DevTools (F12) → Network tab → Check "Disable cache"
3. Reload page
```

#### Option 2: Re-login

```
1. Log out completely
2. Close all browser tabs of the CRM
3. Open fresh tab and log in again
4. Check customers page
```

#### Option 3: Check Different User

```
1. Try logging in with admin account
2. If admin can see customers, it's a permissions issue
3. If admin can't see, it's a system issue
```

#### Option 4: Check Browser Console

```
1. Press F12 to open DevTools
2. Go to Console tab
3. Refresh customers page
4. Look for red errors
5. Share screenshot with tech team
```

### Technical Details (For Developers)

**API Endpoint**: `GET /api/customers`

**Expected Response**:

```json
{
  "success": true,
  "data": [...customers...],
  "pagination": {
    "total": 369,
    "page": 1,
    "limit": 50,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Common Error Responses**:

- `401 Unauthorized` → Token expired, need re-login
- `403 Forbidden` → User lacks permissions
- `500 Internal Server Error` → Backend crash (rate limiter issue)

**Check Backend Logs**:

```bash
fly logs --app clyne-paper-crm-backend --no-tail
```

Look for:

- `ValidationError: The Express 'trust proxy'` (rate limiter crash)
- `GET /api/customers 200` (successful request)
- `GET /api/customers 401` (auth failure)
- `GET /api/customers 500` (server error)

---

## Next Import Behavior

When you run the Google Sheets import again (after this deployment):

1. **New Payments with Invoices**:

   - If payment ≤ invoice balance: Full payment applied to invoice
   - If payment > invoice balance: Partial applied, excess becomes credit

2. **New Payments without Invoices**:

   - Full amount becomes ADVANCE_PAYMENT credit
   - Customer can apply later via Credit Management

3. **Existing Records**:
   - No automatic retroactive credit creation
   - Would need manual credit adjustment for already-imported payments
   - Or re-import after clearing old data

---

## Recommendations

### For Customers Not Showing:

1. Try hard refresh first (Ctrl+F5)
2. If that doesn't work, re-login
3. If still not working, check browser console for errors
4. Contact support with console error screenshot

### For Credits System:

- ✅ Credits now automatically created from imports
- ✅ Check Credit Management modal for each customer to see available credits
- ✅ Use "Apply Credit to Invoice" to allocate advance payments
- ✅ Customer ledger shows all credits with history

### For Historical Data:

If you need to create credits for payments that were already imported:

1. Use the Credit Management feature manually
2. Or run a data migration script to analyze existing payments vs invoices
3. Contact tech team for bulk credit creation if needed

---

## Deployment Status

- ✅ Google Sheets Import button deployed
- ✅ Database schema fixed (return_policy_days column added)
- ✅ Credits calculation fixed
- 🔄 Backend deploying with rate limiter fix (in progress)
- ⏳ Customer display issue pending verification after deployment

---

## Support

If issues persist:

1. Take screenshot of error message
2. Open browser console (F12) and screenshot any red errors
3. Note which user account is experiencing the issue
4. Contact technical support with above information
