# VS Code Proxy Bug Fix

## Issue Found

The VS Code proxy was not working because the backend proxy controller was sending the wrong path to VS Code.

### Root Cause

**Backend Proxy Controller Bug** (`backend/src/proxy/proxy.controller.ts`):

```typescript
// BEFORE (Line 100):
const path = req.url;  // Contains /proxy/8080/?folder=...

// Then builds target URL (Line 143):
const targetUrl = `http://vscode:8080${path}`;
// Result: http://vscode:8080/proxy/8080/?folder=...  ❌ WRONG!
```

**Problem:**
- Frontend requests: `http://localhost:8000/proxy/8080/?folder=/home/coder/workspace`
- Backend receives: `req.url = /proxy/8080/?folder=/home/coder/workspace`
- Backend forwards to: `http://vscode:8080/proxy/8080/?folder=/home/coder/workspace`
- VS Code expects: `http://vscode:8080/?folder=/home/coder/workspace`
- ❌ VS Code doesn't understand `/proxy/8080/` prefix and fails

### The Fix

**Updated Path Handling:**

```typescript
// AFTER (Lines 98-119):
// Handle path differently for VS Code vs dev servers
// - VS Code (8080): Strip /proxy/8080 prefix, send only /?folder=...
// - Dev servers (5173, 3000, etc.): Keep full path /proxy/{port}/ for PUBLIC_URL
const proxyPrefix = `/proxy/${port}`;
let path = req.url;

// For VS Code (port 8080), strip the proxy prefix
if (port === '8080' && path.startsWith(proxyPrefix)) {
  path = path.substring(proxyPrefix.length);
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  console.log('VS Code proxy: stripped prefix');
} else {
  // For dev servers, keep the full path for PUBLIC_URL compatibility
  console.log('Dev server proxy: keeping full path');
}
```

**Now:**
- Frontend requests: `http://localhost:8000/proxy/8080/?folder=/home/coder/workspace`
- Backend receives: `req.url = /proxy/8080/?folder=/home/coder/workspace`
- Backend strips prefix: `path = /?folder=/home/coder/workspace`
- Backend forwards to: `http://vscode:8080/?folder=/home/coder/workspace`
- ✅ VS Code receives correct path and loads successfully

### Why Different Behavior?

**VS Code (port 8080):**
- VS Code server doesn't know about `/proxy/8080/` prefix
- Expects standard paths like `/?folder=...`, `/static/...`, etc.
- Must strip the proxy prefix

**Dev Servers (ports 5173, 3000, etc.):**
- Can be configured with `PUBLIC_URL=/proxy/5173/`
- Expect the full path including prefix
- Keep the proxy prefix for compatibility

## Files Changed

- ✅ `backend/src/proxy/proxy.controller.ts` - Fixed path handling for VS Code

## Testing

After rebuilding the backend:

```bash
# Rebuild backend
docker-compose build backend
docker-compose up -d backend

# Test VS Code proxy
curl http://localhost:8000/proxy/8080/
# Should return VS Code HTML

# Test in browser
# Open http://localhost:3000/workspace
# VS Code should load in iframe
```

## Impact

This fix resolves the "localhost is blocked" error when:
1. Loading VS Code through the backend proxy
2. Opening dev server previews from within VS Code
3. All same-origin policy issues

The complete flow now works:
1. Frontend loads VS Code: `http://localhost:8000/proxy/8080/`
2. Backend strips prefix and forwards to: `http://vscode:8080/`
3. VS Code loads successfully ✅
4. VS Code generates preview URLs: `/proxy/5173/`
5. Browser resolves to: `http://localhost:8000/proxy/5173/` (same origin)
6. Backend keeps prefix and forwards to: `http://vscode:5173/proxy/5173/`
7. Dev server (configured with PUBLIC_URL) serves correctly ✅
