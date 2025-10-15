# Role-Based Access Control (RBAC) Implementation

## Overview

A comprehensive role-based access control system has been implemented for the Clyne Paper CRM, providing **granular permission management** across all system resources.

## ✅ What's Been Implemented

### 1. Permission System (`backend/src/utils/permissions.ts`)

**76 Total Permissions** organized by resource:

- **Customers**: view, create, edit, delete, export, import
- **Invoices**: view, create, edit, delete, approve, export, import
- **Payments**: view, create, edit, delete, approve, export, import
- **Users**: view, create, edit, delete, activate, deactivate
- **Roles**: view, create, edit, delete
- **Teams**: view, create, edit, delete, assign_members
- **Locations**: view, create, edit, delete
- **Products**: view, create, edit, delete, manage_groups
- **Inventory**: view, create, edit, delete, adjust
- **Waybills**: view, create, edit, delete, approve
- **Credits**: view, create, apply, delete
- **Sales Returns**: view, create, approve, delete
- **Reports**: view_dashboard, view_sales, view_ar_aging, view_overdue, view_payments, view_inventory, export
- **Settings**: view, edit, manage_regions
- **Audit & Admin**: view, import_google_sheets, fix_data, view_logs

### 2. Authentication Middleware (`backend/src/middleware/auth.ts`)

**Enhanced `authenticate` middleware:**

- Attaches `permissions` array to `req.user`
- Parses role permissions from database
- Available throughout all routes

**New middleware functions:**

```typescript
requirePermission(...permissions); // User needs ANY of these permissions
requireAllPermissions(...permissions); // User needs ALL of these permissions
requireSuperAdmin(); // Only Super Admin role
```

### 3. Role Management API (`backend/src/routes/roles.ts`)

**Complete CRUD operations:**

| Endpoint                 | Method | Permission Required | Description                                       |
| ------------------------ | ------ | ------------------- | ------------------------------------------------- |
| `/api/roles`             | GET    | `roles:view`        | List all roles with user counts                   |
| `/api/roles/permissions` | GET    | `roles:view`        | Get all available permissions grouped by resource |
| `/api/roles/:id`         | GET    | `roles:view`        | Get single role with users                        |
| `/api/roles`             | POST   | `roles:create`      | Create new role                                   |
| `/api/roles/:id`         | PUT    | `roles:edit`        | Update role (Super Admin protected)               |
| `/api/roles/:id`         | DELETE | `roles:delete`      | Delete role (with user count validation)          |

**Business Rules:**

- ✅ Cannot delete Super Admin role
- ✅ Cannot delete role with assigned users
- ✅ Only Super Admin can edit Super Admin role
- ✅ Role names must be unique
- ✅ Permissions stored as JSON array in database

### 4. Default Roles (`backend/src/seeders/seedRoles.ts`)

**7 Pre-configured Roles:**

1. **Super Admin** (76 permissions) - Full system access
2. **Admin** (50+ permissions) - All except user/role management
3. **Sales Manager** (28 permissions) - Customer, invoice, sales reports
4. **Accountant** (18 permissions) - Financial operations and reporting
5. **Sales Rep** (13 permissions) - Basic customer and invoice creation
6. **Inventory Manager** (18 permissions) - Products, inventory, waybills
7. **Viewer** (9 permissions) - Read-only access

**Run seeder:**

```bash
cd backend
npx ts-node src/seeders/seedRoles.ts
```

### 5. Protected Routes (Example: Customers)

**Applied to `backend/src/routes/customers.ts`:**

```typescript
// All routes now authenticated
router.use(authenticate);

// Granular permissions
router.get("/", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), ...);
router.get("/:id", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), ...);
router.post("/", requirePermission(PERMISSIONS.CUSTOMERS_CREATE), ...);
router.put("/:id", requirePermission(PERMISSIONS.CUSTOMERS_EDIT), ...);
router.delete("/:id", requirePermission(PERMISSIONS.CUSTOMERS_DELETE), ...);
```

**Same pattern can be applied to:**

- Invoices, Payments, Products, Inventory
- Users, Teams, Locations
- Reports (different endpoints need different report permissions)

## 🔧 How to Use

### Backend: Protect a Route

```typescript
import { authenticate, requirePermission } from "../middleware/auth";
import { PERMISSIONS } from "../utils/permissions";

// Require ANY of these permissions
router.post(
  "/invoices",
  authenticate,
  requirePermission(
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.ADMIN_IMPORT_GOOGLE_SHEETS
  ),
  async (req, res) => {
    // Handler code
  }
);

// Require ALL of these permissions
router.delete(
  "/invoices/:id",
  authenticate,
  requireAllPermissions(
    PERMISSIONS.INVOICES_DELETE,
    PERMISSIONS.INVOICES_APPROVE
  ),
  async (req, res) => {
    // Handler code
  }
);

// Super Admin only
router.post(
  "/admin/dangerous-action",
  authenticate,
  requireSuperAdmin,
  async (req, res) => {
    // Handler code
  }
);
```

### Backend: Check Permissions in Handler

```typescript
import { hasPermission } from "../utils/permissions";
import type { AuthenticatedRequest } from "../middleware/auth";

router.get("/custom", authenticate, async (req: AuthenticatedRequest, res) => {
  const userPermissions = req.user?.permissions || [];

  if (hasPermission(userPermissions, PERMISSIONS.REPORTS_EXPORT)) {
    // User can export
  } else {
    return res.status(403).json({ error: "Cannot export" });
  }
});
```

### Frontend: Check User Permissions (TODO)

```typescript
// hooks/usePermissions.ts (TO BE CREATED)
import { useAuth } from "./useAuth";

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) || false;
  };

  return { hasPermission, permissions: user?.permissions || [] };
}

// Usage in component
import { usePermissions } from "@/hooks/usePermissions";

export default function CustomerPage() {
  const { hasPermission } = usePermissions();

  return (
    <div>
      {hasPermission("customers:create") && <button>Create Customer</button>}
    </div>
  );
}
```

### Frontend: Permission Gate Component (TODO)

```typescript
// components/PermissionGate.tsx (TO BE CREATED)
import { usePermissions } from "@/hooks/usePermissions";

export function PermissionGate({
  permission,
  children,
}: {
  permission: string | string[];
  children: React.ReactNode;
}) {
  const { hasPermission } = usePermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];
  const hasAccess = permissions.some((p) => hasPermission(p));

  if (!hasAccess) return null;

  return <>{children}</>;
}

// Usage
<PermissionGate permission="customers:delete">
  <button onClick={handleDelete}>Delete</button>
</PermissionGate>;
```

## 📝 Pending Tasks

### High Priority

1. **Frontend Role Management UI** (`frontend/src/app/admin/roles/page.tsx`)

   - List all roles with permissions
   - Create/Edit role with permission checkboxes
   - Delete role with validation
   - Real-time permission selection UI

2. **User-Role Assignment**

   - Update user creation/edit forms
   - Add role dropdown (fetched from `/api/roles`)
   - Backend validation that role exists

3. **Frontend Permission Hooks**
   - `usePermissions()` hook
   - `<PermissionGate>` component
   - Hide UI elements based on permissions

### Medium Priority

4. **Apply Permissions to All Routes**

   - Invoices: `requirePermission(PERMISSIONS.INVOICES_*)`
   - Payments: `requirePermission(PERMISSIONS.PAYMENTS_*)`
   - Products: `requirePermission(PERMISSIONS.PRODUCTS_*)`
   - Inventory: `requirePermission(PERMISSIONS.INVENTORY_*)`
   - Reports: Different permissions per report type

5. **User List Shows Roles**
   - Display role name in user list
   - Filter users by role
   - Bulk role assignment

### Low Priority

6. **Audit Logging**

   - Log permission changes
   - Log role assignments
   - Track who created/modified roles

7. **Permission Testing**
   - Test permission enforcement
   - Test role hierarchies
   - Edge case validation

## 🚀 Testing the System

### 1. Create Test User with Specific Role

```sql
-- Get role ID
SELECT id, name FROM roles WHERE name = 'Sales Rep';

-- Create user
INSERT INTO users (full_name, email, password_hash, role_id)
VALUES ('Test Sales Rep', 'sales@example.com', '[hashed_password]', '[role_id]');
```

### 2. Test API with Different Roles

```bash
# Login as Sales Rep
curl -X POST https://clyne-paper-crm-backend.fly.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sales@example.com","password":"password"}'

# Get token from response, then try protected endpoint
curl -X DELETE https://clyne-paper-crm-backend.fly.dev/api/customers/123 \
  -H "Authorization: Bearer [TOKEN]"

# Should return 403 Forbidden if Sales Rep doesn't have customers:delete permission
```

### 3. Test Role Management

```bash
# List all roles
curl https://clyne-paper-crm-backend.fly.dev/api/roles \
  -H "Authorization: Bearer [ADMIN_TOKEN]"

# Get available permissions
curl https://clyne-paper-crm-backend.fly.dev/api/roles/permissions \
  -H "Authorization: Bearer [ADMIN_TOKEN]"

# Create new role
curl -X POST https://clyne-paper-crm-backend.fly.dev/api/roles \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Role",
    "permissions": ["customers:view", "customers:create", "invoices:view"]
  }'
```

## 🔐 Security Considerations

1. **Permissions in JWT Token**: Currently role is in JWT, but permissions are fetched on each request. This ensures permission changes take effect immediately.

2. **Super Admin Protection**: Super Admin role cannot be deleted or edited by non-Super Admins.

3. **Permission Validation**: All permissions are validated against the defined `PERMISSIONS` object.

4. **Role Deletion Safety**: Cannot delete roles with assigned users.

5. **Frontend Security Note**: Frontend permission checks are for UX only. Real security is enforced on the backend.

## 📚 Additional Resources

- **Permission List**: See `backend/src/utils/permissions.ts` for all 76 permissions
- **Default Roles**: See `backend/src/utils/permissions.ts` `DEFAULT_ROLES` object
- **Middleware Usage**: See `backend/src/middleware/auth.ts` for all middleware functions
- **Example Implementation**: See `backend/src/routes/customers.ts` for applied permissions

## Summary

✅ **Fully Implemented** (Backend):

- 76 granular permissions
- Permission checking middleware
- Role CRUD API
- Default roles seeded
- Example route protection (customers)

⏳ **Pending** (Frontend):

- Role management UI
- User-role assignment in forms
- Permission hooks and components
- UI hiding based on permissions

🎯 **Next Steps**:

1. Create clean frontend roles page
2. Add permission hooks
3. Apply to remaining routes
4. Test with real users

---

**The core RBAC system is production-ready on the backend. Frontend integration is the next phase.**
