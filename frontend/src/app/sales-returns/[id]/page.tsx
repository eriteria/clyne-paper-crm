"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSalesReturn, useProcessSalesReturn } from "@/hooks/useSalesReturns";
import { useState } from "react";

export default function SalesReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: returnData, isLoading } = useSalesReturn(id);
  const processMutation = useProcessSalesReturn();
  const [showConfirmProcess, setShowConfirmProcess] = useState(false);

  const handleProcess = async () => {
    try {
      await processMutation.mutateAsync(id);
      alert("Sales return processed successfully!");
      setShowConfirmProcess(false);
    } catch (error: any) {
      alert(
        error.response?.data?.error ||
          "Failed to process return. Please try again."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12 text-gray-900">
            Loading return details...
          </div>
        </div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-700 mb-4">Return not found</p>
            <button
              onClick={() => router.push("/sales-returns")}
              className="text-blue-700 hover:text-blue-900 font-medium"
            >
              ← Back to Returns List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Pending: "bg-yellow-100 text-yellow-900 border border-yellow-300",
      Completed: "bg-green-100 text-green-900 border border-green-300",
      Restocked: "bg-green-100 text-green-900 border border-green-300",
      "Not Restocked": "bg-gray-100 text-gray-900 border border-gray-300",
    };
    return styles[status] || "bg-gray-100 text-gray-900 border border-gray-300";
  };

  const getConditionBadge = (condition: string) => {
    const styles: Record<string, string> = {
      Good: "bg-green-100 text-green-900 border border-green-300",
      Damaged: "bg-orange-100 text-orange-900 border border-orange-300",
      Defective: "bg-red-100 text-red-900 border border-red-300",
    };
    return (
      styles[condition] || "bg-gray-100 text-gray-900 border border-gray-300"
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/sales-returns")}
            className="text-blue-700 hover:text-blue-900 mb-4 inline-flex items-center font-medium"
          >
            ← Back to Returns List
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {returnData.returnNumber}
              </h1>
              <p className="text-gray-700 mt-2 text-base">
                Return for Invoice {returnData.invoice?.invoiceNumber}
              </p>
            </div>
            <div className="flex gap-3">
              {returnData.refundStatus === "Pending" && (
                <button
                  onClick={() => setShowConfirmProcess(true)}
                  disabled={processMutation.isPending}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processMutation.isPending
                    ? "Processing..."
                    : "Process Return"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Return Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Return Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-700 font-medium">
                  Return Number
                </label>
                <p className="font-medium text-gray-900 mt-1">
                  {returnData.returnNumber}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-medium">
                  Return Date
                </label>
                <p className="font-medium text-gray-900 mt-1">
                  {new Date(returnData.returnDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-medium">
                  Customer
                </label>
                <p className="font-medium text-gray-900 mt-1">
                  {returnData.customer?.name || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-medium">
                  Invoice Number
                </label>
                <p className="font-medium text-blue-700 cursor-pointer hover:text-blue-900 mt-1">
                  {returnData.invoice?.invoiceNumber || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-medium">
                  Refund Method
                </label>
                <p className="font-medium text-gray-900 mt-1">
                  {returnData.refundMethod}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-medium">
                  Total Amount
                </label>
                <p className="font-semibold text-gray-900 text-lg mt-1">
                  ₦{returnData.totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-700 font-medium">
                  Reason
                </label>
                <p className="font-medium text-gray-900 mt-1">
                  {returnData.reason}
                </p>
              </div>
              {returnData.notes && (
                <div className="col-span-2">
                  <label className="text-sm text-gray-700 font-medium">
                    Notes
                  </label>
                  <p className="font-medium text-gray-900 mt-1">
                    {returnData.notes}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-700 font-medium">
                  Created By
                </label>
                <p className="font-medium text-gray-900 mt-1">
                  {returnData.createdBy?.fullName || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-medium">
                  Created At
                </label>
                <p className="font-medium text-gray-900 mt-1">
                  {new Date(returnData.createdAt).toLocaleString()}
                </p>
              </div>
              {returnData.processedBy && (
                <>
                  <div>
                    <label className="text-sm text-gray-700 font-medium">
                      Processed By
                    </label>
                    <p className="font-medium text-gray-900 mt-1">
                      {returnData.processedBy.fullName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-700 font-medium">
                      Processed At
                    </label>
                    <p className="font-medium text-gray-900 mt-1">
                      {returnData.processedAt
                        ? new Date(returnData.processedAt).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Status</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-medium block mb-2">
                  Refund Status
                </label>
                <span
                  className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusBadge(
                    returnData.refundStatus
                  )}`}
                >
                  {returnData.refundStatus}
                </span>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-medium block mb-2">
                  Restock Status
                </label>
                <span
                  className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusBadge(
                    returnData.restockStatus
                  )}`}
                >
                  {returnData.restockStatus}
                </span>
              </div>
              <div className="pt-4 border-t">
                <div className="text-sm text-gray-700 font-medium mb-1">
                  Items Returned
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {returnData.items.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-700 font-medium mb-1">
                  Good Condition Items
                </div>
                <div className="text-lg font-semibold text-green-700">
                  {
                    returnData.items.filter((item) => item.condition === "Good")
                      .length
                  }
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-700 font-medium mb-1">
                  Items Restocked
                </div>
                <div className="text-lg font-semibold text-blue-700">
                  {returnData.items.filter((item) => item.restocked).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Returned Items */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Returned Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restocked
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returnData.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.quantityReturned}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      ₦{item.unitPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      ₦{item.subtotal.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getConditionBadge(
                          item.condition
                        )}`}
                      >
                        {item.condition}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.restocked ? (
                        <span className="text-green-600 font-semibold">
                          ✓ Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">✗ No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm Process Modal */}
      {showConfirmProcess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">
              Process Sales Return?
            </h3>
            <p className="text-gray-600 mb-6">This will:</p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>
                Restock all items in &quot;Good&quot; condition back to
                inventory
              </li>
              <li>Mark the return as &quot;Completed&quot;</li>
              <li>Update restock status accordingly</li>
              <li>Record you as the processor</li>
            </ul>
            <p className="text-sm text-gray-500 mb-6">
              Good condition items:{" "}
              <strong>
                {
                  returnData.items.filter((item) => item.condition === "Good")
                    .length
                }
              </strong>
              <br />
              Total quantity to restock:{" "}
              <strong>
                {returnData.items
                  .filter((item) => item.condition === "Good")
                  .reduce((sum, item) => sum + item.quantityReturned, 0)}
              </strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmProcess(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcess}
                disabled={processMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {processMutation.isPending ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
