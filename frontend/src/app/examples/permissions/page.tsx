/**
 * Example component showing permission system usage
 * This is a reference implementation - copy patterns to your existing components
 */

"use client";

import React from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

export default function PermissionExamplePage() {
  const {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    canAccess,
  } = usePermissions();

  // Example: Check single permission
  const canDeleteCustomers = hasPermission("customers:delete");

  // Example: Check multiple permissions (OR logic)
  const canManageCustomers = hasAnyPermission([
    "customers:edit",
    "customers:delete",
  ]);

  // Example: Check multiple permissions (AND logic)
  const canExportReport = hasAllPermissions([
    "customers:view",
    "invoices:view",
    "reports:export",
  ]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Permission System Examples</h1>

      {/* Section 1: User Info */}
      <section className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Your Permissions</h2>
        <div className="space-y-2">
          <p>
            <strong>Total Permissions:</strong> {permissions.length}
          </p>
          <p>
            <strong>Super Admin:</strong> {isSuperAdmin() ? "Yes" : "No"}
          </p>
          <details className="mt-4">
            <summary className="cursor-pointer text-blue-600 hover:underline">
              View All Permissions
            </summary>
            <ul className="mt-2 space-y-1 ml-4">
              {permissions.map((perm) => (
                <li key={perm} className="text-sm text-gray-700">
                  • {perm}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </section>

      {/* Section 2: Single Permission Check */}
      <section className="mb-8 p-6 bg-white border rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Single Permission Check</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-2">
              Can delete customers:{" "}
              <strong>{canDeleteCustomers ? "Yes" : "No"}</strong>
            </p>
            <PermissionGate permission="customers:delete">
              <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                🗑️ Delete Customer (Visible)
              </button>
            </PermissionGate>
            {!canDeleteCustomers && (
              <p className="text-gray-500 italic">
                Delete button hidden - no permission
              </p>
            )}
          </div>

          <div>
            <PermissionGate permission="customers:create">
              <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                ➕ Create Customer
              </button>
            </PermissionGate>
          </div>

          <div>
            <PermissionGate permission="customers:edit">
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                ✏️ Edit Customer
              </button>
            </PermissionGate>
          </div>
        </div>
      </section>

      {/* Section 3: Multiple Permissions (OR Logic) */}
      <section className="mb-8 p-6 bg-white border rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">
          Multiple Permissions (OR Logic)
        </h2>
        <p className="mb-4">
          Show if user has <strong>ANY</strong> of the permissions
        </p>
        <div className="space-y-4">
          <div>
            <p className="mb-2">
              Can manage customers:{" "}
              <strong>{canManageCustomers ? "Yes" : "No"}</strong>
            </p>
            <PermissionGate permission={["customers:edit", "customers:delete"]}>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-semibold mb-2">Customer Actions</p>
                <div className="space-x-2">
                  <PermissionGate permission="customers:edit">
                    <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                      Edit
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="customers:delete">
                    <button className="px-3 py-1 bg-red-500 text-white rounded text-sm">
                      Delete
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </PermissionGate>
            {!canManageCustomers && (
              <p className="text-gray-500 italic">
                Actions hidden - no edit or delete permission
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Section 4: Multiple Permissions (AND Logic) */}
      <section className="mb-8 p-6 bg-white border rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">
          Multiple Permissions (AND Logic)
        </h2>
        <p className="mb-4">
          Show if user has <strong>ALL</strong> of the permissions
        </p>
        <div>
          <p className="mb-2">
            Can export report: <strong>{canExportReport ? "Yes" : "No"}</strong>
          </p>
          <PermissionGate
            permission={["customers:view", "invoices:view", "reports:export"]}
            requireAll
          >
            <button className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
              📊 Export Customer Invoice Report
            </button>
          </PermissionGate>
          {!canExportReport && (
            <p className="text-gray-500 italic">
              Export button hidden - requires customers:view, invoices:view, and
              reports:export
            </p>
          )}
        </div>
      </section>

      {/* Section 5: canAccess Helper */}
      <section className="mb-8 p-6 bg-white border rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">canAccess Helper</h2>
        <div className="space-y-4">
          {[
            { resource: "customers", action: "view" },
            { resource: "customers", action: "create" },
            { resource: "invoices", action: "view" },
            { resource: "products", action: "edit" },
            { resource: "reports", action: "export" },
          ].map(({ resource, action }) => (
            <div
              key={`${resource}:${action}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <code className="text-sm">
                {resource}:{action}
              </code>
              <span
                className={`px-3 py-1 rounded text-sm ${
                  canAccess(resource, action)
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {canAccess(resource, action) ? "✓ Granted" : "✗ Denied"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6: Admin Features */}
      <section className="mb-8 p-6 bg-white border rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Admin Features</h2>
        <div className="space-y-4">
          <PermissionGate permission="users:view">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded">
              <p className="font-semibold">👥 User Management</p>
              <p className="text-sm text-gray-600">
                You can view and manage users
              </p>
            </div>
          </PermissionGate>

          <PermissionGate permission="roles:view">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded">
              <p className="font-semibold">🔐 Role Management</p>
              <p className="text-sm text-gray-600">
                You can view and manage roles
              </p>
            </div>
          </PermissionGate>

          {isSuperAdmin() && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-semibold">⭐ Super Admin Panel</p>
              <p className="text-sm text-gray-600">
                You have full access to all system features
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Section 7: Complex Example - Data Table */}
      <section className="mb-8 p-6 bg-white border rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">
          Complex Example: Data Table
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Customer Name</th>
                <th className="border p-2 text-left">Email</th>
                <PermissionGate
                  permission={["customers:edit", "customers:delete"]}
                >
                  <th className="border p-2 text-left">Actions</th>
                </PermissionGate>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  id: "1",
                  name: "Acme Corp",
                  email: "contact@acme.com",
                },
                {
                  id: "2",
                  name: "TechStart Inc",
                  email: "info@techstart.com",
                },
              ].map((customer) => (
                <tr key={customer.id}>
                  <td className="border p-2">{customer.name}</td>
                  <td className="border p-2">{customer.email}</td>
                  <PermissionGate
                    permission={["customers:edit", "customers:delete"]}
                  >
                    <td className="border p-2 space-x-2">
                      <PermissionGate permission="customers:edit">
                        <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs">
                          Edit
                        </button>
                      </PermissionGate>
                      <PermissionGate permission="customers:delete">
                        <button className="px-2 py-1 bg-red-500 text-white rounded text-xs">
                          Delete
                        </button>
                      </PermissionGate>
                    </td>
                  </PermissionGate>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
