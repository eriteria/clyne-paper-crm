import React from "react";
import { useBankAccounts } from "@/hooks/useBankAccounts";

interface BankAccountSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

export const BankAccountSelect: React.FC<BankAccountSelectProps> = ({
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  label = "Bank Account",
  placeholder = "Select bank account",
}) => {
  const {
    data: bankAccounts,
    isLoading,
    error: fetchError,
  } = useBankAccounts();

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
        required={required}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? "border-red-500" : "border-gray-300"
        } ${
          disabled || isLoading ? "bg-gray-100 cursor-not-allowed" : "bg-white"
        }`}
      >
        <option value="">{isLoading ? "Loading..." : placeholder}</option>
        {bankAccounts?.map((account) => (
          <option key={account.id} value={account.id}>
            {account.accountName} - {account.accountNumber} ({account.bankName})
          </option>
        ))}
      </select>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {fetchError && (
        <p className="mt-1 text-sm text-red-500">
          Failed to load bank accounts. Please try again.
        </p>
      )}
    </div>
  );
};
