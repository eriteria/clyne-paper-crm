"use client";

import React, { useState, useEffect } from "react";
import { X, Eye, CreditCard, Receipt, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  companyName?: string;
}

interface LedgerInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  totalAmount: number;
  balance: number;
  status: string;
  paymentApplications: Array<{
    customerPayment: {
      id: string;
      paymentDate: string;
      amount: number;
      paymentMethod: string;
    };
    amountApplied: number;
  }>;
  creditApplications: Array<{
    credit: {
      id: string;
      amount: number;
      reason: string;
    };
    amountApplied: number;
  }>;
}

interface LedgerPayment {
  id: string;
  amount: number;
  allocatedAmount: number;
  creditAmount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: {
    id: string;
    fullName: string;
  };
  paymentApplications: Array<{
    invoice: {
      id: string;
      invoiceNumber: string;
    };
    amountApplied: number;
  }>;
}

interface LedgerCredit {
  id: string;
  amount: number;
  availableAmount: number;
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
  };
  creditApplications: Array<{
    invoice: {
      id: string;
      invoiceNumber: string;
    };
    amountApplied: number;
    appliedDate: string;
    appliedBy: {
      id: string;
      fullName: string;
    };
  }>;
}

interface LedgerSummary {
  openingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  totalCredit: number;
  totalBalance: number;
}

interface LedgerData {
  invoices: LedgerInvoice[];
  payments: LedgerPayment[];
  credits: LedgerCredit[];
  summary: LedgerSummary;
}

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "invoices" | "payments" | "credits"
  >("overview");

  useEffect(() => {
    if (isOpen && customer) {
      fetchLedgerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer]);

  const fetchLedgerData = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        `/payments/customers/${customer.id}/ledger`
      );
      setLedgerData(response.data?.data || null);
    } catch (error) {
      console.error("Error fetching ledger data:", error);
      alert("Failed to load customer ledger");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "open":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "applied":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[98vw] md:max-w-2xl lg:max-w-4xl xl:max-w-6xl max-h-[95vh] md:max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customer Ledger
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {customer.name}{" "}
              {customer.companyName && `(${customer.companyName})`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : ledgerData ? (
          <div className="overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { key: "overview", label: "Overview", icon: Eye },
                  {
                    key: "invoices",
                    label: `Invoices (${ledgerData.invoices.length})`,
                    icon: FileText,
                  },
                  {
                    key: "payments",
                    label: `Payments (${ledgerData.payments.length})`,
                    icon: Receipt,
                  },
                  {
                    key: "credits",
                    label: `Credits (${ledgerData.credits.length})`,
                    icon: CreditCard,
                  },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() =>
                      setActiveTab(
                        key as "overview" | "invoices" | "payments" | "credits"
                      )
                    }
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === key
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-600">
                        Opening Balance
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(ledgerData.summary.openingBalance || 0)}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-blue-600">
                        Total Invoiced
                      </div>
                      <div className="text-2xl font-bold text-blue-900">
                        {formatCurrency(ledgerData.summary.totalInvoiced)}
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-green-600">
                        Total Paid
                      </div>
                      <div className="text-2xl font-bold text-green-900">
                        {formatCurrency(ledgerData.summary.totalPaid)}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-yellow-600">
                        Available Credit
                      </div>
                      <div className="text-2xl font-bold text-yellow-900">
                        {formatCurrency(ledgerData.summary.totalCredit)}
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-red-600">
                        Outstanding Balance
                      </div>
                      <div className="text-2xl font-bold text-red-900">
                        {formatCurrency(ledgerData.summary.totalBalance)}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Recent Activity
                    </h3>
                    <div className="space-y-3">
                      {/* Combine and sort recent items */}
                      {[
                        ...ledgerData.invoices.slice(0, 3).map((inv) => ({
                          type: "invoice",
                          date: inv.date,
                          description: `Invoice ${inv.invoiceNumber}`,
                          amount: inv.totalAmount,
                          status: inv.status,
                        })),
                        ...ledgerData.payments.slice(0, 3).map((pay) => ({
                          type: "payment",
                          date: pay.paymentDate,
                          description: `Payment (${pay.paymentMethod})`,
                          amount: pay.amount,
                          status: "completed",
                        })),
                      ]
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime()
                        )
                        .slice(0, 5)
                        .map((activity, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`p-2 rounded-full ${
                                  activity.type === "invoice"
                                    ? "bg-blue-100 text-blue-600"
                                    : activity.type === "payment"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-yellow-100 text-yellow-600"
                                }`}
                              >
                                {activity.type === "invoice" ? (
                                  <FileText className="h-4 w-4" />
                                ) : activity.type === "payment" ? (
                                  <Receipt className="h-4 w-4" />
                                ) : (
                                  <CreditCard className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {activity.description}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(activity.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                {formatCurrency(activity.amount)}
                              </p>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  activity.status
                                )}`}
                              >
                                {activity.status}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Invoices Tab */}
              {activeTab === "invoices" && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Balance
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ledgerData.invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {invoice.invoiceNumber}
                              </div>
                              {invoice.paymentApplications.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  {invoice.paymentApplications.length}{" "}
                                  payment(s)
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(invoice.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {invoice.dueDate
                                ? new Date(invoice.dueDate).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(invoice.totalAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(invoice.balance)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  invoice.status
                                )}`}
                              >
                                {invoice.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === "payments" && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reference
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Allocated
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Credit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Recorded By
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ledgerData.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(
                                payment.paymentDate
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {payment.paymentMethod.replace("_", " ")}
                              </div>
                              {payment.paymentApplications.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  Applied to{" "}
                                  {payment.paymentApplications.length}{" "}
                                  invoice(s)
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.referenceNumber || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(payment.allocatedAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {payment.creditAmount > 0
                                ? formatCurrency(payment.creditAmount)
                                : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {payment.recordedBy?.fullName || "Unknown"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Credits Tab */}
              {activeTab === "credits" && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reason
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Available
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created By
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ledgerData.credits.map((credit) => (
                          <tr key={credit.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(credit.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {credit.reason.replace("_", " ")}
                              </div>
                              {credit.description && (
                                <div className="text-xs text-gray-500">
                                  {credit.description}
                                </div>
                              )}
                              {credit.creditApplications.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  Applied to {credit.creditApplications.length}{" "}
                                  invoice(s)
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(credit.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatCurrency(credit.availableAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  credit.status
                                )}`}
                              >
                                {credit.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {credit.createdBy.fullName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerLedgerModal;
