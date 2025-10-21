"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import Link from "next/link";
import { Shield, ArrowLeft, Users, Edit, Trash2 } from "lucide-react";

interface Role {
  id: string;
  name: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Fetch roles
  const { data: rolesData, isLoading, error } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const response = await apiClient.get("/roles");
      return response.data;
    },
  });

  const roles: Role[] = rolesData?.data || [];

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
            {roles.map((role) => (
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
                            {role.userCount}{" "}
                            {role.userCount === 1 ? "user" : "users"}
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
                      onClick={() => setSelectedRole(role)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role Details Modal */}
        {selectedRole && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRole(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedRole.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Role details and permissions
                </p>
              </div>

              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Permissions ({Array.isArray(selectedRole.permissions) ? selectedRole.permissions.length : 0})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(selectedRole.permissions) &&
                        selectedRole.permissions.map((perm, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800"
                          >
                            {perm}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Users
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedRole.userCount}{" "}
                      {selectedRole.userCount === 1 ? "user" : "users"}{" "}
                      assigned to this role
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setSelectedRole(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {roles.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No roles found
            </h3>
            <p className="text-gray-600">
              Roles need to be seeded in the database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
