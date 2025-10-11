import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  SalesReturn,
  CreateSalesReturnData,
  ApiResponse,
} from "@/types";

interface SalesReturnsListParams {
  page?: number;
  limit?: number;
  customerId?: string;
  invoiceId?: string;
  refundStatus?: string;
  startDate?: string;
  endDate?: string;
}

// Fetch all sales returns with filters
export const useSalesReturns = (params: SalesReturnsListParams = {}) => {
  return useQuery({
    queryKey: ["salesReturns", params],
    queryFn: async () => {
      const response = await apiClient.get<
        ApiResponse<SalesReturn[]> & {
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        }
      >("/sales-returns", { params });
      return response.data;
    },
  });
};

// Fetch single sales return by ID
export const useSalesReturn = (id: string | undefined) => {
  return useQuery({
    queryKey: ["salesReturn", id],
    queryFn: async () => {
      if (!id) throw new Error("ID is required");
      const response = await apiClient.get<ApiResponse<SalesReturn>>(
        `/sales-returns/${id}`
      );
      return response.data.data;
    },
    enabled: !!id,
  });
};

// Fetch sales returns for a specific invoice
export const useSalesReturnsByInvoice = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ["salesReturns", "invoice", invoiceId],
    queryFn: async () => {
      if (!invoiceId) throw new Error("Invoice ID is required");
      const response = await apiClient.get<ApiResponse<SalesReturn[]>>(
        `/sales-returns/invoice/${invoiceId}`
      );
      return response.data.data || [];
    },
    enabled: !!invoiceId,
  });
};

// Create new sales return
export const useCreateSalesReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSalesReturnData) => {
      const response = await apiClient.post<ApiResponse<SalesReturn>>(
        "/sales-returns",
        data
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["salesReturns"] });
      queryClient.invalidateQueries({
        queryKey: ["salesReturns", "invoice", data?.invoiceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
    },
  });
};

// Process sales return (restock and complete)
export const useProcessSalesReturn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<ApiResponse<SalesReturn>>(
        `/sales-returns/${id}/process`
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["salesReturns"] });
      queryClient.invalidateQueries({
        queryKey: ["salesReturn", data?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["salesReturns", "invoice", data?.invoiceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });
    },
  });
};
