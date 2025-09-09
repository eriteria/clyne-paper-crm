"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api";

interface EditTeamData {
  name: string;
  regionId: string;
  leaderUserId: string;
  locationIds: string[];
}
import { Team } from "@/types";

interface EditTeamModalProps {
  isOpen: boolean;
  team: Team;
  onClose: () => void;
  onSuccess: () => void;
}

interface UpdateTeamData {
  name: string;
  regionId: string;
  leaderUserId?: string;
  locationIds: string[];
}

export default function EditTeamModal({
  isOpen,
  team,
  onClose,
  onSuccess,
}: EditTeamModalProps) {
  const [formData, setFormData] = useState<UpdateTeamData>({
    name: "",
    regionId: "",
    leaderUserId: "",
    locationIds: [],
  });
  const [leaderSearchTerm, setLeaderSearchTerm] = useState("");
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
  const [selectedLeaderName, setSelectedLeaderName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const leaderDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        leaderDropdownRef.current &&
        !leaderDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLeaderDropdown(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initialize form data when team changes
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        regionId: team.regionId || "",
        leaderUserId: team.leaderUserId || "",
        locationIds: team.locations
          ? team.locations.map((loc) => loc.location.id)
          : [],
      });

      // Set leader name for search field
      if (team.leader) {
        setSelectedLeaderName(team.leader.fullName);
        setLeaderSearchTerm(team.leader.fullName);
      } else {
        setSelectedLeaderName("");
        setLeaderSearchTerm("");
      }
    }
  }, [team]);

  // Fetch regions
  const { data: regionsData } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const response = await apiClient.get("/regions");
      return response.data;
    },
  });

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const response = await apiClient.get("/locations");
      return response.data;
    },
  });

  // Fetch users for leader selection
  const { data: usersData } = useQuery({
    queryKey: ["users", "dropdown"],
    queryFn: async () => {
      const response = await apiClient.get("/users?limit=1000&isActive=true");
      return response.data;
    },
  });

  // Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async (data: UpdateTeamData) => {
      const payload = {
        ...data,
        leaderUserId: data.leaderUserId || undefined,
      };
      const response = await apiClient.put(`/teams/${team.id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
      setErrors({});
    },
    onError: (error: any) => {
      if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error });
      } else {
        setErrors({ general: "Failed to update team. Please try again." });
      }
    },
  });

  // Add team members mutation
  const addMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await apiClient.post(`/teams/${team.id}/members`, {
        userIds,
      });
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Add members error:", error);
      setErrors({ general: "Failed to add team members" });
    },
  });

  // Remove team members mutation
  const removeMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await apiClient.delete(`/teams/${team.id}/members`, {
        data: { userIds },
      });
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Remove members error:", error);
      setErrors({ general: "Failed to remove team members" });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Team name is required";
    }

    if (!formData.regionId) {
      newErrors.regionId = "Region is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    await updateTeamMutation.mutateAsync(formData);
  };

  const addLocation = (locationId: string) => {
    if (locationId && !formData.locationIds.includes(locationId)) {
      setFormData({
        ...formData,
        locationIds: [...formData.locationIds, locationId],
      });
    }
  };

  const removeLocation = (index: number) => {
    setFormData({
      ...formData,
      locationIds: formData.locationIds.filter((_, i) => i !== index),
    });
  };

  const locations = Array.isArray(locationsData?.data)
    ? locationsData.data
    : [];
  const regions = Array.isArray(regionsData?.data) ? regionsData.data : [];
  const users = Array.isArray(usersData?.data?.users)
    ? usersData.data.users
    : [];

  // Debug: Log number of users loaded
  console.log(`Loaded ${users.length} users for team leader selection`);

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user: any) =>
      user.fullName.toLowerCase().includes(leaderSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(leaderSearchTerm.toLowerCase()) ||
      (user.phone &&
        user.phone.toLowerCase().includes(leaderSearchTerm.toLowerCase())) ||
      (user.role &&
        user.role.name &&
        user.role.name.toLowerCase().includes(leaderSearchTerm.toLowerCase()))
  );

  // Handle leader selection
  const handleLeaderSelect = (user: any) => {
    setFormData({ ...formData, leaderUserId: user.id });
    setSelectedLeaderName(user.fullName);
    setLeaderSearchTerm(user.fullName);
    setShowLeaderDropdown(false);
  };

  const handleAddMember = (userId: string) => {
    addMembersMutation.mutate([userId]);
    setUserSearchTerm("");
    setShowUserDropdown(false);
  };

  const handleRemoveMember = (userId: string) => {
    removeMembersMutation.mutate([userId]);
  };

  const handleUserSearch = (searchTerm: string) => {
    setUserSearchTerm(searchTerm);
    setShowUserDropdown(searchTerm.length > 0);
  };

  // Handle clearing leader selection
  const handleClearLeader = () => {
    setFormData({ ...formData, leaderUserId: "" });
    setSelectedLeaderName("");
    setLeaderSearchTerm("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Team</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 ${
                errors.name ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
              placeholder="Enter team name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region *
            </label>
            <select
              value={formData.regionId}
              onChange={(e) =>
                setFormData({ ...formData, regionId: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                errors.regionId ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
            >
              <option value="">Select a region</option>
              {regions.map((region: any) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            {errors.regionId && (
              <p className="mt-1 text-sm text-red-600">{errors.regionId}</p>
            )}
          </div>

          {/* Team Leader */}
          <div className="relative" ref={leaderDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Leader (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={leaderSearchTerm}
                onChange={(e) => {
                  setLeaderSearchTerm(e.target.value);
                  setShowLeaderDropdown(true);
                }}
                onFocus={() => setShowLeaderDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                placeholder="Search for a team leader..."
              />
              {formData.leaderUserId && selectedLeaderName && (
                <button
                  type="button"
                  onClick={handleClearLeader}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Dropdown */}
              {showLeaderDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user: any) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleLeaderSelect(user)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        <div className="font-medium text-gray-900">
                          {user.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                        {user.role && (
                          <div className="text-xs text-gray-400">
                            {user.role.name}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      No users found matching &quot;{leaderSearchTerm}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Location Coverage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Coverage
            </label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addLocation(e.target.value);
                  e.target.value = "";
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">Select a location to add</option>
              {locations
                .filter(
                  (location: any) => !formData.locationIds.includes(location.id)
                )
                .map((location: any) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
            </select>
            {formData.locationIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.locationIds.map((locationId, index) => {
                  const location = locations.find(
                    (loc: any) => loc.id === locationId
                  );
                  return (
                    <span
                      key={locationId}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                    >
                      {location?.name || locationId}
                      <button
                        type="button"
                        onClick={() => removeLocation(index)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team Members Management */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Team Members
            </label>

            {/* Current Members */}
            {team.members && team.members.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Current Members:</div>
                <div className="space-y-1">
                  {team.members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {member.fullName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.email} • {member.role?.name}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        disabled={removeMembersMutation.isPending}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Members */}
            <div className="relative" ref={userDropdownRef}>
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search users to add to team..."
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {showUserDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {users
                    .filter(
                      (user: any) =>
                        !team.members?.some(
                          (member: any) => member.id === user.id
                        ) &&
                        (user.fullName
                          .toLowerCase()
                          .includes(userSearchTerm.toLowerCase()) ||
                          user.email
                            .toLowerCase()
                            .includes(userSearchTerm.toLowerCase()))
                    )
                    .map((user: any) => (
                      <div
                        key={user.id}
                        onClick={() => handleAddMember(user.id)}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-sm">
                          {user.fullName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.email} • {user.role?.name}
                        </div>
                      </div>
                    ))}
                  {users.filter(
                    (user: any) =>
                      !team.members?.some(
                        (member: any) => member.id === user.id
                      ) &&
                      (user.fullName
                        .toLowerCase()
                        .includes(userSearchTerm.toLowerCase()) ||
                        user.email
                          .toLowerCase()
                          .includes(userSearchTerm.toLowerCase()))
                  ).length === 0 && (
                    <div className="p-2 text-gray-500 text-sm">
                      No available users found
                    </div>
                  )}
                </div>
              )}
            </div>

            {addMembersMutation.isPending && (
              <div className="text-sm text-blue-600">Adding member...</div>
            )}
            {removeMembersMutation.isPending && (
              <div className="text-sm text-blue-600">Removing member...</div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={updateTeamMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTeamMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateTeamMutation.isPending ? "Updating..." : "Update Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
