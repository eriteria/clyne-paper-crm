"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Edit,
  Trash2,
  MapPin,
  Users,
  User as UserIcon,
  Calendar,
  UserCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { Customer } from "@/types";

interface CustomerWithCount extends Customer {
  _count?: {
    invoices: number;
  };
}

interface CustomersListProps {
  searchTerm: string;
  onViewCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
}

export default function CustomersList({
  searchTerm,
  onViewCustomer,
  onEditCustomer,
}: CustomersListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const queryClient = useQueryClient();

  // Reset to first page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Fetch customers with pagination and search
  const {
    data: customersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customers", searchTerm, currentPage, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      const response = await apiClient.get(`/customers?${params.toString()}`);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Remove separate users query - relationship manager data is included in customers response

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const customers = customersData?.data || [];
  const pagination = customersData?.pagination || {};

  const handleDeleteCustomer = async (id: string, customerName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete customer "${customerName}"?`
      )
    ) {
      deleteCustomerMutation.mutate(id);
    }
  };

  const getRelationshipManagerName = (customer: CustomerWithCount) => {
    // Use the included relationship manager data
    return customer.relationshipManager?.fullName || "Not assigned";
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <p className="text-red-600">
            Error loading customers. Please try again.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Customer Directory ({pagination.total || 0} customers)
        </h2>
      </div>

      {customers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Relationship Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer: CustomerWithCount) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 rounded-full p-2 mr-3">
                        <UserIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {customer.name}
                        </div>
                        {customer.contactPerson && (
                          <div className="text-sm text-gray-500">
                            Contact: {customer.contactPerson}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {/* Location column - show customer address/location only */}
                    {customer.address ? (
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {customer.address}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {/* Team Information Only */}
                    {customer.team ? (
                      <div className="flex items-center text-sm text-gray-900">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {customer.team.name}
                          </div>
                          {customer.team.description && (
                            <div className="text-xs text-gray-500">
                              {customer.team.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">
                        No team assigned
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      {getRelationshipManagerName(customer)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {customer._count?.invoices || 0} invoices
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewCustomer(customer)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View customer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEditCustomer(customer)}
                        className="text-green-600 hover:text-green-900 p-1 rounded"
                        title="Edit customer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteCustomer(customer.id, customer.name)
                        }
                        className="text-red-600 hover:text-red-900 p-1 rounded"
                        title="Delete customer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No customers found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? "Try adjusting your search terms."
              : "Get started by creating your first customer."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, pagination.total)} of{" "}
              {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
              >
                Previous
              </button>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded">
                {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage(
                    Math.min(pagination.totalPages, currentPage + 1)
                  )
                }
                disabled={currentPage === pagination.totalPages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
