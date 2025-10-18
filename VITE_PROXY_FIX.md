# Vite Proxy 404 Error Fix

## Problem

When accessing a Vite dev server (port 5173) through a proxy, you get 404 errors:

```
Failed to load resource: the server responded with a status of 404 (Not Found)
client:1  Failed to load resource: the server responded with a status of 404 (Not Found)
@react-refresh:1  Failed to load resource: the server responded with a status of 404 (Not Found)
:8080/vite.svg:1  Failed to load resource: the server responded with a status of 404 (Not Found)
```

## Root Cause

**URL Path Mismatch:**

When you access Vite through a proxy URL like:
```
http://localhost:8080/proxy/5173/
```

Vite generates asset URLs as absolute paths:
- `/@vite/client`
- `/@react-refresh`
- `/vite.svg`
- `/src/main.jsx`

The browser resolves these relative to the current origin (port 8080), resulting in:
- ❌ `http://localhost:8080/@vite/client` → 404
- ❌ `http://localhost:8080/vite.svg` → 404

But they should be:
- ✅ `http://localhost:8080/proxy/5173/@vite/client`
- ✅ `http://localhost:8080/proxy/5173/vite.svg`

## Solution

Configure Vite's `base` option to include the proxy path prefix.

### Option 1: Environment-Based Configuration (Recommended)

Create or update `vite.config.js` in your Vite project:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Set base path for proxy environments
  base: process.env.VITE_BASE_PATH || '/',
  
  server: {
    host: '0.0.0.0', // Listen on all interfaces
    port: 5173,
    strictPort: true,
  }
})
```

Then start the dev server with the base path:

```bash
VITE_BASE_PATH=/proxy/5173/ npm run dev
```

### Option 2: Direct Configuration

If you always access through the proxy, set it directly:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/proxy/5173/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  }
})
```

### Option 3: Gitpod/Cloud Environment Detection

Automatically detect and configure for cloud environments:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Detect if running in Gitpod or similar cloud environment
const isGitpod = process.env.GITPOD_WORKSPACE_ID !== undefined
const gitpodUrl = process.env.GITPOD_WORKSPACE_URL

// Determine base path
let base = '/'
if (process.env.VITE_BASE_PATH) {
  base = process.env.VITE_BASE_PATH
} else if (isGitpod) {
  // In Gitpod, ports are exposed directly
  base = '/'
}

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      // Configure HMR for cloud environments
      clientPort: isGitpod ? 443 : 5173,
      protocol: isGitpod ? 'wss' : 'ws',
    }
  }
})
```

## Implementation Steps

### Step 1: Create Vite App (if not already created)

```bash
cd /workspaces/agentDB9/workspace
npm create vite@latest my-app -- --template react
cd my-app
npm install
```

### Step 2: Update vite.config.js

Choose one of the configuration options above and update your `vite.config.js`.

**For VSCode proxy environment, use:**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  }
})
```

### Step 3: Start Dev Server

**With environment variable:**
```bash
VITE_BASE_PATH=/proxy/5173/ npm run dev
```

**Or add to package.json:**
```json
{
  "scripts": {
    "dev": "vite",
    "dev:proxy": "VITE_BASE_PATH=/proxy/5173/ vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Then run:
```bash
npm run dev:proxy
```

### Step 4: Access the App

Access through the proxy:
```
http://localhost:8080/proxy/5173/
```

Or in Gitpod:
```
https://5173-<workspace-id>.gitpod.io
```

## Verification

After applying the fix, check:

1. **No 404 errors in console** ✅
2. **Assets load correctly:**
   - `/@vite/client` loads
   - `/@react-refresh` loads
   - `/vite.svg` loads
   - `/src/main.jsx` loads
3. **Hot Module Replacement (HMR) works** ✅
4. **React app renders correctly** ✅

## Alternative: Use Gitpod Port Forwarding

If you're using Gitpod, you can access the port directly without a proxy:

```bash
# Start Vite normally
npm run dev

# Access via Gitpod URL
https://5173-<workspace-id>.gitpod.io
```

No `base` configuration needed for direct port access.

## Troubleshooting

### Issue: Still getting 404 errors

**Check 1: Verify base path is set**
```bash
# In browser console
console.log(import.meta.env.BASE_URL)
// Should show: /proxy/5173/
```

**Check 2: Restart dev server**
```bash
# Stop the server (Ctrl+C)
# Start with base path
VITE_BASE_PATH=/proxy/5173/ npm run dev
```

**Check 3: Clear browser cache**
```
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

### Issue: HMR (Hot Module Replacement) not working

Add HMR configuration:

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/proxy/5173/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    }
  }
})
```

### Issue: Assets load but page is blank

Check browser console for JavaScript errors. The base path might be correct but there could be other issues.

### Issue: CSS not loading

Ensure CSS imports in your components use relative paths:

```javascript
// ✅ Good
import './App.css'

// ❌ Bad (absolute path)
import '/src/App.css'
```

## For Production Builds

When building for production, set the base path:

```bash
VITE_BASE_PATH=/proxy/5173/ npm run build
```

Or in `vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' 
    ? '/your-production-path/' 
    : process.env.VITE_BASE_PATH || '/',
  // ... rest of config
})
```

## Summary

The 404 errors occur because Vite generates absolute URLs that don't account for proxy paths. The fix is to configure Vite's `base` option to include the proxy path prefix.

**Quick Fix:**
```javascript
// vite.config.js
export default defineConfig({
  base: '/proxy/5173/',
  server: { host: '0.0.0.0', port: 5173 }
})
```

**Flexible Fix:**
```javascript
// vite.config.js
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  server: { host: '0.0.0.0', port: 5173 }
})
```

Then run:
```bash
VITE_BASE_PATH=/proxy/5173/ npm run dev
```
