# VSCode Container Component Tests

## Overview
Tests for the VSCodeContainer component that loads VS Code through the backend proxy.

## Prerequisites
- Frontend running: `npm run dev` (in frontend directory)
- Backend running: `docker-compose up -d backend`
- VS Code service running: `docker-compose up -d vscode`

---

## Test Suite 1: Component Rendering

### Test 1.1: Component Loads
**Purpose:** Verify VSCodeContainer component renders

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Check that VSCodeContainer component is visible

**Expected Result:**
- Component renders without errors
- Loading indicator appears initially
- Header with VS Code title visible

**Status:** ✅ PASS / ❌ FAIL

---

### Test 1.2: Iframe Creation
**Purpose:** Verify iframe element is created with correct src

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Open DevTools → Elements
3. Find iframe element
4. Check iframe src attribute

**Expected Result:**
- Iframe element exists
- Src: `http://localhost:8000/proxy/8080/?folder=/home/coder/workspace`
- Iframe has proper sandbox attributes

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 2: Proxy URL Configuration

### Test 2.1: Backend URL Usage
**Purpose:** Verify component uses backend proxy URL

**Steps:**
1. Open `frontend/src/components/VSCodeContainer.tsx`
2. Check line ~38-39 for baseUrl construction

**Expected Code:**
```typescript
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const baseUrl = `${backendUrl}/proxy/8080`;
```

**Status:** ✅ PASS / ❌ FAIL

---

### Test 2.2: Environment Variable Support
**Purpose:** Verify component respects NEXT_PUBLIC_BACKEND_URL

**Steps:**
1. Set environment variable: `NEXT_PUBLIC_BACKEND_URL=http://custom:9000`
2. Rebuild frontend
3. Check iframe src in browser

**Expected Result:**
- Iframe src uses custom backend URL
- Src: `http://custom:9000/proxy/8080/?folder=...`

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 3: WebSocket Connection ⚠️ CRITICAL

### Test 3.1: WebSocket Connection Established
**Purpose:** Verify VS Code establishes WebSocket connection

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Open DevTools → Network → WS (WebSocket filter)
3. Wait for VS Code to load
4. Check WebSocket connections

**Expected Result:**
- WebSocket connection to `/proxy/8080/` exists
- Status: 101 Switching Protocols
- Connection stays open (green indicator)
- No 1006 close codes

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3.2: No WebSocket 1006 Errors
**Purpose:** Verify no abnormal WebSocket closures

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Open DevTools → Console
3. Wait for VS Code to fully load
4. Check for WebSocket errors

**Expected Result:**
- No "WebSocket close with status code 1006" errors
- No "failed to connect to the server" errors
- VS Code workbench loads successfully

**Status:** ✅ PASS / ❌ FAIL

---

### Test 3.3: WebSocket Reconnection
**Purpose:** Verify WebSocket reconnects after disconnect

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Wait for VS Code to load
3. Restart backend: `docker-compose restart backend`
4. Wait 10 seconds
5. Check if VS Code reconnects

**Expected Result:**
- WebSocket reconnects automatically
- VS Code continues to function
- No permanent connection loss

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 4: Error Handling

### Test 4.1: Backend Unavailable
**Purpose:** Verify error handling when backend is down

**Steps:**
1. Stop backend: `docker-compose stop backend`
2. Navigate to `http://localhost:3000/workspace`
3. Check error display

**Expected Result:**
- Error message displayed
- "Failed to load VS Code" message
- Retry button available

**Status:** ✅ PASS / ❌ FAIL

---

### Test 4.2: VS Code Service Unavailable
**Purpose:** Verify error handling when VS Code service is down

**Steps:**
1. Stop VS Code: `docker-compose stop vscode`
2. Navigate to `http://localhost:3000/workspace`
3. Check error display

**Expected Result:**
- Error message displayed
- Backend returns 502 Bad Gateway
- Component shows error state

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 5: Iframe Security

### Test 5.1: No X-Frame-Options Blocking
**Purpose:** Verify iframe is not blocked by X-Frame-Options

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Open DevTools → Console
3. Check for X-Frame-Options errors

**Expected Result:**
- No "Refused to display in a frame" errors
- No X-Frame-Options blocking
- Iframe loads successfully

**Status:** ✅ PASS / ❌ FAIL

---

### Test 5.2: Sandbox Attributes
**Purpose:** Verify iframe has proper sandbox attributes

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Open DevTools → Elements
3. Find iframe element
4. Check sandbox attribute

**Expected Attributes:**
```html
sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-popups"
```

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 6: Functional Tests

### Test 6.1: File Explorer Works
**Purpose:** Verify VS Code file explorer functions

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Wait for VS Code to load
3. Click on file explorer icon
4. Try to expand folders

**Expected Result:**
- File explorer opens
- Folders can be expanded/collapsed
- Files are visible
- No WebSocket errors

**Status:** ✅ PASS / ❌ FAIL

---

### Test 6.2: Terminal Works
**Purpose:** Verify VS Code terminal functions

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Wait for VS Code to load
3. Open terminal (Ctrl+` or Terminal menu)
4. Type command: `echo "test"`

**Expected Result:**
- Terminal opens
- Command executes
- Output displays
- WebSocket connection active

**Status:** ✅ PASS / ❌ FAIL

---

### Test 6.3: File Editing Works
**Purpose:** Verify file editing through WebSocket

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Wait for VS Code to load
3. Open a file
4. Type some text
5. Save file (Ctrl+S)

**Expected Result:**
- File opens
- Text appears as typed (real-time)
- File saves successfully
- No WebSocket lag or errors

**Status:** ✅ PASS / ❌ FAIL

---

### Test 6.4: Extensions Work
**Purpose:** Verify VS Code extensions function properly

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Wait for VS Code to load
3. Click Extensions icon (Ctrl+Shift+X)
4. Browse available extensions

**Expected Result:**
- Extensions panel opens
- Extensions list loads
- Can search for extensions
- WebSocket connection stable

**Status:** ✅ PASS / ❌ FAIL

---

### Test 6.5: Settings Sync
**Purpose:** Verify VS Code settings persist

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Wait for VS Code to load
3. Change a setting (e.g., theme, font size)
4. Refresh the page
5. Wait for VS Code to reload

**Expected Result:**
- Settings persist across reloads
- User preferences maintained
- No settings loss

**Status:** ✅ PASS / ❌ FAIL

---

### Test 6.6: Multi-file Editing
**Purpose:** Verify multiple files can be edited simultaneously

**Steps:**
1. Navigate to `http://localhost:3000/workspace`
2. Wait for VS Code to load
3. Open multiple files (3-5 files)
4. Switch between tabs
5. Edit each file

**Expected Result:**
- All files open successfully
- Tab switching works smoothly
- Edits in all files work
- No WebSocket connection issues

**Status:** ✅ PASS / ❌ FAIL

---

## Test Suite 7: Project Context

### Test 7.1: Project Folder Opens
**Purpose:** Verify project-specific folder opens correctly

**Steps:**
1. Navigate to `http://localhost:3000/workspace?projectName=test-project`
2. Wait for VS Code to load
3. Check opened folder in VS Code

**Expected Result:**
- VS Code opens `/home/coder/workspace/projects/test-project`
- Folder path visible in VS Code
- Project files visible

**Status:** ✅ PASS / ❌ FAIL

---

### Test 7.2: Default Workspace Opens
**Purpose:** Verify default workspace opens without project

**Steps:**
1. Navigate to `http://localhost:3000/workspace` (no projectName)
2. Wait for VS Code to load
3. Check opened folder in VS Code

**Expected Result:**
- VS Code opens `/home/coder/workspace`
- Default workspace folder visible

**Status:** ✅ PASS / ❌ FAIL

---

## Test Results Summary

| Test Suite | Tests | Passed | Failed | Status |
|------------|-------|--------|--------|--------|
| Component Rendering | 2 | - | - | ⏳ Pending |
| Proxy URL Configuration | 2 | - | - | ⏳ Pending |
| **WebSocket Connection** | **3** | **-** | **-** | ⚠️ **CRITICAL** |
| Error Handling | 2 | - | - | ⏳ Pending |
| Iframe Security | 2 | - | - | ⏳ Pending |
| Functional Tests | 6 | - | - | ⏳ Pending |
| Project Context | 2 | - | - | ⏳ Pending |
| **TOTAL** | **19** | **-** | **-** | ⏳ Pending |

### Critical Tests

**WebSocket Connection tests (Suite 3) are CRITICAL:**
- ✅ Test 3.1: WebSocket connection established
- ✅ Test 3.2: No WebSocket 1006 errors
- ✅ Test 3.3: WebSocket reconnection

**These tests MUST pass for VS Code to function properly.**

---

## Automated Testing

### Browser Console Checks

```javascript
// Check for WebSocket connections
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('proxy/8080'))
  .forEach(r => console.log(r.name, r.duration));

// Check for errors
console.log('Errors:', window.performance.getEntriesByType('navigation'));
```

### Network Tab Checks

1. Filter by WS (WebSocket)
2. Look for `/proxy/8080/` connections
3. Check status: Should be 101
4. Check frames: Should show bidirectional communication

---

## Troubleshooting

### WebSocket 1006 Error

**Possible Causes:**
1. Backend doesn't support WebSocket upgrades
2. Proxy controller not handling `upgrade: websocket` header
3. http-proxy-middleware not installed
4. VS Code service not accessible

**Solutions:**
1. Check backend has http-proxy-middleware: `grep http-proxy-middleware backend/package.json`
2. Check proxy controller handles WebSocket: `grep -i websocket backend/src/proxy/proxy.controller.ts`
3. Rebuild backend: `docker-compose build backend && docker-compose up -d`
4. Check VS Code service: `docker-compose ps vscode`

### Iframe Blocked

**Possible Causes:**
1. X-Frame-Options header present
2. Content-Security-Policy blocking

**Solutions:**
1. Check backend helmet config: `grep frameguard backend/src/main.ts`
2. Check proxy filters headers: `grep x-frame-options backend/src/proxy/proxy.controller.ts`

### VS Code Doesn't Load

**Possible Causes:**
1. Wrong proxy URL
2. Path not stripped correctly
3. Service not running

**Solutions:**
1. Check iframe src in DevTools
2. Check backend logs: `docker-compose logs backend | grep proxy`
3. Check VS Code service: `docker-compose logs vscode`

---

## Notes

- All tests should be run in order
- WebSocket tests are critical for VS Code functionality
- Document any failures with screenshots and logs
- Update this document with actual test results
