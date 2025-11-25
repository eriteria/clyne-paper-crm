import React from "react";
import { Palette, Monitor, Moon, Sun, Table2, SidebarIcon } from "lucide-react";
import SectionCard from "./SectionCard";
import ToggleSwitch from "./ToggleSwitch";
import type { CustomSettings, Theme, TableDensity } from "@/types/settings";

interface AppearanceSettingsProps {
  settings: CustomSettings;
  onUpdate: (updates: Partial<CustomSettings>) => void;
  isUpdating: boolean;
}

const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
  { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
  { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
];

const densities: { value: TableDensity; label: string; description: string }[] = [
  { value: "comfortable", label: "Comfortable", description: "More spacing, easier to read" },
  { value: "compact", label: "Compact", description: "Less spacing, more data visible" },
  { value: "standard", label: "Standard", description: "Balanced spacing" },
];

const pageSizes = [10, 20, 25, 50, 100];

export default function AppearanceSettings({
  settings,
  onUpdate,
  isUpdating,
}: AppearanceSettingsProps) {
  const currentTheme = settings.theme || "light";
  const currentDensity = settings.table?.density || "standard";
  const currentPageSize = settings.table?.defaultPageSize || 20;
  const sidebarCollapsed = settings.sidebarCollapsed || false;

  return (
    <SectionCard
      title="Appearance & UI"
      description="Customize the look and feel of your interface"
      icon={<Palette className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {/* Theme Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Palette className="h-4 w-4" />
            Color Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => onUpdate({ theme: theme.value })}
                disabled={isUpdating}
                className={`relative p-4 border-2 rounded-lg transition flex flex-col items-center gap-2 ${
                  currentTheme === theme.value
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`${currentTheme === theme.value ? "text-blue-600" : "text-gray-600"}`}>
                  {theme.icon}
                </div>
                <span className={`text-sm font-medium ${
                  currentTheme === theme.value ? "text-blue-900" : "text-gray-700"
                }`}>
                  {theme.label}
                </span>
                {currentTheme === theme.value && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {currentTheme === "system" 
              ? "Matches your device's system preference"
              : `${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)} mode is active`
            }
          </p>
        </div>

        {/* Sidebar Preference */}
        <div>
          <ToggleSwitch
            id="sidebarCollapsed"
            label="Collapse Sidebar by Default"
            description="Start with a minimized sidebar for more screen space"
            checked={sidebarCollapsed}
            onChange={(checked) =>
              onUpdate({ sidebarCollapsed: checked })
            }
            disabled={isUpdating}
            icon={<SidebarIcon className="h-5 w-5" />}
          />
        </div>

        {/* Table Density */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Table2 className="h-4 w-4" />
            Table Density
          </label>
          <div className="space-y-2">
            {densities.map((density) => (
              <label
                key={density.value}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                  currentDensity === density.value
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="density"
                  value={density.value}
                  checked={currentDensity === density.value}
                  onChange={(e) =>
                    onUpdate({
                      table: {
                        ...settings.table,
                        density: e.target.value as TableDensity,
                      },
                    })
                  }
                  disabled={isUpdating}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="ml-3 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {density.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {density.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Default Page Size */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Table2 className="h-4 w-4" />
            Default Table Page Size
          </label>
          <select
            value={currentPageSize}
            onChange={(e) =>
              onUpdate({
                table: {
                  ...(settings.table as object || {}),
                  defaultPageSize: Number(e.target.value),
                },
              })
            }
            disabled={isUpdating}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size} className="text-gray-900">
                {size} rows per page
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            How many items to show in tables and lists
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
