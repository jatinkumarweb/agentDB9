# Create React App (CRA) Proxy Setup

## The Issue

CRA's webpack dev server doesn't natively support serving from a subdirectory like `/proxy/3000/`. When you set `PUBLIC_URL=/proxy/3000`, it affects the build output but the dev server still expects requests at the root.

## Solutions

### Solution 1: Use Homepage in package.json (Recommended)

Add `homepage` field to your `package.json`:

```json
{
  "name": "your-app",
  "version": "0.1.0",
  "homepage": "/proxy/3000",
  "dependencies": {
    ...
  }
}
```

Then start dev server:
```bash
npm start
```

The `homepage` field tells CRA to serve assets from `/proxy/3000/`.

### Solution 2: Use .env File

Create `.env` file in your project root:

```bash
PUBLIC_URL=/proxy/3000
```

Then start:
```bash
npm start
```

### Solution 3: Inline Environment Variable

```bash
PUBLIC_URL=/proxy/3000 npm start
```

### Solution 4: Use Vite Instead (Best for New Projects)

Vite has better support for base paths:

```bash
# Create new Vite project
npm create vite@latest my-app -- --template react
cd my-app

# Configure vite.config.js
```

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/proxy/5173/',  // Base path for assets
  server: {
    host: '0.0.0.0',
    port: 5173,
  }
})
```

Start:
```bash
npm run dev
```

Access: `http://localhost:8000/proxy/5173/`

## Testing CRA Configuration

### Test 1: Check if dev server recognizes the path

```bash
# Inside vscode container
curl http://localhost:3000/proxy/3000/
```

Should return your app HTML (not 404).

### Test 2: Check bundle.js

```bash
curl -I http://localhost:3000/proxy/3000/static/js/bundle.js
```

Should return:
```
HTTP/1.1 200 OK
Content-Type: application/javascript
```

NOT:
```
HTTP/1.1 404 Not Found
Content-Type: text/html
```

### Test 3: Via proxy

```bash
curl -I http://localhost:8000/proxy/3000/static/js/bundle.js
```

Should also return JavaScript, not HTML.

## Common CRA Issues

### Issue 1: Dev Server Ignores PUBLIC_URL

**Problem:** CRA dev server doesn't respect PUBLIC_URL for routing

**Solution:** Use `homepage` in package.json instead

### Issue 2: Assets Load but App Doesn't Render

**Problem:** React Router or other routing issues

**Solution:** Configure React Router with basename:

```javascript
// src/index.js or src/App.js
import { BrowserRouter } from 'react-router-dom';

<BrowserRouter basename="/proxy/3000">
  <App />
</BrowserRouter>
```

### Issue 3: Hot Reload Doesn't Work

**Problem:** WebSocket connection fails with proxy

**Solution:** Configure WebSocket proxy in CRA:

Create `src/setupProxy.js`:
```javascript
module.exports = function(app) {
  // No proxy needed - we're using backend proxy
};
```

Or set environment variable:
```bash
WDS_SOCKET_PATH=/proxy/3000/ws
```

## Recommended Approach for CRA

### Step 1: Update package.json

```json
{
  "name": "your-app",
  "homepage": "/proxy/3000",
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-scripts": "5.0.0"
  }
}
```

### Step 2: Configure Router (if using)

```javascript
// src/App.js
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL || '/proxy/3000'}>
      {/* Your routes */}
    </BrowserRouter>
  );
}
```

### Step 3: Start Dev Server

```bash
# In vscode container
cd /home/coder/workspace/your-project
npm start
```

### Step 4: Access via Proxy

```
http://localhost:8000/proxy/3000/
```

## Alternative: Use Webpack DevServer Configuration

If you've ejected from CRA, you can configure webpack directly:

```javascript
// config/webpackDevServer.config.js
module.exports = {
  // ... other config
  historyApiFallback: {
    disableDotRule: true,
    index: '/proxy/3000/index.html',
  },
  publicPath: '/proxy/3000/',
};
```

## Verification Checklist

- [ ] `homepage` set in package.json
- [ ] Dev server started with `npm start`
- [ ] Can access `http://localhost:3000/proxy/3000/` (inside vscode)
- [ ] Bundle.js returns JavaScript (not HTML)
- [ ] Can access via proxy: `http://localhost:8000/proxy/3000/`
- [ ] No MIME type errors in browser console
- [ ] App renders correctly

## If Still Not Working

### Debug Steps:

1. **Check dev server logs:**
   ```bash
   # Look for errors when starting
   npm start
   ```

2. **Test direct access:**
   ```bash
   # Inside vscode container
   curl http://localhost:3000/proxy/3000/
   ```

3. **Check what dev server is serving:**
   ```bash
   curl http://localhost:3000/
   # vs
   curl http://localhost:3000/proxy/3000/
   ```

4. **Verify PUBLIC_URL:**
   ```bash
   echo $PUBLIC_URL
   # Should show: /proxy/3000
   ```

5. **Check backend proxy logs:**
   ```bash
   docker compose logs backend | grep proxy
   ```

## Summary

For CRA to work with proxy:
1. ✅ Set `homepage: "/proxy/3000"` in package.json
2. ✅ Start dev server: `npm start`
3. ✅ Dev server serves from `/proxy/3000/`
4. ✅ Backend proxy forwards full path
5. ✅ Bundle.js loads with correct MIME type

If CRA is too complex, consider migrating to Vite for better base path support.
