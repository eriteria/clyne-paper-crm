# Frontend Permission System - Usage Guide

## Overview

The frontend permission system provides two main utilities:

1. **`usePermissions()` hook** - For checking permissions in component logic
2. **`<PermissionGate>` component** - For conditionally rendering UI elements

These work seamlessly with the backend RBAC system implemented in `backend/src/utils/permissions.ts`.

---

## Table of Contents

1. [usePermissions Hook](#usepermissions-hook)
2. [PermissionGate Component](#permissiongate-component)
3. [Integration Examples](#integration-examples)
4. [Best Practices](#best-practices)

---

## usePermissions Hook

### Import

```typescript
import { usePermissions } from "@/hooks/usePermissions";
```

### API

```typescript
const {
  permissions, // string[] - All user permissions
  hasPermission, // (permission: string) => boolean
  hasAnyPermission, // (permissions: string[]) => boolean
  hasAllPermissions, // (permissions: string[]) => boolean
  isSuperAdmin, // () => boolean
  canAccess, // (resource: string, action: string) => boolean
} = usePermissions();
```

### Usage Examples

#### 1. Check Single Permission

```typescript
function CustomerList() {
  const { hasPermission } = usePermissions();

  const handleDelete = (customerId: string) => {
    if (!hasPermission("customers:delete")) {
      alert("You don't have permission to delete customers");
      return;
    }
    // Proceed with deletion
  };

  return (
    <button
      onClick={() => handleDelete(customer.id)}
      disabled={!hasPermission("customers:delete")}
    >
      Delete
    </button>
  );
}
```

#### 2. Check Multiple Permissions (OR Logic)

```typescript
function ActionMenu() {
  const { hasAnyPermission } = usePermissions();

  // Show menu if user can edit OR delete
  const canShowMenu = hasAnyPermission(["customers:edit", "customers:delete"]);

  if (!canShowMenu) return null;

  return <DropdownMenu>...</DropdownMenu>;
}
```

#### 3. Check Multiple Permissions (AND Logic)

```typescript
function CustomerInvoiceReport() {
  const { hasAllPermissions } = usePermissions();

  // Require both permissions
  const canAccessReport = hasAllPermissions([
    "customers:view",
    "invoices:view",
  ]);

  if (!canAccessReport) {
    return <AccessDenied />;
  }

  return <ReportContent />;
}
```

#### 4. Check Super Admin Status

```typescript
function SystemSettings() {
  const { isSuperAdmin } = usePermissions();

  if (!isSuperAdmin()) {
    return <div>Access denied. Super Admin only.</div>;
  }

  return <SettingsPanel />;
}
```

#### 5. Use canAccess Helper

```typescript
function ProductActions() {
  const { canAccess } = usePermissions();

  return (
    <div>
      {canAccess("products", "edit") && <button>Edit Product</button>}
      {canAccess("products", "delete") && <button>Delete Product</button>}
    </div>
  );
}
```

#### 6. Access Raw Permissions Array

```typescript
function PermissionDebugger() {
  const { permissions } = usePermissions();

  return (
    <div>
      <h3>Your Permissions:</h3>
      <ul>
        {permissions.map((perm) => (
          <li key={perm}>{perm}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## PermissionGate Component

### Import

```typescript
import { PermissionGate } from "@/components/PermissionGate";
```

### Props

| Prop         | Type                 | Required | Default | Description                                                          |
| ------------ | -------------------- | -------- | ------- | -------------------------------------------------------------------- |
| `permission` | `string \| string[]` | Yes      | -       | Permission(s) required                                               |
| `requireAll` | `boolean`            | No       | `false` | If true, requires ALL permissions (AND). If false, requires ANY (OR) |
| `fallback`   | `React.ReactNode`    | No       | `null`  | Content to show when permission denied                               |
| `children`   | `React.ReactNode`    | Yes      | -       | Content to show when permission granted                              |

### Usage Examples

#### 1. Hide Button Based on Permission

```typescript
<PermissionGate permission="customers:delete">
  <button className="btn-danger">Delete Customer</button>
</PermissionGate>
```

#### 2. Hide Multiple Buttons with OR Logic

```typescript
{
  /* Show action menu if user can edit OR delete */
}
<PermissionGate permission={["customers:edit", "customers:delete"]}>
  <DropdownMenu>
    <MenuItem>Edit</MenuItem>
    <MenuItem>Delete</MenuItem>
  </DropdownMenu>
</PermissionGate>;
```

#### 3. Require Multiple Permissions with AND Logic

```typescript
{
  /* Show export button only if user can view customers AND invoices */
}
<PermissionGate permission={["customers:view", "invoices:view"]} requireAll>
  <button>Export Customer Invoices</button>
</PermissionGate>;
```

#### 4. Show Fallback Content

```typescript
<PermissionGate
  permission="reports:view"
  fallback={<p className="text-gray-500">Access denied</p>}
>
  <ReportsPanel />
</PermissionGate>
```

#### 5. Protect Entire Page Section

```typescript
function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      <PermissionGate permission="customers:view">
        <CustomersSummary />
      </PermissionGate>

      <PermissionGate permission="invoices:view">
        <InvoicesSummary />
      </PermissionGate>

      <PermissionGate permission="reports:view">
        <SalesReports />
      </PermissionGate>
    </div>
  );
}
```

#### 6. Conditional Rendering in Tables

```typescript
function CustomerTable({ customers }: { customers: Customer[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <PermissionGate permission={["customers:edit", "customers:delete"]}>
            <th>Actions</th>
          </PermissionGate>
        </tr>
      </thead>
      <tbody>
        {customers.map((customer) => (
          <tr key={customer.id}>
            <td>{customer.name}</td>
            <td>{customer.email}</td>
            <PermissionGate permission={["customers:edit", "customers:delete"]}>
              <td>
                <PermissionGate permission="customers:edit">
                  <button>Edit</button>
                </PermissionGate>
                <PermissionGate permission="customers:delete">
                  <button>Delete</button>
                </PermissionGate>
              </td>
            </PermissionGate>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Integration Examples

### Example 1: Customer Management Page

```typescript
"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

export default function CustomersPage() {
  const { hasPermission } = usePermissions();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>

        {/* Show create button only if user can create customers */}
        <PermissionGate permission="customers:create">
          <button className="btn-primary">+ Add Customer</button>
        </PermissionGate>
      </div>

      {/* Show customer list only if user can view customers */}
      <PermissionGate
        permission="customers:view"
        fallback={<p>You don't have permission to view customers.</p>}
      >
        <CustomerList />
      </PermissionGate>
    </div>
  );
}
```

### Example 2: Navigation Menu

```typescript
"use client";

import Link from "next/link";
import { PermissionGate } from "@/components/PermissionGate";

export function Sidebar() {
  return (
    <nav className="sidebar">
      <PermissionGate permission="customers:view">
        <Link href="/customers">Customers</Link>
      </PermissionGate>

      <PermissionGate permission="invoices:view">
        <Link href="/invoices">Invoices</Link>
      </PermissionGate>

      <PermissionGate permission="products:view">
        <Link href="/products">Products</Link>
      </PermissionGate>

      <PermissionGate permission="users:view">
        <Link href="/admin/users">User Management</Link>
      </PermissionGate>

      <PermissionGate permission="roles:view">
        <Link href="/admin/roles">Role Management</Link>
      </PermissionGate>
    </nav>
  );
}
```

### Example 3: Data Table with Actions

```typescript
"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

interface DataTableProps {
  data: any[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DataTable({ data, onEdit, onDelete }: DataTableProps) {
  const { hasAnyPermission } = usePermissions();

  // Check if user can perform any actions
  const showActionsColumn = hasAnyPermission([
    "customers:edit",
    "customers:delete",
  ]);

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          {showActionsColumn && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.email}</td>
            {showActionsColumn && (
              <td className="flex gap-2">
                <PermissionGate permission="customers:edit">
                  <button onClick={() => onEdit(item.id)}>Edit</button>
                </PermissionGate>
                <PermissionGate permission="customers:delete">
                  <button onClick={() => onDelete(item.id)}>Delete</button>
                </PermissionGate>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Example 4: Form Actions

```typescript
"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

export function CustomerForm() {
  const { hasPermission } = usePermissions();

  const handleSubmit = async (data: FormData) => {
    // Backend will also validate, but good UX to check here too
    if (
      !hasPermission("customers:create") &&
      !hasPermission("customers:edit")
    ) {
      alert("You don't have permission to save customers");
      return;
    }
    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}

      <div className="form-actions">
        {/* Show save button only if user can create or edit */}
        <PermissionGate permission={["customers:create", "customers:edit"]}>
          <button type="submit" className="btn-primary">
            Save Customer
          </button>
        </PermissionGate>

        <button type="button" className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
```

---

## Best Practices

### 1. **Always Protect Backend Endpoints**

Frontend permission checks are for UX only. Always validate permissions on the backend:

```typescript
// Backend route protection
router.delete(
  "/customers/:id",
  authenticate,
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  async (req, res) => { ... }
);
```

### 2. **Use Semantic Permission Names**

Follow the `resource:action` format for clarity:

```typescript
// Good
hasPermission("customers:delete");
hasPermission("invoices:view");
hasPermission("reports:export");

// Bad
hasPermission("delete_customer");
hasPermission("viewInvoices");
```

### 3. **Prefer PermissionGate for UI Rendering**

Use `<PermissionGate>` for showing/hiding UI elements:

```typescript
// Preferred
<PermissionGate permission="customers:delete">
  <button>Delete</button>
</PermissionGate>;

// Works but more verbose
{
  hasPermission("customers:delete") && <button>Delete</button>;
}
```

### 4. **Use usePermissions Hook for Logic**

Use the hook for conditional logic, API calls, and validation:

```typescript
const { hasPermission } = usePermissions();

const handleAction = () => {
  if (!hasPermission("customers:edit")) {
    showError("No permission");
    return;
  }
  // Proceed with action
};
```

### 5. **Provide User Feedback**

Use fallback content to explain why content is hidden:

```typescript
<PermissionGate
  permission="reports:view"
  fallback={
    <div className="alert alert-warning">
      You need the "View Reports" permission to access this feature. Please
      contact your administrator.
    </div>
  }
>
  <ReportsPanel />
</PermissionGate>
```

### 6. **Group Related Permissions**

When checking multiple permissions, be clear about AND vs OR logic:

```typescript
// OR logic - user needs ANY of these
<PermissionGate permission={["customers:edit", "customers:delete"]}>
  <ActionMenu />
</PermissionGate>

// AND logic - user needs ALL of these
<PermissionGate
  permission={["customers:view", "invoices:view"]}
  requireAll
>
  <CustomerInvoiceReport />
</PermissionGate>
```

### 7. **Test with Different Roles**

Always test your UI with different user roles:

- Super Admin (all permissions)
- Admin (most permissions)
- Sales Rep (limited permissions)
- Viewer (read-only)

### 8. **Consider Loading States**

Handle cases where user data might not be loaded yet:

```typescript
function MyComponent() {
  const { user, isLoading } = useAuth();
  const { hasPermission } = usePermissions();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <PermissionGate permission="customers:view">
      <CustomerList />
    </PermissionGate>
  );
}
```

---

## Available Permissions

See `backend/src/utils/permissions.ts` for the complete list of 76 permissions. Here are the main categories:

### Customers

- `customers:view`
- `customers:create`
- `customers:edit`
- `customers:delete`

### Invoices

- `invoices:view`
- `invoices:create`
- `invoices:edit`
- `invoices:delete`
- `invoices:approve`
- `invoices:reject`

### Products

- `products:view`
- `products:create`
- `products:edit`
- `products:delete`

### Users & Roles

- `users:view`
- `users:create`
- `users:edit`
- `users:delete`
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

...and many more. Check the full list in the backend permissions file.

---

## Troubleshooting

### Permissions Not Working?

1. **Check if user is logged in:**

   ```typescript
   const { user } = useAuth();
   console.log("User:", user);
   console.log("Permissions:", user?.permissions);
   ```

2. **Check if backend returns permissions:**

   - Login and check the response in browser DevTools Network tab
   - Verify the `/api/auth/login` response includes `permissions` array

3. **Check if role has permissions:**

   - Use Prisma Studio or database client to verify the role has permissions set
   - Run the role seeder: `npm run db:seed:roles`

4. **Clear localStorage and re-login:**
   ```javascript
   localStorage.clear();
   // Then login again
   ```

### Component Not Hiding?

If `<PermissionGate>` isn't hiding content:

1. Check the permission string format (must be exact match)
2. Verify the permission exists in the backend permissions list
3. Use browser React DevTools to inspect the component props

---

## Next Steps

1. **Apply to existing pages**: Start adding `<PermissionGate>` to your existing UI components
2. **Update navigation**: Hide menu items user can't access
3. **Protect admin routes**: Use permissions in route middleware
4. **Add permission checks to forms**: Disable/hide form actions based on permissions

For backend RBAC documentation, see `docs/RBAC_IMPLEMENTATION.md`.
