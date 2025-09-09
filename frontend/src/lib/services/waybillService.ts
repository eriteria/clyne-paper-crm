// Create waybill service API client
import api from "@/lib/api";
import {
  CreateWaybillRequest,
  Waybill,
  ProcessWaybillResponse,
  ApproveProductsRequest,
} from "@/types/waybill";

export const waybillService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    locationId?: string;
  }) {
    const response = await api.get("/waybills", { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await api.get(`/waybills/${id}`);
    return response.data;
  },

  async create(data: CreateWaybillRequest) {
    const response = await api.post("/waybills", data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateWaybillRequest>) {
    const response = await api.put(`/waybills/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/waybills/${id}`);
    return response.data;
  },

  async process(id: string): Promise<ProcessWaybillResponse> {
    const response = await api.post(`/waybills/${id}/process`);
    return response.data;
  },

  async approveProducts(id: string, data: ApproveProductsRequest) {
    const response = await api.post(`/waybills/${id}/approve-products`, data);
    return response.data;
  },

  async getForReview(params?: { page?: number; limit?: number }) {
    const response = await api.get("/waybills/status/review", { params });
    return response.data;
  },
};
