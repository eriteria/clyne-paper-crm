# Notification System SSE Connection Fix

## Issue

The notification bell was not showing import progress in real-time. The import process was printing to the terminal but not appearing in the UI.

## Root Cause

The SSE (Server-Sent Events) connection URL was incorrectly constructed, causing a **double `/api`** path issue:

```typescript
// .env.local has:
NEXT_PUBLIC_API_URL=http://localhost:5000/api

// useNotificationCenter was creating:
`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/stream`

// Result: http://localhost:5000/api/api/notifications/stream ❌
// Correct: http://localhost:5000/api/notifications/stream ✅
```

## Solution

Updated `frontend/src/hooks/useNotificationCenter.tsx` to properly handle the base URL:

```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
// Remove trailing /api if present since we'll add the full path
const baseUrl = apiUrl.replace(/\/api\/?$/, "");
const urlWithAuth = `${baseUrl}/api/notifications/stream?token=${token}`;
```

## How It Works

### Backend (Already Set Up ✅)

1. **SSE Endpoint** (`backend/src/routes/notifications.ts`):

   - Route: `GET /api/notifications/stream`
   - Authentication: JWT token in query param
   - Uses EventEmitter to broadcast notifications to connected clients

2. **Import Script** (`backend/src/scripts/import-from-google-sheets.ts`):

   - Sends progress notifications for each import phase:
     - Phase 1: Product Groups & Products
     - Phase 2: Customers
     - Phase 3: Invoices
     - Phase 4: Payments
   - Sends success/error notifications on completion

3. **Admin Import Route** (`backend/src/routes/admin-import.ts`):
   - Triggers import with user ID
   - Sets up notification sender
   - Sends initial "Import Started" notification

### Frontend (Now Fixed ✅)

1. **NotificationProvider** (`useNotificationCenter.tsx`):

   - Connects to SSE endpoint via EventSource
   - Listens for notifications
   - Updates state with new notifications
   - Shows browser notifications (if permitted)

2. **NotificationBell** (`NotificationBell.tsx`):

   - Displays bell icon with badge count
   - Shows green dot when connected
   - Dropdown with notification list
   - Mark as read / clear functionality

3. **Dashboard Layout** (`dashboard/layout.tsx`):
   - Includes NotificationBell in header
   - Shows user name and role

## Testing the Fix

### 1. Start Development Servers

```bash
# From project root
npm run dev
```

### 2. Check Browser Console

Login to the dashboard and check the console for:

```
🔌 Connecting to notification stream: http://localhost:5000/api/notifications/stream?token=***
📡 Notification stream connected
```

### 3. Verify Green Dot

Look at the bell icon in the top right corner. You should see a **green dot** indicating the SSE connection is active.

### 4. Trigger Import

1. Navigate to **Admin → Import**
2. Click **"Import from Google Sheets"**
3. Watch the bell icon badge count increase
4. Click the bell to see notifications appearing in real-time:
   - "Import Started"
   - "Starting product groups import..."
   - "Product groups imported: X created"
   - "Starting products import..."
   - "Products imported: X created"
   - "Starting customer import..."
   - "Customers imported: X created, Y updated"
   - "Starting invoice import..."
   - "Invoices imported: X created"
   - "Starting payment import..."
   - "Payments imported: X created"
   - "Import Complete! 🎉"

## Notification Types

The system supports these notification types:

### During Import

- **progress** (spinning icon) - Import is in progress

  ```json
  {
    "type": "progress",
    "title": "Import Progress",
    "message": "Starting customer import...",
    "data": { "phase": 2, "step": "customers" }
  }
  ```

- **success** (green checkmark) - Import completed successfully

  ```json
  {
    "type": "success",
    "title": "Import Complete! 🎉",
    "message": "Successfully imported: ...",
    "data": { "summary": { ... } }
  }
  ```

- **error** (red alert) - Import failed
  ```json
  {
    "type": "error",
    "title": "Import Failed",
    "message": "Error message here",
    "data": { "error": "stack trace" }
  }
  ```

### Other Notification Types

- **info** (blue i) - General information
- **warning** (yellow triangle) - Warning messages

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  NotificationProvider (useNotificationCenter)    │  │
│  │  - EventSource connection to SSE endpoint        │  │
│  │  - Manages notification state                    │  │
│  │  - Emits browser notifications                   │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│                          ▼                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  NotificationBell Component                      │  │
│  │  - Shows badge count                             │  │
│  │  - Green dot (connection status)                 │  │
│  │  - Dropdown with notifications                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          │ EventSource
                          │ GET /api/notifications/stream?token=xxx
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Express)                     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  SSE Endpoint (/notifications/stream)           │  │
│  │  - Authenticates via JWT token                  │  │
│  │  - Keeps connection alive                        │  │
│  │  - Listens to EventEmitter                       │  │
│  └──────────────────────────────────────────────────┘  │
│                          ▲                              │
│                          │                              │
│                    EventEmitter                         │
│                          │                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  sendNotification() helper                       │  │
│  │  - Creates notification object                   │  │
│  │  - Emits to EventEmitter                         │  │
│  │  - Broadcasts to connected clients               │  │
│  └──────────────────────────────────────────────────┘  │
│                          ▲                              │
│                          │                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Import Script (import-from-google-sheets.ts)   │  │
│  │  - Calls sendNotification() during import       │  │
│  │  - Sends progress for each phase                │  │
│  │  - Sends success/error on completion            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Debug Logging

The fix includes console logging to help with debugging:

**Frontend Console:**

```
🔌 Connecting to notification stream: http://localhost:5000/api/notifications/stream?token=***
📡 Notification stream connected
📬 Received notification: progress Import Progress
📬 Received notification: success Import Complete! 🎉
```

**Backend Console:**

```
🚀 Starting Google Sheets import...

📦 Phase 1: Product Setup
  ✅ Product Groups: 5 created

👥 Phase 2: Customer Import
  ✅ Customers: 150 created, 10 updated

📄 Phase 3: Invoice Import
  ✅ Invoices: 500 created

💰 Phase 4: Payment Import
  ✅ Payments: 300 created

🎉 Full import completed!
```

## Troubleshooting

### Green Dot Not Showing

**Check:**

1. Backend server is running on port 5000
2. Frontend can reach `http://localhost:5000/api/notifications/stream`
3. JWT token is valid (check localStorage)
4. Browser console shows connection message

**Solution:**

- Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:5000/api`
- Verify backend route is registered in `server.ts`
- Clear browser cache and reload

### Notifications Not Appearing

**Check:**

1. Green dot is showing (SSE connected)
2. Import is triggered with correct user ID
3. Backend console shows progress logs
4. Browser console shows "Received notification" logs

**Solution:**

- Verify `sendNotification()` is being called in import script
- Check `notificationSender` is set via `setNotificationSender()`
- Ensure `userId` is passed to `runFullImport()`

### Double `/api` in URL

**Symptom:** 404 error when connecting to SSE endpoint

**Solution:** Already fixed! The URL construction now handles this correctly.

## Next Steps

### Extend Notification System

You can use the same pattern to add notifications for other operations:

```typescript
import { sendNotification } from "./routes/notifications";

// In any route
sendNotification(
  userId,
  "success",
  "Customer Created",
  `${customer.name} has been added successfully`,
  { customerId: customer.id }
);
```

### Add Notification Persistence

Currently notifications are lost on page refresh. To persist them:

1. Create `Notification` table in Prisma schema
2. Save notifications to database in `sendNotification()`
3. Load unread notifications on connect
4. Mark as read in database when user clicks

### Add More Notification Types

The system supports custom types. You can add:

- **payment-received** - Show when payment is recorded
- **invoice-overdue** - Alert for overdue invoices
- **low-stock** - Inventory alerts
- **new-customer** - Customer signup notifications

## Summary

✅ **Fixed SSE connection URL** - Removed double `/api` path  
✅ **Added debug logging** - Easy to troubleshoot issues  
✅ **Backend already configured** - Import script sends notifications  
✅ **Frontend properly wired** - NotificationBell displays in real-time  
✅ **Ready to test** - Start servers and trigger import!

The notification system now works exactly like AWS/Google Cloud consoles, showing real-time progress updates during long-running operations like Google Sheets imports.
