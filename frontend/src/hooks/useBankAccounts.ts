import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BankAccountsResponse {
  success: boolean;
  data: BankAccount[];
}

interface BankAccountResponse {
  success: boolean;
  data: BankAccount;
  message?: string;
}

interface CreateBankAccountData {
  accountName: string;
  accountNumber: string;
  bankName: string;
  isActive?: boolean;
}

interface UpdateBankAccountData {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  isActive?: boolean;
}

/**
 * Hook to fetch all active bank accounts
 */
export const useBankAccounts = () => {
  return useQuery<BankAccount[], Error>({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const response = await apiClient.get<BankAccountsResponse>(
        "/bank-accounts"
      );
      return response.data.data;
    },
  });
};

/**
 * Hook to fetch a single bank account by ID
 */
export const useBankAccount = (id: string | null) => {
  return useQuery<BankAccount, Error>({
    queryKey: ["bankAccount", id],
    queryFn: async () => {
      if (!id) throw new Error("Bank account ID is required");
      const response = await apiClient.get<BankAccountResponse>(
        `/bank-accounts/${id}`
      );
      return response.data.data;
    },
    enabled: !!id,
  });
};

/**
 * Hook to create a new bank account (admin only)
 */
export const useCreateBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<BankAccount, Error, CreateBankAccountData>({
    mutationFn: async (data) => {
      const response = await apiClient.post<BankAccountResponse>(
        "/bank-accounts",
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
    },
  });
};

/**
 * Hook to update a bank account (admin only)
 */
export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<
    BankAccount,
    Error,
    { id: string; data: UpdateBankAccountData }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.patch<BankAccountResponse>(
        `/bank-accounts/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["bankAccount", data.id] });
    },
  });
};

/**
 * Hook to delete (deactivate) a bank account (admin only)
 */
export const useDeleteBankAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<BankAccount, Error, string>({
    mutationFn: async (id) => {
      const response = await apiClient.delete<BankAccountResponse>(
        `/bank-accounts/${id}`
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
    },
  });
};
