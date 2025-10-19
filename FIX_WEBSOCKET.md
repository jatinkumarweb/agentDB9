# Fix WebSocket Issues for Proxy

## Issue 1: CRA React Fast Refresh WebSocket

**Error:**
```
Refused to connect to 'ws://localhost:3000/ws' because it violates CSP
```

**Cause:** React Fast Refresh tries to connect to `ws://localhost:3000/ws` but should use the proxy path.

### Solution for CRA

Create `.env` file in your CRA project root:

```bash
# .env
PUBLIC_URL=/proxy/3000
WDS_SOCKET_PORT=8000
WDS_SOCKET_PATH=/proxy/3000/ws
WDS_SOCKET_HOST=localhost
```

Or set environment variables when starting:

```bash
PUBLIC_URL=/proxy/3000 \
WDS_SOCKET_PORT=8000 \
WDS_SOCKET_PATH=/proxy/3000/ws \
npm start
```

### Alternative: Disable Fast Refresh (Quick Fix)

If you don't need hot reload:

```bash
FAST_REFRESH=false PUBLIC_URL=/proxy/3000 npm start
```

## Issue 2: Vite Not Working

**Problem:** Vite needs explicit base path configuration

### Solution for Vite

Update `vite.config.js` or `vite.config.ts`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/proxy/5173/',  // Important: Must match proxy path
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 8000,
      clientPort: 8000,
      path: '/proxy/5173/ws',  // WebSocket path through proxy
    }
  }
})
```

Then start:

```bash
npm run dev
```

Access: `http://localhost:8000/proxy/5173/`

## WebSocket Proxy in Backend

The backend needs to handle WebSocket connections. Let me check if we need to add WebSocket support to the proxy controller.

### Option 1: Add WebSocket Support to Proxy

The proxy currently only handles HTTP. For WebSockets, we need to upgrade the connection.

### Option 2: Disable HMR (Hot Module Replacement)

For development, you can disable HMR:

**CRA:**
```bash
FAST_REFRESH=false npm start
```

**Vite:**
```javascript
// vite.config.js
export default defineConfig({
  server: {
    hmr: false  // Disable HMR
  }
})
```

## Quick Fix (Recommended for Now)

### For CRA (Port 3000)

Create `.env.local` in your project:

```bash
# .env.local
PUBLIC_URL=/proxy/3000
FAST_REFRESH=false
```

Restart dev server:
```bash
npm start
```

### For Vite (Port 5173)

Create `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/proxy/5173/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: false  // Disable HMR for now
  }
})
```

Restart dev server:
```bash
npm run dev
```

## Testing

### Test CRA
```bash
# Should work without WebSocket errors
curl http://localhost:8000/proxy/3000/
```

### Test Vite
```bash
# Should load correctly
curl http://localhost:8000/proxy/5173/
```

## Full WebSocket Support (Advanced)

To enable full WebSocket support through the proxy, we need to:

1. Add WebSocket upgrade handling to the proxy controller
2. Forward WebSocket connections to the dev server
3. Handle WebSocket protocol negotiation

This requires more complex implementation. For now, disabling HMR is the simplest solution.

## Summary

**Quick Fix:**
- CRA: Add `FAST_REFRESH=false` to `.env.local`
- Vite: Add `hmr: false` to `vite.config.js`
- Both: Restart dev servers

**Full Fix (Future):**
- Implement WebSocket proxy support in backend
- Configure proper WebSocket paths
- Enable HMR through proxy

For development purposes, disabling HMR is acceptable. You can still manually refresh the browser to see changes.
