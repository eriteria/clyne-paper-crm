"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Users,
  Package,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    invoiceNumber: string;
    error: string;
    missingProducts?: string[];
  }>;
  warnings: string[];
}

export default function InvoiceImportPage() {
  const router = useRouter();
  const [csvData, setCsvData] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fileType, setFileType] = useState<"csv" | "json">("csv");

  // Get import statistics
  const { data: statsData } = useQuery({
    queryKey: ["invoiceImportStats"],
    queryFn: async () => {
      const response = await apiClient.get("/invoices/import/statistics");
      return response.data;
    },
  });

  // Get import template
  const downloadTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get("/invoices/import/template");
      return response.data;
    },
    onSuccess: (data) => {
      // Convert template data to CSV and download
      const headers = Object.keys(data.data[0]);
      const csvContent = [
        headers.join(","),
        ...data.data.map((row: any) =>
          headers.map((header) => `"${row[header] || ""}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "invoice_import_template.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    },
  });

  // Get JSON import template
  const downloadJsonTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get("/invoices/import/json/template");
      return response.data;
    },
    onSuccess: (data) => {
      // Convert template data to JSON and download
      const jsonContent = JSON.stringify(data.data, null, 2);

      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "invoice_import_template.json";
      link.click();
      window.URL.revokeObjectURL(url);
    },
  });

  // Import invoices mutation
  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await apiClient.post("/invoices/import", { data });
      return response.data;
    },
    onSuccess: (result) => {
      setImportResult(result.data);
      setIsProcessing(false);
    },
    onError: (error: any) => {
      console.error("Import failed:", error);
      setIsProcessing(false);
    },
  });

  // Import JSON invoices mutation
  const importJsonMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await apiClient.post("/invoices/import/json", { data });
      return response.data;
    },
    onSuccess: (result) => {
      setImportResult(result.data);
      setIsProcessing(false);
    },
    onError: (error: any) => {
      console.error("JSON Import failed:", error);
      setIsProcessing(false);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;

      // Check file type and parse accordingly
      if (file.name.toLowerCase().endsWith(".json")) {
        setFileType("json");
        try {
          const jsonData = JSON.parse(text);
          if (!Array.isArray(jsonData)) {
            alert("JSON file must contain an array of invoice data");
            return;
          }
          setCsvData(jsonData);
          setShowPreview(true);
        } catch (error) {
          alert("Invalid JSON file format");
          return;
        }
      } else {
        setFileType("csv");
        // Parse as CSV
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          alert("CSV file must contain at least a header row and one data row");
          return;
        }

        // Parse CSV
        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/"/g, ""));
        const data = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });
          return row;
        });

        setCsvData(data);
        setShowPreview(true);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    if (csvData.length === 0) {
      alert("Please upload a file first");
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    // Use appropriate mutation based on file type
    if (fileType === "json") {
      importJsonMutation.mutate(csvData);
    } else {
      importMutation.mutate(csvData);
    }
  };

  const resetForm = () => {
    setCsvData([]);
    setFileName("");
    setShowPreview(false);
    setImportResult(null);
    // Reset file input
    const fileInput = document.getElementById("csvFile") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const stats = statsData?.data;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/invoices")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Invoices
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Upload className="h-8 w-8 text-blue-600" />
                  Import Invoices
                </h1>
                <p className="text-gray-600 mt-2">
                  Import invoices from your former platform using Excel/CSV
                  files
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadTemplateMutation.mutate()}
                disabled={downloadTemplateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloadTemplateMutation.isPending
                  ? "Downloading..."
                  : "CSV Template"}
              </button>
              <button
                onClick={() => downloadJsonTemplateMutation.mutate()}
                disabled={downloadJsonTemplateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloadJsonTemplateMutation.isPending
                  ? "Downloading..."
                  : "JSON Template"}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Invoices
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalInvoices}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Customers
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalCustomers}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Items
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalItems}
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Recent Imports
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.recentImports?.length || 0}
                  </p>
                  <p className="text-xs text-gray-500">Last 24 hours</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        )}

        {/* Import Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">
            Import Instructions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">
                Required Headers:
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Invoice No</li>
                <li>• Date</li>
                <li>• Customer</li>
                <li>• Product</li>
                <li>• Quantity</li>
                <li>• Item Unit Price</li>
                <li>• Item Total Price</li>
                <li>• Invoice Total</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-2">
                Important Notes:
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Each row represents one item in an invoice</li>
                <li>• Duplicate invoice numbers mean multiple items</li>
                <li>
                  • <strong>Date format:</strong> d-mmm-YY (e.g.,
                  &quot;1-Sep-25&quot;, &quot;15-Dec-24&quot;)
                </li>
                <li>• Customers will be created if they don&apos;t exist</li>
                <li>• Products will be matched to existing inventory items</li>
                <li>
                  • <strong>Out-of-stock sales are allowed</strong> - inventory
                  can go negative
                </li>
                <li>
                  • Invoices will be attributed to customer&apos;s relationship
                  manager
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Invoice Data</h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="mb-4">
              <label htmlFor="csvFile" className="cursor-pointer">
                <span className="text-lg font-medium text-gray-900">
                  {fileName || "Choose file"}
                </span>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-gray-500">Supports CSV, Excel, and JSON files</p>
          </div>

          {showPreview && csvData.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  Preview ({csvData.length} rows)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : "Import Invoices"}
                  </button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(csvData[0] || {}).map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvData.slice(0, 10).map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate"
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvData.length > 10 && (
                  <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600">
                    Showing first 10 rows of {csvData.length} total rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Import Results */}
        {importResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Import Results</h2>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">Successful</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {importResult.successful}
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-900">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {importResult.failed}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {importResult.total}
                </p>
              </div>
            </div>

            {/* Warnings */}
            {importResult.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Warnings</span>
                </div>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {importResult.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-900">Errors</span>
                </div>
                <div className="space-y-3">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="border-l-4 border-red-400 pl-4">
                      <p className="font-medium text-red-900">
                        Invoice: {error.invoiceNumber}
                      </p>
                      <p className="text-sm text-red-800">{error.error}</p>
                      {error.missingProducts &&
                        error.missingProducts.length > 0 && (
                          <p className="text-xs text-red-700 mt-1">
                            Missing products: {error.missingProducts.join(", ")}
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-4">
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Import More
              </button>
              <button
                onClick={() => router.push("/invoices")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Invoices
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
