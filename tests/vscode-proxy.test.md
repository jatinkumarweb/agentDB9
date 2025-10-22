# VS Code Proxy Test Cases

## Overview
These test cases verify that VS Code and dev server preview URLs work correctly through the backend proxy.

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

## Test Suite 3: Frontend Integration

### Test 3.1: VS Code Container Component
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
| Proxy Controller | 3 | - | - | ⏳ Pending |
| Frontend Integration | 3 | - | - | ⏳ Pending |
| Backward Compatibility | 2 | - | - | ⏳ Pending |
| Error Handling | 2 | - | - | ⏳ Pending |
| Performance | 1 | - | - | ⏳ Pending |
| Multiple Dev Servers | 1 | - | - | ⏳ Pending |
| **TOTAL** | **15** | **-** | **-** | ⏳ Pending |

---

## Notes

- Tests should be run in order
- Each test suite builds on previous ones
- Document any failures with logs and screenshots
- Update this document with actual test results
