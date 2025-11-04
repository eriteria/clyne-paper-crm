"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserCheck, Plus, CreditCard, Receipt, FileText } from "lucide-react";
import CreateCustomerModal from "@/components/CreateCustomerModal";
import RecordPaymentModal from "@/components/RecordPaymentModal";
import CustomerLedgerModal from "@/components/CustomerLedgerModal";
import CreditManagementModal from "@/components/CreditManagementModal";
import SearchBar from "@/components/SearchBar";
import CustomersList from "@/components/CustomersList";
import { Customer } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";

export default function CustomersPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  // Check if user has permission to view customers
  if (!hasPermission("customers:view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="mb-4">
            <UserCheck className="h-16 w-16 text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to view customers.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Payment management states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] =
    useState<Customer | null>(null);

  const queryClient = useQueryClient();

  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
  };

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  const handleCustomerUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
    setShowCreateModal(false);
    setEditingCustomer(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <UserCheck className="h-8 w-8 text-blue-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 mt-1">
              Manage customer relationships and information
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {hasPermission("payments:create") && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <Receipt className="h-4 w-4" />
              <span className="whitespace-nowrap">Record Payment</span>
            </button>
          )}
          {hasPermission("customers:create") && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="whitespace-nowrap">Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 w-full max-w-full">
        <SearchBar
          onSearchChange={handleSearchChange}
          placeholder="Search customers..."
        />
      </div>

      {/* Customers List */}
      <CustomersList
        searchTerm={searchTerm}
        onViewCustomer={handleViewCustomer}
        onEditCustomer={handleEditCustomer}
      />

      {showCreateModal && (
        <CreateCustomerModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCustomerUpdated}
        />
      )}

      {editingCustomer && (
        <CreateCustomerModal
          isOpen={true}
          onClose={() => setEditingCustomer(null)}
          onSuccess={handleCustomerUpdated}
          customer={editingCustomer}
        />
      )}

      {viewingCustomer && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Customer Details
                </h2>
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <p className="text-gray-900">
                      {viewingCustomer.companyName || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <p className="text-gray-900">
                      {viewingCustomer.contactPerson || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <p className="text-gray-900">{viewingCustomer.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <p className="text-gray-900">
                      {viewingCustomer.phone || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <p className="text-gray-900">
                      {viewingCustomer.address || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <p className="text-gray-900">
                      {viewingCustomer.locationRef?.name || "N/A"}
                      {viewingCustomer.locationRef?.description && (
                        <span className="text-sm text-gray-500 block">
                          {viewingCustomer.locationRef.description}
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team
                    </label>
                    <p className="text-gray-900">
                      {viewingCustomer.team?.name || "No team assigned"}
                      {viewingCustomer.team?.description && (
                        <span className="text-sm text-gray-500 block">
                          {viewingCustomer.team.description}
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship Manager
                    </label>
                    <p className="text-gray-900">
                      {viewingCustomer.relationshipManager?.fullName ||
                        "Unassigned"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Created Date
                    </label>
                    <p className="text-gray-900">
                      {new Date(viewingCustomer.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              {/* Payment Management Actions */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Payment Management
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedCustomerForPayment(viewingCustomer);
                      setShowPaymentModal(true);
                    }}
                    className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Record Payment
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCustomerForPayment(viewingCustomer);
                      setShowLedgerModal(true);
                    }}
                    className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Ledger
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCustomerForPayment(viewingCustomer);
                      setShowCreditModal(true);
                    }}
                    className="flex items-center px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Credits
                  </button>
                </div>
              </div>

              {/* Customer Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setViewingCustomer(null);
                    setEditingCustomer(viewingCustomer);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Edit Customer
                </button>
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Management Modals */}
      {showPaymentModal && selectedCustomerForPayment && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedCustomerForPayment(null);
          }}
          customer={selectedCustomerForPayment}
          onPaymentRecorded={() => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            setShowPaymentModal(false);
            setSelectedCustomerForPayment(null);
          }}
        />
      )}

      {showLedgerModal && selectedCustomerForPayment && (
        <CustomerLedgerModal
          isOpen={showLedgerModal}
          onClose={() => {
            setShowLedgerModal(false);
            setSelectedCustomerForPayment(null);
          }}
          customer={selectedCustomerForPayment}
        />
      )}

      {showCreditModal && selectedCustomerForPayment && (
        <CreditManagementModal
          isOpen={showCreditModal}
          onClose={() => {
            setShowCreditModal(false);
            setSelectedCustomerForPayment(null);
          }}
          customer={selectedCustomerForPayment}
          onCreditApplied={() => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
          }}
        />
      )}
    </div>
  );
}
