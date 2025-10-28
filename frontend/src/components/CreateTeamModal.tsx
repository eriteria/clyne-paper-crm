"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api";

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateTeamData {
  name: string;
  regionId: string;
  leaderUserId?: string;
  locationIds: string[];
}

export default function CreateTeamModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTeamModalProps) {
  const [formData, setFormData] = useState<CreateTeamData>({
    name: "",
    regionId: "",
    leaderUserId: "",
    locationIds: [],
  });
  const [leaderSearchTerm, setLeaderSearchTerm] = useState("");
  const [showLeaderDropdown, setShowLeaderDropdown] = useState(false);
  const [selectedLeaderName, setSelectedLeaderName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const leaderDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        leaderDropdownRef.current &&
        !leaderDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLeaderDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamData) => {
      const payload = {
        ...data,
        leaderUserId: data.leaderUserId || undefined,
      };
      const response = await apiClient.post("/teams", payload);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
      resetForm();
    },
    onError: (error: any) => {
      if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error });
      } else {
        setErrors({ general: "Failed to create team. Please try again." });
      }
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      regionId: "",
      leaderUserId: "",
      locationIds: [],
    });
    setErrors({});
  };

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

    await createTeamMutation.mutateAsync(formData);
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

  const regions = Array.isArray(regionsData?.data) ? regionsData.data : [];
  const locations = Array.isArray(locationsData?.data)
    ? locationsData.data
    : [];
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

  // Handle clearing leader selection
  const handleClearLeader = () => {
    setFormData({ ...formData, leaderUserId: "" });
    setSelectedLeaderName("");
    setLeaderSearchTerm("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] md:max-w-md max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Team
          </h2>
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

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              disabled={createTeamMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTeamMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTeamMutation.isPending ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
