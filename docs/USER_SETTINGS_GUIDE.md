# User Settings System

## Overview

The UserSettings system provides a flexible, hybrid approach to storing user preferences and customizations in the Clyne Paper CRM.

## Architecture

### Hybrid Model Design

The system uses **both structured columns and JSON** for maximum flexibility:

- **Structured Columns**: For stable, critical, frequently-used settings
- **JSON Column (`customSettings`)**: For experimental features, UI flags, and dynamic preferences

```prisma
model UserSettings {
  id                   String   @id @default(cuid())
  userId               String   @unique @map("user_id")

  // Structured settings (stable)
  emailNotifications   Boolean  @default(true)
  smsNotifications     Boolean  @default(false)
  defaultDashboardView String?
  preferredChartType   String?
  defaultDateRange     Int      @default(30)

  // Flexible JSON settings
  customSettings       Json?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Backend API

### Service Layer (`src/services/settings.service.ts`)

#### Functions:

- `getUserSettings(userId)` - Get settings (auto-creates if missing)
- `createDefaultSettings(userId)` - Create default settings for new user
- `updateStructuredSettings(userId, updates)` - Partial update of structured fields
- `updateCustomSettings(userId, updates)` - Deep merge into customSettings JSON
- `setCustomSettings(userId, settings)` - Replace entire customSettings JSON
- `deleteCustomSettingKey(userId, key)` - Remove specific custom setting
- `resetToDefaults(userId)` - Reset all settings to defaults

### API Routes (`src/routes/user-settings.ts`)

All routes require authentication.

#### `GET /api/user-settings`

Get current user's settings.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "userId": "...",
    "emailNotifications": true,
    "smsNotifications": false,
    "defaultDashboardView": "sales",
    "preferredChartType": "line",
    "defaultDateRange": 30,
    "customSettings": {
      "theme": "light",
      "sidebarCollapsed": false
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### `PATCH /api/user-settings/structured`

Partial update of structured settings.

**Request:**

```json
{
  "emailNotifications": false,
  "defaultDateRange": 60
}
```

**Validation:**

- At least one field required
- `defaultDateRange`: 1-365 days
- `emailNotifications`, `smsNotifications`: boolean
- `defaultDashboardView`, `preferredChartType`: string or null

#### `PATCH /api/user-settings/custom`

Deep merge into customSettings (preserves existing keys).

**Request:**

```json
{
  "theme": "dark",
  "notifications": {
    "desktop": true
  }
}
```

If existing customSettings was:

```json
{
  "sidebarCollapsed": false,
  "notifications": {
    "sound": true
  }
}
```

Result after merge:

```json
{
  "sidebarCollapsed": false,
  "theme": "dark",
  "notifications": {
    "sound": true,
    "desktop": true
  }
}
```

#### `PUT /api/user-settings/custom`

Replace entire customSettings (overwrites everything).

**Request:**

```json
{
  "theme": "dark"
}
```

#### `DELETE /api/user-settings/custom/:key`

Delete a specific custom setting key.

**Example:** `DELETE /api/user-settings/custom/theme`

#### `POST /api/user-settings/reset`

Reset all settings to defaults.

## Frontend Integration

### Types (`frontend/src/types/settings.ts`)

```typescript
interface UserSettings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  defaultDashboardView: string | null;
  preferredChartType: string | null;
  defaultDateRange: number;
  customSettings: CustomSettings | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomSettings {
  [key: string]: unknown;
}

enum DashboardView {
  SALES = "sales",
  CUSTOMERS = "customers",
  INVENTORY = "inventory",
  REPORTS = "reports",
}

enum ChartType {
  LINE = "line",
  BAR = "bar",
  AREA = "area",
  PIE = "pie",
}
```

### API Client (`frontend/src/lib/settings-api.ts`)

```typescript
import {
  getUserSettings,
  updateStructuredSettings,
  updateCustomSettings,
} from "@/lib/settings-api";

// Get settings
const settings = await getUserSettings();

// Update structured settings
await updateStructuredSettings({
  emailNotifications: false,
  defaultDateRange: 60,
});

// Merge custom settings
await updateCustomSettings({
  theme: "dark",
});
```

### React Hooks (`frontend/src/hooks/useSettings.ts`)

```typescript
import {
  useUserSettings,
  useUpdateStructuredSettings,
  useUpdateCustomSettings,
} from "@/hooks/useSettings";

function SettingsComponent() {
  const { data: settings, isLoading } = useUserSettings();
  const updateStructured = useUpdateStructuredSettings();
  const updateCustom = useUpdateCustomSettings();

  const handleToggleNotifications = () => {
    updateStructured.mutate({
      emailNotifications: !settings?.emailNotifications,
    });
  };

  const handleChangeTheme = (theme: string) => {
    updateCustom.mutate({ theme });
  };

  return <div>{/* Your UI */}</div>;
}
```

## Auto-Initialization

Default settings are automatically created when:

1. A new user is created (`POST /api/users`)
2. A user's settings are accessed for the first time (`GET /api/user-settings`)

**Defaults:**

```typescript
{
  emailNotifications: true,
  smsNotifications: false,
  defaultDateRange: 30,
  customSettings: null
}
```

## Usage Examples

### Example 1: Dashboard Preferences

```typescript
// Store user's preferred dashboard view
await updateStructuredSettings({
  defaultDashboardView: "sales",
});

// Store chart preferences in custom settings
await updateCustomSettings({
  dashboard: {
    chartType: "area",
    showLegend: true,
    colorScheme: "blue",
  },
});
```

### Example 2: Feature Flags per User

```typescript
// Enable beta features for specific users
await updateCustomSettings({
  features: {
    betaReports: true,
    advancedFilters: false,
  },
});
```

### Example 3: UI State Persistence

```typescript
// Persist UI state
await updateCustomSettings({
  ui: {
    sidebarCollapsed: true,
    tablePageSize: 25,
    favoriteReports: ["sales", "customers"],
  },
});
```

## Best Practices

### When to Use Structured Columns

✅ **Use structured columns for:**

- Settings that affect core functionality
- Settings queried frequently
- Settings that need database-level validation
- Settings that need indexing

### When to Use JSON customSettings

✅ **Use JSON for:**

- Experimental features
- UI state (collapsed panels, sort preferences)
- Feature flags
- User-specific configurations
- Settings that vary widely between users
- Nested/complex settings structures

### Migration Path

If a custom setting becomes stable:

1. Add a new structured column
2. Migrate data from JSON to column
3. Update code to use structured field
4. Remove from JSON in a cleanup migration

## Security Considerations

- ✅ Settings are user-scoped (authenticated endpoint)
- ✅ Users can only access their own settings
- ✅ Validation on all structured fields
- ✅ Cascade delete on user removal
- ⚠️ customSettings JSON is flexible - validate in application logic

## Performance

- Settings are cached on frontend (5-minute stale time)
- PostgreSQL JSON columns are efficient
- Use JSONB for better query performance if needed
- Consider indexing specific JSON keys if frequently queried

## Future Enhancements

Potential additions:

- Settings versioning/history
- Settings export/import
- Admin-managed default settings templates
- Settings groups (privacy, notifications, display)
- Settings sync across devices
