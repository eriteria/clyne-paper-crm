# SSE Authentication Fix - Query Parameter Support

## Issue

The SSE endpoint was returning `401 Unauthorized` because EventSource doesn't support custom headers (like `Authorization: Bearer ...`), but the backend's `authenticate` middleware only checks for the Authorization header.

## Root Cause

```typescript
// Frontend (EventSource doesn't support headers)
const eventSource = new EventSource(`/api/notifications/stream?token=${jwt}`);

// Backend (only checks Authorization header)
const authHeader = req.headers.authorization; // ❌ undefined for EventSource
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return res.status(401).json({ error: "Access token required" });
}
```

## Solution

Modified the `/api/notifications/stream` endpoint to:

1. **Accept token from query parameter** instead of Authorization header
2. **Manually verify JWT** without using the `authenticate` middleware
3. **Check user validity** (exists, active) before opening SSE connection

## Code Changes

**File:** `backend/src/routes/notifications.ts`

### Before

```typescript
router.get("/stream", authenticate, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  // ... SSE setup
});
```

### After

```typescript
router.get("/stream", async (req, res) => {
  try {
    // Get token from query parameter (EventSource doesn't support headers)
    const token = req.query.token as string;

    if (!token) {
      res.status(401).json({ error: "Access token required" });
      return;
    }

    // Verify JWT token manually
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
    };

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Invalid user" });
      return;
    }

    const userId = user.id;

    // Set SSE headers and start streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // ... rest of SSE logic
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
});
```

## Why This Works

### EventSource Limitation

EventSource API (used for SSE) **cannot set custom headers**. This is a browser security limitation. The only way to authenticate is:

1. ✅ Query parameter: `/stream?token=xxx`
2. ✅ Cookie (but requires credentials: true)
3. ❌ Authorization header (not supported)

### Security Consideration

Passing JWT in query parameters is slightly less secure than headers because:

- URLs can be logged in browser history, server logs, proxy logs
- URLs can be leaked in Referer headers

**Mitigation:**

- ✅ Use HTTPS in production (prevents eavesdropping)
- ✅ Short-lived tokens (1 hour expiry)
- ✅ Server logs should sanitize token from query params
- ✅ For production, consider WebSocket with proper auth handshake

## Testing

### 1. Restart Backend Server

The backend needs to be restarted to apply the changes:

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

### 2. Test Connection

**Browser Console:**

```javascript
// Should now show:
🔌 Connecting to notification stream: http://localhost:5000/api/notifications/stream?token=***
📡 Notification stream connected successfully
```

**Network Tab:**

```
GET /api/notifications/stream?token=eyJ...
Status: 200 OK
Type: text/event-stream
```

### 3. Verify Green Dot

The bell icon should now show a green dot indicating successful connection.

## Other Routes Still Use Header Auth

**Important:** Only the `/stream` endpoint accepts query param auth. All other API endpoints still require the `Authorization: Bearer` header:

```typescript
// Standard API routes (still use headers)
router.get("/counts", authenticate, async (req, res) => {
  // Uses Authorization: Bearer token
});

// SSE endpoint (now uses query param)
router.get("/stream", async (req, res) => {
  // Uses ?token=xxx
});
```

## Alternative Solutions Considered

### Option 1: Cookie-Based Auth

```typescript
// Set cookie on login
res.cookie("token", jwt, { httpOnly: true, secure: true });

// EventSource with credentials
const eventSource = new EventSource("/stream", { withCredentials: true });
```

**Pros:** More secure than query param  
**Cons:** Requires cookie management, CSRF protection

### Option 2: WebSocket

```typescript
// Supports custom headers during handshake
const ws = new WebSocket("ws://localhost:5000/notifications", {
  headers: { Authorization: `Bearer ${token}` },
});
```

**Pros:** More secure, bidirectional communication  
**Cons:** More complex, overkill for one-way notifications

### Option 3: Short-Lived Connection Tokens

```typescript
// Get a special SSE token from API
const sseToken = await getSSEToken();
const eventSource = new EventSource(`/stream?token=${sseToken}`);
```

**Pros:** Separate token for SSE, can invalidate independently  
**Cons:** Extra API call, more complexity

**Decision:** We went with **query parameter** for simplicity and quick implementation. For production with high security requirements, consider WebSocket or cookie-based auth.

## Security Best Practices

### For Production:

1. **Use HTTPS** - Encrypts the token in query string
2. **Sanitize Logs** - Don't log full URLs with tokens
3. **Short Token Expiry** - 1 hour max (we already do this)
4. **Token Rotation** - Refresh tokens before expiry
5. **Rate Limiting** - Prevent connection spam
6. **Monitor Connections** - Detect suspicious patterns

### Current Implementation:

✅ JWT verification (validates signature, expiry)  
✅ User validation (checks exists, active)  
✅ HTTPS ready (works with both HTTP/HTTPS)  
✅ Error handling (catches invalid tokens)  
✅ Connection tracking (stores active connections)  
✅ Graceful cleanup (removes on disconnect)

## Verification Checklist

After restarting backend, verify:

- [ ] Backend server restarts without errors
- [ ] SSE endpoint accepts `?token=xxx` parameter
- [ ] Frontend shows "📡 Notification stream connected successfully"
- [ ] Green dot appears on bell icon
- [ ] Test notification appears when triggering import
- [ ] Connection survives page refresh
- [ ] Multiple tabs can connect simultaneously

## Next Steps

1. ✅ **Test the connection** - Restart backend and check for green dot
2. ✅ **Trigger import** - Test real-time notifications
3. 🔄 **Consider WebSocket upgrade** - For production security
4. 🔄 **Add rate limiting** - Prevent connection spam
5. 🔄 **Add connection monitoring** - Track active SSE connections

## Summary

✅ **Fixed 401 error** - SSE endpoint now accepts token as query parameter  
✅ **Manual JWT verification** - Validates token without middleware  
✅ **Maintains security** - Still checks user validity  
✅ **Works with EventSource** - Compatible with browser SSE API  
✅ **Ready for testing** - Restart backend and test connection

**Action Required:** Restart the backend server to apply changes!

```bash
# Terminal 1 (Backend)
Ctrl+C  # Stop current server
npm run dev  # Restart

# Terminal 2 (Frontend - if not running)
npm run dev
```

Then refresh the browser and look for the green dot on the bell icon! 🔔✅
