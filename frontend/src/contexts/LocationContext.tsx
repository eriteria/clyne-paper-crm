"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface LocationContextType {
  selectedLocationId: string | null;
  setSelectedLocationId: (locationId: string | null) => void;
  availableLocations: Array<{ id: string; name: string }>;
  canAccessMultipleLocations: boolean;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  // Safely get user - it might not be available yet during SSR or initial load
  let user;
  try {
    const auth = useAuth();
    user = auth?.user;
  } catch (error) {
    // If useAuth throws because AuthProvider isn't ready, just continue with undefined user
    user = undefined;
  }
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [availableLocations, setAvailableLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAvailableLocations([]);
      setSelectedLocationId(null);
      setIsLoading(false);
      return;
    }

    // Collect all locations the user has access to
    const locations: Array<{ id: string; name: string }> = [];

    // Check if user has wildcard permission (Super Admin)
    const hasWildcard = user.permissions?.includes("*");
    const hasViewAll = user.permissions?.includes("inventory:view_all_locations");
    const hasManageAll = user.permissions?.includes("inventory:manage_all_locations");

    if (hasWildcard || hasViewAll || hasManageAll) {
      // Super Admin - would need to fetch all locations from API
      // For now, set a flag that they can access all
      setAvailableLocations([]);
      setSelectedLocationId(null);
      setIsLoading(false);
      return;
    }

    // Add primary location
    if (user.primaryLocation) {
      locations.push({
        id: user.primaryLocation.id,
        name: user.primaryLocation.name,
      });
    }

    // Add assigned locations
    if (user.assignedLocations && user.assignedLocations.length > 0) {
      user.assignedLocations.forEach((assignment) => {
        // Avoid duplicates
        if (!locations.find((loc) => loc.id === assignment.location.id)) {
          locations.push({
            id: assignment.location.id,
            name: assignment.location.name,
          });
        }
      });
    }

    setAvailableLocations(locations);

    // Auto-select primary location or first available location
    if (!selectedLocationId && locations.length > 0) {
      const defaultLocation = user.primaryLocationId
        ? locations.find((loc) => loc.id === user.primaryLocationId)
        : locations[0];

      if (defaultLocation) {
        setSelectedLocationId(defaultLocation.id);
      }
    }

    setIsLoading(false);
  }, [user, selectedLocationId]);

  const canAccessMultipleLocations = availableLocations.length > 1 ||
    user?.permissions?.includes("*") ||
    user?.permissions?.includes("inventory:view_all_locations") ||
    user?.permissions?.includes("inventory:manage_all_locations") ||
    false;

  return (
    <LocationContext.Provider
      value={{
        selectedLocationId,
        setSelectedLocationId,
        availableLocations,
        canAccessMultipleLocations,
        isLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    // Return safe defaults instead of throwing - this handles SSR and initial render
    return {
      selectedLocationId: null,
      setSelectedLocationId: () => {},
      availableLocations: [],
      canAccessMultipleLocations: false,
      isLoading: true,
    };
  }
  return context;
}
