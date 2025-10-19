# Vite Proxy Setup

## Why Vite Isn't Working

Vite requires explicit `base` configuration in `vite.config.js`. Unlike CRA, Vite doesn't automatically use `PUBLIC_URL` environment variable.

## Complete Vite Configuration

### Step 1: Create/Update vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Base path for assets - MUST match proxy path
  base: '/proxy/5173/',
  
  server: {
    // Bind to all interfaces (required for Docker)
    host: '0.0.0.0',
    
    // Port
    port: 5173,
    
    // Fail if port is already in use
    strictPort: true,
    
    // Disable HMR for proxy (or configure WebSocket)
    hmr: false,
    
    // Alternative: Configure HMR through proxy (advanced)
    // hmr: {
    //   protocol: 'ws',
    //   host: 'localhost',
    //   port: 8000,
    //   clientPort: 8000,
    //   path: '/proxy/5173',
    // }
  },
  
  // Preview server (for production builds)
  preview: {
    host: '0.0.0.0',
    port: 5173,
  }
})
```

### Step 2: Update package.json (Optional)

Add scripts for convenience:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:proxy": "vite --host 0.0.0.0 --port 5173",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Step 3: Start Dev Server

```bash
npm run dev
```

### Step 4: Access via Proxy

```
http://localhost:8000/proxy/5173/
```

## TypeScript Configuration

If using TypeScript, create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/proxy/5173/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: false,
  }
})
```

## Common Vite Issues

### Issue 1: Assets Not Loading

**Symptom:** CSS, images, or other assets return 404

**Cause:** `base` not set correctly

**Solution:**
```javascript
// vite.config.js
export default defineConfig({
  base: '/proxy/5173/',  // Must end with /
})
```

### Issue 2: Blank Page

**Symptom:** Page loads but shows blank screen

**Cause:** JavaScript trying to load from wrong path

**Solution:** Check browser console for 404 errors, ensure `base` is correct

### Issue 3: HMR Not Working

**Symptom:** Changes don't reflect without manual refresh

**Cause:** WebSocket connection fails through proxy

**Solution:** Disable HMR for now:
```javascript
server: {
  hmr: false
}
```

### Issue 4: Port Already in Use

**Symptom:** `Port 5173 is already in use`

**Solution:**
```bash
# Kill process using port
lsof -i :5173
kill -9 <PID>

# Or use different port
# vite.config.js
server: {
  port: 5174
}
```

## Testing Vite Setup

### Test 1: Direct Access (Inside vscode container)

```bash
docker compose exec vscode curl http://localhost:5173/proxy/5173/
```

Should return HTML with correct asset paths.

### Test 2: Via Proxy

```bash
curl http://localhost:8000/proxy/5173/
```

Should return the same HTML.

### Test 3: Assets

```bash
curl -I http://localhost:8000/proxy/5173/assets/index.js
```

Should return:
```
HTTP/1.1 200 OK
Content-Type: application/javascript
```

## Vite vs CRA Differences

| Feature | CRA | Vite |
|---------|-----|------|
| Base path config | `PUBLIC_URL` env var | `base` in config file |
| Config file | None (or ejected) | `vite.config.js` required |
| Hot reload | Works with env vars | Needs WebSocket config |
| Build speed | Slower | Much faster |
| Dev server | Webpack | Native ESM |

## Complete Working Example

### Project Structure
```
my-vite-app/
├── vite.config.js       ← Configuration
├── package.json
├── index.html
└── src/
    ├── main.jsx
    └── App.jsx
```

### vite.config.js
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
    hmr: false,
  }
})
```

### Start Command
```bash
# In vscode container
cd /home/coder/workspace/my-vite-app
npm run dev
```

### Access
```
http://localhost:8000/proxy/5173/
```

## Debugging Vite Issues

### Check Vite Dev Server Logs

```bash
# In vscode container
cd /home/coder/workspace/my-vite-app
npm run dev
```

Look for:
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/proxy/5173/
➜  Network: http://0.0.0.0:5173/proxy/5173/
```

### Check Backend Proxy Logs

```bash
docker compose logs -f backend | grep 5173
```

Should show:
```
Port 5173 mapped to service: vscode
Trying: http://vscode:5173/proxy/5173/
✅ Success with vscode:5173
Response status: 200
Response content-type: text/html
```

### Check Browser Console

Open DevTools → Console, look for:
- ❌ 404 errors on assets
- ❌ CORS errors
- ❌ WebSocket errors (expected if HMR disabled)

## Migration from CRA to Vite

If you want to migrate from CRA to Vite:

```bash
# 1. Create new Vite project
npm create vite@latest my-app -- --template react

# 2. Copy your src/ folder
cp -r old-cra-app/src new-vite-app/src

# 3. Update imports (if needed)
# CRA: import logo from './logo.svg'
# Vite: import logo from './logo.svg' (same)

# 4. Configure vite.config.js with base path
# 5. Start dev server
```

## Summary

For Vite to work with proxy:

1. ✅ Create `vite.config.js` with `base: '/proxy/5173/'`
2. ✅ Set `server.host: '0.0.0.0'`
3. ✅ Set `server.hmr: false` (or configure WebSocket)
4. ✅ Start dev server: `npm run dev`
5. ✅ Access: `http://localhost:8000/proxy/5173/`

Vite is faster than CRA but requires explicit configuration for base paths.
