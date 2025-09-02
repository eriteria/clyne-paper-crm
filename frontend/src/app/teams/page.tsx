"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Crown,
  Building,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { Team } from "@/types";
import CreateTeamModal from "@/components/CreateTeamModal";
import EditTeamModal from "@/components/EditTeamModal";
import ViewTeamModal from "@/components/ViewTeamModal";

interface TeamsResponse {
  teams: Team[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function TeamsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const queryClient = useQueryClient();

  // Fetch teams
  const { data: teamsData, isLoading } = useQuery({
    queryKey: ["teams", currentPage, searchTerm, selectedRegion],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(selectedRegion && { region: selectedRegion }),
      });

      const response = await apiClient.get(`/teams?${params}`);
      return response.data.data as TeamsResponse;
    },
  });

  // Fetch regions for filter
  const { data: regionsData } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const response = await apiClient.get("/regions");
      return response.data;
    },
  });

  // Fetch unassigned users count
  const { data: unassignedUsersData } = useQuery({
    queryKey: ["unassigned-users"],
    queryFn: async () => {
      const response = await apiClient.get("/users?teamId=null&limit=1000");
      return response.data;
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const response = await apiClient.delete(`/teams/${teamId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const handleDeleteTeam = async (team: Team) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${team.name}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteTeamMutation.mutateAsync(team.id);
        alert("Team deleted successfully!");
      } catch (error: any) {
        alert(error.response?.data?.error || "Failed to delete team");
      }
    }
  };

  const handleViewTeam = (team: Team) => {
    setSelectedTeam(team);
    setShowViewModal(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setShowEditModal(true);
  };

  const teams = teamsData?.teams || [];
  const pagination = teamsData?.pagination;
  const regions = Array.isArray(regionsData?.data) ? regionsData.data : [];
  const unassignedCount = unassignedUsersData?.pagination?.total || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">
            Manage teams, assign members, and track performance
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Team
          </button>
          <button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["teams"] })
            }
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            title="Refresh teams list"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Database Status Summary */}
      {unassignedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-800">Teams Need Setup</h3>
              <p className="text-amber-700 text-sm mt-1">
                You have <strong>{unassignedCount} unassigned users</strong> that need to be added to teams.
                Most teams currently appear empty because users have not been assigned yet.
              </p>
              <div className="mt-2 flex gap-2">
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                  <UserX className="h-3 w-3 mr-1" />
                  {unassignedCount} unassigned users
                </span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  <Building className="h-3 w-3 mr-1" />
                  {teams.length} teams created
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search teams or leaders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="">All Regions</option>
            {regions.map((region: any) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Showing {pagination ? (pagination.page - 1) * pagination.limit + 1 : 1}-
            {pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : teams.length} of{" "}
            {pagination?.total || teams.length} teams
            {searchTerm || selectedRegion ? " (filtered)" : ""}
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading teams...</span>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No teams found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedRegion
              ? "No teams match your search criteria."
              : "Get started by creating your first team."}
          </p>
          {!searchTerm && !selectedRegion && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Create Team
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            const isEmpty = (team._count?.members || 0) === 0;
            return (
              <div
                key={team.id}
                className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
                  isEmpty ? 'border-l-4 border-l-amber-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-3 ${
                      isEmpty ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      <Users className={`h-6 w-6 ${
                        isEmpty ? 'text-amber-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {team.name}
                        </h3>
                        {isEmpty && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                            Needs Setup
                          </span>
                        )}
                      </div>
                      {team.region && (
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {team.region.name}
                        </span>
                      )}
                    </div>
                  </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewTeam(team)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEditTeam(team)}
                    className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                    title="Edit team"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete team"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {team.leader && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{team.leader.fullName}</span>
                  </div>
                )}
                {team.locationNames && team.locationNames.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{team.locationNames.slice(0, 2).join(", ")}</span>
                    {team.locationNames.length > 2 && (
                      <span className="text-gray-400">+{team.locationNames.length - 2} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{team._count?.members || 0} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    <span>{team._count?.customers || 0} customers</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} teams
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md">
              {pagination.page}
            </span>
            <button
              onClick={() => setCurrentPage(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTeamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ["teams"] });
          }}
        />
      )}

      {showEditModal && selectedTeam && (
        <EditTeamModal
          isOpen={showEditModal}
          team={selectedTeam}
          onClose={() => {
            setShowEditModal(false);
            setSelectedTeam(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedTeam(null);
            queryClient.invalidateQueries({ queryKey: ["teams"] });
          }}
        />
      )}

      {showViewModal && selectedTeam && (
        <ViewTeamModal
          isOpen={showViewModal}
          teamId={selectedTeam.id}
          onClose={() => {
            setShowViewModal(false);
            setSelectedTeam(null);
          }}
        />
      )}
    </div>
  );
}
