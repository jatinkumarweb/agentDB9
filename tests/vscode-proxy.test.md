# VS Code Proxy Test Cases

## Overview
These test cases verify that VS Code and dev server preview URLs work correctly through the backend proxy.

**IMPORTANT:** These tests include regression tests for the path handling bug fix (commit 5ea81c8).
The bug was: backend was forwarding `/proxy/8080/` prefix to VS Code, causing it to fail.
The fix: backend now strips `/proxy/8080` prefix for port 8080, but preserves full path for dev servers.

## Prerequisites
- All services running: `docker-compose up -d`
- Backend accessible at `http://localhost:8000`
- VS Code accessible at `http://localhost:8080` (direct) or `http://localhost:8000/proxy/8080/` (proxied)

## Test Suite 1: Service Health Checks

### Test 1.1: Backend Health
**Purpose:** Verify backend is running and accessible

**Steps:**
```bash
curl http://localhost:8000/health
```

**Expected Result:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "services": {...}
}
```

**Status:** ✅ PASS / ❌ FAIL

---

### Test 1.2: VS Code Direct Access
**Purpose:** Verify VS Code is running on port 8080

**Steps:**
```bash
curl -I http://localhost:8080
```

**Expected Result:**
- HTTP 200 or 302
- Content-Type: text/html

**Status:** ✅ PASS / ❌ FAIL

---

### Test 1.3: VS Code Proxied Access
**Purpose:** Verify VS Code is accessible through backend proxy

**Steps:**
```bash
curl -I http://localhost:8000/proxy/8080/
```

**Expected Result:**
- HTTP 200 or 302
- Content-Type: text/html
- Response from VS Code

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 2: Proxy Controller Functionality

### Test 2.1: Proxy OPTIONS Request (CORS Preflight)
**Purpose:** Verify CORS headers are set correctly

**Steps:**
```bash
curl -X OPTIONS http://localhost:8000/proxy/8080/ \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

**Expected Result:**
- HTTP 204 No Content
- Headers include:
  - `Access-Control-Allow-Origin: http://localhost:3000`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
  - `Access-Control-Allow-Credentials: true`

**Status:** ✅ PASS / ❌ FAIL

---

### Test 2.2: Proxy GET Request
**Purpose:** Verify GET requests are proxied correctly

**Steps:**
```bash
curl http://localhost:8000/proxy/8080/ -v
```

**Expected Result:**
- HTTP 200
- HTML content from VS Code
- No proxy errors

**Status:** ✅ PASS / ❌ FAIL

---

### Test 2.3: Proxy Dev Server Port (5173)
**Purpose:** Verify dev server ports are proxied correctly

**Prerequisites:** Start a Vite dev server in VS Code terminal:
```bash
npm create vite@latest test-app -- --template react
cd test-app
npm install
npm run dev
```

**Steps:**
```bash
curl -I http://localhost:8000/proxy/5173/
```

**Expected Result:**
- HTTP 200
- Content-Type: text/html
- Vite dev server response

**Status:** ✅ PASS / ❌ FAIL

---

### Test 2.4: WebSocket Upgrade Support ⚠️ CRITICAL
**Purpose:** Verify proxy supports WebSocket connections for VS Code

**Bug Context:**
- VS Code requires WebSocket for real-time communication
- Error: "WebSocket close with status code 1006" indicates connection failure
- Proxy must handle HTTP upgrade to WebSocket protocol

**Steps:**
```bash
# Check if backend has WebSocket support
grep "http-proxy-middleware" backend/package.json

# Check if proxy controller handles WebSocket upgrades
grep -A 10 "upgrade.*websocket" backend/src/proxy/proxy.controller.ts

# Test WebSocket connection (requires wscat or similar)
# npm install -g wscat
wscat -c ws://localhost:8000/proxy/8080/
```

**Expected Result:**
- Backend has `http-proxy-middleware` dependency
- Proxy controller checks for `upgrade: websocket` header
- WebSocket connection establishes successfully
- No 1006 close code errors

**Status:** ✅ PASS / ❌ FAIL

---

### Test 2.5: VS Code Workbench Connection
**Purpose:** Verify VS Code workbench connects through WebSocket

**Steps:**
1. Open browser to `http://localhost:3000/workspace`
2. Open browser DevTools → Network tab → WS (WebSocket) filter
3. Look for WebSocket connections to `/proxy/8080/`

**Expected Result:**
- WebSocket connection shows status: 101 Switching Protocols
- Connection remains open (green indicator)
- No 1006 close codes
- VS Code workbench loads and functions

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 3: Path Handling (REGRESSION TESTS)

### Test 3.1: VS Code Path Stripping ⚠️ CRITICAL
**Purpose:** Verify backend strips `/proxy/8080` prefix when forwarding to VS Code

**Bug Context:** 
- Original bug: Backend forwarded `http://vscode:8080/proxy/8080/?folder=...`
- VS Code expected: `http://vscode:8080/?folder=...`
- Fix: Strip `/proxy/8080` prefix for port 8080 only

**Steps:**
```bash
# Make request to VS Code through proxy
curl -s "http://localhost:8000/proxy/8080/?folder=/home/coder/workspace" > /dev/null

# Check backend logs
docker-compose logs --tail=30 backend | grep -A 5 "proxy/8080"
```

**Expected Result:**
- Logs show: `VS Code proxy: stripped prefix`
- Logs show: `Target path: /?folder=/home/coder/workspace`
- Logs do NOT show: `/proxy/8080/proxy/8080` (double prefix)
- VS Code loads successfully

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3.2: Dev Server Path Preservation ⚠️ CRITICAL
**Purpose:** Verify backend preserves full path for dev servers (non-8080 ports)

**Bug Context:**
- Dev servers can be configured with `PUBLIC_URL=/proxy/5173/`
- They expect the full path including prefix
- Backend should NOT strip prefix for these ports

**Steps:**
```bash
# Make request to dev server port
curl -s "http://localhost:8000/proxy/5173/" > /dev/null

# Check backend logs
docker-compose logs --tail=30 backend | grep -A 5 "proxy/5173"
```

**Expected Result:**
- Logs show: `Dev server proxy: keeping full path`
- Logs show: `Target path: /proxy/5173/`
- Full path is preserved

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3.3: No Double Prefix Bug ⚠️ CRITICAL REGRESSION
**Purpose:** Ensure the original bug is fixed and doesn't return

**Bug Context:**
- Original bug caused: `http://vscode:8080/proxy/8080/...`
- This test ensures we never send double prefix again

**Steps:**
```bash
# Make multiple requests
curl -s "http://localhost:8000/proxy/8080/" > /dev/null
curl -s "http://localhost:8000/proxy/8080/?folder=/test" > /dev/null
curl -s "http://localhost:8000/proxy/8080/static/test.js" > /dev/null

# Check logs for double prefix
docker-compose logs --tail=50 backend | grep "/proxy/8080/proxy/8080"
```

**Expected Result:**
- No matches found (grep returns nothing)
- If matches found: ❌ BUG REGRESSION DETECTED

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3.4: Query Parameter Preservation
**Purpose:** Verify query parameters are preserved after path stripping

**Steps:**
```bash
curl -I "http://localhost:8000/proxy/8080/?folder=/home/coder/workspace&test=123"
```

**Expected Result:**
- HTTP 200 or 302
- Backend logs show: `Target path: /?folder=/home/coder/workspace&test=123`
- Query parameters intact

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3.5: Complex Path Handling
**Purpose:** Verify complex paths work correctly

**Steps:**
```bash
# Test VS Code static resources
curl -I "http://localhost:8000/proxy/8080/static/out/vs/code/electron-sandbox/workbench/workbench.html"

# Check logs
docker-compose logs --tail=20 backend | grep "Target path"
```

**Expected Result:**
- Backend strips `/proxy/8080` prefix
- Target path: `/static/out/vs/code/electron-sandbox/workbench/workbench.html`
- No double prefix

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3.6: Code Verification
**Purpose:** Verify the fix is present in the code

**Steps:**
```bash
# Check for path stripping logic
grep -A 10 "port === '8080'" backend/src/proxy/proxy.controller.ts

# Check for dev server path preservation
grep -B 2 -A 2 "keeping full path" backend/src/proxy/proxy.controller.ts
```

**Expected Result:**
- Code contains: `if (port === '8080' && path.startsWith(proxyPrefix))`
- Code contains: `path = path.substring(proxyPrefix.length)`
- Code contains: `console.log('VS Code proxy: stripped prefix')`
- Code contains: `console.log('Dev server proxy: keeping full path')`

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 4: Frontend Integration

### Test 4.1: VS Code Container Component
**Purpose:** Verify VSCodeContainer loads VS Code through proxy

**Steps:**
1. Open browser to `http://localhost:3000/workspace`
2. Open browser DevTools → Network tab
3. Look for iframe request

**Expected Result:**
- Iframe src: `http://localhost:8000/proxy/8080/?folder=...`
- Request succeeds (200 OK)
- VS Code loads in iframe

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3.2: Dev Server Preview URL
**Purpose:** Verify preview URLs work from within VS Code iframe

**Prerequisites:** 
- VS Code loaded in `/workspace` page
- Vite dev server running on port 5173

**Steps:**
1. In VS Code, click "Ports" panel
2. Find port 5173
3. Click "Open in Browser" or preview icon
4. Check the URL in browser

**Expected Result:**
- URL: `http://localhost:8000/proxy/5173/`
- Preview loads successfully
- No "blocked" or CORS errors

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3.3: Same-Origin Policy
**Purpose:** Verify iframe and preview URLs are same-origin

**Steps:**
1. Open `/workspace` page
2. Open DevTools → Console
3. Run:
```javascript
const iframe = document.querySelector('iframe');
console.log('Iframe origin:', new URL(iframe.src).origin);
console.log('Page origin:', window.location.origin);
```

**Expected Result:**
- Both origins should be: `http://localhost:8000`
- No cross-origin errors

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 4: Backward Compatibility

### Test 4.1: Direct VS Code Access Still Works
**Purpose:** Verify direct access to VS Code (port 8080) still works

**Steps:**
```bash
curl -I http://localhost:8080
```

**Expected Result:**
- HTTP 200 or 302
- VS Code accessible directly

**Status:** ✅ PASS / ❌ FAIL

---

### Test 4.2: Environment Variable Override
**Purpose:** Verify NEXT_PUBLIC_VSCODE_URL can override proxy behavior

**Steps:**
1. Set environment variable:
```bash
export NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```
2. Restart frontend
3. Check VS Code iframe src

**Expected Result:**
- Iframe src uses the configured backend URL
- VS Code loads correctly

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 5: Error Handling

### Test 5.1: VS Code Service Down
**Purpose:** Verify graceful error handling when VS Code is unavailable

**Steps:**
1. Stop VS Code container: `docker-compose stop vscode`
2. Try to access: `curl http://localhost:8000/proxy/8080/`

**Expected Result:**
- HTTP 502 Bad Gateway
- Error message: "Could not reach service on port 8080"

**Status:** ✅ PASS / ❌ FAIL

---

### Test 5.2: Invalid Port
**Purpose:** Verify error handling for non-existent ports

**Steps:**
```bash
curl http://localhost:8000/proxy/9999/
```

**Expected Result:**
- HTTP 502 Bad Gateway
- Error message about connection failure

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 6: Performance

### Test 6.1: Proxy Latency
**Purpose:** Measure proxy overhead

**Steps:**
```bash
# Direct access
time curl -s http://localhost:8080 > /dev/null

# Proxied access
time curl -s http://localhost:8000/proxy/8080/ > /dev/null
```

**Expected Result:**
- Proxy overhead < 50ms
- No significant performance degradation

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 7: Multiple Dev Servers

### Test 7.1: Multiple Ports Simultaneously
**Purpose:** Verify multiple dev servers can be proxied at once

**Prerequisites:** Start multiple dev servers:
- Port 3000: React app
- Port 5173: Vite app
- Port 4200: Angular app

**Steps:**
```bash
curl -I http://localhost:8000/proxy/3000/
curl -I http://localhost:8000/proxy/5173/
curl -I http://localhost:8000/proxy/4200/
```

**Expected Result:**
- All return HTTP 200
- Each serves correct content
- No port conflicts

**Status:** ✅ PASS / ❌ FAIL

---

## Rollback Plan

If tests fail, rollback to previous configuration:

### Rollback Step 1: Revert Frontend Changes
```bash
git revert HEAD~1  # Revert "Fix VS Code preview URLs by proxying through backend"
```

### Rollback Step 2: Rebuild Frontend
```bash
docker-compose build frontend
docker-compose up -d frontend
```

### Rollback Step 3: Verify Direct Access Works
```bash
curl -I http://localhost:8080
```

### Rollback Step 4: Update Frontend to Use Direct URL
If needed, manually update `VSCodeContainer.tsx`:
```typescript
const baseUrl = process.env.NEXT_PUBLIC_VSCODE_URL || 'http://localhost:8080';
```

---

## Test Execution Checklist

- [ ] All services started: `docker-compose up -d`
- [ ] Backend health check passes
- [ ] VS Code direct access works
- [ ] VS Code proxied access works
- [ ] Proxy CORS headers correct
- [ ] Dev server proxy works
- [ ] Frontend loads VS Code through proxy
- [ ] Preview URLs work without blocking
- [ ] Same-origin policy verified
- [ ] Backward compatibility maintained
- [ ] Error handling works correctly
- [ ] Performance acceptable
- [ ] Multiple dev servers work

---

## Known Issues and Workarounds

### Issue 1: "Refused to connect"
**Symptom:** VS Code iframe shows "refused to connect"

**Possible Causes:**
1. Backend not running
2. VS Code container not running
3. Proxy controller not handling requests
4. CORS issues

**Workaround:**
1. Check services: `docker-compose ps`
2. Check logs: `docker-compose logs backend vscode`
3. Restart services: `docker-compose restart backend vscode`

### Issue 2: "localhost is blocked"
**Symptom:** Preview URLs show "localhost is blocked"

**Possible Causes:**
1. Cross-origin issue (iframe and preview different origins)
2. Browser security policy

**Workaround:**
1. Verify iframe src uses proxy: `http://localhost:8000/proxy/8080/`
2. Verify preview URLs are relative or same-origin
3. Check browser console for CORS errors

### Issue 3: Proxy timeout
**Symptom:** Requests to proxy hang or timeout

**Possible Causes:**
1. VS Code container not responding
2. Network issues between containers
3. Proxy timeout too short

**Workaround:**
1. Check VS Code health: `curl http://vscode:8080` (from backend container)
2. Increase timeout in proxy controller
3. Check Docker network: `docker network inspect agentdb9_default`

---

## Success Criteria

All tests must pass for the fix to be considered successful:

1. ✅ VS Code loads through backend proxy
2. ✅ Dev server previews work without blocking
3. ✅ Same-origin policy maintained
4. ✅ No CORS errors
5. ✅ Backward compatibility preserved
6. ✅ Performance acceptable
7. ✅ Error handling works correctly

---

## Test Results Summary

| Test Suite | Tests | Passed | Failed | Status |
|------------|-------|--------|--------|--------|
| Service Health | 3 | - | - | ⏳ Pending |
| Proxy Controller | 5 | - | - | ⏳ Pending |
| **Path Handling (REGRESSION)** | **6** | **-** | **-** | ⚠️ **CRITICAL** |
| Frontend Integration | 3 | - | - | ⏳ Pending |
| Backward Compatibility | 2 | - | - | ⏳ Pending |
| Error Handling | 2 | - | - | ⏳ Pending |
| Performance | 1 | - | - | ⏳ Pending |
| Multiple Dev Servers | 1 | - | - | ⏳ Pending |
| **TOTAL** | **23** | **-** | **-** | ⏳ Pending |

### ⚠️ Critical Regression Tests (Suite 3)

The **Path Handling** test suite contains critical regression tests for bug fix commit 5ea81c8:

**Bug Fixed:** Backend was forwarding `/proxy/8080/` prefix to VS Code, causing failures.

**Critical Tests:**
- ✅ Test 3.1: VS Code path stripping - Ensures `/proxy/8080` prefix is stripped
- ✅ Test 3.2: Dev server path preservation - Ensures other ports keep full path  
- ✅ Test 3.3: No double prefix bug - Prevents regression of original bug
- ✅ Test 3.4: Query parameter preservation - Ensures params survive stripping
- ✅ Test 3.5: Complex path handling - Tests nested paths
- ✅ Test 3.6: Code verification - Confirms fix is in codebase

**⚠️ These tests MUST pass before any deployment.**

---

## Notes

- Tests should be run in order
- Each test suite builds on previous ones
- **Path Handling tests (Suite 3) are regression tests - failures indicate bug regression**
- Document any failures with logs and screenshots
- Update this document with actual test results
- Run automated tests with: `./tests/vscode-proxy-test.sh`
