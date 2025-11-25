/**
 * User Settings Types
 * For managing user preferences and customizations
 */

export interface UserSettings {
  id: string;
  userId: string;

  // Structured settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  defaultDashboardView: string | null;
  preferredChartType: string | null;
  defaultDateRange: number;

  // Flexible custom settings
  customSettings: CustomSettings | null;

  createdAt: string;
  updatedAt: string;
}

export interface CustomSettings {
  theme?: Theme;
  sidebarCollapsed?: boolean;
  table?: {
    density?: TableDensity;
    defaultPageSize?: number;
  };
  [key: string]: unknown;
}

export interface UpdateStructuredSettingsRequest {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  defaultDashboardView?: string | null;
  preferredChartType?: string | null;
  defaultDateRange?: number;
}

export interface UpdateCustomSettingsRequest {
  [key: string]: unknown;
}

// Themes
export type Theme = "light" | "dark" | "system";

// Table density
export type TableDensity = "comfortable" | "compact" | "standard";

// Common dashboard views
export enum DashboardView {
  SALES = "sales",
  CUSTOMERS = "customers",
  INVENTORY = "inventory",
  REPORTS = "reports",
}

// Common chart types
export enum ChartType {
  LINE = "line",
  BAR = "bar",
  AREA = "area",
  PIE = "pie",
}
