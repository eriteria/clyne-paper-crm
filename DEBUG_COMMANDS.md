# Debug Commands - Check Your Current Permissions

Open your browser's Developer Tools (F12) and go to the **Console** tab. Then run these commands one by one:

---

## Step 1: Check if you're logged in

```javascript
localStorage.getItem('accessToken')
```

**Expected output**: A long string (JWT token)
**If null**: You're not logged in - please log in first

---

## Step 2: Check what user data is stored

```javascript
localStorage.getItem('user')
```

**Expected output**: A JSON string with user data
**If null**: You're not logged in - please log in first

---

## Step 3: Parse and view the user object

```javascript
JSON.parse(localStorage.getItem('user'))
```

**Expected output**: An object with your user information
**If error**: The stored data is corrupted - log out and log back in

---

## Step 4: Check permissions specifically

```javascript
const user = JSON.parse(localStorage.getItem('user'))
console.log('User:', user)
console.log('Permissions:', user?.permissions)
console.log('Permission count:', user?.permissions?.length)
console.log('Has wildcard?:', user?.permissions?.includes('*'))
```

**For Super Admin, you should see**:
```
Permissions: ["*"]
Permission count: 1
Has wildcard?: true
```

**If you see this instead (OLD format)**:
```
Permissions: ["customers:view", "customers:create", "customers:edit", ...]
Permission count: 70+
Has wildcard?: false
```
**→ You need to LOG OUT and LOG BACK IN!**

---

## Step 5: Check all stored data

```javascript
console.log('Access Token:', localStorage.getItem('accessToken') ? 'Present' : 'Missing')
console.log('Refresh Token:', localStorage.getItem('refreshToken') ? 'Present' : 'Missing')
console.log('User Data:', localStorage.getItem('user') ? 'Present' : 'Missing')
```

---

## Step 6: Test a specific permission check

```javascript
const user = JSON.parse(localStorage.getItem('user'))
const permissions = user?.permissions || []

// Test if user has customers:view permission
const hasCustomersView =
  permissions.includes('customers:view') ||  // Exact match
  permissions.includes('customers:*') ||     // Wildcard for customers
  permissions.includes('*')                  // Super Admin wildcard

console.log('Has customers:view?', hasCustomersView)
console.log('Permissions array:', permissions)
```

---

## Common Issues & Solutions

### Issue 1: `Cannot read property 'permissions' of null`
**Solution**: You're not logged in. Please log in to the application.

### Issue 2: `permissions` is undefined but user exists
**Possible causes**:
1. Old version of the application before permissions were added
2. Database role doesn't have permissions field
3. Backend didn't send permissions in login response

**Solution**: Log out and log back in

### Issue 3: Permissions is a long array, not `["*"]`
**Cause**: You logged in BEFORE we updated the Super Admin role to use wildcard

**Solution**:
1. Log out completely
2. Log back in
3. Check again - should now be `["*"]`

---

## Clean Slate (Nuclear Option)

If nothing works, clear everything and start fresh:

```javascript
// Clear all auth data
localStorage.removeItem('accessToken')
localStorage.removeItem('refreshToken')
localStorage.removeItem('user')

// Refresh the page
location.reload()

// Then log in again
```

---

## Backend Debug Endpoint

If you want to see what the backend thinks your permissions are:

### Using Browser:
1. Open Network tab in DevTools
2. Make any API request (or just navigate to a page)
3. Look at the request headers - find the Authorization header
4. Copy the token after "Bearer "

### Then in Console:
```javascript
fetch('http://localhost:5000/api/debug/permissions', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
})
.then(r => r.json())
.then(data => console.log('Backend says:', data))
```

**Expected output for Super Admin**:
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "email": "admin@example.com",
    "role": "Super Admin",
    "permissions": ["*"],
    "permissionCount": 1,
    "hasSuperAdminWildcard": true
  }
}
```

---

## Quick Permission Test in Console

```javascript
// This simulates what the sidebar does
const user = JSON.parse(localStorage.getItem('user'))
const permissions = user?.permissions || []

const navigationItems = [
  { name: "Customers", permission: "customers:view" },
  { name: "Products", permission: "products:view" },
  { name: "Invoices", permission: "invoices:view" },
  { name: "Users", permission: "users:view" },
  { name: "Admin", permission: "roles:view" },
]

console.log('Navigation visibility:')
navigationItems.forEach(item => {
  const hasPermission =
    permissions.includes(item.permission) ||
    permissions.includes(item.permission.split(':')[0] + ':*') ||
    permissions.includes('*')

  console.log(`${item.name}: ${hasPermission ? '✅ VISIBLE' : '❌ HIDDEN'}`)
})
```

**For Super Admin with `["*"]`, ALL should show ✅ VISIBLE**

---

## Report the Results

After running these commands, please share:
1. What you see for `user?.permissions`
2. Whether it's `["*"]` or a long array
3. Any error messages
4. Which navigation items you can see

This will help us diagnose the exact issue!
