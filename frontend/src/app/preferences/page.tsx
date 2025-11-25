"use client";

import React, { useState } from "react";
import { 
  User, 
  Bell, 
  LayoutDashboard, 
  Palette, 
  Code, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  useUserSettings,
  useUpdateStructuredSettings,
  useUpdateCustomSettings,
  useResetSettings,
} from "@/hooks/useSettings";
import NotificationSettings from "@/components/preferences/NotificationSettings";
import DashboardSettings from "@/components/preferences/DashboardSettings";
import AppearanceSettings from "@/components/preferences/AppearanceSettings";
import CustomJsonSettings from "@/components/preferences/CustomJsonSettings";
import { deepMerge } from "@/utils/merge";
import type { 
  CustomSettings,
  UpdateStructuredSettingsRequest
} from "@/types/settings";

type TabId = "notifications" | "dashboard" | "appearance" | "advanced";

export default function PreferencesPage() {
  usePageTitle("User Preferences");

  const [activeTab, setActiveTab] = useState<TabId>("notifications");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fetch user settings
  const { data: settingsData, isLoading, error } = useUserSettings();

  // Mutations with optimistic updates
  const updateStructured = useUpdateStructuredSettings();
  const updateCustom = useUpdateCustomSettings();
  const resetSettings = useResetSettings();

  const tabs = [
    { id: "notifications" as TabId, name: "Notifications", icon: Bell },
    { id: "dashboard" as TabId, name: "Dashboard & Reports", icon: LayoutDashboard },
    { id: "appearance" as TabId, name: "Appearance & UI", icon: Palette },
    { id: "advanced" as TabId, name: "Advanced", icon: Code },
  ];

  // Handle structured settings update
  const handleStructuredUpdate = (updates: UpdateStructuredSettingsRequest) => {
    updateStructured.mutate(updates);
  };

  // Handle custom settings update (with deep merge)
  const handleCustomUpdate = (updates: Partial<CustomSettings>) => {
    const currentCustom = settingsData?.customSettings || {};
    const merged = deepMerge(currentCustom, updates);
    updateCustom.mutate(merged);
  };

  // Handle reset to defaults
  const handleReset = () => {
    resetSettings.mutate(undefined, {
      onSuccess: () => {
        setShowResetConfirm(false);
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Preferences</h3>
              <p className="text-red-700 mt-1">
                {error instanceof Error ? error.message : "Failed to load user preferences"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settingsData) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">No Preferences Found</h3>
              <p className="text-yellow-700 mt-1">
                Your user preferences couldn&apos;t be loaded. Please contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract settings from data
  const structured: UpdateStructuredSettingsRequest = {
    emailNotifications: settingsData.emailNotifications,
    smsNotifications: settingsData.smsNotifications,
    defaultDashboardView: settingsData.defaultDashboardView,
    preferredChartType: settingsData.preferredChartType,
    defaultDateRange: settingsData.defaultDateRange,
  };
  const custom = settingsData.customSettings || {};
  const isUpdating = updateStructured.isPending || updateCustom.isPending || resetSettings.isPending;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <User className="h-8 w-8 text-blue-600" />
              User Preferences
            </h1>
            <p className="text-gray-600 mt-1">
              Customize your personal CRM experience
            </p>
          </div>
          
          {/* Reset Button */}
          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={isUpdating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Success/Error Feedback */}
        {(updateStructured.isSuccess || updateCustom.isSuccess) && (
          <div className="mt-4 bg-green-50 border border-green-200 p-4 rounded-lg animate-fade-in">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Preferences updated successfully!</span>
            </div>
          </div>
        )}

        {(updateStructured.isError || updateCustom.isError) && (
          <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Failed to update preferences. Please try again.</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-6">
            <nav className="p-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-4xl">
          <div className="space-y-6">
            {activeTab === "notifications" && (
              <NotificationSettings
                settings={structured}
                onUpdate={handleStructuredUpdate}
                isUpdating={isUpdating}
              />
            )}

            {activeTab === "dashboard" && (
              <DashboardSettings
                settings={structured}
                onUpdate={handleStructuredUpdate}
                isUpdating={isUpdating}
              />
            )}

            {activeTab === "appearance" && (
              <AppearanceSettings
                settings={custom}
                onUpdate={handleCustomUpdate}
                isUpdating={isUpdating}
              />
            )}

            {activeTab === "advanced" && (
              <CustomJsonSettings
                settings={custom}
                onUpdate={handleCustomUpdate}
                isUpdating={isUpdating}
              />
            )}

            {/* Loading Overlay */}
            {isUpdating && (
              <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="font-medium">Saving preferences...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Reset to Default Preferences?
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  This will reset all your preferences to their default values. 
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
