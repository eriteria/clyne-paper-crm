import { apiClient } from "./api";
import {
  FinancialDashboard,
  Payment,
  FinancialReport,
  CreatePaymentData,
  ExportData,
} from "../types/financial";

// Financial Dashboard
export const getFinancialDashboard = async (): Promise<FinancialDashboard> => {
  const response = await apiClient.get("/financial/dashboard");
  return response.data.data;
};

// Payments
export const getPayments = async (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  status?: string;
  search?: string;
}) => {
  const response = await apiClient.get("/financial/payments", { params });
  return response.data;
};

export const createPayment = async (
  paymentData: CreatePaymentData
): Promise<Payment> => {
  const response = await apiClient.post("/financial/payments", paymentData);
  return response.data.data;
};

// Reports
export const getFinancialReport = async (
  type: string,
  startDate?: string,
  endDate?: string
): Promise<FinancialReport> => {
  const response = await apiClient.get("/financial/reports", {
    params: { type, startDate, endDate },
  });
  return response.data.data;
};

// Customer Ledger
export const getCustomerLedger = async (
  customerId: string,
  startDate: string,
  endDate: string
) => {
  const response = await apiClient.get(
    `/financial/customer-ledger/${customerId}`,
    {
      params: { startDate, endDate },
    }
  );
  return response.data.data;
};

// Get customers for selection
export const getCustomers = async (search?: string) => {
  const response = await apiClient.get("/customers", {
    params: { search, limit: 100 },
  });
  return response.data.data;
};

// QuickBooks Exports
export const createQuickBooksExport = async (exportData: ExportData) => {
  const response = await apiClient.post(
    "/financial/quickbooks-export",
    exportData
  );
  return response.data.data;
};

export const getExportHistory = async (params?: {
  page?: number;
  limit?: number;
}) => {
  const response = await apiClient.get("/financial/exports", { params });
  return response.data;
};

// Download export file
export const downloadExportFile = async (exportId: string) => {
  const response = await apiClient.get(
    `/financial/exports/${exportId}/download`,
    {
      responseType: "blob",
    }
  );
  return response.data;
};
