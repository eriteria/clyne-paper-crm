import {
  Waybill,
  CreateWaybillRequest,
  ProcessWaybillResponse,
  ApproveProductsRequest,
} from "@/types/waybill";
import { apiClient } from "@/lib/api";

export const waybillService = {
  // Get all waybills with filtering and pagination
  async getWaybills(params?: {
    page?: number;
    limit?: number;
    status?: string;
    locationId?: string;
    supplier?: string;
  }) {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.status) queryParams.append("status", params.status);
    if (params?.locationId) queryParams.append("locationId", params.locationId);
    if (params?.supplier) queryParams.append("supplier", params.supplier);

    const response = await apiClient.get(`/waybills?${queryParams}`);
    return response.data;
  },

  // Get single waybill by ID
  async getWaybill(id: string): Promise<Waybill> {
    const response = await apiClient.get(`/waybills/${id}`);
    return response.data;
  },

  // Create new waybill
  async createWaybill(data: CreateWaybillRequest): Promise<Waybill> {
    const response = await apiClient.post("/waybills", data);
    return response.data;
  },

  // Process waybill (hybrid approach)
  async processWaybill(id: string): Promise<ProcessWaybillResponse> {
    const response = await apiClient.post(`/waybills/${id}/process`);
    return response.data;
  },

  // Approve new products from waybill
  async approveProducts(waybillId: string, data: ApproveProductsRequest) {
    const response = await apiClient.post(
      `/waybills/${waybillId}/approve-products`,
      data
    );
    return response.data;
  },

  // Approve items from waybill into inventory
  async approveItems(waybillId: string, itemIds: string[]) {
    const response = await apiClient.post(
      `/waybills/${waybillId}/approve-items`,
      {
        itemIds,
      }
    );
    return response.data;
  },

  // Get waybill statistics
  async getWaybillStats() {
    const response = await apiClient.get("/waybills/stats");
    return response.data;
  },
};
