"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Shield, Users, Save, X } from "lucide-react";
import { apiClient } from "@/lib/api";

interface Role {
  id: string;
  name: string;
  permissions: string;
  _count?: {
    users: number;
  };
  createdAt: string;
}

interface RoleFormData {
  name: string;
  permissions: Record<string, string[]>;
}

const defaultPermissions = {
  users: ["create", "read", "update", "delete"],
  teams: ["create", "read", "update", "delete"],
  regions: ["create", "read", "update", "delete"],
  inventory: ["create", "read", "update", "delete"],
  invoices: ["create", "read", "update", "delete"],
  customers: ["create", "read", "update", "delete"],
  reports: ["read", "export"],
  admin: ["full-access"],
  financial: ["read", "export"],
  payments: ["read", "update"],
};

const permissionLabels = {
  users: "User Management",
  teams: "Team Management",
  regions: "Region Management",
  inventory: "Inventory Management",
  invoices: "Invoice Management",
  customers: "Customer Management",
  reports: "Reports",
  admin: "Admin Access",
  financial: "Financial Data",
  payments: "Payment Management",
};

export default function RolesPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: "",
    permissions: {},
  });

  const queryClient = useQueryClient();

  // Fetch roles
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/roles");
      return response.data;
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const response = await apiClient.post("/admin/roles", {
        ...data,
        permissions: JSON.stringify(data.permissions),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setIsCreating(false);
      setFormData({ name: "", permissions: {} });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoleFormData }) => {
      const response = await apiClient.patch(`/admin/roles/${id}`, {
        ...data,
        permissions: JSON.stringify(data.permissions),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setEditingRole(null);
      setFormData({ name: "", permissions: {} });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/admin/roles/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    },
  });

  const roles: Role[] = rolesData?.data || [];

  const handleCreateRole = () => {
    setIsCreating(true);
    setFormData({ name: "", permissions: {} });
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      permissions: (() => {
        try {
          return role.permissions ? JSON.parse(role.permissions) : {};
        } catch (error) {
          console.error(
            "Error parsing permissions for role:",
            role.name,
            error
          );
          return {};
        }
      })(),
    });
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setEditingRole(null);
    setFormData({ name: "", permissions: {} });
  };

  const handleSaveRole = () => {
    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handleDeleteRole = (role: Role) => {
    if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const handlePermissionChange = (
    module: string,
    permission: string,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: checked
          ? [...(prev.permissions[module] || []), permission]
          : (prev.permissions[module] || []).filter((p) => p !== permission),
      },
    }));
  };

  const isPermissionChecked = (module: string, permission: string) => {
    return formData.permissions[module]?.includes(permission) || false;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>
        <button
          onClick={handleCreateRole}
          disabled={isCreating || editingRole !== null}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingRole) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingRole ? "Edit Role" : "Create New Role"}
            </h3>
            <button
              onClick={handleCancelEdit}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Role Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Enter role name"
              />
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(permissionLabels).map(([module, label]) => (
                  <div
                    key={module}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h4 className="font-medium text-gray-900 mb-2">{label}</h4>
                    <div className="space-y-2">
                      {defaultPermissions[
                        module as keyof typeof defaultPermissions
                      ].map((permission) => (
                        <label key={permission} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isPermissionChecked(module, permission)}
                            onChange={(e) =>
                              handlePermissionChange(
                                module,
                                permission,
                                e.target.checked
                              )
                            }
                            className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {permission}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSaveRole}
                disabled={
                  !formData.name.trim() ||
                  createRoleMutation.isPending ||
                  updateRoleMutation.isPending
                }
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingRole ? "Update Role" : "Create Role"}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roles List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Existing Roles</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => {
                let permissions = {};
                try {
                  permissions = role.permissions
                    ? JSON.parse(role.permissions)
                    : {};
                } catch (error) {
                  console.error(
                    "Error parsing permissions for role:",
                    role.name,
                    error
                  );
                  permissions = {};
                }
                const permissionCount =
                  Object.values(permissions).flat().length;

                return (
                  <tr key={role.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className="w-5 h-5 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {role.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-600">
                          {role._count?.users || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {permissionCount} permissions
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(role.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditRole(role)}
                        disabled={isCreating || editingRole !== null}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role)}
                        disabled={
                          role.name === "Admin" || deleteRoleMutation.isPending
                        }
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
