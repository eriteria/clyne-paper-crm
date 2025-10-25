"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import Link from "next/link";
import { Shield, ArrowLeft, Users, Edit, Trash2, Plus, X, Check } from "lucide-react";

interface Role {
  id: string;
  name: string;
  permissions: string[];
  _count?: {
    users: number;
  };
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

// All available permissions grouped by category
const PERMISSION_CATEGORIES = {
  "Customer Management": [
    "customers:view",
    "customers:create",
    "customers:edit",
    "customers:delete",
    "customers:export",
    "customers:import",
  ],
  "Invoice Management": [
    "invoices:view",
    "invoices:create",
    "invoices:edit",
    "invoices:delete",
    "invoices:approve",
    "invoices:export",
    "invoices:import",
  ],
  "Payment Management": [
    "payments:view",
    "payments:create",
    "payments:edit",
    "payments:delete",
    "payments:approve",
    "payments:export",
    "payments:import",
  ],
  "User Management": [
    "users:view",
    "users:create",
    "users:edit",
    "users:delete",
    "users:activate",
    "users:deactivate",
  ],
  "Role Management": [
    "roles:view",
    "roles:create",
    "roles:edit",
    "roles:delete",
  ],
  "Team Management": [
    "teams:view",
    "teams:create",
    "teams:edit",
    "teams:delete",
    "teams:assign_members",
  ],
  "Location Management": [
    "locations:view",
    "locations:create",
    "locations:edit",
    "locations:delete",
  ],
  "Product Management": [
    "products:view",
    "products:create",
    "products:edit",
    "products:delete",
    "products:manage_groups",
  ],
  "Inventory Management": [
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "inventory:delete",
    "inventory:adjust",
  ],
  "Waybill Management": [
    "waybills:view",
    "waybills:create",
    "waybills:edit",
    "waybills:delete",
    "waybills:approve",
  ],
  "Credit Management": [
    "credits:view",
    "credits:create",
    "credits:apply",
    "credits:delete",
  ],
  "Sales Returns": [
    "returns:view",
    "returns:create",
    "returns:approve",
    "returns:delete",
  ],
  "Reports": [
    "reports:view_dashboard",
    "reports:view_sales",
    "reports:view_financial",
    "reports:view_ar_aging",
    "reports:view_overdue",
    "reports:view_payments",
    "reports:view_inventory",
    "reports:export",
  ],
  "System Settings": [
    "settings:view",
    "settings:edit",
    "settings:manage_regions",
  ],
  "Audit & Admin": [
    "audit:view",
    "admin:import_google_sheets",
    "admin:fix_data",
    "admin:view_logs",
  ],
};

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const queryClient = useQueryClient();

  // Fetch roles
  const {
    data: rolesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/roles");
      return response.data;
    },
  });

  const roles: Role[] = rolesData?.data || [];

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; permissions: string[] }) => {
      const response = await apiClient.post("/admin/roles", {
        name: data.name,
        permissions: JSON.stringify(data.permissions),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setShowCreateModal(false);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; permissions: string[] }) => {
      const response = await apiClient.patch(`/admin/roles/${data.id}`, {
        name: data.name,
        permissions: JSON.stringify(data.permissions),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setShowEditModal(false);
      setSelectedRole(null);
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const response = await apiClient.delete(`/admin/roles/${roleId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setShowDeleteModal(false);
      setRoleToDelete(null);
    },
  });

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              Error loading roles: {(error as any).message}
            </p>
            <p className="text-sm text-red-600 mt-2">
              You may not have permission to view roles. Contact your
              administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-purple-600" />
                  Role Management
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage user roles and permissions
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Role
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Roles List */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Roles</h2>
            <p className="text-sm text-gray-600 mt-1">
              {roles.length} {roles.length === 1 ? "role" : "roles"} configured
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {roles.map((role) => {
              const userCount = role._count?.users ?? role.userCount ?? 0;
              return (
                <div
                  key={role.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Shield className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            {role.name}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-600 flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {userCount} {userCount === 1 ? "user" : "users"}
                            </span>
                            <span className="text-sm text-gray-600">
                              {Array.isArray(role.permissions)
                                ? role.permissions.length
                                : 0}{" "}
                              permissions
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Permissions Preview */}
                      {Array.isArray(role.permissions) &&
                        role.permissions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {role.permissions.slice(0, 5).map((perm, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {perm}
                              </span>
                            ))}
                            {role.permissions.length > 5 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                +{role.permissions.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEditRole(role)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Role"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Role"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {roles.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No roles found
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first role to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Role
            </button>
          </div>
        )}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <RoleFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createRoleMutation.mutate(data)}
          isLoading={createRoleMutation.isPending}
        />
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <RoleFormModal
          mode="edit"
          role={selectedRole}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRole(null);
          }}
          onSubmit={(data) =>
            updateRoleMutation.mutate({ id: selectedRole.id, ...data })
          }
          isLoading={updateRoleMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && roleToDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Role
              </h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-gray-600">
                Are you sure you want to delete the role{" "}
                <span className="font-semibold">{roleToDelete.name}</span>?
              </p>
              {(roleToDelete._count?.users ?? roleToDelete.userCount ?? 0) > 0 && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    This role has{" "}
                    {roleToDelete._count?.users ?? roleToDelete.userCount} user(s)
                    assigned. You must reassign them before deleting this role.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteRoleMutation.mutate(roleToDelete.id)}
                disabled={deleteRoleMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteRoleMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Role Form Modal Component
function RoleFormModal({
  mode,
  role,
  onClose,
  onSubmit,
  isLoading,
}: {
  mode: "create" | "edit";
  role?: Role;
  onClose: () => void;
  onSubmit: (data: { name: string; permissions: string[] }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(role?.name || "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.permissions || []
  );

  const togglePermission = (permission: string) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const toggleCategory = (category: string) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
    const allSelected = categoryPermissions.every((p) =>
      selectedPermissions.includes(p)
    );

    if (allSelected) {
      setSelectedPermissions(
        selectedPermissions.filter((p) => !categoryPermissions.includes(p))
      );
    } else {
      const newPermissions = [...selectedPermissions];
      categoryPermissions.forEach((p) => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p);
        }
      });
      setSelectedPermissions(newPermissions);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter a role name");
      return;
    }
    onSubmit({ name: name.trim(), permissions: selectedPermissions });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === "create" ? "Create New Role" : "Edit Role"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Role Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                placeholder="e.g., Sales Manager"
                required
              />
            </div>

            {/* Permissions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Permissions ({selectedPermissions.length} selected)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const allPermissions = Object.values(PERMISSION_CATEGORIES).flat();
                    if (selectedPermissions.length === allPermissions.length) {
                      setSelectedPermissions([]);
                    } else {
                      setSelectedPermissions(allPermissions);
                    }
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  {selectedPermissions.length ===
                  Object.values(PERMISSION_CATEGORIES).flat().length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, permissions]) => {
                  const allSelected = permissions.every((p) =>
                    selectedPermissions.includes(p)
                  );
                  const someSelected = permissions.some((p) =>
                    selectedPermissions.includes(p)
                  );

                  return (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{category}</h4>
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className={`flex items-center text-sm font-medium ${
                            allSelected
                              ? "text-purple-600"
                              : someSelected
                              ? "text-purple-500"
                              : "text-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 mr-2 border-2 rounded flex items-center justify-center ${
                              allSelected
                                ? "bg-purple-600 border-purple-600"
                                : someSelected
                                ? "bg-purple-200 border-purple-400"
                                : "border-gray-300"
                            }`}
                          >
                            {allSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          {allSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {permissions.map((permission) => {
                          const isSelected = selectedPermissions.includes(permission);
                          return (
                            <label
                              key={permission}
                              className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePermission(permission)}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">
                                {permission}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create Role"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
