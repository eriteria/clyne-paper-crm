"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import {
  getFinancialDashboard,
  getPayments,
  createQuickBooksExport,
} from "../../lib/financial-api";
import { Card, CardContent, CardHeader, CardTitle } from "../../lib/styles";
import { formatCurrency } from "../../lib/utils";
import { CustomerPayment } from "../../types/financial";
import CustomerLedgerExportModal from "../../components/CustomerLedgerExportModal";

export default function FinancialPage() {
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showLedgerExportModal, setShowLedgerExportModal] = useState(false);

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useQuery({
    queryKey: ["financial-dashboard"],
    queryFn: getFinancialDashboard,
  });

  // Debug logging
  useEffect(() => {
    if (dashboardData) {
      console.log("Financial dashboard data:", dashboardData);
      console.log("Recent payments:", dashboardData?.recentPayments);
    }
    if (dashboardError) {
      console.error("Financial dashboard error:", dashboardError);
    }
  }, [dashboardData, dashboardError]);

  // Fetch payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["financial-payments"],
    queryFn: () => getPayments({ limit: 50 }),
    enabled: selectedTab === "payments",
  });

  const handleExportToQuickBooks = async (
    exportType: "INVOICES" | "PAYMENTS"
  ) => {
    try {
      const result = await createQuickBooksExport({
        exportType,
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
        endDate: new Date().toISOString(),
      });

      // Create download link
      const blob = new Blob([JSON.stringify(result.exportData, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Financial Dashboard
        </h1>
        <div className="space-x-2">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Record Payment
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Export to QuickBooks
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        {["dashboard", "payments", "reports"].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {selectedTab === "dashboard" && (
        <div className="space-y-6">
          {dashboardLoading ? (
            <div className="text-center py-8">Loading dashboard...</div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(dashboardData?.totalRevenue || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Outstanding Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(dashboardData?.outstandingAmount || 0)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {dashboardData?.outstandingCount || 0} invoices
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Tax Collected
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(dashboardData?.taxCollected || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Recent Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      {dashboardData?.recentPayments?.length || 0}
                    </div>
                    <div className="text-sm text-gray-500">
                      Last 10 payments
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Payments */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reference
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dashboardData?.recentPayments &&
                        dashboardData.recentPayments.length > 0 ? (
                          dashboardData.recentPayments.map((payment) => (
                            <tr key={payment.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(
                                  payment.paymentDate
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {payment.customer.name ||
                                  payment.customer.companyName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {payment.paymentMethod.replace("_", " ")}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {payment.referenceNumber || "-"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-4 text-center text-sm text-gray-500"
                            >
                              No recent payments found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {selectedTab === "payments" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="text-center py-8">Loading payments...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentsData?.data && paymentsData.data.length > 0 ? (
                        paymentsData.data.map((payment: CustomerPayment) => (
                          <tr key={payment.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(
                                payment.paymentDate
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.customer.name ||
                                payment.customer.companyName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.paymentMethod.replace("_", " ")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {payment.referenceNumber || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  payment.status === "COMPLETED"
                                    ? "bg-green-100 text-green-800"
                                    : payment.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-4 text-center text-sm text-gray-500"
                          >
                            No payments found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reports Tab */}
      {selectedTab === "reports" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleExportToQuickBooks("INVOICES")}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <h3 className="font-medium text-gray-900">Export Invoices</h3>
                  <p className="text-sm text-gray-500">
                    Export all invoices for QuickBooks import
                  </p>
                </button>
                <button
                  onClick={() => handleExportToQuickBooks("PAYMENTS")}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <h3 className="font-medium text-gray-900">Export Payments</h3>
                  <p className="text-sm text-gray-500">
                    Export all payments for QuickBooks import
                  </p>
                </button>
                <button
                  onClick={() => setShowLedgerExportModal(true)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <h3 className="font-medium text-gray-900">Customer Ledger</h3>
                  <p className="text-sm text-gray-500">
                    Export customer ledger with custom date range
                  </p>
                </button>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900">Tax Summary</h3>
                  <p className="text-sm text-gray-500">
                    View tax collected summary for the current year
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Ledger Export Modal */}
      <CustomerLedgerExportModal
        isOpen={showLedgerExportModal}
        onClose={() => setShowLedgerExportModal(false)}
      />
    </div>
  );
}
