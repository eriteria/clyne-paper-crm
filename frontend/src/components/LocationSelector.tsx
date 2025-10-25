"use client";

import { useLocation } from "@/contexts/LocationContext";

export default function LocationSelector() {
  const { selectedLocationId, setSelectedLocationId, availableLocations, canAccessMultipleLocations, isLoading } =
    useLocation();

  // Don't show selector if user only has access to one location
  if (!canAccessMultipleLocations || isLoading) {
    return null;
  }

  // If no locations available yet, don't render
  if (availableLocations.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
      <label htmlFor="location-selector" className="text-sm font-semibold text-gray-900">
        Location:
      </label>
      <select
        id="location-selector"
        value={selectedLocationId || ""}
        onChange={(e) => setSelectedLocationId(e.target.value || null)}
        className="block rounded-md border-gray-400 shadow-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 sm:text-sm bg-white text-gray-900 px-3 py-2 min-w-[200px] font-medium"
        style={{
          // Ensure high contrast
          backgroundColor: "#ffffff",
          color: "#111827",
          borderWidth: "1.5px",
          borderColor: "#9ca3af",
        }}
      >
        <option value="" className="text-gray-900 bg-white">
          All Locations
        </option>
        {availableLocations.map((location) => (
          <option key={location.id} value={location.id} className="text-gray-900 bg-white">
            {location.name}
          </option>
        ))}
      </select>
    </div>
  );
}
