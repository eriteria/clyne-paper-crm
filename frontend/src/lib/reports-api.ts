import { apiClient } from "./api";
import type {
  ExecutiveReport,
  CustomerReport,
  SalesReport,
  InventoryReport,
  TeamReport,
  OperationalReport,
  ExportRequest,
  ExportResponse,
  OverdueInvoice,
  ARAgingReport,
} from "../types/reports";

// Executive Reports
export const getExecutiveReport = async (
  startDate: string,
  endDate: string
): Promise<ExecutiveReport> => {
  const response = await apiClient.get(
    `/reports/executive?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data.data;
};

// Customer Reports
export const getCustomerReport = async (
  startDate: string,
  endDate: string
): Promise<CustomerReport> => {
  const response = await apiClient.get(
    `/reports/customers?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data.data;
};

// Sales Reports
export const getSalesReport = async (
  startDate?: string,
  endDate?: string,
  userId?: string,
  teamId?: string,
  regionId?: string
): Promise<SalesReport> => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (userId) params.append("userId", userId);
  if (teamId) params.append("teamId", teamId);
  if (regionId) params.append("regionId", regionId);

  const response = await apiClient.get(`/reports/sales?${params.toString()}`);
  return response.data.data;
};

// Inventory Reports
export const getInventoryReport = async (): Promise<InventoryReport> => {
  const response = await apiClient.get("/reports/inventory");
  return response.data.data;
};

// Team Reports
export const getTeamReport = async (): Promise<TeamReport> => {
  const response = await apiClient.get("/reports/teams");
  return response.data.data;
};

// Operational Reports
export const getOperationalReport = async (
  startDate: string,
  endDate: string
): Promise<OperationalReport> => {
  const response = await apiClient.get(
    `/reports/operations?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data.data;
};

// Dashboard Overview (existing)
export const getDashboardReport = async () => {
  const response = await apiClient.get("/reports/dashboard");
  return response.data.data;
};

// Export Reports
export const exportReport = async (
  request: ExportRequest
): Promise<ExportResponse> => {
  const response = await apiClient.post("/reports/export", request);
  return response.data.data;
};

// Utility function for downloading exported reports
export const downloadExportedReport = (
  data: ExportResponse,
  filename?: string
) => {
  const actualFilename = filename || `${data.filename}.${data.format}`;

  let content: string;
  let mimeType: string;

  switch (data.format) {
    case "json":
      content = JSON.stringify(data.data, null, 2);
      mimeType = "application/json";
      break;
    case "csv":
      // Convert data to CSV format (simplified)
      content = convertToCSV(data.data);
      mimeType = "text/csv";
      break;
    case "pdf":
      // For PDF, data would typically be base64 encoded string from server
      content = JSON.stringify(data.data, null, 2); // Fallback to JSON if not base64
      mimeType = "application/pdf";
      break;
    default:
      throw new Error(`Unsupported format: ${data.format}`);
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = actualFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper function to convert data to CSV format
function convertToCSV(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "No data available";
  }

  // Simple CSV conversion - would need to be enhanced based on actual data structure
  const header = "Report Data\n";
  const content = JSON.stringify(data, null, 2);
  return header + content;
}

// Report scheduling (for future implementation)
export interface ScheduledReport {
  id: string;
  reportType: string;
  frequency: "daily" | "weekly" | "monthly";
  recipients: string[];
  format: "json" | "csv" | "pdf";
  filters: Record<string, string | number | boolean>;
  isActive: boolean;
  nextRunDate: string;
  createdAt: string;
  updatedAt: string;
}

export const getScheduledReports = async (): Promise<ScheduledReport[]> => {
  const response = await apiClient.get("/reports/scheduled");
  return response.data.data;
};

export const createScheduledReport = async (
  report: Omit<
    ScheduledReport,
    "id" | "createdAt" | "updatedAt" | "nextRunDate"
  >
): Promise<ScheduledReport> => {
  const response = await apiClient.post("/reports/scheduled", report);
  return response.data.data;
};

export const updateScheduledReport = async (
  id: string,
  updates: Partial<ScheduledReport>
): Promise<ScheduledReport> => {
  const response = await apiClient.put(`/reports/scheduled/${id}`, updates);
  return response.data.data;
};

export const deleteScheduledReport = async (id: string): Promise<void> => {
  await apiClient.delete(`/reports/scheduled/${id}`);
};

// Report caching utilities
export const clearReportCache = async (reportType?: string): Promise<void> => {
  const url = reportType
    ? `/reports/cache/clear?type=${reportType}`
    : "/reports/cache/clear";
  await apiClient.delete(url);
};

export const getReportCacheStatus = async () => {
  const response = await apiClient.get("/reports/cache/status");
  return response.data.data;
};

// Overdue Invoices
export const getOverdueInvoices = async (): Promise<OverdueInvoice[]> => {
  const response = await apiClient.get("/reports/overdue-invoices");
  return response.data.data;
};

// Accounts Receivable Aging
export const getARAging = async (
  asOf: string,
  mode: "due" | "outstanding" = "due",
  netDays = 30,
  filters?: { teamId?: string; regionId?: string; customerId?: string }
): Promise<ARAgingReport> => {
  const params = new URLSearchParams();
  params.set("asOf", asOf);
  if (mode) params.set("mode", mode);
  if (netDays != null) params.set("netDays", String(netDays));
  if (filters?.teamId) params.set("teamId", filters.teamId);
  if (filters?.regionId) params.set("regionId", filters.regionId);
  if (filters?.customerId) params.set("customerId", filters.customerId);

  const response = await apiClient.get(`/reports/ar-aging?${params.toString()}`);
  // Some endpoints return { success, data }, others return the payload directly
  return (response.data && response.data.data) ? (response.data.data as ARAgingReport) : (response.data as ARAgingReport);
};
