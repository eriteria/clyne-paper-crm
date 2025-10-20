# Updatable Notifications System

## Overview

Implemented a **single persistent notification** system that updates progress in real-time, preventing notification spam during long-running operations like Google Sheets imports.

## How It Works

### Backend Changes

1. **New Function: `updateNotification`** (`backend/src/routes/notifications.ts`)

   ```typescript
   export function updateNotification(
     notificationId: string,
     userId: string,
     type: "info" | "success" | "warning" | "error" | "progress",
     title: string,
     message: string,
     data?: any
   );
   ```

   - Uses the **same notification ID** to update existing notification
   - Adds `isUpdate: true` flag to indicate it's an update
   - Emits through existing EventEmitter system

2. **Import Script Updates** (`backend/src/scripts/import-from-google-sheets.ts`)

   - Creates **one notification ID** at start: `import-${Date.now()}-${random}`
   - Initial notification with `sendNotification()` (creates new)
   - Subsequent updates with `updateNotification()` (updates existing)
   - Progress tracking: 10% → 20% → 40% → 60% → 80% → 100%
   - Each phase updates same notification with new progress

3. **Admin Import Route** (`backend/src/routes/admin-import.ts`)
   - Imports both `sendNotification` and `updateNotification`
   - Sets both functions in import script via `setNotificationUpdater()`

### Frontend Changes

1. **Enhanced Hook** (`frontend/src/hooks/useNotificationCenter.tsx`)

   ```typescript
   const addNotification = useCallback(
     (notification: Notification & { isUpdate?: boolean }) => {
       if (notification.isUpdate) {
         // Find and replace existing notification by ID
         const existingIndex = prev.findIndex((n) => n.id === notification.id);
         if (existingIndex !== -1) {
           updated[existingIndex] = notification;
         }
       } else {
         // Add as new notification
         return [notification, ...prev];
       }
     }
   );
   ```

   - Checks for `isUpdate` flag
   - Replaces notification with matching ID
   - Only shows browser notification for **new** notifications (not updates)

2. **Progress Bar UI** (`frontend/src/components/NotificationBell.tsx`)
   - Shows **animated progress bar** for `progress` type notifications
   - Displays phase information: "Phase X of Y"
   - Shows percentage: "60%"
   - Smooth transitions with `transition-all duration-500`
   - On completion, shows formatted summary with emojis

## User Experience

### Before (Spam)

```
🔔 Import Progress - Starting product groups... (1)
🔔 Import Progress - Product groups done (2)
🔔 Import Progress - Starting products... (3)
🔔 Import Progress - Products done (4)
🔔 Import Progress - Starting customers... (5)
... 11 total notifications
Badge: 11 unread
```

### After (Clean)

```
🔔 Import in Progress - Starting product groups... [10%]
   ↓ (updates to)
🔔 Import in Progress - Products imported... [20%]
   ↓ (updates to)
🔔 Import in Progress - Customers imported... [40%]
   ↓ (updates to)
... continues updating same notification
   ↓ (final update)
✅ Import Complete! 🎉 [100%]
   📦 Product Groups: 15
   📦 Products: 142
   👥 Customers: 523 created
   📄 Invoices: 1,234
   💰 Payments: 890

Badge: 1 unread (stays at 1!)
```

## Implementation Pattern

### 1. Create Initial Notification

```typescript
const notificationId = `operation-${Date.now()}-${random()}`;

sendNotification(userId, "progress", "Operation in Progress", "Starting...", {
  id: notificationId,
  progress: 0,
});
```

### 2. Update During Progress

```typescript
updateNotification(
  notificationId, // Same ID!
  userId,
  "progress",
  "Operation in Progress",
  "Step 2 of 5 complete...",
  { progress: 40, step: 2, totalSteps: 5 }
);
```

### 3. Final Success/Error

```typescript
updateNotification(
  notificationId,  // Same ID!
  userId,
  "success",
  "Operation Complete! 🎉",
  "All steps finished successfully",
  { progress: 100, summary: {...} }
);
```

## Data Structure

### Progress Notification Data

```typescript
{
  progress: 60,          // 0-100 (for progress bar)
  phase: 3,             // Current phase number
  totalPhases: 5,       // Total phases
  step: "customers",    // Step identifier
  // ... phase-specific data
}
```

### Success Notification Data

```typescript
{
  progress: 100,
  summary: {
    productGroups: 15,
    products: 142,
    customers: { created: 523, updated: 12 },
    invoices: 1234,
    payments: 890
  }
}
```

## Benefits

1. **No Spam**: Badge count stays at 1 instead of growing to 11+
2. **Better UX**: Single notification updates smoothly
3. **Progress Tracking**: Visual progress bar shows completion
4. **Clean History**: Users see progression, not clutter
5. **Professional**: Matches AWS/Google Cloud console behavior

## Testing

1. Navigate to **Admin → Import**
2. Click **"Import from Google Sheets"**
3. Watch notification bell:
   - Badge shows **1** (not 11!)
   - Same notification updates with progress bar
   - Progress bar animates: 10% → 20% → 40% → 60% → 80% → 100%
   - Final state shows success with summary
4. Click bell to see detailed summary

## Future Enhancements

- [ ] Cancel button for in-progress operations
- [ ] Retry button for failed operations
- [ ] Detailed step-by-step logs in expandable section
- [ ] Time estimates for remaining steps
- [ ] Notification history persistence to database
