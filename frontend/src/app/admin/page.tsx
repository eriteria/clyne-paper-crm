"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, User, Activity, Download, Shield } from "lucide-react";
import { apiClient } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

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
  const { hasPermission } = usePermissions();
  const { isLoading } = useAuth();
  const router = useRouter();

  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isFixingPayments, setIsFixingPayments] = useState(false);
  const [fixPaymentStatus, setFixPaymentStatus] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Fetch recent audit logs
  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery({
    queryKey: ["audit-logs", "recent"],
    queryFn: async () => {
      const response = await apiClient.get("/audit-logs/recent?limit=10");
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Show loading state while auth is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has permission to access admin features
  if (!hasPermission("roles:view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="mb-4">
            <Shield className="h-16 w-16 text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access administration features.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleGoogleSheetsImport = async () => {
    if (isImporting) return;

    if (
      !confirm(
        "Are you sure you want to trigger a Google Sheets import? This will import all data from the configured Google Sheet."
      )
    ) {
      return;
    }

    setIsImporting(true);
    setImportStatus({
      message: "Starting import... This may take several minutes.",
      type: "info",
    });

    try {
      const response = await apiClient.post("/admin-import/google-sheets");
      setImportStatus({
        message:
          response.data.message ||
          "Import started successfully! Check server logs for progress.",
        type: "success",
      });
    } catch (error: unknown) {
      console.error("Import error:", error);
      let errorMessage = "Failed to start import. Please try again.";

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }

      setImportStatus({
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFixPaymentAllocations = async () => {
    if (isFixingPayments) return;

    if (
      !confirm(
        "This will recalculate allocatedAmount and creditAmount for all existing payments based on their applications. You'll receive real-time notifications on progress. Continue?"
      )
    ) {
      return;
    }

    setIsFixingPayments(true);
    setFixPaymentStatus({
      message: "Starting payment allocation fix...",
      type: "info",
    });

    try {
      const response = await apiClient.post(
        "/admin-import/fix-payment-allocations"
      );
      setFixPaymentStatus({
        message:
          response.data.message ||
          "Payment fix started! Check the notification bell for real-time progress.",
        type: "success",
      });
    } catch (error: unknown) {
      console.error("Fix payment error:", error);
      let errorMessage = "Failed to start payment fix. Please try again.";

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }

      setFixPaymentStatus({
        message: errorMessage,
        type: "error",
      });
    } finally {
      setIsFixingPayments(false);
    }
  };

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
        {/* Google Sheets Import - PRODUCTION IMPORT TOOL */}
        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg border-2 border-green-400">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-500 rounded-md flex items-center justify-center shadow-md">
                <span className="text-white text-2xl">📥</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-gray-900">
                Google Sheets Import
              </h3>
              <p className="text-sm text-gray-600 font-medium">
                Import data from configured Google Sheets
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleGoogleSheetsImport}
              disabled={isImporting}
              className={`w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-bold rounded-md shadow-md text-white ${
                isImporting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transform hover:scale-105 transition-transform"
              }`}
            >
              <Download className="h-5 w-5 mr-2" />
              {isImporting ? "Importing..." : "Trigger Import"}
            </button>
            {importStatus && (
              <div
                className={`mt-3 p-3 rounded-md text-sm font-medium ${
                  importStatus.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : importStatus.type === "error"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {importStatus.message}
              </div>
            )}
          </div>
        </div>

        {/* Fix Payment Allocations - DATA FIX TOOL */}
        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-lg border-2 border-amber-400">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-amber-500 rounded-md flex items-center justify-center shadow-md">
                <span className="text-white text-2xl">🔧</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-bold text-gray-900">
                Fix Payment Allocations
              </h3>
              <p className="text-sm text-gray-600 font-medium">
                Recalculate allocatedAmount & creditAmount (with real-time
                notifications)
              </p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleFixPaymentAllocations}
              disabled={isFixingPayments}
              className={`w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-bold rounded-md shadow-md text-white ${
                isFixingPayments
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transform hover:scale-105 transition-transform"
              }`}
            >
              <span className="mr-2">🔧</span>
              {isFixingPayments ? "Fixing..." : "Fix Payments"}
            </button>
            {fixPaymentStatus && (
              <div
                className={`mt-3 p-3 rounded-md text-sm font-medium ${
                  fixPaymentStatus.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : fixPaymentStatus.type === "error"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {fixPaymentStatus.message}
              </div>
            )}
          </div>
        </div>

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

        {/* Opening Balance Import */}
        <Link
          href="/admin/opening-balance-import"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                <span className="text-red-600 text-lg">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Opening Balance Import
              </h3>
              <p className="text-sm text-gray-500">
                Import customer opening balances from CSV (Admin only)
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

        {/* Waybill Management */}
        <Link
          href="/admin/waybills"
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <span className="text-purple-600 text-lg">📋</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Waybill Management
              </h3>
              <p className="text-sm text-gray-500">
                Process waybills and manage location-based inventory
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
