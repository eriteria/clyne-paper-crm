import { apiClient } from "./api";
import type {
  UserSettings,
  UpdateStructuredSettingsRequest,
  UpdateCustomSettingsRequest,
} from "@/types/settings";

/**
 * Get current user's settings
 */
export async function getUserSettings(): Promise<UserSettings> {
  const response = await apiClient.get("/user-settings");
  return response.data.data;
}

/**
 * Update structured settings (partial update)
 */
export async function updateStructuredSettings(
  updates: UpdateStructuredSettingsRequest
): Promise<UserSettings> {
  const response = await apiClient.patch("/user-settings/structured", updates);
  return response.data.data;
}

/**
 * Update custom settings (deep merge)
 */
export async function updateCustomSettings(
  updates: UpdateCustomSettingsRequest
): Promise<UserSettings> {
  const response = await apiClient.patch("/user-settings/custom", updates);
  return response.data.data;
}

/**
 * Replace entire custom settings
 */
export async function setCustomSettings(
  settings: UpdateCustomSettingsRequest
): Promise<UserSettings> {
  const response = await apiClient.put("/user-settings/custom", settings);
  return response.data.data;
}

/**
 * Delete a custom setting key
 */
export async function deleteCustomSettingKey(
  key: string
): Promise<UserSettings> {
  const response = await apiClient.delete(`/user-settings/custom/${key}`);
  return response.data.data;
}

/**
 * Reset all settings to defaults
 */
export async function resetSettings(): Promise<UserSettings> {
  const response = await apiClient.post("/user-settings/reset");
  return response.data.data;
}
