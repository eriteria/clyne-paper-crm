# Real-Time Notification System - Quick Start Guide

## What You Get

✅ Bell icon in header with badge count  
✅ Real-time updates during Google Sheets import  
✅ Progress tracking for each import step  
✅ Error notifications if something fails  
✅ Success message when complete  
✅ Mark as read / Clear functionality

---

## How to Use

### 1. Start the Servers

```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

### 2. Login to Dashboard

Navigate to `http://localhost:3000` and login with your credentials.

### 3. Check Connection

Look for the **green dot** on the bell icon in the top right corner. This means you're connected to the notification stream.

### 4. Trigger an Import

1. Go to **Admin** → **Import** page
2. Click **"Import from Google Sheets"**
3. Watch the bell icon's badge count increase in real-time!

### 5. View Notifications

Click the bell icon to see the dropdown with all notifications:

- Import started
- Progress updates (Product Groups, Customers, Invoices)
- Success or error message
- Each notification shows timestamp and details

---

## What You'll See

### During Import:

**Step 1:** Import Started

```
ℹ️ Import Started
   Google Sheets import has begun...
   just now
```

**Step 2:** Progress Updates

```
⟳ Product Groups
   Created 15 product groups
   Step: Product Groups
   Created: 15
   2 seconds ago
```

```
⟳ Customers
   Created 450 customers
   Step: Customers
   Created: 450
   15 seconds ago
```

**Step 3:** Completion

```
✓ Import Completed
   Import finished successfully
   30 seconds ago
```

### If Error Occurs:

```
✗ Import Failed
   Error importing customers: Database connection failed
   10 seconds ago
```

---

## Features

### Bell Icon

- **Badge Count:** Shows number of unread notifications
- **Green Dot:** Connection status indicator
- **Pulsing:** Animates when new notification arrives

### Dropdown Panel

- **Scrollable:** View up to 100 recent notifications
- **Mark as Read:** Click notification or use "Mark all as read" button
- **Clear:** Remove individual notifications or clear all
- **Time Stamps:** Shows "just now", "2 minutes ago", etc.
- **Type Icons:**
  - ✓ Success (green)
  - ✗ Error (red)
  - ⚠ Warning (yellow)
  - ℹ Info (blue)
  - ⟳ Progress (blue)

---

## Troubleshooting

### No Green Dot?

**Problem:** Not connected to notification stream  
**Fix:**

1. Check backend is running
2. Check you're logged in
3. Look in browser console for `[SSE] Connected to notification stream`
4. Refresh the page

### Not Receiving Notifications?

**Problem:** SSE connection issue  
**Fix:**

1. Open browser console
2. Look for connection errors
3. Check backend terminal for SSE logs
4. Verify token: `console.log(localStorage.getItem("accessToken"))`

### Badge Count Wrong?

**Problem:** UI state not updating  
**Fix:**

1. Click bell to open dropdown (forces refresh)
2. Mark all as read and start fresh
3. Refresh browser

---

## Testing Without Import

You can test the notification system without triggering a full import:

### Option 1: Manual Backend Test

Add this to any backend route:

```typescript
import { sendNotification } from "./routes/notifications";

// In your route handler
sendNotification("user-id-here", {
  type: "info",
  title: "Test Notification",
  message: "This is a test message",
  data: { test: true },
});
```

### Option 2: Browser Console Test

```javascript
// This won't work from console (SSE is one-way)
// But you can inspect the state:
const notifications = document.querySelector("[data-notifications]");
console.log(notifications);
```

---

## Next Steps

### Add Notifications to Other Features

You can add notifications for any operation:

**Example: Customer Created**

```typescript
// Backend route
router.post("/customers", async (req, res) => {
  const customer = await createCustomer(req.body);

  sendNotification(req.user!.id, {
    type: "success",
    title: "Customer Created",
    message: `${customer.name} has been added successfully`,
    data: { customerId: customer.id },
  });

  res.json({ success: true, data: customer });
});
```

**Example: Invoice Approved**

```typescript
router.put("/invoices/:id/approve", async (req, res) => {
  const invoice = await approveInvoice(req.params.id);

  sendNotification(req.user!.id, {
    type: "success",
    title: "Invoice Approved",
    message: `Invoice #${invoice.number} has been approved`,
    data: { invoiceId: invoice.id },
  });

  res.json({ success: true });
});
```

---

## Architecture Overview

### How It Works

```
1. Frontend connects to backend via SSE
   └─ GET /api/notifications/stream?token=jwt_token

2. Backend starts import operation
   └─ Sends notifications via SSE to specific user

3. Frontend receives events in real-time
   └─ Updates notification list
   └─ Increments badge count
   └─ Shows dropdown with new notification

4. User interacts with notifications
   └─ Mark as read
   └─ Clear notification
   └─ View details
```

### Connection Flow

```
Browser                    Backend
   │                          │
   ├──SSE Connect──────────>  │
   │  (EventSource)           │
   │                          │
   │  <────Connected──────────┤
   │  (green dot appears)     │
   │                          │
   │  <────Notification───────┤
   │  (badge count +1)        │
   │                          │
   │  <────Notification───────┤
   │  (badge count +2)        │
   │                          │
   └──Disconnect─────────────>│
      (on logout/close)
```

---

## API Reference

### SSE Endpoint

**GET** `/api/notifications/stream?token={jwt_token}`

**Response Format:**

```
data: {"type":"import:started","title":"Import Started","message":"..."}\n\n
```

### Notification Types

- `import:started` - Import operation began
- `import:progress` - Progress update during import
- `import:success` - Import completed successfully
- `import:error` - Import failed with error
- `success` - Generic success notification
- `error` - Generic error notification
- `warning` - Warning message
- `info` - Informational message

### Frontend Hook

```typescript
import { useNotifications } from "@/hooks/useNotifications";

function MyComponent() {
  const {
    notifications, // All notifications
    unreadCount, // Number of unread
    isConnected, // Connection status
    markAsRead, // Mark single as read
    markAllAsRead, // Mark all as read
    clearNotification, // Remove single
    clearAll, // Remove all
  } = useNotifications();
}
```

---

## Demo Scenario

### Full Import Flow

1. **Login** to dashboard
2. See **green dot** on bell (connected)
3. Navigate to **Admin** → **Import**
4. Click **"Import from Google Sheets"**
5. Bell **badge shows "1"** (Import Started)
6. After 2 seconds, **badge shows "2"** (Product Groups)
7. After 15 seconds, **badge shows "3"** (Customers)
8. After 30 seconds, **badge shows "4"** (Invoices)
9. After 1 minute, **badge shows "5"** (Completed)
10. Click bell to **view all notifications**
11. Each notification shows **step, message, and timestamp**
12. Click **"Mark all as read"** to clear badge
13. Notifications remain in list but badge goes to 0

---

## Benefits

### Real-Time Feedback

- No more wondering if import is working
- See progress as it happens
- Immediate error alerts

### Better UX

- Visual feedback via badge count
- Non-blocking (can work while import runs)
- Clear communication of system state

### Debugging

- Notification history helps diagnose issues
- Error messages show exact failure point
- Can track which step failed

---

## Support

If you encounter issues:

1. **Check browser console** for SSE connection logs
2. **Check backend terminal** for notification send logs
3. **Verify token** is valid in localStorage
4. **Try refreshing** the page
5. **Check network tab** for SSE stream

For detailed implementation docs, see: `docs/NOTIFICATION_SYSTEM_COMPLETE.md`
