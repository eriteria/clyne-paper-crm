"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, User, Activity } from "lucide-react";
import { apiClient } from "@/lib/api";

interface AuditLog {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: {
      name: string;
    };
  };
}

export default function AdminPage() {
  // Fetch recent audit logs
  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery({
    queryKey: ["audit-logs", "recent"],
    queryFn: async () => {
      const response = await apiClient.get("/audit-logs/recent?limit=10");
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const recentAuditLogs: AuditLog[] = auditLogsData?.data || [];

  const getActionDescription = (auditLog: AuditLog): string => {
    const { actionType, entityType, user } = auditLog;
    const userName = user?.fullName || "Unknown User";

    switch (actionType) {
      case "CREATE":
        return `${userName} created a ${entityType.toLowerCase()}`;
      case "UPDATE":
        return `${userName} updated a ${entityType.toLowerCase()}`;
      case "DELETE":
        return `${userName} deleted a ${entityType.toLowerCase()}`;
      case "VIEW":
        return `${userName} viewed a ${entityType.toLowerCase()}`;
      case "LOGIN":
        return `${userName} logged in`;
      case "LOGOUT":
        return `${userName} logged out`;
      case "EXPORT":
        return `${userName} exported ${entityType.toLowerCase()} data`;
      case "IMPORT":
        return `${userName} imported ${entityType.toLowerCase()} data`;
      default:
        return `${userName} performed ${actionType} on ${entityType.toLowerCase()}`;
    }
  };

  const getActionColor = (actionType: string): string => {
    switch (actionType) {
      case "CREATE":
        return "text-green-600 bg-green-100";
      case "UPDATE":
        return "text-blue-600 bg-blue-100";
      case "DELETE":
        return "text-red-600 bg-red-100";
      case "VIEW":
        return "text-gray-600 bg-gray-100";
      case "LOGIN":
        return "text-purple-600 bg-purple-100";
      case "LOGOUT":
        return "text-orange-600 bg-orange-100";
      case "EXPORT":
        return "text-yellow-600 bg-yellow-100";
      case "IMPORT":
        return "text-indigo-600 bg-indigo-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Administration Panel
        </h2>
        <p className="mt-2 text-gray-600">
          Manage system settings, import data, and perform administrative tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Role Management */}
        <Link
          href="/admin/roles"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <span className="text-purple-600 text-lg">🛡️</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Role Management
              </h3>
              <p className="text-sm text-gray-500">
                Create and manage user roles and permissions
              </p>
            </div>
          </div>
        </Link>

        {/* Location Management */}
        <Link
          href="/admin/locations"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-indigo-100 rounded-md flex items-center justify-center">
                <span className="text-indigo-600 text-lg">📍</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Location Management
              </h3>
              <p className="text-sm text-gray-500">
                Manage regions and locations for teams and users
              </p>
            </div>
          </div>
        </Link>

        {/* Customer Import */}
        <Link
          href="/admin/import"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <span className="text-blue-600 text-lg">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Data Import</h3>
              <p className="text-sm text-gray-500">
                Import customer data from Excel files
              </p>
            </div>
          </div>
        </Link>

        {/* User Management */}
        <Link
          href="/admin/users"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <span className="text-green-600 text-lg">👥</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                User Management
              </h3>
              <p className="text-sm text-gray-500">
                Import users from Zoho and manage user data
              </p>
            </div>
          </div>
        </Link>

        {/* Financial Reports */}
        <Link
          href="/financial"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <span className="text-yellow-600 text-lg">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Financial Overview
              </h3>
              <p className="text-sm text-gray-500">
                View financial reports and exports
              </p>
            </div>
          </div>
        </Link>

        {/* System Settings */}
        <Link
          href="/settings"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center">
                <span className="text-gray-600 text-lg">⚙️</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Settings</h3>
              <p className="text-sm text-gray-500">
                Configure system settings and preferences
              </p>
            </div>
          </div>
        </Link>

        {/* Database Management */}
        <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                <span className="text-red-600 text-lg">🗄️</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Database</h3>
              <p className="text-sm text-gray-500">
                Database maintenance and backup tools
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Reports */}
        <Link
          href="/reports"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <span className="text-purple-600 text-lg">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Reports</h3>
              <p className="text-sm text-gray-500">
                Generate and view system reports
              </p>
            </div>
          </div>
        </Link>

        {/* Audit Logs */}
        <Link
          href="/admin/audit-logs"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
              <p className="text-sm text-gray-500">
                View complete system activity logs
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Administrative Activity
            </h3>
            <Link
              href="/admin/audit-logs"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all →
            </Link>
          </div>
        </div>
        <div className="px-6 py-4">
          {auditLogsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentAuditLogs.length > 0 ? (
            <div className="space-y-4">
              {recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(
                        log.actionType
                      )}`}
                    >
                      <Activity className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900 font-medium">
                        {getActionDescription(log)}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeAgo(log.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center mt-1 space-x-2">
                      <div className="flex items-center text-xs text-gray-500">
                        <User className="h-3 w-3 mr-1" />
                        {log.user.role.name}
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(
                          log.actionType
                        )}`}
                      >
                        {log.actionType}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p>No recent activity to display.</p>
              <p className="text-sm mt-2">
                Administrative actions will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
