import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Download, FileText, Calendar } from "lucide-react";
import { getCustomers, getCustomerLedger } from "../lib/financial-api";
import { formatCurrency } from "../lib/utils";
import { Customer } from "../types";
import SearchableCustomerSelect from "./SearchableCustomerSelect";

interface CustomerLedgerExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LedgerTransaction {
  id: string;
  date: string;
  type: "INVOICE" | "PAYMENT";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status?: string;
  paymentMethod?: string;
}

interface LedgerData {
  customer: {
    id: string;
    name: string;
    companyName: string;
    email: string;
    phone?: string;
    address?: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  balances: {
    opening: number;
    closing: number;
  };
  transactions: LedgerTransaction[];
  summary: {
    openingBalance: number;
    closingBalance: number;
    totalInvoices: number;
    totalPayments: number;
    netMovement: number;
  };
}

export default function CustomerLedgerExportModal({
  isOpen,
  onClose,
}: CustomerLedgerExportModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Get customers for selection
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => getCustomers(),
    enabled: isOpen,
  });

  const handleGenerateLedger = async () => {
    if (!selectedCustomer || !startDate || !endDate) {
      alert("Please select a customer and date range");
      return;
    }

    setIsGenerating(true);
    try {
      const ledgerData = await getCustomerLedger(
        selectedCustomer.id,
        startDate,
        endDate
      );

      // Generate CSV content
      const csvContent = generateLedgerCSV(ledgerData);

      // Download CSV file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger_${
        selectedCustomer.name || selectedCustomer.companyName
      }_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error("Error generating ledger:", error);
      alert("Failed to generate ledger");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLedgerCSV = (ledgerData: LedgerData) => {
    const customerName =
      ledgerData.customer.name || ledgerData.customer.companyName;
    const lines = [];

    // Header
    lines.push("CUSTOMER LEDGER STATEMENT");
    lines.push("");
    lines.push(`Customer: ${customerName}`);
    lines.push(
      `Period: ${ledgerData.period.startDate} to ${ledgerData.period.endDate}`
    );
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");

    // Opening Balance
    lines.push("OPENING BALANCE");
    lines.push(`Amount: ${formatCurrency(ledgerData.summary.openingBalance)}`);
    lines.push("");

    // Transaction Header
    lines.push("Date,Reference,Description,Debit,Credit,Balance");

    // Transactions
    ledgerData.transactions.forEach((transaction: LedgerTransaction) => {
      const date = new Date(transaction.date).toLocaleDateString();
      const reference = transaction.reference || "-";
      const description = transaction.description || "-";
      const debit =
        transaction.debit > 0 ? formatCurrency(transaction.debit) : "";
      const credit =
        transaction.credit > 0 ? formatCurrency(transaction.credit) : "";
      const balance = formatCurrency(transaction.balance);

      lines.push(
        `${date},"${reference}","${description}","${debit}","${credit}","${balance}"`
      );
    });

    // Summary
    lines.push("");
    lines.push("PERIOD SUMMARY");
    lines.push(
      `Opening Balance: ${formatCurrency(ledgerData.summary.openingBalance)}`
    );
    lines.push(
      `Total Invoices: ${formatCurrency(ledgerData.summary.totalInvoices)}`
    );
    lines.push(
      `Total Payments: ${formatCurrency(ledgerData.summary.totalPayments)}`
    );
    lines.push(
      `Net Movement: ${formatCurrency(ledgerData.summary.netMovement)}`
    );
    lines.push(
      `Closing Balance: ${formatCurrency(ledgerData.summary.closingBalance)}`
    );

    return lines.join("\n");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Customer Ledger Export
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Customer Selection */}
          <SearchableCustomerSelect
            customers={customers || []}
            selectedCustomer={selectedCustomer}
            onCustomerChange={setSelectedCustomer}
            loading={customersLoading}
            label="Select Customer"
            placeholder="Choose a customer..."
          />

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Ledger will include:</strong>
            </p>
            <ul className="text-xs text-blue-700 mt-1 space-y-1">
              <li>• Opening balance (as of start date)</li>
              <li>• All invoices and payments in period</li>
              <li>• Running balance for each transaction</li>
              <li>• Closing balance and period summary</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateLedger}
            disabled={
              !selectedCustomer || !startDate || !endDate || isGenerating
            }
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Export Ledger"}
          </button>
        </div>
      </div>
    </div>
  );
}
