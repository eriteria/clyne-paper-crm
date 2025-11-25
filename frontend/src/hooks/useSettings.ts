import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserSettings,
  updateStructuredSettings,
  updateCustomSettings,
  setCustomSettings,
  deleteCustomSettingKey,
  resetSettings,
} from "@/lib/settings-api";
import type {
  UpdateStructuredSettingsRequest,
  UpdateCustomSettingsRequest,
} from "@/types/settings";

const SETTINGS_QUERY_KEY = ["user-settings"];

/**
 * Hook to get user settings
 */
export function useUserSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getUserSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to update structured settings
 */
export function useUpdateStructuredSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpdateStructuredSettingsRequest) =>
      updateStructuredSettings(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
}

/**
 * Hook to update custom settings (merge)
 */
export function useUpdateCustomSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: UpdateCustomSettingsRequest) =>
      updateCustomSettings(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
}

/**
 * Hook to replace custom settings
 */
export function useSetCustomSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UpdateCustomSettingsRequest) =>
      setCustomSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete a custom setting key
 */
export function useDeleteCustomSettingKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => deleteCustomSettingKey(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
}

/**
 * Hook to reset settings to defaults
 */
export function useResetSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
}
