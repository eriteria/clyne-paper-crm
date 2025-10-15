# Permission System Integration - Quick Start

## Step 1: Update Backend Auth (Already Done ✅)

The backend `/api/auth/login` and `/api/auth/profile` endpoints now return:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "fullName": "...",
      "email": "...",
      "role": "Sales Manager",
      "roleId": "...",
      "permissions": [
        "customers:view",
        "customers:create",
        "customers:edit",
        "invoices:view"
        // ... more permissions
      ]
    }
  }
}
```

## Step 2: Update User Type (Already Done ✅)

The `User` type in `frontend/src/types/index.ts` now includes:

```typescript
export interface User {
  // ... existing fields
  roleId?: string;
  permissions?: string[];
}
```

## Step 3: Use in Your Components

### Example 1: Update Customer List Page

**Before:**

```typescript
// frontend/src/app/customers/page.tsx
export default function CustomersPage() {
  return (
    <div>
      <button>+ Add Customer</button>
      <button>Delete Selected</button>
      <CustomerTable />
    </div>
  );
}
```

**After:**

```typescript
// frontend/src/app/customers/page.tsx
import { PermissionGate } from "@/components/PermissionGate";

export default function CustomersPage() {
  return (
    <div>
      <PermissionGate permission="customers:create">
        <button>+ Add Customer</button>
      </PermissionGate>

      <PermissionGate permission="customers:delete">
        <button>Delete Selected</button>
      </PermissionGate>

      <PermissionGate
        permission="customers:view"
        fallback={<p>You don't have permission to view customers.</p>}
      >
        <CustomerTable />
      </PermissionGate>
    </div>
  );
}
```

### Example 2: Update Sidebar Navigation

**Before:**

```typescript
// frontend/src/components/Sidebar.tsx
export function Sidebar() {
  return (
    <nav>
      <Link href="/customers">Customers</Link>
      <Link href="/invoices">Invoices</Link>
      <Link href="/admin/users">Users</Link>
      <Link href="/admin/roles">Roles</Link>
    </nav>
  );
}
```

**After:**

```typescript
// frontend/src/components/Sidebar.tsx
import { PermissionGate } from "@/components/PermissionGate";

export function Sidebar() {
  return (
    <nav>
      <PermissionGate permission="customers:view">
        <Link href="/customers">Customers</Link>
      </PermissionGate>

      <PermissionGate permission="invoices:view">
        <Link href="/invoices">Invoices</Link>
      </PermissionGate>

      <PermissionGate permission="users:view">
        <Link href="/admin/users">Users</Link>
      </PermissionGate>

      <PermissionGate permission="roles:view">
        <Link href="/admin/roles">Roles</Link>
      </PermissionGate>
    </nav>
  );
}
```

### Example 3: Add Permission Checks to Table Actions

**Before:**

```typescript
// Some table component
function CustomerRow({ customer }) {
  return (
    <tr>
      <td>{customer.name}</td>
      <td>
        <button onClick={() => handleEdit(customer.id)}>Edit</button>
        <button onClick={() => handleDelete(customer.id)}>Delete</button>
      </td>
    </tr>
  );
}
```

**After:**

```typescript
import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

function CustomerRow({ customer }) {
  const { hasAnyPermission } = usePermissions();

  // Only show actions column if user has any action permissions
  const showActions = hasAnyPermission(["customers:edit", "customers:delete"]);

  return (
    <tr>
      <td>{customer.name}</td>
      {showActions && (
        <td>
          <PermissionGate permission="customers:edit">
            <button onClick={() => handleEdit(customer.id)}>Edit</button>
          </PermissionGate>

          <PermissionGate permission="customers:delete">
            <button onClick={() => handleDelete(customer.id)}>Delete</button>
          </PermissionGate>
        </td>
      )}
    </tr>
  );
}
```

### Example 4: Protect Admin Routes

Create a middleware component:

```typescript
// frontend/src/components/RequirePermission.tsx
"use client";

import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface RequirePermissionProps {
  permission: string | string[];
  requireAll?: boolean;
  redirectTo?: string;
  children: React.ReactNode;
}

export function RequirePermission({
  permission,
  requireAll = false,
  redirectTo = "/",
  children,
}: RequirePermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();
  const router = useRouter();

  const hasAccess =
    typeof permission === "string"
      ? hasPermission(permission)
      : requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);

  useEffect(() => {
    if (!hasAccess) {
      router.push(redirectTo);
    }
  }, [hasAccess, redirectTo, router]);

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
}
```

Then use in protected pages:

```typescript
// frontend/src/app/admin/users/page.tsx
import { RequirePermission } from "@/components/RequirePermission";

export default function AdminUsersPage() {
  return (
    <RequirePermission permission="users:view" redirectTo="/dashboard">
      <div>
        <h1>User Management</h1>
        {/* Your page content */}
      </div>
    </RequirePermission>
  );
}
```

## Step 4: Test with Different Roles

1. **Login as Super Admin** (has all permissions)

   - Should see all buttons, links, and features

2. **Login as Sales Rep** (limited permissions)

   - Should only see customer/invoice view/create features
   - Should NOT see delete buttons, admin pages, etc.

3. **Login as Viewer** (read-only)
   - Should only see view permissions
   - Should NOT see any create/edit/delete buttons

## Step 5: Backend Route Protection (Already Done for Customers ✅)

All backend routes should be protected. Example pattern:

```typescript
// backend/src/routes/customers.ts
import { authenticate, requirePermission } from "../middleware/auth";
import { PERMISSIONS } from "../utils/permissions";

// Apply authentication to all routes
router.use(authenticate);

// Protect each endpoint
router.get(
  "/",
  requirePermission(PERMISSIONS.CUSTOMERS_VIEW),
  async (req, res) => {
    // List customers
  }
);

router.post(
  "/",
  requirePermission(PERMISSIONS.CUSTOMERS_CREATE),
  async (req, res) => {
    // Create customer
  }
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.CUSTOMERS_EDIT),
  async (req, res) => {
    // Update customer
  }
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  async (req, res) => {
    // Delete customer
  }
);
```

## Common Permission Patterns

### View/List Permissions

```typescript
<PermissionGate permission="customers:view">
  <CustomerList />
</PermissionGate>
```

### Create Permissions

```typescript
<PermissionGate permission="customers:create">
  <button>+ Add New</button>
</PermissionGate>
```

### Edit Permissions

```typescript
<PermissionGate permission="customers:edit">
  <button onClick={handleEdit}>Edit</button>
</PermissionGate>
```

### Delete Permissions

```typescript
<PermissionGate permission="customers:delete">
  <button onClick={handleDelete}>Delete</button>
</PermissionGate>
```

### Multiple Actions (OR Logic)

```typescript
{
  /* Show if user can edit OR delete */
}
<PermissionGate permission={["customers:edit", "customers:delete"]}>
  <DropdownMenu>
    <MenuItem>Actions</MenuItem>
  </DropdownMenu>
</PermissionGate>;
```

### Multiple Actions (AND Logic)

```typescript
{
  /* Show only if user has BOTH permissions */
}
<PermissionGate permission={["customers:view", "invoices:view"]} requireAll>
  <button>Export Customer Invoices</button>
</PermissionGate>;
```

## Available Permissions (76 Total)

### Customers

- `customers:view` - View customer list/details
- `customers:create` - Create new customers
- `customers:edit` - Edit customer information
- `customers:delete` - Delete customers

### Invoices

- `invoices:view` - View invoices
- `invoices:create` - Create new invoices
- `invoices:edit` - Edit invoices
- `invoices:delete` - Delete invoices
- `invoices:approve` - Approve invoices
- `invoices:reject` - Reject invoices

### Products

- `products:view`
- `products:create`
- `products:edit`
- `products:delete`

### Inventory

- `inventory:view`
- `inventory:create`
- `inventory:edit`
- `inventory:delete`
- `inventory:adjust` - Adjust inventory levels

### Users & Administration

- `users:view`
- `users:create`
- `users:edit`
- `users:delete`
- `users:activate` - Activate/deactivate users
- `roles:view`
- `roles:create`
- `roles:edit`
- `roles:delete`

### Reports

- `reports:view`
- `reports:export`
- `reports:sales`
- `reports:inventory`
- `reports:financial`

**See `backend/src/utils/permissions.ts` for complete list of all 76 permissions.**

## Troubleshooting

### "Permissions not working after login"

1. Clear localStorage and login again:

   ```javascript
   localStorage.clear();
   ```

2. Check browser console for user data:

   ```javascript
   JSON.parse(localStorage.getItem("user"));
   ```

3. Verify the user object has `permissions` array

### "All buttons still visible"

1. Make sure you've wrapped the component with `<PermissionGate>`
2. Check that the permission string matches exactly (case-sensitive)
3. Verify the user's role has that permission in the database

### "Getting 403 Forbidden from API"

This is correct! The backend is protecting the endpoint. Make sure:

1. The frontend shows/hides the UI based on permissions
2. Users can't access features they don't have permission for

## Next Steps

1. ✅ **Backend auth updated** - Returns permissions in login response
2. ✅ **Frontend types updated** - User type includes permissions
3. ✅ **Hooks created** - `usePermissions()` hook ready to use
4. ✅ **Component created** - `<PermissionGate>` ready to use
5. ⏳ **Apply to existing pages** - Update your components to use permissions
6. ⏳ **Update navigation** - Hide menu items based on permissions
7. ⏳ **Protect remaining backend routes** - Add permission checks to all routes

For detailed examples and API reference, see: `docs/FRONTEND_PERMISSIONS_GUIDE.md`
