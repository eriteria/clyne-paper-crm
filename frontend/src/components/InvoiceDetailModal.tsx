"use client";

import { useState } from "react";
import { Invoice } from "@/types";
import { useSalesReturnsByInvoice } from "@/hooks/useSalesReturns";
import CreateSalesReturnModal from "./CreateSalesReturnModal";
import { BankAccountOverrideModal } from "./BankAccountOverrideModal";
import { X, ArrowLeft, Download } from "lucide-react";
import { apiClient } from "@/lib/api";

interface InvoiceDetailModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function InvoiceDetailModal({
  invoice,
  onClose,
}: InvoiceDetailModalProps) {
  const [showCreateReturn, setShowCreateReturn] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const { data: returns, refetch } = useSalesReturnsByInvoice(invoice.id);

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      DRAFT: "bg-gray-100 text-gray-800",
      OPEN: "bg-blue-100 text-blue-700",
      COMPLETED: "bg-green-100 text-green-800",
      PAID: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-2 md:p-4">
        <div className="bg-white rounded-lg max-w-[98vw] md:max-w-2xl lg:max-w-4xl xl:max-w-5xl w-full max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Invoice Details
              </h2>
              <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-gray-900">
                  Customer Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>{" "}
                    <span className="font-medium text-gray-900">
                      {invoice.customer?.name || invoice.customerName}
                    </span>
                  </div>
                  {invoice.customer?.email && (
                    <div>
                      <span className="text-gray-600">Email:</span>{" "}
                      <span className="text-gray-900">
                        {invoice.customer.email}
                      </span>
                    </div>
                  )}
                  {invoice.customer?.phone && (
                    <div>
                      <span className="text-gray-600">Phone:</span>{" "}
                      <span className="text-gray-900">
                        {invoice.customer.phone}
                      </span>
                    </div>
                  )}
                  {invoice.customer?.address && (
                    <div>
                      <span className="text-gray-600">Address:</span>{" "}
                      <span className="text-gray-900">
                        {invoice.customer.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-gray-900">
                  Invoice Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Date:</span>{" "}
                    <span className="text-gray-900">
                      {new Date(invoice.date).toLocaleDateString()}
                    </span>
                  </div>
                  {invoice.dueDate && (
                    <div>
                      <span className="text-gray-600">Due Date:</span>{" "}
                      <span className="text-gray-900">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Status:</span>{" "}
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                        invoice.status
                      )}`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  {invoice.billedBy && (
                    <div>
                      <span className="text-gray-600">Billed By:</span>{" "}
                      <span className="text-gray-900">
                        {invoice.billedBy.fullName}
                      </span>
                    </div>
                  )}
                  {invoice.team && (
                    <div>
                      <span className="text-gray-600">Team:</span>{" "}
                      <span className="text-gray-900">{invoice.team.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-gray-900">Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.inventoryItem.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {item.inventoryItem.sku}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          ₦{item.unitPrice.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                          ₦{item.lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-sm font-medium text-gray-900 text-right"
                      >
                        Subtotal:
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        ₦
                        {(
                          invoice.totalAmount -
                          (invoice.taxAmount || 0) +
                          (invoice.discountAmount || 0)
                        ).toLocaleString()}
                      </td>
                    </tr>
                    {invoice.discountAmount > 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-2 text-sm font-medium text-gray-900 text-right"
                        >
                          Discount:
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-red-600 text-right">
                          -₦{invoice.discountAmount.toLocaleString()}
                        </td>
                      </tr>
                    )}
                    {invoice.taxAmount > 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-2 text-sm font-medium text-gray-900 text-right"
                        >
                          Tax:
                        </td>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">
                          ₦{invoice.taxAmount.toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-gray-300">
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-base font-bold text-gray-900 text-right"
                      >
                        Total:
                      </td>
                      <td className="px-4 py-3 text-base font-bold text-gray-900 text-right">
                        ₦{invoice.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Returns Section */}
            {returns && returns.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-gray-900">
                  Returns History
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Return #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Reason
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {returns.map((returnItem) => (
                        <tr key={returnItem.id}>
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">
                            {returnItem.returnNumber}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(
                              returnItem.returnDate
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {returnItem.reason}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                            ₦{returnItem.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                returnItem.refundStatus === "Completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {returnItem.refundStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {invoice.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-gray-900">Notes</h3>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Close
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDownloadModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={() => setShowCreateReturn(true)}
                className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Return Items
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Return Modal */}
      {showCreateReturn && (
        <CreateSalesReturnModal
          invoice={invoice}
          onClose={() => setShowCreateReturn(false)}
          onSuccess={() => {
            refetch();
            setShowCreateReturn(false);
          }}
        />
      )}

      {/* Bank Account Override Modal for PDF Download */}
      <BankAccountOverrideModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={async (bankAccountId) => {
          try {
            const url = bankAccountId
              ? `/api/invoices/${invoice.id}/pdf?bankAccountId=${bankAccountId}`
              : `/api/invoices/${invoice.id}/pdf`;

            const response = await apiClient.get(url, {
              responseType: "blob",
            });

            const blob = new Blob([response.data], { type: "application/pdf" });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = `Invoice-${invoice.invoiceNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            setShowDownloadModal(false);
          } catch (error) {
            console.error("Failed to download PDF:", error);
            alert("Failed to download PDF. Please try again.");
          }
        }}
        currentBankAccountId={invoice.bankAccountId}
        currentPaymentMethod={invoice.paymentMethod}
        invoiceNumber={invoice.invoiceNumber}
      />
    </>
  );
}
