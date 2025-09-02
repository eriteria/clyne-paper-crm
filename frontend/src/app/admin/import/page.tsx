"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import apiClient from "@/lib/api";

interface ExcelCustomerRow {
  "CUSTOMER NAME": string;
  "RELATIONSHIP MANAGER": string;
  LOCATION: string;
  ADDRESS: string;
  "DATE OF ONBOARDING": string;
  "LAST ORDER DATE": string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

interface LinkResult {
  success: boolean;
  linked: number;
  unmatched: Array<{ customerName: string; managerName: string }>;
}

interface TeamSetupResult {
  success: boolean;
  created: number;
  existing: number;
  teams: Array<{ name: string; id: string; locations: string[] }>;
}

interface AssignmentResult {
  success: boolean;
  assigned: number;
  unassigned: number;
  errors: Array<{ customerId: string; customerName: string; location: string; error: string }>;
}

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState<ExcelCustomerRow[]>([]);
  const [clearData, setClearData] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [linkResult, setLinkResult] = useState<LinkResult | null>(null);
  const [teamSetupResult, setTeamSetupResult] = useState<TeamSetupResult | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<AssignmentResult | null>(null);

  // Clear dummy data mutation
  const clearDummyDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/import/clear-dummy-data");
      return response.data;
    },
  });

  // Import customers mutation
  const importCustomersMutation = useMutation({
    mutationFn: async ({
      data,
      clearData,
    }: {
      data: ExcelCustomerRow[];
      clearData: boolean;
    }) => {
      const response = await apiClient.post("/import/customers", {
        data,
        clearData,
      });
      return response.data;
    },
  });

  // Link relationship managers mutation
  const linkManagersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(
        "/import/link-relationship-managers"
      );
      return response.data;
    },
  });

  // Setup location teams mutation
  const setupTeamsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/import/setup-location-teams");
      return response.data;
    },
  });

  // Assign customers to teams mutation
  const assignTeamsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/import/assign-customers-to-teams");
      return response.data;
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            setJsonData(data);
          } catch (error) {
            alert("Invalid JSON file");
          }
        };
        reader.readAsText(file);
      }
    }
  };

  const handleClearDummyData = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all dummy data? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await clearDummyDataMutation.mutateAsync();
      alert("Dummy data cleared successfully!");
    } catch (error) {
      alert("Failed to clear dummy data. Please try again.");
    }
  };

  const handleImport = async () => {
    if (jsonData.length === 0) {
      alert("Please select a valid JSON file with customer data.");
      return;
    }

    if (
      clearData &&
      !confirm(
        "This will clear all existing dummy data before importing. Continue?"
      )
    ) {
      return;
    }

    try {
      const result = await importCustomersMutation.mutateAsync({
        data: jsonData,
        clearData,
      });
      setImportResult(result.data);
    } catch (error) {
      alert("Import failed. Please check the console for details.");
      console.error("Import error:", error);
    }
  };

  const handleLinkManagers = async () => {
    try {
      const result = await linkManagersMutation.mutateAsync();
      setLinkResult(result.data);
    } catch (error) {
      alert("Failed to link relationship managers. Please try again.");
      console.error("Link error:", error);
    }
  };

  const handleSetupTeams = async () => {
    try {
      const result = await setupTeamsMutation.mutateAsync();
      setTeamSetupResult(result.data);
      alert("Location teams setup completed successfully!");
    } catch (error) {
      alert("Failed to setup location teams. Please try again.");
      console.error("Setup teams error:", error);
    }
  };

  const handleAssignTeams = async () => {
    try {
      const result = await assignTeamsMutation.mutateAsync();
      setAssignmentResult(result.data);
      alert("Customer team assignment completed!");
    } catch (error) {
      alert("Failed to assign customers to teams. Please try again.");
      console.error("Assign teams error:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Customer Data Import
        </h2>
        <p className="mt-2 text-gray-600">
          Import customer data from Excel files. Ensure your data follows the
          required format.
        </p>
      </div>

      {/* Import Format Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Required Excel Format
        </h3>
        <p className="text-blue-800 mb-4">
          Your Excel file should have these exact column headers:
        </p>
        <div className="bg-white p-4 rounded border font-mono text-sm overflow-x-auto">
          <div className="grid grid-cols-6 gap-2 text-xs font-semibold text-gray-600 mb-2">
            <div>CUSTOMER NAME</div>
            <div>RELATIONSHIP MANAGER</div>
            <div>LOCATION</div>
            <div>ADDRESS</div>
            <div>DATE OF ONBOARDING</div>
            <div>LAST ORDER DATE</div>
          </div>
          <div className="grid grid-cols-6 gap-2 text-xs text-gray-800">
            <div>ABC Corporation</div>
            <div>John Smith</div>
            <div>Lagos</div>
            <div>123 Victoria Island</div>
            <div>01/15/2024</div>
            <div>08/20/2025</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-blue-700">
          <p>
            <strong>Note:</strong> Convert your Excel file to JSON format before
            uploading.
          </p>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Upload Customer Data
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="flex items-center">
            <input
              id="clearData"
              type="checkbox"
              checked={clearData}
              onChange={(e) => setClearData(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="clearData"
              className="ml-2 block text-sm text-gray-900"
            >
              Clear existing dummy data before import
            </label>
          </div>

          {selectedFile && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Selected:</strong> {selectedFile.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Records:</strong> {jsonData.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Import Actions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleClearDummyData}
            disabled={clearDummyDataMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clearDummyDataMutation.isPending
              ? "Clearing..."
              : "Clear Dummy Data"}
          </button>

          <button
            onClick={handleImport}
            disabled={
              !selectedFile ||
              jsonData.length === 0 ||
              importCustomersMutation.isPending
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importCustomersMutation.isPending
              ? "Importing..."
              : "Import Customers"}
          </button>

          <button
            onClick={handleLinkManagers}
            disabled={linkManagersMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {linkManagersMutation.isPending ? "Linking..." : "Link Managers"}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>1.</strong> Clear dummy data (optional but recommended for
            first import)
          </p>
          <p>
            <strong>2.</strong> Import customers from your JSON file
          </p>
          <p>
            <strong>3.</strong> Link relationship managers to existing users
          </p>
        </div>
      </div>

      {/* Location-Team Management */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Location-Team Management
        </h3>
        <p className="text-gray-600 mb-4">
          Set up teams for different locations and assign customers to teams based on their location.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleSetupTeams}
            disabled={setupTeamsMutation.isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {setupTeamsMutation.isPending
              ? "Setting up..."
              : "Setup Location Teams"}
          </button>

          <button
            onClick={handleAssignTeams}
            disabled={assignTeamsMutation.isPending}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assignTeamsMutation.isPending
              ? "Assigning..."
              : "Assign Customers to Teams"}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Setup Location Teams:</strong> Creates default teams for common locations (Lagos, Abuja, etc.)
          </p>
          <p>
            <strong>Assign Customers:</strong> Automatically assigns existing customers to teams based on their location
          </p>
        </div>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Import Results
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-green-600">
                {importResult.imported}
              </div>
              <div className="text-sm text-green-700">Imported</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-yellow-600">
                {importResult.skipped}
              </div>
              <div className="text-sm text-yellow-700">Skipped</div>
            </div>
            <div className="bg-red-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-red-600">
                {importResult.errors.length}
              </div>
              <div className="text-sm text-red-700">Errors</div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2">
                Import Errors:
              </h4>
              <div className="max-h-40 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700 mb-1">
                    Row {error.row}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Link Results */}
      {linkResult && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Relationship Manager Linking Results
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-green-600">
                {linkResult.linked}
              </div>
              <div className="text-sm text-green-700">Successfully Linked</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-yellow-600">
                {linkResult.unmatched.length}
              </div>
              <div className="text-sm text-yellow-700">Unmatched</div>
            </div>
          </div>

          {linkResult.unmatched.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                Unmatched Relationship Managers:
              </h4>
              <div className="max-h-40 overflow-y-auto">
                {linkResult.unmatched.map((item, index) => (
                  <div key={index} className="text-sm text-yellow-700 mb-1">
                    {item.customerName} → {item.managerName} (user not found)
                  </div>
                ))}
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                These customers need to be manually assigned to relationship
                managers.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Team Setup Results */}
      {teamSetupResult && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Location Teams Setup Results
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-green-600">
                {teamSetupResult.created}
              </div>
              <div className="text-sm text-green-700">Teams Created</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-blue-600">
                {teamSetupResult.existing}
              </div>
              <div className="text-sm text-blue-700">Teams Updated</div>
            </div>
          </div>

          {teamSetupResult.teams.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">
                Teams and Locations:
              </h4>
              <div className="max-h-40 overflow-y-auto">
                {teamSetupResult.teams.map((team, index) => (
                  <div key={index} className="text-sm text-gray-700 mb-1">
                    <strong>{team.name}:</strong> {team.locations.join(", ")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assignment Results */}
      {assignmentResult && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Customer Team Assignment Results
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-green-600">
                {assignmentResult.assigned}
              </div>
              <div className="text-sm text-green-700">Customers Assigned</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="text-2xl font-bold text-yellow-600">
                {assignmentResult.unassigned}
              </div>
              <div className="text-sm text-yellow-700">Unassigned</div>
            </div>
          </div>

          {assignmentResult.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                Assignment Issues:
              </h4>
              <div className="max-h-40 overflow-y-auto">
                {assignmentResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-yellow-700 mb-1">
                    {error.customerName} ({error.location}): {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Excel to JSON Conversion:</strong> Use online tools like
            "Excel to JSON" converters
          </p>
          <p>
            <strong>Date Format:</strong> Use MM/DD/YYYY format for dates (e.g.,
            01/15/2024)
          </p>
          <p>
            <strong>Relationship Manager:</strong> Must match existing user's
            full name exactly
          </p>
          <p>
            <strong>Customer Name:</strong> Required field, must be unique
            across all customers
          </p>
        </div>
      </div>
    </div>
  );
}
