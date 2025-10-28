"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Users,
  MapPin,
  Crown,
  Building,
  DollarSign,
  Plus,
  UserMinus,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { User } from "@/types";
import { formatCurrency } from "@/lib/utils";

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
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch team details
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const response = await apiClient.get(`/teams/${teamId}`);
      return response.data;
    },
    enabled: isOpen && !!teamId,
  });

  // Fetch available users for adding to team
  const { data: availableUsersData } = useQuery({
    queryKey: ["users", "unassigned"],
    queryFn: async () => {
      const response = await apiClient.get(
        "/users?teamId=null&limit=1000&isActive=true"
      );
      return response.data;
    },
    enabled: showAddMemberModal,
  });

  // Debug: Log available users data
  if (showAddMemberModal && availableUsersData) {
    console.log("Available users data:", availableUsersData);
    console.log("Users array:", availableUsersData?.data?.users);
    console.log("Users count:", availableUsersData?.data?.users?.length || 0);
  }

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!availableUsersData?.data?.users) return [];

    const users = availableUsersData.data.users;
    if (!searchTerm.trim()) return users;

    return users.filter(
      (user: User) =>
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableUsersData?.data?.users, searchTerm]);

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await apiClient.post(`/teams/${teamId}/members`, {
        userIds,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["users", "unassigned"] });
      setShowAddMemberModal(false);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiClient.delete(`/teams/${teamId}/members`, {
        data: { userIds: [userId] },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["users", "unassigned"] });
    },
  });

  // Helper functions for member selection
  const handleUserToggle = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = (users: User[]) => {
    const allUserIds = users.map((user) => user.id);
    setSelectedUserIds((prev) =>
      prev.length === allUserIds.length ? [] : allUserIds
    );
  };

  const handleAddSelectedMembers = () => {
    if (selectedUserIds.length > 0) {
      addMembersMutation.mutate(selectedUserIds);
      setSelectedUserIds([]);
    }
  };

  const resetModal = () => {
    setShowAddMemberModal(false);
    setSearchTerm("");
    setSelectedUserIds([]);
  };

  const handleRemoveMember = (userId: string) => {
    if (confirm("Are you sure you want to remove this member from the team?")) {
      removeMemberMutation.mutate(userId);
    }
  };

  if (!isOpen) return null;

  const team = teamData?.data;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[98vw] md:max-w-xl lg:max-w-2xl xl:max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
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
                        <span className="font-medium">
                          {team.leader.fullName}
                        </span>
                        <span className="text-gray-400 ml-2">
                          ({team.leader.email})
                        </span>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
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
                  <div className="bg-white rounded-lg p-4 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(team.totalOutstandingPayments || 0)}
                    </div>
                    <div className="text-sm text-gray-500">Outstanding</div>
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
                    {team.locationNames.map(
                      (location: string, index: number) => (
                        <span
                          key={index}
                          className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {location}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Team Members ({team.members?.length || 0})
                  </h4>
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Members
                  </button>
                </div>
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
                            <p className="text-sm text-gray-600">
                              {member.email}
                            </p>
                            {member.phone && (
                              <p className="text-sm text-gray-600">
                                {member.phone}
                              </p>
                            )}
                            <div
                              className={`mt-1 text-xs ${
                                member.isActive
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {member.isActive ? "Active" : "Inactive"}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs">
                              {member.role?.name || "No Role"}
                            </span>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={removeMemberMutation.isPending}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                              title="Remove from team"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
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
                                {formatCurrency(invoice.totalAmount || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    invoice.status === "PAID"
                                      ? "bg-green-100 text-green-800"
                                      : invoice.status === "PENDING"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {invoice.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(
                                  invoice.createdAt
                                ).toLocaleDateString()}
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

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm overflow-y-auto h-full w-full z-60">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add Members to Team
                </h3>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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

              {/* Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {filteredUsers && filteredUsers.length > 0 ? (
                <>
                  {/* Select All Controls */}
                  <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="selectAll"
                        checked={
                          selectedUserIds.length === filteredUsers.length
                        }
                        onChange={() => handleSelectAll(filteredUsers)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="selectAll"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Select All ({filteredUsers.length} users)
                      </label>
                    </div>
                    {selectedUserIds.length > 0 && (
                      <span className="text-sm text-blue-600 font-medium">
                        {selectedUserIds.length} selected
                      </span>
                    )}
                  </div>

                  {/* Users List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredUsers.map((user: User) => (
                      <div
                        key={user.id}
                        className="flex items-center p-2 hover:bg-gray-50 rounded border border-gray-200"
                      >
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => handleUserToggle(user.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {user.fullName}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex justify-between">
                    <button
                      onClick={resetModal}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSelectedMembers}
                      disabled={
                        selectedUserIds.length === 0 ||
                        addMembersMutation.isPending
                      }
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addMembersMutation.isPending
                        ? "Adding..."
                        : `Add Selected (${selectedUserIds.length})`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-center py-4">
                    {searchTerm
                      ? "No users found matching your search."
                      : "No available users to add."}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={resetModal}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
