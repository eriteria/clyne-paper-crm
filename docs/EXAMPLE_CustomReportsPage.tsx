/**
 * Example Custom Report Builder Component
 * 
 * This component demonstrates how to use the Dynamic Reports API
 * from the frontend to create flexible, ad-hoc reports.
 * 
 * Usage:
 * 1. Copy this to src/app/reports/custom/page.tsx
 * 2. Add route link in your navigation
 * 3. Users can now create custom reports without backend changes
 */

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface DynamicReportRequest {
  model: string;
  filters?: {
    startDate?: string;
    endDate?: string;
    dateField?: string;
    customerIds?: string[];
    teamIds?: string[];
    locationIds?: string[];
    statuses?: string[];
    minAmount?: number;
    maxAmount?: number;
    search?: string;
  };
  groupBy?: string[];
  aggregations?: string[];
  orderBy?: {
    field: string;
    direction: "asc" | "desc";
    aggregate?: string;
  };
  limit?: number;
}

export default function CustomReportsPage() {
  const [model, setModel] = useState("invoice");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupByField, setGroupByField] = useState("");
  const [aggregations, setAggregations] = useState(["count", "sum:totalAmount"]);

  const { mutate: runReport, data, isLoading, error } = useMutation({
    mutationFn: async (request: DynamicReportRequest) => {
      const response = await apiClient.post("/reports/query", request);
      return response.data;
    },
  });

  const handleRunReport = () => {
    const request: DynamicReportRequest = {
      model,
      filters: {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
      groupBy: groupByField ? [groupByField] : undefined,
      aggregations,
      limit: 100,
    };

    runReport(request);
  };

  // Quick Report Templates
  const quickReports = [
    {
      name: "Revenue by Location (Last 30 Days)",
      request: {
        model: "invoice",
        filters: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
          statuses: ["PAID", "PARTIALLY_PAID"],
        },
        groupBy: ["locationId"],
        aggregations: ["count", "sum:totalAmount", "avg:totalAmount"],
        orderBy: {
          aggregate: "_sum",
          field: "totalAmount",
          direction: "desc" as const,
        },
      },
    },
    {
      name: "Top Customers by Revenue",
      request: {
        model: "invoice",
        filters: {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
          statuses: ["PAID", "PARTIALLY_PAID"],
        },
        groupBy: ["customerId", "customerName"],
        aggregations: ["count", "sum:totalAmount"],
        orderBy: {
          aggregate: "_sum",
          field: "totalAmount",
          direction: "desc" as const,
        },
        limit: 10,
      },
    },
    {
      name: "Payment Method Analysis",
      request: {
        model: "customerPayment",
        filters: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
          dateField: "paymentDate",
          statuses: ["COMPLETED"],
        },
        groupBy: ["paymentMethod"],
        aggregations: ["count", "sum:amount", "avg:amount"],
      },
    },
    {
      name: "Invoice Status Summary",
      request: {
        model: "invoice",
        filters: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          endDate: new Date().toISOString().split("T")[0],
        },
        groupBy: ["status"],
        aggregations: ["count", "sum:totalAmount"],
      },
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Custom Report Builder</h1>

      {/* Quick Reports */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickReports.map((report) => (
            <button
              key={report.name}
              onClick={() => runReport(report.request)}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
              disabled={isLoading}
            >
              <div className="font-medium text-sm">{report.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {report.request.model} • {report.request.groupBy?.join(", ")}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Report Builder */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Build Custom Report</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Data Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option value="invoice">Invoices</option>
              <option value="customerPayment">Payments</option>
              <option value="customer">Customers</option>
              <option value="inventoryItem">Inventory</option>
              <option value="waybill">Waybills</option>
              <option value="invoiceItem">Invoice Items</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium mb-2">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 border rounded-lg p-2"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 border rounded-lg p-2"
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Group By */}
          <div>
            <label className="block text-sm font-medium mb-2">Group By</label>
            <select
              value={groupByField}
              onChange={(e) => setGroupByField(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option value="">No Grouping</option>
              <option value="status">Status</option>
              <option value="customerId">Customer</option>
              <option value="teamId">Team</option>
              <option value="locationId">Location</option>
              <option value="paymentMethod">Payment Method</option>
            </select>
          </div>

          {/* Aggregations */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Metrics (Aggregations)
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={aggregations.includes("count")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAggregations([...aggregations, "count"]);
                    } else {
                      setAggregations(aggregations.filter((a) => a !== "count"));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Count</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={aggregations.includes("sum:totalAmount")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAggregations([...aggregations, "sum:totalAmount"]);
                    } else {
                      setAggregations(
                        aggregations.filter((a) => a !== "sum:totalAmount")
                      );
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Sum (Total Amount)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={aggregations.includes("avg:totalAmount")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAggregations([...aggregations, "avg:totalAmount"]);
                    } else {
                      setAggregations(
                        aggregations.filter((a) => a !== "avg:totalAmount")
                      );
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Average (Total Amount)</span>
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunReport}
          disabled={isLoading}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? "Running Report..." : "Run Report"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-700 text-sm">{(error as any).message}</p>
        </div>
      )}

      {/* Results Display */}
      {data && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Report Results</h2>
            <div className="text-sm text-gray-500">
              {data.queryType} • {data.resultCount || data.sampleCount} results
            </div>
          </div>

          {/* GroupBy Results */}
          {data.queryType === "groupBy" && data.data && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(data.data[0] || {}).map((key) => (
                      <th
                        key={key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.data.map((row: any, idx: number) => (
                    <tr key={idx}>
                      {Object.entries(row).map(([key, value]: [string, any]) => (
                        <td key={key} className="px-6 py-4 whitespace-nowrap text-sm">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Aggregate Results */}
          {data.queryType === "aggregate" && data.aggregation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.aggregation).map(([key, value]: [string, any]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">
                    {key.replace("_", " ").toUpperCase()}
                  </div>
                  <div className="text-2xl font-bold">
                    {typeof value === "object"
                      ? JSON.stringify(value, null, 2)
                      : String(value)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Export Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(data, null, 2);
                const dataBlob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `report-${new Date().toISOString()}.json`;
                link.click();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
