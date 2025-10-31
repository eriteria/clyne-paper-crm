"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import SearchableCustomerSelect from "./SearchableCustomerSelect";
import { BankAccountSelect } from "./BankAccountSelect";
import { Customer } from "@/types";

interface OpenInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  totalAmount: number;
  balance: number;
  status: string;
  isOverdue: boolean;
}

interface PaymentMethod {
  value: string;
  label: string;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onPaymentRecorded?: () => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  onPaymentRecorded,
}) => {
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "CASH",
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    notes: "",
    bankAccountId: "",
  });

  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    customer || null
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState<{
    allocatedAmount: number;
    creditAmount: number;
    invoicesAffected: Array<{
      invoiceNumber: string;
      amountApplied: number;
      newBalance: number;
    }>;
  } | null>(null);

  // Fetch payment methods on component mount
  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
      if (!customer) {
        fetchCustomers();
      }
    }
  }, [isOpen, customer]);

  // Fetch open invoices when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      fetchOpenInvoices(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  // Calculate allocation preview when amount or customer changes
  useEffect(() => {
    if (selectedCustomer && formData.amount && openInvoices.length > 0) {
      calculateAllocationPreview();
    } else {
      setAllocationPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.amount, selectedCustomer, openInvoices]);

  // Clear bank account when payment method changes away from BANK_TRANSFER
  useEffect(() => {
    if (formData.paymentMethod !== "BANK_TRANSFER") {
      setFormData((prev) => ({ ...prev, bankAccountId: "" }));
    }
  }, [formData.paymentMethod]);

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get("/customers?limit=10000");
      // Backend returns { success, data: customers[], pagination }
      setCustomers(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    }
  };

  const fetchOpenInvoices = async (customerId: string) => {
    try {
      const response = await apiClient.get(
        `/payments/customers/${customerId}/open-invoices`
      );
      // Backend returns { success, data: { invoices, summary } }
      type RawOpenInvoice = Omit<OpenInvoice, "totalAmount" | "balance"> & {
        totalAmount: number | string;
        balance: number | string;
      };
      const rawInvoices = (response.data?.data?.invoices ||
        []) as RawOpenInvoice[];
      const invoices: OpenInvoice[] = rawInvoices.map((inv) => ({
        ...inv,
        totalAmount:
          typeof inv.totalAmount === "string"
            ? parseFloat(inv.totalAmount)
            : inv.totalAmount,
        balance:
          typeof inv.balance === "string"
            ? parseFloat(inv.balance)
            : inv.balance,
      }));
      setOpenInvoices(invoices);
    } catch (error) {
      console.error("Error fetching open invoices:", error);
      setOpenInvoices([]);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await apiClient.get("/payments/payment-methods");
      setPaymentMethods(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      setPaymentMethods([
        { value: "CASH", label: "Cash" },
        { value: "BANK_TRANSFER", label: "Bank Transfer" },
        { value: "CHEQUE", label: "Cheque" },
        { value: "CARD", label: "Card Payment" },
        { value: "MOBILE_MONEY", label: "Mobile Money" },
      ]);
    }
  };

  const calculateAllocationPreview = () => {
    const paymentAmount = parseFloat(formData.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setAllocationPreview(null);
      return;
    }

    let remainingAmount = paymentAmount;
    let allocatedAmount = 0;
    const invoicesAffected: Array<{
      invoiceNumber: string;
      amountApplied: number;
      newBalance: number;
    }> = [];

    // Sort invoices by due date (oldest first) then by date
    const sortedInvoices = [...openInvoices].sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;

      const invoiceBalance = invoice.balance;
      const amountToApply = Math.min(remainingAmount, invoiceBalance);
      const newBalance = invoiceBalance - amountToApply;

      invoicesAffected.push({
        invoiceNumber: invoice.invoiceNumber,
        amountApplied: amountToApply,
        newBalance,
      });

      remainingAmount -= amountToApply;
      allocatedAmount += amountToApply;
    }

    setAllocationPreview({
      allocatedAmount,
      creditAmount: remainingAmount,
      invoicesAffected,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    setIsLoading(true);

    try {
      const paymentPayload: any = {
        customerId: selectedCustomer.id,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        paymentDate: formData.paymentDate,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
      };

      // Include bank account ID if payment method is BANK_TRANSFER
      if (
        formData.paymentMethod === "BANK_TRANSFER" &&
        formData.bankAccountId
      ) {
        paymentPayload.bankAccountId = formData.bankAccountId;
      }

      const response = await apiClient.post("/payments", paymentPayload);

      const result = response.data?.data;
      if (result) {
        alert(
          `Payment recorded successfully! Allocated: ${formatCurrency(
            result.totalAllocated
          )} ${
            result.totalCredit > 0
              ? `| Credit Created: ${formatCurrency(result.totalCredit)}`
              : ""
          }`
        );
        onPaymentRecorded?.();
        onClose();
        resetForm();
      } else {
        throw new Error("Failed to record payment");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      alert(
        `Error recording payment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      paymentMethod: "CASH",
      paymentDate: new Date().toISOString().split("T")[0],
      referenceNumber: "",
      notes: "",
      bankAccountId: "",
    });
    setSelectedCustomer(customer || null);
    setOpenInvoices([]);
    setAllocationPreview(null);
    setShowInvoicePreview(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const totalOutstanding = openInvoices.reduce(
    (sum, invoice) => sum + invoice.balance,
    0
  );
  const overdueInvoices = openInvoices.filter((invoice) => invoice.isOverdue);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[98vw] md:max-w-xl lg:max-w-2xl xl:max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Record Payment
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            {!customer && (
              <SearchableCustomerSelect
                customers={customers}
                selectedCustomer={selectedCustomer}
                onCustomerChange={setSelectedCustomer}
                required
                loading={false}
              />
            )}

            {/* Customer Info & Outstanding Balance */}
            {selectedCustomer && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedCustomer.name}
                    </h3>
                    {selectedCustomer.companyName && (
                      <p className="text-sm text-gray-600">
                        {selectedCustomer.companyName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInvoicePreview(!showInvoicePreview)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showInvoicePreview ? "Hide" : "Show"} Open Invoices (
                    {openInvoices.length})
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Outstanding:</span>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(totalOutstanding)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Open Invoices:</span>
                    <p className="font-medium text-gray-900">
                      {openInvoices.length}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Overdue:</span>
                    <p className="font-medium text-red-600">
                      {overdueInvoices.length}
                    </p>
                  </div>
                </div>

                {/* Open Invoices Preview */}
                {showInvoicePreview && openInvoices.length > 0 && (
                  <div className="mt-4 max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1 text-left font-medium text-gray-700">
                            Invoice #
                          </th>
                          <th className="px-2 py-1 text-left font-medium text-gray-700">
                            Due Date
                          </th>
                          <th className="px-2 py-1 text-right font-medium text-gray-700">
                            Balance
                          </th>
                          <th className="px-2 py-1 text-center font-medium text-gray-700">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {openInvoices.map((invoice) => (
                          <tr
                            key={invoice.id}
                            className={`${
                              invoice.isOverdue ? "bg-red-50" : ""
                            } text-gray-900`}
                          >
                            <td className="px-2 py-1 text-gray-900">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-2 py-1 text-gray-900">
                              {invoice.dueDate
                                ? new Date(invoice.dueDate).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="px-2 py-1 text-right text-gray-900">
                              {formatCurrency(invoice.balance)}
                            </td>
                            <td className="px-2 py-1 text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  invoice.isOverdue
                                    ? "bg-red-100 text-red-800"
                                    : invoice.status === "PARTIAL"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {invoice.isOverdue ? "Overdue" : invoice.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount * (₦)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentMethod: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank Account - Show only for BANK_TRANSFER */}
              {formData.paymentMethod === "BANK_TRANSFER" && (
                <div>
                  <BankAccountSelect
                    value={formData.bankAccountId}
                    onChange={(value) =>
                      setFormData({ ...formData, bankAccountId: value })
                    }
                    label="Bank Account"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      referenceNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="Transaction reference, check number, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="Additional notes about this payment..."
              />
            </div>

            {/* Allocation Preview */}
            {allocationPreview && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">
                  Payment Allocation Preview
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-blue-700">Amount to Allocate:</span>
                    <p className="font-medium text-blue-900">
                      {formatCurrency(allocationPreview.allocatedAmount)}
                    </p>
                  </div>
                  {allocationPreview.creditAmount > 0 && (
                    <div>
                      <span className="text-blue-700">Credit to Create:</span>
                      <p className="font-medium text-blue-900">
                        {formatCurrency(allocationPreview.creditAmount)}
                      </p>
                    </div>
                  )}
                </div>

                {allocationPreview.invoicesAffected.length > 0 && (
                  <div>
                    <p className="text-sm text-blue-700 mb-2">
                      Invoices to be paid:
                    </p>
                    <div className="max-h-24 overflow-y-auto">
                      {allocationPreview.invoicesAffected.map((invoice) => (
                        <div
                          key={invoice.invoiceNumber}
                          className="flex justify-between text-xs text-blue-800"
                        >
                          <span>
                            {invoice.invoiceNumber}:{" "}
                            {formatCurrency(invoice.amountApplied)}
                          </span>
                          <span>
                            New balance: {formatCurrency(invoice.newBalance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !selectedCustomer || !formData.amount}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
