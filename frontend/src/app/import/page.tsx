"use client";

import { useState } from "react";
import { Upload, FileText, Users, Package, Receipt } from "lucide-react";

type ImportType = "customers" | "users" | "invoices";

interface ImportStats {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportType>("customers");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportStats | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", activeTab);

    try {
      const response = await fetch(`/api/import/${activeTab}`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setImportResults(result);
      } else {
        const error = await response.json();
        setImportResults({
          total: 0,
          successful: 0,
          failed: 1,
          errors: [error.message || "Import failed"],
        });
      }
    } catch (error) {
      setImportResults({
        total: 0,
        successful: 0,
        failed: 1,
        errors: ["Network error occurred"],
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = (type: ImportType) => {
    const templates = {
      customers: "/templates/customers_template.csv",
      users: "/templates/users_template.csv",
      invoices: "/templates/invoices_template.csv",
    };

    const link = document.createElement("a");
    link.href = templates[type];
    link.download = `${type}_template.csv`;
    link.click();
  };

  const getTabIcon = (type: ImportType) => {
    switch (type) {
      case "customers":
        return <Users className="w-5 h-5" />;
      case "users":
        return <FileText className="w-5 h-5" />;
      case "invoices":
        return <Receipt className="w-5 h-5" />;
    }
  };

  const getRequiredFields = (type: ImportType) => {
    switch (type) {
      case "customers":
        return ["company_name", "email", "phone", "address", "location"];
      case "users":
        return ["first_name", "last_name", "email", "role", "region"];
      case "invoices":
        return [
          "invoice_number",
          "customer_id",
          "date",
          "due_date",
          "total_amount",
        ];
    }
  };

  const getOptionalFields = (type: ImportType) => {
    switch (type) {
      case "customers":
        return [
          "business_reg_number",
          "tax_id",
          "credit_limit",
          "payment_terms",
          "customer_type",
        ];
      case "users":
        return ["phone", "department", "manager_id", "start_date"];
      case "invoices":
        return [
          "description",
          "tax_amount",
          "discount",
          "payment_status",
          "notes",
        ];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Data Import</h1>
            <p className="mt-1 text-sm text-gray-600">
              Import customers, users, and invoices from CSV files
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {(["customers", "users", "invoices"] as ImportType[]).map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setActiveTab(type);
                      setSelectedFile(null);
                      setImportResults(null);
                    }}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === type
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {getTabIcon(type)}
                    <span className="capitalize">{type}</span>
                  </button>
                )
              )}
            </nav>
          </div>

          <div className="p-6">
            {/* Instructions */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Import Instructions
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Upload a CSV file with the required columns</li>
                <li>• Download the template below to see the correct format</li>
                <li>• Ensure all required fields are included</li>
                <li>• Check your data for duplicates before importing</li>
              </ul>
            </div>

            {/* Template Download */}
            <div className="mb-6">
              <button
                onClick={() => downloadTemplate(activeTab)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Package className="w-4 h-4 mr-2" />
                Download {activeTab} Template
              </button>
            </div>

            {/* Field Requirements */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Required Fields
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {getRequiredFields(activeTab).map((field) => (
                    <li key={field} className="flex items-center">
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Optional Fields
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {getOptionalFields(activeTab).map((field) => (
                    <li key={field} className="flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {selectedFile
                      ? selectedFile.name
                      : "Drop your CSV file here, or click to browse"}
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleFileSelect}
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  CSV files only, up to 10MB
                </p>
              </div>
            </div>

            {/* Upload Button */}
            {selectedFile && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleImport}
                  disabled={isUploading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import {activeTab}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Import Results
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {importResults.total}
                    </div>
                    <div className="text-sm text-gray-600">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importResults.successful}
                    </div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {importResults.failed}
                    </div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>

                {importResults.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-900 mb-2">
                      Errors:
                    </h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      {importResults.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
