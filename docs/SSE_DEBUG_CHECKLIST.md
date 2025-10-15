# Quick SSE Connection Debugging Checklist

## Step-by-Step Debugging

### 1. Check Browser Console

**Open DevTools (F12) → Console tab**

Look for these messages:

**✅ If you see:**

```
🔌 Connecting to notification stream: http://localhost:5000/api/notifications/stream?token=***
📡 Notification stream connected successfully
```

→ **Connection is working!** Green dot should appear.

**❌ If you see:**

```
❌ Notification stream closed. Will retry in 5 seconds...
🔄 Attempting to reconnect to notification stream...
```

→ **Connection failing.** Continue to step 2.

**❌ If you see:**

```
⚠️ No access token found for SSE connection
```

→ **You're not logged in.** Login again.

### 2. Check Network Tab

**Open DevTools (F12) → Network tab**

1. Refresh the page
2. Filter by "EventStream" or search for "stream"
3. Look for request to `/api/notifications/stream`

**Check the status:**

- **200 OK** with "pending" → ✅ Working! Connection is open
- **401 Unauthorized** → ❌ Token is invalid or expired
- **404 Not Found** → ❌ Backend route not registered
- **Failed** → ❌ Backend not running

**If 401 Unauthorized:**

- Logout and login again to get fresh token
- Check if token in localStorage is expired

**If 404 Not Found:**

- Backend didn't restart properly
- Route not registered in app.ts

**If Failed:**

- Backend server is not running
- Wrong port (should be 5000)
- Check backend terminal for errors

### 3. Check localStorage

**DevTools → Application tab → Local Storage → http://localhost:3000**

Look for:

- `accessToken` - Should be a long JWT string starting with `eyJ`
- `user` - Should have your user info

**If missing:**
→ You're not logged in. Go to login page.

**If present:**
→ Token exists but might be expired. Try logging out and back in.

### 4. Check Backend Terminal

Look for errors in the backend terminal:

**✅ Should see:**

```
🚀 Server running on port 5000
📚 Environment: development
```

**❌ If you see errors:**

- Syntax error in notifications.ts
- Port 5000 already in use
- Database connection failed

### 5. Test Backend Directly

**Option A: Using Browser**

Open a new tab and go to:

```
http://localhost:5000/health
```

**Should return:**

```json
{ "status": "ok", "timestamp": "..." }
```

**If error:**
→ Backend is not running on port 5000

**Option B: Using DevTools Console**

Paste this in browser console:

```javascript
fetch(
  "http://localhost:5000/api/notifications/stream?token=" +
    localStorage.getItem("accessToken")
)
  .then((r) => console.log("Status:", r.status))
  .catch((e) => console.error("Error:", e));
```

**Should show:**

```
Status: 200
```

**If Status: 401:**
→ Token is invalid. Logout and login again.

**If Error:**
→ Backend not reachable.

### 6. Check .env.local

**File:** `frontend/.env.local`

Should contain:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Common mistakes:**

- ❌ `http://localhost:5000/api/api` (double /api)
- ❌ `http://localhost:3000/api` (wrong port)
- ❌ Missing the `/api` at the end

### 7. Common Issues & Quick Fixes

**Issue: "No access token found"**

```
Solution: Logout and login again
1. Click your profile
2. Logout
3. Login with credentials
4. Check for green dot
```

**Issue: "401 Unauthorized"**

```
Solution: Token expired
1. Logout and login again
OR
2. Check JWT_SECRET in backend/.env matches
```

**Issue: "Connection closed. Will retry..."**

```
Solution: Backend not running or wrong port
1. Check backend terminal shows "Server running on port 5000"
2. Check http://localhost:5000/health returns OK
3. Restart backend if needed
```

**Issue: "No green dot but no errors"**

```
Solution: Check NotificationBell component
1. Look for bell icon in top right
2. Check if `isConnected` state is true
3. Refresh the page
```

**Issue: "Green dot flashing on/off"**

```
Solution: Backend restarting or network issues
1. Check backend terminal for errors
2. Check if backend keeps crashing
3. Look for TypeScript compile errors
```

### 8. Force Reconnect

**In browser console, run:**

```javascript
// Force page reload (clears state)
window.location.reload();

// OR manually trigger notification
fetch("http://localhost:5000/api/notifications/test", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + localStorage.getItem("accessToken"),
  },
});
```

### 9. Check Component Rendering

**Look for NotificationBell in dashboard:**

Open browser DevTools → Elements tab

Search for "notification-bell" or look in top right corner of dashboard header.

**Should see:**

```html
<div class="relative">
  <button>
    <svg><!-- Bell icon --></svg>
    <span><!-- Badge count --></span>
    <span class="bg-green-500"><!-- Green dot --></span>
  </button>
</div>
```

**If missing:**
→ NotificationBell not rendered. Check dashboard layout.

### 10. Last Resort: Clean Restart

```bash
# Stop all servers (Ctrl+C in both terminals)

# Backend
cd backend
Remove-Item -Recurse -Force node_modules/.cache
npm run dev

# Frontend (in new terminal)
cd frontend
Remove-Item -Recurse -Force .next
npm run dev

# Browser
- Clear all site data (DevTools → Application → Clear storage)
- Hard refresh (Ctrl+Shift+R)
- Login again
```

## Quick Reference: What Should You See?

### Browser Console (Working):

```
🔌 Connecting to notification stream: http://localhost:5000/api/notifications/stream?token=***
📡 Notification stream connected successfully
```

### Network Tab (Working):

```
Request: GET /api/notifications/stream?token=eyJ...
Status: 200 OK
Type: text/event-stream
Time: Pending (stays open)
```

### Visual Indicator (Working):

- 🟢 Green dot on bell icon (top right)
- Bell icon shows badge count
- Clicking bell shows dropdown

### Backend Terminal (Working):

```
🚀 Server running on port 5000
📚 Environment: development
[INFO] Database connected
[INFO] All routes registered
```

## What to Report If Still Not Working

If after all these steps it's still not working, please provide:

1. **Browser console messages** (copy/paste all logs)
2. **Network tab screenshot** showing the /stream request
3. **Backend terminal output** (last 20 lines)
4. **localStorage contents** (accessToken value - first/last 10 chars only)
5. **Browser and OS** (Chrome/Firefox/Safari, Windows/Mac)

---

**Most Common Fix:** Logout and login again to get a fresh token! 🔄
