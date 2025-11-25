/**
 * Example User Settings Component
 * Demonstrates how to use the UserSettings system in your React components
 */

"use client";

import { useState } from "react";
import {
  useUserSettings,
  useUpdateStructuredSettings,
  useUpdateCustomSettings,
  useResetSettings,
} from "@/hooks/useSettings";
import { DashboardView, ChartType } from "@/types/settings";

export default function UserSettingsExample() {
  const { data: settings, isLoading } = useUserSettings();
  const updateStructured = useUpdateStructuredSettings();
  const updateCustom = useUpdateCustomSettings();
  const resetSettings = useResetSettings();

  const [theme, setTheme] = useState<string>("light");

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  if (!settings) {
    return <div>No settings found</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Settings</h1>

      {/* Structured Settings */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>
        
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) =>
                updateStructured.mutate({
                  emailNotifications: e.target.checked,
                })
              }
            />
            <span>Email Notifications</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={(e) =>
                updateStructured.mutate({
                  smsNotifications: e.target.checked,
                })
              }
            />
            <span>SMS Notifications</span>
          </label>
        </div>
      </section>

      {/* Dashboard Preferences */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Dashboard Preferences</h2>

        <div className="space-y-4">
          <div>
            <label className="block mb-2">Default Dashboard View</label>
            <select
              value={settings.defaultDashboardView || ""}
              onChange={(e) =>
                updateStructured.mutate({
                  defaultDashboardView: e.target.value || null,
                })
              }
              className="border rounded px-3 py-2"
            >
              <option value="">None</option>
              <option value={DashboardView.SALES}>Sales</option>
              <option value={DashboardView.CUSTOMERS}>Customers</option>
              <option value={DashboardView.INVENTORY}>Inventory</option>
              <option value={DashboardView.REPORTS}>Reports</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">Preferred Chart Type</label>
            <select
              value={settings.preferredChartType || ""}
              onChange={(e) =>
                updateStructured.mutate({
                  preferredChartType: e.target.value || null,
                })
              }
              className="border rounded px-3 py-2"
            >
              <option value="">None</option>
              <option value={ChartType.LINE}>Line</option>
              <option value={ChartType.BAR}>Bar</option>
              <option value={ChartType.AREA}>Area</option>
              <option value={ChartType.PIE}>Pie</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">Default Date Range (days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.defaultDateRange}
              onChange={(e) =>
                updateStructured.mutate({
                  defaultDateRange: parseInt(e.target.value),
                })
              }
              className="border rounded px-3 py-2"
            />
          </div>
        </div>
      </section>

      {/* Custom Settings (Theme Example) */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>

        <div>
          <label className="block mb-2">Theme</label>
          <select
            value={
              (settings.customSettings as { theme?: string })?.theme || "light"
            }
            onChange={(e) => {
              setTheme(e.target.value);
              updateCustom.mutate({ theme: e.target.value });
            }}
            className="border rounded px-3 py-2"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
      </section>

      {/* Feature Flags Example */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Beta Features</h2>

        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={
                (
                  settings.customSettings as {
                    features?: { betaReports?: boolean };
                  }
                )?.features?.betaReports || false
              }
              onChange={(e) =>
                updateCustom.mutate({
                  features: {
                    ...(
                      settings.customSettings as {
                        features?: Record<string, unknown>;
                      }
                    )?.features,
                    betaReports: e.target.checked,
                  },
                })
              }
            />
            <span>Enable Beta Reports</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={
                (
                  settings.customSettings as {
                    features?: { advancedFilters?: boolean };
                  }
                )?.features?.advancedFilters || false
              }
              onChange={(e) =>
                updateCustom.mutate({
                  features: {
                    ...(
                      settings.customSettings as {
                        features?: Record<string, unknown>;
                      }
                    )?.features,
                    advancedFilters: e.target.checked,
                  },
                })
              }
            />
            <span>Enable Advanced Filters</span>
          </label>
        </div>
      </section>

      {/* Actions */}
      <section>
        <button
          onClick={() => resetSettings.mutate()}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          disabled={resetSettings.isPending}
        >
          {resetSettings.isPending ? "Resetting..." : "Reset to Defaults"}
        </button>
      </section>

      {/* Current Settings (Debug) */}
      <section className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Current Settings (Debug)</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </section>
    </div>
  );
}
