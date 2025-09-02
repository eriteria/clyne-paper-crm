"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiClient } from "@/lib/api";
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
  locationNames: string[];
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
    locationNames: [],
  });
  const [locationInput, setLocationInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when team changes
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        regionId: team.regionId || team.region?.id || "",
        leaderUserId: team.leaderUserId || "",
        locationNames: team.locationNames || [],
      });
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

  // Fetch users for leader selection
  const { data: usersData } = useQuery({
    queryKey: ["users", "dropdown"],
    queryFn: async () => {
      const response = await apiClient.get("/users?dropdown=true");
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

  const addLocation = () => {
    const location = locationInput.trim();
    if (location && !formData.locationNames.includes(location)) {
      setFormData({
        ...formData,
        locationNames: [...formData.locationNames, location],
      });
      setLocationInput("");
    }
  };

  const removeLocation = (index: number) => {
    setFormData({
      ...formData,
      locationNames: formData.locationNames.filter((_, i) => i !== index),
    });
  };

  const handleLocationInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLocation();
    }
  };

  const regions = Array.isArray(regionsData?.data) ? regionsData.data : [];
  const users = Array.isArray(usersData?.data?.users) ? usersData.data.users : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
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
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.regionId
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Leader (Optional)
            </label>
            <select
              value={formData.leaderUserId}
              onChange={(e) =>
                setFormData({ ...formData, leaderUserId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a team leader</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.fullName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Location Names */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Coverage
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyPress={handleLocationInputKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter location name"
              />
              <button
                type="button"
                onClick={addLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            {formData.locationNames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.locationNames.map((location, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                  >
                    {location}
                    <button
                      type="button"
                      onClick={() => removeLocation(index)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
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
