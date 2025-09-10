import { Product } from "@/types";
import { apiClient } from "@/lib/api";

export const productsService = {
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    groupId?: string;
  }): Promise<{
    products: Product[];
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
    if (params?.groupId) queryParams.append("groupId", params.groupId);

    const response = await apiClient.get(`/products?${queryParams}`);
    return response.data.data;
  },

  async getAllProducts(): Promise<Product[]> {
    const response = await apiClient.get("/products?limit=1000");
    return response.data.data.products;
  },

  async getProduct(id: string): Promise<Product> {
    const response = await apiClient.get(`/products/${id}`);
    return response.data.data;
  },
};
