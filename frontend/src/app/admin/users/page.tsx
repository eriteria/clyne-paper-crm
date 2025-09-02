"use client";

import React, { useState } from "react";
import {
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileDown,
} from "lucide-react";
import { apiClient } from "@/lib/api";

interface ImportError {
  row: number;
  error: string;
  data: Record<string, unknown>;
}

interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
  imported?: number;
  cleared?: number;
  errors?: ImportError[];
}

interface ParsedUser {
  [key: string]: string;
}

export default function AdminUserManagementPage() {
  const [file, setFile] = useState<File | null>(null);
  const [defaultPassword, setDefaultPassword] = useState("");
  const [clearExistingData, setClearExistingData] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedUser[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);

      // Parse CSV file for preview
      if (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv")
      ) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const lines = text.split("\n").filter((line) => line.trim());
          if (lines.length > 1) {
            const headers = lines[0]
              .split(",")
              .map((h) => h.trim().replace(/"/g, ""));
            const rows = lines.slice(1).map((line) => {
              const values = line
                .split(",")
                .map((v) => v.trim().replace(/"/g, ""));
              const obj: ParsedUser = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || "";
              });
              return obj;
            });
            setParsedData(rows);
          }
        };
        reader.readAsText(selectedFile);
      }
    }
  };

  const handleImport = async () => {
    if (!file || !defaultPassword) {
      alert("Please select a file and enter a default password");
      return;
    }

    if (defaultPassword.length < 6) {
      alert("Default password must be at least 6 characters long");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const response = await apiClient.post("/users/import", {
        data: parsedData,
        defaultPassword,
        clearData: clearExistingData,
      });

      setUploadResult(response.data);
    } catch (error: unknown) {
      console.error("Import error:", error);
      let errorMessage = "Failed to import users. Please try again.";

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { error?: string } };
        };
        errorMessage = axiosError.response?.data?.error || errorMessage;
      }

      setUploadResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearDummyData = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all non-admin users? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await apiClient.post("/users/clear-dummy-data");

      if (response.data.success) {
        alert(`Successfully cleared ${response.data.deletedCount} users`);
      } else {
        alert("Failed to clear dummy data");
      }
    } catch (error) {
      console.error("Clear data error:", error);
      alert("Failed to clear dummy data. Please try again.");
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await apiClient.get("/users/import/template");

      if (response.data.success && response.data.template) {
        // Convert to CSV format
        const headers = Object.keys(response.data.template[0]);
        const csvContent = [
          headers.join(","),
          ...response.data.template.map((row: ParsedUser) =>
            headers.map((header) => `"${row[header] || ""}"`).join(",")
          ),
        ].join("\n");

        // Create and download file
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "user-import-template.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download template error:", error);
      alert("Failed to download template");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">
          Import users from Zoho CSV files and manage user data.
        </p>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Download Template */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center mb-4">
            <FileDown className="h-8 w-8 text-blue-600" />
            <h3 className="ml-3 text-lg font-medium text-gray-900">
              Download Template
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Download a CSV template with the required format for user import.
          </p>
          <button
            onClick={downloadTemplate}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Download CSV Template
          </button>
        </div>

        {/* Import Users */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center mb-4">
            <Upload className="h-8 w-8 text-green-600" />
            <h3 className="ml-3 text-lg font-medium text-gray-900">
              Import Users
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV file to import user data from Zoho.
          </p>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="file"
                className="block text-sm font-semibold text-gray-800 mb-1"
              >
                Select CSV File
              </label>
              <input
                type="file"
                id="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full border-2 border-gray-400 rounded-md px-3 py-2 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-800 mb-1"
              >
                Default Password
              </label>
              <input
                type="password"
                id="password"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="Enter default password for all users"
                className="w-full border-2 border-gray-400 rounded-md px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors"
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="clearData"
                checked={clearExistingData}
                onChange={(e) => setClearExistingData(e.target.checked)}
                className="h-4 w-4 rounded border-2 border-gray-400 text-blue-600 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-colors"
              />
              <label
                htmlFor="clearData"
                className="ml-2 text-sm text-gray-800 font-medium"
              >
                Clear existing non-admin users before import
              </label>
            </div>
          </div>
        </div>

        {/* Clear Data */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center mb-4">
            <Trash2 className="h-8 w-8 text-red-600" />
            <h3 className="ml-3 text-lg font-medium text-gray-900">
              Clear Data
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Remove all non-admin users from the database. Admin users will be
            preserved.
          </p>
          <button
            onClick={handleClearDummyData}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Clear Non-Admin Users
          </button>
        </div>
      </div>

      {/* File Preview */}
      {file && parsedData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">File Preview</h3>
            <span className="text-sm text-gray-500">
              {parsedData.length} users found
            </span>
          </div>

          <div className="mb-4">
            <button
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {showJsonPreview ? "Hide" : "Show"} Raw Data
            </button>
          </div>

          {showJsonPreview && (
            <div className="mb-4">
              <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-auto max-h-40">
                {JSON.stringify(parsedData.slice(0, 3), null, 2)}
                {parsedData.length > 3 && "\n... and more"}
              </pre>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role (Ignored)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parsedData.slice(0, 5).map((user, index) => (
                  <tr key={`user-${index}-${user["Email address"] || index}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user["First Name"] || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user["Last Name"] || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user["Email address"] || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user["Role"] || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 5 && (
              <p className="text-center text-sm text-gray-500 py-2">
                ... and {parsedData.length - 5} more users
              </p>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={handleImport}
              disabled={isUploading || !defaultPassword}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? "Importing..." : "Import Users"}
            </button>
          </div>
        </div>
      )}

      {/* Import Results */}
      {uploadResult && (
        <div
          className={`p-6 rounded-lg shadow border ${
            uploadResult.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center mb-3">
            {uploadResult.success ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600" />
            )}
            <h3
              className={`ml-2 text-lg font-medium ${
                uploadResult.success ? "text-green-900" : "text-red-900"
              }`}
            >
              Import {uploadResult.success ? "Successful" : "Failed"}
            </h3>
          </div>

          <p
            className={`text-sm mb-3 ${
              uploadResult.success ? "text-green-800" : "text-red-800"
            }`}
          >
            {uploadResult.message || uploadResult.error}
          </p>

          {uploadResult.success && (
            <div className="space-y-2 text-sm text-green-800">
              {uploadResult.cleared !== undefined && (
                <p>• Cleared {uploadResult.cleared} existing users</p>
              )}
              <p>• Imported {uploadResult.imported} new users</p>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <p>• {uploadResult.errors.length} errors encountered</p>
              )}
            </div>
          )}

          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-900 mb-2">Errors:</h4>
              <div className="bg-red-100 p-3 rounded-md max-h-40 overflow-y-auto">
                {uploadResult.errors.map(
                  (error: ImportError, index: number) => (
                    <div
                      key={`error-${index}-${error.row}`}
                      className="text-xs text-red-800 mb-1"
                    >
                      Row {error.row}: {error.error}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Instructions</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Download the CSV template to see the expected format</p>
          <p>
            • The CSV should have columns: First Name, Last Name, Email address,
            Role, Last login time
          </p>
          <p>
            • Only First Name, Last Name, and Email address are used - other
            columns are ignored
          </p>
          <p>• All imported users will get the Employee role by default</p>
          <p>
            • The default password you set will be applied to all imported users
          </p>
          <p>• Users should change their passwords after first login</p>
          <p>
            • Admin users are protected and won&apos;t be deleted during data
            clearing
          </p>
        </div>
      </div>
    </div>
  );
}
