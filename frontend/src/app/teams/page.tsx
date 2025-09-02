"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Crown,
  Building,
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
      return response.data as TeamsResponse;
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600">
            Manage teams, assign members, and track performance
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Team
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search teams or leaders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Region Filter */}
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">All Regions</option>
                {regions.map((region: any) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No teams found</h3>
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
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Team Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {team.name}
                  </h3>
                  {team.region && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Building className="h-4 w-4 mr-1" />
                      {team.region.name}
                    </div>
                  )}
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

              {/* Team Leader */}
              {team.leader && (
                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                  <span className="font-medium">{team.leader.fullName}</span>
                </div>
              )}

              {/* Team Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {(team as any)._count?.members || 0}
                  </div>
                  <div className="text-xs text-gray-500">Members</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {(team as any)._count?.customers || 0}
                  </div>
                  <div className="text-xs text-gray-500">Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {(team as any)._count?.invoices || 0}
                  </div>
                  <div className="text-xs text-gray-500">Invoices</div>
                </div>
              </div>

              {/* Location Coverage */}
              {team.locationNames && team.locationNames.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    Locations
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {team.locationNames.slice(0, 3).map((location, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {location}
                      </span>
                    ))}
                    {team.locationNames.length > 3 && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{team.locationNames.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
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
