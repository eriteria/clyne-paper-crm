"use client";

import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  companyName?: string;
}

interface Credit {
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
}

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

interface CreditManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onCreditApplied?: () => void;
}

const CreditManagementModal: React.FC<CreditManagementModalProps> = ({
  isOpen,
  onClose,
  customer,
  onCreditApplied,
}) => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<OpenInvoice | null>(
    null
  );
  const [applicationAmount, setApplicationAmount] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customer]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [creditsResponse, invoicesResponse] = await Promise.all([
        fetch(`/api/payments/customers/${customer.id}/credits?activeOnly=true`),
        fetch(`/api/payments/customers/${customer.id}/open-invoices`),
      ]);

      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json();
        setCredits(creditsData.data.credits || []);
      }

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        setOpenInvoices(invoicesData.data.invoices || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load credit and invoice data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreditSelection = (credit: Credit) => {
    setSelectedCredit(credit);
    setSelectedInvoice(null);
    setApplicationAmount("");
  };

  const handleInvoiceSelection = (invoice: OpenInvoice) => {
    setSelectedInvoice(invoice);

    // Auto-set application amount to the minimum of available credit and invoice balance
    if (selectedCredit) {
      const maxAmount = Math.min(
        selectedCredit.availableAmount,
        invoice.balance
      );
      setApplicationAmount(maxAmount.toString());
    }
  };

  const handleApplyCredit = async () => {
    if (!selectedCredit || !selectedInvoice || !applicationAmount) {
      alert("Please select a credit, invoice, and enter an amount");
      return;
    }

    const amount = parseFloat(applicationAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > selectedCredit.availableAmount) {
      alert("Amount cannot exceed available credit");
      return;
    }

    if (amount > selectedInvoice.balance) {
      alert("Amount cannot exceed invoice balance");
      return;
    }

    setIsApplying(true);

    try {
      const response = await fetch("/api/payments/credits/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditId: selectedCredit.id,
          invoiceId: selectedInvoice.id,
          amount: amount,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `Credit applied successfully! Applied: ${formatCurrency(
            result.data.amountApplied
          )} to invoice ${selectedInvoice.invoiceNumber}`
        );
        onCreditApplied?.();

        // Refresh data and reset selections
        await fetchData();
        setSelectedCredit(null);
        setSelectedInvoice(null);
        setApplicationAmount("");
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply credit");
      }
    } catch (error) {
      console.error("Error applying credit:", error);
      alert(
        `Error applying credit: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsApplying(false);
    }
  };

  const totalAvailableCredit = credits.reduce(
    (sum, credit) => sum + credit.availableAmount,
    0
  );
  const totalOutstanding = openInvoices.reduce(
    (sum, invoice) => sum + invoice.balance,
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Credit Management
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
        ) : (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-green-600">
                  Available Credit
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(totalAvailableCredit)}
                </div>
                <div className="text-xs text-green-700 mt-1">
                  {credits.length} active credits
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-red-600">
                  Outstanding Balance
                </div>
                <div className="text-2xl font-bold text-red-900">
                  {formatCurrency(totalOutstanding)}
                </div>
                <div className="text-xs text-red-700 mt-1">
                  {openInvoices.length} open invoices
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-blue-600">
                  Net Position
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(totalAvailableCredit - totalOutstanding)}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {totalAvailableCredit > totalOutstanding
                    ? "Credit excess"
                    : "Amount owed"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Credits */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Available Credits
                </h3>
                {credits.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No available credits</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {credits.map((credit) => (
                      <div
                        key={credit.id}
                        onClick={() => handleCreditSelection(credit)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedCredit?.id === credit.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-gray-900">
                              {credit.reason.replace("_", " ")}
                            </div>
                            <div className="text-sm text-gray-600">
                              Created{" "}
                              {new Date(credit.createdAt).toLocaleDateString()}{" "}
                              by {credit.createdBy.fullName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">
                              {formatCurrency(credit.availableAmount)}
                            </div>
                            <div className="text-xs text-gray-500">
                              of {formatCurrency(credit.amount)}
                            </div>
                          </div>
                        </div>
                        {credit.description && (
                          <div className="text-sm text-gray-600">
                            {credit.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Open Invoices */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Open Invoices
                </h3>
                {openInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No open invoices</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {openInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        onClick={() => handleInvoiceSelection(invoice)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedInvoice?.id === invoice.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        } ${
                          invoice.isOverdue ? "border-l-4 border-l-red-500" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(invoice.date).toLocaleDateString()}
                              {invoice.dueDate && (
                                <span
                                  className={
                                    invoice.isOverdue
                                      ? "text-red-600 font-medium ml-2"
                                      : "ml-2"
                                  }
                                >
                                  Due:{" "}
                                  {new Date(
                                    invoice.dueDate
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-red-600">
                              {formatCurrency(invoice.balance)}
                            </div>
                            <div className="text-xs text-gray-500">
                              of {formatCurrency(invoice.totalAmount)}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              invoice.isOverdue
                                ? "bg-red-100 text-red-800"
                                : invoice.status === "PARTIAL"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {invoice.isOverdue ? "Overdue" : invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Credit Application Form */}
            {selectedCredit && selectedInvoice && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Apply Credit to Invoice
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Selected Credit
                      </label>
                      <div className="mt-1 text-sm text-gray-900">
                        {selectedCredit.reason.replace("_", " ")} -{" "}
                        {formatCurrency(selectedCredit.availableAmount)}{" "}
                        available
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Selected Invoice
                      </label>
                      <div className="mt-1 text-sm text-gray-900">
                        {selectedInvoice.invoiceNumber} -{" "}
                        {formatCurrency(selectedInvoice.balance)} balance
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount to Apply * (₦)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={Math.min(
                        selectedCredit.availableAmount,
                        selectedInvoice.balance
                      )}
                      value={applicationAmount}
                      onChange={(e) => setApplicationAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    <div className="mt-1 text-xs text-gray-500">
                      Maximum:{" "}
                      {formatCurrency(
                        Math.min(
                          selectedCredit.availableAmount,
                          selectedInvoice.balance
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCredit(null);
                        setSelectedInvoice(null);
                        setApplicationAmount("");
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyCredit}
                      disabled={
                        isApplying ||
                        !applicationAmount ||
                        parseFloat(applicationAmount) <= 0
                      }
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isApplying ? "Applying..." : "Apply Credit"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {credits.length > 0 &&
              openInvoices.length > 0 &&
              !selectedCredit && (
                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    How to Apply Credits
                  </h4>
                  <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                    <li>
                      Select a credit from the available credits on the left
                    </li>
                    <li>
                      Select an invoice from the open invoices on the right
                    </li>
                    <li>
                      Enter the amount to apply (or use the suggested maximum)
                    </li>
                    <li>
                      Click &quot;Apply Credit&quot; to complete the transaction
                    </li>
                  </ol>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditManagementModal;
