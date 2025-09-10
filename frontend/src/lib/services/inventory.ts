import { InventoryItem } from "@/types";
import { apiClient } from "@/lib/api";

export const inventoryService = {
  async getInventoryItems(params?: {
    page?: number;
    limit?: number;
    search?: string;
    locationId?: string;
  }): Promise<{
    items: InventoryItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.locationId) queryParams.append("locationId", params.locationId);

    const response = await apiClient.get(`/inventory?${queryParams}`);
    return response.data.data;
  },

  async getAllInventoryItems(): Promise<InventoryItem[]> {
    const response = await apiClient.get("/inventory?limit=1000");
    return response.data.data.items;
  },

  async getInventoryItem(id: string): Promise<InventoryItem> {
    const response = await apiClient.get(`/inventory/${id}`);
    return response.data.data;
  },

  async getLowStockItems(): Promise<InventoryItem[]> {
    const response = await apiClient.get("/inventory/low-stock");
    return response.data.data.items;
  },
};
