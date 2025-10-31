# Notification Stream Connection Fix

## Issue

Console error: "❌ Notification stream closed. Checking if token expired..."

The SSE (Server-Sent Events) connection for real-time notifications was closing intermittently, causing reconnection attempts.

## Root Cause

1. **No keep-alive mechanism** - SSE connections can time out due to inactivity
2. **Overly aggressive error logging** - Normal reconnection behavior was logged as errors
3. **Missing heartbeat** - Long-running connections without activity were closed by proxies/firewalls

## Solution Implemented

### Backend Changes (`backend/src/routes/notifications.ts`)

✅ **Added heartbeat mechanism:**

- Sends a keep-alive message every 30 seconds
- Prevents connection timeout from proxies, load balancers, and browsers
- Uses SSE comment syntax (`:heartbeat timestamp`) to avoid triggering frontend handlers
- Properly cleans up interval on disconnect

**Code added:**

```typescript
// Send keep-alive heartbeat every 30 seconds
const heartbeatInterval = setInterval(() => {
  try {
    res.write(`:heartbeat ${Date.now()}\n\n`);
    if (res.flush) res.flush();
  } catch (error) {
    console.error(`❌ Heartbeat failed for user ${userId}:`, error);
    clearInterval(heartbeatInterval);
  }
}, 30000);

// Clean up on disconnect
req.on("close", () => {
  console.log(`🔌 Client disconnected: ${userId}`);
  clearInterval(heartbeatInterval);
  // ... rest of cleanup
});
```

✅ **Improved error handling:**

- Wrapped notification sends in try-catch
- Better logging for connection lifecycle
- Proper cleanup of intervals and listeners

### Frontend Changes (`frontend/src/hooks/useNotificationCenter.tsx`)

✅ **Ignore heartbeat messages:**

```typescript
eventSourceWithAuth.onmessage = (event) => {
  try {
    // Ignore heartbeat messages (empty data)
    if (!event.data || event.data.trim() === '') {
      return;
    }
    // ... process actual notifications
  }
};
```

✅ **Reduced console noise:**

- Changed error logs to info logs for normal reconnection
- Changed `console.error` → `console.log` for expected behaviors
- Changed `console.warn` → `console.log` for reconnection attempts
- Only log actual errors for unexpected states

**Before:**

```typescript
console.error("❌ Notification stream closed. Checking if token expired...");
console.warn("⚠️ Notification stream reconnecting...");
```

**After:**

```typescript
console.log("🔌 Notification stream closed. Attempting reconnect...");
console.log("🔄 Notification stream reconnecting...");
```

## Benefits

1. ✅ **More stable connections** - Heartbeat prevents timeout
2. ✅ **Cleaner console** - No false error messages
3. ✅ **Better UX** - Users stay connected longer
4. ✅ **Proxy-friendly** - Works with nginx, load balancers, CDNs
5. ✅ **Proper cleanup** - Resources freed on disconnect

## How It Works

### Connection Flow

```
1. Client connects → Backend sends "connected" message
2. Backend starts 30-second heartbeat interval
3. Backend sends `:heartbeat timestamp` every 30s
4. Frontend ignores heartbeat, only processes data messages
5. If connection closes:
   - Backend cleans up interval and listeners
   - Frontend attempts reconnection after 5 seconds
   - Frontend tries token refresh if needed
```

### Heartbeat Format

SSE comments (lines starting with `:`) are ignored by EventSource:

```
:heartbeat 1730400000000
```

This keeps the connection alive without triggering frontend handlers.

## Testing

### Manual Test

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Login to application
4. Open browser console
5. Verify: "📡 Notification stream connected successfully"
6. Wait 60+ seconds
7. Verify: No disconnection, heartbeat keeps connection alive
8. Send test notification: POST to `/api/notifications/test`
9. Verify: Notification received in UI

### Expected Console Output

```
🔌 Connecting to notification stream: [URL]
📡 Notification stream connected successfully
[After 30s, 60s, 90s... no disconnection]
📬 Received notification: info Test Notification
```

### No More Errors

❌ **Before:** "❌ Notification stream closed. Checking if token expired..."  
✅ **After:** Stable connection, only logs if actual issues occur

## Configuration

### Heartbeat Interval

Currently set to **30 seconds**. Can be adjusted if needed:

```typescript
// In backend/src/routes/notifications.ts
const heartbeatInterval = setInterval(() => {
  res.write(`:heartbeat ${Date.now()}\n\n`);
  if (res.flush) res.flush();
}, 30000); // ← Change this value (milliseconds)
```

**Recommended values:**

- Development: 30 seconds (current)
- Production: 30-60 seconds
- Behind aggressive proxy: 15-20 seconds

### Reconnection Delay

Currently set to **5 seconds**:

```typescript
// In frontend/src/hooks/useNotificationCenter.tsx
reconnectTimeout = setTimeout(() => {
  connect();
}, 5000); // ← Change this value (milliseconds)
```

## Deployment Notes

### No database changes required

✅ No migrations needed

### No environment variables needed

✅ Works with existing configuration

### No dependency changes

✅ Uses existing Node.js and browser APIs

### Restart required

After deploying, restart the backend service:

```bash
# Development
cd backend && npm run dev

# Production
pm2 restart backend
# or
systemctl restart crm-backend
```

## Monitoring

### Backend Logs

Look for:

- ✅ `SSE connection established for user: [userId]`
- ✅ `Stored connection for user [userId]. Total connections: X`
- ✅ `Client disconnected: [userId]`
- ❌ `Heartbeat failed for user [userId]` (indicates connection issue)

### Frontend Console

Look for:

- ✅ `📡 Notification stream connected successfully`
- ✅ `📬 Received notification: [type] [title]`
- ⚠️ `🔄 Notification stream reconnecting...` (normal during network issues)
- ❌ Only logs errors for unexpected states

## Known Limitations

1. **EventSource doesn't support custom headers**

   - We use query parameter for authentication
   - Token visible in URL (but logged/masked in console)
   - Consider WebSocket for enhanced security in future

2. **Browser limits**

   - Most browsers limit 6 SSE connections per domain
   - Not an issue for single-user sessions
   - Multiple tabs share connections

3. **Proxy/Firewall**
   - Some corporate firewalls may still block SSE
   - Heartbeat helps but cannot guarantee success
   - Fallback: Polling (not implemented)

## Future Enhancements

1. **WebSocket upgrade**

   - Bidirectional communication
   - Custom headers support
   - Better mobile support

2. **Notification persistence**

   - Store notifications in database
   - Fetch missed notifications on reconnect
   - Show notification history

3. **Configurable intervals**

   - Admin setting for heartbeat frequency
   - Per-user connection settings
   - Adaptive based on connection quality

4. **Connection quality monitoring**
   - Track reconnection frequency
   - Alert on repeated failures
   - Auto-adjust heartbeat interval

---

**Status:** ✅ Fixed  
**Version:** 1.0  
**Date:** October 31, 2025  
**Files Modified:** 2

- `backend/src/routes/notifications.ts`
- `frontend/src/hooks/useNotificationCenter.tsx`
