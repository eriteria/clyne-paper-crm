"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  Calendar,
  DollarSign,
  // User,
  // Building,
  UserPlus,
  Upload,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import CreateInvoiceModal from "@/components/CreateInvoiceModal";
import CreateCustomerModal from "@/components/CreateCustomerModal";
import InvoiceDetailModal from "@/components/InvoiceDetailModal";
import { BankAccountOverrideModal } from "@/components/BankAccountOverrideModal";
import { Invoice } from "@/types";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { usePageTitle } from "@/hooks/usePageTitle";

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function InvoicesPage() {
  usePageTitle("Invoices");

  const { hasPermission } = usePermissions();
  const router = useRouter();

  // All hooks must be called before any conditional returns
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState<Invoice | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);

  const queryClient = useQueryClient();

  // Debounce custom dates to prevent excessive API calls
  const debouncedStartDate = useDebounce(customStartDate, 500);
  const debouncedEndDate = useDebounce(customEndDate, 500);

  // Only use custom dates if both are provided
  const shouldUseCustomDates = debouncedStartDate && debouncedEndDate;

  // Fetch invoices
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: [
      "invoices",
      searchTerm,
      filterStatus,
      filterDateRange,
      shouldUseCustomDates ? debouncedStartDate : null,
      shouldUseCustomDates ? debouncedEndDate : null,
      currentPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filterStatus) params.append("status", filterStatus);
      if (shouldUseCustomDates) {
        params.append("startDate", debouncedStartDate);
        params.append("endDate", debouncedEndDate);
      } else if (filterDateRange) {
        params.append("dateRange", filterDateRange);
      }
      params.append("page", currentPage.toString());
      params.append("limit", "50");

      const response = await apiClient.get(`/invoices?${params}`);
      return response.data;
    },
  });

  // Fetch invoice statistics with same filters
  const { data: invoiceStats } = useQuery({
    queryKey: [
      "invoice-stats",
      searchTerm,
      filterStatus,
      filterDateRange,
      shouldUseCustomDates ? debouncedStartDate : null,
      shouldUseCustomDates ? debouncedEndDate : null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filterStatus) params.append("status", filterStatus);
      if (shouldUseCustomDates) {
        params.append("startDate", debouncedStartDate);
        params.append("endDate", debouncedEndDate);
      } else if (filterDateRange) {
        params.append("dateRange", filterDateRange);
      }

      const response = await apiClient.get(`/invoices/stats?${params}`);
      return response.data.data;
    },
  });

  // Update status mutation
  /* const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.patch(`/invoices/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  }); */

  // Post draft (publish) mutation
  const postDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/invoices/${id}/post`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/invoices/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      alert(`Invoice approved successfully!`);
    },
    onError: (error: Error) => {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ||
        error.message ||
        "Failed to approve invoice";
      alert(`Error: ${errorMessage}`);
      console.error("Approve error:", error);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiClient.post(`/invoices/${id}/reject`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      alert(`Invoice rejected successfully!`);
    },
    onError: (error: Error) => {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ||
        error.message ||
        "Failed to reject invoice";
      alert(`Error: ${errorMessage}`);
      console.error("Reject error:", error);
    },
  });

  const invoices = invoicesData?.data || [];
  const pagination = invoicesData?.pagination || {
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 1,
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterDateRange, shouldUseCustomDates]);

  // Since backend handles filtering, use invoices directly
  const filteredInvoices = invoices;

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      draft: "bg-gray-100 text-gray-800",
      DRAFT: "bg-gray-100 text-gray-800",
      OPEN: "bg-blue-100 text-blue-700",
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      COMPLETED: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const getApprovalBadge = (approvalStatus: string) => {
    const badges: { [key: string]: { color: string; label: string } } = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "Approved" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "Rejected" },
    };
    return (
      badges[approvalStatus] || {
        color: "bg-gray-100 text-gray-800",
        label: approvalStatus,
      }
    );
  };

  // Check permission after all hooks are declared
  if (!hasPermission("invoices:view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="mb-4">
            <FileText className="h-16 w-16 text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to view invoices.
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4">Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Invoice Management
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Track sales and manage billing
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <button
            onClick={() => setShowCreateCustomerModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Customer
          </button>
          <button
            onClick={() => router.push("/invoices/import")}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import Invoices
          </button>
          <button
            onClick={() => setShowCreateInvoiceModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full p-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">
                {invoiceStats?.totalInvoices ?? pagination.total}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-full p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Revenue (Completed)</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Number(invoiceStats?.paidAmount ?? 0))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Invoice amounts marked complete
              </p>
              {invoiceStats?.actualPaidAmount !== undefined && (
                <p className="text-xs text-green-600 mt-1">
                  Actual payments:{" "}
                  {formatCurrency(Number(invoiceStats.actualPaidAmount))}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 rounded-full p-3">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Number(invoiceStats?.pendingAmount ?? 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-full p-3">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Period</p>
              <p className="text-2xl font-bold text-gray-900">
                {invoiceStats?.totalInvoices ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search invoices..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="OPEN">Open</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            value={filterDateRange}
            onChange={(e) => {
              setFilterDateRange(e.target.value);
              // Clear custom dates when using preset ranges
              if (e.target.value) {
                setCustomStartDate("");
                setCustomEndDate("");
              }
            }}
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">
              From:
            </label>
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              value={customStartDate}
              max={customEndDate || undefined}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                // Clear preset range when using custom dates
                if (e.target.value && customEndDate) {
                  setFilterDateRange("");
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">
              To:
            </label>
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              value={customEndDate}
              min={customStartDate || undefined}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                // Clear preset range when using custom dates
                if (e.target.value && customStartDate) {
                  setFilterDateRange("");
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            {(customStartDate || customEndDate || filterDateRange) && (
              <button
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                  setFilterDateRange("");
                }}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                Clear Filters
              </button>
            )}
            <div className="text-sm text-gray-600 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              {pagination.total} invoices
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approval
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInvoices.map((invoice: Invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.customerName}
                      </div>
                      {invoice.customerContact && (
                        <div className="text-sm text-gray-500">
                          {invoice.customerContact}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(Number(invoice.totalAmount))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                        invoice.status
                      )}`}
                    >
                      {invoice.status.charAt(0).toUpperCase() +
                        invoice.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        getApprovalBadge(invoice.approvalStatus || "PENDING")
                          .color
                      }`}
                    >
                      {
                        getApprovalBadge(invoice.approvalStatus || "PENDING")
                          .label
                      }
                    </span>
                    {invoice.approvedBy && (
                      <div className="text-xs text-gray-500 mt-1">
                        by {invoice.approvedBy.fullName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {invoice.team?.name || "Unassigned"}
                    </div>
                    {invoice.region && (
                      <div className="text-sm text-gray-500">
                        {invoice.region.name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-1 md:gap-2">
                      {/* View invoice details with returns */}
                      <button
                        className="text-indigo-600 hover:text-indigo-900 p-2 md:p-1 rounded transition-colors"
                        title="View invoice details"
                        onClick={() => setViewingInvoice(invoice)}
                      >
                        <Eye className="h-5 w-5 md:h-4 md:w-4" />
                      </button>
                      <button
                        className="text-green-600 hover:text-green-900 p-2 md:p-1 rounded transition-colors"
                        title="Download PDF"
                        onClick={() => {
                          console.log(
                            "Download button clicked, invoice:",
                            invoice
                          );
                          setDownloadingInvoice(invoice);
                        }}
                      >
                        <Download className="h-5 w-5 md:h-4 md:w-4" />
                      </button>
                      <button
                        className="text-blue-600 hover:text-blue-900 p-2 md:p-1 rounded transition-colors"
                        title="Edit invoice"
                        onClick={() => setEditingInvoice(invoice)}
                      >
                        <Edit className="h-5 w-5 md:h-4 md:w-4" />
                      </button>
                      {invoice.status === "DRAFT" && (
                        <button
                          onClick={() => postDraftMutation.mutate(invoice.id)}
                          className="text-green-600 hover:text-green-900 p-2 md:p-1 rounded transition-colors"
                          title={
                            postDraftMutation.isPending
                              ? "Posting..."
                              : "Post now"
                          }
                          disabled={postDraftMutation.isPending}
                        >
                          {postDraftMutation.isPending ? (
                            <span className="text-xs">Posting…</span>
                          ) : (
                            <span className="text-xs font-medium">Post</span>
                          )}
                        </button>
                      )}
                      {/* Approve button - only show for pending invoices and users with approve permission */}
                      {invoice.approvalStatus === "PENDING" &&
                        invoice.status !== "DRAFT" &&
                        hasPermission("invoices:approve") && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Are you sure you want to approve this invoice?"
                                )
                              ) {
                                approveMutation.mutate(invoice.id);
                              }
                            }}
                            className="text-green-600 hover:text-green-900 p-2 md:p-1 rounded transition-colors"
                            title="Approve invoice"
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <span className="text-xs font-semibold">✓</span>
                            )}
                          </button>
                        )}
                      {/* Reject button - only show for pending invoices and users with approve permission */}
                      {invoice.approvalStatus === "PENDING" &&
                        invoice.status !== "DRAFT" &&
                        hasPermission("invoices:approve") && (
                          <button
                            onClick={() => {
                              const reason = window.prompt(
                                "Please provide a reason for rejection:"
                              );
                              if (reason && reason.trim()) {
                                rejectMutation.mutate({
                                  id: invoice.id,
                                  reason: reason.trim(),
                                });
                              }
                            }}
                            className="text-orange-600 hover:text-orange-900 p-2 md:p-1 rounded transition-colors"
                            title="Reject invoice"
                            disabled={rejectMutation.isPending}
                          >
                            {rejectMutation.isPending ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <span className="text-xs font-semibold">✕</span>
                            )}
                          </button>
                        )}
                      <button
                        onClick={() => deleteMutation.mutate(invoice.id)}
                        className="text-red-600 hover:text-red-900 p-2 md:p-1 rounded transition-colors"
                        title="Delete invoice"
                      >
                        <Trash2 className="h-5 w-5 md:h-4 md:w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 md:px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs md:text-sm text-gray-700">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 md:px-4 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 md:px-4 py-2 bg-blue-50 text-blue-600 rounded text-sm font-medium">
                  {currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(
                      Math.min(pagination.totalPages, currentPage + 1)
                    )
                  }
                  disabled={currentPage === pagination.totalPages}
                  className="px-3 md:px-4 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No invoices found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new invoice.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateInvoiceModal
        isOpen={showCreateInvoiceModal || !!editingInvoice}
        onClose={() => {
          setShowCreateInvoiceModal(false);
          setEditingInvoice(null);
        }}
        invoice={editingInvoice ?? undefined}
        onSuccess={() => {
          setShowCreateInvoiceModal(false);
          setEditingInvoice(null);
        }}
      />

      <CreateCustomerModal
        isOpen={showCreateCustomerModal}
        onClose={() => setShowCreateCustomerModal(false)}
        onSuccess={() => {
          setShowCreateCustomerModal(false);
          // Optionally show a success message
        }}
      />

      {/* Invoice Detail Modal with Returns */}
      {viewingInvoice && (
        <InvoiceDetailModal
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
        />
      )}

      {/* Bank Account Override Modal for PDF Download */}
      {downloadingInvoice && (
        <BankAccountOverrideModal
          isOpen={!!downloadingInvoice}
          onClose={() => setDownloadingInvoice(null)}
          onDownload={async (bankAccountId) => {
            try {
              const url = bankAccountId
                ? `/invoices/${downloadingInvoice.id}/pdf?bankAccountId=${bankAccountId}`
                : `/invoices/${downloadingInvoice.id}/pdf`;

              const response = await apiClient.get(url, {
                responseType: "blob",
              });

              const blob = new Blob([response.data], {
                type: "application/pdf",
              });
              const downloadUrl = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = downloadUrl;
              link.download = `Invoice-${downloadingInvoice.invoiceNumber}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(downloadUrl);

              setDownloadingInvoice(null);
            } catch (error) {
              console.error("Failed to download PDF:", error);
              alert("Failed to download PDF. Please try again.");
            }
          }}
          currentBankAccountId={downloadingInvoice.bankAccountId}
          currentPaymentMethod={downloadingInvoice.paymentMethod}
          invoiceNumber={downloadingInvoice.invoiceNumber}
        />
      )}
    </div>
  );
}
