# SSE Connection Troubleshooting Guide

## Current Issue

Getting `Notification stream error: {}` when trying to connect to the SSE endpoint.

## Improved Error Handling

I've updated `useNotificationCenter.tsx` with:

✅ **Better error logging** - Shows actual error states  
✅ **Automatic reconnection** - Retries connection every 5 seconds  
✅ **Connection state tracking** - Monitors EventSource readyState  
✅ **Graceful cleanup** - Properly closes connections on unmount

## How to Debug

### Step 1: Check Backend is Running

Open a terminal and verify the backend is running:

```bash
# Should show backend running on port 5000
npm run dev
```

Look for:

```
🚀 Server running on port 5000
```

### Step 2: Test SSE Endpoint Manually

Open your browser and try to access the SSE endpoint directly:

**Option A: Using Browser DevTools**

1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by **EventStream** or **All**
4. Reload the dashboard page
5. Look for request to `/api/notifications/stream`
6. Check the response:
   - **200 OK** = Working ✅
   - **401 Unauthorized** = Token issue ❌
   - **404 Not Found** = Route not registered ❌
   - **Failed** = Backend not running ❌

**Option B: Using curl**

```bash
# Get your JWT token from browser localStorage first
# Then test the endpoint:

curl -N -H "Accept: text/event-stream" \
  "http://localhost:5000/api/notifications/stream?token=YOUR_JWT_TOKEN"
```

Expected output:

```
data: {"type":"connected","message":"Notification stream connected","timestamp":"2025-10-14T..."}
```

### Step 3: Check Browser Console

Look for these log messages:

**✅ Successful Connection:**

```
🔌 Connecting to notification stream: http://localhost:5000/api/notifications/stream?token=***
📡 Notification stream connected successfully
```

**❌ Connection Failed:**

```
🔌 Connecting to notification stream: http://localhost:5000/api/notifications/stream?token=***
❌ Notification stream closed. Will retry in 5 seconds...
🔄 Attempting to reconnect to notification stream...
```

### Step 4: Check Backend Logs

The backend should log when clients connect:

```
[INFO] SSE client connected: userId=abc123
```

If you don't see this, the request isn't reaching the backend.

## Common Issues & Solutions

### Issue 1: Backend Not Running

**Symptoms:**

- `Notification stream closed. Will retry in 5 seconds...`
- No backend logs
- curl returns "Connection refused"

**Solution:**

```bash
# Start the backend
cd backend
npm run dev
```

### Issue 2: Wrong API URL

**Symptoms:**

- Connection attempt to wrong URL in console
- 404 Not Found in Network tab

**Solution:**
Check `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Should NOT have double `/api`:

- ✅ `http://localhost:5000/api`
- ❌ `http://localhost:5000/api/api`

### Issue 3: Invalid JWT Token

**Symptoms:**

- 401 Unauthorized response
- Backend logs: "JWT verification failed"

**Solution:**

1. Logout and login again to get fresh token
2. Check localStorage in DevTools:
   - Go to **Application** → **Local Storage** → `http://localhost:3000`
   - Look for `accessToken`
   - Should be a long JWT string (eyJ...)

### Issue 4: CORS Issues

**Symptoms:**

- Console error: "CORS policy: No 'Access-Control-Allow-Origin' header"
- Request blocked by browser

**Solution:**
Check `backend/src/app.ts` has frontend URL in CORS config:

```typescript
cors({
  origin: [
    "http://localhost:3000", // ← Should include this
    // ... other origins
  ],
  credentials: true,
});
```

### Issue 5: Route Not Registered

**Symptoms:**

- 404 Not Found
- Backend logs don't show connection attempt

**Solution:**
Verify in `backend/src/app.ts`:

```typescript
import notificationRoutes from "./routes/notifications";
// ...
app.use("/api/notifications", notificationRoutes); // ← Should be here
```

## Testing the Full Flow

### 1. Start Fresh

```bash
# Stop all servers
Ctrl+C

# Clear caches
cd frontend
Remove-Item -Recurse -Force .next
cd ..

# Start fresh
npm run dev
```

### 2. Login to Dashboard

- Open http://localhost:3000
- Login with your credentials
- Navigate to dashboard

### 3. Check Connection

**Look for green dot on bell icon:**

- 🟢 Green = Connected
- ⚪ No dot = Disconnected

**Check console:**

```
📡 Notification stream connected successfully
```

### 4. Trigger Notification

Go to **Admin → Import** and click **"Import from Google Sheets"**

**You should see:**

1. Bell badge count increase
2. Console logs: `📬 Received notification: progress Import Progress`
3. Notifications in bell dropdown

## Manual Testing Script

You can test notifications without triggering an import:

**Backend Console:**

```javascript
// In backend/src/routes/notifications.ts, add temporary test endpoint:

router.post("/test", authenticate, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  sendNotification(
    userId,
    "info",
    "Test Notification",
    "This is a test notification",
    { test: true }
  );
  res.json({ message: "Test notification sent" });
});
```

**Then trigger from frontend:**

```javascript
// In browser console:
fetch("http://localhost:5000/api/notifications/test", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  },
})
  .then((r) => r.json())
  .then(console.log);
```

## Expected Network Traffic

When working correctly, you should see:

**Network Tab (EventStream):**

```
Request:
  GET http://localhost:5000/api/notifications/stream?token=eyJ...
  Status: 200 OK
  Type: text/event-stream
  Timing: Pending (keeps connection open)

Response Preview:
  data: {"type":"connected",...}

  data: {"type":"progress",...}

  data: {"type":"success",...}
```

The connection stays open indefinitely (shown as "Pending").

## Verification Checklist

Before reporting issues, verify:

- [ ] Backend is running on port 5000
- [ ] Frontend is running on port 3000
- [ ] You're logged in (have valid JWT token)
- [ ] `NEXT_PUBLIC_API_URL` is set correctly
- [ ] Browser console shows connection attempt
- [ ] Network tab shows request to `/notifications/stream`
- [ ] No CORS errors in console
- [ ] Backend logs show server started

## Still Having Issues?

If the connection still fails after all these checks:

1. **Check backend server logs** for any startup errors
2. **Try different browser** (test in incognito mode)
3. **Disable browser extensions** (ad blockers can interfere with SSE)
4. **Check firewall/antivirus** isn't blocking local connections
5. **Verify ports aren't in use** by other apps:
   ```bash
   netstat -ano | findstr "5000"
   netstat -ano | findstr "3000"
   ```

## Next Steps After Fix

Once the green dot appears:

1. ✅ SSE connection is working
2. Test import notifications
3. Add notifications to other operations
4. Consider persisting notifications to database
5. Add notification preferences/settings

---

**Current Status:** Auto-reconnect enabled. Check browser console for detailed connection logs.
