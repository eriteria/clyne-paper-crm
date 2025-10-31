import React from "react";

export type PaymentMethod = "CASH" | "BANK_TRANSFER";

interface PaymentMethodSelectProps {
  value: string;
  onChange: (value: PaymentMethod | "") => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

export const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  label = "Payment Method",
}) => {
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
        onChange={(e) => onChange(e.target.value as PaymentMethod | "")}
        disabled={disabled}
        required={required}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? "border-red-500" : "border-gray-300"
        } ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
      >
        <option value="">Select payment method</option>
        <option value="CASH">Cash</option>
        <option value="BANK_TRANSFER">Bank Transfer</option>
      </select>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
