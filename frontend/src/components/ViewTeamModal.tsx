"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Users, MapPin, Crown, Building, DollarSign } from "lucide-react";
import { apiClient } from "@/lib/api";

interface ViewTeamModalProps {
  isOpen: boolean;
  teamId: string;
  onClose: () => void;
}

export default function ViewTeamModal({
  isOpen,
  teamId,
  onClose,
}: ViewTeamModalProps) {
  // Fetch team details
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const response = await apiClient.get(`/teams/${teamId}`);
      return response.data;
    },
    enabled: isOpen && !!teamId,
  });

  if (!isOpen) return null;

  const team = teamData?.data;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Team Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading team details...</p>
            </div>
          ) : !team ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Team not found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Team Overview */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {team.name}
                    </h3>
                    <div className="flex items-center text-gray-600 mb-4">
                      <Building className="h-5 w-5 mr-2" />
                      <span>{team.region?.name || "No Region"}</span>
                    </div>
                    {team.leader && (
                      <div className="flex items-center text-gray-600">
                        <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                        <span className="font-medium">{team.leader.fullName}</span>
                        <span className="text-gray-400 ml-2">({team.leader.email})</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Created</div>
                    <div className="text-gray-900">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {team.members?.length || 0}
                    </div>
                    <div className="text-sm text-gray-500">Team Members</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <Building className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {team.customers?.length || 0}
                    </div>
                    <div className="text-sm text-gray-500">Customers</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {team.invoices?.length || 0}
                    </div>
                    <div className="text-sm text-gray-500">Invoices</div>
                  </div>
                </div>
              </div>

              {/* Location Coverage */}
              {team.locationNames && team.locationNames.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Location Coverage
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {team.locationNames.map((location: string, index: number) => (
                      <span
                        key={index}
                        className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {location}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Team Members ({team.members?.length || 0})
                </h4>
                {team.members && team.members.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {team.members.map((member: any) => (
                      <div
                        key={member.id}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {member.fullName}
                            </h5>
                            <p className="text-sm text-gray-600">{member.email}</p>
                            {member.phone && (
                              <p className="text-sm text-gray-600">{member.phone}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs">
                              {member.role?.name || "No Role"}
                            </span>
                            <div className={`mt-1 text-xs ${
                              member.isActive ? "text-green-600" : "text-red-600"
                            }`}>
                              {member.isActive ? "Active" : "Inactive"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No team members assigned yet.
                  </div>
                )}
              </div>

              {/* Customers */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Customers ({team.customers?.length || 0})
                </h4>
                {team.customers && team.customers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {team.customers.slice(0, 6).map((customer: any) => (
                      <div
                        key={customer.id}
                        className="bg-white border border-gray-200 rounded-lg p-3"
                      >
                        <h5 className="font-medium text-gray-900 truncate">
                          {customer.name}
                        </h5>
                        {customer.location && (
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {customer.location}
                          </p>
                        )}
                      </div>
                    ))}
                    {team.customers.length > 6 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-center">
                        <span className="text-gray-600 text-sm">
                          +{team.customers.length - 6} more customers
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No customers assigned to this team yet.
                  </div>
                )}
              </div>

              {/* Recent Invoices */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Recent Invoices ({team.invoices?.length || 0})
                </h4>
                {team.invoices && team.invoices.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Invoice #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {team.invoices.slice(0, 5).map((invoice: any) => (
                            <tr key={invoice.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {invoice.invoiceNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ₦{invoice.totalAmount?.toLocaleString() || "0"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  invoice.status === "PAID"
                                    ? "bg-green-100 text-green-800"
                                    : invoice.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {invoice.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(invoice.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {team.invoices.length > 5 && (
                      <div className="bg-gray-50 px-6 py-3 text-center">
                        <span className="text-sm text-gray-600">
                          Showing 5 of {team.invoices.length} invoices
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No invoices created by this team yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
