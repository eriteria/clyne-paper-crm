import React, { useState, useEffect } from "react";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { X } from "lucide-react";

interface BankAccountOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (bankAccountId?: string) => void;
  currentBankAccountId?: string | null;
  currentPaymentMethod?: string | null;
  invoiceNumber: string;
}

export const BankAccountOverrideModal: React.FC<
  BankAccountOverrideModalProps
> = ({
  isOpen,
  onClose,
  onDownload,
  currentBankAccountId,
  currentPaymentMethod,
  invoiceNumber,
}) => {
  const { data: bankAccounts, isLoading, error } = useBankAccounts();
  const [selectedBankAccountId, setSelectedBankAccountId] =
    useState<string>("");

  useEffect(() => {
    if (currentBankAccountId) {
      setSelectedBankAccountId(currentBankAccountId);
    }
  }, [currentBankAccountId]);

  if (!isOpen) {
    return null;
  }

  if (error) {
    console.error('Error loading bank accounts:', error);
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Bank Accounts</h3>
            <p className="text-gray-700 mb-4">{error.message}</p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    // If selected account is different from current, pass it as override
    const overrideId =
      selectedBankAccountId !== currentBankAccountId
        ? selectedBankAccountId
        : undefined;
    onDownload(overrideId);
    onClose();
  };

  const currentAccount = bankAccounts?.find(
    (acc) => acc.id === currentBankAccountId
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* This element is to trick the browser into centering the modal contents. */}
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-10">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Download Invoice PDF
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="bg-white px-4 py-5 sm:p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Invoice: <span className="font-semibold">{invoiceNumber}</span>
              </p>

              {/* Current Payment Method */}
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Current Payment Method:
                </p>
                <p className="text-sm text-gray-900">
                  {currentPaymentMethod === "CASH" ? (
                    <span className="font-semibold">Cash Payment</span>
                  ) : currentPaymentMethod === "BANK_TRANSFER" ? (
                    <span className="font-semibold">Bank Transfer</span>
                  ) : (
                    <span className="text-gray-500 italic">Not specified</span>
                  )}
                </p>
              </div>

              {/* Current Bank Account */}
              {currentPaymentMethod !== "CASH" && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Current Bank Account:
                  </p>
                  {currentAccount ? (
                    <div className="text-sm text-gray-900">
                      <p className="font-semibold">
                        {currentAccount.accountName}
                      </p>
                      <p className="text-gray-600">
                        Account: {currentAccount.accountNumber} | Bank:{" "}
                        {currentAccount.bankName}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      Default bank account will be used
                    </p>
                  )}
                </div>
              )}

              {/* Bank Account Override */}
              {currentPaymentMethod !== "CASH" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Override Bank Account (Optional)
                  </label>
                  <select
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="" className="text-gray-900">Use current bank account</option>
                    {bankAccounts?.map((account) => (
                      <option key={account.id} value={account.id} className="text-gray-900">
                        {account.accountName} - {account.accountNumber} (
                        {account.bankName})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select a different bank account if needed. Leave blank to
                    use the current one.
                  </p>
                </div>
              )}

              {currentPaymentMethod === "CASH" && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Note:</span> This is a cash
                    invoice. The PDF will display &quot;PAYMENT METHOD:
                    CASH&quot; instead of bank account details.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button
              type="button"
              onClick={handleDownload}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
