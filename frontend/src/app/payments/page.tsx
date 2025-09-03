"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  Search,
  Plus,
  Eye,
  Filter,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api";
import RecordPaymentModal from "@/components/RecordPaymentModal";
import CustomerLedgerModal from "@/components/CustomerLedgerModal";
import { formatCurrency } from "@/lib/utils";

interface PaymentSummary {
  totalPaymentsToday: number;
  totalPaymentsThisMonth: number;
  totalOutstanding: number;
  totalCredits: number;
}

interface Customer {
  id: string;
  name: string;
  companyName?: string;
}

interface Payment {
  id: string;
  amount: number;
  allocatedAmount: number;
  creditAmount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  recordedBy: {
    id: string;
    fullName: string;
  };
  customer: Customer;
  paymentApplications: Array<{
    invoice: {
      id: string;
      invoiceNumber: string;
    };
    amountApplied: number;
  }>;
}

interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  dueDate: string;
  balance: number;
  isOverdue: boolean;
  customer: Customer;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<
    OutstandingInvoice[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMethod, setFilterMethod] = useState("ALL");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [searchTerm, filterMethod, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      // Fetch summary data
      const summaryResponse = await apiClient.get("/payments/summary");
      setSummary(summaryResponse.data);

      // Fetch recent payments
      const paymentsResponse = await apiClient.get("/payments/recent", {
        params: {
          limit: 20,
          paymentMethod: filterMethod !== "ALL" ? filterMethod : undefined,
          search: searchTerm || undefined,
        },
      });
      setRecentPayments(paymentsResponse.data);

      // Fetch outstanding invoices
      const outstandingResponse = await apiClient.get("/payments/outstanding", {
        params: {
          limit: 20,
          search: searchTerm || undefined,
        },
      });
      setOutstandingInvoices(outstandingResponse.data);
    } catch (error) {
      console.error("Error fetching payment data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLedger = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowLedgerModal(true);
  };

  const filteredPayments = recentPayments.filter((payment) => {
    const matchesSearch =
      payment.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer.companyName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterMethod === "ALL" || payment.paymentMethod === filterMethod;

    return matchesSearch && matchesFilter;
  });

  const filteredOutstanding = outstandingInvoices.filter(
    (invoice) =>
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-green-600" />
            Payment Management
          </h1>
          <p className="text-gray-600 mt-1">
            Track payments, manage credits, and monitor outstanding balances
          </p>
        </div>
        <button
          onClick={() => setShowRecordPaymentModal(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Today&apos;s Payments
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {summary ? formatCurrency(summary.totalPaymentsToday) : "₦0.00"}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary
                  ? formatCurrency(summary.totalPaymentsThisMonth)
                  : "₦0.00"}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-red-600">
                {summary ? formatCurrency(summary.totalOutstanding) : "₦0.00"}
              </p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Available Credits
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {summary ? formatCurrency(summary.totalCredits) : "₦0.00"}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search payments, customers, or references..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CARD">Card</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Payments
            </h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No payments found</p>
                <button
                  onClick={() => setShowRecordPaymentModal(true)}
                  className="mt-2 text-green-600 hover:text-green-700 font-medium"
                >
                  Record your first payment
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900">
                          {payment.customer.name}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{payment.paymentMethod.replace("_", " ")}</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                      {payment.referenceNumber && (
                        <div className="text-xs text-gray-500 mt-1">
                          Ref: {payment.referenceNumber}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleViewLedger(payment.customer)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Outstanding Invoices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Outstanding Invoices
            </h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : filteredOutstanding.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No outstanding invoices</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredOutstanding.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900">
                          {invoice.customerName}
                        </h3>
                        <span
                          className={`text-sm font-medium ${
                            invoice.isOverdue ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          {invoice.isOverdue ? "Overdue" : "Due"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{invoice.invoiceNumber}</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(invoice.balance)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewLedger(invoice.customer)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={showRecordPaymentModal}
        onClose={() => setShowRecordPaymentModal(false)}
        onPaymentRecorded={() => {
          setShowRecordPaymentModal(false);
          fetchData();
        }}
      />

      {selectedCustomer && (
        <CustomerLedgerModal
          isOpen={showLedgerModal}
          onClose={() => {
            setShowLedgerModal(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
}
