"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

interface Location {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface ImportResult {
  deletedPayments: number;
  deletedCustomerPayments: number;
  deletedInvoices: number;
  updatedCustomers: number;
  createdCustomers: number;
  totalCustomers: number;
}

export default function OpeningBalanceImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch locations for default location dropdown
  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/locations");
      return response.data;
    },
  });

  const locations: Location[] = locationsData?.data || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Please select a CSV file");
      return;
    }

    if (!selectedLocation) {
      setError("Please select a default location for new customers");
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("csvFile", selectedFile);
      formData.append("defaultLocationId", selectedLocation);

      const response = await apiClient.post(
        "/admin/opening-balance-import",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(response.data.data);
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById("csvFile") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      console.error("Import error:", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.details ||
          "Failed to import opening balances"
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Opening Balance Import
        </h1>
        <p className="text-gray-600">
          Import customer opening balances from CSV file. This will reset all
          financial data.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Destructive Operation
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>This operation will:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Delete ALL invoices</li>
                <li>Delete ALL payments</li>
                <li>Set opening balances from the CSV file</li>
                <li>Create new customers for names not in the database</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Format Information */}
      <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              CSV Format Requirements
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Your CSV file should have these columns:</p>
              <ul className="list-disc list-inside mt-1">
                <li>S/N (serial number)</li>
                <li>
                  Debtors closing Balances as at 23rd October, 2025 (customer
                  name)
                </li>
                <li>Closing Balance (amount with or without commas)</li>
              </ul>
              <p className="mt-2">
                Duplicate customer names will be automatically summed. Empty
                balances are treated as 0.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Import Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="space-y-4">
          {/* Location Selection */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Default Location for New Customers{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              id="location"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              disabled={importing}
            >
              <option value="">Select a location...</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              New customers from the CSV will be assigned to this location
            </p>
          </div>

          {/* File Selection */}
          <div>
            <label
              htmlFor="csvFile"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              CSV File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              id="csvFile"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-1 text-sm text-gray-600">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={importing || !selectedFile || !selectedLocation}
            className={`w-full py-3 px-4 rounded-md font-medium text-white ${
              importing || !selectedFile || !selectedLocation
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {importing ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Importing... Please wait
              </span>
            ) : (
              "Import Opening Balances"
            )}
          </button>
        </div>
      </div>

      {/* Results Display */}
      {result && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Import Completed Successfully
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="font-medium">Data Cleared:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>{result.deletedInvoices} invoices deleted</li>
                      <li>{result.deletedPayments} old payments deleted</li>
                      <li>
                        {result.deletedCustomerPayments} customer payments
                        deleted
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Customers Updated:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>
                        {result.updatedCustomers} existing customers updated
                      </li>
                      <li>{result.createdCustomers} new customers created</li>
                      <li>{result.totalCustomers} total customers processed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
