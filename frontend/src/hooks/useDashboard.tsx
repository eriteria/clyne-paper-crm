import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface DashboardStats {
  data: {
    overview: {
      totalUsers: number;
      activeUsers: number;
      totalInventoryItems: number;
      lowStockCount: number;
      totalInvoices: number;
      pendingInvoices: number;
      totalWaybills: number;
      totalInventoryValue: number;
      inventoryValueChange: number;
    };
    teams: Array<{
      id: string;
      name: string;
      region: string;
      memberCount: number;
    }>;
    lowStockItems: Array<{
      id: string;
      name: string;
      sku: string;
      current_quantity: number;
      min_stock: number;
      location: string;
    }>;
  };
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await apiClient.get("/reports/dashboard");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

// Combine multiple dashboard data fetches into a single optimized hook
export const useDashboardData = () => {
  return useQuery({
    queryKey: ["dashboard-combined"],
    queryFn: async () => {
      // Fetch all dashboard data in parallel
      const [statsResponse, recentInvoicesResponse, recentWaybillsResponse] =
        await Promise.all([
          apiClient.get("/reports/dashboard"),
          apiClient.get("/invoices?limit=5&sort=createdAt:desc"),
          apiClient.get("/waybills?limit=5&sort=createdAt:desc"),
        ]);

      return {
        stats: statsResponse.data,
        recentInvoices: recentInvoicesResponse.data,
        recentWaybills: recentWaybillsResponse.data,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

export const useInventorySummary = () => {
  return useQuery({
    queryKey: ["inventory-summary"],
    queryFn: async () => {
      const response = await apiClient.get("/inventory/summary");
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useRecentInvoices = () => {
  return useQuery({
    queryKey: ["recent-invoices"],
    queryFn: async () => {
      const response = await apiClient.get(
        "/invoices?limit=5&sort=createdAt:desc"
      );
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useRecentWaybills = () => {
  return useQuery({
    queryKey: ["recent-waybills"],
    queryFn: async () => {
      const response = await apiClient.get(
        "/waybills?limit=5&sort=createdAt:desc"
      );
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
