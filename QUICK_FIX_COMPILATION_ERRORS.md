# Quick Fix - Compilation Errors

## Issue

Backend compilation errors after adding WebSocket support:

```
error TS2307: Cannot find module 'http-proxy-middleware'
error TS2339: Property 'headersSent' does not exist on type 'Response'
error TS2349: This expression is not callable
```

## Root Cause

1. `http-proxy-middleware` dependency added to package.json but not installed
2. TypeScript types for `http-proxy-middleware` not installed
3. Type mismatch in error handler (Express Response vs standard Response)

## Solution

### Quick Fix (Automated)

```bash
# Run the automated install and rebuild script
./install-and-rebuild.sh
```

This script will:
1. Install backend dependencies (including http-proxy-middleware)
2. Rebuild backend container
3. Restart backend
4. Verify no compilation errors

### Manual Fix

If you prefer to do it manually:

#### Step 1: Install Dependencies
```bash
cd backend
npm install
cd ..
```

#### Step 2: Rebuild Backend
```bash
docker-compose build backend
docker-compose up -d backend
```

#### Step 3: Verify
```bash
# Check logs for errors
docker-compose logs backend | grep -i error

# Should see no TypeScript compilation errors
```

## What Was Fixed

### 1. Added TypeScript Types
**File:** `backend/package.json`

```json
{
  "devDependencies": {
    "@types/http-proxy-middleware": "^1.0.0"
  }
}
```

### 2. Fixed Type Error in Proxy Controller
**File:** `backend/src/proxy/proxy.controller.ts`

**Before:**
```typescript
if (res instanceof Response && !res.headersSent) {
  res.status(502).json({...});
}
```

**After:**
```typescript
const expressRes = res as any;
if (expressRes && typeof expressRes.status === 'function' && !expressRes.headersSent) {
  expressRes.status(502).json({...});
}
```

**Why:** The `res` parameter is Express Response, not standard Response. TypeScript was confused about the type.

## Verification

### 1. Check Backend Logs
```bash
docker-compose logs backend | tail -50
```

**Should see:**
```
✅ Backend compiled successfully
✅ Application is running on port 8000
```

**Should NOT see:**
```
❌ error TS2307
❌ error TS2339
❌ error TS2349
```

### 2. Test WebSocket Connection
```bash
# Open browser
http://localhost:3000/workspace

# DevTools → Network → WS filter
# Should see WebSocket connection to /proxy/8080/
# Status: 101 Switching Protocols
```

### 3. Run Tests
```bash
./tests/vscode-proxy-test.sh
```

## Troubleshooting

### Dependencies Not Installing

**Problem:** `npm install` fails

**Solution:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Backend Won't Start

**Problem:** Backend container fails to start

**Solution:**
```bash
# Check logs
docker-compose logs backend

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Still Getting Type Errors

**Problem:** TypeScript still complains about types

**Solution:**
```bash
# Clear TypeScript cache
cd backend
rm -rf dist
npm run build

# If still failing, check node_modules
ls -la node_modules/http-proxy-middleware
ls -la node_modules/@types/http-proxy-middleware
```

### Module Not Found at Runtime

**Problem:** Backend starts but crashes with "Cannot find module"

**Solution:**
```bash
# Ensure dependencies are in container
docker-compose exec backend ls -la node_modules/http-proxy-middleware

# If missing, rebuild
docker-compose build backend
docker-compose up -d backend
```

## Files Changed

1. ✅ `backend/package.json` - Added @types/http-proxy-middleware
2. ✅ `backend/src/proxy/proxy.controller.ts` - Fixed type error in error handler
3. ✅ `install-and-rebuild.sh` - Automated install and rebuild script
4. ✅ `QUICK_FIX_COMPILATION_ERRORS.md` - This document

## Next Steps

After fixing compilation errors:

1. **Test VS Code:**
   ```bash
   # Open: http://localhost:3000/workspace
   # Verify: VS Code loads and WebSocket connects
   ```

2. **Run Test Suite:**
   ```bash
   ./tests/vscode-proxy-test.sh
   ```

3. **Monitor Logs:**
   ```bash
   docker-compose logs -f backend
   # Look for: [WebSocket Proxy] Upgrading connection
   ```

---

**Status:** ✅ Fixed - TypeScript compilation errors resolved
**Action Required:** Run `./install-and-rebuild.sh` or follow manual steps
**Estimated Time:** 2-3 minutes
