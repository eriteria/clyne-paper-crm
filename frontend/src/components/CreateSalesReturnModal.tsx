"use client";

import { useState, useEffect } from "react";
import { useCreateSalesReturn } from "@/hooks/useSalesReturns";
import {
  Invoice,
  InvoiceItem,
  ItemCondition,
  RefundMethod,
  CreateSalesReturnItem,
} from "@/types";

interface CreateSalesReturnModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ReturnItemForm extends CreateSalesReturnItem {
  maxQuantity: number;
  invoiceItemId: string;
}

export default function CreateSalesReturnModal({
  invoice,
  onClose,
  onSuccess,
}: CreateSalesReturnModalProps) {
  const createMutation = useCreateSalesReturn();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("Credit Note");
  const [selectedItems, setSelectedItems] = useState<
    Map<string, ReturnItemForm>
  >(new Map());

  // Initialize available items from invoice
  const availableItems: ReturnItemForm[] = invoice.items.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    productName: item.inventoryItem.name,
    sku: item.inventoryItem.sku,
    quantityReturned: 0,
    unitPrice: item.unitPrice,
    condition: "Good" as ItemCondition,
    maxQuantity: item.quantity,
    invoiceItemId: item.id,
  }));

  const toggleItem = (item: ReturnItemForm) => {
    const newSelected = new Map(selectedItems);
    if (newSelected.has(item.invoiceItemId)) {
      newSelected.delete(item.invoiceItemId);
    } else {
      newSelected.set(item.invoiceItemId, {
        ...item,
        quantityReturned: 1, // Default to 1
      });
    }
    setSelectedItems(newSelected);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    const item = newSelected.get(itemId);
    if (item) {
      newSelected.set(itemId, {
        ...item,
        quantityReturned: Math.min(quantity, item.maxQuantity),
      });
      setSelectedItems(newSelected);
    }
  };

  const updateItemCondition = (itemId: string, condition: ItemCondition) => {
    const newSelected = new Map(selectedItems);
    const item = newSelected.get(itemId);
    if (item) {
      newSelected.set(itemId, { ...item, condition });
      setSelectedItems(newSelected);
    }
  };

  const calculateTotal = () => {
    return Array.from(selectedItems.values()).reduce(
      (sum, item) => sum + item.quantityReturned * item.unitPrice,
      0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.size === 0) {
      alert("Please select at least one item to return");
      return;
    }

    if (!reason.trim()) {
      alert("Please provide a reason for the return");
      return;
    }

    try {
      const items = Array.from(selectedItems.values()).map((item) => ({
        inventoryItemId: item.inventoryItemId,
        productName: item.productName,
        sku: item.sku,
        quantityReturned: item.quantityReturned,
        unitPrice: item.unitPrice,
        condition: item.condition,
      }));

      await createMutation.mutateAsync({
        invoiceId: invoice.id,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        refundMethod,
        items,
      });

      alert("Sales return created successfully!");
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      alert(
        err.response?.data?.error ||
          "Failed to create return. Please try again."
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Create Sales Return
              </h2>
              <p className="text-gray-600 mt-1">
                Invoice: {invoice.invoiceNumber} - {invoice.customer?.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            {/* Return Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Return Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Return *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a reason</option>
                    <option value="Damaged in transit">
                      Damaged in transit
                    </option>
                    <option value="Wrong product">Wrong product</option>
                    <option value="Quality issue">Quality issue</option>
                    <option value="Customer request">Customer request</option>
                    <option value="Overstocked">Overstocked</option>
                    <option value="Expired/Near expiry">
                      Expired/Near expiry
                    </option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Method *
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) =>
                      setRefundMethod(e.target.value as RefundMethod)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Credit Note">Credit Note</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any additional information about the return..."
                  />
                </div>
              </div>
            </div>

            {/* Items Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Select Items to Return
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Select
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Invoiced Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Return Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Condition
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Unit Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {availableItems.map((item) => {
                      const isSelected = selectedItems.has(item.invoiceItemId);
                      const selectedItem = selectedItems.get(
                        item.invoiceItemId
                      );

                      return (
                        <tr
                          key={item.invoiceItemId}
                          className={isSelected ? "bg-blue-50" : ""}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItem(item)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.sku}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.maxQuantity}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              max={item.maxQuantity}
                              value={selectedItem?.quantityReturned || 1}
                              onChange={(e) =>
                                updateItemQuantity(
                                  item.invoiceItemId,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              disabled={!isSelected}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={selectedItem?.condition || "Good"}
                              onChange={(e) =>
                                updateItemCondition(
                                  item.invoiceItemId,
                                  e.target.value as ItemCondition
                                )
                              }
                              disabled={!isSelected}
                              className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="Good">Good</option>
                              <option value="Damaged">Damaged</option>
                              <option value="Defective">Defective</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ₦{item.unitPrice.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            {selectedItems.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Return Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-700">Items Selected</div>
                    <div className="font-semibold text-gray-900">
                      {selectedItems.size}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700">Total Quantity</div>
                    <div className="font-semibold text-gray-900">
                      {Array.from(selectedItems.values()).reduce(
                        (sum, item) => sum + item.quantityReturned,
                        0
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700">Good Condition</div>
                    <div className="font-semibold text-green-700">
                      {
                        Array.from(selectedItems.values()).filter(
                          (item) => item.condition === "Good"
                        ).length
                      }{" "}
                      items
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-700">Refund Amount</div>
                    <div className="font-bold text-gray-900 text-lg">
                      ₦{calculateTotal().toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                selectedItems.size === 0 ||
                !reason
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending
                ? "Creating Return..."
                : "Create Return"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
