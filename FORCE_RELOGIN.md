# Force Re-Login Instructions

## The Problem
You're getting "Access Denied" because your browser still has the OLD user data without the `permissions` field.

## Why This Happens
- You logged in BEFORE we fixed the Zoho OAuth route
- Your browser cached the old user data: `{id, email, fullName, role}` ❌
- The new user data should have: `{id, email, fullName, role, permissions: ["*"], ...}` ✅

## Solution: Force Complete Re-Login

### Step 1: Open Browser Console (F12)

### Step 2: Check Current State
```javascript
const user = JSON.parse(localStorage.getItem('user'))
console.log('Current user data:', user)
console.log('Has permissions?', 'permissions' in user)
```

**If it shows `Has permissions? false` → You MUST re-login!**

### Step 3: Complete Logout
```javascript
// Clear EVERYTHING
localStorage.clear()
sessionStorage.clear()

// Also clear cookies (if any)
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

console.log('✅ All data cleared!')
```

### Step 4: Refresh the Page
```javascript
location.reload()
```

### Step 5: Log Back In
1. You'll be redirected to the login page
2. Click **"Sign in with Zoho"** button
3. Complete the OAuth flow
4. You'll be redirected back to the app

### Step 6: Verify Fix Worked
```javascript
const user = JSON.parse(localStorage.getItem('user'))
console.log('=== NEW USER DATA ===')
console.log('Email:', user.email)
console.log('Role:', user.role)
console.log('Permissions:', user.permissions)
console.log('Has wildcard?', user.permissions?.includes('*'))
```

**You should now see:**
```
Role: "Super Admin"
Permissions: ["*"]
Has wildcard? true
```

### Step 7: Test Admin Access
```javascript
const user = JSON.parse(localStorage.getItem('user'))
const permissions = user?.permissions || []

const canAccessAdmin =
  permissions.includes('roles:view') ||
  permissions.includes('roles:*') ||
  permissions.includes('*')

console.log('Can access admin page?', canAccessAdmin)
// Should be: true
```

### Step 8: Navigate to Admin Page
- Go to the sidebar
- Click "Administration"
- You should now see the admin page (not "Access Denied")

---

## If It Still Doesn't Work

### Option A: Check Database
The Super Admin role MUST have `["*"]` in the database:

```sql
SELECT name, permissions FROM roles WHERE name ILIKE '%super admin%';
```

Expected: `permissions = ["*"]`

### Option B: Check Backend Logs
Look for errors when logging in via Zoho OAuth

### Option C: Verify Zoho Route is Working
After logging in, check the Network tab:
1. Look for the `/api/auth/zoho/callback` request
2. Check what URL it redirects to
3. The URL should have `user=` parameter with full user data including permissions

### Option D: Manual Database Check
```sql
-- Check your user's role
SELECT u.email, u."fullName", r.name as role, r.permissions
FROM users u
JOIN roles r ON u."roleId" = r.id
WHERE u.email = 'joseph.john@clynepaper.com.ng';
```

---

## Quick Checklist

- [ ] Cleared localStorage completely
- [ ] Cleared sessionStorage
- [ ] Refreshed the page
- [ ] Logged back in via Zoho OAuth
- [ ] Verified `permissions: ["*"]` exists in localStorage
- [ ] Tested admin page access

---

## Still Having Issues?

Share the output of:
```javascript
const user = JSON.parse(localStorage.getItem('user'))
console.log('Full user object:', JSON.stringify(user, null, 2))
```

This will help diagnose what's wrong!
