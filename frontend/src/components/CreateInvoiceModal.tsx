"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Package,
  FileText,
  Save,
  Calculator,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  contactPerson?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unitPrice: number;
  currentQuantity: number;
  location?: string;
  product?: {
    id: string;
    name: string;
    monthlyTarget: number;
    productGroup: {
      name: string;
    };
  };
}

interface InvoiceItem {
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inventoryItem?: InventoryItem;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateInvoiceModalProps) {
  type PostAction = "save" | "post";
  type InvoiceRequestItem = {
    inventoryItemId: string;
    quantity: number;
    unitPrice: number;
  };
  type InvoiceRequest = {
    customerId: string;
    items?: InvoiceRequestItem[];
    notes: string;
    dueDate: string | null;
    taxAmount: number;
    discountAmount: number;
    action?: PostAction;
  };
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [expectedInvoiceNumber, setExpectedInvoiceNumber] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      inventoryItemId: "",
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
    },
  ]);

  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await apiClient.get("/customers?limit=100");
      return response.data;
    },
    enabled: isOpen,
  });

  // Fetch inventory items for invoicing
  const { data: inventoryData } = useQuery({
    queryKey: ["inventory", "for-invoicing"],
    queryFn: async () => {
      const response = await apiClient.get("/inventory/for-invoicing");
      return response.data;
    },
    enabled: isOpen,
  });

  // Fetch next invoice number
  const { data: nextInvoiceData } = useQuery({
    queryKey: ["invoices", "next-number"],
    queryFn: async () => {
      const response = await apiClient.get("/invoices/next-number");
      return response.data;
    },
    enabled: isOpen,
  });

  // Update expected invoice number when data is fetched
  useEffect(() => {
    if (nextInvoiceData?.data?.nextInvoiceNumber) {
      setExpectedInvoiceNumber(nextInvoiceData.data.nextInvoiceNumber);
    }
  }, [nextInvoiceData]);

  // Validate and adjust due date when invoice date changes
  useEffect(() => {
    if (dueDate && invoiceDate) {
      const dueDateObj = new Date(dueDate);
      const invoiceDateObj = new Date(invoiceDate);
      const maxDueDateObj = new Date(invoiceDate);
      maxDueDateObj.setDate(maxDueDateObj.getDate() + 30);

      // If current due date is beyond the 30-day limit or before invoice date, reset it
      if (dueDateObj > maxDueDateObj || dueDateObj < invoiceDateObj) {
        setDueDate("");
      }
    }
  }, [invoiceDate, dueDate]);

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: InvoiceRequest) => {
      const response = await apiClient.post("/invoices", invoiceData);
      return response.data;
    },
    onSuccess: (data) => {
      // Check if actual invoice number differs from expected
      const actualInvoiceNumber = data.data.invoiceNumber;
      if (
        expectedInvoiceNumber &&
        actualInvoiceNumber !== expectedInvoiceNumber
      ) {
        alert(
          `Note: Invoice number changed from expected ${expectedInvoiceNumber} to ${actualInvoiceNumber} due to concurrent invoice creation.`
        );
      }

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      onSuccess?.();
      handleClose();
    },
  });

  const customers = customersData?.data || [];
  const inventoryItems = inventoryData?.data || [];

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = subtotal + taxAmount - discountAmount;

  // Relaxed due date UI message to match backend flexibility

  const handleClose = () => {
    // Reset form
    setSelectedCustomerId("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setNotes("");
    setTaxAmount(0);
    setDiscountAmount(0);
    setExpectedInvoiceNumber("");
    setItems([
      {
        inventoryItemId: "",
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
      },
    ]);
    onClose();
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        inventoryItemId: "",
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // If inventory item is selected, update the unit price
    if (field === "inventoryItemId") {
      const selectedInventoryItem = inventoryItems.find(
        (item: InventoryItem) => item.id === value
      );
      if (selectedInventoryItem) {
        updatedItems[index].unitPrice = selectedInventoryItem.unitPrice;
        updatedItems[index].inventoryItem = selectedInventoryItem;
      }
    }

    // Recalculate line total
    updatedItems[index].lineTotal =
      updatedItems[index].quantity * updatedItems[index].unitPrice;

    setItems(updatedItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      alert("Please select a customer");
      return;
    }
    // Note: Stock validation removed - allowing sales of out-of-stock items

    const invoiceData: InvoiceRequest = {
      customerId: selectedCustomerId,
      notes,
      dueDate: dueDate || null,
      taxAmount,
      discountAmount,
    };

    // Default submit acts like "Post"
    invoiceData.action = "post";
    invoiceData.items = items.map(
      (item): InvoiceRequestItem => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })
    );

    // Client-side check for posted invoices: require items
    if (
      !invoiceData.items ||
      invoiceData.items.length === 0 ||
      invoiceData.items.some(
        (it: InvoiceRequestItem) => !it.inventoryItemId || it.quantity <= 0
      )
    ) {
      alert("Please complete all item details before posting");
      return;
    }

    createInvoiceMutation.mutate(invoiceData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Invoice
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Invoice Number Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Invoice Number
              </label>
              <input
                type="text"
                value={expectedInvoiceNumber || "Loading..."}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Customer *
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                required
              >
                <option value="">Select a customer</option>
                {customers.map((customer: Customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.companyName && ` (${customer.companyName})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Invoice Date *
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                required
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
              <p className="mt-1 text-xs text-gray-500">Optional.</p>
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                <Package className="w-5 h-5 inline mr-2" />
                Invoice Items
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>

            {/* Inventory Info Notice */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">ℹ️ Note:</span> You can create
                invoices even if products are out of stock. Available quantities
                are shown for reference only.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      S/N
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Description *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.inventoryItemId}
                          onChange={(e) =>
                            updateItem(index, "inventoryItemId", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-sm"
                          required
                        >
                          <option value="">Select product</option>
                          {inventoryItems.map(
                            (inventoryItem: InventoryItem) => (
                              <option
                                key={inventoryItem.id}
                                value={inventoryItem.id}
                              >
                                {inventoryItem.product?.productGroup?.name &&
                                  `[${inventoryItem.product.productGroup.name}] `}
                                {inventoryItem.product?.name ||
                                  inventoryItem.name}{" "}
                                ({inventoryItem.sku})
                                {inventoryItem.location &&
                                  ` - ${inventoryItem.location}`}{" "}
                                - Available: {inventoryItem.currentQuantity}{" "}
                                {inventoryItem.unit}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-sm"
                          required
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-sm"
                          required
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(item.lineTotal)}
                      </td>
                      <td className="px-4 py-3">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Totals */}
          <div className="border-t pt-6">
            <div className="flex justify-end">
              <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Subtotal:
                  </span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">
                    Tax Amount:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxAmount}
                    onChange={(e) =>
                      setTaxAmount(parseFloat(e.target.value) || 0)
                    }
                    className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-sm"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">
                    Discount:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(e) =>
                      setDiscountAmount(parseFloat(e.target.value) || 0)
                    }
                    className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-sm"
                  />
                </div>

                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    <Calculator className="w-5 h-5 inline mr-2" />
                    Total:
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              placeholder="Additional notes or terms..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedCustomerId) {
                  alert("Please select a customer");
                  return;
                }
                const draftData: InvoiceRequest = {
                  customerId: selectedCustomerId,
                  notes,
                  dueDate: dueDate || null,
                  taxAmount,
                  discountAmount,
                  action: "save",
                };
                // Include items only if user started adding
                if (items && items.length > 0) {
                  draftData.items = items
                    .filter((i) => i.inventoryItemId)
                    .map(
                      (item): InvoiceRequestItem => ({
                        inventoryItemId: item.inventoryItemId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                      })
                    );
                }
                createInvoiceMutation.mutate(draftData);
              }}
              className="flex items-center px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" /> Save for later
            </button>
            <button
              type="submit"
              disabled={createInvoiceMutation.isPending}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {createInvoiceMutation.isPending ? "Submitting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
