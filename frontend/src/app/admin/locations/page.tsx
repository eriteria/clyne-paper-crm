"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Users,
  Save,
  X,
  Building,
} from "lucide-react";
import { apiClient } from "@/lib/api";

interface Location {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  _count?: {
    customers: number;
    teams: number;
  };
  teams?: Team[];
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  locationId: string;
  leader?: {
    id: string;
    fullName: string;
    email: string;
  };
  _count?: {
    members: number;
  };
  createdAt: string;
}

interface TeamFormData {
  name: string;
  description: string;
  leaderUserId?: string;
}

interface LocationFormData {
  name: string;
  description: string;
}

export default function LocationsPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: "",
    description: "",
  });

  const queryClient = useQueryClient();

  // Fetch locations
  const { data: locationsData, isLoading } = useQuery({
    queryKey: ["admin-locations"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/locations");
      return response.data;
    },
  });

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const response = await apiClient.post("/admin/locations", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      setIsCreating(false);
      setFormData({ name: "", description: "" });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: LocationFormData;
    }) => {
      const response = await apiClient.patch(`/admin/locations/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      setEditingLocation(null);
      setFormData({ name: "", description: "" });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/admin/locations/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    },
  });

  const locations: Location[] = locationsData?.data || [];

  const handleCreateLocation = () => {
    setIsCreating(true);
    setFormData({ name: "", description: "" });
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description || "",
    });
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setEditingLocation(null);
    setFormData({ name: "", description: "" });
  };

  const handleSaveLocation = () => {
    if (editingLocation) {
      updateLocationMutation.mutate({ id: editingLocation.id, data: formData });
    } else {
      createLocationMutation.mutate(formData);
    }
  };

  const handleDeleteLocation = (location: Location) => {
    const hasCustomers = location._count?.customers || 0;

    if (hasCustomers > 0) {
      alert(
        `Cannot delete "${location.name}" as it has ${hasCustomers} customers. Please reassign them first.`
      );
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete the location "${location.name}"?`
      )
    ) {
      deleteLocationMutation.mutate(location.id);
    }
  };

  // Team management state
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState<TeamFormData>({
    name: "",
    description: "",
  });
  const [selectedLocationForTeam, setSelectedLocationForTeam] = useState<
    string | null
  >(null);

  // Fetch teams
  const { data: teamsData } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/teams");
      return response.data;
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: TeamFormData & { locationId: string }) => {
      const response = await apiClient.post("/admin/teams", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      setIsCreatingTeam(false);
      setTeamFormData({ name: "", description: "" });
      setSelectedLocationForTeam(null);
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TeamFormData>;
    }) => {
      const response = await apiClient.patch(`/admin/teams/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      setEditingTeam(null);
      setTeamFormData({ name: "", description: "" });
    },
  });

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/admin/teams/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams"] });
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    },
  });

  const teams: Team[] = teamsData?.data || [];

  const handleCreateTeam = (locationId: string) => {
    setIsCreatingTeam(true);
    setSelectedLocationForTeam(locationId);
    const location = locations.find((l) => l.id === locationId);
    setTeamFormData({
      name: location?.name || "",
      description: `Team for ${location?.name}`,
    });
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamFormData({
      name: team.name,
      description: team.description || "",
    });
  };

  const handleCancelTeamEdit = () => {
    setIsCreatingTeam(false);
    setEditingTeam(null);
    setTeamFormData({ name: "", description: "" });
    setSelectedLocationForTeam(null);
  };

  const handleSaveTeam = () => {
    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data: teamFormData });
    } else if (selectedLocationForTeam) {
      createTeamMutation.mutate({
        ...teamFormData,
        locationId: selectedLocationForTeam,
      });
    }
  };

  const handleDeleteTeam = (team: Team) => {
    const hasMemberCount = team._count?.members || 0;

    if (hasMemberCount > 0) {
      alert(
        `Cannot delete "${team.name}" as it has ${hasMemberCount} members. Please reassign them first.`
      );
      return;
    }

    if (confirm(`Are you sure you want to delete the team "${team.name}"?`)) {
      deleteTeamMutation.mutate(team.id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Loading locations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Location Management
          </h2>
          <p className="text-gray-600">
            Manage business locations and customer assignments
          </p>
        </div>
        <button
          onClick={handleCreateLocation}
          disabled={isCreating || !!editingLocation}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Locations
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {locations.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Active Customers
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {locations.reduce(
                  (sum: number, location: Location) =>
                    sum + (location._count?.customers || 0),
                  0
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Building className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingLocation) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingLocation ? "Edit Location" : "Add New Location"}
            </h3>
            <button
              onClick={handleCancelEdit}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Location Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="e.g., Abuja Corporate Sales, Factory"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the name of the location
              </p>
            </div>

            {/* Location Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="e.g., Main corporate office in Abuja"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional description for the location
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSaveLocation}
                disabled={
                  !formData.name.trim() ||
                  createLocationMutation.isPending ||
                  updateLocationMutation.isPending
                }
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingLocation ? "Update Location" : "Add Location"}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Team Form */}
      {(isCreatingTeam || editingTeam) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {editingTeam ? "Edit Team" : "Add New Team"}
            </h3>
            <button
              onClick={handleCancelTeamEdit}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Team Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Team Name
              </label>
              <input
                type="text"
                value={teamFormData.name}
                onChange={(e) =>
                  setTeamFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="e.g., Abuja Corporate Sales Team"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the name of the team
              </p>
            </div>

            {/* Team Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={teamFormData.description}
                onChange={(e) =>
                  setTeamFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="e.g., Sales team for Abuja corporate office"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional description for the team
              </p>
            </div>

            {/* Selected Location Info */}
            {selectedLocationForTeam && (
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Location:</strong>{" "}
                  {
                    locations.find((l) => l.id === selectedLocationForTeam)
                      ?.name
                  }
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSaveTeam}
                disabled={
                  !teamFormData.name.trim() ||
                  createTeamMutation.isPending ||
                  updateTeamMutation.isPending
                }
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingTeam ? "Update Team" : "Add Team"}
              </button>
              <button
                onClick={handleCancelTeamEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regions List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Existing Locations
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locations.map((location) => {
                const locationTeams = teams.filter(
                  (team) => team.locationId === location.id
                );
                return (
                  <tr key={location.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {location.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {location.description || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {locationTeams.length > 0 ? (
                          <div className="flex flex-col space-y-1">
                            {locationTeams.map((team) => (
                              <div
                                key={team.id}
                                className="flex items-center justify-between"
                              >
                                <span className="text-sm text-gray-900 font-medium">
                                  {team.name}
                                </span>
                                <div className="flex items-center space-x-1 ml-2">
                                  <span className="text-xs text-gray-500">
                                    ({team._count?.members || 0} members)
                                  </span>
                                  <button
                                    onClick={() => handleEditTeam(team)}
                                    disabled={
                                      isCreating ||
                                      !!editingLocation ||
                                      isCreatingTeam ||
                                      !!editingTeam
                                    }
                                    className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTeam(team)}
                                    disabled={deleteTeamMutation.isPending}
                                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            No teams
                          </span>
                        )}
                        <button
                          onClick={() => handleCreateTeam(location.id)}
                          disabled={
                            isCreating ||
                            !!editingLocation ||
                            isCreatingTeam ||
                            !!editingTeam
                          }
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          title="Add team"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {location._count?.customers || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(location.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditLocation(location)}
                        disabled={isCreating || !!editingLocation}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location)}
                        disabled={deleteLocationMutation.isPending}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
