import React from "react";
import { LayoutDashboard, BarChart3, Calendar } from "lucide-react";
import SectionCard from "./SectionCard";
import type { UpdateStructuredSettingsRequest } from "@/types/settings";

interface DashboardSettingsProps {
  settings: UpdateStructuredSettingsRequest;
  onUpdate: (updates: UpdateStructuredSettingsRequest) => void;
  isUpdating: boolean;
}

const dashboardViews: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Default (Auto-select)" },
  { value: "sales", label: "Sales Overview" },
  { value: "inventory", label: "Inventory Dashboard" },
  { value: "financial", label: "Financial Summary" },
  { value: "analytics", label: "Analytics & Insights" },
];

const chartTypes: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Default" },
  { value: "bar", label: "Bar Charts" },
  { value: "line", label: "Line Charts" },
  { value: "pie", label: "Pie Charts" },
  { value: "area", label: "Area Charts" },
];

const dateRanges = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 90, label: "Last 90 days" },
];

export default function DashboardSettings({
  settings,
  onUpdate,
  isUpdating,
}: DashboardSettingsProps) {
  return (
    <SectionCard
      title="Dashboard & Reports"
      description="Customize your default dashboard view and reporting preferences"
      icon={<LayoutDashboard className="h-5 w-5" />}
    >
      <div className="space-y-6">
        {/* Default Dashboard View */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <LayoutDashboard className="h-4 w-4" />
            Default Dashboard View
          </label>
          <select
            value={settings.defaultDashboardView || ""}
            onChange={(e) =>
              onUpdate({ defaultDashboardView: e.target.value || null })
            }
            disabled={isUpdating}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {dashboardViews.map((view) => (
              <option
                key={view.value || "default"}
                value={view.value || ""}
                className="text-gray-900"
              >
                {view.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            This view will load by default when you access the dashboard
          </p>
        </div>

        {/* Preferred Chart Type */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <BarChart3 className="h-4 w-4" />
            Preferred Chart Type
          </label>
          <select
            value={settings.preferredChartType || ""}
            onChange={(e) =>
              onUpdate({ preferredChartType: e.target.value || null })
            }
            disabled={isUpdating}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {chartTypes.map((type) => (
              <option
                key={type.value || "default"}
                value={type.value || ""}
                className="text-gray-900"
              >
                {type.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Default chart style for reports and analytics
          </p>
        </div>

        {/* Default Date Range */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-4 w-4" />
            Default Date Range
          </label>
          <select
            value={settings.defaultDateRange}
            onChange={(e) =>
              onUpdate({ defaultDateRange: parseInt(e.target.value) })
            }
            disabled={isUpdating}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {dateRanges.map((range) => (
              <option
                key={range.value}
                value={range.value}
                className="text-gray-900"
              >
                {range.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Default time period for reports and analytics
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
