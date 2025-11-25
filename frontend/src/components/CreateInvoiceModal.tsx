"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Package,
  FileText,
  Save,
  Calculator,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import SearchableCustomerSelect from "./SearchableCustomerSelect";
import { Customer } from "@/types";
import { useLocation } from "@/contexts/LocationContext";
import { PaymentMethodSelect, PaymentMethod } from "./PaymentMethodSelect";
import { BankAccountSelect } from "./BankAccountSelect";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unitPrice: number;
  currentQuantity: number;
  locationId: string;
  location?: {
    id: string;
    name: string;
  };
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

import type { Invoice } from "@/types";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  invoice?: Invoice;
}

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  invoice,
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
  const { selectedLocationId } = useLocation();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [expectedInvoiceNumber, setExpectedInvoiceNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [showWaybillDialog, setShowWaybillDialog] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [createdInvoiceNumber, setCreatedInvoiceNumber] = useState<
    string | null
  >(null);
  const [createWaybill, setCreateWaybill] = useState(true);
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
      const response = await apiClient.get("/customers?limit=10000");
      return response.data;
    },
    enabled: isOpen,
  });

  const customers = useMemo(() => customersData?.data || [], [customersData]);

  // Prefill fields for edit mode
  useEffect(() => {
    if (invoice && customers) {
      // Find the customer object from the invoice's customerId
      const customer = customers.find(
        (c: Customer) => c.id === invoice.customerId
      );
      setSelectedCustomer(customer || null);
      setInvoiceDate(
        invoice.date
          ? invoice.date.split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setDueDate(invoice.dueDate ? invoice.dueDate.split("T")[0] : "");
      setNotes(invoice.notes || "");
      setTaxAmount(Number(invoice.taxAmount) || 0);
      setDiscountAmount(Number(invoice.discountAmount) || 0);
      setExpectedInvoiceNumber(invoice.invoiceNumber || "");
      setPaymentMethod((invoice.paymentMethod as PaymentMethod) || "");
      setBankAccountId(invoice.bankAccountId || "");
      setItems(
        invoice.items && invoice.items.length > 0
          ? invoice.items.map((it) => ({
              inventoryItemId: it.inventoryItemId,
              quantity: Number(it.quantity),
              unitPrice: Number(it.unitPrice),
              lineTotal: Number(it.lineTotal),
              inventoryItem: it.inventoryItem
                ? {
                    id: it.inventoryItem.id,
                    name: it.inventoryItem.name,
                    sku: it.inventoryItem.sku,
                    unit: it.inventoryItem.unit,
                    unitPrice: Number(it.unitPrice ?? 0),
                    currentQuantity: 0,
                    locationId: it.inventoryItem.locationId || "",
                    location: it.inventoryItem.location,
                    product: it.inventoryItem.product,
                  }
                : undefined,
            }))
          : [
              {
                inventoryItemId: "",
                quantity: 1,
                unitPrice: 0,
                lineTotal: 0,
              },
            ]
      );
    } else {
      // Reset for create mode
      setSelectedCustomer(null);
      setInvoiceDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
      setNotes("");
      setTaxAmount(0);
      setDiscountAmount(0);
      setExpectedInvoiceNumber("");
      setPaymentMethod("");
      setBankAccountId("");
      setItems([
        {
          inventoryItemId: "",
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
        },
      ]);
    }
  }, [invoice, isOpen, customers]);

  // Clear bank account when payment method changes to CASH
  useEffect(() => {
    if (paymentMethod === "CASH") {
      setBankAccountId("");
    }
  }, [paymentMethod]);

  // Prefill fields for edit mode
  useEffect(() => {
    if (invoice && customers.length > 0) {
      // Find the customer object from the invoice's customerId
      const customer = customers.find(
        (c: Customer) => c.id === invoice.customerId
      );
      setSelectedCustomer(customer || null);
      setInvoiceDate(
        invoice.date
          ? invoice.date.split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setDueDate(invoice.dueDate ? invoice.dueDate.split("T")[0] : "");
      setNotes(invoice.notes || "");
      setTaxAmount(Number(invoice.taxAmount) || 0);
      setDiscountAmount(Number(invoice.discountAmount) || 0);
      setExpectedInvoiceNumber(invoice.invoiceNumber || "");
      setPaymentMethod((invoice.paymentMethod as PaymentMethod) || "");
      setBankAccountId(invoice.bankAccountId || "");
      setItems(
        invoice.items && invoice.items.length > 0
          ? invoice.items.map((it) => ({
              inventoryItemId: it.inventoryItemId,
              quantity: Number(it.quantity),
              unitPrice: Number(it.unitPrice),
              lineTotal: Number(it.lineTotal),
              inventoryItem: it.inventoryItem
                ? {
                    id: it.inventoryItem.id,
                    name: it.inventoryItem.name,
                    sku: it.inventoryItem.sku,
                    unit: it.inventoryItem.unit,
                    unitPrice: Number(it.unitPrice ?? 0),
                    currentQuantity: 0,
                    locationId: it.inventoryItem.locationId || "",
                    location: it.inventoryItem.location,
                    product: it.inventoryItem.product,
                  }
                : undefined,
            }))
          : [
              {
                inventoryItemId: "",
                quantity: 1,
                unitPrice: 0,
                lineTotal: 0,
              },
            ]
      );
    }
  }, [invoice, isOpen, customers]);

  // Fetch inventory items for invoicing (filtered by user's location)
  const { data: inventoryData } = useQuery({
    queryKey: ["inventory", "for-invoicing", selectedLocationId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedLocationId) {
        params.append("locationId", selectedLocationId);
      }
      const response = await apiClient.get(
        `/inventory/for-invoicing?${params.toString()}`
      );
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

  // Auto-set due date when customer is selected (create mode only)
  useEffect(() => {
    if (selectedCustomer && !invoice && invoiceDate) {
      const defaultDueDate = new Date(invoiceDate);
      defaultDueDate.setDate(
        defaultDueDate.getDate() + selectedCustomer.defaultPaymentTermDays
      );
      setDueDate(defaultDueDate.toISOString().split("T")[0]);
    }
  }, [selectedCustomer, invoiceDate, invoice]);

  // Validate and adjust due date when invoice date or customer changes
  useEffect(() => {
    if (dueDate && invoiceDate && selectedCustomer) {
      const dueDateObj = new Date(dueDate);
      const invoiceDateObj = new Date(invoiceDate);
      const maxDueDateObj = new Date(invoiceDate);
      maxDueDateObj.setDate(
        maxDueDateObj.getDate() + selectedCustomer.defaultPaymentTermDays
      );

      // If current due date is beyond the customer's payment term limit or before invoice date, reset it
      if (dueDateObj > maxDueDateObj || dueDateObj < invoiceDateObj) {
        const newDueDate = new Date(invoiceDate);
        newDueDate.setDate(
          newDueDate.getDate() + selectedCustomer.defaultPaymentTermDays
        );
        setDueDate(newDueDate.toISOString().split("T")[0]);
      }
    }
  }, [invoiceDate, dueDate, selectedCustomer]);

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

      // Store created invoice details and show waybill dialog
      setCreatedInvoiceId(data.data.id);
      setCreatedInvoiceNumber(actualInvoiceNumber);
      setShowWaybillDialog(true);
    },
    onError: (error: unknown) => {
      console.error("Invoice creation error:", error);

      // Handle errors normally
      const apiError = error as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      alert(
        `Error creating invoice: ${
          apiError.response?.data?.message ||
          apiError.message ||
          "Unknown error"
        }`
      );
    },
  });

  // Create waybill from invoice mutation
  const createWaybillMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiClient.post(
        `/invoices/${invoiceId}/create-waybill`
      );
      return response.data;
    },
    onSuccess: (data) => {
      alert(`Waybill #${data.data.waybillNumber} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ["waybills"] });
      handleWaybillDialogClose();
    },
    onError: (error: unknown) => {
      console.error("Waybill creation error:", error);
      const apiError = error as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      alert(
        `Error creating waybill: ${
          apiError.response?.data?.message ||
          apiError.message ||
          "Unknown error"
        }`
      );
      handleWaybillDialogClose();
    },
  });

  const handleWaybillDialogClose = () => {
    setShowWaybillDialog(false);
    setCreatedInvoiceId(null);
    setCreatedInvoiceNumber(null);
    setCreateWaybill(true);
    onSuccess?.();
    handleClose();
  };

  const handleWaybillDialogConfirm = () => {
    if (createWaybill && createdInvoiceId) {
      createWaybillMutation.mutate(createdInvoiceId);
    } else {
      handleWaybillDialogClose();
    }
  };

  const inventoryItems = inventoryData?.data || [];

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = subtotal + taxAmount - discountAmount;

  // Relaxed due date UI message to match backend flexibility

  const handleClose = () => {
    // Reset form
    setSelectedCustomer(null);
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

    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }

    // Validate payment terms: ensure due date doesn't exceed customer's default payment term
    if (dueDate && selectedCustomer) {
      const dueDateObj = new Date(dueDate);
      const invoiceDateObj = new Date(invoiceDate);
      const daysDifference = Math.ceil(
        (dueDateObj.getTime() - invoiceDateObj.getTime()) / (1000 * 3600 * 24)
      );

      if (daysDifference > selectedCustomer.defaultPaymentTermDays) {
        alert(
          `Payment term cannot exceed ${selectedCustomer.defaultPaymentTermDays} days for this customer. You selected ${daysDifference} days.`
        );
        return;
      }

      if (daysDifference < 0) {
        alert("Due date cannot be before the invoice date.");
        return;
      }
    }

    // Note: Stock validation removed - allowing sales of out-of-stock items

    const invoiceData: InvoiceRequest = {
      customerId: selectedCustomer.id,
      notes,
      dueDate: dueDate || null,
      taxAmount,
      discountAmount,
    };

    // Add payment method and bank account if provided
    if (paymentMethod) {
      (invoiceData as any).paymentMethod = paymentMethod;
    }
    if (paymentMethod === "BANK_TRANSFER" && bankAccountId) {
      (invoiceData as any).bankAccountId = bankAccountId;
    }

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
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[98vw] md:max-w-2xl lg:max-w-4xl xl:max-w-6xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Invoice
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Invoice Number Display */}
            <div>
              <label
                htmlFor="invoice-number"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <FileText className="w-4 h-4 inline mr-1" />
                Invoice Number
              </label>
              <input
                id="invoice-number"
                type="text"
                value={expectedInvoiceNumber || "Loading..."}
                readOnly
                aria-label="Invoice number (auto-generated)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            {/* Customer Selection */}
            <SearchableCustomerSelect
              customers={customers}
              selectedCustomer={selectedCustomer}
              onCustomerChange={setSelectedCustomer}
              required
              loading={!customersData}
            />

            {/* Invoice Date */}
            <div>
              <label
                htmlFor="invoice-date"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Calendar className="w-4 h-4 inline mr-1" />
                Invoice Date *
              </label>
              <input
                id="invoice-date"
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
              <label
                htmlFor="due-date"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date
              </label>
              <input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
              {selectedCustomer ? (
                <p className="mt-1 text-xs text-gray-500">
                  Maximum payment term for this customer:{" "}
                  {selectedCustomer.defaultPaymentTermDays} days
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  Select a customer to see payment terms.
                </p>
              )}
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
                          aria-label={`Product for line item ${index + 1}`}
                          className="w-full px-3 py-2 border-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          style={{
                            backgroundColor: "#ffffff",
                            color: "#111827",
                            borderColor: "#9ca3af",
                          }}
                          required
                        >
                          <option value="" style={{ color: "#6b7280" }}>
                            Select product
                          </option>
                          {inventoryItems.map(
                            (inventoryItem: InventoryItem) => {
                              const hasStock =
                                inventoryItem.currentQuantity > 0;
                              return (
                                <option
                                  key={inventoryItem.id}
                                  value={inventoryItem.id}
                                  disabled={!hasStock}
                                  style={{
                                    color: hasStock ? "#111827" : "#9ca3af",
                                    backgroundColor: hasStock
                                      ? "#ffffff"
                                      : "#f3f4f6",
                                  }}
                                >
                                  {inventoryItem.product?.productGroup?.name &&
                                    `[${inventoryItem.product.productGroup.name}] `}
                                  {inventoryItem.product?.name ||
                                    inventoryItem.name}{" "}
                                  ({inventoryItem.sku})
                                  {inventoryItem.location?.name &&
                                    ` - ${inventoryItem.location.name}`}{" "}
                                  - {hasStock ? "Available" : "OUT OF STOCK"}:{" "}
                                  {inventoryItem.currentQuantity}{" "}
                                  {inventoryItem.unit}
                                </option>
                              );
                            }
                          )}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div>
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
                            aria-label={`Quantity for line item ${index + 1}`}
                            className="w-full px-3 py-2 border-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            style={{
                              backgroundColor: "#ffffff",
                              color: "#111827",
                              borderColor:
                                item.inventoryItem &&
                                item.quantity >
                                  item.inventoryItem.currentQuantity
                                  ? "#ef4444"
                                  : "#9ca3af",
                            }}
                            required
                          />
                          {item.inventoryItem &&
                            item.quantity >
                              item.inventoryItem.currentQuantity && (
                              <p className="text-xs text-red-600 mt-1 font-semibold">
                                Exceeds available stock (
                                {item.inventoryItem.currentQuantity})
                              </p>
                            )}
                        </div>
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
                          aria-label={`Unit price for line item ${index + 1}`}
                          className="w-full px-3 py-2 border-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          style={{
                            backgroundColor: "#ffffff",
                            color: "#111827",
                            borderColor: "#9ca3af",
                          }}
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
                  <label
                    htmlFor="tax-amount"
                    className="text-sm font-medium text-gray-700"
                  >
                    Tax Amount:
                  </label>
                  <input
                    id="tax-amount"
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
                  <label
                    htmlFor="discount-amount"
                    className="text-sm font-medium text-gray-700"
                  >
                    Discount:
                  </label>
                  <input
                    id="discount-amount"
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

          {/* Payment Method and Bank Account */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <PaymentMethodSelect
                value={paymentMethod}
                onChange={setPaymentMethod}
                label="Payment Method"
              />
            </div>
            {paymentMethod === "BANK_TRANSFER" && (
              <div>
                <BankAccountSelect
                  value={bankAccountId}
                  onChange={setBankAccountId}
                  label="Bank Account"
                  required
                />
              </div>
            )}
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
                if (!selectedCustomer) {
                  alert("Please select a customer");
                  return;
                }
                const draftData: InvoiceRequest = {
                  customerId: selectedCustomer.id,
                  notes,
                  dueDate: dueDate || null,
                  taxAmount,
                  discountAmount,
                  action: "save",
                };
                // Add payment method and bank account if provided
                if (paymentMethod) {
                  (draftData as any).paymentMethod = paymentMethod;
                }
                if (paymentMethod === "BANK_TRANSFER" && bankAccountId) {
                  (draftData as any).bankAccountId = bankAccountId;
                }
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

      {/* Waybill Confirmation Dialog */}
      {showWaybillDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Invoice Created Successfully!
            </h3>
            <p className="text-gray-600 mb-4">
              Invoice{" "}
              <span className="font-semibold">{createdInvoiceNumber}</span> has
              been created.
            </p>

            <label className="flex items-center space-x-3 mb-6 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={createWaybill}
                onChange={(e) => setCreateWaybill(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Create delivery waybill for this invoice
              </span>
            </label>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setCreateWaybill(false);
                  handleWaybillDialogClose();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={createWaybillMutation.isPending}
              >
                Skip
              </button>
              <button
                onClick={handleWaybillDialogConfirm}
                disabled={createWaybillMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createWaybillMutation.isPending ? "Creating..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
