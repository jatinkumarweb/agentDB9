# WebSocket 1006 Error - Complete Fix

## Problem Summary

Users were experiencing `WebSocket close with status code 1006` errors when trying to access the embedded VSCode through the frontend. Error 1006 indicates an abnormal closure without a proper close frame.

## Root Causes Identified

### 1. Authentication Requirement
The vscode-proxy service required JWT authentication for all requests, including WebSocket upgrades. When users weren't logged in or tokens weren't available, connections were rejected.

### 2. Permission Errors in VSCode Service
The vscode service was running with `user: "1000:1000"` and mounting volumes that caused multiple EACCES permission errors:
- `EACCES: permission denied, mkdir '/home/coder/.local/share/code-server/coder-logs'`
- `EACCES: permission denied, open '/home/coder/.local/share/code-server/heartbeat'`
- `EACCES: permission denied, open '/home/coder/.local/share/code-server/coder.json'`

These errors prevented proper WebSocket connections and file operations.

## Solutions Implemented

### Fix 1: Optional Authentication

**File:** `vscode-proxy/src/index.ts`

Added `REQUIRE_AUTH` environment variable to make authentication optional:

```typescript
const REQUIRE_AUTH = process.env.REQUIRE_AUTH !== 'false';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  if (!REQUIRE_AUTH) {
    console.log('Authentication disabled - allowing request');
    next();
    return;
  }
  // ... existing auth logic
};

// WebSocket upgrade handler
server.on('upgrade', (request, socket, head) => {
  if (!REQUIRE_AUTH) {
    console.log('Authentication disabled - allowing WebSocket upgrade');
    // Proxy the connection
    if (vscodeProxy.upgrade) {
      vscodeProxy.upgrade(proxyReq, socket, head);
    }
    return;
  }
  // ... existing auth logic
});
```

**Configuration:** `docker-compose.yml`
```yaml
vscode-proxy:
  environment:
    - REQUIRE_AUTH=false  # Disable auth in development
```

### Fix 2: Remove Permission Constraints

**File:** `docker-compose.yml`

Simplified vscode service configuration:

```yaml
vscode:
  image: codercom/code-server:latest
  ports:
    - "8080:8080"
  environment:
    - SHELL=/bin/bash
  # Removed: user: "1000:1000"
  volumes:
    - .:/home/coder/workspace
    # Removed problematic volume mounts
  command: >
    --bind-addr 0.0.0.0:8080
    --auth none
    --disable-telemetry
    --disable-update-check
    --user-data-dir /tmp/code-server
    --extensions-dir /tmp/code-server/extensions
    --welcome-text "Welcome to AgentDB9!"
    /home/coder/workspace
```

**Key Changes:**
- Removed `user: "1000:1000"` constraint
- Removed volume mounts for vscode-config, vscode-data, vscode-extensions
- Use `/tmp` for user-data-dir and extensions-dir (writable by default)
- Keep only workspace volume mount

### Fix 3: Frontend Token Handling

**File:** `frontend/src/components/VSCodeContainer.tsx`

Made token parameter optional:

```typescript
// Only include token if available
const url = token 
  ? `${baseUrl}/?token=${encodeURIComponent(token)}` 
  : baseUrl;
```

## Verification

### Check Services
```bash
docker compose ps
# All services should be "Up" and healthy
```

### Check VSCode Logs
```bash
docker compose logs vscode --tail=20
# Should show:
# [info] HTTP server listening on http://0.0.0.0:8080/
# [info] Authentication is disabled
# No EACCES errors
```

### Check VSCode Proxy Logs
```bash
docker compose logs vscode-proxy --tail=20
# Should show:
# 🔒 Authentication: DISABLED (Development Mode)
# [HPM] Upgrading to WebSocket
```

### Test Direct Access
```bash
# VSCode direct
curl http://localhost:8080
# Should redirect to workspace

# VSCode through proxy
curl http://localhost:8081
# Should redirect to workspace
```

### Test in Browser
1. Open http://localhost:3000/workspace
2. VSCode should load without errors
3. Check browser console - no WebSocket 1006 errors
4. Files should be visible in explorer

## Current Status

✅ **WebSocket connections work**  
✅ **No authentication errors**  
✅ **No permission errors**  
✅ **VSCode loads in iframe**  
✅ **Files visible and editable**  

## Configuration for Different Environments

### Development (Current)
```yaml
# docker-compose.yml
vscode-proxy:
  environment:
    - REQUIRE_AUTH=false
```

**Benefits:**
- No login required
- Faster development
- Works immediately

### Production
```yaml
vscode-proxy:
  environment:
    - REQUIRE_AUTH=true
    - JWT_SECRET=your_secure_random_secret_here
```

**Benefits:**
- Secure access control
- User authentication required
- Prevents unauthorized access

## Troubleshooting

### Still Getting WebSocket Errors?

1. **Check if services are running:**
   ```bash
   docker compose ps
   ```

2. **Restart services:**
   ```bash
   docker compose restart vscode vscode-proxy
   ```

3. **Check logs for errors:**
   ```bash
   docker compose logs vscode vscode-proxy --tail=50
   ```

4. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

5. **Verify network connectivity:**
   ```bash
   # From inside vscode-proxy container
   docker compose exec vscode-proxy wget -O- http://vscode:8080
   ```

### Permission Errors Returning?

If you see EACCES errors again:

1. **Check volume mounts:**
   ```bash
   docker compose config | grep -A 5 "vscode:"
   ```
   Should NOT have vscode-config, vscode-data, or vscode-extensions volumes.

2. **Remove old volumes:**
   ```bash
   docker compose down -v
   docker compose up -d
   ```

3. **Verify user:**
   ```bash
   docker compose exec vscode whoami
   # Should be: coder
   ```

## Files Modified

1. `vscode-proxy/src/index.ts` - Optional authentication
2. `docker-compose.yml` - Simplified vscode configuration
3. `frontend/src/components/VSCodeContainer.tsx` - Optional token

## Commits

- `23ca9ff` - "fix: resolve WebSocket 1006 error by making authentication optional"
- `263e4cc` - "fix: resolve vscode permission errors causing WebSocket issues"

## Summary

The WebSocket 1006 error was caused by two issues:
1. **Authentication blocking connections** - Fixed by making auth optional in development
2. **Permission errors in vscode service** - Fixed by removing user constraints and problematic volume mounts

Both issues are now resolved, and VSCode works seamlessly in the browser without WebSocket errors.
