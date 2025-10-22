# WebSocket Support Fix - VS Code Workbench Connection

## Issue

**Error:** `The workbench failed to connect to the server (Error: WebSocket close with status code 1006)`

**Root Cause:** The proxy controller was only handling HTTP requests, not WebSocket upgrade requests. VS Code requires WebSocket for real-time communication with the workbench.

## WebSocket 1006 Error Explained

**Status Code 1006:** Abnormal Closure
- Connection closed without proper WebSocket close frame
- Usually indicates the connection was never established
- Common when proxy doesn't support WebSocket protocol upgrade

## Solution

### 1. Add http-proxy-middleware Dependency

**File:** `backend/package.json`

```json
{
  "dependencies": {
    "http-proxy-middleware": "^2.0.9"
  }
}
```

**Why:** `http-proxy-middleware` handles WebSocket upgrades automatically, unlike axios which only supports HTTP.

### 2. Update Proxy Controller with WebSocket Support

**File:** `backend/src/proxy/proxy.controller.ts`

**Key Changes:**
- Import `http-proxy-middleware`
- Detect WebSocket upgrade requests (`upgrade: websocket` header)
- Use proxy middleware for WebSocket connections
- Keep axios for regular HTTP requests

## How It Works

### HTTP Request Flow (Existing)
1. Browser → `GET http://localhost:8000/proxy/8080/`
2. Backend → Axios HTTP request → VS Code
3. VS Code → HTTP response → Backend → Browser
4. ✅ Works with axios

### WebSocket Upgrade Flow (New)
1. Browser → `GET http://localhost:8000/proxy/8080/` with `Upgrade: websocket`
2. Backend detects `upgrade: websocket` header
3. Backend uses `http-proxy-middleware` (not axios)
4. Middleware sends upgrade request to VS Code
5. VS Code → `101 Switching Protocols`
6. Backend → Proxies upgrade response → Browser
7. ✅ WebSocket connection established
8. Real-time bidirectional communication enabled

## Testing

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Rebuild Backend
```bash
docker-compose build backend
docker-compose up -d backend
```

### 3. Check Logs for WebSocket Upgrade
```bash
docker-compose logs -f backend

# Should see:
# [WebSocket Proxy] Upgrading connection to http://vscode:8080
```

### 4. Test in Browser
```bash
# Open browser
http://localhost:3000/workspace

# Open DevTools → Network → WS (WebSocket filter)
# Should see:
# - WebSocket connection to /proxy/8080/
# - Status: 101 Switching Protocols
# - Connection stays open (green)
# - No 1006 errors
```

## Test Suite Updates

### Automated Tests (`tests/vscode-proxy-test.sh`)

**Added Test 2.3: WebSocket Support Check**
- Check http-proxy-middleware dependency
- Check WebSocket upgrade handling in code

### Manual Tests (`tests/vscode-proxy.test.md`)

**Added Test 2.4: WebSocket Upgrade Support ⚠️ CRITICAL**
- Verify proxy supports WebSocket connections
- Check for upgrade header handling

**Added Test 2.5: VS Code Workbench Connection**
- Verify VS Code workbench connects through WebSocket
- Check for 101 Switching Protocols status

## Complete Fix Chain

1. ✅ **Frontend loads VS Code through proxy** (commit 5aac846)
2. ✅ **Backend strips /proxy/8080 prefix** (commit 5ea81c8)
3. ✅ **Backend allows iframe embedding** (commit 078db93)
4. ✅ **Backend supports WebSocket upgrades** (this fix)

## Files Changed

1. ✅ `backend/package.json` - Added http-proxy-middleware
2. ✅ `backend/src/proxy/proxy.controller.ts` - Added WebSocket support
3. ✅ `tests/vscode-proxy-test.sh` - Added WebSocket tests
4. ✅ `tests/vscode-proxy.test.md` - Added WebSocket test cases

---

**Status:** ✅ Fixed - WebSocket support added
**Testing:** ⚠️ Requires `npm install` and backend rebuild
**Next:** Test on local machine after rebuilding
